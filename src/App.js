import React, { useState, useEffect, useCallback } from 'react';
import { Route, Routes, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
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
import StudentProfile from './pages/StudentProfile'; // Import the StudentProfile component
import Troubleshooting from './components/Troubleshooting';
import Livevideosmanage from './components/Livevideosmanage';
import TeacherActivityManagement from './components/component2/TeacherActivityManagement';
import LeaderBoard from './components/component2/LeaderBoard';
import { v4 as uuidv4 } from 'uuid'; // For unique session IDs
import OneSignal from 'react-onesignal'; // OneSignal import
import FeeStatusManager from './components/component2/FeeStatusManager'; // नया कंपोनेंट इम्पोर्ट करें

const App = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const sessionId = React.useRef(uuidv4()); // Unique session ID for tracking
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const API_BASE_URL = process.env.REACT_APP_API_URL; // Define base URL from env variable

    // OneSignal Initialization
    useEffect(() => {
        OneSignal.init({
            appId: "8045b93b-6e4f-4805-9d2e-cb83783ba0c7", // Replace with your OneSignal App ID
            allowLocalhostAsSecureOrigin: true, // For local development
            autoResubscribe: true, // Automatically resubscribe users
            notifyButton: {
                enable: false, // Show a bell icon for subscription management
            },
        }).then(() => {
            console.log("OneSignal Initialized Successfully");
            OneSignal.User.PushSubscription.optIn(); // Prompt user to subscribe
        }).catch((error) => {
            console.error("OneSignal Initialization Error:", error);
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

    // Capture the beforeinstallprompt event
    useEffect(() => {
        const handler = (e) => {
            e.preventDefault(); // Prevent default browser prompt
            setDeferredPrompt(e); // Store the event for later use
        };

        window.addEventListener('beforeinstallprompt', handler);

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
        };
    }, []);

    // Function to trigger the install prompt
    const handleInstallClick = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt(); // Show the install prompt
            const { outcome } = await deferredPrompt.userChoice; // Wait for user response
            if (outcome === 'accepted') {
                console.log('User accepted the install prompt');
            } else {
                console.log('User dismissed the install prompt');
            }
            setDeferredPrompt(null); // Reset the prompt
        }
    };

    // Reusable function for logging user activity
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

            const response = await fetch(`${API_BASE_URL}/api/user-activity-log`, { // Updated URL
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(activityData),
            });

            if (!response.ok) throw new Error('Failed to log activity');
            console.log(`Activity '${activityType}' logged successfully`);
        } catch (error) {
            console.error('Error logging user activity:', error);
        }
    }, [isLoggedIn, location.pathname, API_BASE_URL]); // API_BASE_URL as dependency

    const handleLogout = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/logout`, { // Updated URL
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
        const username = localStorage.getItem('username') || "User"; // Get username from localStorage
        const whatsappMessage = `Hello! I want to complete the verification process at FCC The Gurukul quickly.`;

        if (!isLoggedIn) {
            return <Navigate to="/login" replace state={{ from: location }} />;
        } else if (accessType !== 'Admin') {
            return (
                <div
                    style={{
                        padding: "2rem",
                        textAlign: "center",
                        fontSize: "16px",
                        lineHeight: "1.6",
                        backgroundColor: "#f9f9f9",
                        borderRadius: "10px",
                        boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.1)",
                        maxWidth: "600px",
                        margin: "2rem auto"
                    }}
                >
                    <p>✅ Registration was successful! 🎉</p>
                    <p>⚡ Username verification is in progress. We are verifying whether you are an instructor at FCC The Gurukul or interested in using premium app features.</p>
                    <p>🔹 To speed up the verification process, use the button below:</p>
                    <a
                        href={`https://wa.me/9125263531?text=${encodeURIComponent(whatsappMessage)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: "inline-block",
                            marginTop: "15px",
                            padding: "12px 25px",
                            backgroundColor: "#25D366",
                            color: "#fff",
                            borderRadius: "8px",
                            textDecoration: "none",
                            fontSize: "16px",
                            fontWeight: "bold",
                            boxShadow: "0px 3px 6px rgba(0, 0, 0, 0.2)",
                            transition: "all 0.3s ease-in-out"
                        }}
                        onMouseOver={(e) => e.target.style.backgroundColor = "#1EBE5D"}
                        onMouseOut={(e) => e.target.style.backgroundColor = "#25D366"}
                    >
                        📲 Verify on WhatsApp
                    </a>
                </div>
            );
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
                    <Route path="/student-attendance" element={<AdminProtectedRoute><StudentsAttendance /></AdminProtectedRoute>} />
                    <Route path="/student-list" element={<AdminProtectedRoute><StudentList /></AdminProtectedRoute>} />
                    <Route path="/download-upload-data" element={<AdminProtectedRoute><FileUpload /></AdminProtectedRoute>} />
                    <Route path="/fee-management" element={<AdminProtectedRoute><FeeManagement /></AdminProtectedRoute>} />
                    <Route path="/student-management" element={<AdminProtectedRoute><StudentManagement /></AdminProtectedRoute>} />
                    <Route path="/task-submition" element={<AdminProtectedRoute><TaskSubmissionPage /></AdminProtectedRoute>} />
                    <Route path="/taskcheck" element={<AdminProtectedRoute><Taskcheck /></AdminProtectedRoute>} />
                    <Route path="/student-admission" element={<AdminProtectedRoute><StudentAdmission /></AdminProtectedRoute>} />
                    <Route path="/report" element={<AdminProtectedRoute><Report /></AdminProtectedRoute>} />
                    <Route path="/dashboard" element={<AdminProtectedRoute><Dashboard /></AdminProtectedRoute>} />
                    <Route path="/Livevideosmanage" element={<AdminProtectedRoute><Livevideosmanage /></AdminProtectedRoute>} />
                    <Route path="/TeacherActivityManagement" element={<AdminProtectedRoute><TeacherActivityManagement /></AdminProtectedRoute>} />
                    <Route path="/fee-status-manager" element={<AdminProtectedRoute><FeeStatusManager /></AdminProtectedRoute>} /> {/* Add the new route */}
                    {/* Public Routes */}
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
                    <Route path="/student/:fccId" element={<StudentProfile />} />
                    <Route path="/troubleshooting" element={<Troubleshooting />} />
                    <Route path="/LeaderBoard-Group" element={<LeaderBoard />} />
                    {/* <Route path="*" element={<Navigate to="/" />} /> */}
                </Routes>
            </div>
            <nav className="bottom-navbar">
                <Link
                    to="/"
                    className={`bottom-nav-link ${location.pathname === '/' ? 'active' : ''}`}
                    onClick={() => handleNavClick('/')}
                >
                    <i className="fas fa-home"></i><span>होम</span>
                </Link>
                <Link
                    to="/view-ctc-ctg"
                    className={`bottom-nav-link ${location.pathname === '/view-ctc-ctg' ? 'active' : ''}`}
                    onClick={() => handleNavClick('/view-ctc-ctg')}
                >
                    <i className="fas fa-calendar-day"></i><span>उपस्थिति</span>
                </Link>
                <Link
                    to="/card-hub"
                    className={`bottom-nav-link ${location.pathname === '/card-hub' ? 'active' : ''}`}
                    onClick={() => handleNavClick('/card-hub')}
                >
                    <i className="fas fa-graduation-cap"></i><span>स्किल</span>
                </Link>
                <Link
                    to="/leaderboard"
                    className={`bottom-nav-link ${location.pathname === '/leaderboard' ? 'active' : ''}`}
                    onClick={() => handleNavClick('/leaderboard')}
                >
                    <i className="fas fa-trophy"></i><span>लीडरबोर्ड</span>
                </Link>
                <Link
                    to="/classroom"
                    className={`bottom-nav-link ${location.pathname === '/classroom' ? 'active' : ''}`}
                    onClick={() => handleNavClick('/classroom')}
                >
                    <i className="fas fa-chalkboard-teacher"></i><span>क्लासरूम</span>
                </Link>
                <Link
                    to="/aihub"
                    className={`bottom-nav-link ${location.pathname === '/aihub' ? 'active' : ''}`}
                    onClick={() => handleNavClick('/aihub')}
                >
                    <i className="fas fa-brain"></i><span>AI</span>
                </Link>
            </nav>
            <Analytics />
            <SpeedInsights />
        </div>
    );
};

export default App;