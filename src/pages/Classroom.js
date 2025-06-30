import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import "./Classroom.modern.css";
import { v4 as uuidv4 } from 'uuid';
import YouTube from 'react-youtube';
import { supabase } from '../utils/supabaseClient';

// --- ICONS (for better UI, you can use a library like react-icons) ---
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M10 18a7.952 7.952 0 0 0 4.897-1.688l4.396 4.396 1.414-1.414-4.396-4.396A8 8 0 1 0 10 18zm0-14a6 6 0 1 1-6 6 6 6 0 0 1 6-6z"/></svg>;
const VideoIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>;
const TaskIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6zm2-2h8v-2H8v2zm0-4h8v-2H8v2zm0-4h8v-2H8v2z"/></svg>;
const EmptyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M21.99 8c0-.55-.45-1-1-1h-1V5c0-.55-.45-1-1-1s-1 .45-1 1v2h-4V5c0-.55-.45-1-1-1s-1 .45-1 1v2h-1c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h10c.55 0 1-.45 1-1l.01-10zm-12-2h1v2h-1V6zM9.99 6h1v2h-1V6zM20 18h-8v-1c0-.55-.45-1-1-1s-1 .45-1 1v1H8v-2h10v2zm0-4H8V9h12v5z"/></svg>;
const ErrorIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>;

// --- REUSABLE COMPONENTS FOR CLEANER JSX ---
const SkeletonCard = () => (
  <div className="skeleton-card">
    <div className="skeleton-title"></div>
    <div className="skeleton-content"></div>
    <div className="skeleton-footer"></div>
  </div>
);

const ErrorAlert = ({ message, error }) => {
  if (!error) return null;
  console.error(message, error);
  return (
    <div className="error-alert">
      <ErrorIcon />
      <div>
        <strong>{message}</strong>
        <p>Please try refreshing the page or contact support if the problem persists.</p>
      </div>
    </div>
  );
};

const EmptyState = ({ icon, message }) => (
  <div className="empty-state">
    {icon}
    <p>{message}</p>
  </div>
);

const Classroom = () => {
  const sessionId = useRef(uuidv4());
  const [playingVideoId, setPlayingVideoId] = useState(null);
  const [todaysVideos, setTodaysVideos] = useState([]);
  const [pastVideos, setPastVideos] = useState([]);
  const [visiblePastVideos, setVisiblePastVideos] = useState(4);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [videoError, setVideoError] = useState(null);
  const [classroomNames, setClassroomNames] = useState([]);
  const [selectedClassroom, setSelectedClassroom] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [attendance, setAttendance] = useState([]);
  const [attendanceError, setAttendanceError] = useState(null);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [taskLoading, setTaskLoading] = useState(false);
  const [taskError, setTaskError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // SUPABASE: User Activity Logger
  const logUserActivity = useCallback(async (activityType, activityDetails = {}) => {
    try {
      supabase.from('user_activity_log').insert([{
        activity_type: activityType,
        activity_details: JSON.stringify({ ...activityDetails, classroom: selectedClassroom || "N/A" }),
        page_url: window.location.pathname,
        session_id: sessionId.current,
      }]).then(({ error }) => { if (error) console.error("Error logging activity:", error.message); });
    } catch (error) { console.error("Critical error in logUserActivity:", error); }
  }, [selectedClassroom]);

  // SUPABASE: Fetch classroom names
  useEffect(() => {
    const fetchClassrooms = async () => {
      try {
        const { data, error } = await supabase.from('live_videos').select('classroom_name');
        if (error) throw error;
        const uniqueNames = [...new Set(data.map(item => item.classroom_name).filter(Boolean))];
        setClassroomNames(uniqueNames.sort());
        const bypassedStudent = JSON.parse(localStorage.getItem("bypassedStudent"));
        if (bypassedStudent?.fcc_class) {
          const className = `Class ${bypassedStudent.fcc_class}`;
          if (uniqueNames.includes(className)) setSelectedClassroom(className);
        }
      } catch (e) { console.error("Could not fetch classroom names:", e.message); }
    };
    fetchClassrooms();
  }, []);

  // SUPABASE: Fetch videos for selected classroom
  useEffect(() => {
    if (!selectedClassroom) {
      setTodaysVideos([]);
      setPastVideos([]);
      return;
    }
    const fetchVideos = async () => {
      setLoadingVideos(true);
      setVideoError(null);
      try {
        const { data, error } = await supabase.from('live_videos').select('*').eq('classroom_name', selectedClassroom).order('live_date', { ascending: false });
        if (error) throw error;
        const todayStr = new Date().toISOString().split('T')[0];
        const todays = data.filter(video => video.live_date === todayStr);
        const past = data.filter(video => video.live_date < todayStr);
        setTodaysVideos(todays);
        setPastVideos(past);
      } catch (e) { setVideoError(e); } 
      finally { setLoadingVideos(false); }
    };
    fetchVideos();
  }, [selectedClassroom]);

  // SUPABASE: Fetch attendance
  useEffect(() => {
    if (!selectedClassroom) {
      setAttendance([]);
      return;
    }
    const fetchAttendance = async () => {
      setLoadingAttendance(true);
      setAttendanceError(null);
      try {
        const classNumber = selectedClassroom.split(" ")[1];
        if (!classNumber) return;
        const { data: studentsList, error: studentsError } = await supabase.from('new_student_admission').select('fcc_id, name, photo_url').eq('fcc_class', classNumber);
        if (studentsError) throw studentsError;
        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
        const { data: attendanceRecords, error: attendanceError } = await supabase.from('students').select('fcc_id, ctc_time, ctg_time').in('fcc_id', studentsList.map(s => s.fcc_id)).gte('ctc_time', todayStart.toISOString()).lte('ctc_time', todayEnd.toISOString());
        if (attendanceError) throw attendanceError;
        const finalAttendance = studentsList.map(student => {
          const record = attendanceRecords.find(r => r.fcc_id === student.fcc_id);
          let status = "अनुपस्थित"; let duration = null;
          if (record) {
            status = record.ctg_time ? "उपस्थित" : "क्लास_में_है";
            if (record.ctg_time) {
                const diffMs = new Date(record.ctg_time) - new Date(record.ctc_time);
                const diffHours = Math.floor(diffMs / 3600000);
                const diffMinutes = Math.floor((diffMs % 3600000) / 60000);
                duration = `${diffHours}h ${diffMinutes}m`;
            }
          }
          return { ...student, status, duration };
        });
        setAttendance(finalAttendance);
      } catch (error) { setAttendanceError(error); } 
      finally { setLoadingAttendance(false); }
    };
    fetchAttendance();
  }, [selectedClassroom]);

  // SUPABASE: Fetch tasks
  useEffect(() => {
    if (!selectedClassroom) {
      setTasks([]);
      return;
    }
    const fetchTasks = async () => {
      setTaskLoading(true);
      setTaskError(null);
      try {
        const classNumber = selectedClassroom.split(" ")[1];
        if (!classNumber) return;
        const { data, error } = await supabase.from('leaderboard_scoring_task').select('*').eq('class', classNumber).order('start_time', { ascending: false });
        if (error) throw error;
        setTasks(data);
      } catch (error) { setTaskError(error); } 
      finally { setTaskLoading(false); }
    };
    fetchTasks();
  }, [selectedClassroom]);

  // --- EVENT HANDLERS & MEMOS ---
  const handleClassroomChange = (event) => { setSelectedClassroom(event.target.value); logUserActivity("Select Classroom", { selected_classroom: event.target.value }); };
  const handleSearchChange = (event) => setSearchQuery(event.target.value);
  const handleViewMore = () => setVisiblePastVideos(prev => prev + 4);
  const handleVideoClick = (video) => setPlayingVideoId(prev => (prev === video.videoId ? null : video.videoId));
  const handleDateChange = (event) => setSelectedDate(event.target.value);

  // FIX: Safely parse video URLs to prevent crashes
  const filteredTodaysVideos = useMemo(() => {
    return todaysVideos
      .filter(v => v.video_title.toLowerCase().includes(searchQuery.toLowerCase()))
      .map(video => {
        try {
          // Ensure URL is a string before processing
          if (typeof video.youtube_url !== 'string') return null;
          const videoId = new URL(video.youtube_url).searchParams.get("v");
          if (!videoId) return null; // Filter out if 'v' param is missing
          return { ...video, videoId };
        } catch (e) {
          console.warn(`Invalid YouTube URL skipped: ${video.youtube_url}`);
          return null; // Filter out if URL is invalid
        }
      })
      .filter(Boolean); // Remove null entries
  }, [todaysVideos, searchQuery]);

  // FIX: Apply the same safe parsing for past videos
  const filteredPastVideos = useMemo(() => {
    return pastVideos
      .filter(v => v.video_title.toLowerCase().includes(searchQuery.toLowerCase()))
      .map(video => {
        try {
          if (typeof video.youtube_url !== 'string') return null;
          const videoId = new URL(video.youtube_url).searchParams.get("v");
          if (!videoId) return null;
          return { ...video, videoId };
        } catch (e) {
          console.warn(`Invalid YouTube URL skipped: ${video.youtube_url}`);
          return null;
        }
      })
      .filter(Boolean);
  }, [pastVideos, searchQuery]);
  
  const filteredTasks = useMemo(() => {
    if (!selectedDate) return tasks;
    return tasks.filter(task => {
        const selected = new Date(selectedDate); const start = new Date(task.start_time); const end = new Date(task.end_time);
        selected.setHours(0, 0, 0, 0); start.setHours(0, 0, 0, 0); end.setHours(0, 0, 0, 0);
        return selected >= start && selected <= end;
    });
  }, [tasks, selectedDate]);
  
  const calculateDuration = (start, end) => {
    if (!start || !end) return "N/A";
    const diff = new Date(end) - new Date(start);
    const days = Math.floor(diff / 86400000); const hours = Math.floor((diff % 86400000) / 3600000);
    return days > 0 ? `${days}d ${hours}h` : `${hours}h`;
  };

  // FIX: Helper to convert Hindi status to a stable CSS class
  const getStatusClass = (status) => {
    switch (status) {
      case "उपस्थित": return 'present';
      case "अनुपस्थित": return 'absent';
      case "क्लास_में_है": return 'in-class';
      default: return 'unknown';
    }
  };

  return (
    <div className="classroom-page">
      <header className="classroom-header">
        <div className="classroom-select-wrapper">
          <label htmlFor="classroomSelect">क्लासरूम</label>
          <select id="classroomSelect" value={selectedClassroom} onChange={handleClassroomChange}>
            <option value="">-- कृपया एक क्लासरूम चुनें --</option>
            {classroomNames.map((name, index) => <option key={index} value={name}>{name}</option>)}
          </select>
        </div>
        {selectedClassroom && (
          <div className="search-bar-wrapper">
             <SearchIcon />
             <input type="text" placeholder="वीडियो शीर्षक खोजें..." value={searchQuery} onChange={handleSearchChange} />
          </div>
        )}
      </header>

      {!selectedClassroom && (
        <div className="page-prompt">
          <EmptyIcon />
          <h2>Welcome to the Classroom</h2>
          <p>वीडियो, उपस्थिति और कार्य देखने के लिए कृपया ऊपर से एक क्लासरूम चुनें।</p>
        </div>
      )}
      
      {selectedClassroom && (
        <div className="classroom-grid">
          <main className="main-content">
            <section className="content-section card">
              <h2 className="section-title">आज की उपस्थिति</h2>
              <ErrorAlert message="उपस्थिति लोड करने में विफल।" error={attendanceError} />
              {loadingAttendance ? <p>उपस्थिति लोड हो रही है...</p> : 
               attendance.length > 0 ? (
                  <ul className="attendance-list">
                      {attendance.map((student, idx) => (
                        <li key={idx} className="student-attendance-item">
                          <div className="student-profile">
                            {student.photo_url ? <img src={student.photo_url} alt={student.name} className="profile-pic" /> : <div className="profile-initial">{student.name.charAt(0).toUpperCase()}</div>}
                            <span className="student-name">{student.name}</span>
                          </div>
                          <div className="attendance-status">
                            {/* FIX: Use the helper function for a stable CSS class */}
                            <span className={`badge status-${getStatusClass(student.status)}`}>{student.status}</span>
                            {student.duration && <span className="duration">{student.duration}</span>}
                          </div>
                        </li>
                      ))}
                  </ul>
               ) : <p>इस कक्षा के लिए कोई छात्र डेटा उपलब्ध नहीं है।</p>}
            </section>

            <section className="content-section card">
              <div className="section-header-with-filter">
                <h2 className="section-title">कार्य</h2>
                <div className="date-filter-wrapper">
                  <input type="date" id="dateFilter" value={selectedDate} onChange={handleDateChange} />
                </div>
              </div>
              <ErrorAlert message="कार्य लोड करने में विफल।" error={taskError} />
              {taskLoading ? <SkeletonCard /> : 
               filteredTasks.length > 0 ? (
                  <div className="task-list">
                      {filteredTasks.map((task) => (
                        <div key={task.task_id} className="task-card">
                            <div className="task-header">
                              <h3>{task.task_name}</h3>
                              <div className={`task-status-badge ${new Date() > new Date(task.end_time) ? 'expired' : 'active'}`}>{new Date() > new Date(task.end_time) ? 'समाप्त' : 'सक्रिय'}</div>
                            </div>
                            <p className="task-description">{task.description}</p>
                            <div className="task-meta">
                              <span className="task-score">Max Score: <strong>{task.max_score}</strong></span>
                              <span className="task-duration">Duration: <strong>{calculateDuration(task.start_time, task.end_time)}</strong></span>
                            </div>
                        </div>
                      ))}
                  </div>
               ) : <EmptyState icon={<TaskIcon />} message="चयनित तिथि के लिए कोई कार्य उपलब्ध नहीं है।" />}
            </section>
          </main>

          <aside className="sidebar-content">
            <section className="content-section">
              <h2 className="section-title">आज की कक्षाएं</h2>
              <ErrorAlert message="आज की कक्षाएं लोड करने में विफल।" error={videoError} />
              {loadingVideos ? (
                  <div className="video-grid">{[...Array(2)].map((_, i) => <SkeletonCard key={i} />)}</div>
              ) : filteredTodaysVideos.length > 0 ? (
                  <div className="video-grid">
                    {/* FIX: Use pre-validated `video.videoId` */}
                    {filteredTodaysVideos.map((video) => (
                      <div className="video-card" key={video.video_id} onClick={() => handleVideoClick(video)}>
                        <div className="video-thumbnail">
                          <img src={`https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`} alt={video.video_title} />
                          <div className="play-overlay"><VideoIcon/></div>
                        </div>
                        <div className="video-card-content">
                            <h3>{video.video_title}</h3>
                            <p className="video-date">Date: {new Date(video.live_date).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
              ) : (
                  <EmptyState icon={<VideoIcon />} message="इस क्लासरूम में आज के लिए कोई कक्षा निर्धारित नहीं है।" />
              )}
            </section>

            <section className="content-section">
              <h2 className="section-title">समाप्त कक्षाएं</h2>
              {loadingVideos ? (
                  <div className="video-grid">{[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}</div>
              ) : filteredPastVideos.length > 0 ? (
                  <>
                    <div className="video-grid">
                        {/* FIX: Use pre-validated `video.videoId` */}
                        {filteredPastVideos.slice(0, visiblePastVideos).map((video) => (
                            <div className="video-card" key={video.video_id} onClick={() => handleVideoClick(video)}>
                              <div className="video-thumbnail">
                                <img src={`https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`} alt={video.video_title} />
                                <div className="play-overlay"><VideoIcon/></div>
                              </div>
                              <div className="video-card-content">
                                <h3>{video.video_title}</h3>
                                <p className="video-date">Date: {new Date(video.live_date).toLocaleDateString()}</p>
                              </div>
                            </div>
                        ))}
                    </div>
                    {filteredPastVideos.length > visiblePastVideos && <button className="view-more-btn" onClick={handleViewMore}>और देखें</button>}
                  </>
              ) : (
                  <EmptyState icon={<VideoIcon />} message="इस क्लासरूम के लिए कोई समाप्त कक्षाएं उपलब्ध नहीं हैं।" />
              )}
            </section>
          </aside>
        </div>
      )}

     {playingVideoId && (
        <div className="video-modal-overlay" onClick={() => setPlayingVideoId(null)}>
            <div className="video-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal-btn" onClick={() => setPlayingVideoId(null)}>×</button>
            <div className="youtube-player-container">
                <YouTube
                    videoId={playingVideoId}
                    className="youtube-player"
                    opts={{
                        width: '100%',
                        height: '100%',
                        playerVars: {
                        autoplay: 1,
                        modestbranding: 1,
                        rel: 0,
                        controls: 1,
                        fs: 0,
                        iv_load_policy: 3,
                        showinfo: 0
                        }
                    }}
                />
            </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Classroom;