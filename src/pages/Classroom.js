import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./Classroom.css";
import { v4 as uuidv4 } from 'uuid';
import YouTube from 'react-youtube';

const SkeletonCard = () => <div className="video-card skeleton-card">
    <div className="skeleton-title"></div>
    <div className="skeleton-iframe"></div>
    <div className="skeleton-date"></div>
  </div>;

const studentPhotos = {
  "4949200024": "https://firebasestorage.googleapis.com/v0/b/sarkari-result-23f65.appspot.com/o/profile_images%2FIMG_20241112_150831_462.jpg?alt=media&token=e75bd57c-f944-4061-94e7-381b15a519f1",
  "9631200024": "https://firebasestorage.googleapis.com/v0/b/sarkari-result-23f65.appspot.com/o/profile_images%2FZRIUJKZxEGfNRtkwTy2DfkWAL4s2?alt=media&token=9cd5e3fe-130e-4623-9299-7b5c88f9d519",
  "1234567890": "https://firebasestorage.googleapis.com/v0/b/sarkari-result-23f65.appspot.com/o/profile_images%2Fprofile-pic.png?alt=media&token=fe4c6d0c-73a5-44ed-8d4f-f8ac9b18dab7",
  "9708200025": "https://posterjack.ca/cdn/shop/articles/Tips_for_Taking_Photos_at_the_Beach_55dd7d25-11df-4acf-844f-a5b4ebeff4df.jpg?v=1738158629&width=2048"
};


const Classroom = () => {
  const navigate = useNavigate();
  const sessionId = useRef(uuidv4());
  const [youtubePlayers, setYoutubePlayers] = useState({});
  const [playingVideoId, setPlayingVideoId] = useState(null);
  const [todaysVideos, setTodaysVideos] = useState([]);
  const [pastVideos, setPastVideos] = useState([]);
  const [visiblePastVideos, setVisiblePastVideos] = useState(2);
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


  const handleApiError = async (response) => {
    if (!response.ok) {
      const message = `HTTP error! status: ${response.status}`;
      const errorData = await response.json();
      throw new Error(errorData?.message ? `${message} - Details: ${errorData.message}` : message);
    }
    return response;
  };

  const logUserActivity = useCallback(async (activityType, activityDetails = {}) => {
    try {
      const activityData = {
        activity_type: activityType,
        activity_details: JSON.stringify({
          ...activityDetails,
          classroom: selectedClassroom || "N/A",
          timestamp: new Date().toISOString(),
        }),
        page_url: window.location.pathname,
        session_id: sessionId.current,
      };

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/user-activity-log`, { // Updated URL with headers
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true" // ADD THIS LINE
        },
        body: JSON.stringify(activityData),
      });

      if (!response.ok) throw new Error("Failed to log activity");
      console.log(`Activity '${activityType}' logged successfully`);
    } catch (error) {
      console.error("Error logging user activity:", error);
    }
  }, [selectedClassroom]);

  useEffect(() => {
    const fetchClassrooms = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/classrooms`, { // Updated URL with headers
          headers: {
            "ngrok-skip-browser-warning": "true" // ADD THIS LINE
          }
        });
        await handleApiError(response);
        const data = await response.json();
        setClassroomNames(data);

        const bypassedStudent = JSON.parse(localStorage.getItem("bypassedStudent"));
        if (bypassedStudent?.fcc_class) {
          const className = `Class ${bypassedStudent.fcc_class}`;
          if (data.includes(className)) setSelectedClassroom(className);
        }
      } catch (e) {
        console.error("Could not fetch classroom names:", e);
        setVideoError(e);
      }
    };
    fetchClassrooms();
  }, []);

  useEffect(() => {
    const fetchVideos = async () => {
      if (!selectedClassroom) {
        setTodaysVideos([]);
        setPastVideos([]);
        setLoadingVideos(false);
        return;
      }

      setLoadingVideos(true);
      setVideoError(null);
      try {
        const params = new URLSearchParams({ classroomName: selectedClassroom });
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/videos?${params}`, { // Updated URL with headers
          headers: {
            "ngrok-skip-browser-warning": "true" // ADD THIS LINE
          }
        });
        await handleApiError(response);
        const data = await response.json();
        setTodaysVideos(data.todaysVideos);
        setPastVideos(data.pastVideos);
      } catch (e) {
        console.error("Could not fetch videos:", e);
        setVideoError(e);
      } finally {
        setLoadingVideos(false);
      }
    };
    fetchVideos();
  }, [selectedClassroom]);


  useEffect(() => {
    const fetchAttendance = async () => {
      if (!selectedClassroom) {
        setAttendance([]);
        return;
      }

      setLoadingAttendance(true);
      setAttendanceError(null);
      try {
        const response = await fetch(
          `${process.env.REACT_APP_API_URL}/api/attendance?classroomName=${encodeURIComponent(selectedClassroom)}`,  // Updated URL with headers
          {
            headers: {
              "ngrok-skip-browser-warning": "true" // ADD THIS LINE
            }
          }
        );
        await handleApiError(response);
        const data = await response.json();
        setAttendance(data);
      } catch (error) {
        console.error("Error fetching attendance:", error);
        setAttendanceError(error);
      } finally {
        setLoadingAttendance(false);
      }
    };

    fetchAttendance();
  }, [selectedClassroom]);

  useEffect(() => {
    const fetchTasks = async () => {
      if (!selectedClassroom) {
        setTasks([]);
        return;
      }

      setTaskLoading(true);
      setTaskError(null);
      try {
        const classNumber = selectedClassroom.split(" ")[1];
        const response = await fetch(
          `${process.env.REACT_APP_API_URL}/api/tasks?class=${classNumber}`,  // Updated URL with headers
          {
            headers: {
              "ngrok-skip-browser-warning": "true" // ADD THIS LINE
            }
          }
        );
        await handleApiError(response);
        const data = await response.json();
        setTasks(data);
      } catch (error) {
        console.error("Error fetching tasks:", error);
        setTaskError(error);
      } finally {
        setTaskLoading(false);
      }
    };
    fetchTasks();
  }, [selectedClassroom]);


  const handleClassroomChange = (event) => {
    const newClassroom = event.target.value;
    setSelectedClassroom(newClassroom);
    logUserActivity("Select Classroom", { selected_classroom: newClassroom });
  };

  const handleSearchChange = (event) => {
    const query = event.target.value;
    setSearchQuery(query);
    logUserActivity("Search Videos", { search_query: query });
  };

  const handleViewMore = () => {
    setVisiblePastVideos((prev) => prev + 5);
    logUserActivity("View More Past Videos", { new_limit: visiblePastVideos + 5 });
  };

  const handleVideoClick = (video) => {
    console.log("Video clicked:", video.video_title); // Debug log
    const videoId = new URL(video.youtube_url).searchParams.get("v");
    setPlayingVideoId(videoId === playingVideoId ? null : videoId);
    logUserActivity("Play Video", {
      video_title: video.video_title,
      video_id: videoId,
      section: "Todays Videos",
    });
  };

  const handlePastVideoClick = (video) => {
    console.log("Past Video clicked:", video.video_title); // Debug log
    const videoId = new URL(video.youtube_url).searchParams.get("v");
    setPlayingVideoId(videoId === playingVideoId ? null : videoId);
    logUserActivity("Play Past Video", {
      video_title: video.video_title,
      video_id: videoId,
      section: "Past Videos",
    });
  };
  const handleDateChange = (event) => {
    setSelectedDate(event.target.value);
    logUserActivity("Filter Tasks by Date", { selected_date: event.target.value });
  };


  const filterVideos = (videos) =>
    videos.filter((video) => video.video_title.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredTodaysVideos = useMemo(() => filterVideos(todaysVideos), [todaysVideos, searchQuery]);
  const filteredPastVideos = useMemo(() => filterVideos(pastVideos), [pastVideos, searchQuery]);


  const filterTasksByDate = useCallback((tasks) => {
    return tasks.filter(task => {
      const selected = new Date(selectedDate);
      const start = new Date(task.start_time);
      const end = new Date(task.end_time);
      return selected >= start.setHours(0,0,0,0) &&
             selected <= end.setHours(23,59,59,999);
    });
  }, [selectedDate]);

  const filteredTasks = useMemo(() => filterTasksByDate(tasks), [tasks, filterTasksByDate]);

  const calculateDuration = (start, end) => {
    if (!start || !end) return "N/A";
    const diff = new Date(end) - new Date(start);
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const handleYoutubePlayerReady = (videoId) => (event) => {
    setYoutubePlayers(prevPlayers => ({
      ...prevPlayers,
      [videoId]: event.target,
    }));
  };

  const todaysVideoPlayerOptions = useMemo(() => ({
    playerVars: {
      // rel: 0, // Removed for "normal" embed
      // modestbranding: 1, // Removed for "normal" embed
      autoplay: 1,
      controls: 1
    },
  }), []);

  const pastVideoPlayerOptions = useMemo(() => ({
    playerVars: {
      // rel: 0,  // Removed for "normal" embed
      // modestbranding: 1,  // Removed for "normal" embed
      autoplay: 0,
      controls: 1
    },
  }), []);


  return (
    <div className="classroom-container">
      <div className="classroom-select">
        <label htmlFor="classroomSelect">क्लासरूम चुनें:</label>
        <select id="classroomSelect" value={selectedClassroom} onChange={handleClassroomChange}>
          <option value="">-- कृपया एक क्लासरूम चुनें --</option>
          {classroomNames.map((name, index) => (
            <option key={index} value={name}>{name}</option>
          ))}
        </select>
      </div>

      {!selectedClassroom && (
        <div className="special-card">
          <p>वीडियो, उपस्थिति और कार्य देखने के लिए कृपया एक क्लासरूम चुनें।</p>
        </div>
      )}

      {selectedClassroom && (
        <>
          <div className="search-container">
            <input
              type="text"
              placeholder="वीडियो शीर्षक खोजें..."
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>

          {loadingVideos ? (
            <div className="skeleton-grid">
              {[...Array(6)].map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : videoError ? (
            <div className="error-message">वीडियो लोड करने में त्रुटि: {videoError.message}</div>
          ) : (
            <>
              <section className="video-section">
                <h2 className="video-title">आज की कक्षाएं</h2>
                {filteredTodaysVideos.length > 0 ? (
                  <div className="video-grid">
                    {filteredTodaysVideos.map((video, index) => (
                      <div className="video-card" key={index}>
                        <h3>{video.video_title}</h3>
                        <div className="video-iframe">
                          {playingVideoId === new URL(video.youtube_url).searchParams.get("v") ? (
                            <YouTube
                              videoId={new URL(video.youtube_url).searchParams.get("v")}
                              opts={todaysVideoPlayerOptions}
                              onReady={handleYoutubePlayerReady(new URL(video.youtube_url).searchParams.get("v"))}
                            />
                          ) : (
                            <img
                              src={`https://img.youtube.com/vi/${new URL(video.youtube_url).searchParams.get("v")}/hqdefault.jpg`}
                              alt={video.video_title}
                              style={{ width: '100%', cursor: 'pointer', borderRadius: '10px', height: '200px', objectFit: 'cover' }}
                              onClick={() => handleVideoClick(video)}
                            />
                          )}
                        </div>
                        <p>Date: {new Date(video.live_date).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>इस क्लासरूम में आज के लिए कोई कक्षा निर्धारित नहीं है।</p>
                )}
              </section>

              <section className="attendance-section central-card">
                <h2>उपस्थिति</h2>
                {loadingAttendance ? (
                  <p>उपस्थिति डेटा लोड हो रहा है...</p>
                ) : attendanceError ? (
                  <div className="error-message">उपस्थिति लोड करने में त्रुटि: {attendanceError.message}</div>
                ) : attendance.length > 0 ? (
                  <ul className="attendance-list">
                    {attendance.map((student, idx) => (
                      <li
                        key={idx}
                        className="student-attendance"
                        onClick={() => logUserActivity("View Student Attendance", { student_name: student.name, fcc_id: student.fcc_id })}
                      >
                        <div className="student-profile">
                          {studentPhotos[student.fcc_id] ? (
                            <img
                              src={studentPhotos[student.fcc_id]}
                              alt={`${student.name}'s profile`}
                              className="profile-pic"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : (
                            <div className="profile-initial">{student.name.charAt(0).toUpperCase()}</div>
                          )}
                          <div className="student-info">
                            <span className="student-name">{student.name}</span>
                            <span className="attendance-date">{student.date || "N/A"}</span>
                          </div>
                        </div>
                        <div className="attendance-details">
                          <span className={`badge ${student.status === "Class attended" ? "present" : "absent"}`}>
                            {student.status}
                          </span>
                          {student.duration && <span className="duration"> ({student.duration})</span>}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>इस कक्षा के लिए कोई छात्र डेटा उपलब्ध नहीं है।</p>
                )}
              </section>

              {/* Date Filter for Tasks */}
              <div className="date-filter-container">
                <label htmlFor="dateFilter">तिथि के अनुसार कार्य फ़िल्टर करें:</label>
                <input type="date" id="dateFilter" value={selectedDate} onChange={handleDateChange} />
              </div>


              {/* Task Section */}
              <section className="task-section">
                <h2 className="video-title">वर्तमान कार्य</h2>
                {taskLoading ? (
                  <div className="skeleton-grid">
                    {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
                  </div>
                ) : taskError ? (
                  <div className="error-message">कार्य लोड करने में त्रुटि: {taskError}</div>
                ) : (
                  <div className="task-grid">
                    {filteredTasks.length > 0 ? (
                      filteredTasks.map((task, index) => (
                        <div key={index} className="task-card">
                          <h3>{task.task_name}</h3>
                          <p className="task-description">{task.description}</p>
                          <div className="task-meta">
                            <span className="task-score">Max Score: {task.max_score}</span>
                            <span className="task-duration">Duration: {calculateDuration(task.start_time, task.end_time)}</span>
                          </div>
                          <div className="task-timings">
                            <p>Start: {new Date(task.start_time).toLocaleString()}</p>
                            <p>End: {new Date(task.end_time).toLocaleString()}</p>
                          </div>
                          <div className={`task-status ${new Date() > new Date(task.end_time) ? 'expired' : new Date() < new Date(task.start_time) ? 'upcoming' : 'active'}`}>
                            {new Date() > new Date(task.end_time) ? 'समाप्त' : new Date() < new Date(task.start_time) ? 'आगामी' : 'सक्रिय'}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p>चयनित तिथि के लिए कोई कार्य उपलब्ध नहीं है</p>
                    )}
                  </div>
                )}
              </section>


              <section className="video-section ended-classes-section">
                <h2 className="video-title">समाप्त कक्षाएं</h2>
                {filteredPastVideos.length > 0 ? (
                  <>
                    <div className="video-grid horizontal-scroll">
                      {filteredPastVideos.slice(0, visiblePastVideos).map((video, index) => (
                        <div key={index} className="video-card">
                          <h3>{video.video_title}</h3>
                          <div className="video-iframe">
                          {playingVideoId === new URL(video.youtube_url).searchParams.get("v") ? (
                            <YouTube
                              videoId={new URL(video.youtube_url).searchParams.get("v")}
                              opts={pastVideoPlayerOptions}
                              onReady={handleYoutubePlayerReady(new URL(video.youtube_url).searchParams.get("v"))}
                            />
                          ) : (
                            <img
                              src={`https://img.youtube.com/vi/${new URL(video.youtube_url).searchParams.get("v")}/hqdefault.jpg`}
                              alt={video.video_title}
                              style={{ width: '100%', cursor: 'pointer', borderRadius: '10px', height: '200px', objectFit: 'cover' }}
                              onClick={() => handlePastVideoClick(video)}
                            />
                          )}
                          </div>
                          <p>Date: {new Date(video.live_date).toLocaleDateString()}</p>
                        </div>
                      ))}
                    </div>
                    {filteredPastVideos.length > visiblePastVideos && (
                      <button className="view-more-btn" onClick={handleViewMore}>
                        और देखें
                      </button>
                    )}
                  </>
                ) : (
                  <p>इस क्लासरूम के लिए कोई समाप्त कक्षाएं उपलब्ध नहीं हैं।</p>
                )}
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default Classroom;