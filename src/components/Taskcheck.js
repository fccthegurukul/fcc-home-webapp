import React, { useState, useEffect } from 'react';
import './Taskcheck.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faTimesCircle, faStar, faEraser } from '@fortawesome/free-solid-svg-icons';

const Taskcheck = () => {
    const [classroomNames, setClassroomNames] = useState([]);
    const [selectedClassroom, setSelectedClassroom] = useState('');
    const [students, setStudents] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [studentScores, setStudentScores] = useState({});
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [attendanceData, setAttendanceData] = useState([]);
    const [teacherFCCId, setTeacherFCCId] = useState('');
    const [actionType, setActionType] = useState('Task Check'); // Default Action Type

    const API_BASE_URL = process.env.REACT_APP_API_URL; // Define base URL from env variable

    useEffect(() => {
        const fetchClassrooms = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/classrooms`); // Updated URL
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const data = await response.json();
                setClassroomNames(data);
            } catch (e) {
                console.error("Could not fetch classroom names:", e);
                setError(`Failed to fetch classroom names: ${e.message}`);
            }
        };
        fetchClassrooms();
    }, []);

    useEffect(() => {
        const fetchTasks = async () => {
            if (!selectedClassroom) {
                setTasks([]);
                return;
            }
            try {
                const response = await fetch(`${API_BASE_URL}/api/tasks?class=${selectedClassroom.split(" ")[1]}`); // Updated URL
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const data = await response.json();

                // Filter tasks to include only active tasks
                const currentDateTime = new Date();
                const activeTasks = data.filter(task => {
                    const startTime = new Date(task.start_time);
                    const endTime = new Date(task.end_time);
                    return currentDateTime >= startTime && currentDateTime <= endTime;
                });
                setTasks(activeTasks);


            } catch (e) {
                console.error("Could not fetch tasks:", e);
                setError(`Failed to fetch tasks: ${e.message}`);
            }
        };
        fetchTasks();
    }, [selectedClassroom]);


    useEffect(() => {
        const fetchStudentsAndAttendance = async () => {
            if (!selectedClassroom) {
                setStudents([]);
                setAttendanceData([]);
                return;
            }

            setError('');
            try {
                // Students Fetch
                const studentsResponse = await fetch(`${API_BASE_URL}/api/students-by-class?classroomName=${encodeURIComponent(selectedClassroom)}`); // Updated URL
                if (!studentsResponse.ok) throw new Error(`HTTP error! status: ${studentsResponse.status}`);
                const studentsData = await studentsResponse.json();
                setStudents(studentsData);

                // Initialize student scores state
                const initialScores = {};
                studentsData.forEach(student => {
                    initialScores[student.fcc_id] = {};
                    tasks.forEach(task => {
                        initialScores[student.fcc_id][task.task_name] = '';
                    });
                });
                setStudentScores(initialScores);


            } catch (e) {
                console.error("Could not fetch students:", e);
                setError(`Failed to fetch students: ${e.message}`);
            }

            try {
                // Attendance Fetch
                const attendanceResponse = await fetch(
                    `${API_BASE_URL}/api/attendance?classroomName=${encodeURIComponent(selectedClassroom)}` // Updated URL
                );
                if (!attendanceResponse.ok) throw new Error(`HTTP error! status: ${attendanceResponse.status}`);
                const attendanceData = await attendanceResponse.json();
                setAttendanceData(attendanceData);
            } catch (e) {
                console.error("Could not fetch attendance data:", e);
                setError(`Failed to fetch attendance data: ${e.message}`);
            }
        };

        fetchStudentsAndAttendance();
    }, [selectedClassroom, tasks]);


    const handleClassroomChange = (event) => {
        setSelectedClassroom(event.target.value);
    };

    const handleScoreChange = (studentId, taskName, score) => {
        setStudentScores(prevScores => ({
            ...prevScores,
            [studentId]: {
                ...prevScores[studentId],
                [taskName]: score,
            }
        }));
    };

    const handleSubmitScores = async () => {
        setMessage('');
        setError('');

        if (!teacherFCCId) {
            setError("Please enter your Teacher FCC ID.");
            return;
        }
        if (!actionType) {
            setError("Please enter Action Type.");
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

        try {
            const response = await fetch(`${API_BASE_URL}/api/submit-scores`, { // Updated URL
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    submissions,
                    teacher_fcc_id: teacherFCCId,
                    classroom_name: selectedClassroom,
                    num_students_submitted: submissions.length,
                    action_type: actionType
                 }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            setMessage('Scores submitted successfully!');
            setStudentScores(prevState => {
                const nextState = {};
                students.forEach(student => {
                    nextState[student.fcc_id] = {};
                    tasks.forEach(task => {
                        nextState[student.fcc_id][task.task_name] = '';
                    });
                });
                return nextState;
            });
            setTeacherFCCId('');
            setActionType('Task Check');

        } catch (e) {
            console.error("Score submission failed:", e);
            setError(`Failed to submit scores: ${e.message}`);
        }
    };

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


    const absentStudents = attendanceData.filter(student => student.status === 'Absent');


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
                    <select id="classroomSelect" value={selectedClassroom} onChange={handleClassroomChange}>
                        <option value="">-- Select classroom --</option>
                        {classroomNames.map((name, index) => (
                            <option key={index} value={name}>
                                {name}
                            </option>
                        ))}
                    </select>
                </div>

                {selectedClassroom && (
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
                                            const isAbsent = absentStudents.some(absentStudent => absentStudent.name === student.name);

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
                                                                disabled={isAbsent}
                                                            />
                                                        </td>
                                                    ))}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p>No students in this classroom.</p>
                        )}

                        {tasks.length > 0 && students.length > 0 && (
                            <div className="actions-container">
                                <div className="input-group">
                                    <label htmlFor="teacherFCCId">Teacher FCC ID:</label>
                                    <input
                                        type="password"
                                        id="teacherFCCId"
                                        value={teacherFCCId}
                                        onChange={(e) => setTeacherFCCId(e.target.value)}
                                        placeholder="Enter FCC ID"
                                    />
                                </div>
                                <div className="buttons-group">
                                    <button className="btn btn-submit" onClick={handleSubmitScores}>
                                        <FontAwesomeIcon icon={faCheckCircle} className="button-icon" /> Submit
                                    </button>
                                    <button className="btn btn-zero" onClick={handleFillZeroScores}>
                                        <FontAwesomeIcon icon={faTimesCircle} className="button-icon" /> Fill 0
                                    </button>
                                    <button className="btn btn-max" onClick={handleFillMaxScores}>
                                        <FontAwesomeIcon icon={faStar} className="button-icon" /> Fill Max
                                    </button>
                                    <button className="btn btn-clear" onClick={handleClearAllScores}>
                                        <FontAwesomeIcon icon={faEraser} className="button-icon" /> Clear All
                                    </button>
                                </div>
                            </div>
                        )}
                        {tasks.length === 0 && selectedClassroom && <p>No tasks available for {selectedClassroom}.</p>}
                    </div>
                )}
            </main>
        </div>
    );
};

export default Taskcheck;