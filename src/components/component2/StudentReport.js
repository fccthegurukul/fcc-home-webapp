import React, { useState, useMemo } from 'react';
import './StudentReport.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faUser, faCalendarAlt, faStar } from '@fortawesome/free-solid-svg-icons';
import { supabase } from '../../utils/supabaseClient';

const StudentReport = () => {
    // States
    const [fccId, setFccId] = useState('');
    const [groupedData, setGroupedData] = useState({});
    const [studentInfo, setStudentInfo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [currentMonthInfo, setCurrentMonthInfo] = useState('');

    const totalScore = useMemo(() => {
        // 'Absent' वाले रिकॉर्ड को छोड़कर कुल स्कोर की गणना करें
        return Object.values(groupedData)
            .flat()
            .filter(record => record.task_name !== 'Absent')
            .reduce((sum, record) => sum + (record.score || 0), 0);
    }, [groupedData]);
    
    // डेटा को YYYY-MM-DD कुंजी के आधार पर ग्रुप करने का फंक्शन
    const groupDataByDateKey = (data) => {
        return data.reduce((acc, record) => {
            const dateKey = record.submission_date.split('T')[0];
            if (!acc[dateKey]) acc[dateKey] = [];
            acc[dateKey].push(record);
            return acc;
        }, {});
    };

    // महीने की पूरी रिपोर्ट बनाने का विश्वसनीय फंक्शन
    const generateFullMonthReport = (data, selectedMonth, selectedYear) => {
        const groupedFromDB = groupDataByDateKey(data);
        const fullReport = {};
        const today = new Date();
        const reportUntilDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

        let currentDate = new Date(selectedYear, selectedMonth, 1);

        // सिर्फ आज की तारीख से पहले के दिनों के लिए अनुपस्थिति मार्क करें
        while (currentDate.getMonth() === selectedMonth && currentDate < reportUntilDate) {
            const dateKey = currentDate.toISOString().split('T')[0];
            if (!groupedFromDB[dateKey]) {
                fullReport[dateKey] = [{ submission_date: dateKey, task_name: 'Absent', score: 0 }];
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }

        // अब डेटाबेस से आया सभी डेटा इसमें जोड़ें (या ओवरराइट करें)
        Object.keys(groupedFromDB).forEach(key => {
            fullReport[key] = groupedFromDB[key];
        });
        
        // तारीखों को नए से पुराने के क्रम में सॉर्ट करें
        const sortedKeys = Object.keys(fullReport).sort((a, b) => new Date(b) - new Date(a));
        
        const sortedReport = {};
        sortedKeys.forEach(key => {
            // दिखाते समय तारीख को भारतीय फॉर्मेट में बदलें
            const displayDate = new Date(key + 'T00:00:00Z').toLocaleDateString('hi-IN', {day: '2-digit', month: '2-digit', year: 'numeric'});
            sortedReport[displayDate] = fullReport[key];
        });
        
        return sortedReport;
    };


    const handleSearch = async () => {
        if (!fccId) { setError('कृपया एक FCC ID दर्ज करें।'); return; }
        setLoading(true); setError(''); setGroupedData({}); setStudentInfo(null);
        
        try {
            const today = new Date();
            const year = today.getFullYear();
            const monthJS = today.getMonth(); // 0-indexed: 0-11
            const monthSQL = (monthJS + 1).toString().padStart(2, '0'); // 1-indexed: 01-12
            
            // <<< ASLI FIX YAHAN HAI: टाइमज़ोन-प्रूफ डेट स्ट्रिंग >>>
            const firstDayString = `${year}-${monthSQL}-01`;
            const lastDay = new Date(year, monthJS + 1, 0).getDate();
            const lastDayString = `${year}-${monthSQL}-${lastDay}`;
            
            setCurrentMonthInfo(today.toLocaleString('hi-IN', { month: 'long', year: 'numeric' }));

            const [performanceRes, studentInfoRes] = await Promise.all([
                supabase.from('leaderboard')
                    .select('submission_date, task_name, score')
                    .eq('fcc_id', fccId)
                    .gte('submission_date', firstDayString)
                    .lte('submission_date', lastDayString),
                supabase.from('new_student_admission').select('name, fcc_class').eq('fcc_id', fccId).single()
            ]);
            
            if (studentInfoRes.error || !studentInfoRes.data) {
                setError(`यह FCC ID (${fccId}) सिस्टम में मौजूद नहीं है।`);
                setLoading(false);
                return;
            }
            setStudentInfo(studentInfoRes.data);

            const fetchedData = performanceRes.data || [];
            
            const fullReport = generateFullMonthReport(fetchedData, monthJS, year);
            setGroupedData(fullReport);

            if (Object.keys(fullReport).length === 0) {
                 setError(`इस छात्र के लिए मौजूदा महीने में कोई रिकॉर्ड नहीं मिला।`);
            }

        } catch (e) {
            console.error("Data fetching error:", e);
            if(!error) setError(`डेटा लोड करने में विफल: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };
    
    const handleKeyPress = (event) => { if (event.key === 'Enter') handleSearch(); };

    return (
        <div className="report-container">
            <div className="report-card">
                <h1 className="report-title">विद्यार्थी स्कोर रिपोर्ट</h1>
                <div className="search-box">
                    <input type="text" value={fccId} onChange={(e) => setFccId(e.target.value)} onKeyPress={handleKeyPress} placeholder="छात्र का FCC ID दर्ज करें..." className="search-input" />
                    <button onClick={handleSearch} disabled={loading} className="search-button"> <FontAwesomeIcon icon={faSearch} /> {loading ? 'खोज रहा है...' : 'खोजें'} </button>
                </div>

                {error && <p className="error-message">{error}</p>}
                {loading && <p className="loading-message">डेटा लोड हो रहा है...</p>}
                
                {Object.keys(groupedData).length > 0 && studentInfo && !error && (
                    <div className="results-section">
                        <div className="student-info-header">
                            <h2><FontAwesomeIcon icon={faUser} /> {studentInfo.name}</h2>
                            <span className="class-badge">क्लास: {studentInfo.fcc_class}</span>
                        </div>
                        <div className="summary-box">
                            <div className="summary-item"> <FontAwesomeIcon icon={faCalendarAlt} /> <span>माह</span> <strong>{currentMonthInfo}</strong> </div>
                            <div className="summary-item"> <FontAwesomeIcon icon={faStar} /> <span>कुल अंक</span> <strong className="total-score">{totalScore}</strong> </div>
                        </div>
                        <div className="table-responsive">
                            <table>
                                <thead>
                                    <tr>
                                        <th>तारीख</th>
                                        <th>कार्य का नाम</th>
                                        <th>प्राप्त अंक</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(groupedData).map(([date, records]) => {
                                        if (records.length === 1 && records[0].task_name === 'Absent') {
                                            return (
                                                <tr key={date} className="absent-row">
                                                    <td className="date-cell"><strong>{date}</strong></td>
                                                    <td className="task-cell">अनुपस्थित (Absent)</td>
                                                    <td className="score-cell">0</td>
                                                </tr>
                                            );
                                        }
                                        return (
                                            <React.Fragment key={date}>
                                                <tr>
                                                    <td rowSpan={records.length} className="date-cell">
                                                        <strong>{date}</strong>
                                                    </td>
                                                    <td className={records[0].task_name.toLowerCase().includes('attendance') ? 'task-cell-attendance' : 'task-cell'}>
                                                        {records[0].task_name}
                                                    </td>
                                                    <td className={records[0].task_name.toLowerCase().includes('attendance') ? 'score-cell-attendance' : 'score-cell'}>
                                                        {records[0].score}
                                                    </td>
                                                </tr>
                                                {records.slice(1).map((record, index) => (
                                                    <tr key={`${date}-${index}`}>
                                                        <td className={record.task_name.toLowerCase().includes('attendance') ? 'task-cell-attendance' : 'task-cell'}>
                                                            {record.task_name}
                                                        </td>
                                                        <td className={record.task_name.toLowerCase().includes('attendance') ? 'score-cell-attendance' : 'score-cell'}>
                                                            {record.score}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentReport;