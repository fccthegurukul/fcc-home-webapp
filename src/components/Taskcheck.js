import React, { useState, useEffect, useMemo } from 'react';
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
    const [absentStudentIds, setAbsentStudentIds] = useState(new Set()); // Use a Set for efficient lookup
    const [teacherFCCId, setTeacherFCCId] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // --- FIX 1: Fetch classroom names (Same as before, this part is likely OK) ---
    useEffect(() => {
        const fetchClassrooms = async () => {
            try {
                // Using a direct query which is often clearer than RPC for simple tasks
                const { data, error } = await supabase.from('new_student_admission').select('fcc_class');
                if (error) throw error;
                
                const uniqueClasses = [...new Set(data.map(item => item.fcc_class).filter(Boolean))];
                uniqueClasses.sort((a, b) => parseInt(a) - parseInt(b)); // Sort numerically
                setClassroomNames(uniqueClasses.map(c => `Class ${c}`));
                
            } catch (e) {
                console.error("Could not fetch classroom names:", e.message);
                setError(`Failed to fetch classroom names: ${e.message}`);
            }
        };
        fetchClassrooms();
    }, []);

    // --- FIX 2: REVISED Data fetching logic. No more custom RPC function. ---
    // This fetches all required data in parallel once a classroom is selected.
    useEffect(() => {
        if (!selectedClassroom) {
            setStudents([]);
            setTasks([]);
            setAbsentStudentIds(new Set());
            return;
        }

        const fetchAllDataForClass = async () => {
            setLoading(true);
            setError('');
            setMessage('');
            try {
                const classNumber = selectedClassroom.split(" ")[1];
                if (!classNumber) return;

                // Today's date in YYYY-MM-DD format for Supabase query
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const todayStart = today.toISOString();
                const tomorrow = new Date(today);
                tomorrow.setDate(today.getDate() + 1);
                const tomorrowStart = tomorrow.toISOString();


                // Fetch students, active tasks, and today's attendance in parallel
                const [studentRes, taskRes, attendanceRes] = await Promise.all([
                    supabase.from('new_student_admission').select('fcc_id, name').eq('fcc_class', classNumber),
                    supabase.from('leaderboard_scoring_task').select('*').eq('class', classNumber).gt('end_time', new Date().toISOString()), // Only active tasks
                    supabase.from('students').select('fcc_id, ctc_time').gte('ctc_time', todayStart).lt('ctc_time', tomorrowStart) // Attendance for today
                ]);

                if (studentRes.error) throw new Error(`Students: ${studentRes.error.message}`);
                if (taskRes.error) throw new Error(`Tasks: ${taskRes.error.message}`);
                if (attendanceRes.error) throw new Error(`Attendance: ${attendanceRes.error.message}`);
                
                const fetchedStudents = studentRes.data || [];
                const fetchedTasks = taskRes.data || [];

                setStudents(fetchedStudents);
                setTasks(fetchedTasks);
                
                // --- FIX 3: Correctly determine absent students ---
                const presentStudentIds = new Set(attendanceRes.data.map(att => att.fcc_id));
                const absentIds = new Set(
                    fetchedStudents
                        .filter(student => !presentStudentIds.has(student.fcc_id))
                        .map(student => student.fcc_id)
                );
                setAbsentStudentIds(absentIds);

                // Initialize scores state based on fetched students and tasks
                const initialScores = {};
                (fetchedStudents).forEach(student => {
                    initialScores[student.fcc_id] = {};
                    (fetchedTasks).forEach(task => {
                        // Pre-fill 0 for absent students
                        if (absentIds.has(student.fcc_id)) {
                             initialScores[student.fcc_id][task.task_name] = '0';
                        } else {
                             initialScores[student.fcc_id][task.task_name] = '';
                        }
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

        fetchAllDataForClass();
    }, [selectedClassroom]);

    // This useMemo hook efficiently calculates the list of absent students for the sidebar
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

    // This function for submitting scores should work fine if the RPC exists
    const handleSubmitScores = async () => {
        // ... (Your submission logic is complex and likely correct, assuming the RPC function `submit_scores_for_tasks` exists and works as intended. We will keep it as is.)
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
                // Only submit if a score has been entered
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
                submissions: submissions,
                p_teacher_fcc_id: teacherFCCId,
                p_classroom_name: selectedClassroom,
                p_num_students_submitted: submissions.length,
            });

            if (rpcError) throw rpcError;

            setMessage(data?.message || 'Scores submitted successfully!');
            // Reset form by re-fetching data for the class
            handleClassroomChange({target: { value: selectedClassroom }}); 
            setTeacherFCCId('');

        } catch (e) {
            console.error("Score submission failed:", e.message);
            setError(`Failed to submit scores: ${e.message}`);
        } finally {
            setSubmitting(false);
        }
    };
    
    // --- Helper buttons ---
    const handleFillZeroScores = () => {
        setStudentScores(prevScores => {
            const nextScores = JSON.parse(JSON.stringify(prevScores)); // Deep copy
            students.forEach(student => {
                tasks.forEach(task => {
                    // Only fill if empty
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
            const nextScores = JSON.parse(JSON.stringify(prevScores)); // Deep copy
            students.forEach(student => {
                const isAbsent = absentStudentIds.has(student.fcc_id);
                tasks.forEach(task => {
                    // Only fill if empty
                     if (nextScores[student.fcc_id] && (nextScores[student.fcc_id][task.task_name] === '' || nextScores[student.fcc_id][task.task_name] === undefined)) {
                        nextScores[student.fcc_id][task.task_name] = isAbsent ? '0' : String(task.max_score);
                    }
                });
            });
            return nextScores;
        });
    };

    const handleClearAllScores = () => {
        setStudentScores(prevScores => {
            const nextScores = JSON.parse(JSON.stringify(prevScores)); // Deep copy
            students.forEach(student => {
                const isAbsent = absentStudentIds.has(student.fcc_id);
                tasks.forEach(task => {
                    // Don't clear scores for absent students (as they are locked to 0)
                    if (!isAbsent) {
                       nextScores[student.fcc_id][task.task_name] = '';
                    }
                });
            });
            return nextScores;
        });
    };

    // --- JSX (Minor improvements for clarity) ---
    return (
        <div className="taskcheck-container">
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
                                    <button className="btn btn-submit" onClick={handleSubmitScores} disabled={submitting || !teacherFCCId}><FontAwesomeIcon icon={faCheckCircle} /> {submitting ? 'Submitting...' : 'Submit'}</button>
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