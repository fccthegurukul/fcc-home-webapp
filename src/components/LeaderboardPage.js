import React, { useState, useEffect, useCallback, useRef } from 'react';
import styles from './LeaderboardPage.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCrown, faCertificate } from '@fortawesome/free-solid-svg-icons';
import { v4 as uuidv4 } from 'uuid'; // Import UUID v4

const LeaderboardPage = () => {
    const [leaderboardData, setLeaderboardData] = useState([]);
    const [taskFilter, setTaskFilter] = useState('');
    const [taskNames, setTaskNames] = useState([]);
    const [classFilter, setClassFilter] = useState('');
    const [classNames, setClassNames] = useState([]);
    const [showFccId, setShowFccId] = useState(false);
    const apiUrl = process.env.REACT_APP_API_URL; // Already defined, correct usage
    const sessionId = useRef(uuidv4()); // Generate session ID here

    // Reusable function for logging user activity
    const logUserActivity = useCallback(async (activityType, activityDetails = null) => {
        try {
            const activityData = {
                activity_type: activityType,
                activity_details: activityDetails ? JSON.stringify(activityDetails) : null,
                page_url: window.location.pathname,
                session_id: sessionId.current,
            };

            await fetch(`${apiUrl}/api/user-activity-log`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    "ngrok-skip-browser-warning": "true" // Already present, correct
                },
                body: JSON.stringify(activityData)
            });
            console.log(`User activity '${activityType}' logged successfully.`);
        } catch (error) {
            console.error("Error logging user activity:", error);
        }
    }, [apiUrl]);

    useEffect(() => {
        logUserActivity('View Leaderboard Page'); // Log page view

        const fetchTaskNames = async () => {
            try {
                const response = await fetch(`${apiUrl}/api/leaderboard-task-names`, {
                    headers: {
                        'Content-Type': 'application/json',
                        "ngrok-skip-browser-warning": "true" // Added ngrok header
                    }
                });
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const data = await response.json();
                setTaskNames(data);
            } catch (error) {
                console.error("कार्य नाम लाने में विफलता:", error); // Fetching task names failed:
            }
        };

        const fetchClassNames = async () => {
            try {
                const response = await fetch(`${apiUrl}/api/leaderboard-class-names`, {
                    headers: {
                        'Content-Type': 'application/json',
                        "ngrok-skip-browser-warning": "true" // Added ngrok header
                    }
                });
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const data = await response.json();
                setClassNames(data);

                const bypassedStudent = JSON.parse(localStorage.getItem("bypassedStudent"));
                if (bypassedStudent?.fcc_class) {
                    const className = bypassedStudent.fcc_class;
                    if (data.includes(className)) {
                        setClassFilter(className);
                        console.log(`बाईपास किए गए डेटा से चयनित कक्षा: ${className}`); // Selected class from bypassed data:
                        logUserActivity('Set Class Filter from Bypassed Data', { class_name: className }); // Log filter set from bypass
                    } else {
                        console.log(`कक्षा ${className} उपलब्ध कक्षाओं में नहीं मिली:`, data); // Class ${className} not found in available classes:
                        logUserActivity('Bypassed Class Not Available', { class_name: className, available_classes: data }); // Log bypassed class not available
                    }
                }
            } catch (error) {
                console.error("कक्षा नाम लाने में विफलता:", error); // Fetching class names failed:
            }
        };

        fetchTaskNames();
        fetchClassNames();
    }, [apiUrl, logUserActivity]); // Added logUserActivity to dependency array

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                let queryParams = '';
                if (taskFilter) queryParams += `taskName=${taskFilter}&`;
                if (classFilter) queryParams += `class=${classFilter}&`;
                queryParams = queryParams.slice(0, -1);
                const response = await fetch(`${apiUrl}/api/leaderboard-data${queryParams ? '?' + queryParams : ''}`, {
                    headers: {
                        'Content-Type': 'application/json',
                        "ngrok-skip-browser-warning": "true" // Added ngrok header
                    }
                });
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const data = await response.json();
                setLeaderboardData(data);
            } catch (error) {
                console.error("लीडरबोर्ड डेटा लाने में विफलता:", error); // Fetching leaderboard data failed:
            }
        };

        fetchLeaderboard();
        logUserActivity('Fetch Leaderboard Data', { task_filter: taskFilter, class_filter: classFilter }); // Log leaderboard data fetch
    }, [taskFilter, classFilter, apiUrl, logUserActivity]); // Added logUserActivity to dependency array

    const handleTaskFilterChange = (event) => {
        setTaskFilter(event.target.value);
        logUserActivity('Change Task Filter', { task_filter: event.target.value }); // Log task filter change
    }

    const handleClassFilterChange = (event) => {
        setClassFilter(event.target.value);
        logUserActivity('Change Class Filter', { class_filter: event.target.value }); // Log class filter change
    }

    const handleShowFccIdClick = () => {
        setShowFccId(!showFccId);
        logUserActivity(showFccId ? 'Hide FCC ID' : 'Show FCC ID'); // Log show/hide FCC ID
    }

    const getRandomColor = () => {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) color += letters[Math.floor(Math.random() * 16)];
        return color;
    };

    const getRankBadge = (index) => {
        let rankClassName = '';
        let badgeIcon = null;

        if (index === 0) {
            badgeIcon = <FontAwesomeIcon icon={faCrown} className={styles.rankBadge1} />;
            rankClassName = styles.topRankProfile1;
        } else if (index === 1) {
            badgeIcon = <FontAwesomeIcon icon={faCrown} className={styles.rankBadge2} />;
            rankClassName = styles.topRankProfile2;
        } else if (index === 2) {
            badgeIcon = <FontAwesomeIcon icon={faCrown} className={styles.rankBadge3} />;
            rankClassName = styles.topRankProfile3;
        }
        return { badgeIcon, rankClassName };
    };

    const getScoreBadge = (score, index) => {
        if (index > 2 && score >= 10) {
            return <FontAwesomeIcon icon={faCertificate} className={styles.scoreBadge} />;
        }
        return null;
    };

    return (
        <div className={styles.leaderboardContainer}>
            <h1 className={styles.leaderboardTitle}>लीडरबोर्ड</h1>

            <div className={styles.filters}>
                <div className={styles.filterItem}>
                    <label htmlFor="taskFilter" className={styles.filterLabel}>कार्य के अनुसार फ़िल्टर करें:</label>
                    <select id="taskFilter" value={taskFilter} onChange={handleTaskFilterChange} className={styles.filterSelect}>
                        <option value="">सभी कार्य</option>
                        {taskNames.map((taskName, index) => (
                            <option key={index} value={taskName}>{taskName}</option>
                        ))}
                    </select>
                </div>

                <div className={styles.filterItem}>
                    <label htmlFor="classFilter" className={styles.filterLabel}>कक्षा के अनुसार फ़िल्टर करें:</label>
                    <select id="classFilter" value={classFilter} onChange={handleClassFilterChange} className={styles.filterSelect}>
                        <option value="">सभी कक्षाएँ</option>
                        {classNames.map((className, index) => (
                            <option key={index} value={className}>{className}</option>
                        ))}
                    </select>
                </div>
            </div>

            <button className={styles.showFccIdBtn} onClick={handleShowFccIdClick}>
                {showFccId ? 'एफसीसी आईडी छुपाएं' : 'एफसीसी आईडी दिखाएं'}
            </button>

            <div className={styles.tableResponsive}>
                <table className={styles.leaderboardTable}>
                    <thead>
                        <tr>
                            <th className={styles.tableHeader}>फोटो</th>
                            <th className={styles.tableHeader}>नाम</th>
                            {showFccId && <th className={styles.tableHeader}>FCC ID</th>}
                            <th className={styles.tableHeader}>क्लास</th>
                            <th className={styles.tableHeader}>सब अंक</th>
                        </tr>
                    </thead>
                    <tbody>
                        {leaderboardData.map((student, index) => {
                            const profileImage = student.profile_image;
                            const placeholderColor = getRandomColor();
                            const firstLetter = student.student_name ? student.student_name.charAt(0).toUpperCase() : '?';
                            const { badgeIcon, rankClassName } = getRankBadge(index);
                            const scoreBadge = getScoreBadge(student.total_score, index);

                            return (
                                <tr key={index} className={styles.tableRow}>
                                    <td className={styles.profileCell}>
                                        <div className={`${styles.profileImageContainer} ${rankClassName}`}>
                                            {profileImage ? (
                                                <img
                                                    src={profileImage}
                                                    alt={`${student.student_name} का प्रोफ़ाइल`} // ${student.student_name}'s Profile
                                                    className={`${styles.profileImage} ${rankClassName}`}
                                                />
                                            ) : (
                                                <div
                                                    className={`${styles.profilePlaceholder} ${rankClassName}`}
                                                    style={{ backgroundColor: placeholderColor }}
                                                >
                                                    {firstLetter}
                                                </div>
                                            )}
                                            {badgeIcon}
                                            {scoreBadge}
                                        </div>
                                    </td>
                                    <td className={styles.tableCell}>{student.student_name}</td>
                                    {showFccId && <td className={styles.tableCell}>{student.fcc_id}</td>}
                                    <td className={styles.tableCell}>{student.fcc_class}</td>
                                    <td className={styles.tableCell}>{student.total_score || 0}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {leaderboardData.length === 0 && <p className={styles.noData}>कोई लीडरबोर्ड डेटा उपलब्ध नहीं है।</p>}
        </div>
    );
};

export default LeaderboardPage;