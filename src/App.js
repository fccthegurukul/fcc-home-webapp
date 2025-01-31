import React, { useState } from 'react';
import { Route, Routes, Link } from 'react-router-dom';  // Import Link for navigation
import HomePage from './pages/HomePage';
import Dashboard from './pages/Dashboard';
import StudentAdmission from './pages/StudentAdmission';
import StudentsAttendance from './pages/StudentsAttendance';

import './App.css';
import StudentList from './pages/StudentList';
import FileUpload from './components/FileUpload';
// FeeManagement
import FeeManagement from './components/FeeManagement';
import Report from './components/Report'
import StudentManagement from './components/StudentManagement';
import StudentProfile from './pages/StudentProfile';
import CardHub from './pages/CardHub';
import ViewCtcCtg from "./pages/ViewCtcCtg";
import Quiz from './pages/Quiz';

const App = () => {
  const [isMenuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => {
    setMenuOpen(!isMenuOpen);
  };

  return (
    <div className="App">
      <h1>Coaching Management System</h1>

      {/* Navigation Bar */}
      <nav className="navbar">
        {/* Hamburger Icon for Mobile */}
        <div className="hamburger-menu" onClick={toggleMenu}>
          <div></div>
          <div></div>
          <div></div>
        </div>

        {/* Navbar Links */}
        <div className={`navbar-links ${isMenuOpen ? 'active' : ''}`}>
          <Link to="/" className="nav-link">Home</Link>
          <Link to="/dashboard" className="nav-link">Dashboard</Link>
          <Link to="/student-attendance" className="nav-link">Student Attendance</Link>
          <Link to="/student-admission" className="nav-link">Student Admission</Link>
          <Link to="/student-list" className="nav-link">Student List</Link>
          <Link to="/fee-management" className="nav-link">Fee Collection</Link>
          <Link to="/report" className="nav-link">Fee Report</Link>
          <Link to="/student-management" className="nav-link">Student Management Mini</Link>
          <Link to="/student-profile" className="nav-link">Student Profile</Link>
          <Link to="/download-upload-data" className="nav-link">Download-Upload</Link>
        </div>
      </nav>

      {/* Routes */}
      <Routes>
        <Route exact path="/" element={<HomePage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/student-admission" element={<StudentAdmission />} />
        <Route path="/student-attendance" element={<StudentsAttendance />} />
        <Route path="/student-list" element={<StudentList />} />
        <Route path="/download-upload-data" element={<FileUpload />} />
        <Route path="/fee-management" element={<FeeManagement />} />
        <Route path="/report" element={<Report />} />
        <Route path="/student-management" element={<StudentManagement />} />
        <Route path="/student-profile" element={<StudentProfile />} />
        <Route path="/card-hub" element={<CardHub />} />
        <Route path="/view-ctc-ctg" element={<ViewCtcCtg />} />
        <Route path="/quiz/:skill_topic" element={<Quiz />} /> {/* Quiz route with topic parameter */}
      </Routes>
    </div>
  );
};

export default App;
