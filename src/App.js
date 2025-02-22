// App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, Link, useLocation, useNavigate } from 'react-router-dom'; // Import useNavigate
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
import Navbar from './components/Navbar'; // Import the new Navbar component

const App = () => {
    const [isMenuOpen, setMenuOpen] = useState(false);
    const location = useLocation();
    const [isLoggedIn, setIsLoggedIn] = useState(false); // Auth state

    const navigate = useNavigate(); // Get navigate function

    const toggleMenu = () => {
        setMenuOpen(!isMenuOpen);
    };

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth > 768) {
                setMenuOpen(false);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const checkLoginStatus = () => {
        // **Replace this with your actual login status check logic.**
        // For example, check if a session token exists in local storage or cookies.
        // For this basic example, we are just using state.
        // In a real app, you might make an API call to verify session validity.

        // Example: Check for a token in local storage (you'll need to set this token on successful login in Login.js)
        const token = localStorage.getItem('authToken');
        if (token) {
            setIsLoggedIn(true);
        } else {
            setIsLoggedIn(false);
        }
    };

    useEffect(() => {
        checkLoginStatus(); // Check login status on component mount
    }, []);


    const handleLogout = async () => {
      try {
        const response = await fetch('http://localhost:5000/logout', {
          method: 'POST',
          credentials: 'include', // Include credentials (cookies) in the request
        });
        if (response.ok) {
          setIsLoggedIn(false);
          localStorage.removeItem('authToken'); // Keep this line if you are using tokens
          navigate('/');
          console.log("Logout request to backend successful");
        } else {
          console.error("Logout failed on backend");
        }
      } catch (error) {
        console.error("Logout error (network or fetch):", error);
      }
    };

    const ProtectedRoute = ({ children }) => {
        if (!isLoggedIn) {
            return <Navigate to="/login" replace state={{ from: location }} />;
        }
        return children;
    };

    const AdminProtectedRoute = ({ children }) => {
      // 'accessType' को localStorage से पढ़ें
      const accessType = localStorage.getItem('accessType');
  
      if (!isLoggedIn) {
          return <Navigate to="/login" replace state={{ from: location }} />;
      } else if (accessType !== 'Admin') {
          return <div style={{ padding: "2rem", textAlign: "center", fontSize: "1.2rem" }}>Sorry For service</div>;
      }
      return children;
  };
  


    return (
        <div className="App">
               <Navbar isLoggedIn={isLoggedIn} handleLogout={handleLogout} />
            <div className="content-area">
            <Routes>
    <Route path="/" element={<HomePage />} />
    {/* Dashboard अब केवल Admin के लिए उपलब्ध */}
    {/* <Route path="/dashboard" element={<AdminProtectedRoute><Dashboard /></AdminProtectedRoute>} /> */}
    <Route path="/student-attendance" element={<AdminProtectedRoute><StudentsAttendance /></AdminProtectedRoute>} />
    <Route path="/student-list" element={<AdminProtectedRoute><StudentList /></AdminProtectedRoute>} />
    <Route path="/download-upload-data" element={<AdminProtectedRoute><FileUpload /></AdminProtectedRoute>} />
    <Route path="/fee-management" element={<AdminProtectedRoute><FeeManagement /></AdminProtectedRoute>} />
    <Route path="/student-management" element={<AdminProtectedRoute><StudentManagement /></AdminProtectedRoute>} />
    <Route path="/fcchome-ai" element={<AdminProtectedRoute><FcchomeAI /></AdminProtectedRoute>} />
    <Route path="/task-submition" element={<AdminProtectedRoute><TaskSubmissionPage /></AdminProtectedRoute>} />
    <Route path="/taskcheck" element={<AdminProtectedRoute><Taskcheck /></AdminProtectedRoute>} />
    <Route path="/student-admission" element={<AdminProtectedRoute><StudentAdmission /></AdminProtectedRoute>} />
    <Route path="/report" element={<AdminProtectedRoute><Report /></AdminProtectedRoute>} />
    {/* Public Routes */}
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/card-hub" element={<CardHub />} />
    <Route path="/view-ctc-ctg" element={<ViewCtcCtg />} />
    <Route path="/quiz/:skill_topic" element={<Quiz />} />
    <Route path="/leaderboard" element={<LeaderboardPage />} />
    <Route path="/classroom" element={<Classroom />} />
    <Route path="/login" element={<Login setIsLoggedIn={setIsLoggedIn} />} />
    <Route path="/register" element={<Register />} />
</Routes>

            </div>

            <nav className="bottom-navbar">
                <Link to="/" className={`bottom-nav-link ${location.pathname === '/' ? 'active' : ''}`}>
                    <i className="fas fa-home"></i>
                    <span>होम</span>
                </Link>
                <Link to="/view-ctc-ctg" className={`bottom-nav-link ${location.pathname === '/view-ctc-ctg' ? 'active' : ''}`}>
                    <i className="fas fa-calendar-day"></i>
                    <span>उपस्थिति</span>
                </Link>
                <Link to="/card-hub" className={`bottom-nav-link ${location.pathname === '/card-hub' ? 'active' : ''}`}>
                    <i className="fas fa-graduation-cap"></i>
                    <span>स्किल</span>
                </Link>
                <Link to="/leaderboard" className={`bottom-nav-link ${location.pathname === '/leaderboard' ? 'active' : ''}`}>
                    <i className="fas fa-trophy"></i>
                    <span>लीडरबोर्ड</span>
                </Link>
                <Link to="/classroom" className={`bottom-nav-link ${location.pathname === '/classroom' ? 'active' : ''}`}>
                    <i className="fas fa-chalkboard-teacher"></i>
                    <span>क्लासरूम</span>
                </Link>
            </nav>

            <Analytics />
            <SpeedInsights />
        </div>
    );
};

export default App;