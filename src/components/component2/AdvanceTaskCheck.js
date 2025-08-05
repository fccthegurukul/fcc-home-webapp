import React, { useState, useEffect } from 'react';
import './AdvanceTaskCheck.css'; // इस CSS फ़ाइल को भी बनाना होगा
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarAlt, faPaperPlane, faWindowClose } from '@fortawesome/free-solid-svg-icons';
import { supabase } from '../../utils/supabaseClient';

// --- फीडबैक के लिए Modal कंपोनेंट ---
const FeedbackModal = ({ show, message, type, onClose }) => {
    if (!show) return null;
    return (
        <div className="modal-overlay">
            <div className={`modal-content ${type === 'success' ? 'modal-success' : 'modal-error'}`}>
                <h3>{type === 'success' ? 'सफलतापूर्वक!' : 'त्रुटि!'}</h3>
                <p>{message}</p>
                <button onClick={onClose} className="modal-close-btn">
                    <FontAwesomeIcon icon={faWindowClose} /> बंद करें
                </button>
            </div>
        </div>
    );
};

// --- मुख्य एडवांस टास्क चेक कंपोनेंट ---
const AdvanceTaskCheck = () => {
    // States
    const [classroomNames, setClassroomNames] = useState([]);
    const [selectedClassroom, setSelectedClassroom] = useState('');
    const [taskDate, setTaskDate] = useState('');
    const [students, setStudents] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [studentScores, setStudentScores] = useState({});
    const [teacherFCCId, setTeacherFCCId] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [modalInfo, setModalInfo] = useState({ show: false, message: '', type: '' });

    // क्लासरूम के नाम लोड करें
    useEffect(() => {
        const fetchClassrooms = async () => {
            try {
                const { data, error } = await supabase.from('new_student_admission').select('fcc_class');
                if (error) throw error;
                const uniqueClasses = [...new Set(data.map(item => item.fcc_class).filter(Boolean))];
                uniqueClasses.sort((a, b) => parseInt(a) - parseInt(b));
                setClassroomNames(uniqueClasses.map(c => `Class ${c}`));
            } catch (e) {
                setModalInfo({ show: true, message: `क्लासरूम लोड करने में विफल: ${e.message}`, type: 'error' });
            }
        };
        fetchClassrooms();
    }, []);

    // क्लास या तारीख बदलने पर, सिर्फ उस दिन 'खत्म' हो रहे टास्क लोड करें
    useEffect(() => {
        if (!selectedClassroom || !taskDate) {
            setStudents([]); setTasks([]); return;
        }
        const fetchTasksByEndDate = async () => {
            setLoading(true); setTasks([]); setStudents([]); setStudentScores({});
            try {
                const classNumber = selectedClassroom.split(" ")[1];
                if (!classNumber) return;
                
                // <<< ASLI FIX YAHAN HAI: सीधे UTC स्ट्रिंग बनाएँ, लोकल टाइमज़ोन को छोड़ दें >>>
                const dateStart = `${taskDate}T00:00:00.000Z`; // चुनी हुई तारीख को 00:00 UTC
                const dateEnd = `${taskDate}T23:59:59.999Z`;   // चुनी हुई तारीख को 23:59 UTC

                const [studentRes, taskRes] = await Promise.all([
                    supabase.from('new_student_admission').select('fcc_id, name').eq('fcc_class', classNumber),
                    supabase.from('leaderboard_scoring_task')
                        .select('*')
                        .eq('class', classNumber)
                        // अब यह क्वेरी हमेशा सही काम करेगी, चाहे कोई किसी भी देश से इस्तेमाल करे
                        .gte('end_time', dateStart)
                        .lte('end_time', dateEnd)
                ]);
                
                if (studentRes.error) throw new Error(`Students: ${studentRes.error.message}`);
                if (taskRes.error) throw new Error(`Tasks: ${taskRes.error.message}`);
                
                const fetchedStudents = studentRes.data || [];
                const fetchedTasks = taskRes.data || [];
                setStudents(fetchedStudents);
                setTasks(fetchedTasks);
                
                const initialScores = {};
                fetchedStudents.forEach(student => {
                    initialScores[student.fcc_id] = {};
                    fetchedTasks.forEach(task => { initialScores[student.fcc_id][task.task_name] = ''; });
                });
                setStudentScores(initialScores);
            } catch (e) {
                setModalInfo({ show: true, message: `टास्क लोड करने में विफल: ${e.message}`, type: 'error' });
            } finally { setLoading(false); }
        };
        fetchTasksByEndDate();
    }, [selectedClassroom, taskDate]);

    // स्कोर बदलने का हैंडलर
    const handleScoreChange = (studentId, taskName, score) => {
        setStudentScores(prevScores => ({...prevScores, [studentId]: { ...prevScores[studentId], [taskName]: score }}));
    };

    // स्कोर सबमिट करने का लॉजिक
    const handleSubmitScores = async () => {
        setModalInfo({ show: false, message: '', type: '' });
        if (!teacherFCCId) return setModalInfo({ show: true, message: 'कृपया अपना Teacher FCC ID दर्ज करें।', type: 'error' });
        
        const tasksToSubmit = new Set();
        Object.values(studentScores).forEach(scoresByTask => {
            Object.entries(scoresByTask).forEach(([taskName, score]) => {
                if (score !== '' && score !== undefined) tasksToSubmit.add(taskName);
            });
        });

        if (tasksToSubmit.size === 0) return setModalInfo({ show: true, message: 'सबमिट करने के लिए कोई स्कोर दर्ज नहीं किया गया है।', type: 'error' });
        if (tasksToSubmit.size > 1) return setModalInfo({ show: true, message: 'आप एक बार में केवल एक टास्क (कॉलम) के लिए स्कोर सबमिट कर सकते हैं।', type: 'error' });
        
        const taskNameToSubmit = tasksToSubmit.values().next().value;
        
        const submissions = students.map(student => ({
            fcc_id: student.fcc_id,
            fcc_class: selectedClassroom.split(" ")[1],
            task_name: taskNameToSubmit,
            score_obtained: parseInt(studentScores[student.fcc_id]?.[taskNameToSubmit], 10),
        })).filter(sub => !isNaN(sub.score_obtained) && sub.score_obtained !== null);
        
        if (submissions.length === 0) return setModalInfo({ show: true, message: 'चुने गए टास्क के लिए कोई मान्य स्कोर नहीं मिला।', type: 'error' });
        
        setSubmitting(true);
        try {
            const { error: rpcError } = await supabase.rpc('submit_scores_for_tasks', { submissions, p_teacher_fcc_id: teacherFCCId, p_classroom_name: selectedClassroom, p_num_students_submitted: submissions.length, });
            if (rpcError) throw rpcError;
            setModalInfo({ show: true, message: 'स्कोर सफलतापूर्वक सबमिट हो गए!', type: 'success' });
            
            // सबमिट होने के बाद फॉर्म रीसेट करें
            const currentClass = selectedClassroom;
            const currentDate = taskDate;
            setSelectedClassroom(''); setTaskDate('');
            setTimeout(() => {
                setSelectedClassroom(currentClass);
                setTaskDate(currentDate);
            }, 10);
            setTeacherFCCId('');
        } catch (e) {
            setModalInfo({ show: true, message: `स्कोर सबमिट करने में विफल: ${e.message}`, type: 'error' });
        } finally { setSubmitting(false); }
    };
    
    return (
        <div className="taskcheck-container">
            <FeedbackModal show={modalInfo.show} message={modalInfo.message} type={modalInfo.type} onClose={() => setModalInfo({ ...modalInfo, show: false })} />
            <main className="taskcheck-main-content">
                <h1>एडवांस / पुरानी कार्य जाँच (Makeup Task Check)</h1>
                
                <div className="controls-container">
                    <div className="control-group">
                        <label htmlFor="classroomSelect">क्लासरूम चुनें:</label>
                        <select id="classroomSelect" value={selectedClassroom} onChange={(e) => setSelectedClassroom(e.target.value)} disabled={loading || submitting}>
                            <option value="">-- चुनें --</option>
                            {classroomNames.map((name) => <option key={name} value={name}>{name}</option>)}
                        </select>
                    </div>
                    <div className="control-group">
                        <label htmlFor="taskDateSelect">टास्क की तारीख (जिस दिन टास्क खत्म हुआ):</label>
                        <div className="date-input-wrapper">
                           <FontAwesomeIcon icon={faCalendarAlt}/>
                           <input type="date" id="taskDateSelect" value={taskDate} onChange={(e) => setTaskDate(e.target.value)} disabled={!selectedClassroom || loading || submitting} max={new Date().toISOString().split("T")[0]} />
                        </div>
                    </div>
                </div>

                {loading && <p className="loading-text">डेटा लोड हो रहा है...</p>}
                
                {tasks.length > 0 && students.length > 0 && !loading && (
                  <div className="table-responsive">
                      <table>
                          <thead>
                              <tr>
                                  <th>विद्यार्थी का नाम</th>
                                  {tasks.map(task => (
                                      <th key={task.task_id}>
                                          <div className="task-header-title">{task.task_name}</div>
                                          <div className="task-header-details">(अधिकतम: {task.max_score})</div>
                                          <div className="task-header-dates">
                                              {new Date(task.start_time).toLocaleDateString('en-GB')} - {new Date(task.end_time).toLocaleDateString('en-GB')}
                                          </div>
                                      </th>
                                  ))}
                              </tr>
                          </thead>
                          <tbody>
                              {students.map(student => (
                                  <tr key={student.fcc_id}>
                                      <td>{student.name}</td>
                                      {tasks.map(task => (
                                          <td key={task.task_id}>
                                              <input type="number" value={studentScores[student.fcc_id]?.[task.task_name] || ''} onChange={(e) => handleScoreChange(student.fcc_id, task.task_name, e.target.value)} min="0" max={task.max_score} disabled={submitting} />
                                          </td>
                                      ))}
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
                )}
                
                {tasks.length === 0 && taskDate && !loading && <p className="info-text">चुनी हुई तारीख को खत्म होने वाला कोई टास्क नहीं मिला।</p>}

                {tasks.length > 0 && students.length > 0 && !loading && (
                     <div className="actions-container">
                         <div className="control-group">
                             <label htmlFor="teacherFCCId">Teacher FCC ID:</label>
                             <input type="password" id="teacherFCCId" value={teacherFCCId} onChange={(e) => setTeacherFCCId(e.target.value)} placeholder="Enter FCC ID" disabled={submitting}/>
                         </div>
                         <button className="btn btn-submit" onClick={handleSubmitScores} disabled={submitting || !teacherFCCId || loading}>
                             <FontAwesomeIcon icon={faPaperPlane} /> {submitting ? 'सबमिट हो रहा है...' : 'स्कोर सबमिट करें'}
                         </button>
                     </div>
                )}
            </main>
        </div>
    );
};

export default AdvanceTaskCheck;