import React, { useState, useEffect } from 'react';
import './TaskSubmissionPage.css';
import { supabase } from '../utils/supabaseClient'; // SUPABASE CLIENT IMPORT

const TaskSubmissionPage = () => {
    // States (कोई बदलाव नहीं)
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
    const [submitting, setSubmitting] = useState(false); // सबमिट करते समय लोडिंग स्टेट

    // SUPABASE: क्लासरूम के नाम लाने के लिए
    useEffect(() => {
        const fetchClassroomNames = async () => {
            try {
                // हम बनाए गए RPC फंक्शन का उपयोग करेंगे
                const { data, error } = await supabase.rpc('get_classroom_names');
                if (error) throw error;
                
                const names = data.map(item => item.classroom_name);
                setClassroomNames(names);
            } catch (e) {
                console.error("Could not fetch classroom names:", e.message);
                setError(`Failed to fetch classroom list: ${e.message}`);
            }
        };
        fetchClassroomNames();
    }, []);

    // SUPABASE: नया टास्क सबमिट करने के लिए
    const handleTaskSubmit = async (event) => {
        event.preventDefault();
        setMessage('');
        setError('');

        if (!taskName || !description || !maxScore || !startTime || !endTime || !selectedClass || !teacherFCCId) {
            setError("Please fill in all fields.");
            return;
        }

        setSubmitting(true);
        // "Class " प्रीफिक्स को हटा दें
        const formattedClass = selectedClass.replace("Class ", "").trim();

        try {
            // हम बनाए गए RPC फंक्शन को कॉल करेंगे
            const { data, error: rpcError } = await supabase.rpc('create_new_task', {
                p_task_name: taskName,
                p_description: description,
                p_max_score: parseInt(maxScore),
                p_start_time: startTime,
                p_end_time: endTime,
                p_class: formattedClass,
                p_teacher_fcc_id: teacherFCCId
            });

            if (rpcError) throw rpcError;

            setMessage(data.message || 'Task submitted successfully!');
            // फॉर्म को रीसेट करें
            setTaskName('');
            setDescription('');
            setMaxScore('');
            setStartTime('');
            setEndTime('');
            setSelectedClass('');
            setTeacherFCCId('');
        } catch (e) {
            console.error("Task submission failed:", e.message);
            setError(`Failed to submit task: ${e.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    const closePopup = () => {
        setMessage('');
        setError('');
    };

    // --- JSX (कोई बड़ा बदलाव नहीं) ---
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
                                    disabled={submitting}
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
                                    disabled={submitting}
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
                                    disabled={submitting}
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
                                    disabled={submitting}
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
                                        disabled={submitting}
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
                                        disabled={submitting}
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
                                    disabled={submitting}
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
                    <button type="submit" className="submit-button" disabled={submitting}>
                        {submitting ? 'Creating Task...' : 'Create Task'}
                    </button>
                </div>
            </form>

            {(message || error) && (
                <div className="popup-overlay">
                    <div className={`popup ${message ? 'success' : 'error'}`}>
                        <p>{message || error}</p>
                        <button className="popup-close" onClick={closePopup}>Close</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TaskSubmissionPage;