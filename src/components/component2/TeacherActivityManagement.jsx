import React, { useState, useEffect } from "react";
import axios from "axios";
import "./TeacherActivityManagement.css";
import {
  FaPlus,
  FaSignInAlt,
  FaSignOutAlt,
  FaChalkboardTeacher,
  FaBook,
  FaStop,
  FaFilter,
  FaBed,
  FaDoorOpen,
  FaTv,
  FaUtensils,
  FaQuestion,
} from "react-icons/fa";

const TeacherActivityManagement = () => {
  const [teacher, setTeacher] = useState({ fccid: "", name: "", subject: "" });
  const [teachers, setTeachers] = useState([]);
  const [activeEntries, setActiveEntries] = useState({});
  const [activeSessions, setActiveSessions] = useState({});
  const [filters, setFilters] = useState({ fccid: "", start_date: "", end_date: "" });
  const [report, setReport] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  // API URL from environment variables, recommended approach for configuration
  const API_BASE_URL = process.env.REACT_APP_API_URL;

  // Session Types - descriptive array for session management buttons
  const sessionTypes = [
    { type: "teaching", label: "Start Teaching", icon: <FaChalkboardTeacher />, color: "btn-info" },
    { type: "study", label: "Start Study", icon: <FaBook />, color: "btn-warning" },
    { type: "sleeping", label: "Start Sleeping", icon: <FaBed />, color: "btn-secondary" },
    { type: "out_of_campus", label: "Out of Campus", icon: <FaDoorOpen />, color: "btn-danger" },
    { type: "entertainment", label: "Start Entertainment", icon: <FaTv />, color: "btn-success" },
    { type: "lunch", label: "Start Lunch", icon: <FaUtensils />, color: "btn-primary" },
    { type: "breakfast", label: "Start Breakfast", icon: <FaUtensils />, color: "btn-primary" },
    { type: "dinner", label: "Start Dinner", icon: <FaUtensils />, color: "btn-primary" },
    { type: "others", label: "Start Others", icon: <FaQuestion />, color: "btn-dark" },
  ];

  // useEffect hook for initial data fetching and setting up real-time clock
  useEffect(() => {
    fetchTeachers(); // Fetch teacher data on component mount
    fetchActiveSessions(); // Fetch active session data on component mount
    const timer = setInterval(() => setCurrentTime(new Date()), 1000); // Update current time every second for duration display

    // Cleanup function to clear the interval when component unmounts, preventing memory leaks
    return () => clearInterval(timer);
  }, []); // Empty dependency array ensures this effect runs only once on mount and unmount

  // Function to fetch teacher data from the API
  const fetchTeachers = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/teachers`, {
        headers: {
          "ngrok-skip-browser-warning": "true", // Bypass ngrok warning for API requests
        },
      });
      setTeachers(response.data); // Update teachers state with fetched data
    } catch (error) {
      console.error("Error fetching teachers:", error); // Log error if fetching fails
    }
  };

  // Function to fetch active session data from the API
  const fetchActiveSessions = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/group-sessions/active`, {
        headers: {
          "ngrok-skip-browser-warning": "true", // Bypass ngrok warning for API requests
        },
      });
      // Transform the fetched active sessions data into a more convenient format (object keyed by fccid)
      const activeSessionsData = response.data.reduce((accumulator, session) => {
        accumulator[session.fccid] = {
          type: session.session_type,
          id: session.session_id,
          startTime: new Date(session.start_time),
        };
        return accumulator;
      }, {});
      setActiveSessions(activeSessionsData); // Update activeSessions state with transformed data
    } catch (error) {
      console.error("Error fetching active sessions:", error); // Log error if fetching fails
    }
  };

  // Handler for input changes in the "Add Teacher" form
  const handleTeacherChange = (event) => {
    setTeacher({ ...teacher, [event.target.name]: event.target.value }); // Update teacher state based on input changes
  };

  // Handler for input changes in the report filter form
  const handleFilterChange = (event) => {
    setFilters({ ...filters, [event.target.name]: event.target.value }); // Update filters state based on input changes
  };

  // Function to add a new teacher to the database via API call
  const addTeacher = async () => {
    try {
      await axios.post(`${API_BASE_URL}/teachers`, teacher, {
        headers: {
          "ngrok-skip-browser-warning": "true", // Bypass ngrok warning for API requests
        },
      });
      setTeacher({ fccid: "", name: "", subject: "" }); // Reset the teacher form after successful submission
      fetchTeachers(); // Refresh the teacher list to include the newly added teacher
      alert("Teacher added successfully!"); // Provide user feedback
    } catch (error) {
      console.error("Error adding teacher:", error); // Log error if adding teacher fails
      alert("Failed to add teacher!"); // Provide user feedback
    }
  };

  // Function to record campus entry for a teacher
  const recordEntry = async (fccid) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/campus-entry`, { fccid }, {
        headers: {
          "ngrok-skip-browser-warning": "true", // Bypass ngrok warning for API requests
        },
      });
      setActiveEntries((previousEntries) => ({ ...previousEntries, [fccid]: response.data.entry_id })); // Update activeEntries state to track entry
      alert(`Entry recorded for ${fccid}!`); // Provide user feedback
    } catch (error) {
      console.error("Error recording entry:", error); // Log error if recording entry fails
      alert("Failed to record entry!"); // Provide user feedback
    }
  };

  // Function to record campus exit for a teacher
  const recordExit = async (fccid) => {
    const entryId = activeEntries[fccid]; // Retrieve the entry ID from activeEntries state
    if (!entryId) {
      alert(`No active entry found for ${fccid}!`); // Alert if no active entry exists for the teacher
      return; // Exit function if no active entry
    }
    try {
      await axios.put(`${API_BASE_URL}/campus-exit/${entryId}`, {}, {
        headers: {
          "ngrok-skip-browser-warning": "true", // Bypass ngrok warning for API requests
        },
      });
      setActiveEntries((previousEntries) => ({ ...previousEntries, [fccid]: null })); // Clear active entry for the teacher in state
      alert(`Exit recorded for ${fccid}!`); // Provide user feedback
    } catch (error) {
      console.error("Error recording exit:", error); // Log error if recording exit fails
      alert("Failed to record exit!"); // Provide user feedback
    }
  };

  // Function to start a session for a teacher (e.g., teaching, study, etc.)
  const startSession = async (fccid, type) => {
    const endpoint = `group-sessions/start`;
    try {
      const response = await axios.post(
        `${API_BASE_URL}/${endpoint}`,
        { fccid, session_type: type },
        {
          headers: {
            "ngrok-skip-browser-warning": "true", // Bypass ngrok warning for API requests
          },
        }
      );
      setActiveSessions((previousSessions) => ({
        ...previousSessions,
        [fccid]: { type, id: response.data.session_id, startTime: new Date() }, // Update activeSessions state with new session details
      }));
      alert(`${type} session started for ${fccid}!`); // Provide user feedback
    } catch (error) {
      console.error(`Error starting ${type} session:`, error); // Log error if starting session fails
      alert(`Failed to start ${type} session!`); // Provide user feedback
    }
  };

  // Function to end an active session for a teacher
  const endSession = async (fccid) => {
    const session = activeSessions[fccid]; // Retrieve active session details from state
    if (!session) {
      alert(`No active session found for ${fccid}!`); // Alert if no active session exists for the teacher
      return; // Exit function if no active session
    }
    const endpoint = `group-sessions/end/${session.id}`;
    try {
      await axios.put(`${API_BASE_URL}/${endpoint}`, {}, {
        headers: {
          "ngrok-skip-browser-warning": "true", // Bypass ngrok warning for API requests
        },
      });
      setActiveSessions((previousSessions) => ({ ...previousSessions, [fccid]: null })); // Clear active session for the teacher in state
      alert(`${session.type} session ended for ${fccid}!`); // Provide user feedback
    } catch (error) {
      console.error("Error ending session:", error); // Log error if ending session fails
      alert("Failed to end session!"); // Provide user feedback
    }
  };

  // Function to fetch activity report data based on filters
  const fetchReport = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/activity-report`, {
        params: filters, // Send filters as query parameters to the API
        headers: {
          "ngrok-skip-browser-warning": "true", // Bypass ngrok warning for API requests
        },
      });
      setReport(response.data); // Update report state with fetched data
    } catch (error) {
      console.error("Error fetching report:", error); // Log error if fetching report fails
      alert("Failed to fetch report!"); // Provide user feedback
    }
  };

  // Function to format the duration of an active session for display
  const formatDuration = (startTime) => {
    if (!startTime) return "00:00:00"; // Return "00:00:00" if start time is not available
    const diffMs = currentTime - new Date(startTime); // Calculate time difference in milliseconds
    const seconds = Math.floor(diffMs / 1000); // Convert milliseconds to seconds
    const hours = Math.floor(seconds / 3600); // Extract hours
    const minutes = Math.floor((seconds % 3600) / 60); // Extract minutes
    const secs = seconds % 60; // Extract seconds
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`; // Format duration as HH:MM:SS
  };

  return (
    <div className="activity-container">
      <h2>Teacher Activity Management</h2>

      {/* Section for Adding a New Teacher */}
      <div className="form-section">
        <h3>Add Teacher</h3>
        <div className="form-grid">
          <label>
            FCC ID:
            <input name="fccid" placeholder="FCC ID" value={teacher.fccid} onChange={handleTeacherChange} />
          </label>
          <label>
            Name:
            <input name="name" placeholder="Name" value={teacher.name} onChange={handleTeacherChange} />
          </label>
          <label>
            Subject:
            <input name="subject" placeholder="Subject" value={teacher.subject} onChange={handleTeacherChange} />
          </label>
        </div>
        <button className="btn btn-primary" onClick={addTeacher}>
          <FaPlus /> Add Teacher
        </button>
      </div>

      {/* Section for Campus Entry and Exit Recording */}
      <div className="form-section">
        <h3>Campus Entry/Exit</h3>
        {teachers.map((teacherData) => (
          <div key={teacherData.fccid} className="teacher-section">
            <span>
              {teacherData.name} ({teacherData.fccid}) - {teacherData.subject}
            </span>
            <div className="button-group">
              <button
                className="btn btn-success"
                onClick={() => recordEntry(teacherData.fccid)}
                disabled={!!activeEntries[teacherData.fccid]} // Disable if entry is already active
                title={activeEntries[teacherData.fccid] ? "Entry already recorded" : "Record Entry"}
              >
                <FaSignInAlt /> Entry
              </button>
              <button
                className={`btn btn-danger ${activeEntries[teacherData.fccid] ? "pulse" : ""}`} // Pulse animation if entry is active
                onClick={() => recordExit(teacherData.fccid)}
                disabled={!activeEntries[teacherData.fccid]} // Disable if no active entry
                title={!activeEntries[teacherData.fccid] ? "No active entry" : "Record Exit"}
              >
                <FaSignOutAlt /> Exit
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Section for Session Management (Start/End Teaching, Study, etc.) */}
      <div className="form-section">
        <h3>Session Management</h3>
        {teachers.map((teacherData) => (
          <div key={teacherData.fccid} className="teacher-section">
            <span>
              {teacherData.name} ({teacherData.fccid}) - {teacherData.subject}
            </span>
            <div className="button-group">
              {sessionTypes.map((session) => (
                <button
                  key={session.type}
                  className={`btn ${session.color}`}
                  onClick={() => startSession(teacherData.fccid, session.type)}
                  disabled={!!activeSessions[teacherData.fccid]} // Disable if a session is already active
                  title={activeSessions[teacherData.fccid] ? "Session already active" : session.label}
                >
                  {session.icon} {session.label}
                </button>
              ))}
              <button
                className={`btn btn-secondary ${activeSessions[teacherData.fccid] ? "pulse" : ""}`} // Pulse animation if session is active
                onClick={() => endSession(teacherData.fccid)}
                disabled={!activeSessions[teacherData.fccid]} // Disable if no active session
                title={!activeSessions[teacherData.fccid] ? "No active session" : "End Session"}
              >
                <FaStop /> End Session
              </button>
            </div>
            {activeSessions[teacherData.fccid] && (
              <div className="session-status">
                <p>
                  Active Session: <strong>{activeSessions[teacherData.fccid].type}</strong> <br />
                  Started at: <strong>{new Date(activeSessions[teacherData.fccid].startTime).toLocaleTimeString()}</strong>{" "}
                  <br />
                  Duration: <strong>{formatDuration(activeSessions[teacherData.fccid].startTime)}</strong>
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Section for Activity Report Filters */}
      <div className="form-section">
        <h3>Activity Report</h3>
        <div className="form-grid">
          <label>
            FCC ID (Optional):
            <input name="fccid" placeholder="FCC ID" value={filters.fccid} onChange={handleFilterChange} />
          </label>
          <label>
            Start Date:
            <input name="start_date" type="date" value={filters.start_date} onChange={handleFilterChange} />
          </label>
          <label>
            End Date:
            <input name="end_date" type="date" value={filters.end_date} onChange={handleFilterChange} />
          </label>
        </div>
        <button className="btn btn-primary" onClick={fetchReport}>
          <FaFilter /> Generate Report
        </button>
      </div>

      {/* Section for Displaying Activity Report in a Table */}
      <div className="report-table">
        <table>
          <thead>
            <tr>
              <th>FCC ID</th>
              <th>Name</th>
              <th>Subject</th>
              <th>Campus Visits</th>
              <th>Total Campus Time</th>
              <th>Teaching Time</th>
              <th>Study Time</th>
              <th>Sleeping Time</th>
              <th>Entertainment Time</th>
              <th>Lunch Time</th>
              <th>Breakfast Time</th>
              <th>Dinner Time</th>
              <th>Meal Time</th>
              <th>Out of Campus Time</th>
              <th>Others Time</th>
              <th>Time Lost</th>
            </tr>
          </thead>
          <tbody>
            {report.map((entry) => (
              <tr key={entry.fccid}>
                <td>{entry.fccid}</td>
                <td>{entry.name}</td>
                <td>{entry.subject}</td>
                <td>{entry.campus_visits}</td>
                <td>{entry.total_campus_time}</td>
                <td>{entry.teaching_time}</td>
                <td>{entry.study_time}</td>
                <td>{entry.sleeping_time}</td>
                <td>{entry.entertainment_time}</td>
                <td>{entry.lunch_time}</td>
                <td>{entry.breakfast_time}</td>
                <td>{entry.dinner_time}</td>
                <td>{entry.meal_time}</td>
                <td>{entry.out_of_campus_time}</td>
                <td>{entry.others_time}</td>
                <td>{entry.time_lost}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TeacherActivityManagement;