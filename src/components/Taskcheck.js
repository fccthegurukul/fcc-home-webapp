import React, { useState, useEffect } from 'react';
import './Taskcheck.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faTimesCircle, faStar, faEraser } from '@fortawesome/free-solid-svg-icons';
import { supabase } from '../utils/supabaseClient'; // SUPABASE CLIENT IMPORT

const Taskcheck = () => {
    // States
    const [classroomNames, setClassroomNames] = useState([]);
    const [selectedClassroom, setSelectedClassroom] = useState('');
    const [students, setStudents] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [studentScores, setStudentScores] = useState({});
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [attendanceData, setAttendanceData] = useState([]);
    const [teacherFCCId, setTeacherFCCId] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // SUPABASE: Fetch classroom names (using the function from previous steps)
    useEffect(() => {
        const fetchClassrooms = async () => {
            try {
                const { data, error } = await supabase.rpc('get_classroom_names');
                if (error) throw error;
                setClassroomNames(data.map(c => c.classroom_name));
            } catch (e) {
                console.error("Could not fetch classroom names:", e.message);
                setError(`Failed to fetch classroom names: ${e.message}`);
            }
        };
        fetchClassrooms();
    }, []);

    // SUPABASE: Fetch all data for the selected class in one go
    useEffect(() => {
        if (!selectedClassroom) {
            setStudents([]);
            setTasks([]);
            setAttendanceData([]);
            return;
        }

        const fetchAllData = async () => {
            setLoading(true);
            setError('');
            try {
                const classNumber = selectedClassroom.split(" ")[1];
                if (!classNumber) return;

                const { data, error } = await supabase.rpc('get_taskcheck_data_for_class', {
                    p_class_number: classNumber
                });

                if (error) throw error;
                
                setStudents(data.students || []);
                setTasks(data.active_tasks || []);
                setAttendanceData(data.attendance || []);

                // Initialize scores state based on fetched students and tasks
                const initialScores = {};
                (data.students || []).forEach(student => {
                    initialScores[student.fcc_id] = {};
                    (data.active_tasks || []).forEach(task => {
                        initialScores[student.fcc_id][task.task_name] = '';
                    });
                });
                setStudentScores(initialScores);

            } catch (e) {
                console.error("Could not fetch task check data:", e.message);
                setError(`Failed to fetch data: ${e.message}`);
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
    }, [selectedClassroom]);

    const handleClassroomChange = (event) => {
        setSelectedClassroom(event.target.value);
    };

    const handleScoreChange = (studentId, taskName, score) => {
        setStudentScores(prevScores => ({
            ...prevScores,
            [studentId]: { ...prevScores[studentId], [taskName]: score }
        }));
    };

    // SUPABASE: Submit scores using the new RPC function
    const handleSubmitScores = async () => {
        setMessage('');
        setError('');

        if (!teacherFCCId) {
            setError("Please enter your Teacher FCC ID.");
            return;
        }

        const submissions = [];
        students.forEach(student => {
            tasks.forEach(task => {
                const score = studentScores[student.fcc_id]?.[task.task_name];
                if (score !== '' && score !== undefined) {
                    submissions.push({
                        fcc_id: student.fcc_id,
                        fcc_class: selectedClassroom.split(" ")[1],
                        task_name: task.task_name,
                        score_obtained: parseInt(score, 10),
                    });
                }
            });
        });

        if (submissions.length === 0) {
            setError("No scores to submit.");
            return;
        }
        
        setSubmitting(true);
        try {
            const { data, error: rpcError } = await supabase.rpc('submit_scores_for_tasks', {
                submissions: submissions, // Pass the array as JSON
                p_teacher_fcc_id: teacherFCCId,
                p_classroom_name: selectedClassroom,
                p_num_students_submitted: submissions.length,
            });

            if (rpcError) throw rpcError;

            setMessage(data.message || 'Scores submitted successfully!');
            // Reset form
            const initialScores = {};
            students.forEach(student => {
                initialScores[student.fcc_id] = {};
                tasks.forEach(task => {
                    initialScores[student.fcc_id][task.task_name] = '';
                });
            });
            setStudentScores(initialScores);
            setTeacherFCCId('');
        } catch (e) {
            console.error("Score submission failed:", e.message);
            setError(`Failed to submit scores: ${e.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    // --- Helper buttons ---
    const absentStudents = attendanceData.filter(student => student.status === 'Absent');
    
 const handleFillZeroScores = () => {
        setStudentScores(prevScores => {
            const nextScores = {...prevScores};
            students.forEach(student => {
                tasks.forEach(task => {
                    if (nextScores[student.fcc_id] && (nextScores[student.fcc_id][task.task_name] === '' || nextScores[student.fcc_id][task.task_name] === undefined)) {
                        nextScores[student.fcc_id][task.task_name] = '0';
                    }
                });
            });
            return nextScores;
        });
    };

    const handleFillMaxScores = () => {
        setStudentScores(prevScores => {
            const nextScores = {...prevScores};
            students.forEach(student => {
                const isAbsent = absentStudents.some(absentStudent => absentStudent.name === student.name);
                tasks.forEach(task => {
                    if (isAbsent) {
                        nextScores[student.fcc_id][task.task_name] = '0';
                    } else if (nextScores[student.fcc_id][task.task_name] === '' || nextScores[student.fcc_id][task.task_name] === undefined) {
                        nextScores[student.fcc_id][task.task_name] = String(task.max_score);
                    }
                });
            });
            return nextScores;
        });
    };

    const handleClearAllScores = () => {
        setStudentScores(prevScores => {
            const nextScores = {...prevScores};
            students.forEach(student => {
                tasks.forEach(task => {
                    nextScores[student.fcc_id][task.task_name] = '';
                });
            });
            return nextScores;
        });
    };

    // --- JSX ---
    return (
        <div className="taskcheck-container">
            <aside className="taskcheck-sidebar">
                {selectedClassroom && absentStudents.length > 0 && (
                    <div className="absent-students-section">
                        <h3>Absent Students Today</h3>
                        <ul>
                            {absentStudents.map((student, index) => (
                                <li key={index}>{student.name}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </aside>
            <main className="taskcheck-main-content">
                <h1>Task Checking Panel</h1>
                {message && <p className="success-message">{message}</p>}
                {error && <p className="error-message">{error}</p>}

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
                                                <th key={task.task_id}>{task.task_name} (Max: {task.max_score})</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {students.map(student => {
                                            const isAbsent = absentStudents.some(absentStudent => absentStudent.fcc_id === student.fcc_id);
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
                        ) : <p>No students in this classroom.</p>}

                        {tasks.length > 0 && students.length > 0 && (
                            <div className="actions-container">
                                <div className="input-group">
                                    <label htmlFor="teacherFCCId">Teacher FCC ID:</label>
                                    <input type="password" id="teacherFCCId" value={teacherFCCId} onChange={(e) => setTeacherFCCId(e.target.value)} placeholder="Enter FCC ID" disabled={submitting}/>
                                </div>
                                <div className="buttons-group">
                                    <button className="btn btn-submit" onClick={handleSubmitScores} disabled={submitting}><FontAwesomeIcon icon={faCheckCircle} /> {submitting ? 'Submitting...' : 'Submit'}</button>
                                    <button className="btn btn-zero" onClick={handleFillZeroScores} disabled={submitting}><FontAwesomeIcon icon={faTimesCircle} /> Fill 0</button>
                                    <button className="btn btn-max" onClick={handleFillMaxScores} disabled={submitting}><FontAwesomeIcon icon={faStar} /> Fill Max</button>
                                    <button className="btn btn-clear" onClick={handleClearAllScores} disabled={submitting}><FontAwesomeIcon icon={faEraser} /> Clear All</button>
                                </div>
                            </div>
                        )}
                        {tasks.length === 0 && selectedClassroom && !loading && <p>No active tasks available for {selectedClassroom}.</p>}
                    </div>
                )}
            </main>
        </div>
    );
};

export default Taskcheck;