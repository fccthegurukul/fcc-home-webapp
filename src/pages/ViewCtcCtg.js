import React, { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import jsPDF from "jspdf"; // Library for generating PDFs
import "jspdf-autotable"; // For auto table generation
import "./ViewCtcCtg.css"; // Add necessary styles
import NotFoundImage from '../assets/404-image.jpg'; // Import default image
import { v4 as uuidv4 } from 'uuid'; // Import UUID v4


const ViewCtcCtg = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("previous7");
  const [filteredLogs, setFilteredLogs] = useState([]);
  const initialFccId = location.state?.fccId;
  const recentProfilesData = location.state?.recentProfiles || [];
  const initialStudent = location.state?.student || null;
  const [fccId, setFccId] = useState(initialFccId || localStorage.getItem("lastViewedFccId") || "");
  const [recentProfiles, setRecentProfiles] = useState(recentProfilesData);
  const [student, setStudent] = useState(initialStudent);
  const sessionId = useRef(uuidv4()); // Generate session ID
  const apiUrl = process.env.REACT_APP_API_URL;


    // Reusable function for logging user activity
    const logUserActivity = useCallback(async (activityType, activityDetails = null) => {
        try {
            const activityData = {
                activity_type: activityType,
                activity_details: activityDetails ? JSON.stringify(activityDetails) : null,
                page_url: window.location.pathname,
                session_id: sessionId.current,
            };

            await fetch(`${apiUrl}/api/user-activity-log`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    "ngrok-skip-browser-warning": "true"
                },
                body: JSON.stringify(activityData)
            });
            console.log(`User activity '${activityType}' logged successfully.`);
        } catch (error) {
            console.error("Error logging user activity:", error);
        }
    }, [apiUrl]);


    // Filter logs based on selected filter
    const filterLogs = (logs, filterType) => {
      const today = new Date();
      let filtered = [...logs];

      switch (filterType) {
        case "month":
          filtered = logs.filter((log) => {
            const logDate = new Date(log.log_date);
            return logDate.getMonth() === today.getMonth() && logDate.getFullYear() === today.getFullYear();
          });
          break;
        case "week":
          const startOfWeek = new Date(today);
          startOfWeek.setDate(today.getDate() - today.getDay());
          filtered = logs.filter((log) => new Date(log.log_date) >= startOfWeek);
          break;
        case "previous7":
          const sevenDaysAgo = new Date(today);
          sevenDaysAgo.setDate(today.getDate() - 7);
          filtered = logs.filter((log) => new Date(log.log_date) >= sevenDaysAgo);
          break;
        case "previous10":
          const tenDaysAgo = new Date(today);
          tenDaysAgo.setDate(today.getDate() - 10);
          filtered = logs.filter((log) => new Date(log.log_date) >= tenDaysAgo);
          break;
        case "previous15":
          const fifteenDaysAgo = new Date(today);
          fifteenDaysAgo.setDate(today.getDate() - 15);
          filtered = logs.filter((log) => new Date(log.log_date) >= fifteenDaysAgo);
          break;
        case "previous30":
          const thirtyDaysAgo = new Date(today);
          thirtyDaysAgo.setDate(today.getDate() - 30);
          filtered = logs.filter((log) => new Date(log.log_date) >= thirtyDaysAgo);
          break;
        case "all": // Add 'all' case to return all logs without filtering
          filtered = logs;
          break;
        default:
          filtered = logs;
          break;
      }

      return filtered;
    };


  // Function to handle filter selection
  const handleFilterChange = (event) => {
    setFilter(event.target.value);
    logUserActivity('Change Log Filter', { filter_type: event.target.value }); // Log filter change
  };


  useEffect(() => {
    // If recentProfiles are not passed from StudentProfile, try to get from localStorage
    if (recentProfiles.length === 0) {
      const savedRecentProfiles = JSON.parse(localStorage.getItem("recentProfiles")) || [];
      setRecentProfiles(savedRecentProfiles);
    }
  }, []);


  // Fetch CTC/CTG data and Student Profile when component mounts or FCC ID changes
  useEffect(() => {
    const fetchData = async () => {
      if (!fccId) return; // Don't fetch if fccId is not available

      setLoading(true);
      setError(""); // Clear previous errors

      try {
        const ctcCtgResponse = await fetch(
          `${apiUrl}/get-ctc-ctg/${fccId}`, // Using apiUrl here
          {
            headers: {
              "ngrok-skip-browser-warning": "true",
            },
          }
        );
        const ctcCtgResult = await ctcCtgResponse.json();

        if (ctcCtgResponse.ok) {
          setData(ctcCtgResult.student); // Student data for CTC/CTG
          setFilteredLogs(filterLogs(ctcCtgResult.logs, filter)); // Apply initial filter (Previous 7 Days)
          logUserActivity('Fetch CTC CTG Data Success', { fcc_id: fccId }); // Log data fetch success
        } else {
          setData(null);
          setFilteredLogs([]);
          setError(ctcCtgResult.error || "Problem fetching CTC/CTG data");
          logUserActivity('Fetch CTC CTG Data Failure', { fcc_id: fccId, error: ctcCtgResult.error }); // Log data fetch failure
        }


      } catch (err) {
        setError("Problem fetching CTC/CTG data");
        logUserActivity('Fetch CTC CTG Data Exception', { fcc_id: fccId, error: err.message }); // Log fetch exception
      } finally {
        setLoading(false);
      }
    };


    // Fetch student profile again if not passed in state or if fccId changes and student in state is outdated
    const fetchStudentProfile = async () => {
      try {
        const response = await fetch(
          `${apiUrl}/get-student-profile/${fccId}`, // Using apiUrl here
          {
            headers: {
              "ngrok-skip-browser-warning": "true",
            },
          }
        );
        if (response.ok) {
          const studentData = await response.json();
          setStudent(studentData);
          localStorage.setItem("studentProfile", JSON.stringify(studentData)); // Update localStorage student profile if needed
          logUserActivity('Fetch Student Profile Success', { fcc_id: fccId }); // Log student profile fetch success
        } else {
          console.error("Failed to fetch student profile");
          setStudent(null);
          logUserActivity('Fetch Student Profile Failure', { fcc_id: fccId, error: 'Failed to fetch student profile' }); // Log student profile fetch failure
        }
      } catch (error) {
        console.error("Error fetching student profile:", error);
        setStudent(null);
        logUserActivity('Fetch Student Profile Exception', { fcc_id: fccId, error: error.message }); // Log student profile fetch exception
      }
    };

    if (!initialStudent  || initialStudent.fcc_id !== fccId) {
      fetchStudentProfile(); // Fetch student profile if not available or outdated
    }

    fetchData();
    localStorage.setItem("lastViewedFccId", fccId); // Update last viewed FCC ID in localStorage

  }, [fccId, filter, initialStudent, apiUrl, logUserActivity]); // logUserActivity added to dependency array


  const downloadPDF = () => {
    logUserActivity('Download PDF Report', { fcc_id: fccId }); // Log PDF download action
    const doc = new jsPDF();
    // ... PDF generation logic ...
    doc.save(`FCC_Gurukul_Attendance_Report_${new Date().toLocaleDateString()}.pdf`);
  };

  const handleProfileSwitch = (selectedFccId) => {
    setFccId(selectedFccId);
    logUserActivity('Switch Profile in CTC/CTG View', { switched_to_fcc_id: selectedFccId }); // Log profile switch
  };

  const goBack = () => {
    navigate(-1);
    logUserActivity('Navigate Back from CTC/CTG View'); // Log back navigation
  };


  return (
    <div className="view-ctc-ctg-container">
      <button onClick={goBack} className="back-button">
        <ArrowLeft size={20} />Back
      </button>
   <div className="back-button-group">
       {/* Current Student Profile Image */}
       {student?.photo_url && (
          <img
            src={student.photo_url}
            alt={`${student?.name} Profile`} // Use student?.name here as well for consistency
            className="current-profile-image"
            onError={(e) => { e.target.src = NotFoundImage; }}
          />
        )}

      {/* Profile Switcher Dropdown */}
      {recentProfiles.length > 0 && (
        <select
          className="profile-switcher"
          value={fccId}
          onChange={(e) => handleProfileSwitch(e.target.value)}
          aria-label="Switch Student Profile"
        >
          <option value="">प्रोफ़ाइल बदलें</option>
          {recentProfiles.map((profile) => (
              <option key={profile.fcc_id} value={profile.fcc_id} className="profile-option">
                {profile.photo_url && (
                  <img
                    src={profile.photo_url}
                    alt={`${profile.name} का प्रोफाइल`}
                    className="profile-switcher-image"
                    onError={(e) => { e.target.src = NotFoundImage; }}
                  />
                )}
                <span className="profile-switcher-name">{profile.name} ({profile.fcc_id})</span>
              </option>
          ))}
        </select>
      )}
    </div>

          {/* Loading Indicator */}
      {loading && <p>Loading...</p>}

      {/* Error Message */}
      {error && <p className="error">{error}</p>}

      {/* Display Student Data */}
      {data && student && (  // Conditionally render based on both data and student
  <div className="ctc-ctg-details">
    <h2 className="section-title">📚 छात्र जानकारी</h2>
    <div className="detail-item">
      <p><strong>👤 नाम:</strong> {student?.name || "Student Name Not Available"}</p> {/* Use student?.name */}
    </div>
    <div className="detail-item">
      <p><strong>🆔 FCC ID:</strong> {data.fcc_id || "N/A"}</p>
    </div>
    <div className="detail-item">
      {data.ctc_time && (
        <p><strong>📅 तारीख:</strong> {new Date(data.ctc_time).toLocaleDateString()}</p>
      )}
      <p><strong>⏰ आने का समय:</strong> {data.ctc_time ? new Date(data.ctc_time).toLocaleTimeString() : "N/A"}</p>
    </div>
    <div className="detail-item">
      <p><strong>⏳ जाने का समय:</strong> {data.ctg_time ? new Date(data.ctg_time).toLocaleTimeString() : "N/A"}</p>
    </div>
    <div className="detail-item">
      <p><strong>📖 होमवर्क:</strong> {data.task_completed ? "✅ पूरा किया" : "❌ पूरा नहीं किया"}</p>
    </div>
  </div>
)}


      {/* Filter Options */}
      <div className="filters">
        <select value={filter} onChange={handleFilterChange}>
          <option value="all">All Time</option>
          <option value="month">This Month</option>
          <option value="week">This Week</option>
          <option value="previous7">Previous 7 Days</option>
          <option value="previous10">Previous 10 Days</option>
          <option value="previous15">Previous 15 Days</option>
          <option value="previous30">Previous 30 Days</option>
        </select>
      </div>

      {/* Display Student Logs */}
      {filteredLogs.length > 0 && (
        <div className="log-details">
          <h2>Student Logs</h2>
          <table>
            <thead>
              <tr>
                <th>Log Date</th>
                <th>CTC Time</th>
                <th>CTG Time</th>
                <th>Task Completed</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log, index) => (
                <tr key={index}>
                  <td>{new Date(log.log_date).toLocaleDateString()}</td>
                  <td>{log.ctc_time ? new Date(log.ctc_time).toLocaleTimeString() : "N/A"}</td>
                  <td>{log.ctg_time ? new Date(log.ctg_time).toLocaleTimeString() : "N/A"}</td>
                  <td>{log.task_completed ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Buttons */}
      <div className="button-group">
        <button onClick={downloadPDF} className="download-pdf-button">
          Download PDF
        </button>
      </div>
    </div>
  );
};

export default ViewCtcCtg;