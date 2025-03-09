// LeaderBoard.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './LeaderBoard.css';

const LeaderBoard = () => {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [sessionTypeFilter, setSessionTypeFilter] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [sessionTypes, setSessionTypes] = useState([]);

  const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  useEffect(() => {
    fetchLeaderboard();
    fetchAvailableSessionTypes(); // Fetch session types on component mount
  }, [sessionTypeFilter, startDateFilter, endDateFilter]);

  const fetchLeaderboard = async () => {
    try {
      const params = {
        session_type: sessionTypeFilter || undefined,
        start_date: startDateFilter || undefined,
        end_date: endDateFilter || undefined
      };
      const response = await axios.get(`${API_BASE_URL}/leaderboard-sessions`, { params, withCredentials: true });
      setLeaderboardData(response.data);
    } catch (error) {
      console.error('Error fetching leaderboard data:', error);
    }
  };

  const fetchAvailableSessionTypes = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/session-types`, { withCredentials: true }); // Call the NEW backend endpoint
      setSessionTypes(response.data);
      console.log("Fetched Session Types:", response.data); // For Debugging: Check if session types are fetched correctly
    } catch (error) {
      console.error('Error fetching session types:', error);
      // Fallback types - Removed default types, fetch from API is preferred
    }
  };


  const handleSessionTypeFilterChange = (e) => {
    setSessionTypeFilter(e.target.value);
  };

  const handleStartDateFilterChange = (e) => {
    setStartDateFilter(e.target.value);
  };

  const handleEndDateFilterChange = (e) => {
    setEndDateFilter(e.target.value);
  };

  return (
    <div className="leaderboard-container">
      <h2>Group Session Leaderboard</h2>

      <div className="filters">
        <div className="filter-item">
          <label htmlFor="sessionTypeFilter">Session Type:</label>
          <select
            id="sessionTypeFilter"
            className="form-control"
            value={sessionTypeFilter}
            onChange={handleSessionTypeFilterChange}
          >
            <option value="">All Session Types</option>
            {sessionTypes.map(type => (
              <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}</option>
            ))}
          </select>
        </div>
        <div className="filter-item">
          <label htmlFor="startDateFilter">Start Date:</label>
          <input type="date" id="startDateFilter" className="form-control" value={startDateFilter} onChange={handleStartDateFilterChange} />
        </div>
        <div className="filter-item">
          <label htmlFor="endDateFilter">End Date:</label>
          <input type="date" id="endDateFilter" className="form-control" value={endDateFilter} onChange={handleEndDateFilterChange} />
        </div>
      </div>

      <div className="leaderboard-table-container">
        <table>
          <thead>
            <tr>
              <th>FCC ID</th>
              <th>Session Type</th>
              <th>Session Count</th>
              <th>Total Duration</th>
            </tr>
          </thead>
          <tbody>
            {leaderboardData.map((item, index) => (
              <tr key={index}>
                <td>{item.fccid}</td>
                <td>{item.session_type.charAt(0).toUpperCase() + item.session_type.slice(1).replace('_', ' ')}</td>
                <td>{item.session_count}</td>
                <td>{item.total_duration}</td>
              </tr>
            ))}
            {leaderboardData.length === 0 && (
              <tr>
                <td colSpan="4">No data available for the selected filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LeaderBoard;