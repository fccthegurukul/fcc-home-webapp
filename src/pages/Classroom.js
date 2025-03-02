import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./Classroom.css";
import { v4 as uuidv4 } from 'uuid'; // For unique session IDs

const SkeletonCard = () => (
  <div className="video-card skeleton-card">
    <div className="skeleton-title"></div>
    <div className="skeleton-iframe"></div>
    <div className="skeleton-date"></div>
  </div>
);

const Classroom = () => {
  const navigate = useNavigate();
  const sessionId = React.useRef(uuidv4()); // Unique session ID for tracking

  const [todaysVideos, setTodaysVideos] = useState([]);
  const [pastVideos, setPastVideos] = useState([]);
  const [visiblePastVideos, setVisiblePastVideos] = useState(5);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [videoError, setVideoError] = useState(null);
  const [classroomNames, setClassroomNames] = useState([]);
  const [selectedClassroom, setSelectedClassroom] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const handleApiError = async (response) => {
    if (!response.ok) {
      const message = `HTTP error! status: ${response.status}`;
      const errorData = await response.json();
      throw new Error(errorData?.message ? `${message} - Details: ${errorData.message}` : message);
    }
    return response;
  };

  // Reusable function for logging user activity
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

      const response = await fetch("http://localhost:5000/api/user-activity-log", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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
        const response = await fetch("http://localhost:5000/api/classrooms");
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
  }, [selectedClassroom]);

  // Click handlers
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
    logUserActivity("Play Video", {
      video_title: video.video_title,
      video_id: new URL(video.youtube_url).searchParams.get("v"),
      section: "Todays Videos",
    });
  };

  const handlePastVideoClick = (video) => {
    logUserActivity("Play Past Video", {
      video_title: video.video_title,
      video_id: new URL(video.youtube_url).searchParams.get("v"),
      section: "Past Videos",
    });
  };

  const filterVideos = (videos) =>
    videos.filter((video) => video.video_title.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredTodaysVideos = React.useMemo(() => filterVideos(todaysVideos), [todaysVideos, searchQuery]);
  const filteredPastVideos = React.useMemo(() => filterVideos(pastVideos), [pastVideos, searchQuery]);

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
                      <div key={index} className="video-card">
                        <h3>{video.video_title}</h3>
                        <div className="video-iframe">
                          <iframe
                            src={`https://www.youtube.com/embed/${new URL(video.youtube_url).searchParams.get("v")}?rel=0&modestbranding=1`}
                            title={video.video_title}
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            loading="lazy"
                            onClick={() => handleVideoClick(video)} // Track video click
                          ></iframe>
                        </div>
                        <p>Date: {new Date(video.live_date).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>इस क्लासरूम में आज के लिए कोई कक्षा निर्धारित नहीं है।</p>
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
                            <iframe
                              src={`https://www.youtube.com/embed/${new URL(video.youtube_url).searchParams.get("v")}?rel=0&modestbranding=1`}
                              title={video.video_title}
                              frameBorder="0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              loading="lazy"
                              onClick={() => handlePastVideoClick(video)} // Track past video click
                            ></iframe>
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