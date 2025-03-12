import React, { useState, useEffect } from 'react';
import './TaskSubmissionPage.css'; // Import CSS file

const TaskSubmissionPage = () => {
    const [taskName, setTaskName] = useState('');
    const [description, setDescription] = useState('');
    const [maxScore, setMaxScore] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [selectedClass, setSelectedClass] = useState('');
    const [teacherFCCId, setTeacherFCCId] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [classroomNames, setClassroomNames] = useState([]);

    const API_BASE_URL = process.env.REACT_APP_API_URL;

    const fetchClassroomNames = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/classrooms`, {
                headers: {
                    "Content-Type": "application/json",
                    "ngrok-skip-browser-warning": "true"
                }
            });
            if (!response.ok) {
                const message = `HTTP error! status: ${response.status}`;
                const errorData = await response.json();
                throw new Error(errorData?.message ? `${message} - Details: ${errorData.message}` : message);
            }
            const data = await response.json();
            setClassroomNames(data);
        } catch (e) {
            console.error("Could not fetch classroom names:", e);
            setError(`Failed to fetch classroom list: ${e.message}`);
        }
    };

    useEffect(() => {
        fetchClassroomNames();
    }, []);

    const handleTaskSubmit = async (event) => {
        event.preventDefault();
        setMessage('');
        setError('');

        if (!taskName || !description || !maxScore || !startTime || !endTime || !selectedClass || !teacherFCCId) {
            setError("Please fill in all fields.");
            return;
        }

        // Remove "Class " prefix from selectedClass before submitting
        const formattedClass = selectedClass.replace("Class ", "").trim();

        try {
            const response = await fetch(`${API_BASE_URL}/api/tasks`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    "ngrok-skip-browser-warning": "true"
                },
                body: JSON.stringify({
                    task_name: taskName,
                    description: description,
                    max_score: parseInt(maxScore),
                    start_time: startTime,
                    end_time: endTime,
                    class: formattedClass, // Use the formatted class value here
                    teacher_fcc_id: teacherFCCId,
                    action_type: 'Task Create'
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            setMessage('Task submitted successfully!');
            setTaskName('');
            setDescription('');
            setMaxScore('');
            setStartTime('');
            setEndTime('');
            setSelectedClass('');
            setTeacherFCCId('');
        } catch (e) {
            console.error("Task submission failed:", e);
            setError(`Failed to submit task: ${e.message}`);
        }
    };

    const closePopup = () => {
        setMessage('');
        setError('');
    };

    return (
        <div className="task-submission-container">
            <h1>Create New Task</h1>
            <form className="task-form" onSubmit={handleTaskSubmit}>
                <div className="form-grid">
                    {/* Left Column */}
                    <div className="form-column">
                        <section className="form-card teacher-info-card">
                            <h2>Teacher Info</h2>
                            <div className="form-group">
                                <label htmlFor="teacherFCCId">Teacher FCC ID:</label>
                                <input
                                    type="password"
                                    id="teacherFCCId"
                                    value={teacherFCCId}
                                    onChange={(e) => setTeacherFCCId(e.target.value)}
                                    placeholder="Enter FCC ID"
                                    required
                                />
                            </div>
                        </section>

                        <section className="form-card task-details-card">
                            <h2>Task Details</h2>
                            <div className="form-group">
                                <label htmlFor="taskName">Task Name:</label>
                                <input
                                    type="text"
                                    id="taskName"
                                    value={taskName}
                                    onChange={(e) => setTaskName(e.target.value)}
                                    placeholder="Enter task name"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="description">Description:</label>
                                <textarea
                                    id="description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Enter task description"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="maxScore">Max Score:</label>
                                <input
                                    type="number"
                                    id="maxScore"
                                    value={maxScore}
                                    onChange={(e) => setMaxScore(e.target.value)}
                                    placeholder="Score"
                                    required
                                />
                            </div>
                        </section>
                    </div>

                    {/* Right Column */}
                    <div className="form-column">
                        <section className="form-card scheduling-card">
                            <h2>Scheduling</h2>
                            <div className="form-group time-group">
                                <div>
                                    <label htmlFor="startTime">Start Time:</label>
                                    <input
                                        type="datetime-local"
                                        id="startTime"
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                        required
                                    />
                                </div>
                                <div>
                                    <label htmlFor="endTime">End Time:</label>
                                    <input
                                        type="datetime-local"
                                        id="endTime"
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                        </section>

                        <section className="form-card class-selection-card">
                            <h2>Class Select</h2>
                            <div className="form-group">
                                <label htmlFor="selectedClass">Class:</label>
                                <select
                                    id="selectedClass"
                                    value={selectedClass}
                                    onChange={(e) => setSelectedClass(e.target.value)}
                                    required
                                >
                                    <option value="">-- Select Class --</option>
                                    {classroomNames.map((className, index) => (
                                        <option key={index} value={className}>
                                            {className}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </section>
                    </div>
                </div>

                <div className="button-container">
                    <button type="submit" className="submit-button">Create Task</button>
                </div>
            </form>

            {/* Popup for Success/Error Messages */}
            {(message || error) && (
                <div className="popup-overlay">
                    <div className={`popup ${message ? 'success' : 'error'}`}>
                        <p>{message || error}</p>
                        <button className="popup-close" onClick={closePopup}>
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TaskSubmissionPage;