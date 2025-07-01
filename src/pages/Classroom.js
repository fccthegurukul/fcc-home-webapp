// --- FINAL DESIGN: Classroom.js ---
// Is component ko behtar readability aur UI/UX ke liye refine kiya gaya hai.

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../utils/supabaseClient'; // Path aavashyakta anusaar badlein
import YouTube from 'react-youtube';
import './Classroom.css'; // Hum naya, polished CSS file use karenge

// --- UI Helper Components (Behtar UI ke liye) ---
const LoadingSpinner = () => <div className="spinner-overlay"><div className="spinner"></div></div>;
const ErrorAlert = ({ message }) => <div className="alert error-alert"><strong>Error:</strong> {message}</div>;
const EmptyState = ({ message }) => <div className="alert empty-state">{message}</div>;

// --- Main Classroom Component ---
const Classroom = () => {
    // State Management
    const [classroomNames, setClassroomNames] = useState([]);
    const [selectedClassroom, setSelectedClassroom] = useState('');
    const [searchQuery, setSearchQuery] = useState(''); // Search state abhi bhi hai, lekin UI se comment out hai
    const [attendance, setAttendance] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [videos, setVideos] = useState([]);
    const [playingVideoId, setPlayingVideoId] = useState(null);

    const [loading, setLoading] = useState({ classrooms: true, data: false });
    const [error, setError] = useState({ classrooms: null, data: null });

    // 1. Classrooms fetch karna aur localStorage ke basis par auto-select karna
    useEffect(() => {
        const fetchClassrooms = async () => {
            setLoading(prev => ({ ...prev, classrooms: true }));
            try {
                const { data, error } = await supabase.from('new_student_admission').select('fcc_class');
                if (error) throw error;
                
                const uniqueNames = [...new Set(data.map(item => item.fcc_class).filter(Boolean))];
                uniqueNames.sort((a, b) => parseInt(a) - parseInt(b));
                const formattedNames = uniqueNames.map(name => `Class ${name}`);
                setClassroomNames(formattedNames);

                const bypassedStudent = JSON.parse(localStorage.getItem("bypassedStudent"));
                if (bypassedStudent?.fcc_class) {
                    const studentClassName = `Class ${bypassedStudent.fcc_class}`;
                    if (formattedNames.includes(studentClassName)) {
                        setSelectedClassroom(studentClassName);
                    }
                }
            } catch (err) {
                setError(prev => ({ ...prev, classrooms: 'Could not load classroom list.' }));
            } finally {
                setLoading(prev => ({ ...prev, classrooms: false }));
            }
        };
        fetchClassrooms();
    }, []);

    // 2. Chune gaye classroom ka saara data (Attendance, Tasks, Videos) fetch karna
    useEffect(() => {
        if (!selectedClassroom) {
            setAttendance([]);
            setTasks([]);
            setVideos([]);
            return;
        }

        const classNumber = selectedClassroom.split(' ')[1];
        const getLocalDateString = (dateInput) => {
            if (!dateInput) return null;
            const d = new Date(dateInput);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        };

        const fetchAllData = async () => {
            setLoading({ ...loading, data: true });
            setError({ ...error, data: null });

            try {
                // Promise.all se sabhi data ek saath fetch ho raha hai (Good for performance)
                const [studentsRes, attendanceRes, tasksRes, videosRes] = await Promise.all([
                    supabase.from('new_student_admission').select('fcc_id, name, photo_url').eq('fcc_class', classNumber),
                    supabase.from('students').select('fcc_id, ctc_time, ctg_time'),
                    supabase.from('leaderboard_scoring_task').select('*').eq('class', classNumber).order('start_time', { ascending: false }),
                    supabase.from('live_videos').select('*').eq('classroom_name', selectedClassroom).order('live_date', { ascending: false })
                ]);

                if (studentsRes.error) throw new Error(`Students: ${studentsRes.error.message}`);
                if (attendanceRes.error) throw new Error(`Attendance: ${attendanceRes.error.message}`);
                if (tasksRes.error) throw new Error(`Tasks: ${tasksRes.error.message}`);
                if (videosRes.error) throw new Error(`Videos: ${videosRes.error.message}`);

                const studentsList = studentsRes.data;
                const attendanceRecords = attendanceRes.data;
                const todayStr = getLocalDateString(new Date());
                
                // Attendance status calculate karne ka logic
                const finalAttendance = studentsList.map(student => {
                    const latestRecord = attendanceRecords
                        .filter(r => r.fcc_id === student.fcc_id && r.ctc_time)
                        .sort((a, b) => new Date(b.ctc_time) - new Date(a.ctc_time))[0];
                    let status = "Absent", duration = null;
                    if (latestRecord) {
                        const ctcLocalDate = getLocalDateString(latestRecord.ctc_time);
                        if (ctcLocalDate === todayStr) {
                            const ctgLocalDate = getLocalDateString(latestRecord.ctg_time);
                            status = ctgLocalDate === todayStr ? "Present" : "In Class";
                            if (status === "Present" && latestRecord.ctg_time) {
                                const diffMs = new Date(latestRecord.ctg_time) - new Date(latestRecord.ctc_time);
                                if (diffMs > 0) {
                                    const hours = Math.floor(diffMs / 3600000);
                                    const minutes = Math.floor((diffMs % 3600000) / 60000);
                                    duration = `${hours}h ${minutes}m`;
                                }
                            }
                        }
                    }
                    return { ...student, status, duration };
                });

                // Status ke hisab se sort karna
                finalAttendance.sort((a, b) => {
                    const order = { "In Class": 1, "Present": 2, "Absent": 3 };
                    return order[a.status] - order[b.status];
                });

                setAttendance(finalAttendance);
                setTasks(tasksRes.data);
                setVideos(videosRes.data);

            } catch (err) {
                setError({ ...error, data: `Failed to load classroom data: ${err.message}` });
                console.error(err);
            } finally {
                setLoading({ ...loading, data: false });
            }
        };

        fetchAllData();
    }, [selectedClassroom]);
    
    // Videos ko 'Today's' aur 'Past' me filter karne ke liye useMemo
    const filteredVideos = useMemo(() => {
        const todayStr = new Date().toISOString().slice(0, 10);
        const all = searchQuery ? videos.filter(v => v.video_title.toLowerCase().includes(searchQuery.toLowerCase())) : videos;
        return {
            todays: all.filter(v => v.live_date === todayStr),
            past: all.filter(v => v.live_date < todayStr),
        };
    }, [searchQuery, videos]);

    // Helper functions
    const getStatusClass = (status) => status.toLowerCase().replace(' ', '-');
    const getYouTubeId = (url) => { try { return new URL(url).searchParams.get('v'); } catch { return null; } };

    return (
        <div className="classroom-container">
            {loading.data && <LoadingSpinner />}
            <header className="classroom-header">
                   <h1>Classroom</h1>
                <div className="controls">
                    <select value={selectedClassroom} onChange={(e) => setSelectedClassroom(e.target.value)} disabled={loading.classrooms}>
                        <option value="">-- Select a Classroom --</option>
                        {loading.classrooms ? <option>Loading...</option> : classroomNames.map(name => <option key={name} value={name}>{name}</option>)}
                    </select>
                    
                    {/* --- Search Video ko aapke request ke anusaar comment kar diya gaya hai --- */}
                    {/* {selectedClassroom && <input type="text" placeholder="Search videos..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />} */}
                </div>
            </header>
            <div className="classroom-body">
                {error.classrooms && <ErrorAlert message={error.classrooms} />}

                {!selectedClassroom && !loading.classrooms && (
                    <div className="page-prompt">
                        <h2>Welcome!</h2>
                        <p>Please select a classroom to see student attendance, tasks, and videos.</p>
                    </div>
                )}
                
                {error.data && !loading.data && <ErrorAlert message={error.data} />}

                {selectedClassroom && !loading.data && !error.data && (
                    <div className="classroom-grid">
                        <main className="main-content">
                            <section className="card">
                                <h2>Today's Attendance</h2>
                                {attendance.length > 0 ? (
                                    <ul className="attendance-list">
                                        {attendance.map(student => (
                                            <li key={student.fcc_id} className="student-item">
                                                <img src={student.photo_url || `https://ui-avatars.com/api/?name=${student.name.replace(' ', '+')}&background=random&color=fff`} alt={student.name} className="profile-pic" />
                                                <div className="student-info">
                                                    <span className="student-name">{student.name}</span>
                                                    {student.duration && <span className="duration-text">({student.duration})</span>}
                                                </div>
                                                <span className={`status-badge ${getStatusClass(student.status)}`}>{student.status}</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : <EmptyState message="No student data found for this class." />}
                            </section>
                            <section className="card">
                                <h2>Tasks</h2>
                                {tasks.length > 0 ? (
                                    <div className="task-list">
                                        {tasks.map(task => (
                                            <div key={task.task_id} className="task-card">
                                                <h3>{task.task_name}</h3>
                                                <p>{task.description}</p>
                                                <div className="task-meta">
                                                    <span>Max Score: <strong>{task.max_score}</strong></span>
                                                    <span>Ends: <strong>{new Date(task.end_time).toLocaleDateString()}</strong></span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : <EmptyState message="No tasks have been assigned yet." />}
                            </section>
                        </main>
                        <aside className="sidebar-content">
                            <section className="card">
                                <h2>Today's Videos</h2>
                                {filteredVideos.todays.length > 0 ? (
                                    <div className="video-list">
                                        {filteredVideos.todays.map(v => {
                                            const id = getYouTubeId(v.youtube_url);
                                            return id && (
                                                <div key={v.video_id} className="video-card" onClick={() => setPlayingVideoId(id)}>
                                                    <img src={`https://img.youtube.com/vi/${id}/mqdefault.jpg`} alt={v.video_title}/>
                                                    <h3>{v.video_title}</h3>
                                                </div>
                                            )
                                        })}
                                    </div>
                                ) : <EmptyState message="No videos for today." />}
                            </section>
                            <section className="card">
                                <h2>Past Videos</h2>
                                {filteredVideos.past.length > 0 ? (
                                    <div className="video-list">
                                        {filteredVideos.past.map(v => {
                                            const id = getYouTubeId(v.youtube_url);
                                            return id && (
                                                <div key={v.video_id} className="video-card" onClick={() => setPlayingVideoId(id)}>
                                                    <img src={`https://img.youtube.com/vi/${id}/mqdefault.jpg`} alt={v.video_title}/>
                                                    <h3>{v.video_title}</h3>
                                                </div>
                                            )
                                        })}
                                    </div>
                                ) : <EmptyState message="No past videos found." />}
                        </section>
                        </aside>
                    </div>
                )}
            </div>

            {playingVideoId && (
                <div className="modal-overlay" onClick={() => setPlayingVideoId(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <button className="close-button" onClick={() => setPlayingVideoId(null)}>×</button>
                        <YouTube videoId={playingVideoId} className="youtube-player" opts={{ width: '100%', height: '100%', playerVars: { autoplay: 1 } }}/>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Classroom;