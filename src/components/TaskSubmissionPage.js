import React, { useState } from 'react';
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

    const API_BASE_URL = process.env.REACT_APP_API_URL; // Define base URL from env variable

    const handleTaskSubmit = async (event) => {
        event.preventDefault();
        setMessage('');
        setError('');

        if (!taskName || !description || !maxScore || !startTime || !endTime || !selectedClass || !teacherFCCId) {
            setError("Please fill in all fields.");
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/tasks`, { // Updated URL
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    task_name: taskName,
                    description: description,
                    max_score: parseInt(maxScore),
                    start_time: startTime,
                    end_time: endTime,
                    class: selectedClass,
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

    return (
        <div className="task-submission-container">
            <h1>Create New Task</h1>
            {message && <p className="success-message">{message}</p>}
            {error && <p className="error-message">{error}</p>}
            <form className="task-form" onSubmit={handleTaskSubmit}>

                <section className="form-card teacher-info-card">
                    <h2>Teacher Info</h2>
                    <div className="form-row">
                        <label htmlFor="teacherFCCId">Teacher FCC ID:</label>
                        <input type="password" id="teacherFCCId" value={teacherFCCId} onChange={(e) => setTeacherFCCId(e.target.value)} placeholder="FCC ID" style={{ width: '200px' }} required /> {/* Fixed width */}
                    </div>
                </section>

                <section className="form-card task-details-card">
                    <h2>Task Details</h2>
                    <div className="form-row">
                        <label htmlFor="taskName">Task Name:</label>
                        <input type="text" id="taskName" value={taskName} onChange={(e) => setTaskName(e.target.value)} style={{ width: '250px' }} required /> {/* Fixed width */}
                    </div>
                    <div className="form-row description-row">
                        <label htmlFor="description">Description:</label>
                        <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} required />
                    </div>
                    <div className="form-row">
                        <label htmlFor="maxScore">Max Score:</label>
                        <input type="number" id="maxScore" value={maxScore} onChange={(e) => setMaxScore(e.target.value)} style={{ width: '80px' }} required /> {/* Fixed width */}
                    </div>
                </section>

                <section className="form-card scheduling-card">
                    <h2>Scheduling</h2>
                    <div className="form-row time-row"> {/* time-row for horizontal time fields */}
                        <div className="time-input-group">
                            <label htmlFor="startTime">Start Time:</label>
                            <input type="datetime-local" id="startTime" value={startTime} onChange={(e) => setStartTime(e.target.value)} style={{ width: '180px' }} required /> {/* Fixed width */}
                        </div>
                        <div className="time-input-group">
                            <label htmlFor="endTime">End Time:</label>
                            <input type="datetime-local" id="endTime" value={endTime} onChange={(e) => setEndTime(e.target.value)} style={{ width: '180px' }} required /> {/* Fixed width */}
                        </div>
                    </div>
                </section>

                <section className="form-card class-selection-card">
                    <h2>Class Select</h2>
                    <div className="form-row">
                        <label htmlFor="selectedClass">Class:</label>
                        <select id="selectedClass" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} style={{ width: '150px' }} required> {/* Fixed width */}
                            <option value="">-- Select --</option>
                            <option value="1">Class 1</option>
                            <option value="2">Class 2</option>
                            <option value="3">Class 3</option>
                            <option value="4">Class 4</option>
                            <option value="5">Class 5</option>
                            <option value="6">Class 6</option>
                            <option value="7">Class 7</option>
                            <option value="8">Class 8</option>
                            <option value="9">Class 9</option>
                            <option value="10">Class 10</option>
                            {/* Add more classes as needed */}
                        </select>
                    </div>
                </section>

                <div className="button-container">
                    <button type="submit" className="submit-button">Create Task</button>
                </div>
            </form>
        </div>
    );
};

export default TaskSubmissionPage;