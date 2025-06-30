// src/components/ViewCtcCtg.js

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import jsPDF from "jspdf";
import "jspdf-autotable";
import "./ViewCtcCtg.css";
import NotFoundImage from '../assets/404-image.jpg';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from "../utils/supabaseClient";
import QRCode from 'qrcode'; // <<--- YEH NAYI LINE ADD KAREIN

// Helper function to add footers to the PDF
const addFooters = (doc) => {
  const pageCount = doc.internal.getNumberOfPages();
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
    doc.text(
      `Report Generated: ${new Date().toLocaleDateString('en-IN')}`,
      doc.internal.pageSize.getWidth() - 14,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'right' }
    );
  }
};

const ViewCtcCtg = () => {
  const location = useLocation();

  const [data, setData] = useState(null);
  const [student, setStudent] = useState(null);
  const [allLogs, setAllLogs] = useState([]);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [processedLogs, setProcessedLogs] = useState([]);
  const [isPresentToday, setIsPresentToday] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("previous7");
  const [fccId, setFccId] = useState(location.state?.fccId || localStorage.getItem("lastViewedFccId") || "");
  const [recentProfiles, setRecentProfiles] = useState(location.state?.recentProfiles || []);
  const sessionId = useRef(uuidv4());

  const logUserActivity = useCallback(async (activityType, activityDetails = null) => {
    try {
      await supabase.from('user_activity_log').insert([{ activity_type: activityType, activity_details: activityDetails ? JSON.stringify(activityDetails) : null, page_url: window.location.pathname, session_id: sessionId.current }]);
    } catch (error) {
      console.error("Error logging user activity:", error.message);
    }
  }, []);

  // *** UPDATED: Logic for score calculation and task completion ***
  const processAttendanceForDateRange = useCallback((logs, scores, filterType) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let startDate = new Date(today);

    // Group scores by date to handle multiple tasks on the same day
    const groupedScoresByDate = new Map();
    scores.forEach(entry => {
      if (entry.submission_date) {
        const dateKey = new Date(entry.submission_date).toISOString().split('T')[0];
        if (!groupedScoresByDate.has(dateKey)) {
          groupedScoresByDate.set(dateKey, { scores: [], fcc_class: entry.fcc_class });
        }
        groupedScoresByDate.get(dateKey).scores.push(entry.score);
      }
    });

    // Calculate the final average score for each day
    const finalScoresMap = new Map();
    for (const [dateKey, data] of groupedScoresByDate.entries()) {
      const sum = data.scores.reduce((acc, current) => acc + current, 0);
      let divisor;
      if (data.fcc_class === '10/10th') {
        divisor = 3;
      } else if (data.fcc_class === '9/9th') {
        divisor = 2;
      } else {
        // Fallback: average by the number of tasks submitted
        divisor = data.scores.length || 1; 
      }
      const averageScore = Math.round(sum / divisor);
      finalScoresMap.set(dateKey, averageScore);
    }

    switch (filterType) {
      case "week": startDate.setDate(today.getDate() - today.getDay()); break;
      case "month": startDate.setDate(1); break;
      case "previous7": startDate.setDate(today.getDate() - 6); break;
      case "previous15": startDate.setDate(today.getDate() - 14); break;
      case "previous30": startDate.setDate(today.getDate() - 29); break;
      case "all":
        if (logs.length > 0) {
          startDate = new Date(Math.min(...logs.map(log => new Date(log.log_date))));
        }
        break;
      default: startDate.setDate(today.getDate() - 6); break;
    }
    startDate.setHours(0, 0, 0, 0);

    const logsMap = new Map();
    logs.forEach(log => {
      const logDate = new Date(log.log_date).toISOString().split('T')[0];
      logsMap.set(logDate, log);
    });

    const fullDateRangeData = [];
    let currentDate = new Date(startDate);
    while (currentDate <= today) {
      const dateString = currentDate.toISOString().split('T')[0];
      const logForDay = logsMap.get(dateString);
      const scoreForDay = finalScoresMap.get(dateString);

      const isTaskCompleted = scoreForDay !== undefined && scoreForDay >= 75;

      if (logForDay) {
        fullDateRangeData.push({ ...logForDay, status: 'Present', score: scoreForDay ?? null, isTaskCompleted });
      } else {
        fullDateRangeData.push({
          log_date: currentDate.toISOString(),
          ctc_time: null, ctg_time: null,
          status: 'Absent',
          score: scoreForDay ?? null,
          isTaskCompleted
        });
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return fullDateRangeData.reverse();
  }, []);

  useEffect(() => {
    if (recentProfiles.length === 0) {
      const savedRecentProfiles = JSON.parse(localStorage.getItem("recentProfiles")) || [];
      setRecentProfiles(savedRecentProfiles);
    }
  }, [recentProfiles.length]);

  useEffect(() => {
    const fetchStudentDataAndLogs = async () => {
      if (!fccId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const [profileRes, ctcRes, logsRes, leaderboardRes] = await Promise.all([
          supabase.from('new_student_admission').select('*').eq('fcc_id', fccId).single(),
          supabase.from('students').select('fcc_id, ctc_time, ctg_time, task_completed').eq('fcc_id', fccId).single(),
          supabase.from('attendance_log').select('fcc_id, ctc_time, ctg_time, task_completed, log_date').eq('fcc_id', fccId).order('log_date', { ascending: false }),
          // *** UPDATED: Fetch fcc_class and filter out attendance scores (score=10) ***
          supabase.from('leaderboard').select('submission_date, score, fcc_class').eq('fcc_id', fccId).neq('score', 10)
        ]);

        if (profileRes.error) throw new Error(`Profile Fetch Error: ${profileRes.error.message}`);
        if (ctcRes.error && ctcRes.error.code !== 'PGRST116') throw new Error(`CTC/CTG Status Error: ${ctcRes.error.message}`);
        if (logsRes.error) throw new Error(`Logs Fetch Error: ${logsRes.error.message}`);
        if (leaderboardRes.error) throw new Error(`Leaderboard Fetch Error: ${leaderboardRes.error.message}`);

        setStudent(profileRes.data);
        setData(ctcRes.data);
        setAllLogs(logsRes.data || []);
        setLeaderboardData(leaderboardRes.data || []);
        
        const todayStr = new Date().toISOString().split('T')[0];
        if (ctcRes.data && ctcRes.data.ctc_time) {
            const ctcDateStr = new Date(ctcRes.data.ctc_time).toISOString().split('T')[0];
            setIsPresentToday(todayStr === ctcDateStr);
        } else {
            setIsPresentToday(false);
        }

        logUserActivity('Fetch Student Data Success', { fcc_id: fccId });
      } catch (err) {
        setError(`Failed to fetch data: ${err.message}`);
        setStudent(null); setData(null); setAllLogs([]); setLeaderboardData([]);
        logUserActivity('Fetch Data Failure', { fcc_id: fccId, error: err.message });
      } finally {
        setLoading(false);
      }
    };
    fetchStudentDataAndLogs();
    localStorage.setItem("lastViewedFccId", fccId);
  }, [fccId, logUserActivity]);

  useEffect(() => {
    setProcessedLogs(processAttendanceForDateRange(allLogs, leaderboardData, filter));
  }, [filter, allLogs, leaderboardData, processAttendanceForDateRange]);

  // Helper function to add footers to the PDF
const addFooters = (doc) => {
  const pageCount = doc.internal.getNumberOfPages();
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // BADLAV: Left me branding add ki gayi hai
    doc.text(
      'Performance Matters. We Track It Better. | FCC The Gurukul',
      14,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'left' }
    );

    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
    
    doc.text(
      `Report Generated: ${new Date().toLocaleDateString('en-IN')}`,
      doc.internal.pageSize.getWidth() - 14,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'right' }
    );
  }
};

// Naya, updated downloadPDF function
  const downloadPDF = async () => {
    if (!student || processedLogs.length === 0) {
      alert("PDF banane ke liye data nahi hai.");
      return;
    }
    logUserActivity('Download PDF Report', { fcc_id: fccId });

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // BADLAV (Step 1): Image fetching logic ko QR code generation se replace kiya gaya hai
    let qrCodeImage = null;
    try {
      const studentProfileUrl = `https://fccthegurukul.in/student/${fccId}`;
      qrCodeImage = await QRCode.toDataURL(studentProfileUrl, {
          width: 256, // High quality QR
          margin: 1,
      });
    } catch (e) {
      console.error("Failed to generate QR Code:", e);
      // Agar QR code nahi bana, to fallback text dikhayenge
    }

    // --- PDF Content Generation ---
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Attendance & Task Report", 14, 22);
    doc.setLineWidth(0.5);
    doc.line(14, 25, pageWidth - 14, 25);
    
    const startY = 38; 
    
    // BADLAV (Step 2): Image ki jagah QR Code ko add kiya ja raha hai
    doc.setDrawColor(200);
    doc.rect(14, startY, 30, 30); // QR code ke liye box
    if (qrCodeImage) {
      doc.addImage(qrCodeImage, 'PNG', 14, startY, 30, 30);
    } else {
      doc.setTextColor(150);
      doc.text("QR Error", 29, startY + 15, { align: 'center' });
    }
    // BADLAV (Step 3): QR Code ke neeche label add kiya gaya hai
    doc.setFontSize(7);
    doc.setTextColor(100);
    doc.text('Scan for Live Data', 29, startY + 34, { align: 'center' });

    
    // Student Info Section (waisa hi rahega)
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(student.name || 'N/A', 50, startY + 7);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`FCC ID: ${fccId}`, 50, startY + 14);
    doc.text(`Class: ${student.course || 'N/A'}`, 50, startY + 20);
    
    const summary = processedLogs.reduce((acc, log) => {
      if (log.status === 'Present') acc.present++; else acc.absent++;
      return acc;
    }, { present: 0, absent: 0 });
    const totalDays = processedLogs.length;
    const attendancePercentage = totalDays > 0 ? ((summary.present / totalDays) * 100).toFixed(1) : 0;
    
    doc.text(`Total Days: ${totalDays}`, pageWidth - 14, startY + 7, { align: 'right' });
    doc.text(`Present: ${summary.present}`, pageWidth - 14, startY + 13, { align: 'right' });
    doc.text(`Absent: ${summary.absent}`, pageWidth - 14, startY + 19, { align: 'right' });
    doc.setFont("helvetica", "bold");
    doc.text(`Attendance: ${attendancePercentage}%`, pageWidth - 14, startY + 25, { align: 'right' });

    // Table (waisa hi rahega)
    const head = [['Date', 'CTC', 'CTG', 'Task Status', 'Avg. Score', 'Attendance']];
    const body = processedLogs.map(log => [
      new Date(log.log_date).toLocaleDateString("en-IN"),
      log.ctc_time ? new Date(log.ctc_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : "—",
      log.ctg_time ? new Date(log.ctg_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : "—",
      log.score !== null ? (log.isTaskCompleted ? "Completed" : "Not Completed") : "—",
      log.score !== null ? `${log.score}%` : "—",
      log.status
    ]);

    doc.autoTable({
      startY: startY + 37,
      head: head, 
      body: body, 
      theme: 'grid',
      headStyles: { 
          textColor: 30,
          fontStyle: 'bold', 
          halign: 'center',
          lineWidth: 0.2,
          lineColor: [180, 180, 180]
      },
      alternateRowStyles: { },
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 5) {
          doc.setFont('helvetica', 'bold');
          if (data.cell.raw === 'Present') doc.setTextColor(39, 174, 96);
          else if (data.cell.raw === 'Absent') doc.setTextColor(192, 57, 43);
        }
        if (data.section === 'body' && data.column.index === 3) {
            if (data.cell.raw === 'Completed') doc.setTextColor(39, 174, 96);
            else if (data.cell.raw === 'Not Completed') doc.setTextColor(230, 126, 34);
        }
      },
      willDrawCell: (data) => {
        if (data.section === 'body') data.cell.styles.halign = 'center';
      }
    });
    
    addFooters(doc);
    const safeFileName = (student?.name || 'Student').replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`Report_${safeFileName}_${fccId}.pdf`);
  };


  const handleFilterChange = (event) => {
    setFilter(event.target.value);
    logUserActivity('Change Log Filter', { filter_type: event.target.value });
  };

  const handleProfileSwitch = (selectedFccId) => {
    setFccId(selectedFccId);
    logUserActivity('Switch Profile', { switched_to_fcc_id: selectedFccId });
  };

  return (
    <div className="view-ctc-ctg-container">
      <div className="header-controls">
        {recentProfiles.length > 0 && (
          <div className="profile-switcher-wrapper">
            {student?.photo_url && <img src={student.photo_url} alt={`${student?.name} Profile`} className="current-profile-image" onError={(e) => { e.target.src = NotFoundImage; }} />}
            <select className="profile-switcher" value={fccId} onChange={(e) => handleProfileSwitch(e.target.value)} aria-label="Switch Student Profile">
              <option value="">Switch Profile...</option>
              {recentProfiles.map((profile) => (<option key={profile.fcc_id} value={profile.fcc_id}>{profile.name} ({profile.fcc_id})</option>))}
            </select>
          </div>
        )}
      </div>

      {loading && <div className="feedback-state">Student ka data load ho raha hai...</div>}
      {error && <div className="feedback-state error">{error}</div>}

      {!loading && !error && student && (
        <div className="student-info-card">
          <div className="student-info-header">
            <img src={student.photo_url || NotFoundImage} alt={student.name} className="student-main-image" onError={(e) => { e.target.src = NotFoundImage; }} />
            <div className="student-info-header-text">
              <h2>{student.name || "N/A"}</h2>
              <p>FCC ID: {student.fcc_id || "N/A"}</p>
            </div>
          </div>
          <div className="info-list">
            {isPresentToday && data ? (
              <>
                <div className="info-list-item"><span className="info-label">आज का स्टेटस:</span><span className="info-value status-badge present">✅ उपस्थित</span></div>
                <div className="info-list-item"><span className="info-label">आने का समय (CTC):</span><span className="info-value">{new Date(data.ctc_time).toLocaleString()}</span></div>
                <div className="info-list-item"><span className="info-label">जाने का समय (CTG):</span><span className="info-value">{data.ctg_time ? new Date(data.ctg_time).toLocaleString() : "अभी गए नहीं"}</span></div>
              </>
            ) : (
              <div className="info-list-item">
                <span className="info-label">आज का स्टेटस:</span>
                <span className="info-value status-badge absent">❌ अनुपस्थित</span>
              </div>
            )}
          </div>
        </div>
      )}

      {processedLogs.length > 0 ? (
        <div className="logs-section">
          <div className="log-filters"><h3>उपस्थिति और कार्य का विवरण</h3>
            <select value={filter} onChange={handleFilterChange}>
              <option value="previous7">पिछले 7 दिन</option><option value="previous15">पिछले 15 दिन</option><option value="previous30">पिछले 30 दिन</option><option value="month">इस महीने</option><option value="week">इस हप्ते</option><option value="all">अभी तक</option>
            </select>
          </div>
          <div className="logs-table-wrapper">
            <table className="logs-table">
              <thead><tr><th>तारीख</th><th>CTC Time</th><th>CTG Time</th><th>Task Status</th><th>Avg. Score</th><th>Attendance</th></tr></thead>
              <tbody>
                {processedLogs.map((log, index) => (
                  <tr key={index} className={log.status === 'Absent' ? 'absent-row' : ''}>
                    <td data-label="तारीख">{new Date(log.log_date).toLocaleDateString()}</td>
                    <td data-label="CTC Time">{log.ctc_time ? new Date(log.ctc_time).toLocaleTimeString() : "—"}</td>
                    <td data-label="CTG Time">{log.ctg_time ? new Date(log.ctg_time).toLocaleTimeString() : "—"}</td>
                    <td data-label="Task Status">
                      {log.score !== null ? 
                        (log.isTaskCompleted ? <span className="status-pill completed">Completed</span> : <span className="status-pill pending">Not Completed</span>) 
                        : "—"}
                    </td>
                    <td data-label="Avg. Score">{log.score !== null ? `${log.score}%` : "—"}</td>
                    <td data-label="Attendance"><span className={`status-pill ${log.status.toLowerCase()}`}>{log.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (!loading && fccId && <div className="feedback-state">चयनित अवधि के लिए कोई उपस्थिति लॉग नहीं मिला.</div>)}

      <div className="page-footer">
        <button onClick={downloadPDF} className="download-pdf-button" disabled={!processedLogs.length || !student}>PDF रिपोर्ट डाउनलोड करे</button>
      </div>
    </div>
  );
}
export default ViewCtcCtg;