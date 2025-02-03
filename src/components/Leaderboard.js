import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ClipLoader } from 'react-spinners';
import './Leaderboard.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faTimesCircle, faHourglassHalf } from '@fortawesome/free-solid-svg-icons';
import NotFoundImage from "../assets/404-image.jpg";

const Leaderboard = () => {
    const location = useLocation();
    const { fccId: locationFccId, student: locationStudent } = location.state || {}; // location.state से student भी प्राप्त करें
    const [leaderboard, setLeaderboard] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [student, setStudent] = useState(locationStudent || null); // location.state से प्रारंभिक student state सेट करें
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [taskStatusFilter, setTaskStatusFilter] = useState('ALL');
    const [taskSortOrder, setTaskSortOrder] = useState('NONE');
    const [sortedTasks, setSortedTasks] = useState([]);
    const [leaderboardClassFilter, setLeaderboardClassFilter] = useState('ALL');
    const [classes, setClasses] = useState([]);
    const [filteredLeaderboard, setFilteredLeaderboard] = useState([]);
    const [isManualFilterChange, setIsManualFilterChange] = useState(false);
    const [fccId, setFccId] = useState(locationFccId); // local state fccId सेट करें, जो पहले location से प्राप्त होती है

    useEffect(() => {
        // जांचें कि क्या fccId पहले से state में है (StudentProfile से नेविगेशन के मामले में)
        const currentFccId = locationFccId || localStorage.getItem('lastViewedFccId'); // localStorage से भी fccId प्राप्त करने की कोशिश करें
        setFccId(currentFccId); // fccId state को अपडेट करें, जो useEffect dependencies द्वारा इस्तेमाल किया जाता है

        if (!currentFccId) {
            setError("FCC ID उपलब्ध नहीं है। कृपया स्टूडेंट प्रोफाइल से एक्सेस करें");
            setLoading(false);
            return;
        }

        const fetchLeaderboardData = async () => {
            try {
                setLoading(true);
                setError("");
                const response = await fetch(`http://localhost:5000/leaderboard/${currentFccId}?leaderboardClassFilter=${leaderboardClassFilter}`);
                const data = await response.json();
                if (response.ok) {
                    setLeaderboard(data.leaderboard);
                    setTasks(data.tasks);
                    setStudent(data.student || locationStudent); // state या API response से student सेट करें
                    if (data.student && data.student.fcc_class && !isManualFilterChange) {
                        setLeaderboardClassFilter(data.student.fcc_class);
                    } else if (!data.student || !data.student.fcc_class) {
                        setLeaderboardClassFilter('ALL');
                    }
                } else {
                    setError(data.error || "डेटा प्राप्त करने में समस्या हुई।");
                }
            } catch (err) {
                setError("कुछ त्रुटि हो गयी, कृपया बाद में पुनः प्रयास करें।");
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboardData();
    }, [fccId, leaderboardClassFilter, isManualFilterChange, locationStudent, locationFccId]); // सभी बाहरी state पर निर्भर करें


    useEffect(() => {
        let currentTasks = [...tasks];

        if (taskStatusFilter !== 'ALL') {
            currentTasks = currentTasks.filter(task => {
                if (taskStatusFilter === 'COMPLETED') {
                    return task.status === 'COMPLETED';
                } else if (taskStatusFilter === 'PENDING') {
                    return task.status === 'PENDING' || !task.status;
                } else if (taskStatusFilter === 'FAILED') {
                    return task.status === 'FAILED';
                }
                return true;
            });
        }

        if (taskSortOrder === 'ASC') {
            currentTasks.sort((a, b) => a.task_name.localeCompare(b.task_name));
        } else if (taskSortOrder === 'DESC') {
            currentTasks.sort((a, b) => b.task_name.localeCompare(a.task_name));
        }
        setSortedTasks(currentTasks);
    }, [tasks, taskSortOrder, taskStatusFilter]);

    const handleSortOrderChange = (order) => {
        setTaskSortOrder(order);
    };

    const handleFilterChange = (status) => {
        setTaskStatusFilter(status);
    };

    useEffect(() => {
        const fetchClasses = async () => {
            try {
                const response = await fetch(`http://localhost:5000/get-classes`);
                if (response.ok) {
                    const data = await response.json();
                    setClasses(['ALL', ...data.classes]);
                } else {
                    console.error('Error fetching classes:', response.statusText);
                }
            } catch (error) {
                console.error('Error fetching classes:', error);
            }
        };

        fetchClasses();
    }, []);


    useEffect(() => {
        let currentLeaderboard = [...leaderboard];

        if (leaderboardClassFilter !== 'ALL') {
            currentLeaderboard = leaderboard.filter(entry => {
                return entry.fcc_class === leaderboardClassFilter;
            });
        }
        setFilteredLeaderboard(currentLeaderboard);
    }, [leaderboard, leaderboardClassFilter]);


    const handleLeaderboardClassFilterChange = (selectedClass) => {
        setLeaderboardClassFilter(selectedClass);
        setIsManualFilterChange(true);
    };

    const formatDateTime = (dateTimeString) => {
        if (!dateTimeString) return "उपलब्ध नहीं";

        const date = new Date(dateTimeString);
        if (isNaN(date)) return "अमान्य तिथि";

        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = String(date.getFullYear()).slice(2);
        let hour = date.getHours();
        const minute = String(date.getMinutes()).padStart(2, '0');
        const ampm = hour >= 12 ? 'PM' : 'AM';
        hour = hour % 12;
        hour = hour ? hour : 12;

        return `${day}/${month}/${year} ${hour}:${minute} ${ampm}`;
    };


    return (
        <div className="leaderboard-container">
            <h1 className="leaderboard-title">गतिशील लीडरबोर्ड</h1>
            {loading ? (
                <div className="loader">
                    <ClipLoader color="#4A90E2" loading={loading} size={50} />
                    <p>डेटा लोड हो रहा है...</p>
                </div>
            ) : error ? (
                <p className="error">{error}</p>
            ) : (
                <>
                    {student && (
                        <div className="student-summary-card">
                            <div className="student-info-card">
                                {student.photo_url ? (
                                    <img
                                        src={student.photo_url}
                                        alt={`${student.student_name} का प्रोफाइल`}
                                        className="leaderboard-profile-picture"
                                    />
                                ) : (
                                    <img
                                        src={NotFoundImage}
                                        alt="डिफ़ॉल्ट प्रोफाइल"
                                        className="leaderboard-profile-picture"
                                    />
                                )}
                                <h2 className="student-name">{student.student_name}</h2>
                                <p className="student-score">कुल स्कोर: {student.total_score}</p>
                            </div>

                            <div className="student-rank-card">
                                <h2 className="student-rank-title">आपकी रैंक</h2>
                                <p className="student-rank">
                                    #{leaderboard.findIndex(entry => entry.student_fcc_id === fccId) + 1}
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="leaderboard-controls">
                        <div className="leaderboard-filter">
                            <label htmlFor="leaderboard-class-filter">लीडरबोर्ड क्लास फ़िल्टर:</label>
                            <select
                                id="leaderboard-class-filter"
                                value={leaderboardClassFilter}
                                onChange={(e) => handleLeaderboardClassFilterChange(e.target.value)}
                            >
                                <option value="ALL">सभी क्लासेस</option>
                                {classes.map(className => (
                                    <option key={className} value={className}>{className}</option>
                                ))}
                            </select>
                        </div>
                    </div>


                    <div className="leaderboard-table-container">
                        <h2 className="section-title">कक्षा लीडरबोर्ड</h2>
                        <div className="table-responsive">
                            <table className="leaderboard-table">
                                <thead>
                                    <tr>
                                        <th>रैंक</th>
                                        <th>विद्यार्थी का नाम</th>
                                        <th>कुल स्कोर</th>
                                        <th>कक्षा</th>
                                        <th>FCC ID</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredLeaderboard.map((entry, index) => (
                                        <tr
                                            key={entry.id}
                                            className={entry.student_fcc_id === fccId ? 'current-student' : ''}
                                        >
                                            <td>{index + 1}</td>
                                            <td>{entry.student_name}</td>
                                            <td>{entry.total_score}</td>
                                            <td>{entry.fcc_class}</td>
                                            <td>{entry.student_fcc_id}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>


                    {student && leaderboard.length > 0 && (
                        <div className="personalized-message-container">
                            <h2 className="section-title">पर्सनलाइज्ड संदेश</h2>
                            <div className="message-card">
                                <p className="message-text">
                                    <strong>{student.student_name}</strong>, आपका वर्तमान रैंक है
                                    <strong> #{leaderboard.findIndex(entry => entry.student_fcc_id === fccId) + 1} </strong>
                                    और आपका कुल स्कोर है <strong>{student.total_score} अंक</strong>।

                                    {(() => {
                                        const currentRank = leaderboard.findIndex(entry => entry.student_fcc_id === fccId) + 1;
                                        const nextRanker = leaderboard[currentRank - 2];
                                        const topFiveRanker = leaderboard[4];

                                        let nextRankMessage = "";
                                        let topFiveMessage = "";


                                        if (nextRanker) {
                                            const nextRankScoreGap = nextRanker.total_score - student.total_score;
                                            nextRankMessage = (
                                                <>
                                                    <br /><br />
                                                    <strong>अगली रैंक ( #{currentRank - 1} ) तक पहुंचने के लिए:</strong>
                                                    आपको <strong>{nextRankScoreGap} अंक</strong> और अर्जित करने होंगे।
                                                </>
                                            );
                                        } else {
                                            nextRankMessage = (
                                                <><br /><br /><strong>आप कक्षा में शीर्ष पर हैं! बधाई!</strong></>
                                            );
                                        }


                                        if (currentRank > 5 && topFiveRanker) {
                                            const topFiveScoreGap = topFiveRanker.total_score - student.total_score + 10;
                                            topFiveMessage = (
                                                <>
                                                    <br /><br />
                                                    <strong>टॉप 5 रैंक में पहुंचने के लिए:</strong>
                                                    आपको <strong>{topFiveScoreGap} अंक</strong> और अर्जित करने होंगे।
                                                </>
                                            );
                                        } else if (currentRank <= 5) {
                                            topFiveMessage = (
                                                <> <br /><br /><strong>आप पहले से ही टॉप 5 में हैं! बेहतरीन प्रदर्शन जारी रखें!</strong> </>
                                            );
                                        }

                                        return (
                                            <>
                                                {nextRankMessage}
                                                {topFiveMessage}
                                            </>
                                        );
                                    })()}
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="tasks-controls">
                        <div className="tasks-filter">
                            <label htmlFor="task-status-filter">फ़िल्टर स्थिति:</label>
                            <select
                                id="task-status-filter"
                                value={taskStatusFilter}
                                onChange={(e) => handleFilterChange(e.target.value)}
                            >
                                <option value="ALL">सभी कार्य</option>
                                <option value="PENDING">लंबित</option>
                                <option value="COMPLETED">पूरा हुआ</option>
                                <option value="FAILED">विफल</option>
                            </select>
                        </div>

                        <div className="tasks-sort">
                            <label htmlFor="task-sort-order">सॉर्ट कार्य:</label>
                            <select
                                id="task-sort-order"
                                value={taskSortOrder}
                                onChange={(e) => handleSortOrderChange(e.target.value)}
                            >
                                <option value="NONE">कोई सॉर्टिंग नहीं</option>
                                <option value="ASC">नाम (A-Z)</option>
                                <option value="DESC">नाम (Z-A)</option>
                            </select>
                        </div>
                    </div>


                    <div className="tasks-section">
                        <h2 className="section-title">आपके कार्य</h2>
                        {sortedTasks.length > 0 ? (
                            <div className="table-responsive">
                                <table className="tasks-table">
                                    <thead>
                                        <tr>
                                            <th>कार्य का नाम</th>
                                            <th>स्थिति</th>
                                            <th>आपके अंक</th>
                                            <th>अधिकतम अंक</th>
                                            <th>कार्य प्रारंभ समय</th>
                                            <th>कार्य समाप्ति समय</th>
                                            <th>विवरण</th>
                                            <th>कार्य ID</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedTasks.map(task => (
                                            <tr key={task.task_id}>
                                                <td>{task.task_name}</td>
                                                <td>
                                                    <span className={`task-status ${task.status}`}>
                                                        {task.status === 'COMPLETED' ? (
                                                            <>
                                                                <FontAwesomeIcon icon={faCheckCircle} className="status-icon" />
                                                                पूरा हुआ
                                                            </>
                                                        ) : task.status === 'FAILED' ? (
                                                            <>
                                                                <FontAwesomeIcon icon={faTimesCircle} className="status-icon failed" />
                                                                विफल
                                                            </>
                                                        ) : (
                                                            <>
                                                                <FontAwesomeIcon icon={faHourglassHalf} className="status-icon pending" />
                                                                लंबित
                                                            </>
                                                        )}
                                                    </span>
                                                </td>
                                                <td>{task.score_earned}</td>
                                                <td>{task.max_score}</td>
                                                <td>{formatDateTime(task.start_time)}</td>
                                                <td>{formatDateTime(task.end_time)}</td>
                                                <td>{task.description}</td>
                                                <td>{task.task_id}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="no-tasks-message"> कोई कार्य उपलब्ध नहीं हैं। <br /> <hr /> कृपया पहले अपनी ID लॉगिन करें ताकि आपके कार्य दिखाए जा सकें! <a href="/"> यहाँ लॉगिन करें</a> <hr /> </p>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default Leaderboard;