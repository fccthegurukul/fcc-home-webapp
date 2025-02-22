import React, { useState, useEffect } from "react";
import "./Classroom.css";

// Skeleton Loader Component for Video Card
const SkeletonCard = () => (
  <div className="video-card skeleton-card">
    <div className="skeleton-title"></div>
    <div className="skeleton-iframe"></div>
    <div className="skeleton-date"></div>
  </div>
);

const Classroom = () => {
  // स्टेट्स
  const [todaysVideos, setTodaysVideos] = useState([]);
  const [pastVideos, setPastVideos] = useState([]);
  const [loadingVideos, setLoadingVideos] = useState(false); // वीडियोस के लिए लोडिंग स्टेट का नाम स्पष्ट करें
  const [videoError, setVideoError] = useState(null); // वीडियोस के लिए एरर स्टेट का नाम स्पष्ट करें
  const [classroomNames, setClassroomNames] = useState([]);
  const [selectedClassroom, setSelectedClassroom] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [attendance, setAttendance] = useState([]);
  const [attendanceError, setAttendanceError] = useState(null); // अटेंडेंस के लिए एरर स्टेट
  const [loadingAttendance, setLoadingAttendance] = useState(false); // अटेंडेंस लोडिंग स्टेट
  const [tasks, setTasks] = useState([]);
  const [taskLoading, setTaskLoading] = useState(false);
  const [taskError, setTaskError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // हेल्पर फंक्शन: एरर हैंडलिंग के लिए
  const handleApiError = async (response) => {
    if (!response.ok) {
      const message = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.json(); // Try to get more detailed error from backend
        if (errorData && errorData.message) {
          throw new Error(`${message} - Details: ${errorData.message}`);
        } else {
          throw new Error(message);
        }
      } catch (jsonError) { // If JSON parsing fails, just throw the basic error
        throw new Error(message);
      }
    }
    return response;
  };


  // क्लासरूम्स लोड करें (कम्पोनेंट माउंट होने पर एक बार)
  useEffect(() => {
    const fetchClassrooms = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/classrooms");
        await handleApiError(response); // एरर हैंडलिंग के लिए हेल्पर फंक्शन का उपयोग करें
        const data = await response.json();
        setClassroomNames(data);
      } catch (e) {
        console.error("Could not fetch classroom names:", e);
        setVideoError(e); // classroomNames को लोड करने में एरर को `videoError` में सेट करें, या एक अलग एरर स्टेट बनाएँ यदि उचित हो
      }
    };
    fetchClassrooms();
  }, []); // खाली डिपेंडेंसी एरे का मतलब है कि यह इफ़ेक्ट केवल एक बार चलेगा, माउंट होने पर

  // वीडियोस लोड करें (selectedClassroom बदलने पर)
  useEffect(() => {
    const fetchVideos = async () => {
      if (!selectedClassroom) {
        setTodaysVideos([]);
        setPastVideos([]);
        setLoadingVideos(false); // लोडिंग स्टेट को स्पष्ट करें
        return;
      }

      setLoadingVideos(true);
      setVideoError(null); // पिछली एरर को रीसेट करें
      try {
        const params = new URLSearchParams({ classroomName: selectedClassroom });
        const response = await fetch(`http://localhost:5000/api/videos?${params}`);
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
  }, [selectedClassroom]); // selectedClassroom बदलने पर ही वीडियोस को रि-फ़ेच करें

  // अटेंडेंस डेटा फ़ेच करें (selectedClassroom बदलने पर)
  useEffect(() => {
    const fetchAttendance = async () => {
      if (!selectedClassroom) {
        setAttendance([]);
        return;
      }

      setLoadingAttendance(true); // अटेंडेंस लोडिंग शुरू
      setAttendanceError(null); // पिछली एरर को रीसेट करें
      try {
        const response = await fetch(
          `http://localhost:5000/api/attendance?classroomName=${encodeURIComponent(selectedClassroom)}`
        );
        await handleApiError(response);
        const data = await response.json();
        setAttendance(data);
      } catch (error) {
        console.error("Error fetching attendance:", error);
        setAttendanceError(error);
      } finally {
        setLoadingAttendance(false); // अटेंडेंस लोडिंग समाप्त
      }
    };

    fetchAttendance();
  }, [selectedClassroom]); // selectedClassroom बदलने पर अटेंडेंस रि-फ़ेच करें

  // Tasks लोड करें (selectedClassroom बदलने पर)
  useEffect(() => {
    const fetchTasks = async () => {
      if (!selectedClassroom) {
        setTasks([]);
        return;
      }

      setTaskLoading(true);
      setTaskError(null);
      try {
        const classNumber = selectedClassroom.split(" ")[1]; // क्लासरूम नाम से क्लास नंबर निकालें
        const response = await fetch(
          `http://localhost:5000/api/tasks?class=${classNumber}`
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
    setSelectedClassroom(event.target.value);
  };

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const handleDateChange = (event) => {
    setSelectedDate(event.target.value);
  };

  // वीडियोस को सर्च क्वेरी के हिसाब से फ़िल्टर करें (मेमोइज़ेशन का उपयोग परफॉर्मेंस के लिए)
  const filterVideos = (videos) => {
    return videos.filter((video) =>
      video.video_title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const filteredTodaysVideos = React.useMemo(() => filterVideos(todaysVideos), [todaysVideos, searchQuery]);
  const filteredPastVideos = React.useMemo(() => filterVideos(pastVideos), [pastVideos, searchQuery]);

  // Tasks को तारीख के अनुसार फ़िल्टर करें (मेमोइज़ेशन का उपयोग परफॉर्मेंस के लिए)
  const filterTasksByDate = React.useCallback((tasks) => {
    return tasks.filter(task => {
      const selected = new Date(selectedDate);
      const start = new Date(task.start_time);
      const end = new Date(task.end_time);

      return selected >= start.setHours(0,0,0,0) &&
             selected <= end.setHours(23,59,59,999);
    });
  }, [selectedDate]); // selectedDate बदलने पर ही फ़िल्टर फंक्शन को रीक्रिएट करें

  const filteredTasks = React.useMemo(() => filterTasksByDate(tasks), [tasks, filterTasksByDate]);

  // अवधि कैलकुलेट करने का फंक्शन
  const calculateDuration = (start, end) => {
    if (!start || !end) return "N/A"; // नल या अपरिभाषित मानों के लिए सुरक्षा जांच
    const diff = new Date(end) - new Date(start);
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return `${days} days ${hours} hours`;
  };

  return (
    <div className="classroom-container">
      {/* क्लासरूम सिलेक्टर */}
      <div className="classroom-select">
        <label htmlFor="classroomSelect">Select Classroom:</label>
        <select id="classroomSelect" value={selectedClassroom} onChange={handleClassroomChange}>
          <option value="">-- Please select a classroom --</option>
          {classroomNames.map((name, index) => (
            <option key={index} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {/* अगर कोई क्लासरूम सेलेक्ट नहीं हुआ तो */}
      {!selectedClassroom && (
        <div className="special-card">
          <p>Please select a classroom to view videos, attendance and tasks.</p>
        </div>
      )}

      {selectedClassroom && (
        <>
          {/* सर्च इनपुट */}
          <div className="search-container">
            <input
              type="text"
              placeholder="Search video titles..."
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>

          {loadingVideos ? ( // लोडिंग स्टेट को `loadingVideos` में बदलें
            <div className="skeleton-grid">
              {[...Array(6)].map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : videoError ? ( // एरर स्टेट को `videoError` में बदलें
            <div className="error-message">Error loading videos: {videoError.message}</div>
          ) : (
            <>
              {/* आज की कक्षाएँ */}
              <section className="video-section">
                <h2 className="video-title">Today's Classes</h2>
                {filteredTodaysVideos.length > 0 ? (
                  <div className="video-grid">
                    {filteredTodaysVideos.map((video, index) => (
                      <div key={index} className="video-card">
                        <h3>{video.video_title}</h3>
                        <div className="video-iframe">
                          <iframe
                            src={`https://www.youtube.com/embed/${new URL(
                              video.youtube_url
                            ).searchParams.get("v")}`}
                            title={video.video_title}
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                            loading="lazy"
                          ></iframe>
                        </div>
                        <p>Date: {new Date(video.live_date).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No classes scheduled for today in this classroom.</p>
                )}
              </section>

              {/* अटेंडेंस कार्ड */}
              <section className="attendance-section central-card">
                <h2>Attendance</h2>
                {loadingAttendance ? ( // अटेंडेंस लोडिंग स्टेट
                  <p>Loading attendance data...</p>
                ) : attendanceError ? ( // अटेंडेंस एरर स्टेट
                  <div className="error-message">Error loading attendance: {attendanceError.message}</div>
                ) : attendance.length > 0 ? (
                  <ul>
                    {attendance.map((student, idx) => (
                      <li key={idx} className="student-attendance">
                        <span className="student-name">{student.name}</span>
                        <span
                          className={`badge ${
                            student.status === "Class attended" ? "present" : "absent"
                          }`}
                        >
                          {student.status}
                        </span>
                        {student.duration && (
                          <span className="duration"> ({student.duration})</span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No student data available for this class.</p>
                )}
              </section>

              {/* तारीख फ़िल्टर */}
              <div className="date-filter-container">
                <label htmlFor="dateFilter">Filter Tasks by Date:</label>
                <input
                  type="date"
                  id="dateFilter"
                  value={selectedDate}
                  onChange={handleDateChange}
                />
              </div>

              {/* टास्क सेक्शन */}
              <section className="task-section">
                <h2 className="video-title">Current Tasks</h2>
                {taskLoading ? (
                  <div className="skeleton-grid">
                    {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
                  </div>
                ) : taskError ? (
                  <div className="error-message">Error loading tasks: {taskError}</div>
                ) : (
                  <div className="task-grid">
                    {filteredTasks.length > 0 ? (
                      filteredTasks.map((task) => (
                        <div key={task.task_id} className="task-card">
                          <h3>{task.task_name}</h3>
                          <p className="task-description">{task.description}</p>
                          <div className="task-meta">
                            <span className="task-score">
                              Max Score: {task.max_score}
                            </span>
                            <span className="task-duration">
                              Duration: {calculateDuration(task.start_time, task.end_time)}
                            </span>
                          </div>
                          <div className="task-timings">
                            <p>Start: {new Date(task.start_time).toLocaleString()}</p>
                            <p>End: {new Date(task.end_time).toLocaleString()}</p>
                          </div>
                          <div className={`task-status ${
                            new Date() > new Date(task.end_time) ? 'expired' :
                            new Date() < new Date(task.start_time) ? 'upcoming' : 'active'
                          }`}>
                            {new Date() > new Date(task.end_time) ? 'Expired' :
                             new Date() < new Date(task.start_time) ? 'Upcoming' : 'Active'}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p>No tasks available for selected date</p>
                    )}
                  </div>
                )}
              </section>

              {/* पुरानी कक्षाएँ */}
              <section className="video-section ended-classes-section">
                <h2 className="video-title">Class Ended</h2>
                {filteredPastVideos.length > 0 ? (
                  <div className="video-grid horizontal-scroll">
                    {filteredPastVideos.map((video, index) => (
                      <div key={index} className="video-card">
                        <h3>{video.video_title}</h3>
                        <div className="video-iframe">
                          <iframe
                            src={`https://www.youtube.com/embed/${new URL(
                              video.youtube_url
                            ).searchParams.get("v")}`}
                            title={video.video_title}
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                            loading="lazy"
                          ></iframe>
                        </div>
                        <p>Date: {new Date(video.live_date).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No ended classes available for this classroom.</p>
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