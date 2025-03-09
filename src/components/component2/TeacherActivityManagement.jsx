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

  const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  // Session Types
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

  useEffect(() => {
    fetchTeachers();
    fetchActiveSessions(); // Fetch active sessions on page load
    const timer = setInterval(() => setCurrentTime(new Date()), 1000); // Update time every second
    return () => clearInterval(timer);
  }, []);

  const fetchTeachers = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/teachers`, { withCredentials: true });
      setTeachers(res.data);
    } catch (err) {
      console.error("Error fetching teachers:", err);
    }
  };

  const fetchActiveSessions = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/group-sessions/active`, { withCredentials: true });
      const activeSessionsData = res.data.reduce((acc, session) => {
        acc[session.fccid] = {
          type: session.session_type,
          id: session.session_id,
          startTime: new Date(session.start_time),
        };
        return acc;
      }, {});
      setActiveSessions(activeSessionsData);
    } catch (err) {
      console.error("Error fetching active sessions:", err);
    }
  };

  const handleTeacherChange = (e) => setTeacher({ ...teacher, [e.target.name]: e.target.value });
  const handleFilterChange = (e) => setFilters({ ...filters, [e.target.name]: e.target.value });

  const addTeacher = async () => {
    try {
      await axios.post(`${API_BASE_URL}/teachers`, teacher, { withCredentials: true });
      setTeacher({ fccid: "", name: "", subject: "" });
      fetchTeachers();
      alert("Teacher added!");
    } catch (err) {
      console.error("Error adding teacher:", err);
    }
  };

  const recordEntry = async (fccid) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/campus-entry`, { fccid }, { withCredentials: true });
      setActiveEntries((prev) => ({ ...prev, [fccid]: res.data.entry_id }));
      alert(`Entry recorded for ${fccid}!`);
    } catch (err) {
      console.error("Error recording entry:", err);
      alert("Failed to record entry!");
    }
  };

  const recordExit = async (fccid) => {
    const entryId = activeEntries[fccid];
    if (!entryId) return alert(`No active entry for ${fccid}!`);
    try {
      await axios.put(`${API_BASE_URL}/campus-exit/${entryId}`, {}, { withCredentials: true });
      setActiveEntries((prev) => ({ ...prev, [fccid]: null }));
      alert(`Exit recorded for ${fccid}!`);
    } catch (err) {
      console.error("Error recording exit:", err);
      alert("Failed to record exit!");
    }
  };

  const startSession = async (fccid, type) => {
    const endpoint = `group-sessions/start`;
    try {
      const res = await axios.post(
        `${API_BASE_URL}/${endpoint}`,
        { fccid, session_type: type },
        { withCredentials: true }
      );
      setActiveSessions((prev) => ({
        ...prev,
        [fccid]: { type, id: res.data.session_id, startTime: new Date() },
      }));
      alert(`${type} session started for ${fccid}!`);
    } catch (err) {
      console.error(`Error starting ${type} session:`, err);
      alert(`Failed to start ${type} session!`);
    }
  };

  const endSession = async (fccid) => {
    const session = activeSessions[fccid];
    if (!session) return alert(`No active session for ${fccid}!`);
    const endpoint = `group-sessions/end/${session.id}`;
    try {
      await axios.put(`${API_BASE_URL}/${endpoint}`, {}, { withCredentials: true });
      setActiveSessions((prev) => ({ ...prev, [fccid]: null }));
      alert(`${session.type} session ended for ${fccid}!`);
    } catch (err) {
      console.error("Error ending session:", err);
      alert("Failed to end session!");
    }
  };

  const fetchReport = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/activity-report`, {
        params: filters,
        withCredentials: true,
      });
      setReport(res.data);
    } catch (err) {
      console.error("Error fetching report:", err);
      alert("Failed to fetch report!");
    }
  };

  const formatDuration = (startTime) => {
    if (!startTime) return "00:00:00";
    const diffMs = currentTime - new Date(startTime);
    const seconds = Math.floor(diffMs / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="activity-container">
      <h2>Teacher Activity Management</h2>

      {/* Add Teacher */}
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

      {/* Campus Entry/Exit */}
      <div className="form-section">
        <h3>Campus Entry/Exit</h3>
        {teachers.map((t) => (
          <div key={t.fccid} className="teacher-section">
            <span>{t.name} ({t.fccid}) - {t.subject}</span>
            <div className="button-group">
              <button
                className="btn btn-success"
                onClick={() => recordEntry(t.fccid)}
                disabled={!!activeEntries[t.fccid]}
                title={activeEntries[t.fccid] ? "Entry already recorded" : "Record Entry"}
              >
                <FaSignInAlt /> Entry
              </button>
              <button
                className={`btn btn-danger ${activeEntries[t.fccid] ? "pulse" : ""}`}
                onClick={() => recordExit(t.fccid)}
                disabled={!activeEntries[t.fccid]}
                title={!activeEntries[t.fccid] ? "No active entry" : "Record Exit"}
              >
                <FaSignOutAlt /> Exit
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Session Management */}
      <div className="form-section">
        <h3>Session Management</h3>
        {teachers.map((t) => (
          <div key={t.fccid} className="teacher-section">
            <span>{t.name} ({t.fccid}) - {t.subject}</span>
            <div className="button-group">
              {sessionTypes.map((session) => (
                <button
                  key={session.type}
                  className={`btn ${session.color}`}
                  onClick={() => startSession(t.fccid, session.type)}
                  disabled={!!activeSessions[t.fccid]}
                  title={activeSessions[t.fccid] ? "Session already active" : session.label}
                >
                  {session.icon} {session.label}
                </button>
              ))}
              <button
                className={`btn btn-secondary ${activeSessions[t.fccid] ? "pulse" : ""}`}
                onClick={() => endSession(t.fccid)}
                disabled={!activeSessions[t.fccid]}
                title={!activeSessions[t.fccid] ? "No active session" : "End Session"}
              >
                <FaStop /> End Session
              </button>
            </div>
            {activeSessions[t.fccid] && (
              <div className="session-status">
                <p>
                  Active Session: <strong>{activeSessions[t.fccid].type}</strong> <br />
                  Started at: <strong>{new Date(activeSessions[t.fccid].startTime).toLocaleTimeString()}</strong> <br />
                  Duration: <strong>{formatDuration(activeSessions[t.fccid].startTime)}</strong>
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Report Filters */}
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

      {/* Updated Report Table */}
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