import React, { useState, useEffect, useCallback, useRef } from 'react';
import styles from './LeaderboardPage.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCrown, faCertificate } from '@fortawesome/free-solid-svg-icons';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../utils/supabaseClient'; // SUPABASE CLIENT IMPORT

const LeaderboardPage = () => {
    // States (no change)
    const [leaderboardData, setLeaderboardData] = useState([]);
    const [taskFilter, setTaskFilter] = useState('');
    const [taskNames, setTaskNames] = useState([]);
    const [classFilter, setClassFilter] = useState('');
    const [classNames, setClassNames] = useState([]);
    const [showFccId, setShowFccId] = useState(false);
    const [loading, setLoading] = useState(true);
    const sessionId = useRef(uuidv4());

    // User Activity Logger (no change)
    const logUserActivity = useCallback(async (activityType, activityDetails = null) => {
        try {
            supabase.from('user_activity_log').insert([{
                activity_type: activityType,
                activity_details: activityDetails ? JSON.stringify(activityDetails) : null,
                page_url: window.location.pathname,
                session_id: sessionId.current,
            }]).then(({ error }) => {
                if (error) console.error("Error logging user activity:", error.message);
            });
        } catch (error) {
            console.error("Critical error in logUserActivity:", error);
        }
    }, []);

    // Fetching Filter Data (no change)
    useEffect(() => {
        logUserActivity('View Leaderboard Page');

        const fetchFiltersData = async () => {
            try {
                const { data: taskData, error: taskError } = await supabase
                    .from('leaderboard')
                    .select('task_name');

                const { data: classData, error: classError } = await supabase
                    .from('leaderboard')
                    .select('fcc_class');

                if (taskError) throw new Error(`Task Names Error: ${taskError.message}`);
                if (classError) throw new Error(`Class Names Error: ${classError.message}`);

                const uniqueTasks = [...new Set(taskData.map(item => item.task_name))];
                const uniqueClasses = [...new Set(classData.map(item => item.fcc_class))];
                
                setTaskNames(uniqueTasks.sort());
                setClassNames(uniqueClasses.sort());

                const bypassedStudent = JSON.parse(localStorage.getItem("bypassedStudent"));
                if (bypassedStudent?.fcc_class && uniqueClasses.includes(bypassedStudent.fcc_class)) {
                    setClassFilter(bypassedStudent.fcc_class);
                    logUserActivity('Set Class Filter from Bypassed Data', { class_name: bypassedStudent.fcc_class });
                }
            } catch (error) {
                console.error("Error fetching filter data directly from tables:", error);
            }
        };

        fetchFiltersData();
    }, [logUserActivity]);
    
    // ===== यहाँ बदलाव किया गया है =====
    // Fetching and Processing main leaderboard data
    useEffect(() => {
        const fetchLeaderboard = async () => {
            setLoading(true);
            try {
                const taskFilterValue = taskFilter || null;
                const classFilterValue = classFilter || null;

                const { data, error } = await supabase.rpc('get_leaderboard_data', {
                    task_filter: taskFilterValue,
                    class_filter: classFilterValue
                });

                if (error) throw new Error(`Leaderboard Data Error: ${error.message}`);
                
                // ===== स्कोर को संशोधित करने वाला लॉजिक यहाँ है =====
                if (data) {
                    const processedData = data.map(student => {
                        let finalScore = student.total_score;

                        // आपके डेटाबेस में क्लास का नाम 'Class 9', 'Class 10' आदि होना चाहिए
                        if (student.fcc_class === '10') {
                            finalScore = Math.floor(student.total_score / 2.69);
                        } else if (student.fcc_class === '9') {
                            finalScore = Math.floor(student.total_score / 1.8);
                        }
                        
                        // छात्र ऑब्जेक्ट को नए स्कोर के साथ अपडेट करें
                        return { ...student, total_score: finalScore };
                    }).sort((a, b) => b.total_score - a.total_score); // नए स्कोर के आधार पर फिर से सॉर्ट करें
                    
                    setLeaderboardData(processedData);
                } else {
                    setLeaderboardData([]);
                }
                // =========================================================

            } catch (error) {
                console.error("Error fetching leaderboard data:", error);
                setLeaderboardData([]);
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboard();
        logUserActivity('Fetch Leaderboard Data', { task_filter: taskFilter, class_filter: classFilter });
    }, [taskFilter, classFilter, logUserActivity]);
    // =====================================

    // --- UI Handlers and other functions (no change) ---
    const handleTaskFilterChange = (event) => setTaskFilter(event.target.value);
    const handleClassFilterChange = (event) => setClassFilter(event.target.value);
    const handleShowFccIdClick = () => {
        setShowFccId(prev => !prev);
        logUserActivity(showFccId ? 'Hide FCC ID' : 'Show FCC ID');
    };
    const getRandomColor = () => `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
    const getRankBadge = (index) => {
        if (index === 0) return { badgeIcon: <FontAwesomeIcon icon={faCrown} className={styles.rankBadge1} />, rankClassName: styles.topRankProfile1 };
        if (index === 1) return { badgeIcon: <FontAwesomeIcon icon={faCrown} className={styles.rankBadge2} />, rankClassName: styles.topRankProfile2 };
        if (index === 2) return { badgeIcon: <FontAwesomeIcon icon={faCrown} className={styles.rankBadge3} />, rankClassName: styles.topRankProfile3 };
        return { badgeIcon: null, rankClassName: '' };
    };
    const getScoreBadge = (score, index) => {
        if (index > 2 && score >= 10) return <FontAwesomeIcon icon={faCertificate} className={styles.scoreBadge} />;
        return null;
    };

    // --- JSX (Rendering) (no change) ---
    return (
        <div className={styles.leaderboardContainer}>
            <h1 className={styles.leaderboardTitle}>लीडरबोर्ड</h1>
            <div className={styles.filters}>
                 <div className={styles.filterItem}>
                    <label htmlFor="taskFilter" className={styles.filterLabel}>कार्य के अनुसार फ़िल्टर करें:</label>
                    <select id="taskFilter" value={taskFilter} onChange={handleTaskFilterChange} className={styles.filterSelect}>
                        <option value="">सभी कार्य</option>
                        {taskNames.map((name, index) => <option key={index} value={name}>{name}</option>)}
                    </select>
                </div>
                <div className={styles.filterItem}>
                    <label htmlFor="classFilter" className={styles.filterLabel}>कक्षा के अनुसार फ़िल्टर करें:</label>
                    <select id="classFilter" value={classFilter} onChange={handleClassFilterChange} className={styles.filterSelect}>
                        <option value="">सभी कक्षाएँ</option>
                        {classNames.map((name, index) => <option key={index} value={name}>{name}</option>)}
                    </select>
                </div>
            </div>
            <button className={styles.showFccIdBtn} onClick={handleShowFccIdClick}>
                {showFccId ? 'एफसीसी आईडी छुपाएं' : 'एफसीसी आईडी दिखाएं'}
            </button>
            {loading ? (
                <p className={styles.noData}>लीडरबोर्ड लोड हो रहा है...</p>
            ) : (
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
                                const { badgeIcon, rankClassName } = getRankBadge(index);
                                const scoreBadge = getScoreBadge(student.total_score, index);
                                return (
                                    <tr key={student.fcc_id || index} className={styles.tableRow}>
                                        <td className={styles.profileCell}>
                                            <div className={`${styles.profileImageContainer} ${rankClassName}`}>
                                                {student.profile_image ? (
                                                    <img src={student.profile_image} alt={`${student.student_name} का प्रोफ़ाइल`} className={`${styles.profileImage} ${rankClassName}`} />
                                                ) : (
                                                    <div className={`${styles.profilePlaceholder} ${rankClassName}`} style={{ backgroundColor: getRandomColor() }}>{student.student_name ? student.student_name.charAt(0).toUpperCase() : '?'}</div>
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
                    {leaderboardData.length === 0 && !loading && (
                        <p className={styles.noData}>इस फ़िल्टर के लिए कोई लीडरबोर्ड डेटा उपलब्ध नहीं है।</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default LeaderboardPage;