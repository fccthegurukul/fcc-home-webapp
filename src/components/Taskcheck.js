import React, { useState, useEffect, useMemo } from 'react';
import './Taskcheck.css'; // सुनिश्चित करें कि CSS फ़ाइल में modal के लिए स्टाइल है
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar, faTimesCircle, faEraser, faPaperPlane, faWindowClose } from '@fortawesome/free-solid-svg-icons';
import { supabase } from '../utils/supabaseClient';

// Modal Component for better feedback
const FeedbackModal = ({ show, message, type, onClose }) => {
    if (!show) return null;

    return (
        <div className="modal-overlay">
            <div className={`modal-content ${type === 'success' ? 'modal-success' : 'modal-error'}`}>
                <h3>{type === 'success' ? 'Success!' : 'Error!'}</h3>
                <p>{message}</p>
                <button onClick={onClose} className="modal-close-btn">
                    <FontAwesomeIcon icon={faWindowClose} /> Close
                </button>
            </div>
        </div>
    );
};


const Taskcheck = () => {
    // States
    const [classroomNames, setClassroomNames] = useState([]);
    const [selectedClassroom, setSelectedClassroom] = useState('');
    const [students, setStudents] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [studentScores, setStudentScores] = useState({});
    const [absentStudentIds, setAbsentStudentIds] = useState(new Set());
    const [teacherFCCId, setTeacherFCCId] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [modalInfo, setModalInfo] = useState({ show: false, message: '', type: '' });

    // --- Fetch classroom names ---
    useEffect(() => {
        const fetchClassrooms = async () => {
            try {
                const { data, error } = await supabase.from('new_student_admission').select('fcc_class');
                if (error) throw error;
                const uniqueClasses = [...new Set(data.map(item => item.fcc_class).filter(Boolean))];
                uniqueClasses.sort((a, b) => parseInt(a) - parseInt(b));
                setClassroomNames(uniqueClasses.map(c => `Class ${c}`));
            } catch (e) {
                console.error("Could not fetch classroom names:", e.message);
                setModalInfo({ show: true, message: `Failed to fetch classroom names: ${e.message}`, type: 'error' });
            }
        };
        fetchClassrooms();
    }, []);

    // --- Data fetching logic for the selected class (FIXED) ---
    useEffect(() => {
        if (!selectedClassroom) {
            setStudents([]);
            setTasks([]);
            setAbsentStudentIds(new Set());
            return;
        }

        const fetchAllDataForClass = async () => {
            setLoading(true);
            setModalInfo({ show: false, message: '', type: '' });
            try {
                const classNumber = selectedClassroom.split(" ")[1];
                if (!classNumber) return;

                const todayStart = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                tomorrow.setHours(0, 0, 0, 0);
                const tomorrowStart = tomorrow.toISOString();
                
                const fiveHoursAgo = new Date();
                fiveHoursAgo.setHours(fiveHoursAgo.getHours() - 5);
                
                const [studentRes, taskRes, attendanceRes] = await Promise.all([
                    supabase.from('new_student_admission').select('fcc_id, name').eq('fcc_class', classNumber),
                    supabase.from('leaderboard_scoring_task')
                        .select('*')
                        .eq('class', classNumber)
                        .gt('end_time', new Date().toISOString())
                        .lt('start_time', fiveHoursAgo.toISOString()),
                    supabase.from('students').select('fcc_id, ctc_time').gte('ctc_time', todayStart).lt('ctc_time', tomorrowStart)
                ]);

                if (studentRes.error) throw new Error(`Students: ${studentRes.error.message}`);
                if (taskRes.error) throw new Error(`Tasks: ${taskRes.error.message}`);
                if (attendanceRes.error) throw new Error(`Attendance: ${attendanceRes.error.message}`);
                
                const fetchedStudents = studentRes.data || [];
                const fetchedTasks = taskRes.data || [];
                setStudents(fetchedStudents);
                setTasks(fetchedTasks);
                
                const presentStudentIds = new Set(attendanceRes.data.map(att => att.fcc_id));
                const absentIds = new Set(
                    fetchedStudents.filter(student => !presentStudentIds.has(student.fcc_id)).map(student => student.fcc_id)
                );
                setAbsentStudentIds(absentIds);

                // *** THE FIX IS HERE ***
                // Initialize all scores to empty. The UI will handle disabling inputs for absent students.
                // This prevents the "multiple tasks submitted" error caused by auto-filling '0'.
                const initialScores = {};
                fetchedStudents.forEach(student => {
                    initialScores[student.fcc_id] = {};
                    fetchedTasks.forEach(task => {
                        initialScores[student.fcc_id][task.task_name] = ''; // Always start empty
                    });
                });
                setStudentScores(initialScores);

            } catch (e) {
                console.error("Could not fetch task check data:", e.message);
                setModalInfo({ show: true, message: `Failed to fetch data: ${e.message}`, type: 'error' });
            } finally {
                setLoading(false);
            }
        };

        fetchAllDataForClass();
    }, [selectedClassroom]);

    const absentStudentsList = useMemo(() => {
        return students.filter(student => absentStudentIds.has(student.fcc_id));
    }, [students, absentStudentIds]);

    const handleClassroomChange = (event) => {
        setSelectedClassroom(event.target.value);
    };

    const handleScoreChange = (studentId, taskName, score) => {
        setStudentScores(prevScores => ({
            ...prevScores,
            [studentId]: { ...prevScores[studentId], [taskName]: score }
        }));
    };

    // --- FINALIZED: Submission logic that allows only ONE task/column at a time ---
    const handleSubmitScores = async () => {
        setModalInfo({ show: false, message: '', type: '' });

        if (!teacherFCCId) {
            setModalInfo({ show: true, message: 'Please enter your Teacher FCC ID.', type: 'error' });
            return;
        }

        const tasksToSubmit = new Set();
        Object.values(studentScores).forEach(scoresByTask => {
            Object.entries(scoresByTask).forEach(([taskName, score]) => {
                if (score !== '' && score !== undefined) {
                    tasksToSubmit.add(taskName);
                }
            });
        });

        if (tasksToSubmit.size === 0) {
            setModalInfo({ show: true, message: 'No scores have been entered to submit.', type: 'error' });
            return;
        }

        if (tasksToSubmit.size > 1) {
            setModalInfo({ 
                show: true, 
                message: 'You can only submit scores for ONE task (column) at a time. Please clear the scores for the other tasks.', 
                type: 'error' 
            });
            return;
        }

        const taskNameToSubmit = tasksToSubmit.values().next().value;

        const submissions = [];
        students.forEach(student => {
            const score = studentScores[student.fcc_id]?.[taskNameToSubmit];
            if (score !== '' && score !== undefined) {
                submissions.push({
                    fcc_id: student.fcc_id,
                    fcc_class: selectedClassroom.split(" ")[1],
                    task_name: taskNameToSubmit,
                    score_obtained: parseInt(score, 10),
                });
            }
        });
        
        if (submissions.length === 0) {
            setModalInfo({ show: true, message: 'No valid scores found for the selected task.', type: 'error' });
            return;
        }
        
        setSubmitting(true);
        try {
            const { data, error: rpcError } = await supabase.rpc('submit_scores_for_tasks', {
                submissions: submissions,
                p_teacher_fcc_id: teacherFCCId,
                p_classroom_name: selectedClassroom,
                p_num_students_submitted: submissions.length,
            });

            if (rpcError) throw rpcError;

            setModalInfo({ show: true, message: data?.message || 'Scores submitted successfully!', type: 'success' });
            
            // Re-select the class to trigger a full refresh and clear inputs
            const currentClass = selectedClassroom;
            setSelectedClassroom(''); 
            setTimeout(() => setSelectedClassroom(currentClass), 10);
            setTeacherFCCId('');

        } catch (e) {
            console.error("Score submission failed:", e.message);
            setModalInfo({ show: true, message: `Failed to submit scores: ${e.message}`, type: 'error' });
        } finally {
            setSubmitting(false);
        }
    };
    
    // --- Column-specific helper functions ---
    const handleFillForTask = (taskName, fillValue) => {
        const targetTask = tasks.find(t => t.task_name === taskName);
        if (!targetTask) return;
        
        setStudentScores(prevScores => {
            const nextScores = JSON.parse(JSON.stringify(prevScores));
            students.forEach(student => {
                const isAbsent = absentStudentIds.has(student.fcc_id);
                if (nextScores[student.fcc_id] && (nextScores[student.fcc_id][taskName] === '' || nextScores[student.fcc_id][taskName] === undefined)) {
                    if (fillValue === 'MAX') {
                        nextScores[student.fcc_id][taskName] = isAbsent ? '0' : String(targetTask.max_score);
                    } else { // 'ZERO'
                        nextScores[student.fcc_id][taskName] = '0';
                    }
                }
            });
            return nextScores;
        });
    };

    const handleClearForTask = (taskName) => {
        setStudentScores(prevScores => {
            const nextScores = JSON.parse(JSON.stringify(prevScores));
            students.forEach(student => {
                if (!absentStudentIds.has(student.fcc_id)) {
                   nextScores[student.fcc_id][taskName] = '';
                }
            });
            return nextScores;
        });
    };

    return (
        <div className="taskcheck-container">
            <FeedbackModal 
                show={modalInfo.show} 
                message={modalInfo.message} 
                type={modalInfo.type}
                onClose={() => setModalInfo({ show: false, message: '', type: '' })}
            />

            <aside className="taskcheck-sidebar">
                {selectedClassroom && absentStudentsList.length > 0 && (
                    <div className="absent-students-section">
                        <h3>Absent Students Today</h3>
                        <ul>
                            {absentStudentsList.map((student) => (
                                <li key={student.fcc_id}>{student.name}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </aside>
            <main className="taskcheck-main-content">
                <h1>Task Checking Panel</h1>
                
                <div className="classroom-select-container">
                    <label htmlFor="classroomSelect">Select Classroom:</label>
                    <select id="classroomSelect" value={selectedClassroom} onChange={handleClassroomChange} disabled={loading || submitting}>
                        <option value="">-- Select classroom --</option>
                        {classroomNames.map((name, index) => (
                            <option key={index} value={name}>{name}</option>
                        ))}
                    </select>
                </div>

                {loading ? <p>Loading data...</p> : selectedClassroom && (
                    <div className="task-table-section">
                        <h2>Students in {selectedClassroom}</h2>
                        {students.length > 0 ? (
                            <div className="table-responsive">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Student Name</th>
                                            {tasks.map(task => (
                                                <th key={task.task_id}>
                                                    {task.task_name} (Max: {task.max_score})
                                                    <div className="th-actions">
                                                        <button title="Fill Max" onClick={() => handleFillForTask(task.task_name, 'MAX')} disabled={submitting}><FontAwesomeIcon icon={faStar} /></button>
                                                        <button title="Fill 0" onClick={() => handleFillForTask(task.task_name, 'ZERO')} disabled={submitting}><FontAwesomeIcon icon={faTimesCircle} /></button>
                                                        <button title="Clear" onClick={() => handleClearForTask(task.task_name)} disabled={submitting}><FontAwesomeIcon icon={faEraser} /></button>
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {students.map(student => {
                                            const isAbsent = absentStudentIds.has(student.fcc_id);
                                            return (
                                                <tr key={student.fcc_id} className={isAbsent ? 'absent-student-row' : ''}>
                                                    <td>{student.name} {isAbsent ? '(Absent)' : ''}</td>
                                                    {tasks.map(task => (
                                                        <td key={task.task_id}>
                                                            <input
                                                                type="number"
                                                                value={studentScores[student.fcc_id]?.[task.task_name] || ''}
                                                                onChange={(e) => handleScoreChange(student.fcc_id, task.task_name, e.target.value)}
                                                                min="0"
                                                                max={task.max_score}
                                                                disabled={isAbsent || submitting}
                                                            />
                                                        </td>
                                                    ))}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : <p>No students found in this classroom.</p>}

                        {tasks.length > 0 && students.length > 0 && (
                            <div className="actions-container">
                                <div className="input-group">
                                    <label htmlFor="teacherFCCId">Teacher FCC ID:</label>
                                    <input type="password" id="teacherFCCId" value={teacherFCCId} onChange={(e) => setTeacherFCCId(e.target.value)} placeholder="Enter FCC ID" disabled={submitting}/>
                                </div>
                                <div className="buttons-group">
                                    <button className="btn btn-submit" onClick={handleSubmitScores} disabled={submitting || !teacherFCCId}>
                                        <FontAwesomeIcon icon={faPaperPlane} /> {submitting ? 'Submitting...' : 'Submit Scores'}
                                    </button>
                                </div>
                            </div>
                        )}
                        {tasks.length === 0 && selectedClassroom && !loading && <p>No active tasks available for {selectedClassroom} based on the criteria.</p>}
                    </div>
                )}
            </main>
        </div>
    );
};

export default Taskcheck;