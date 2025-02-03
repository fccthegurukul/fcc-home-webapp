import React, { useState, useEffect } from 'react';
import { Route, Routes, Link, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage';
import Dashboard from './pages/Dashboard';
import StudentAdmission from './pages/StudentAdmission';
import StudentsAttendance from './pages/StudentsAttendance';
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";

import './App.css'; // Make sure your base CSS is still imported
import './BottomNav.css'; // Import CSS for Bottom Navigation
import StudentList from './pages/StudentList';
import FileUpload from './components/FileUpload';
import FeeManagement from './components/FeeManagement';
import Report from './components/Report';
import StudentManagement from './components/StudentManagement';
import CardHub from './pages/CardHub';
import ViewCtcCtg from "./pages/ViewCtcCtg";
import Quiz from './pages/Quiz';
import './BottomNav.css';
import Leaderboard from './components/Leaderboard'; // Import Leaderboard 

const App = () => {
  const [isMenuOpen, setMenuOpen] = useState(false);
  const location = useLocation(); // To highlight active bottom nav item

  const toggleMenu = () => {
    setMenuOpen(!isMenuOpen);
  };

  // Reset menu on window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="App">
      <h1>Coaching Management System</h1>
      <nav className="navbar">
        <div className="hamburger-menu" onClick={toggleMenu}>
          <div></div>
          <div></div>
          <div></div>
        </div>

        <div className={`navbar-links ${isMenuOpen ? 'active' : ''}`}>
          <Link to="/" className="nav-link">Home</Link>
          <Link to="/dashboard" className="nav-link">Dashboard</Link>
          <Link to="/student-attendance" className="nav-link">Student Attendance</Link>
          <Link to="/student-admission" className="nav-link">Student Admission</Link>
          <Link to="/student-list" className="nav-link">Student List</Link>
          <Link to="/fee-management" className="nav-link">Fee Collection</Link>
          <Link to="/report" className="nav-link">Fee Report</Link>
          <Link to="/student-management" className="nav-link">Student Management Mini</Link>
          <Link to="/download-upload-data" className="nav-link">Download-Upload</Link>
        </div>
      </nav>

      <div className="content-area"> {/* Add content area to adjust spacing */}
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/student-admission" element={<StudentAdmission />} />
          <Route path="/student-attendance" element={<StudentsAttendance />} />
          <Route path="/student-list" element={<StudentList />} />
          <Route path="/download-upload-data" element={<FileUpload />} />
          <Route path="/fee-management" element={<FeeManagement />} />
          <Route path="/report" element={<Report />} />
          <Route path="/student-management" element={<StudentManagement />} />
          {/* <Route path="/student-profile" element={<StudentProfile />} /> */}
          <Route path="/card-hub" element={<CardHub />} />
          <Route path="/view-ctc-ctg" element={<ViewCtcCtg />} />
          <Route path="/quiz/:skill_topic" element={<Quiz />} />
          <Route path="/leaderboard" element={<Leaderboard />} /> {/* Leaderboard route add */}
        </Routes>
      </div>


      <nav className="bottom-navbar">
        <Link to="/" className={`bottom-nav-link ${location.pathname === '/' ? 'active' : ''}`}>
          <i className="fas fa-home"></i>
          <span>Home</span>
        </Link>
        <Link to="/view-ctc-ctg" className={`bottom-nav-link ${location.pathname ===  '/view-ctc-ctg'}`}>
          <i className="fas fa-calendar-day"></i>
          <span>Today</span>
        </Link>
        <Link to="/card-hub" className={`bottom-nav-link ${location.pathname === '/card-hub' ? 'active' : ''}`}>
          <i className="fas fa-graduation-cap"></i>
          <span>Skill</span>
        </Link>
        <Link to="/leaderboard" className={`bottom-nav-link ${location.pathname === '/leaderboard' ? 'active' : ''}`}>
          <i className="fas fa-trophy"></i>
          <span>LeaderBoard</span>
        </Link>
        <Link to="/archives" className={`bottom-nav-link ${location.pathname === '/archives' ? 'active' : ''}`}>
          <i className="fas fa-archive"></i>
          <span>Achives</span>
        </Link>
      </nav>


      <Analytics />
      <SpeedInsights />
    </div>
  );
};

export default App;