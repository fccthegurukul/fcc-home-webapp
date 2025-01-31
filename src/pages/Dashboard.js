import React from 'react';

const Dashboard = () => {
  return (
    <div className="dashboard-container">
      <h2>Dashboard Overview</h2>

      <div className="stat-box">
        <h3>Total Students</h3>
        <p>--</p>
      </div>

      <div className="stat-box">
        <h3>Total Teachers</h3>
        <p>--</p>
      </div>

      <div className="stat-box">
        <h3>Student Attendance</h3>
        <p>--</p>
      </div>

      <div className="stat-box">
        <h3>Teacher Attendance</h3>
        <p>--</p>
      </div>
    </div>
  );
};

export default Dashboard;
