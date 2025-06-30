// src/pages/ActivityDashboard.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../utils/supabaseClient';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import './ActivityDashboard.css';

const ActivityDashboard = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [timeRange, setTimeRange] = useState('last_7_days');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [activityTypeFilter, setActivityTypeFilter] = useState('all');
  const [pageUrlFilter, setPageUrlFilter] = useState('all');

  const [allActivityTypes, setAllActivityTypes] = useState(['all']);
  const [allPageUrls, setAllPageUrls] = useState(['all']);
  const [loadingFilters, setLoadingFilters] = useState(true);

  // Fetch all unique filter options ONCE
  useEffect(() => {
    const fetchFilterOptions = async () => {
      setLoadingFilters(true);
      const { data, error } = await supabase.rpc('get_distinct_activity_filters');
      
      if (error) {
        console.error("Error fetching filter options:", error);
        setError("Could not load filter options.");
      } else if (data) {
        setAllActivityTypes(['all', ...(data.activity_types || [])]);
        setAllPageUrls(['all', ...(data.page_urls || [])]);
      }
      setLoadingFilters(false);
    };
    fetchFilterOptions();
  }, []);

  // Fetch LOGS based on selected filters
  useEffect(() => {
    if (loadingFilters) return;

    const fetchLogs = async () => {
      setLoading(true);
      setError(null);

      let query = supabase.from('user_activity_log').select('*');

      // Time Filtering
      const now = new Date();
      if (timeRange === 'last_1_hour') { // <<<--- NAYA LOGIC YAHAN HAI
        query = query.gte('timestamp', new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString());
      } else if (timeRange === 'last_24_hours') {
        query = query.gte('timestamp', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString());
      } else if (timeRange === 'last_7_days') {
        query = query.gte('timestamp', new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString());
      } else if (timeRange === 'last_30_days') {
        query = query.gte('timestamp', new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString());
      } else if (timeRange === 'custom' && customStartDate && customEndDate) {
        query = query.gte('timestamp', new Date(customStartDate).toISOString());
        const endDate = new Date(customEndDate);
        endDate.setDate(endDate.getDate() + 1);
        query = query.lte('timestamp', endDate.toISOString());
      }
      
      // Activity & Page Filtering
      if (activityTypeFilter !== 'all') {
        query = query.eq('activity_type', activityTypeFilter);
      }
      if (pageUrlFilter !== 'all') {
        query = query.eq('page_url', pageUrlFilter);
      }

      query = query.order('timestamp', { ascending: false }).limit(5000); 

      const { data, error } = await query;

      if (error) {
        setError(error.message);
      } else {
        setLogs(data || []);
      }
      setLoading(false);
    };

    fetchLogs();
  }, [timeRange, customStartDate, customEndDate, activityTypeFilter, pageUrlFilter, loadingFilters]);

  // --- Data processing with useMemo for performance ---

  const kpiData = useMemo(() => {
    const uniqueUsers = new Set(logs.map(log => log.user_name)).size;
    const uniqueSessions = new Set(logs.map(log => log.session_id)).size;
    return {
      totalEvents: logs.length,
      uniqueUsers,
      uniqueSessions
    };
  }, [logs]);

  const activityOverTimeData = useMemo(() => {
      const grouped = logs.reduce((acc, log) => {
          const date = new Date(log.timestamp);
          let key;
          
          // <<<--- NAYA GROUPING LOGIC YAHAN HAI
          if (timeRange === 'last_1_hour') {
             // Group by minute for 1-hour view
             key = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes()).toISOString();
          } else if (timeRange === 'last_24_hours') {
             // Group by hour for 24-hour view
             key = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()).toISOString();
          } else {
             // Group by day for other views
             key = date.toISOString().split('T')[0];
          }

          if (!acc[key]) acc[key] = { name: key, Events: 0 };
          acc[key].Events++;
          return acc;
      }, {});
      
      return Object.values(grouped).sort((a,b) => new Date(a.name) - new Date(b.name)).map(item => {
        const date = new Date(item.name);
        
        // <<<--- NAYA X-AXIS FORMATTING LOGIC
        if (timeRange === 'last_1_hour' || timeRange === 'last_24_hours') {
            item.name = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        } else {
            item.name = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        }
        return item;
      });
  }, [logs, timeRange]);
  
  const topActivitiesData = useMemo(() => {
    const counts = logs.reduce((acc, log) => {
      acc[log.activity_type] = (acc[log.activity_type] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [logs]);

  const topPagesData = useMemo(() => {
    const counts = logs.reduce((acc, log) => {
      const page = log.page_url || 'N/A';
      acc[page] = (acc[page] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [logs]);

  if (loadingFilters) {
    return <div className="dashboard-container"><div className="loading-state">Loading Filters...</div></div>;
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>User Activity Dashboard</h1>
        <div className="filters-bar">
          <div className="filter-group">
            <label htmlFor="timeRange">Time Range</label>
            <select id="timeRange" value={timeRange} onChange={e => setTimeRange(e.target.value)}>
              {/* <<<--- NAYA OPTION YAHAN HAI ---> */}
              <option value="last_1_hour">Last 1 Hour</option> 
              <option value="last_24_hours">Last 24 Hours</option>
              <option value="last_7_days">Last 7 Days</option>
              <option value="last_30_days">Last 30 Days</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
          {timeRange === 'custom' && (
            <div className="filter-group-custom">
              <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} />
              <span>to</span>
              <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} />
            </div>
          )}
          <div className="filter-group">
            <label htmlFor="activityType">Activity Type</label>
            <select id="activityType" value={activityTypeFilter} onChange={e => setActivityTypeFilter(e.target.value)}>
              {allActivityTypes.map(type => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <label htmlFor="pageUrl">Page URL</label>
            <select id="pageUrl" value={pageUrlFilter} onChange={e => setPageUrlFilter(e.target.value)}>
              {allPageUrls.map(url => <option key={url} value={url}>{url || 'N/A'}</option>)}
            </select>
          </div>
        </div>
      </header>

      {/* --- Data Display --- */}
      <div className="kpi-cards">
        <div className="kpi-card">
          <h2>{loading ? '...' : kpiData.totalEvents.toLocaleString()}</h2>
          <p>Total Events</p>
        </div>
        <div className="kpi-card">
          <h2>{loading ? '...' : kpiData.uniqueUsers.toLocaleString()}</h2>
          <p>Unique Users</p>
        </div>
        <div className="kpi-card">
          <h2>{loading ? '...' : kpiData.uniqueSessions.toLocaleString()}</h2>
          <p>Unique Sessions</p>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="chart-container large">
            <h3>Activity Over Time</h3>
            {loading ? <div className="loading-state">Loading Chart...</div> : 
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={activityOverTimeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3a3a3a" />
                    <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                    <YAxis stroke="#9ca3af" fontSize={12} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #4b5563', color: '#e5e7eb' }} />
                    <Legend wrapperStyle={{ color: '#e5e7eb' }}/>
                    <Line type="monotone" dataKey="Events" stroke="#6366f1" strokeWidth={2} dot={false} />
                </LineChart>
            </ResponsiveContainer>}
        </div>
        <div className="chart-container">
            <h3>Top 10 Activities</h3>
            {loading ? <div className="loading-state">Loading Chart...</div> : 
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topActivitiesData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3a3a3a" />
                    <XAxis type="number" stroke="#9ca3af" fontSize={12} />
                    <YAxis type="category" dataKey="name" width={120} stroke="#9ca3af" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #4b5563' }} />
                    <Bar dataKey="count" fill="#34d399" />
                </BarChart>
            </ResponsiveContainer>}
        </div>
         <div className="chart-container">
            <h3>Top 10 Pages</h3>
            {loading ? <div className="loading-state">Loading Chart...</div> : 
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topPagesData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3a3a3a" />
                    <XAxis type="number" stroke="#9ca3af" fontSize={12} />
                    <YAxis type="category" dataKey="name" width={120} stroke="#9ca3af" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #4b5563' }} />
                    <Bar dataKey="count" fill="#facc15" />
                </BarChart>
            </ResponsiveContainer>}
        </div>
      </div>
      
      <div className="logs-table-container">
        <h3>Recent Activity Logs ({loading ? '...' : logs.length} entries)</h3>
        {loading ? <div className="loading-state">Loading Logs...</div> : 
        <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Activity Type</th>
                  <th>Page URL</th>
                  <th>User Name</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.slice(0, 100).map(log => ( // Limit display to 100 for performance
                  <tr key={log.id}>
                    <td>{new Date(log.timestamp).toLocaleString()}</td>
                    <td><span className="activity-badge">{log.activity_type}</span></td>
                    <td className="page-url-cell">{log.page_url}</td>
                    <td>{log.user_name}</td>
                    <td className="details-cell">{log.activity_details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
        </div>
        }
        {!loading && logs.length === 0 && <p className="no-data-msg">No activity found for the selected filters.</p>}
      </div>
    </div>
  );
};

export default ActivityDashboard;