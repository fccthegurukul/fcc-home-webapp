// frontend/src/LeaderboardPage.js
import React, { useState, useEffect } from 'react';
import './LeaderboardPage.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCrown, faRibbon, faCertificate } from '@fortawesome/free-solid-svg-icons';

const LeaderboardPage = () => {
    const [leaderboardData, setLeaderboardData] = useState([]);
    const [taskFilter, setTaskFilter] = useState('');
    const [taskNames, setTaskNames] = useState([]);
    const [classFilter, setClassFilter] = useState('');
    const [classNames, setClassNames] = useState([]);
    const [showFccId, setShowFccId] = useState(false);
    const apiUrl = process.env.REACT_APP_API_URL;

    useEffect(() => {
        const fetchTaskNames = async () => {
            try {
                const response = await fetch(`${apiUrl}/api/leaderboard-task-names`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                setTaskNames(data);
            } catch (error) {
                console.error("Fetching task names failed:", error);
            }
        };

        const fetchClassNames = async () => {
            try {
                const response = await fetch(`${apiUrl}/api/leaderboard-class-names`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                setClassNames(data);
            } catch (error) {
                console.error("Fetching class names failed:", error);
            }
        };

        fetchTaskNames();
        fetchClassNames();
    }, [apiUrl]);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                let queryParams = '';
                if (taskFilter) {
                    queryParams += `taskName=${taskFilter}&`;
                }
                if (classFilter) {
                    queryParams += `class=${classFilter}&`;
                }
                queryParams = queryParams.slice(0, -1);
                const response = await fetch(`${apiUrl}/api/leaderboard-data${queryParams ? '?' + queryParams : ''}`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                setLeaderboardData(data);
            } catch (error) {
                console.error("Fetching leaderboard data failed:", error);
            }
        };

        fetchLeaderboard();
    }, [taskFilter, classFilter, apiUrl]);

    const handleTaskFilterChange = (event) => {
        setTaskFilter(event.target.value);
    };

    const handleClassFilterChange = (event) => {
        setClassFilter(event.target.value);
    };

    const handleShowFccIdClick = () => {
        setShowFccId(!showFccId);
    };

    const getRandomColor = () => {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    };

    const getRankBadge = (index) => {
        let rankClassName = '';
        let badgeIcon = null;

        if (index === 0) {
            badgeIcon = <FontAwesomeIcon icon={faCrown} className="rank-badge rank-badge-1" />;
            rankClassName = 'top-rank-profile-1';
        } else if (index === 1) {
            badgeIcon = <FontAwesomeIcon icon={faCrown} className="rank-badge rank-badge-2" />;
            rankClassName = 'top-rank-profile-2';
        } else if (index === 2) {
            badgeIcon = <FontAwesomeIcon icon={faCrown} className="rank-badge rank-badge-3" />;
            rankClassName = 'top-rank-profile-3';
        }
        return { badgeIcon, rankClassName };
    };

    const getScoreBadge = (score, index) => {
        if (index > 2 && score >= 10) {
            return <FontAwesomeIcon icon={faCertificate} className="score-badge" />;
        }
        return null;
    };


    return (
        <div className="leaderboard-container">
            <h1 className="leaderboard-title">Leaderboard</h1>

            <div className="filters">
                <div className="filter-item">
                    <label htmlFor="taskFilter">Filter by Task:</label>
                    <select id="taskFilter" value={taskFilter} onChange={handleTaskFilterChange}>
                        <option value="">All Tasks</option>
                        {taskNames.map((taskName, index) => (
                            <option key={index} value={taskName}>{taskName}</option>
                        ))}
                    </select>
                </div>

                <div className="filter-item">
                    <label htmlFor="classFilter">Filter by Class:</label>
                    <select id="classFilter" value={classFilter} onChange={handleClassFilterChange}>
                        <option value="">All Classes</option>
                        {classNames.map((className, index) => (
                            <option key={index} value={className}>{className}</option>
                        ))}
                    </select>
                </div>
            </div>

            <button className="showfccid-btn" onClick={handleShowFccIdClick}>{showFccId ? 'Hide FCC ID' : 'Show FCC ID'}</button>

            <div className="table-responsive">
                <table className="leaderboard-table">
                    <thead>
                        <tr>
                            <th>Profile</th>
                            <th>Student Name</th>
                            {showFccId && <th>FCC ID</th>}
                            <th>Class</th>
                            <th>Total Score</th>
                        </tr>
                    </thead>
                    <tbody>
                        {leaderboardData.map((student, index) => {
                            const profileImage = student.profile_image;
                            const placeholderColor = getRandomColor();
                            const firstLetter = student.student_name ? student.student_name.charAt(0).toUpperCase() : '?';
                            const { badgeIcon, rankClassName } = getRankBadge(index); // Get badgeIcon and rankClassName
                            const scoreBadge = getScoreBadge(student.total_score, index);

                            return (
                                <tr key={index}>
                                    <td className="profile-cell">
                                        <div className={`profile-image-container ${rankClassName}`}> {/* Apply dynamic class */}
                                            {profileImage ? (
                                                <img
                                                    src={profileImage}
                                                    alt={`${student.student_name}'s Profile`}
                                                    className={`profile-image ${rankClassName}`} // Apply dynamic class to image too for direct styling
                                                />
                                            ) : (
                                                <div
                                                    className={`profile-placeholder ${rankClassName}`} // Apply dynamic class to placeholder as well
                                                    style={{ backgroundColor: placeholderColor }}
                                                >
                                                    {firstLetter}
                                                </div>
                                            )}
                                            {badgeIcon}
                                            {scoreBadge}
                                        </div>
                                    </td>
                                    <td>{student.student_name}</td>
                                    {showFccId && <td>{student.fcc_id}</td>}
                                    <td>{student.fcc_class}</td>
                                    <td>{student.total_score || 0}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>


            {leaderboardData.length === 0 && <p className="no-data">No leaderboard data available.</p>}
        </div>
    );
};

export default LeaderboardPage;