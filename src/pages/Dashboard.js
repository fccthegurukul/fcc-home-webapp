import React, { useState, useEffect } from "react";
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
import "./Dashboard.css";
import SkillUpdate from "./SkillUpdate";

const Dashboard = () => {
  const API_URL = process.env.REACT_APP_API_URL;

  const [totalAdmissions, setTotalAdmissions] = useState(null);
  const [admittedStudentsList, setAdmittedStudentsList] = useState([]);
  const [presentStudents, setPresentStudents] = useState(null);
  const [absentStudents, setAbsentStudents] = useState(null);
  const [presentStudentList, setPresentStudentList] = useState([]);
  const [absentStudentList, setAbsentStudentList] = useState([]);
  const [completedTasksToday, setCompletedTasksToday] = useState(null);
  const [notCompletedTasksToday, setNotCompletedTasksToday] = useState(null);
  const [completedTasksBeforeToday, setCompletedTasksBeforeToday] = useState(null);
  const [notCompletedTasksBeforeToday, setNotCompletedTasksBeforeToday] = useState(null);
  const [totalStudentsRecorded, setTotalStudentsRecorded] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSection, setActiveSection] = useState("admissions");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [admissionsResponse, admittedStudentsResponse, attendanceResponse, taskCompletionResponse] = await Promise.all([
          fetch(`${API_URL}/api/total-admissions`),
          fetch(`${API_URL}/api/admitted-students`),
          fetch(`${API_URL}/api/attendance-overview`),
          fetch(`${API_URL}/api/daily-task-completion`),
        ]);

        const [admissionsData, admittedStudentsData, attendanceData, taskCompletionData] = await Promise.all([
          admissionsResponse.json(),
          admittedStudentsResponse.json(),
          attendanceResponse.json(),
          taskCompletionResponse.json(),
        ]);

        setTotalAdmissions(admissionsData.totalAdmissions);
        setAdmittedStudentsList(admittedStudentsData);
        setPresentStudents(attendanceData.presentStudents);
        setAbsentStudents(attendanceData.absentStudents);
        setPresentStudentList(attendanceData.presentStudentsDetails);
        setAbsentStudentList(attendanceData.absentStudentsDetails);
        setCompletedTasksToday(taskCompletionData.completedTasksToday);
        setNotCompletedTasksToday(taskCompletionData.notCompletedTasksToday);
        setCompletedTasksBeforeToday(taskCompletionData.completedTasksBeforeToday);
        setNotCompletedTasksBeforeToday(taskCompletionData.notCompletedTasksBeforeToday);
        setTotalStudentsRecorded(taskCompletionData.totalStudentsRecorded);
      } catch (err) {
        console.error("डैशबोर्ड डेटा प्राप्त करने में त्रुटि:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [API_URL]);

  // CSV Download Logic
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

  const handleDownloadPresent = () => downloadCSV(presentStudentList, `present_students_${new Date().toISOString().split("T")[0]}.csv`);
  const handleDownloadAbsent = () => downloadCSV(absentStudentList, `absent_students_${new Date().toISOString().split("T")[0]}.csv`);

  // Utility Functions for Opening Full Pages
  //   const openFullPageReport = () => window.open(`${API_URL}/report`, "_blank");

  const openFullPagePresent = () => window.open(`${API_URL}/fcchome-present-students`, "_blank");
  const openFullPageAbsent = () => window.open(`${API_URL}/fcchome-absent-students`, "_blank");
  const openFullPageAdmissions = () => window.open(`${API_URL}/fcchome-admitted-students`, "_blank");
  const openFullPageTasks = () => window.open(`/fcchome-task-completion`, "_blank");
  const openFullPageFeeManagement = () => window.open(`/fee-management`, "_blank");
  const openFullPageStudentAttendance = () => window.open(`/student-attendance`, "_blank");
  const openFullPageStudentList = () => window.open(`/student-list`, "_blank");
  const openFullPageFileUpload = () => window.open(`/download-upload-data`, "_blank");
  const openFullPageStudentManagement = () => window.open(`/student-management`, "_blank");
  const openFullPageFcchomeAI = () => window.open(`/fcchome-ai`, "_blank");
  const openFullPageTaskSubmission = () => window.open(`/task-submition`, "_blank");
  const openFullPageTaskcheck = () => window.open(`/taskcheck`, "_blank");
  const openFullPageStudentAdmission = () => window.open(`/student-admission`, "_blank");
  const openFullPageReport = () => window.open(`/report`, "_blank");
  const openFullPageSkillUpdate = () => window.open(`/skill-update`, "_blank"); 

  const toggleSidebar = () => setIsSidebarCollapsed(!isSidebarCollapsed);

  const renderTable = (students, title) => (
    <div className="table-container">
      <div className="table-wrapper">
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

  // Info Box Component
  const InfoBox = ({ description }) => (
    <div className="info-box">
      <p>{description}</p>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case "admissions":
        return (
          <>
            <InfoBox description="इस सेक्शन में कुल दाखिल छात्रों की संख्या और उनकी सूची देख सकते हैं।" />
            <div className="card-header">
              <h3>कुल दाखिले: {totalAdmissions ?? "--"}</h3>
              <button className="new-window-btn" onClick={openFullPageAdmissions}>नई विंडो में खोलें</button>
            </div>
            {renderTable(admittedStudentsList, "दाखिल छात्रों की सूची")}
          </>
        );
      case "tasks":
        return (
          <>
            <InfoBox description="इस सेक्शन में दैनिक कार्य पूर्णता की स्थिति देख सकते हैं, जैसे आज और पहले के पूर्ण/अपूर्ण कार्य।" />
            <div className="card-header">
              <h3>दैनिक कार्य पूर्णता</h3>
              <button className="new-window-btn" onClick={openFullPageTasks}>नई विंडो में खोलें</button>
            </div>
            <div className="task-summary">
              <p>आज पूर्ण: <span>{completedTasksToday ?? "--"}</span></p>
              <p>आज अपूर्ण: <span>{notCompletedTasksToday ?? "--"}</span></p>
              <p>पहले पूर्ण: <span>{completedTasksBeforeToday ?? "--"}</span></p>
              <p>पहले अपूर्ण: <span>{notCompletedTasksBeforeToday ?? "--"}</span></p>
              <p>कुल दर्ज: <span>{totalStudentsRecorded ?? "--"}</span></p>
            </div>
          </>
        );
      case "attendance":
        return (
          <>
            <InfoBox description="इस सेक्शन में छात्रों की उपस्थिति और अनुपस्थिति की जानकारी देख सकते हैं और CSV डाउनलोड कर सकते हैं।" />
            <div className="card-header">
              <h3>छात्र उपस्थिति</h3>
              <div className="attendance-buttons">
                <button className="new-window-btn" onClick={openFullPagePresent}>उपस्थित - नई विंडो में खोलें</button>
                <button className="new-window-btn" onClick={openFullPageAbsent}>अनुपस्थित - नई विंडो में खोलें</button>
              </div>
            </div>
            <div className="attendance-summary">
              <div className="attendance-header">
                <p className="present">उपस्थित: {presentStudents ?? "--"}</p>
                <button className="download-btn" onClick={handleDownloadPresent}>CSV डाउनलोड करें</button>
              </div>
              {renderTable(presentStudentList, "उपस्थित छात्रों का विवरण")}
            </div>
            <div className="attendance-summary">
              <div className="attendance-header">
                <p className="absent">अनुपस्थित: {absentStudents ?? "--"}</p>
                <button className="download-btn" onClick={handleDownloadAbsent}>CSV डाउनलोड करें</button>
              </div>
              {renderTable(absentStudentList, "अनुपस्थित छात्रों का विवरण")}
            </div>
          </>
        );
      case "payment":
        return (
          <>
            <InfoBox description="इस सेक्शन में छात्रों के भुगतान संबंधी प्रबंधन और जानकारी देख सकते हैं, और भुगतान जम्मा भी कर सकते है।" />
            <div className="card-header">
              <h3>भुगतान प्रबंधन</h3>
              <button className="new-window-btn" onClick={openFullPageFeeManagement}>नई विंडो में खोलें</button>
            </div>
            <div className="section-container">
              <FeeManagement />
            </div>
          </>
        );
      case "student-attendance":
        return (
          <>
            <InfoBox description="इस सेक्शन में छात्रों की उपस्थिति अपडेट हैं।" />
            <div className="card-header">
              <h3>छात्र उपस्थिति अपडेट</h3>
              <button className="new-window-btn" onClick={openFullPageStudentAttendance}>नई विंडो में खोलें</button>
            </div>
            <div className="section-container">
              <StudentsAttendance />
            </div>
          </>
        );
      case "student-list":
        return (
          <>
            <InfoBox description="इस सेक्शन में सभी छात्रों की सूची देख सकते हैं।" />
            <div className="card-header">
              <h3>छात्र सूची</h3>
              <button className="new-window-btn" onClick={openFullPageStudentList}>नई विंडो में खोलें</button>
            </div>
            <div className="section-container">
              <StudentList />
            </div>
          </>
        );
      case "download-upload-data":
        return (
          <>
            <InfoBox description="इस सेक्शन में (Local Server) पर डेटा को डाउनलोड या अपलोड कर सकते हैं।" />
            <div className="card-header">
              <h3>डेटा डाउनलोड/अपलोड</h3>
              <button className="new-window-btn" onClick={openFullPageFileUpload}>नई विंडो में खोलें</button>
            </div>
            <div className="section-container">
              <FileUpload />
            </div>
          </>
        );
      case "student-management":
        return (
          <>
            <InfoBox description="इस सेक्शन में छात्रों के डेटा (स्किल, ट्यूशन फी, पेमेंट स्टेटस) को अपडेट कर सकते हैं।" />
            <div className="card-header">
              <h3>छात्र अपडेट</h3>
              <button className="new-window-btn" onClick={openFullPageStudentManagement}>नई विंडो में खोलें</button>
            </div>
            <div className="section-container">
              <StudentManagement />
            </div>
          </>
        );
      case "fcchome-ai":
        return (
          <>
            <InfoBox description="इस सेक्शन में AI आधारित FCC होम फीचर्स देख सकते हैं। (हालाँकि ये किसी और मॉडल्स पर आधारित है)" />
            <div className="card-header">
              <h3>एफसीसी होम AI</h3>
              <button className="new-window-btn" onClick={openFullPageFcchomeAI}>नई विंडो में खोलें</button>
            </div>
            <div className="section-container">
              <FcchomeAI />
            </div>
          </>
        );
      case "task-submission":
        return (
          <>
            <InfoBox description="इस सेक्शन में छात्रों के कार्य (Homework) दे सकते है। ध्यान रहे बच्चो को 50 स्कोर से ज्यादा का कार्य न दें, और समय+क्लास का सिलेक्शन अच्छे से सोचकर भरे" /> 
            <div className="card-header">
              <h3>होमवर्क देना</h3>
              <button className="new-window-btn" onClick={openFullPageTaskSubmission}>नई विंडो में खोलें</button>
            </div>
            <div className="section-container">
              <TaskSubmissionPage />
            </div>
          </>
        );
      case "taskcheck":
        return (
          <>
            <InfoBox description="इस सेक्शन में जमा किए गए कार्यों की जाँच कर सकते हैं। कौन सा छात्र 50 में से कितना स्कोर लायक काम किया है उसके अनुसार छात्रों को अंक दे।" />
            <div className="card-header">
              <h3>होमवर्क जाँच</h3>
              <button className="new-window-btn" onClick={openFullPageTaskcheck}>नई विंडो में खोलें</button>
            </div>
            <div className="section-container">
              <Taskcheck />
            </div>
          </>
        );
      case "student-admission":
        return (
          <>
            <InfoBox description="इस सेक्शन में नए छात्रों का दाखिला प्रबंधित कर सकते हैं।" />
            <div className="card-header">
              <h3>छात्र दाखिला</h3>
              <button className="new-window-btn" onClick={openFullPageStudentAdmission}>नई विंडो में खोलें</button>
            </div>
            <div className="section-container">
              <StudentAdmission />
            </div>
          </>
        );
      case "report":
        return (
          <>
            <InfoBox description="इस सेक्शन में विभिन्न पेमेंट्स का रिपोर्ट्स देख सकते हैं।" />
            <div className="card-header">
              <h3>पेमेंट्स रिपोर्ट</h3>
              <button className="new-window-btn" onClick={openFullPageReport}>नई विंडो में खोलें</button>
            </div>
            <div className="section-container">
              <Report />
            </div>
          </>
        );
        case "Skill Update":
          return (
            <>
              <InfoBox description="इस सेक्शन में छात्रों के स्किल अपडेट कर सकते हैं।" />
              <div className="card-header">
                <h3>स्किल अपडेट</h3>
                <button className="new-window-btn" onClick={openFullPageSkillUpdate}>नई विंडो में खोलें</button>
              </div>
              <div className="section-container">
                <SkillUpdate />
              </div>
            </>
          );
      default:
        return null;
    }
  };

  if (loading) return <p className="loading">डैशबोर्ड डेटा लोड हो रहा है...</p>;
  if (error) return <p className="error">डैशबोर्ड डेटा प्राप्त करने में त्रुटि: {error}</p>;

  return (
    <div className="dashboard">
      <div className={`sidebar ${isSidebarCollapsed ? "collapsed" : ""}`}>
        <div className="sidebar-header">
          <h2>डैशबोर्ड</h2>
          <button className="toggle-btn" onClick={toggleSidebar}>
            {isSidebarCollapsed ? "▶" : "◀"}
          </button>
        </div>
        <div className="sidebar-scroll">
          <ul>
            <li className={activeSection === "admissions" ? "active" : ""} onClick={() => setActiveSection("admissions")}>
              कुल दाखिले
            </li>
            <li className={activeSection === "tasks" ? "active" : ""} onClick={() => setActiveSection("tasks")}>
              दैनिक कार्य पूर्णता
            </li>
            <li className={activeSection === "attendance" ? "active" : ""} onClick={() => setActiveSection("attendance")}>
              छात्र उपस्थिति
            </li>
            <li className={activeSection === "payment" ? "active" : ""} onClick={() => setActiveSection("payment")}>
              भुगतान
            </li>
            <li className={activeSection === "student-attendance" ? "active" : ""} onClick={() => setActiveSection("student-attendance")}>
              छात्र उपस्थिति लगाना
            </li>
            <li className={activeSection === "student-list" ? "active" : ""} onClick={() => setActiveSection("student-list")}>
              छात्र सूची
            </li>
            <li className={activeSection === "download-upload-data" ? "active" : ""} onClick={() => setActiveSection("download-upload-data")}>
              डेटा डाउनलोड/अपलोड
            </li>
            <li className={activeSection === "student-management" ? "active" : ""} onClick={() => setActiveSection("student-management")}>
              छात्र प्रबंधन (mini 1.o)
            </li>
            <li className={activeSection === "fcchome-ai" ? "active" : ""} onClick={() => setActiveSection("fcchome-ai")}>
              एफसीसी होम AI
            </li>
            <li className={activeSection === "task-submission" ? "active" : ""} onClick={() => setActiveSection("task-submission")}>
              कार्य(होमवर्क) देना
            </li>
            <li className={activeSection === "taskcheck" ? "active" : ""} onClick={() => setActiveSection("taskcheck")}>
              कार्य(होमवर्क) जाँच
            </li>
            <li className={activeSection === "student-admission" ? "active" : ""} onClick={() => setActiveSection("student-admission")}>
              छात्र दाखिला
            </li>
            <li className={activeSection === "report" ? "active" : ""} onClick={() => setActiveSection("report")}>
              पेमेंट्स रिपोर्ट
            </li>
            <li className={activeSection === "Skill Update" ? "active" : ""} onClick={() => setActiveSection("Skill Update")}>
              स्किल अपडेट 
              </li>
          </ul>
        </div>
      </div>
      <div className="main-content">
        <div className="title-bar">
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
              : activeSection === "Skill Update"
              ? "स्किल अपडेट"
              : "रिपोर्ट"}
          </span>
        </div>
        {renderContent()}
      </div>
    </div>
  );
};

export default Dashboard;