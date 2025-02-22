import React, { useState, useEffect } from 'react';
import './Dashboard.css';

const Dashboard = () => {
    const API_URL = process.env.REACT_APP_API_URL;

    const [totalAdmissions, setTotalAdmissions] = useState(null);
    const [admittedStudentsList, setAdmittedStudentsList] = useState([]);
    const [presentStudents, setPresentStudents] = useState(null);
    const [absentStudents, setAbsentStudents] = useState(null);
    const [presentStudentList, setPresentStudentList] = useState([]);
    const [absentStudentList, setAbsentStudentList] = useState([]);
    const [showAttendanceDetails, setShowAttendanceDetails] = useState(false);
    const [showAbsentAttendanceDetails, setShowAbsentAttendanceDetails] = useState(false);
    const [showAdmittedStudents, setShowAdmittedStudents] = useState(false);

    const [completedTasksToday, setCompletedTasksToday] = useState(null);
    const [notCompletedTasksToday, setNotCompletedTasksToday] = useState(null);
    const [completedTasksBeforeToday, setCompletedTasksBeforeToday] = useState(null);
    const [notCompletedTasksBeforeToday, setNotCompletedTasksBeforeToday] = useState(null);
    const [totalStudentsRecorded, setTotalStudentsRecorded] = useState(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const admissionsResponse = await fetch(`${API_URL}/api/total-admissions`);
                const admissionsData = await admissionsResponse.json();
                setTotalAdmissions(admissionsData.totalAdmissions);

                const admittedStudentsResponse = await fetch(`${API_URL}/api/admitted-students`);
                const admittedStudentsData = await admittedStudentsResponse.json();
                setAdmittedStudentsList(admittedStudentsData);

                const attendanceResponse = await fetch(`${API_URL}/api/attendance-overview`);
                const attendanceData = await attendanceResponse.json();
                setPresentStudents(attendanceData.presentStudents);
                setAbsentStudents(attendanceData.absentStudents);
                setPresentStudentList(attendanceData.presentStudentsDetails);
                setAbsentStudentList(attendanceData.absentStudentsDetails);

                const taskCompletionResponse = await fetch(`${API_URL}/api/daily-task-completion`);
                const taskCompletionData = await taskCompletionResponse.json();
                setCompletedTasksToday(taskCompletionData.completedTasksToday);
                setNotCompletedTasksToday(taskCompletionData.notCompletedTasksToday);
                setCompletedTasksBeforeToday(taskCompletionData.completedTasksBeforeToday);
                setNotCompletedTasksBeforeToday(taskCompletionData.notCompletedTasksBeforeToday);
                setTotalStudentsRecorded(taskCompletionData.totalStudentsRecorded);
            } catch (err) {
                console.error("डैशबोर्ड डेटा प्राप्त करने में त्रुटि:", err);
                setError(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [API_URL]);

    if (loading) return <p>डैशबोर्ड डेटा लोड हो रहा है...</p>;
    if (error) return <p>डैशबोर्ड डेटा प्राप्त करने में त्रुटि: {error.message}</p>;

    const toggleAttendanceDetails = () => setShowAttendanceDetails(!showAttendanceDetails);
    const toggleAbsentAttendanceDetails = () => setShowAbsentAttendanceDetails(!showAbsentAttendanceDetails);
    const toggleAdmittedStudents = () => setShowAdmittedStudents(!showAdmittedStudents);

    const openFullPagePresent = () => {
        window.open(`${API_URL}/fcchome-present-students`, '_blank');
    };

    const openFullPageAbsent = () => {
        window.open(`${API_URL}/fcchome-absent-students`, '_blank');
    };

    const renderAdmittedStudentsTable = () => (
        <div className="attendance-details">
            <h4>दाखिल छात्रों की सूची:</h4>
            {admittedStudentsList.length > 0 ? (
                <table>
                    <thead>
                        <tr>
                            <th>एफसीसी आईडी</th>
                            <th>नाम</th>
                            <th>पिता</th>
                            <th>माता</th>
                            <th>मोबाइल नंबर</th>
                            <th>पता</th>
                            <th>दाखिला तिथि</th>
                        </tr>
                    </thead>
                    <tbody>
                        {admittedStudentsList.map((student, index) => (
                            <tr key={index}>
                                <td>{student.fcc_id}</td>
                                <td>{student.name}</td>
                                <td>{student.father || 'उपलब्ध नहीं'}</td>
                                <td>{student.mother || 'उपलब्ध नहीं'}</td>
                                <td>{student.mobile_number || 'उपलब्ध नहीं'}</td>
                                <td>{student.address || 'उपलब्ध नहीं'}</td>
                                <td>{student.admission_date ? new Date(student.admission_date).toLocaleDateString('hi-IN') : 'उपलब्ध नहीं'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <p>कोई दाखिल छात्र नहीं मिले।</p>
            )}
        </div>
    );

    const renderStudentTable = (students, title) => (
        <div className="attendance-details">
            <h4>{title}</h4>
            {students.length > 0 ? (
                <table>
                    <thead>
                        <tr>
                            <th>एफसीसी आईडी</th>
                            <th>नाम</th>
                            <th>पिता</th>
                            <th>माता</th>
                            <th>मोबाइल नंबर</th>
                            <th>पता</th>
                            <th>सीटीसी समय</th>
                            <th>सीटीजी समय</th>
                            <th>कार्य पूर्ण</th>
                            <th>दाखिला तिथि</th>
                        </tr>
                    </thead>
                    <tbody>
                        {students.map((student, index) => (
                            <tr key={index}>
                                <td>{student.fcc_id}</td>
                                <td>{student.name}</td>
                                <td>{student.father || 'उपलब्ध नहीं'}</td>
                                <td>{student.mother || 'उपलब्ध नहीं'}</td>
                                <td>{student.mobile_number || 'उपलब्ध नहीं'}</td>
                                <td>{student.address || 'उपलब्ध नहीं'}</td>
                                <td>{student.ctc_time ? new Date(student.ctc_time).toLocaleTimeString('hi-IN') : 'उपलब्ध नहीं'}</td>
                                <td>{student.ctg_time ? new Date(student.ctg_time).toLocaleTimeString('hi-IN') : 'उपलब्ध नहीं'}</td>
                                <td>{student.task_completed ? 'हाँ' : 'नहीं'}</td>
                                <td>{student.admission_date ? new Date(student.admission_date).toLocaleDateString('hi-IN') : 'उपलब्ध नहीं'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <p>कोई छात्र नहीं मिले।</p>
            )}
        </div>
    );

    return (
        <div className="dashboard-container">
            <h2>डैशबोर्ड अवलोकन</h2>

            <div className="summary-section">
                <div className="stat-box">
                    <h3>कुल दाखिले</h3>
                    <p>{totalAdmissions !== null ? totalAdmissions : '--'}</p>
                    <button onClick={toggleAdmittedStudents} className="view-details-button">
                        {showAdmittedStudents ? 'दाखिल छात्रों को छिपाएँ' : 'दाखिल छात्रों को देखें'}
                    </button>
                    {showAdmittedStudents && renderAdmittedStudentsTable()}
                </div>

                <div className="stat-box">
                    <h3>दैनिक कार्य पूर्णता</h3>
                    <p>आज पूर्ण हुए: {completedTasksToday !== null ? completedTasksToday : '--'}</p>
                    <p>आज अपूर्ण: {notCompletedTasksToday !== null ? notCompletedTasksToday : '--'}</p>
                    <p>आज से पहले पूर्ण: {completedTasksBeforeToday !== null ? completedTasksBeforeToday : '--'}</p>
                    <p>आज से पहले अपूर्ण: {notCompletedTasksBeforeToday !== null ? notCompletedTasksBeforeToday : '--'}</p>
                    <p>कुल दर्ज छात्र: {totalStudentsRecorded !== null ? totalStudentsRecorded : '--'}</p>
                </div>
            </div>

            <div className="details-section">
                <div className="stat-box">
                    <h3>छात्र उपस्थिति</h3>
                    <p>उपस्थित: {presentStudents !== null ? presentStudents : '--'}</p>
                    <p>अनुपस्थित: {absentStudents !== null ? absentStudents : '--'}</p>

                    {presentStudents > 0 && (
                        <>
                            <button onClick={toggleAttendanceDetails} className="view-details-button">
                                {showAttendanceDetails ? 'उपस्थित विवरण छिपाएँ' : 'उपस्थित विवरण देखें'}
                            </button>
                            <button onClick={openFullPagePresent} className="view-details-button">
                                नई विंडो में उपस्थित खोलें
                            </button>
                            {showAttendanceDetails && renderStudentTable(presentStudentList, "उपस्थित छात्रों का विवरण:")}
                        </>
                    )}
                    {presentStudents === 0 && <p>आज कोई छात्र उपस्थित नहीं है।</p>}

                    {absentStudents > 0 && (
                        <>
                            <button onClick={toggleAbsentAttendanceDetails} className="view-details-button">
                                {showAbsentAttendanceDetails ? 'अनुपस्थित विवरण छिपाएँ' : 'अनुपस्थित विवरण देखें'}
                            </button>
                            <button onClick={openFullPageAbsent} className="view-details-button">
                                नई विंडो में अनुपस्थित खोलें
                            </button>
                            {showAbsentAttendanceDetails && renderStudentTable(absentStudentList, "अनुपस्थित छात्रों का विवरण:")}
                        </>
                    )}
                    {absentStudents === 0 && <p>आज कोई छात्र अनुपस्थित नहीं है।</p>}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
