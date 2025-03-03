import React, { useState, useEffect, useCallback } from 'react';
import { Route, Routes, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import OneSignal from 'react-onesignal'; // OneSignal इंपोर्ट करें
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
import { v4 as uuidv4 } from 'uuid';

const App = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const sessionId = React.useRef(uuidv4());

    // OneSignal Initialization
    const appId = process.env.REACT_APP_ONESIGNAL_APP_ID;
    useEffect(() => {
        console.log("Initializing OneSignal with react-onesignal...");
        OneSignal.init({
            appId: "d0b352ba-71ba-4093-bd85-4e3002360631", // अपनी OneSignal App ID यहाँ डालें
            allowLocalhostAsSecureOrigin: true, // लोकलहोस्ट टेस्टिंग के लिए
            notifyButton: {
                enable: true, // नोटिफिकेशन बेल दिखाने के लिए (ऑप्शनल)
            },
        }).then(() => {
            console.log("OneSignal initialized successfully!");
            OneSignal.Notifications.requestPermission().then((permission) => {
                if (permission) {
                    console.log("User granted push notification permission!");
                    OneSignal.User.PushSubscription.id.then((subscriptionId) => {
                        console.log("User Push Subscription ID:", subscriptionId);
                    });
                } else {
                    console.log("User denied push notification permission.");
                }
            });
        }).catch((error) => {
            console.error("OneSignal initialization failed:", error);
        });
    }, []);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth > 768) {
                // Placeholder for menu logic if needed
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const checkLoginStatus = () => {
        const token = localStorage.getItem('authToken');
        setIsLoggedIn(!!token);
    };

    useEffect(() => {
        checkLoginStatus();
    }, []);

    const logUserActivity = useCallback(async (activityType, activityDetails = {}) => {
        try {
            const activityData = {
                activity_type: activityType,
                activity_details: JSON.stringify({
                    ...activityDetails,
                    is_logged_in: isLoggedIn,
                    current_path: location.pathname,
                    timestamp: new Date().toISOString(),
                }),
                page_url: window.location.pathname,
                session_id: sessionId.current,
            };

            const response = await fetch('http://localhost:5000/api/user-activity-log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(activityData),
            });

            if (!response.ok) throw new Error('Failed to log activity');
            console.log(`Activity '${activityType}' logged successfully`);
        } catch (error) {
            console.error('Error logging user activity:', error);
        }
    }, [isLoggedIn, location.pathname]);

    const handleLogout = async () => {
        try {
            const response = await fetch('http://localhost:5000/logout', {
                method: 'POST',
                credentials: 'include',
            });
            if (response.ok) {
                setIsLoggedIn(false);
                localStorage.removeItem('authToken');
                navigate('/');
                logUserActivity('Logout');
                console.log("Logout successful");
            } else {
                console.error("Logout failed on backend");
            }
        } catch (error) {
            console.error("Logout error:", error);
            logUserActivity('Logout Failed', { error: error.message });
        }
    };

    const handleNavClick = (path) => {
        logUserActivity('Navigate', { to: path });
    };

    const AdminProtectedRoute = ({ children }) => {
        const accessType = localStorage.getItem('accessType');
        if (!isLoggedIn) {
            return <Navigate to="/login" replace state={{ from: location }} />;
        } else if (accessType !== 'Admin') {
            return <div style={{ padding: "2rem", textAlign: "center", fontSize: "1.2rem" }}>Sorry For Service</div>;
        }
        return children;
    };

    return (
        <div className="App">
            <Navbar isLoggedIn={isLoggedIn} handleLogout={handleLogout} />
            <div className="content-area">
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/student-attendance" element={<AdminProtectedRoute><StudentsAttendance /></AdminProtectedRoute>} />
                    <Route path="/student-list" element={<AdminProtectedRoute><StudentList /></AdminProtectedRoute>} />
                    <Route path="/download-upload-data" element={<AdminProtectedRoute><FileUpload /></AdminProtectedRoute>} />
                    <Route path="/fee-management" element={<AdminProtectedRoute><FeeManagement /></AdminProtectedRoute>} />
                    <Route path="/student-management" element={<AdminProtectedRoute><StudentManagement /></AdminProtectedRoute>} />
                    <Route path="/task-submition" element={<AdminProtectedRoute><TaskSubmissionPage /></AdminProtectedRoute>} />
                    <Route path="/taskcheck" element={<AdminProtectedRoute><Taskcheck /></AdminProtectedRoute>} />
                    <Route path="/student-admission" element={<AdminProtectedRoute><StudentAdmission /></AdminProtectedRoute>} />
                    <Route path="/report" element={<AdminProtectedRoute><Report /></AdminProtectedRoute>} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/card-hub" element={<CardHub />} />
                    <Route path="/view-ctc-ctg" element={<ViewCtcCtg />} />
                    <Route path="/quiz/:skill_topic" element={<Quiz />} />
                    <Route path="/leaderboard" element={<LeaderboardPage />} />
                    <Route path="/classroom" element={<Classroom />} />
                    <Route path="/login" element={<Login setIsLoggedIn={setIsLoggedIn} />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/skill-update" element={<SkillUpdate />} />
                    <Route path="/contact" element={<ContactForm />} />
                    <Route path="/puzzle-game" element={<PuzzleGame />} />
                    <Route path="/color-match-game" element={<ColorMatchGame />} />
                    <Route path="/english-practice" element={<EnglishPracticeAssistant />} />
                    <Route path="/fcchome-ai" element={<FcchomeAI />} />
                    <Route path="/aihub" element={<Aihub />} />
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </div>
            <nav className="bottom-navbar">
                <Link to="/" className={`bottom-nav-link ${location.pathname === '/' ? 'active' : ''}`} onClick={() => handleNavClick('/')}>
                    <i className="fas fa-home"></i><span>होम</span>
                </Link>
                <Link to="/view-ctc-ctg" className={`bottom-nav-link ${location.pathname === '/view-ctc-ctg' ? 'active' : ''}`} onClick={() => handleNavClick('/view-ctc-ctg')}>
                    <i className="fas fa-calendar-day"></i><span>उपस्थिति</span>
                </Link>
                <Link to="/card-hub" className={`bottom-nav-link ${location.pathname === '/card-hub' ? 'active' : ''}`} onClick={() => handleNavClick('/card-hub')}>
                    <i className="fas fa-graduation-cap"></i><span>स्किल</span>
                </Link>
                <Link to="/leaderboard" className={`bottom-nav-link ${location.pathname === '/leaderboard' ? 'active' : ''}`} onClick={() => handleNavClick('/leaderboard')}>
                    <i className="fas fa-trophy"></i><span>लीडरबोर्ड</span>
                </Link>
                <Link to="/classroom" className={`bottom-nav-link ${location.pathname === '/classroom' ? 'active' : ''}`} onClick={() => handleNavClick('/classroom')}>
                    <i className="fas fa-chalkboard-teacher"></i><span>क्लासरूम</span>
                </Link>
                <Link to="/aihub" className={`bottom-nav-link ${location.pathname === '/aihub' ? 'active' : ''}`} onClick={() => handleNavClick('/aihub')}>
                    <i className="fas fa-brain"></i><span>AI</span>
                </Link>
            </nav>
            <Analytics />
            <SpeedInsights />
        </div>
    );
};

export default App;