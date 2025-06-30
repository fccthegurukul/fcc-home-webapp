import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../utils/supabaseClient';
import jsPDF from "jspdf";
import "jspdf-autotable";
import './DailyReportDashboard.css';
import NotFoundImage from '../assets/404-image.jpg';

// Helper function to get a date in YYYY-MM-DD format
const getISODate = (date) => {
    // To avoid timezone issues, manually construct the date string
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Feedback Modal Component
const FeedbackModal = ({ student, absenceDate, onClose, onFeedbackSubmit }) => {
    const [callerName, setCallerName] = useState(localStorage.getItem('lastCallerName') || '');
    const [callerNumber, setCallerNumber] = useState(localStorage.getItem('lastCallerNumber') || '');
    const [feedbackText, setFeedbackText] = useState('');
    const [feedbackStatus, setFeedbackStatus] = useState('OK');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!callerName || !feedbackText) {
            setError('Caller Name and Feedback text are required.');
            return;
        }
        setIsSubmitting(true);
        setError('');

        const feedbackData = {
            fcc_id: student.fcc_id,
            student_name: student.name,
            mobile_number: student.mobile_number,
            absence_date: getISODate(absenceDate),
            caller_name: callerName,
            caller_number: callerNumber,
            feedback_text: feedbackText,
            feedback_status: feedbackStatus,
        };
        
        const { error } = await supabase.from('absentee_feedback').upsert(feedbackData, {
            onConflict: 'fcc_id, absence_date'
        });

        if (error) {
            setError(`Failed to submit feedback: ${error.message}`);
            setIsSubmitting(false);
        } else {
            localStorage.setItem('lastCallerName', callerName);
            localStorage.setItem('lastCallerNumber', callerNumber);
            onFeedbackSubmit(student.fcc_id);
            onClose();
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Feedback for {student.name}</h2>
                <p>Absence Date: {absenceDate.toLocaleDateString('en-IN')}</p>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="callerName">Your Name (Caller)</label>
                        <input type="text" id="callerName" value={callerName} onChange={e => setCallerName(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="callerNumber">Your Number (Optional)</label>
                        <input type="tel" id="callerNumber" value={callerNumber} onChange={e => setCallerNumber(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="feedbackText">Guardian's Feedback</label>
                        <textarea id="feedbackText" value={feedbackText} onChange={e => setFeedbackText(e.target.value)} required rows="4"></textarea>
                    </div>
                    <div className="form-group">
                        <label>Overall Status</label>
                        <div className="radio-group">
                            <label><input type="radio" name="status" value="OK" checked={feedbackStatus === 'OK'} onChange={() => setFeedbackStatus('OK')} /> OK (Guardian Approved)</label>
                            <label><input type="radio" name="status" value="BAD" checked={feedbackStatus === 'BAD'} onChange={() => setFeedbackStatus('BAD')} /> BAD (Student's Fault)</label>
                        </div>
                    </div>
                    {error && <p className="error-message">{error}</p>}
                    <div className="modal-actions">
                        <button type="button" onClick={onClose} disabled={isSubmitting} className="btn-secondary">Cancel</button>
                        <button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Submitting...' : 'Submit Feedback'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const DailyReportDashboard = () => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [allStudents, setAllStudents] = useState([]);
    const [reportData, setReportData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [classFilter, setClassFilter] = useState('all');
    const [attendanceFilter, setAttendanceFilter] = useState('all');
    const [taskFilter, setTaskFilter] = useState('all');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [feedbacks, setFeedbacks] = useState(new Set());
    
    const uniqueClasses = useMemo(() => {
        const classes = new Set(allStudents.map(s => s.fcc_class).filter(Boolean));
        return ['all', ...Array.from(classes)];
    }, [allStudents]);

    const processReportData = useCallback((students, dailyAttendance, dailyTasks) => {
        const attendanceMap = new Map(dailyAttendance.map(att => [att.fcc_id, { ctc_time: att.ctc_time, ctg_time: att.ctg_time }]));
        const tasksMap = new Map();

        dailyTasks.forEach(task => {
            if (!tasksMap.has(task.fcc_id)) tasksMap.set(task.fcc_id, { scores: [], count: 0 });
            const studentTasks = tasksMap.get(task.fcc_id);
            studentTasks.scores.push(task.score);
            studentTasks.count++;
        });

        const finalReport = students.map(student => {
            const attendanceDetails = attendanceMap.get(student.fcc_id);
            const isPresent = !!attendanceDetails;
            const studentTasks = tasksMap.get(student.fcc_id);
            
            let task_progress = null;
            let task_status = 'Not Submitted';

            if (studentTasks && studentTasks.scores.length > 0) {
                const totalScore = studentTasks.scores.reduce((sum, score) => sum + score, 0);
                let divisor = student.fcc_class === '10/10th' ? 3 : (student.fcc_class === '9/9th' ? 2 : (studentTasks.count || 1));
                task_progress = Math.round(totalScore / divisor);
                task_status = task_progress >= 75 ? 'Completed' : 'Pending';
            }

            if (!isPresent) {
                task_status = '—';
                task_progress = null;
            }

            return {
                ...student,
                attendance_status: isPresent ? 'Present' : 'Absent',
                ctc_time: attendanceDetails?.ctc_time || null,
                ctg_time: attendanceDetails?.ctg_time || null,
                task_status,
                task_progress,
            };
        });
        return finalReport;
    }, []);

    useEffect(() => {
        const fetchAllStudents = async () => {
            const { data, error } = await supabase.from('new_student_admission').select('fcc_id, name, father, mobile_number, photo_url, fcc_class').not('fcc_id', 'is', null);
            if (error) {
                setError(`Student list fetch nahi ho payi: ${error.message}`);
            } else {
                setAllStudents(data || []);
            }
        };
        fetchAllStudents();
    }, []);
    
    useEffect(() => {
        if (allStudents.length === 0) return;

        const fetchDailyDataAndFeedback = async () => {
            setLoading(true);
            setError('');
            
            const dateISO = getISODate(selectedDate);
            const todayISO = getISODate(new Date());

            const date_start = new Date(selectedDate);
            date_start.setHours(0, 0, 0, 0);
            
            const date_end = new Date(selectedDate);
            date_end.setHours(23, 59, 59, 999);

            try {
                let dailyAttendance = [];
                // Agar aaj ki date hai to live 'students' table se data lo, warna 'attendance_log' se
                if (dateISO === todayISO) {
                    const { data, error } = await supabase.from('students')
                        .select('fcc_id, ctc_time, ctg_time')
                        .gte('ctc_time', date_start.toISOString())
                        .lte('ctc_time', date_end.toISOString());
                    if (error && error.code !== 'PGRST116') throw error;
                    dailyAttendance = data || [];
                } else {
                    const { data, error } = await supabase.from('attendance_log')
                        .select('fcc_id, ctc_time, ctg_time')
                        .eq('log_date', dateISO);
                    if (error && error.code !== 'PGRST116') throw error;
                    dailyAttendance = data || [];
                }
                
                const [tasksRes, feedbackRes] = await Promise.all([
                    supabase.from('leaderboard').select('fcc_id, score').eq('submission_date', dateISO),
                    supabase.from('absentee_feedback').select('fcc_id').eq('absence_date', dateISO)
                ]);

                if (tasksRes.error) throw tasksRes.error;
                if (feedbackRes.error) throw feedbackRes.error;
                
                if (feedbackRes.data) {
                    setFeedbacks(new Set(feedbackRes.data.map(f => f.fcc_id)));
                } else {
                    setFeedbacks(new Set());
                }

                const dailyTasks = tasksRes.data || [];
                const processedData = processReportData(allStudents, dailyAttendance, dailyTasks);
                setReportData(processedData);

            } catch (err) {
                console.error("Error fetching daily report:", err);
                setError(`Data fetch nahi ho paya: ${err.message}`);
            } finally {
                setLoading(false);
            }
        };

        fetchDailyDataAndFeedback();
    }, [selectedDate, allStudents, processReportData]);
    
    const filteredData = useMemo(() => {
        return reportData.filter(student => {
            const classMatch = classFilter === 'all' || student.fcc_class === classFilter;
            const attendanceMatch = attendanceFilter === 'all' || student.attendance_status === attendanceFilter;
            const taskMatch = taskFilter === 'all' || student.task_status === taskFilter;
            return classMatch && attendanceMatch && taskMatch;
        });
    }, [reportData, classFilter, attendanceFilter, taskFilter]);

    const downloadAbsenteeReport = () => {
        const absentees = filteredData.filter(s => s.attendance_status === 'Absent');
        if (absentees.length === 0) {
            alert("Is filter ke anusaar koi absent student nahi mila.");
            return;
        }

        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text("Absentee Report", 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Date: ${selectedDate.toLocaleDateString('en-IN')}`, 14, 30);
        
        const totalStudents = filteredData.length;
        const absenteePercentage = totalStudents > 0 ? ((absentees.length / totalStudents) * 100).toFixed(1) : 0;
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.text(
            `Total Students (in Filter): ${totalStudents} | Absentees: ${absentees.length} (${absenteePercentage}%)`,
            doc.internal.pageSize.getWidth() - 14, 30, { align: 'right' }
        );

        const head = [['Student Name', "Father's Name", 'FCC ID', 'Mobile Number', 'Class']];
        const body = absentees.map(s => [s.name, s.father || 'N/A', s.fcc_id, s.mobile_number || 'N/A', s.fcc_class || 'N/A']);

        doc.autoTable({ startY: 40, head, body, theme: 'grid', headStyles: { fillColor: [44, 62, 80] } });
        doc.save(`Absentee_Report_${getISODate(selectedDate)}.pdf`);
    };

    const handleOpenModal = (student) => {
        setSelectedStudent(student);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedStudent(null);
    };

    const handleFeedbackSubmitted = (fccId) => {
        setFeedbacks(prev => new Set(prev).add(fccId));
    };

    if (!allStudents.length && !loading) {
         return <div className="report-container"><h2 className="error">{error || 'Could not load student list.'}</h2></div>;
    }

    return (
        <div className="report-container">
            {isModalOpen && selectedStudent && (
                <FeedbackModal 
                    student={selectedStudent} 
                    absenceDate={selectedDate}
                    onClose={handleCloseModal}
                    onFeedbackSubmit={handleFeedbackSubmitted}
                />
            )}
            <div className="report-header">
                <h1>Daily Report Dashboard</h1>
                <div className="date-picker-wrapper">
                    <label htmlFor="report-date">Select Date: </label>
                    <input 
                        type="date" 
                        id="report-date"
                        value={getISODate(selectedDate)}
                        onChange={e => {
                            const newDate = new Date(e.target.value);
                            // Adjust for timezone offset to prevent date from changing
                            const tzOffset = newDate.getTimezoneOffset() * 60000;
                            setSelectedDate(new Date(newDate.getTime() + tzOffset));
                        }}
                        max={getISODate(new Date())}
                    />
                </div>
            </div>

            <div className="filters-panel">
                <div className="filter-group">
                    <label>Class</label>
                    <select value={classFilter} onChange={e => setClassFilter(e.target.value)}>
                        {uniqueClasses.map(cls => <option key={cls} value={cls}>{cls === 'all' ? 'All Classes' : cls}</option>)}
                    </select>
                </div>
                <div className="filter-group">
                    <label>Attendance</label>
                    <select value={attendanceFilter} onChange={e => setAttendanceFilter(e.target.value)}>
                        <option value="all">All</option>
                        <option value="Present">Present</option>
                        <option value="Absent">Absent</option>
                    </select>
                </div>
                 <div className="filter-group">
                    <label>Task Status</label>
                    <select value={taskFilter} onChange={e => setTaskFilter(e.target.value)}>
                        <option value="all">All</option>
                        <option value="Completed">Completed</option>
                        <option value="Pending">Pending</option>
                        <option value="Not Submitted">Not Submitted</option>
                        <option value="—">— (Absent)</option>
                    </select>
                </div>
                <button onClick={downloadAbsenteeReport} className="pdf-download-btn">
                    Download Absentee PDF
                </button>
            </div>

            <div className="report-table-wrapper">
                {loading ? <div className="loading-state">Loading Report...</div> :
                error ? <div className="error-state">{error}</div> :
                <table className="report-table">
                    <thead>
                        <tr>
                            <th>Student ({filteredData.length})</th>
                            <th>Contact</th>
                            <th>Attendance</th>
                            <th>CTC / CTG</th>
                            <th>Task Status</th>
                            <th>Avg. Score</th>
                            <th>Feedback Action</th> 
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.length > 0 ? filteredData.map(student => (
                            <tr key={student.fcc_id}>
                                <td data-label="Student">
                                    <div className="student-cell">
                                        <img src={student.photo_url || NotFoundImage} alt={student.name} className="student-avatar" onError={(e) => { e.target.src = NotFoundImage; }} />
                                        <div>
                                            <strong>{student.name}</strong>
                                            <span>{student.fcc_id}</span>
                                        </div>
                                    </div>
                                </td>
                                <td data-label="Contact">{student.mobile_number || 'N/A'}</td>
                                <td data-label="Attendance"><span className={`status-badge ${student.attendance_status.toLowerCase()}`}>{student.attendance_status}</span></td>
                                <td data-label="CTC / CTG">{student.ctc_time ? <span>{new Date(student.ctc_time).toLocaleTimeString('en-IN')}{student.ctg_time && ` - ${new Date(student.ctg_time).toLocaleTimeString('en-IN')}`}</span> : '—'}</td>
                                <td data-label="Task Status"><span className={`status-badge ${student.task_status.toLowerCase().replace(' ', '-')}`}>{student.task_status}</span></td>
                                <td data-label="Avg. Score">{student.task_progress !== null ? `${student.task_progress}%` : '—'}</td>
                                <td data-label="Feedback Action">
                                    {student.attendance_status === 'Absent' ? (
                                        feedbacks.has(student.fcc_id) ? (
                                            <span className="feedback-submitted">✔ Submitted</span>
                                        ) : (
                                            <button className="btn-feedback" onClick={() => handleOpenModal(student)}>
                                                📞 Log Call
                                            </button>
                                        )
                                    ) : ( '—' )}
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan="7" className="no-data">No students found for the selected filters.</td></tr>
                        )}
                    </tbody>
                </table>}
            </div>
        </div>
    );
};

export default DailyReportDashboard;