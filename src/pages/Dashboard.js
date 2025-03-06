import React, { useState, useEffect, useCallback } from "react";
import FeeManagement from "../components/FeeManagement";
import StudentsAttendance from "../pages/StudentsAttendance";
import StudentList from "../pages/StudentList";
import FileUpload from "../components/FileUpload";
import StudentManagement from "../components/StudentManagement";
import FcchomeAI from "../pages/fcchome-ai";
import TaskSubmissionPage from "../components/TaskSubmissionPage";
import Taskcheck from "../components/Taskcheck";
import StudentAdmission from "../pages/StudentAdmission";
import Report from "../components/Report";
import SkillUpdate from "./SkillUpdate";
import "./Dashboard.css";
import { v4 as uuidv4 } from 'uuid';

const Dashboard = () => {
  const API_URL = process.env.REACT_APP_API_URL;

  // Section-specific data states
  const [totalAdmissions, setTotalAdmissions] = useState(null);
  const [admittedStudentsList, setAdmittedStudentsList] = useState([]);
  const [tasksSummary, setTasksSummary] = useState({ // Tasks summary ke liye ek object state
    completedTasksToday: null,
    notCompletedTasksToday: null,
    completedTasksBeforeToday: null,
    notCompletedTasksBeforeToday: null,
    totalStudentsRecorded: null,
  });
  const [presentStudents, setPresentStudents] = useState(null);
  const [absentStudents, setAbsentStudents] = useState(null);
  const [presentStudentList, setPresentStudentList] = useState([]);
  const [absentStudentList, setAbsentStudentList] = useState([]);

  // Section-specific loading and error states
  const [admissionsLoading, setAdmissionsLoading] = useState(false);
  const [admissionsError, setAdmissionsError] = useState(null);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksError, setTasksError] = useState(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState(null);

  const [activeSection, setActiveSection] = useState("admissions");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const sessionId = React.useRef(uuidv4());

  const logUserActivity = useCallback(async (activityType, activityDetails = {}) => {
    try {
      const activityData = {
        activity_type: activityType,
        activity_details: JSON.stringify({
          ...activityDetails,
          active_section: activeSection,
          timestamp: new Date().toISOString(),
        }),
        page_url: window.location.pathname,
        session_id: sessionId.current,
      };

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/user-activity-log`, { // Updated URL
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(activityData),
      });

      if (!response.ok) throw new Error("Failed to log activity");
      console.log(`Activity '${activityType}' logged successfully`);
    } catch (error) {
      console.error("Error logging user activity:", error);
    }
  }, [activeSection]);

  // Section-specific data fetching functions

  const fetchAdmissionsData = useCallback(async () => {
    setAdmissionsLoading(true);
    setAdmissionsError(null);
    try {
      const [admissionsResponse, admittedStudentsResponse] = await Promise.all([
        fetch(`${API_URL}/api/total-admissions`),
        fetch(`${API_URL}/api/admitted-students`),
      ]);

      const [admissionsData, admittedStudentsData] = await Promise.all([
        admissionsResponse.json(),
        admittedStudentsResponse.json(),
      ]);

      setTotalAdmissions(admissionsData.totalAdmissions);
      setAdmittedStudentsList(admittedStudentsData);
    } catch (err) {
      console.error("दाखिले डेटा प्राप्त करने में त्रुटि:", err);
      setAdmissionsError(err.message);
    } finally {
      setAdmissionsLoading(false);
    }
  }, [API_URL]);

  const fetchTasksData = useCallback(async () => {
    setTasksLoading(true);
    setTasksError(null);
    try {
      const taskCompletionResponse = await fetch(`${API_URL}/api/daily-task-completion`);
      const taskCompletionData = await taskCompletionResponse.json();
      setTasksSummary(taskCompletionData); // Tasks summary ko object se update karen
    } catch (err) {
      console.error("कार्य डेटा प्राप्त करने में त्रुटि:", err);
      setTasksError(err.message);
    } finally {
      setTasksLoading(false);
    }
  }, [API_URL]);

  const fetchAttendanceData = useCallback(async () => {
    setAttendanceLoading(true);
    setAttendanceError(null);
    try {
      const attendanceResponse = await fetch(`${API_URL}/api/attendance-overview`);
      const attendanceData = await attendanceResponse.json();
      setPresentStudents(attendanceData.presentStudents);
      setAbsentStudents(attendanceData.absentStudents);
      setPresentStudentList(attendanceData.presentStudentsDetails);
      setAbsentStudentList(attendanceData.absentStudentsDetails);
    } catch (err) {
      console.error("उपस्थिति डेटा प्राप्त करने में त्रुटि:", err);
      setAttendanceError(err.message);
    } finally {
      setAttendanceLoading(false);
    }
  }, [API_URL]);


  // सक्रिय सेक्शन बदलने पर डेटा फ़ेच करें
  useEffect(() => {
    switch (activeSection) {
      case "admissions":
        fetchAdmissionsData();
        break;
      case "tasks":
        fetchTasksData();
        break;
      case "attendance":
        fetchAttendanceData();
        break;
      // अन्य सेक्शन के लिए भी केस जोड़ें यदि उनमें डेटा फ़ेचिंग हो
      default:
        // डिफ़ॉल्ट केस में कुछ न करें या इनिशियल सेक्शन का डेटा फ़ेच करें यदि आवश्यक हो
        break;
    }
  }, [activeSection, fetchAdmissionsData, fetchTasksData, fetchAttendanceData]); // dependency array mein sabhi fetch function joden

  const downloadCSV = (data, filename) => {
    const headers = ["FCC ID", "नाम", "पिता", "माता", "मोबाइल नंबर", "पता", "दाखिला तिथि"];
    const rows = data.map(student => [
      student.fcc_id || "",
      student.name || "",
      student.father || "उपलब्ध नहीं",
      student.mother || "उपलब्ध नहीं",
      student.mobile_number || "उपलब्ध नहीं",
      student.address || "उपलब्ध नहीं",
      student.admission_date ? new Date(student.admission_date).toLocaleDateString("hi-IN") : "उपलब्ध नहीं",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(value => `"${value}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPresent = () => {
    downloadCSV(presentStudentList, `present_students_${new Date().toISOString().split("T")[0]}.csv`);
    logUserActivity("Download CSV", { type: "Present Students" });
  };

  const handleDownloadAbsent = () => {
    downloadCSV(absentStudentList, `absent_students_${new Date().toISOString().split("T")[0]}.css`);
    logUserActivity("Download CSV", { type: "Absent Students" });
  };

  const openFullPagePresent = () => {
    window.open(`${API_URL}/fcchome-present-students`, "_blank");
    logUserActivity("Open Full Page", { section: "Present Students" });
  };

  const openFullPageAbsent = () => {
    window.open(`${API_URL}/fcchome-absent-students`, "_blank");
    logUserActivity("Open Full Page", { section: "Absent Students" });
  };

  const openFullPageAdmissions = () => {
    window.open(`${API_URL}/fcchome-admitted-students`, "_blank");
    logUserActivity("Open Full Page", { section: "Admissions" });
  };

  const openFullPageTasks = () => {
    window.open(`/fcchome-task-completion`, "_blank");
    logUserActivity("Open Full Page", { section: "Tasks" });
  };

  const openFullPageFeeManagement = () => {
    window.open(`/fee-management`, "_blank");
    logUserActivity("Open Full Page", { section: "Fee Management" });
  };

  const openFullPageStudentAttendance = () => {
    window.open(`/student-attendance`, "_blank");
    logUserActivity("Open Full Page", { section: "Student Attendance" });
  };

  const openFullPageStudentList = () => {
    window.open(`/student-list`, "_blank");
    logUserActivity("Open Full Page", { section: "Student List" });
  };

  const openFullPageFileUpload = () => {
    window.open(`/download-upload-data`, "_blank");
    logUserActivity("Open Full Page", { section: "File Upload" });
  };

  const openFullPageStudentManagement = () => {
    window.open(`/student-management`, "_blank");
    logUserActivity("Open Full Page", { section: "Student Management" });
  };

  const openFullPageFcchomeAI = () => {
    window.open(`/fcchome-ai`, "_blank");
    logUserActivity("Open Full Page", { section: "Fcchome AI" });
  };

  const openFullPageTaskSubmission = () => {
    window.open(`/task-submition`, "_blank");
    logUserActivity("Open Full Page", { section: "Task Submission" });
  };

  const openFullPageTaskcheck = () => {
    window.open(`/taskcheck`, "_blank");
    logUserActivity("Open Full Page", { section: "Task Check" });
  };

  const openFullPageStudentAdmission = () => {
    window.open(`/student-admission`, "_blank");
    logUserActivity("Open Full Page", { section: "Student Admission" });
  };

  const openFullPageReport = () => {
    window.open(`/report`, "_blank");
    logUserActivity("Open Full Page", { section: "Report" });
    logUserActivity("Open Full Page", { section: "Skill Update" });
  };
  const openFullPageSkillUpdate = () => {
    window.open(`/skill-update`, "_blank");
    logUserActivity("Open Full Page", { section: "Skill Update" });
  };


  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
    logUserActivity("Toggle Sidebar", { collapsed: !isSidebarCollapsed });
  };

  const handleSectionChange = (section) => {
    setActiveSection(section);
    logUserActivity("Change Section", { new_section: section });
  };

  const renderTable = (students, title) => (
    <div className="dash-table-container">
      <div className="dash-table-wrapper">
        <table>
          <thead>
            <tr>
              <th style={{ width: "100px" }}>एफसीसी आईडी</th>
              <th style={{ width: "150px" }}>नाम</th>
              <th style={{ width: "150px" }}>पिता</th>
              <th style={{ width: "150px" }}>माता</th>
              <th style={{ width: "120px" }}>मोबाइल नंबर</th>
              <th style={{ width: "200px" }}>पता</th>
              <th style={{ width: "120px" }}>दाखिला तिथि</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student, index) => (
              <tr key={index}>
                <td>{student.fcc_id}</td>
                <td>{student.name}</td>
                <td>{student.father || "उपलब्ध नहीं"}</td>
                <td>{student.mother || "उपलब्ध नहीं"}</td>
                <td>{student.mobile_number || "उपलब्ध नहीं"}</td>
                <td>{student.address || "उपलब्ध नहीं"}</td>
                <td>{student.admission_date ? new Date(student.admission_date).toLocaleDateString("hi-IN") : "उपलब्ध नहीं"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const InfoBox = ({ description }) => (
    <div className="dash-info-box">
      <p>{description}</p>
    </div>
  );

  const renderSectionContent = (section) => {
    switch (section) {
      case "payment":
        return (
          <>
            <InfoBox description="इस सेक्शन में छात्रों के भुगतान संबंधी प्रबंधन और जानकारी देख सकते हैं, और भुगतान जम्मा भी कर सकते है।" />
            <div className="dash-card-header">
              <h3>भुगतान प्रबंधन</h3>
              <button className="dash-new-window-btn" onClick={openFullPageFeeManagement}>नई विंडो में खोलें</button>
            </div>
            <div className="dash-section-container">
              <FeeManagement />
            </div>
          </>
        );
      case "student-attendance":
        return (
          <>
            <InfoBox description="इस सेक्शन में छात्रों की उपस्थिति अपडेट हैं।" />
            <div className="dash-card-header">
              <h3>छात्र उपस्थिति अपडेट</h3>
              <button className="dash-new-window-btn" onClick={openFullPageStudentAttendance}>नई विंडो में खोलें</button>
            </div>
            <div className="dash-section-container">
              <StudentsAttendance />
            </div>
          </>
        );
      case "student-list":
        return (
          <>
            <InfoBox description="इस सेक्शन में सभी छात्रों की सूची देख सकते हैं।" />
            <div className="dash-card-header">
              <h3>छात्र सूची</h3>
              <button className="dash-new-window-btn" onClick={openFullPageStudentList}>नई विंडो में खोलें</button>
            </div>
            <div className="dash-section-container">
              <StudentList />
            </div>
          </>
        );
      case "download-upload-data":
        return (
          <>
            <InfoBox description="इस सेक्शन में (Local Server) पर डेटा को डाउनलोड या अपलोड कर सकते हैं।" />
            <div className="dash-card-header">
              <h3>डेटा डाउनलोड/अपलोड</h3>
              <button className="dash-new-window-btn" onClick={openFullPageFileUpload}>नई विंडो में खोलें</button>
            </div>
            <div className="dash-section-container">
              <FileUpload />
            </div>
          </>
        );
      case "student-management":
        return (
          <>
            <InfoBox description="इस सेक्शन में छात्रों के डेटा (स्किल, ट्यूशन फी, पेमेंट स्टेटस) को अपडेट कर सकते हैं।" />
            <div className="dash-card-header">
              <h3>छात्र अपडेट</h3>
              <button className="dash-new-window-btn" onClick={openFullPageStudentManagement}>नई विंडो में खोलें</button>
            </div>
            <div className="dash-section-container">
              <StudentManagement />
            </div>
          </>
        );
      case "fcchome-ai":
        return (
          <>
            <InfoBox description="इस सेक्शन में AI आधारित FCC होम फीचर्स देख सकते हैं। (हालाँकि ये किसी और मॉडल्स पर आधारित है)" />
            <div className="dash-card-header">
              <h3>एफसीसी होम AI</h3>
              <button className="dash-new-window-btn" onClick={openFullPageFcchomeAI}>नई विंडो में खोलें</button>
            </div>
            <div className="dash-section-container">
              <FcchomeAI />
            </div>
          </>
        );
      case "task-submission":
        return (
          <>
            <InfoBox description="इस सेक्शन में छात्रों के कार्य (Homework) दे सकते है। ध्यान रहे बच्चो को 50 स्कोर से ज्यादा का कार्य न दें, और समय+क्लास का सिलेक्शन अच्छे से सोचकर भरे" />
            <div className="dash-card-header">
              <h3>होमवर्क देना</h3>
              <button className="dash-new-window-btn" onClick={openFullPageTaskSubmission}>नई विंडो में खोलें</button>
            </div>
            <div className="dash-section-container">
              <TaskSubmissionPage />
            </div>
          </>
        );
      case "taskcheck":
        return (
          <>
            <InfoBox description="इस सेक्शन में जमा किए गए कार्यों की जाँच कर सकते हैं। कौन सा छात्र 50 में से कितना स्कोर लायक काम किया है उसके अनुसार छात्रों को अंक दे।" />
            <div className="dash-card-header">
              <h3>होमवर्क जाँच</h3>
              <button className="dash-new-window-btn" onClick={openFullPageTaskcheck}>नई विंडो में खोलें</button>
            </div>
            <div className="dash-section-container">
              <Taskcheck />
            </div>
          </>
        );
      case "student-admission":
        return (
          <>
            <InfoBox description="इस सेक्शन में नए छात्रों का दाखिला प्रबंधित कर सकते हैं।" />
            <div className="dash-card-header">
              <h3>छात्र दाखिला</h3>
              <button className="dash-new-window-btn" onClick={openFullPageStudentAdmission}>नई विंडो में खोलें</button>
            </div>
            <div className="dash-section-container">
              <StudentAdmission />
            </div>
          </>
        );
      case "report":
        return (
          <>
            <InfoBox description="इस सेक्शन में विभिन्न पेमेंट्स का रिपोर्ट्स देख सकते हैं।" />
            <div className="dash-card-header">
              <h3>पेमेंट्स रिपोर्ट</h3>
              <button className="dash-new-window-btn" onClick={openFullPageReport}>नई विंडो में खोलें</button>
            </div>
            <div className="dash-section-container">
              <Report />
            </div>
          </>
        );
        case "Skill Update":
          return (
            <>
              <InfoBox description="इस सेक्शन में छात्रों के स्किल अपडेट कर सकते हैं।" />
              <div className="dash-card-header">
                <h3>स्किल अपडेट</h3>
                <button className="dash-new-window-btn" onClick={openFullPageSkillUpdate}>नई विंडो में खोलें</button>
              </div>
              <div className="dash-section-container">
                <SkillUpdate />
              </div>
            </>
          );
      default:
        return null;
    }
  };


  const renderContent = () => {
    switch (activeSection) {
      case "admissions":
        return (
          <>
            <InfoBox description="इस सेक्शन में कुल दाखिल छात्रों की संख्या और उनकी सूची देख सकते हैं।" />
            <div className="dash-card-header">
              <h3>कुल दाखिले: {totalAdmissions ?? "--"}</h3>
              <button className="dash-new-window-btn" onClick={openFullPageAdmissions}>नई विंडो में खोलें</button>
            </div>
            {admissionsLoading ? <p className="dash-loading">दाखिले डेटा लोड हो रहा है...</p> : admissionsError ? <p className="dash-error">दाखिले डेटा प्राप्त करने में त्रुटि: {admissionsError}</p> : renderTable(admittedStudentsList, "दाखिल छात्रों की सूची")}
          </>
        );
      case "tasks":
        return (
          <>
            <InfoBox description="इस सेक्शन में दैनिक कार्य पूर्णता की स्थिति देख सकते हैं, जैसे आज और पहले के पूर्ण/अपूर्ण कार्य।" />
            <div className="dash-card-header">
              <h3>दैनिक कार्य पूर्णता</h3>
              <button className="dash-new-window-btn" onClick={openFullPageTasks}>नई विंडो में खोलें</button>
            </div>
            {tasksLoading ? <p className="dash-loading">कार्य डेटा लोड हो रहा है...</p> : tasksError ? <p className="dash-error">कार्य डेटा प्राप्त करने में त्रुटि: {tasksError}</p> : (
              <div className="dash-task-summary">
                <p>आज पूर्ण: <span>{tasksSummary.completedTasksToday ?? "--"}</span></p>
                <p>आज अपूर्ण: <span>{tasksSummary.notCompletedTasksToday ?? "--"}</span></p>
                <p>पहले पूर्ण: <span>{tasksSummary.completedTasksBeforeToday ?? "--"}</span></p>
                <p>पहले अपूर्ण: <span>{tasksSummary.notCompletedTasksBeforeToday ?? "--"}</span></p>
                <p>कुल दर्ज: <span>{tasksSummary.totalStudentsRecorded ?? "--"}</span></p>
              </div>
            )}
          </>
        );
      case "attendance":
        return (
          <>
            <InfoBox description="इस सेक्शन में छात्रों की उपस्थिति और अनुपस्थिति की जानकारी देख सकते हैं और CSV डाउनलोड कर सकते हैं।" />
            <div className="dash-card-header">
              <h3>छात्र उपस्थिति</h3>
              <div className="dash-attendance-buttons">
                <button className="dash-new-window-btn" onClick={openFullPagePresent}>उपस्थित - नई विंडो में खोलें</button>
                <button className="dash-new-window-btn" onClick={openFullPageAbsent}>अनुपस्थित - नई विंडो में खोलें</button>
              </div>
            </div>
            {attendanceLoading ? <p className="dash-loading">उपस्थिति डेटा लोड हो रहा है...</p> : attendanceError ? <p className="dash-error">उपस्थिति डेटा प्राप्त करने में त्रुटि: {attendanceError}</p> : (
              <>
                <div className="dash-attendance-summary">
                  <div className="dash-attendance-header">
                    <p className="dash-present">उपस्थित: {presentStudents ?? "--"}</p>
                    <button className="dash-download-btn" onClick={handleDownloadPresent}>CSV डाउनलोड करें</button>
                  </div>
                  {renderTable(presentStudentList, "उपस्थित छात्रों का विवरण")}
                </div>
                <div className="dash-attendance-summary">
                  <div className="dash-attendance-header">
                    <p className="dash-absent">अनुपस्थित: {absentStudents ?? "--"}</p>
                    <button className="dash-download-btn" onClick={handleDownloadAbsent}>CSV डाउनलोड करें</button>
                  </div>
                  {renderTable(absentStudentList, "अनुपस्थित छात्रों का विवरण")}
                </div>
              </>
            )}
          </>
        );
      case "payment":
      case "student-attendance":
      case "student-list":
      case "download-upload-data":
      case "student-management":
      case "fcchome-ai":
      case "task-submission":
      case "taskcheck":
      case "student-admission":
      case "report":
      case "Skill Update":
        // In section mein koi data fetching nahi hai, isliye loading/error check ki aavashyakta nahi hai
        return renderSectionContent(activeSection); // Sahayak function ka upayog karke content render karen
      default:
        return null;
    }
  };

  return (
    <div className="dash-dashboard">
      <div className={`dash-sidebar ${isSidebarCollapsed ? "dash-collapsed" : ""}`}>
        <div className="dash-sidebar-header">
          <h2>डैशबोर्ड</h2>
          <button className="dash-toggle-btn" onClick={toggleSidebar}>
            {isSidebarCollapsed ? "▶" : "◀"}
          </button>
        </div>
        <div className="dash-sidebar-scroll">
          <ul>
            <li className={activeSection === "admissions" ? "dash-active" : ""} onClick={() => handleSectionChange("admissions")}>
              कुल दाखिले
            </li>
            <li className={activeSection === "tasks" ? "dash-active" : ""} onClick={() => handleSectionChange("tasks")}>
              दैनिक कार्य पूर्णता
            </li>
            <li className={activeSection === "attendance" ? "dash-active" : ""} onClick={() => handleSectionChange("attendance")}>
              छात्र उपस्थिति
            </li>
            <li className={activeSection === "payment" ? "dash-active" : ""} onClick={() => handleSectionChange("payment")}>
              भुगतान
            </li>
            <li className={activeSection === "student-attendance" ? "dash-active" : ""} onClick={() => handleSectionChange("student-attendance")}>
              छात्र उपस्थिति लगाना
            </li>
            <li className={activeSection === "student-list" ? "dash-active" : ""} onClick={() => handleSectionChange("student-list")}>
              छात्र सूची
            </li>
            <li className={activeSection === "download-upload-data" ? "dash-active" : ""} onClick={() => handleSectionChange("download-upload-data")}>
              डेटा डाउनलोड/अपलोड
            </li>
            <li className={activeSection === "student-management" ? "dash-active" : ""} onClick={() => handleSectionChange("student-management")}>
              छात्र प्रबंधन (mini 1.o)
            </li>
            <li className={activeSection === "fcchome-ai" ? "dash-active" : ""} onClick={() => handleSectionChange("fcchome-ai")}>
              एफसीसी होम AI
            </li>
            <li className={activeSection === "task-submission" ? "dash-active" : ""} onClick={() => handleSectionChange("task-submission")}>
              कार्य(होमवर्क) देना
            </li>
            <li className={activeSection === "taskcheck" ? "dash-active" : ""} onClick={() => handleSectionChange("taskcheck")}>
              कार्य(होमवर्क) जाँच
            </li>
            <li className={activeSection === "student-admission" ? "dash-active" : ""} onClick={() => handleSectionChange("student-admission")}>
              छात्र दाखिला
            </li>
            <li className={activeSection === "report" ? "dash-active" : ""} onClick={() => handleSectionChange("report")}>
              पेमेंट्स रिपोर्ट
            </li>
            <li className={activeSection === "Skill Update" ? "dash-active" : ""} onClick={() => handleSectionChange("Skill Update")}>
              स्किल अपडेट
            </li>
          </ul>
        </div>
      </div>
      <div className="dash-main-content">
        <div className="dash-title-bar">
          <span>
            डैशबोर्ड अवलोकन -{" "}
            {activeSection === "admissions"
              ? "कुल दाखिले"
              : activeSection === "tasks"
              ? "दैनिक कार्य पूर्णता"
              : activeSection === "attendance"
              ? "छात्र उपस्थिति"
              : activeSection === "payment"
              ? "भुगतान प्रबंधन"
              : activeSection === "student-attendance"
              ? "छात्र उपस्थिति प्रबंधन"
              : activeSection === "student-list"
              ? "छात्र सूची"
              : activeSection === "download-upload-data"
              ? "डेटा डाउनलोड/अपलोड"
              : activeSection === "student-management"
              ? "छात्र प्रबंधन"
              : activeSection === "fcchome-ai"
              ? "एफसीसी होम AI"
              : activeSection === "task-submission"
              ? "कार्य जमा करना"
              : activeSection === "taskcheck"
              ? "कार्य जाँच"
              : activeSection === "student-admission"
              ? "छात्र दाखिला"
              : activeSection === "report"
              ? "रिपोर्ट"
              : "स्किल अपडेट"}
          </span>
        </div>
        {renderContent()}
      </div>
    </div>
  );
};

export default Dashboard;