// ViewCtcCtg.js

import React, { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import jsPDF from "jspdf"; // Library for generating PDFs
import "jspdf-autotable"; // For auto table generation
import "./ViewCtcCtg.css"; // Add necessary styles
import NotFoundImage from '../assets/404-image.jpg'; // Import default image


const ViewCtcCtg = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("previous7");
  const [filteredLogs, setFilteredLogs] = useState([]);
  const name = location.state?.name || "Student Name Not Available"; // Fallback if no name is found
  const father = location.state?.father || "Father's Name Not Available"; // Fallback if no father's name is found
  const mobile_number = location.state?.mobile_number || "Mother's Name Not Available"; // Fallback if no mother's name is found
  const initialFccId = location.state?.fccId;
  const recentProfilesData = location.state?.recentProfiles || []; // Get recentProfiles from state
  const initialStudent = location.state?.student || null; // Get student object from state
  const [fccId, setFccId] = useState(initialFccId || localStorage.getItem("lastViewedFccId") || ""); // Load from localStorage or state
  const [recentProfiles, setRecentProfiles] = useState(recentProfilesData);
  const [student, setStudent] = useState(initialStudent); // State for current student


    // Filter logs based on selected filter  **MOVE FUNCTION DE`FINITION HERE - BEFORE useEffect**
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
        const ctcCtgResponse = await fetch(`http://localhost:5000/get-ctc-ctg/${fccId}`);
        const ctcCtgResult = await ctcCtgResponse.json();

        if (ctcCtgResponse.ok) {
          setData(ctcCtgResult.student); // Student data for CTC/CTG
          setFilteredLogs(filterLogs(ctcCtgResult.logs, filter)); // Apply initial filter (Previous 7 Days) **CALLING FILTERLOGS HERE - NOW IT'S DEFINED ABOVE**
        } else {
          setData(null);
          setFilteredLogs([]);
          setError(ctcCtgResult.error || "Problem fetching CTC/CTG data");
        }


      } catch (err) {
        setError("Problem fetching CTC/CTG data");
      } finally {
        setLoading(false);
      }
    };


    // Fetch student profile again if not passed in state or if fccId changes and student in state is outdated
    const fetchStudentProfile = async () => {
      try {
        const response = await fetch(`http://localhost:5000/get-student-profile/${fccId}`);
        if (response.ok) {
          const studentData = await response.json();
          setStudent(studentData);
          localStorage.setItem("studentProfile", JSON.stringify(studentData)); // Update localStorage student profile if needed
        } else {
          console.error("Failed to fetch student profile");
          setStudent(null);
        }
      } catch (error) {
        console.error("Error fetching student profile:", error);
        setStudent(null);
      }
    };


    if (!initialStudent  || initialStudent.fcc_id !== fccId) {
      fetchStudentProfile(); // Fetch student profile if not available or outdated
    }


    fetchData();
    localStorage.setItem("lastViewedFccId", fccId); // Update last viewed FCC ID in localStorage
  }, [fccId, filter, initialStudent]); // Refetch data when fccId or filter changes, include initialStudent to check for updates


  const downloadPDF = () => {
    const doc = new jsPDF();

    // Branding and Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(0, 82, 204); // Branding color
    doc.text("FCC The Gurukul", 20, 20);

    // Thin line below the title for aesthetics
    doc.setDrawColor(0, 82, 204);
    doc.setLineWidth(0.5);
    doc.line(20, 25, 190, 25); // Draw a line below the title

    // Subheader
    doc.setFont("helvetica", "normal");
    doc.setFontSize(16);
    doc.setTextColor(60, 60, 60);
    doc.text("CTC/CTG Details - Latest Data", 20, 35);

     // Section: Student Details Card
     if (data) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.setFillColor(240, 240, 255); // Light card background
      doc.rect(15, 50, 180, 30, "F"); // Card rectangle

      doc.setTextColor(33, 33, 33); // Content color
      const studentDetails = [
        `Student Name: ${name || "N/A"}`,
        `Father's Name: ${father || "N/A"}`,
        `Mobile Number: ${mobile_number || "N/A"}`,
        `FCC ID: ${data.fcc_id || "N/A"}`,
        // `CTC Time: ${data.ctc_time ? new Date(data.ctc_time).toLocaleTimeString() : "N/A"}`,
        // `CTG Time: ${data.ctg_time ? new Date(data.ctg_time).toLocaleTimeString() : "N/A"}`,
        // `Task Completed: ${data.task_completed ? "Yes" : "No"}`
      ];
      studentDetails.forEach((detail, index) => {
        doc.text(detail, 20, 58 + index * 6); // Dynamic spacing
      });
    }


    // Attendance History Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(0, 82, 204); // Title color
    doc.text("Previous Attendance History", 20, 95);

    // Attendance History Table
    const tableColumns = ["Log Date", "CTC Time", "CTG Time", "Task Completed"];
    const tableRows = filteredLogs.map((log) => [
      new Date(log.log_date).toLocaleDateString(),
      log.ctc_time ? new Date(log.ctc_time).toLocaleTimeString() : "N/A",
      log.ctg_time ? new Date(log.ctg_time).toLocaleTimeString() : "N/A",
      log.task_completed ? "Yes" : "No",
    ]);

    doc.autoTable({
      head: [tableColumns],
      body: tableRows,
      startY: 105,
      theme: 'grid',
      headStyles: {
        fillColor: [0, 82, 204],
        textColor: [255, 255, 255],
        fontSize: 12,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 10,
        textColor: [33, 33, 33],
        lineColor: [200, 200, 200],
        lineWidth: 0.25,
      },
      alternateRowStyles: {
        fillColor: [248, 248, 248],
      },
      margin: { top: 10, left: 20, right: 20 },
      tableWidth: 'auto',
    });

    // Footer Section
    const footerText = "Generated by FCC The Gurukul - Attendance Report";
    const footerY = doc.internal.pageSize.height - 10;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120); // Subtle gray footer
    doc.text(footerText, 105, footerY, { align: "center" });

    // Save the PDF with an improved file name
    doc.save(`FCC_Gurukul_Attendance_Report_${new Date().toLocaleDateString()}.pdf`);
  };

  const handleProfileSwitch = (selectedFccId) => {
    setFccId(selectedFccId); // Update fccId state, which will trigger useEffect to fetch new data
  };


  return (
    <div className="view-ctc-ctg-container">
   <div className="back-button-group">
       {/* Current Student Profile Image */}
       {student?.photo_url && (
          <img
            src={student.photo_url}
            alt={`${student.name} Profile`}
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
      {data && (
  <div className="ctc-ctg-details">
    <h2 className="section-title">📚 छात्र जानकारी</h2>
    <div className="detail-item">
      <p><strong>👤 नाम:</strong> {name || "N/A"}</p>
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