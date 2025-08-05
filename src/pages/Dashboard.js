import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom"; // useNavigate import karein redirection ke liye
import FeeManagement from "../components/FeeManagement";
import StudentsAttendance from "../pages/StudentsAttendance";
import StudentList from "../pages/StudentList";
import FileUpload from "../components/FileUpload";
import StudentManagement from "../components/StudentManagement";
import FcchomeAI from "../pages/fcchome-ai";
import TaskSubmissionPage from "../components/TaskSubmissionPage";
import TodayTopicSubmissionPage from "../components/TodayTopicSubmissionPage";
import Taskcheck from "../components/Taskcheck";
import StudentAdmission from "../pages/StudentAdmission";
import Report from "../components/Report";
import Livevideosmanage from "../components/Livevideosmanage";
import TeacherActivityManagement from "../components/component2/TeacherActivityManagement";
import SkillUpdate from "./SkillUpdate";
import "./Dashboard.css";
import { v4 as uuidv4 } from 'uuid';
import StudentSkillReport from ".././components/StudentSkillReport";
import TestManagementPanel from "../components/TestManagement/TestManagementPanel"; // 

// ✅ NAYA BADLAV: Bottom Navbar ke components aur naya component import karein
import ClassroomPage from "../pages/Classroom";
import LeaderboardPage from "../components/LeaderboardPage";
import AdvanceTaskCheck from "../components/component2/AdvanceTaskCheck";
import StudentReport from "../components/component2/StudentReport"; // Naya component


// ✅ **नया बदलाव: साइडबार आइटम्स को रोल के अनुसार कॉन्फ़िगर करें**
const sidebarConfig = {
    // Admin ko dikhne wale items
    admin: [
      { key: "admissions", label: "कुल दाखिले" },
        { key: "classroom", label: "क्लासरूम" }, // Bottom Navbar se integrate
        { key: "leaderboard", label: "लीडरबोर्ड" }, // Bottom Navbar se integrate
        { key: "tasks", label: "दैनिक कार्य पूर्णता" },
        { key: "attendance", label: "छात्र उपस्थिति" },
        { key: "payment", label: "भुगतान" },
        { key: "student-skill-report", label: "छात्र-स्किल रिपोर्ट" },
        { key: "score-report", label: "स्कोर रिपोर्ट" }, // Naya component
        { key: "student-attendance", label: "छात्र उपस्थिति लगाना" },
        { key: "today-topic-submission", label: "आज का विषय जमा करें" },
        { key: "test-management", label: "टेस्ट प्रबंधन" },
        { key: "task-submission", label: "कार्य(होमवर्क) देना" },
        { key: "taskcheck", label: "कार्य (होमवर्क) जाँच" },
        { key: "advance-task-check", label: "एडवांस (होमवर्क) जाँच" }, // Naya component
        { key: "student-list", label: "छात्र सूची" },
        { key: "student-admission", label: "छात्र दाखिला" },
        { key: "student-management", label: "छात्र प्रबंधन (mini 1.o)" },
        { key: "report", label: "पेमेंट्स रिपोर्ट" },
        { key: "Skill Update", label: "स्किल अपडेट" },
        { key: "Livevideosmanage", label: "वीडियो अपलोड" },
        { key: "download-upload-data", label: "डेटा डाउनलोड/अपलोड" },
        { key: "TeacherActivityManagement", label: "टीचर गतिविधि प्रबंधन" },
        { key: "fcchome-ai", label: "एफसीसी होम AI" },
    ],
    // Teacher ko dikhne wale items
    teacher: [
       { key: "classroom", label: "क्लासरूम" }, // Bottom Navbar se integrate
        { key: "leaderboard", label: "लीडरबोर्ड" }, // Bottom Navbar se integrate
        { key: "today-topic-submission", label: "आज का विषय जमा करें" },
        { key: "test-management", label: "टेस्ट प्रबंधन" },
        { key: "student-skill-report", label: "छात्र-स्किल रिपोर्ट" },
        { key: "score-report", label: "स्कोर रिपोर्ट" }, // Naya component
        { key: "student-attendance", label: "छात्र उपस्थिति लगाना" },
        { key: "task-submission", label: "कार्य (होमवर्क) देना" },
        { key: "taskcheck", label: "कार्य (होमवर्क) जाँच" },
        { key: "advance-task-check", label: "एडवांस (होमवर्क) जाँच" }, // Naya component
    ],
};


const Dashboard = () => {
  const API_URL = process.env.REACT_APP_API_URL;
  const navigate = useNavigate(); // useNavigate hook ka istemal karein

  // ✅ **नया बदलाव: User state**
  const [user, setUser] = useState(null);

  // Section-specific data states
  const [totalAdmissions, setTotalAdmissions] = useState(null);
  const [admittedStudentsList, setAdmittedStudentsList] = useState([]);
  const [tasksSummary, setTasksSummary] = useState({
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

  const [activeSection, setActiveSection] = useState(""); // Default empty rakhein
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const sessionId = React.useRef(uuidv4());


   // ✅ NAYA BADLAV: Bottom Navbar ko hide karne ke liye useEffect
  useEffect(() => {
    // Dashboard component mount hone par bottom-navbar ko hide karein
    const bottomNav = document.querySelector('.bottom-navbar');
    if (bottomNav) {
      bottomNav.style.display = 'none';
    }

    // Component unmount hone par style ko vapas laayein taaki dusre pages par dikhe
    return () => {
      if (bottomNav) {
        // Aapke bottom-navbar ka default display 'flex' hai, isliye 'flex' set karein
        bottomNav.style.display = 'flex'; 
      }
    };
  }, []); // Yeh useEffect sirf ek baar chalega jab component mount hoga


  // ✅ **नया बदलाव: Logout function**
  const handleLogout = useCallback(() => {
    console.log("Logging out and clearing session...");
    localStorage.removeItem('user');
    localStorage.removeItem('loginTimestamp');
    localStorage.removeItem('accessType');
    navigate('/login', { replace: true });
  }, [navigate]);

  // ✅ **नया बदलाव: Session timeout और User data check**
  useEffect(() => {
    const userDataString = localStorage.getItem('user');
    const loginTimestamp = localStorage.getItem('loginTimestamp');

    if (!userDataString || !loginTimestamp) {
        handleLogout();
        return;
    }

    try {
        const hoursElapsed = (Date.now() - parseInt(loginTimestamp)) / (1000 * 60 * 60);
        if (hoursElapsed > 4) {
            alert('Session expired. Please log in again.');
            handleLogout();
            return;
        }

        const parsedUser = JSON.parse(userDataString);
        setUser(parsedUser);
        // User ke role ke anusaar default section set karein
        const userRole = parsedUser.accessType || 'teacher';
        const defaultSection = sidebarConfig[userRole][0]?.key || 'attendance';
        setActiveSection(defaultSection);

    } catch (error) {
        console.error("Failed to parse user data, logging out.", error);
        handleLogout();
    }
  }, [handleLogout]);

  // Role ke anusaar sidebar ke items generate karein
  const availableSidebarItems = useMemo(() => {
    if (!user || !user.accessType) return [];
    return sidebarConfig[user.accessType] || sidebarConfig.teacher; // fallback to teacher role
  }, [user]);

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

      const response = await fetch(`${API_URL}/api/user-activity-log`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify(activityData),
      });

      if (!response.ok) throw new Error("Failed to log activity");
    } catch (error) {
      console.error("Error logging user activity:", error);
    }
  }, [activeSection, API_URL]);

  // Data fetching functions (No changes needed here)
  const fetchAdmissionsData = useCallback(async () => {
    setAdmissionsLoading(true);
    setAdmissionsError(null);
    try {
      const [admissionsResponse, admittedStudentsResponse] = await Promise.all([
        fetch(`${API_URL}/api/total-admissions`, { headers: { "ngrok-skip-browser-warning": "true" } }),
        fetch(`${API_URL}/api/admitted-students`, { headers: { "ngrok-skip-browser-warning": "true" } }),
      ]);
      const [admissionsData, admittedStudentsData] = await Promise.all([ admissionsResponse.json(), admittedStudentsResponse.json() ]);
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
      const taskCompletionResponse = await fetch(`${API_URL}/api/daily-task-completion`, { headers: { "ngrok-skip-browser-warning": "true" } });
      const taskCompletionData = await taskCompletionResponse.json();
      setTasksSummary(taskCompletionData);
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
      const attendanceResponse = await fetch(`${API_URL}/api/attendance-overview`, { headers: { "ngrok-skip-browser-warning": "true" } });
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

  useEffect(() => {
    if (!activeSection) return; // Jab tak activeSection set na ho, data fetch na karein
    switch (activeSection) {
      case "admissions": fetchAdmissionsData(); break;
      case "tasks": fetchTasksData(); break;
      case "attendance": fetchAttendanceData(); break;
      default: break;
    }
  }, [activeSection, fetchAdmissionsData, fetchTasksData, fetchAttendanceData]);

  // All other functions (downloadCSV, openFullPage..., etc.) remain the same.
  // ... (Your existing functions like downloadCSV, openFullPage... etc. go here without any change)
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
  const handleDownloadPresent = () => { downloadCSV(presentStudentList, `present_students_${new Date().toISOString().split("T")[0]}.csv`); logUserActivity("Download CSV", { type: "Present Students" }); };
  const handleDownloadAbsent = () => { downloadCSV(absentStudentList, `absent_students_${new Date().toISOString().split("T")[0]}.csv`); logUserActivity("Download CSV", { type: "Absent Students" }); };
  const openFullPagePresent = () => { window.open(`${API_URL}/fcchome-present-students`, "_blank"); logUserActivity("Open Full Page", { section: "Present Students" }); };
  const openFullPageAbsent = () => { window.open(`${API_URL}/fcchome-absent-students`, "_blank"); logUserActivity("Open Full Page", { section: "Absent Students" }); };
  const openFullPageAdmissions = () => { window.open(`${API_URL}/fcchome-admitted-students`, "_blank"); logUserActivity("Open Full Page", { section: "Admissions" }); };
  const openFullPageTasks = () => { window.open(`/fcchome-task-completion`, "_blank"); logUserActivity("Open Full Page", { section: "Tasks" }); };
  const openFullPageFeeManagement = () => { window.open(`/fee-management`, "_blank"); logUserActivity("Open Full Page", { section: "Fee Management" }); };
  const openFullPageStudentAttendance = () => { window.open(`/student-attendance`, "_blank"); logUserActivity("Open Full Page", { section: "Student Attendance" }); };
  const openFullPageStudentList = () => { window.open(`/student-list`, "_blank"); logUserActivity("Open Full Page", { section: "Student List" }); };
  const openFullPageFileUpload = () => { window.open(`/download-upload-data`, "_blank"); logUserActivity("Open Full Page", { section: "File Upload" }); };
  const openFullPageStudentManagement = () => { window.open(`/student-management`, "_blank"); logUserActivity("Open Full Page", { section: "Student Management" }); };
  const openFullPageFcchomeAI = () => { window.open(`/fcchome-ai`, "_blank"); logUserActivity("Open Full Page", { section: "Fcchome AI" }); };
  const openFullPageTaskSubmission = () => { window.open(`/task-submition`, "_blank"); logUserActivity("Open Full Page", { section: "Task Submission" }); };
  const openFullPageTaskcheck = () => { window.open(`/taskcheck`, "_blank"); logUserActivity("Open Full Page", { section: "Task Check" }); };
  const openFullPageStudentAdmission = () => { window.open(`/student-admission`, "_blank"); logUserActivity("Open Full Page", { section: "Student Admission" }); };
  const openFullPageReport = () => { window.open(`/report`, "_blank"); logUserActivity("Open Full Page", { section: "Report" }); };
  const openFullPageSkillUpdate = () => { window.open(`/skill-update`, "_blank"); logUserActivity("Open Full Page", { section: "Skill Update" }); };
  const openFullPageLivevideosmanage = () => { window.open(`/Livevideosmanage`, "_blank"); logUserActivity("Open Full Page", { section: "Live Videos Manage" }); };
  const openFullPageTodayTopicSubmission = () => { window.open(`/today-topic-submission`, "_blank"); logUserActivity("Open Full Page", { section: "Today Topic Submission" }); };
  const openFullPageTeacherActivityManagement = () => { window.open(`/TeacherActivityManagement`, "_blank"); logUserActivity("Open Full Page", { section: "Teacher Activity Management" }); };
    // ✅ नया बदलाव: नए सेक्शन के लिए एक फंक्शन बनाएं
  const openFullPageStudentSkillReport = () => { window.open(`/student-skill-report`, "_blank"); logUserActivity("Open Full Page", { section: "Student Skill Report" }); };

  const toggleSidebar = () => { setIsSidebarCollapsed(!isSidebarCollapsed); logUserActivity("Toggle Sidebar", { collapsed: !isSidebarCollapsed }); };
  const handleSectionChange = (section) => { setActiveSection(section); logUserActivity("Change Section", { new_section: section }); };

  // Rendering functions remain mostly the same...
  const renderTable = (students, title) => ( /* ... No change ... */ <div className="dash-table-container"><div className="dash-table-wrapper"><table><thead><tr><th style={{ width: "100px" }}>एफसीसी आईडी</th><th style={{ width: "150px" }}>नाम</th><th style={{ width: "150px" }}>पिता</th><th style={{ width: "150px" }}>माता</th><th style={{ width: "120px" }}>मोबाइल नंबर</th><th style={{ width: "200px" }}>पता</th><th style={{ width: "120px" }}>दाखिला तिथि</th></tr></thead><tbody>{students.map((student, index) => (<tr key={index}><td>{student.fcc_id}</td><td>{student.name}</td><td>{student.father || "उपलब्ध नहीं"}</td><td>{student.mother || "उपलब्ध नहीं"}</td><td>{student.mobile_number || "उपलब्ध नहीं"}</td><td>{student.address || "उपलब्ध नहीं"}</td><td>{student.admission_date ? new Date(student.admission_date).toLocaleDateString("hi-IN") : "उपलब्ध नहीं"}</td></tr>))}</tbody></table></div></div>);
  const InfoBox = ({ description }) => ( /* ... No change ... */ <div className="dash-info-box"><p>{description}</p></div>);

  // ... (Your existing renderSectionContent and renderContent functions)
  const renderSectionContent = (section) => { /* ... No change, just ensure all cases are present ... */ 
      switch (section) {
                // ✅ NAYA BADLAV: Naye sections ko render karne ke liye cases add karein
        case "classroom": 
          return (<> <InfoBox description="यहाँ क्लासरूम सामग्री और गतिविधियाँ प्रबंधित करें।" /> <div className="dash-section-container"><ClassroomPage /></div> </>);
        case "leaderboard":
          return (<> <InfoBox description="यहाँ छात्रों का लीडरबोर्ड देखें।" /> <div className="dash-section-container"><LeaderboardPage /></div> </>);
        case "advance-task-check":
            return (<> <InfoBox description="यहाँ एडवांस कार्यों की जाँच करें।" /><div className="dash-card-header"><h3>एडवांस कार्य जाँच</h3></div><div className="dash-section-container"><AdvanceTaskCheck /></div></>);
        case "payment": return (<><InfoBox description="इस सेक्शन में छात्रों के भुगतान संबंधी प्रबंधन और जानकारी देख सकते हैं, और भुगतान जम्मा भी कर सकते है।" /><div className="dash-card-header"><h3>भुगतान प्रबंधन</h3><button className="dash-new-window-btn" onClick={openFullPageFeeManagement}>नई विंडो में खोलें</button></div><div className="dash-section-container"><FeeManagement /></div></>);
        case "student-attendance": return (<><InfoBox description="इस सेक्शन में छात्रों की उपस्थिति अपडेट हैं।" /><div className="dash-card-header"><h3>छात्र उपस्थिति अपडेट</h3><button className="dash-new-window-btn" onClick={openFullPageStudentAttendance}>नई विंडो में खोलें</button></div><div className="dash-section-container"><StudentsAttendance /></div></>);
        case "student-list": return (<><InfoBox description="इस सेक्शन में सभी छात्रों की सूची देख सकते हैं।" /><div className="dash-card-header"><h3>छात्र सूची</h3><button className="dash-new-window-btn" onClick={openFullPageStudentList}>नई विंडो में खोलें</button></div><div className="dash-section-container"><StudentList /></div></>);
        case "download-upload-data": return (<><InfoBox description="इस सेक्शन में (Local Server) पर डेटा को डाउनलोड या अपलोड कर सकते हैं।" /><div className="dash-card-header"><h3>डेटा डाउनलोड/अपलोड</h3><button className="dash-new-window-btn" onClick={openFullPageFileUpload}>नई विंडो में खोलें</button></div><div className="dash-section-container"><FileUpload /></div></>);
        case "student-management": return (<><InfoBox description="इस सेक्शन में छात्रों के डेटा (स्किल, ट्यूशन फी, पेमेंट स्टेटस) को अपडेट कर सकते हैं।" /><div className="dash-card-header"><h3>छात्र अपडेट</h3><button className="dash-new-window-btn" onClick={openFullPageStudentManagement}>नई विंडो में खोलें</button></div><div className="dash-section-container"><StudentManagement /></div></>);
        case "fcchome-ai": return (<><InfoBox description="इस सेक्शन में AI आधारित FCC होम फीचर्स देख सकते हैं। (हालाँकि ये किसी और मॉडल्स पर आधारित है)" /><div className="dash-card-header"><h3>एफसीसी होम AI</h3><button className="dash-new-window-btn" onClick={openFullPageFcchomeAI}>नई विंडो में खोलें</button></div><div className="dash-section-container"><FcchomeAI /></div></>);
        case "task-submission": return (<><InfoBox description="इस सेक्शन में छात्रों के कार्य (Homework) दे सकते है। ध्यान रहे बच्चो को 50 स्कोर से ज्यादा का कार्य न दें, और समय+क्लास का सिलेक्शन अच्छे से सोचकर भरे" /><div className="dash-card-header"><h3>होमवर्क देना</h3><button className="dash-new-window-btn" onClick={openFullPageTaskSubmission}>नई विंडो में खोलें</button></div><div className="dash-section-container"><TaskSubmissionPage /></div></>);
        case "taskcheck": return (<><InfoBox description="इस सेक्शन में जमा किए गए कार्यों की जाँच कर सकते हैं। कौन सा छात्र 50 में से कितना स्कोर लायक काम किया है उसके अनुसार छात्रों को अंक दे।" /><div className="dash-card-header"><h3>होमवर्क जाँच</h3><button className="dash-new-window-btn" onClick={openFullPageTaskcheck}>नई विंडो में खोलें</button></div><div className="dash-section-container"><Taskcheck /></div></>);
        case "student-admission": return (<><InfoBox description="इस सेक्शन में नए छात्रों का दाखिला प्रबंधित कर सकते हैं।" /><div className="dash-card-header"><h3>छात्र दाखिला</h3><button className="dash-new-window-btn" onClick={openFullPageStudentAdmission}>नई विंडो में खोलें</button></div><div className="dash-section-container"><StudentAdmission /></div></>);
        case "report": return (<><InfoBox description="इस सेक्शन में विभिन्न पेमेंट्स का रिपोर्ट्स देख सकते हैं।" /><div className="dash-card-header"><h3>पेमेंट्स रिपोर्ट</h3><button className="dash-new-window-btn" onClick={openFullPageReport}>नई विंडो में खोलें</button></div><div className="dash-section-container"><Report /></div></>);
        case "Skill Update": return (<><InfoBox description="इस सेक्शन में छात्रों के स्किल अपडेट कर सकते हैं।" /><div className="dash-card-header"><h3>स्किल अपडेट</h3><button className="dash-new-window-btn" onClick={openFullPageSkillUpdate}>नई विंडो में खोलें</button></div><div className="dash-section-container"><SkillUpdate /></div></>);
        case "Livevideosmanage": return (<><InfoBox description="इस सेक्शन में वीडियो अपलोड कर सकते हैं।" /><div className="dash-card-header"><h3>वीडियो अपलोड</h3><button className="dash-new-window-btn" onClick={openFullPageLivevideosmanage}>नई विंडो में खोलें</button></div><div className="dash-section-container"><Livevideosmanage /></div></>);
        case "TeacherActivityManagement": return (<><InfoBox description="इस सेक्शन में टीचर की गतिविधि अपडेट कर सकते हैं।" /><div className="dash-card-header"><h3>टीचर गतिविधि प्रबंधन</h3><button className="dash-new-window-btn" onClick={openFullPageTeacherActivityManagement}>नई विंडो में खोलें</button></div><div className="dash-section-container"><TeacherActivityManagement /></div></>);
        case "today-topic-submission": return (<><div className="dash-card-header"><h3>आज का विषय जमा करें</h3><button className="dash-new-window-btn" onClick={openFullPageTodayTopicSubmission}>नई विंडो में खोलें</button></div><div className="dash-section-container"><TodayTopicSubmissionPage /></div></>);
            // ✅ नया बदलाव: नए सेक्शन के लिए एक केस बनाएं
        case "student-skill-report": return (<><InfoBox description="इस सेक्शन में छात्रों की कौशल-आधारित रिपोर्ट देखें।" /><div className="dash-card-header"><h3>छात्र-कौशल रिपोर्ट</h3><button className="dash-new-window-btn" onClick={openFullPageStudentSkillReport}>नई विंडो में खोलें</button></div><div className="dash-section-container"><StudentSkillReport /></div></>);
        case "score-report": return (<><InfoBox description="इस सेक्शन में छात्रों के स्कोर रिपोर्ट देखें।"/> <div><StudentReport /></div></>);
// ✅ Naye "Test Management" section ke liye case
            case "test-management":  return ( <> <InfoBox description="यहाँ आप टेस्ट बना सकते हैं, संचालित कर सकते हैं और ग्रेड दे सकते हैं।" />
                        <div className="dash-card-header">
                            <h3>टेस्ट प्रबंधन</h3>
                        </div>
                        <div className="dash-section-container">
                            {/* User prop pass karna zaroori hai */}
                            <TestManagementPanel user={user} />
                        </div>
                    </>
                );


        default: return null;
      }
  };
 
  // ✅ नया बदलाव: renderContent में नए सेक्शन की key जोड़ें
const renderContent = () => {
  switch (activeSection) {
    case "admissions":
      return (
        <>
          <InfoBox description="इस सेक्शन में कुल दाखिल छात्रों की संख्या और उनकी सूची देख सकते हैं।" />
          <div className="dash-card-header">
            <h3>कुल दाखिले: {totalAdmissions ?? "--"}</h3>
            <button className="dash-new-window-btn" onClick={openFullPageAdmissions}>
              नई विंडो में खोलें
            </button>
          </div>
          {
            admissionsLoading ? (
              <p className="dash-loading">दाखिले डेटा लोड हो रहा है...</p>
            ) : admissionsError ? (
              <p className="dash-error">दाखिले डेटा प्राप्त करने में त्रुटि: {admissionsError}</p>
            ) : (
              renderTable(admittedStudentsList, "दाखिल छात्रों की सूची")
            )
          }
        </>
      );

    case "tasks":
      return (
        <>
          <InfoBox description="इस सेक्शन में दैनिक कार्य पूर्णता की स्थिति देख सकते हैं, जैसे आज और पहले के पूर्ण/अपूर्ण कार्य।" />
          <div className="dash-card-header">
            <h3>दैनिक कार्य पूर्णता</h3>
            <button className="dash-new-window-btn" onClick={openFullPageTasks}>
              नई विंडो में खोलें
            </button>
          </div>
          {
            tasksLoading ? (
              <p className="dash-loading">कार्य डेटा लोड हो रहा है...</p>
            ) : tasksError ? (
              <p className="dash-error">कार्य डेटा प्राप्त करने में त्रुटि: {tasksError}</p>
            ) : (
              <div className="dash-task-summary">
                <p>आज पूर्ण: <span>{tasksSummary.completedTasksToday ?? "--"}</span></p>
                <p>आज अपूर्ण: <span>{tasksSummary.notCompletedTasksToday ?? "--"}</span></p>
                <p>पहले पूर्ण: <span>{tasksSummary.completedTasksBeforeToday ?? "--"}</span></p>
                <p>पहले अपूर्ण: <span>{tasksSummary.notCompletedTasksBeforeToday ?? "--"}</span></p>
                <p>कुल दर्ज: <span>{tasksSummary.totalStudentsRecorded ?? "--"}</span></p>
              </div>
            )
          }
        </>
      );

    case "attendance":
      return (
        <>
          <InfoBox description="इस सेक्शन में छात्रों की उपस्थिति और अनुपस्थिति की जानकारी देख सकते हैं और CSV डाउनलोड कर सकते हैं।" />
          <div className="dash-card-header">
            <h3>छात्र उपस्थिति</h3>
            <div className="dash-attendance-buttons">
              <button className="dash-new-window-btn" onClick={openFullPagePresent}>
                उपस्थित - नई विंडो में खोलें
              </button>
              <button className="dash-new-window-btn" onClick={openFullPageAbsent}>
                अनुपस्थित - नई विंडो में खोलें
              </button>
            </div>
          </div>
          {
            attendanceLoading ? (
              <p className="dash-loading">उपस्थिति डेटा लोड हो रहा है...</p>
            ) : attendanceError ? (
              <p className="dash-error">उपस्थिति डेटा प्राप्त करने में त्रुटि: {attendanceError}</p>
            ) : (
              <>
                <div className="dash-attendance-summary">
                  <div className="dash-attendance-header">
                    <p className="dash-present">उपस्थित: {presentStudents ?? "--"}</p>
                    <button className="dash-download-btn" onClick={handleDownloadPresent}>
                      CSV डाउनलोड करें
                    </button>
                  </div>
                  {renderTable(presentStudentList, "उपस्थित छात्रों का विवरण")}
                </div>

                <div className="dash-attendance-summary">
                  <div className="dash-attendance-header">
                    <p className="dash-absent">अनुपस्थित: {absentStudents ?? "--"}</p>
                    <button className="dash-download-btn" onClick={handleDownloadAbsent}>
                      CSV डाउनलोड करें
                    </button>
                  </div>
                  {renderTable(absentStudentList, "अनुपस्थित छात्रों का विवरण")}
                </div>
              </>
            )
          }
        </>
      );
    case "classroom":
    case "leaderboard":
    case "advance-task-check":
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
    case "Livevideosmanage":
    case "TeacherActivityManagement":
    case "today-topic-submission":
    case "student-skill-report":
    case "score-report": // ✅ Naya component ke liye case
    case "test-management": // ✅ Yahan naya case add karein
    case "test-management-new": // ✅ Naya test management section
      // ✅ **नया बदलाव: Dynamic rendering based on activeSection**
      return renderSectionContent(activeSection);

    default:
      return null;
  }
};

// ✅ **नया बदलाव: User data load hone tak loading dikhayein**
if (!user) {
  return <div className="dash-loading-fullscreen">प्रमाणीकरण हो रहा है...</div>;
}


  // ✅ **नया बदलाव: डायनामिक रेंडरिंग**
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
            {/* ✅ **नया बदलाव: Role ke anusaar dynamic sidebar items** */}
            {availableSidebarItems.map(item => (
              <li 
                key={item.key} 
                className={activeSection === item.key ? "dash-active" : ""} 
                onClick={() => handleSectionChange(item.key)}
              >
                {item.label}
              </li>
            ))}
          </ul>
        </div>
        {/* ✅ **नया बदलाव: User info और Logout button** */}
        <div className="dash-sidebar-footer">
          <div className="dash-user-info">
            <p className="dash-user-name">{user.name}</p>
            <p className="dash-user-role">{user.accessType}</p>
          </div>
          <button onClick={handleLogout} className="dash-logout-btn">
            लॉग आउट
          </button>
        </div>
      </div>
      <div className="dash-main-content">
        <div className="dash-title-bar">
          <span>
            डैशबोर्ड अवलोकन - {availableSidebarItems.find(item => item.key === activeSection)?.label}
          </span>
        </div>
        {renderContent()}
      </div>
    </div>
  );
};

export default Dashboard;