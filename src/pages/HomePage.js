import React from 'react';
import { Link } from 'react-router-dom';
import StudentProfile from './StudentProfile'; // StudentProfile component ko import kare

const HomePage = () => {
  return (
    <div>
      <h2>Welcome to Coaching Management System</h2>
      <nav>
        <ul>
          <li>
            <Link to="/student-admission">Student Admission</Link>
          </li>
          <li>
            <Link to="/teacher-attendance">Teacher Attendance</Link>
          </li>
          <li>
            <Link to="/dashboard">Dashboard</Link>
          </li>
        </ul>
      </nav>

      {/* StudentProfile component ko yaha render kare */}
      <StudentProfile />
    </div>
  );
};

export default HomePage;