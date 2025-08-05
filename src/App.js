import React, { useState, useEffect, useCallback } from 'react';
import { Route, Routes, Navigate, useLocation, useNavigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import Dashboard from './pages/Dashboard';
import StudentAdmission from './pages/StudentAdmission';
import StudentsAttendance from './pages/StudentsAttendance';
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import './App.css';
import './BottomNav.css';
import StudentList from './pages/StudentList';
import FileUpload from './components/FileUpload';
import FeeManagement from './components/FeeManagement';
import Report from './components/Report';
import StudentManagement from './components/StudentManagement';
import CardHub from './pages/CardHub';
import ViewCtcCtg from "./pages/ViewCtcCtg";
import Quiz from './pages/Quiz';
import LeaderboardPage from './components/LeaderboardPage';
import FcchomeAI from './pages/fcchome-ai';
import Classroom from './pages/Classroom';
import TaskSubmissionPage from './components/TaskSubmissionPage';
import Taskcheck from './components/Taskcheck';
import Login from './components/Login';
import Register from './components/Register';
import Navbar from './components/Navbar';
import SkillUpdate from './pages/SkillUpdate';
import ContactForm from './pages/ContactForm';
import PuzzleGame from './components/PuzzleGame';
import ColorMatchGame from './pages/ColorMatchGame';
import EnglishPracticeAssistant from './components/EnglishPracticeAssistant';
import Aihub from './pages/aihub';
import StudentProfile from './pages/StudentProfile';
import Troubleshooting from './components/Troubleshooting';
import Livevideosmanage from './components/Livevideosmanage';
import TeacherActivityManagement from './components/component2/TeacherActivityManagement';
import LeaderBoard from './components/component2/LeaderBoard';
import { v4 as uuidv4 } from 'uuid';
import OneSignal from 'react-onesignal';
import FeeStatusManager from './components/component2/FeeStatusManager';
import LiveVideoEmbed from './pages/livestream/livevideoembed';
import LiveVideoManage from './pages/livestream/livestreammanage';
import TeacherProtectedRoute from "./components/TeacherProtectedRoute";
import ActivityDashboard from './pages/ActivityDashboard';
import FeeManagementPanelSP from './pages/FeeManagementPanelSP';
import DailyReportDashboard from './components/DailyReportDashboard';
import TaskReport from './components/TaskReport';
import TaskReportDynamic from './components/TaskReportDynamic';
import ReactGA from "react-ga4";
import { supabase } from './utils/supabaseClient';
import StudentSkillReport from "./components/StudentSkillReport";

// Custom hook for page view tracking
const usePageTracking = () => {
    const location = useLocation();
    useEffect(() => {
        ReactGA.send({ hitType: "pageview", page: location.pathname + location.search });
    }, [location]);
};

const App = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const location = useLocation();
    const navigate = useNavigate(); // ✅ नेविगेशन के लिए हुक इम्पोर्ट करें
    const sessionId = React.useRef(uuidv4());
    const [deferredPrompt, setDeferredPrompt] = useState(null);

    useEffect(() => {
        ReactGA.initialize("G-CKZHN5ZG9M");
    }, []);

    usePageTracking();

    // OneSignal Initialization
    useEffect(() => {
        OneSignal.init({
            appId: "8045b93b-6e4f-4805-9d2e-cb83783ba0c7",
            allowLocalhostAsSecureOrigin: true,
            autoResubscribe: true,
            notifyButton: { enable: false },
        }).then(() => {
            console.log("OneSignal Initialized");
            OneSignal.User.PushSubscription.optIn();
        }).catch(console.error);
    }, []);

    const checkLoginStatus = useCallback(() => {
        const user = localStorage.getItem('user');
        setIsLoggedIn(!!user);
    }, []);

    // Check login status on mount and on storage changes
    useEffect(() => {
        checkLoginStatus();
        window.addEventListener('storage', checkLoginStatus);
        return () => window.removeEventListener('storage', checkLoginStatus);
    }, [checkLoginStatus]);

    // Capture the beforeinstallprompt event
    useEffect(() => {
        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    // Function to trigger the install prompt
    const handleInstallClick = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            await deferredPrompt.userChoice;
            setDeferredPrompt(null);
        }
    };

    // Reusable function for logging user activity
    const logUserActivity = useCallback(async (activityType, activityDetails = {}) => {
        try {
            const userString = localStorage.getItem('user');
            let userName = 'anonymous_user';
            let userUUID = null;

            if (userString) {
                const user = JSON.parse(userString);
                userName = user.name || 'logged_in_user';
                userUUID = user.id || null;
            }

            const activityData = {
                user_name: userName,
                session_id: sessionId.current,
                page_url: window.location.pathname,
                activity_type: activityType,
                activity_details: JSON.stringify({ ...activityDetails, user_uuid: userUUID }),
            };

            await supabase.from('user_activity_log').insert([activityData]);
        } catch (error) {
            console.error('Error logging user activity:', error);
        }
    }, []);

    const handleLogout = async () => {
        try {
            const userString = localStorage.getItem('user');
            if (userString) {
                const user = JSON.parse(userString);
                await logUserActivity('Navbar Logout', { user_uuid: user.id });
            }
            localStorage.clear();
            setIsLoggedIn(false);
            navigate('/login');
        } catch (error) {
            console.error("Logout error:", error);
        }
    };

    // ✅ **बेहतर handleNavClick फंक्शन**
    const handleNavClick = (path, event) => {
        if (event) event.preventDefault();
        logUserActivity('BottomNav Click', { to: path });
        navigate(path);
    };

    const AdminProtectedRoute = ({ children }) => {
        const user = localStorage.getItem('user');
        if (!user) {
            return <Navigate to="/login" replace state={{ from: location }} />;
        }
        return children;
    };

    return (
        <div className="App">
            <Navbar isLoggedIn={isLoggedIn} handleLogout={handleLogout} />
            {deferredPrompt && (
                <div className="install-prompt">
                    <p>🔥 हमारा वेब को होम स्क्रीन पर इनस्टॉल करें 🚀</p>
                    <button onClick={handleInstallClick}>अभी इंस्टॉल करें</button>
                </div>
            )}
            <div className="content-area">
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    
                    {/* Admin and Teacher Protected Routes */}
                    <Route path="/student-list" element={<AdminProtectedRoute><StudentList /></AdminProtectedRoute>} />
                    <Route path="/download-upload-data" element={<AdminProtectedRoute><FileUpload /></AdminProtectedRoute>} />
                    <Route path="/fee-management" element={<AdminProtectedRoute><FeeManagement /></AdminProtectedRoute>} />
                    <Route path="/student-management" element={<AdminProtectedRoute><StudentManagement /></AdminProtectedRoute>} />
                    <Route path="/report" element={<AdminProtectedRoute><Report /></AdminProtectedRoute>} />
                    <Route path="/dashboard" element={<AdminProtectedRoute><Dashboard /></AdminProtectedRoute>} />
                    <Route path="/Livevideosmanage" element={<AdminProtectedRoute><Livevideosmanage /></AdminProtectedRoute>} />
                    <Route path="/TeacherActivityManagement" element={<AdminProtectedRoute><TeacherActivityManagement /></AdminProtectedRoute>} />
                    <Route path="/fee-status-manager" element={<AdminProtectedRoute><FeeStatusManager /></AdminProtectedRoute>} />
                    <Route path="/activity-dashboard" element={<TeacherProtectedRoute><ActivityDashboard /></TeacherProtectedRoute>} />
                  
                   {/* --------------------- YAHAN BADLAV KIYA GAYA HAI --------------------- */}
                    {/* ✅ पाथ 1: /student-attendance को /dashboard पर भेजें */}
                    <Route path="/student-attendance" element={<Navigate to="/dashboard" replace />} />
                    {/* ✅ पाथ 2: /task-submition को /dashboard पर भेजें */}
                    <Route path="/task-submition" element={<Navigate to="/dashboard" replace />} />
                    {/* ✅ पाथ 3: /taskcheck को /dashboard पर भेजें */}
                    <Route path="/taskcheck" element={<Navigate to="/dashboard" replace />} />
                    {/* ✅ पाथ 4: /student-admission को /dashboard पर भेजें */}
                    <Route path="/student-admission" element={<Navigate to="/dashboard" replace />} />
                    {/* --------------------- BADLAV KHATAM --------------------- */}
                  
                    <Route path="/daily-report-dashboard" element={<TeacherProtectedRoute><DailyReportDashboard /></TeacherProtectedRoute>} />
                    <Route path="/fee-management-panel-sp" element={<TeacherProtectedRoute><FeeManagementPanelSP /></TeacherProtectedRoute>} />
                    <Route path="/task-report" element={<TeacherProtectedRoute><TaskReport /></TeacherProtectedRoute>} />
                    <Route path="/task-report-dynamic" element={<TeacherProtectedRoute><TaskReportDynamic /></TeacherProtectedRoute>} />
                    <Route path="/student-skill-report" element={<TeacherProtectedRoute><StudentSkillReport /></TeacherProtectedRoute>} />

                    {/* Public Routes */}
                    <Route path="/card-hub" element={<CardHub />} />
                    <Route path="/view-ctc-ctg" element={<ViewCtcCtg />} />
                    <Route path="/quiz/:skill_topic" element={<Quiz />} />
                    <Route path="/leaderboard" element={<LeaderboardPage />} />
                    <Route path="/classroom" element={<Classroom />} />
                    <Route path="/login" element={<Login setIsLoggedIn={setIsLoggedIn} logUserActivity={logUserActivity} />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/skill-update" element={<SkillUpdate />} />
                    <Route path="/contact" element={<ContactForm />} />
                    <Route path="/puzzle-game" element={<PuzzleGame />} />
                    <Route path="/color-match-game" element={<ColorMatchGame />} />
                    <Route path="/english-practice" element={<EnglishPracticeAssistant />} />
                    <Route path="/fcchome-ai" element={<FcchomeAI />} />
                    <Route path="/aihub" element={<Aihub />} />
                    <Route path="/student/:fccId" element={<StudentProfile />} />
                    <Route path="/troubleshooting" element={<Troubleshooting />} />
                    <Route path="/LeaderBoard-Group" element={<LeaderBoard />} />
                    <Route path="/live-video-embed" element={<LiveVideoEmbed />} />
                    <Route path="/live-video-manage" element={<LiveVideoManage />} />
                </Routes>
            </div>
            
            {/* ✅ **अपडेटेड बॉटम नेविगेशन बार** */}
            <nav className="bottom-navbar">
                <a href="/" onClick={(e) => handleNavClick('/', e)} className={`bottom-nav-link ${location.pathname === '/' ? 'active' : ''}`}>
                    <i className="fas fa-home"></i><span>होम</span>
                </a>
                <a href="/view-ctc-ctg" onClick={(e) => handleNavClick('/view-ctc-ctg', e)} className={`bottom-nav-link ${location.pathname === '/view-ctc-ctg' ? 'active' : ''}`}>
                    <i className="fas fa-calendar-day"></i><span>उपस्थिति</span>
                </a>
                <a href="/leaderboard" onClick={(e) => handleNavClick('/leaderboard', e)} className={`bottom-nav-link ${location.pathname === '/leaderboard' ? 'active' : ''}`}>
                    <i className="fas fa-trophy"></i><span>लीडरबोर्ड</span>
                </a>
                <a href="/classroom" onClick={(e) => handleNavClick('/classroom', e)} className={`bottom-nav-link ${location.pathname === '/classroom' ? 'active' : ''}`}>
                    <i className="fas fa-chalkboard-teacher"></i><span>क्लासरूम</span>
                </a>
            </nav>
            <Analytics />
            <SpeedInsights />
        </div>
    );
};

export default App;