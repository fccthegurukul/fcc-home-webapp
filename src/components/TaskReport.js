import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../utils/supabaseClient';
import '../styles/taskReport.css';

// --- Chart.js और उसके रैपर को इम्पोर्ट करें ---
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

// --- Chart.js के ज़रूरी हिस्सों को रजिस्टर करें ---
ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend
);

// --- विषय पहचानने का मैप ---
const SUBJECT_MAP = {
  'Science': ['विज्ञान', 'साइंस', 'saayans', 'sains', 'vigyan', 'vgyan', 'saayns', 'bijgyan', 'bigyan', 'vigyaan', 'biology', 'बायोलॉजी', 'boilogy', 'biolgy', 'bio', 'biologie', 'baayoloji', 'baayolaji', 'bayoloji', 'बायोलजी', 'physics', 'भौतिकी', 'फिजिक्स', 'phsics', 'phisics', 'fiziks', 'fysics', 'bhautiki', 'bhotiki', 'bhoutiki', 'chemistry', 'रसायन', 'chem', 'kemistry', 'camistry', 'rasayan', 'chemisty', 'kimistry', 'rasyan'],
  'Social Science': ['social science', 'सामाजिक विज्ञान', 'social', 'samajik vigyan', 'sochal science', 'soxial science', 'samaj science', 'samajik', 'samyik vgyan', 'history', 'इतिहास', 'itihas', 'hstree', 'itihasa', 'history subject', 'geography', 'भूगोल', 'bhoogol', 'bhoogal', 'geografi', 'jio', 'bhugol', 'civics', 'नागरिक शास्त्र', 'nagrik shastra', 'nagri shastra', 'political science', 'राजनीति शास्त्र', 'rajneeti', 'polity', 'poli sci', 'economics', 'अर्थशास्त्र', 'arthshastra', 'economy', 'economic', 'arthshastr', 'eco', 'econ', 'arthvyavastha'],
  'Hindi, Math & English': ['hindi', 'हिंदी', 'hindee', 'hind', 'hindhi', 'hindi grammar', 'hindee vyakaran', 'hindee sahitya', 'writing', 'रेटिंग', 'राइटिंग', 'math', 'गणित', 'maths', 'mathematics', 'ganit', 'gnt', 'gnit', 'maaths', 'mathe', 'maath', 'mathamatics', 'ganith', 'english', 'अंग्रेजी', 'angrezi', 'eng', 'inglish', 'englsh', 'angreji', 'angrejji']
};

const getSubjectFromTaskName = (taskName) => {
  if (!taskName) return 'Other';
  const name = taskName.toLowerCase().trim();
  for (const [standardName, keywords] of Object.entries(SUBJECT_MAP)) {
    for (const keyword of keywords) { if (name.includes(keyword.toLowerCase())) return standardName; }
  }
  return 'Other';
};

const TaskReport = () => {
  // --- स्टेट्स ---
  const [fccId, setFccId] = useState('');
  const [taskData, setTaskData] = useState([]);
  const [studentInfo, setStudentInfo] = useState(null);
  const [hideTaskName, setHideTaskName] = useState(false);
  const [hideDescription, setHideDescription] = useState(false);
  const [monthYear, setMonthYear] = useState(() => new Date().toISOString().slice(0, 7));
  const printRef = useRef(null);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // --- हेल्पर फंक्शन्स ---
  const handleSubjectChange = (subject) => setSelectedSubjects(prev => prev.includes(subject) ? prev.filter(s => s !== subject) : [...prev, subject]);
  const getDatesInRange = (start, end) => { const date = new Date(start); const dates = []; while (date <= end) { dates.push(new Date(date)); date.setDate(date.getDate() + 1); } return dates; };
  const getStatusIcon = (score, isAbsent, isNotSubmitted) => { if (isAbsent || isNotSubmitted) return '❌'; if (score >= 80) return '✅'; if (score >= 51) return '🟡'; return '❌'; };

  // --- डेटा लाने का फंक्शन ---
  const fetchData = async () => {
    if (!fccId) return;
    setTaskData([]);
    setStudentInfo(null);
    setAvailableSubjects([]);
    setSelectedSubjects([]);
    setShowAdvanced(false);

    const { data: student } = await supabase.from('new_student_admission').select('name, father, schooling_class, fcc_class, mobile_number').eq('fcc_id', fccId).single();
    setStudentInfo(student);

    const [year, month] = monthYear.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const today = new Date();
    const endDate = lastDay < today ? lastDay : today;
    const firstDayStr = firstDay.toISOString().split('T')[0];
    const endDayStr = endDate.toISOString().split('T')[0];

    const { data: leaderboardData } = await supabase.from('leaderboard').select('submission_date, task_name, score').eq('fcc_id', fccId).gte('submission_date', firstDayStr).lte('submission_date', endDayStr).not('task_name', 'ilike', '%Attendance%').order('submission_date', { ascending: true });
    
    if (!leaderboardData) return;
    
    const { data: taskDescriptions } = await supabase.from('leaderboard_scoring_task').select('task_name, description');
    const enrichedData = leaderboardData.map((task) => ({...task, description: taskDescriptions.find(t => t.task_name.trim().toLowerCase() === task.task_name.trim().toLowerCase())?.description || 'N/A', isAbsent: false, subject: getSubjectFromTaskName(task.task_name)}));
    const subjects = [...new Set(enrichedData.map(task => task.subject))];
    setAvailableSubjects(subjects.sort());

    const dataMap = enrichedData.reduce((acc, item) => { const dateKey = item.submission_date; if (!acc[dateKey]) acc[dateKey] = []; acc[dateKey].push(item); return acc; }, {});

    const allDates = getDatesInRange(firstDay, endDate);
    const fullData = [];
    allDates.forEach((d) => {
      const dateStr = d.toISOString().split('T')[0];
      if (dataMap[dateStr] && dataMap[dateStr].length > 0) {
        fullData.push(...dataMap[dateStr]);
      } else {
        fullData.push({ submission_date: dateStr, task_name: 'Absent', description: 'Student was absent', score: 0, isAbsent: true, subject: 'Absent' });
      }
    });
    setTaskData(fullData);
  };

  useEffect(() => { if (fccId) fetchData(); }, [fccId, monthYear]);
  
  // --- नया और बेहतर प्रिंट फंक्शन ---
  const handlePrint = () => {
    const printContent = printRef.current; if (!printContent) return;
    const newWindow = window.open('', '_blank', 'width=1200,height=800');
    if (!newWindow) {
      alert("Please allow popups for this site to print the report.");
      return;
    }
    newWindow.document.write('<html><head><title>Print Report</title>');
    Array.from(document.styleSheets).forEach(styleSheet => {
        try {
            const cssRules = Array.from(styleSheet.cssRules).map(rule => rule.cssText).join('');
            newWindow.document.write(`<style>${cssRules}</style>`);
        } catch (e) { console.log('Could not read stylesheet:', e); }
    });
    newWindow.document.write('</head><body>');
    newWindow.document.write(printContent.innerHTML);
    newWindow.document.write('</body></html>');
    newWindow.document.close();
    newWindow.onload = () => { newWindow.focus(); newWindow.print(); newWindow.onafterprint = () => newWindow.close(); };
  };
  
  const getProcessedTasks = () => { if (selectedSubjects.length === 0) return taskData; const processed = []; const attendedDates = [...new Set(taskData.filter(t => !t.isAbsent).map(t => t.submission_date))]; attendedDates.forEach(date => { const tasksOnDate = taskData.filter(t => t.submission_date === date); const submittedSubjectsOnDate = tasksOnDate.map(t => t.subject); selectedSubjects.forEach(subject => { if (submittedSubjectsOnDate.includes(subject)) { processed.push(...tasksOnDate.filter(t => t.subject === subject)); } else { processed.push({ submission_date: date, task_name: 'Task Not Submitted', description: `No submission for ${subject}`, score: 0, isAbsent: false, isNotSubmitted: true, subject: subject }); } }); }); const absentDays = taskData.filter(t => t.isAbsent); processed.push(...absentDays); return processed.sort((a, b) => new Date(a.submission_date) - new Date(b.submission_date)); };
  
  const displayedTasks = getProcessedTasks();

  const { calculatedTasks, totalScore, summary, performanceAvgScore, totalDaysInPeriod, absentDaysCount, attendedDaysCount, monthlyAvgScore, attendancePercentage, notSubmittedCount, subjectPerformanceSummary, analysisData } = useMemo(() => {
    const calculatedTasks = taskData.filter(task => !task.isAbsent && (selectedSubjects.length === 0 || selectedSubjects.includes(task.subject)));
    const totalScore = calculatedTasks.reduce((sum, item) => sum + item.score, 0);
    const attendedTasksCount = calculatedTasks.length;
    const performanceAvgScore = attendedTasksCount > 0 ? (totalScore / attendedTasksCount) : 0;
    const summary = calculatedTasks.reduce((acc, t) => { if (t.score >= 80) acc.high += 1; else if (t.score >= 51) acc.mid += 1; else acc.low += 1; return acc; }, { high: 0, mid: 0, low: 0 });
    const totalDaysInPeriod = new Set(taskData.map(t => t.submission_date)).size;
    const absentDaysCount = taskData.filter(t => t.isAbsent).length;
    const attendedDaysCount = totalDaysInPeriod - absentDaysCount;
    const monthlyAvgScore = totalDaysInPeriod > 0 ? (taskData.reduce((sum, item) => sum + item.score, 0) / totalDaysInPeriod) : 0;
    const attendancePercentage = totalDaysInPeriod > 0 ? ((attendedDaysCount / totalDaysInPeriod) * 100) : 0;
    const notSubmittedCount = displayedTasks.filter(t => t.isNotSubmitted).length;
    const subjectPerformance = calculatedTasks.reduce((acc, task) => { if (!acc[task.subject]) acc[task.subject] = { totalScore: 0, count: 0 }; acc[task.subject].totalScore += task.score; acc[task.subject].count += 1; return acc; }, {});
    const subjectPerformanceSummary = Object.entries(subjectPerformance).map(([subject, data]) => ({ subject, count: data.count, average: (data.totalScore / data.count) }));
    
    // --- नए एनालिसिस डेटा की गणना ---
    const scores = calculatedTasks.map(t => t.score);
    const mean = performanceAvgScore;
    const stdDev = attendedTasksCount > 1 ? Math.sqrt(scores.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / (attendedTasksCount - 1)) : 0;

    const getGrade = (score) => {
        if (score >= 90) return 'A+ (उत्कृष्ट)';
        if (score >= 80) return 'A (बहुत अच्छा)';
        if (score >= 70) return 'B (अच्छा)';
        if (score >= 60) return 'C (संतोषजनक)';
        if (score >= 50) return 'D (सुधार की आवश्यकता)';
        return 'E (असंतोषजनक)';
    };

    const sortedSubjects = [...subjectPerformanceSummary].sort((a, b) => b.average - a.average);
    const bestSubject = sortedSubjects.length > 0 ? sortedSubjects[0] : null;
    const worstSubject = sortedSubjects.length > 0 ? sortedSubjects[sortedSubjects.length - 1] : null;

    const analysisData = {
        performanceAvgScore: performanceAvgScore.toFixed(1),
        overallGrade: getGrade(performanceAvgScore),
        attendancePercentage: attendancePercentage.toFixed(1),
        stdDev: stdDev.toFixed(1),
        bestSubject: bestSubject,
        worstSubject: (bestSubject && worstSubject && bestSubject.subject !== worstSubject.subject) ? worstSubject : null
    };

    return { calculatedTasks, totalScore, summary, performanceAvgScore: performanceAvgScore.toFixed(1), totalDaysInPeriod, absentDaysCount, attendedDaysCount, monthlyAvgScore: monthlyAvgScore.toFixed(1), attendancePercentage: attendancePercentage.toFixed(1), notSubmittedCount, subjectPerformanceSummary, analysisData };
  }, [taskData, selectedSubjects, displayedTasks]);

  const chartData = useMemo(() => {
    const dailyScores = {};
    taskData.forEach(task => { if (!dailyScores[task.submission_date]) { dailyScores[task.submission_date] = { total: 0, count: 0, isAbsent: task.isAbsent }; } if (!task.isAbsent) { dailyScores[task.submission_date].total += task.score; dailyScores[task.submission_date].count++; } });
    const lineChartLabels = Object.keys(dailyScores).map(date => new Date(date).toLocaleDateString('en-GB', {day: '2-digit', month: 'short'}));
    const lineChartDataPoints = Object.values(dailyScores).map(day => day.isAbsent ? null : (day.count > 0 ? day.total / day.count : null));
    const lineChart = { labels: lineChartLabels, datasets: [{ label: 'Daily Average Score', data: lineChartDataPoints, borderColor: 'rgb(75, 192, 192)', backgroundColor: 'rgba(75, 192, 192, 0.5)', fill: true, tension: 0.3, spanGaps: true, }]};
    const barChart = { labels: subjectPerformanceSummary.map(s => s.subject), datasets: [{ label: 'Average Score by Subject', data: subjectPerformanceSummary.map(s => s.average.toFixed(1)), backgroundColor: ['rgba(255, 99, 132, 0.6)', 'rgba(54, 162, 235, 0.6)', 'rgba(255, 206, 86, 0.6)', 'rgba(75, 192, 192, 0.6)', 'rgba(153, 102, 255, 0.6)'], }]};
    const doughnutChart = { labels: ['✅ High (80+)', '🟡 Mid (51-79)', '❌ Low (<50)'], datasets: [{ data: [summary.high, summary.mid, summary.low], backgroundColor: ['rgba(40, 167, 69, 0.8)', 'rgba(255, 193, 7, 0.8)', 'rgba(220, 53, 69, 0.8)'], borderColor: ['#ffffff'], borderWidth: 2, }]};
    return { lineChart, barChart, doughnutChart };
  }, [taskData, subjectPerformanceSummary, summary]);
  
  let colSpanForTotal = 1;
  if (!hideTaskName) colSpanForTotal++;
  if (!hideDescription) colSpanForTotal++;

  return (
    <div className="report-container">
      <div className="control-panel no-print">
        <label htmlFor="month-year">Select Month:</label>
        <input type="month" id="month-year" value={monthYear} onChange={(e) => setMonthYear(e.target.value)} />
        <label htmlFor="fcc-id">Enter FCC ID:</label>
        <input type="text" id="fcc-id" value={fccId} onChange={(e) => setFccId(e.target.value)} placeholder="Enter FCC ID" />
        <button onClick={fetchData}>Fetch Report</button>
        <button onClick={handlePrint}>Print Report</button>
        <div className="filters">
          <label><input type="checkbox" checked={hideTaskName} onChange={() => setHideTaskName(!hideTaskName)} /> Hide Task Name</label>
          <label><input type="checkbox" checked={hideDescription} onChange={() => setHideDescription(!hideDescription)} /> Hide Description</label>
          <label><input type="checkbox" checked={showAdvanced} onChange={() => setShowAdvanced(!showAdvanced)} /> Show Advanced Analysis</label>
        </div>
      </div>
      
      {availableSubjects.length > 0 && (
        <div className="subject-filter-panel no-print">
          <strong>Filter by Subjects:</strong>
          <div className="subject-checkboxes">
            {availableSubjects.map(subject => ( <label key={subject} className="subject-checkbox-label"> <input type="checkbox" checked={selectedSubjects.includes(subject)} onChange={() => handleSubjectChange(subject)} /> {subject} </label> ))}
          </div>
          <button onClick={() => setSelectedSubjects([])} className="clear-filter-btn">Clear All Filters</button>
        </div>
      )}

      <div ref={printRef} className="print-area">
        <div className="header-card">
          <div className="print-header">
            <h1 className="branding-header">FCC THE GURUKUL</h1>
            <p className="report-contact">Motisabad, Mugaon - 802126 | Mob: 9135365331</p>
            {fccId && studentInfo && (
              <div className="student-grid">
                <div><strong>FCC ID:</strong> {fccId}</div>
                <div><strong>Month:</strong> {new Date(`${monthYear}-01`).toLocaleString('default', { month: 'long', year: 'numeric' })}</div>
                <div><strong>Name:</strong> {studentInfo.name}</div>
                <div><strong>Father:</strong> {studentInfo.father}</div>
                <div><strong>Schooling Class:</strong> {studentInfo.schooling_class}</div>
                <div><strong>FCC Class:</strong> {studentInfo.fcc_class}</div>
                <div style={{ gridColumn: 'span 2' }}><strong>Mobile:</strong> {studentInfo.mobile_number}</div>
              </div>
            )}
          </div>
        </div>
        
        <table className="report-table">
          <thead>
            <tr>
              <th className="col-date">Date</th>
              {!hideTaskName && <th className="col-task">Task Name</th>}
              {!hideDescription && <th className="col-desc">Description</th>}
              <th className="col-score">Score</th>
              <th className="col-status">Status</th>
            </tr>
          </thead>
          <tbody>
            {displayedTasks.map((task, index) => {
              const showDate = index === 0 || task.submission_date !== displayedTasks[index - 1]?.submission_date;
              const rowClass = task.isAbsent ? 'absent-row' : task.isNotSubmitted ? 'not-submitted-row' : '';
              return (
                <tr key={`${task.submission_date}-${index}-${task.task_name}-${task.subject}`} className={rowClass}>
                  <td>{showDate ? new Date(task.submission_date).toLocaleDateString('en-GB') : ''}</td>
                  {!hideTaskName && <td>{task.task_name}</td>}
                  {!hideDescription && <td>{task.description}</td>}
                  <td>{task.isAbsent || task.isNotSubmitted ? '-' : task.score}</td>
                  <td>{getStatusIcon(task.score, task.isAbsent, task.isNotSubmitted)}</td>
                </tr>
              );
            })}
             {taskData.length > 0 && displayedTasks.length === 0 && ( <tr> <td colSpan={colSpanForTotal + 2} style={{ textAlign: 'center', padding: '20px' }}>No tasks found for the selected filters.</td> </tr> )}
             {taskData.length === 0 && fccId && ( <tr> <td colSpan={colSpanForTotal + 2} style={{ textAlign: 'center', padding: '20px' }}>No data found for FCC ID {fccId} in the selected month.</td> </tr> )}
          </tbody>
          {displayedTasks.length > 0 && !taskData.every(t => t.isAbsent) && (
            <tfoot> <tr> <td colSpan={colSpanForTotal}><strong>Total Score</strong></td> <td><strong>{totalScore}</strong></td> <td /> </tr> </tfoot>
          )}
        </table>

        {fccId && taskData.length > 0 && (
          <>
              <div className="report-footer">
                  <div className="footer-line"></div>
                  <p>यह रिपोर्ट हमारे पारदर्शी और डेटा-आधारित शिक्षण दृष्टिकोण का एक उदाहरण है। हम प्रत्येक छात्र की व्यक्तिगत प्रगति पर ध्यान केंद्रित करते हैं ताकि वे अपनी पूरी क्षमता तक पहुंच सकें।</p>
                  <p><strong>FCC The Gurukul</strong> - एक बेहतर भविष्य की ओर पहला कदम।</p>
                </div>
            {showAdvanced && (
              <>
                       <div className="summary-grid">
              <div><strong>✅ High (80+):</strong> {summary.high}</div>
              <div><strong>🟡 Mid (51–79):</strong> {summary.mid}</div>
              <div><strong>❌ Low (&lt;50):</strong> {summary.low}</div>
              <div><strong>Performance Average (on attended days):</strong> {performanceAvgScore}%</div>
            </div>

                <div className="advanced-summary-section">
                  <h3 className="advanced-summary-header">Advanced Performance Analysis</h3>
                  <div className="advanced-summary-grid">
                    <div><strong>Total Days in Period:</strong> {totalDaysInPeriod}</div>
                    <div><strong>Attended Days:</strong> {attendedDaysCount}</div>
                    <div><strong>Absent Days:</strong> {absentDaysCount}</div>
                    <div><strong>Attendance:</strong> {attendancePercentage}%</div>
                    <div style={{fontWeight: 'bold'}}><strong>Monthly Average (inc. absent):</strong> {monthlyAvgScore}%</div>
                    {selectedSubjects.length > 0 && <div><strong>Tasks Not Submitted:</strong> {notSubmittedCount}</div>}
                  </div>
                  
                  <div className="charts-container">
                    <div className="chart-wrapper">
                      <h4>Daily Performance Trend</h4>
                      <Line options={{ responsive: true, plugins: { title: { display: false } } }} data={chartData.lineChart} />
                    </div>
                    <div className="chart-wrapper">
                      <h4>Score Distribution</h4>
                      {summary.high + summary.mid + summary.low > 0 ? (
                          <Doughnut options={{ responsive: true, plugins: { title: { display: false }, legend: { position: 'top' } } }} data={chartData.doughnutChart} />
                      ) : <p style={{textAlign: 'center'}}>No task data to display.</p>}
                    </div>
                     {subjectPerformanceSummary.length > 0 && (
                      <div className="chart-wrapper" style={{gridColumn: '1 / -1'}}>
                          <h4>Subject-wise Performance (Average Score)</h4>
                          <Bar options={{ responsive: true, indexAxis: 'y', plugins: { title: { display: false } } }} data={chartData.barChart} />
                      </div>
                    )}
                  </div>
                </div>

                {/* --- नया और बेहतर विस्तृत विश्लेषण सेक्शन --- */}
                <div className="report-analysis-section">
                  <div className="analysis-title-container">
                      <div className="title-bar"></div>
                      <h3>विस्तृत विश्लेषण और सुझाव</h3>
                  </div>
                  
                  <div className="analysis-card">
                      <h4>Overall Summary & Grade</h4>
                      <p>
                          इस महीने के प्रदर्शन के आधार पर, छात्र का औसत प्रदर्शन {analysisData.performanceAvgScore}% रहा है, जिसके लिए उन्हें "{analysisData.overallGrade}" ग्रेड दिया जाता है।
                      </p>
                  </div>

                  <div className="analysis-card">
                      <h4>प्रमुख अवलोकन (Key Observations)</h4>
                      <div className="observations-grid">
                          <div className="observation-row">
                              <div className="observation-label">उपस्थिति:</div>
                              <div className="observation-value">{analysisData.attendancePercentage}% उपस्थिति</div>
                              <div className="observation-desc">{analysisData.attendancePercentage < 80 ? 'नियमित उपस्थिति पर ध्यान देने की तत्काल आवश्यकता है।' : 'यह एक अच्छी उपस्थिति दर है, इसे बनाए रखें।'}</div>
                          </div>
                          <div className="observation-row">
                              <div className="observation-label">प्रदर्शन में स्थिरता:</div>
                              <div className="observation-value">प्रदर्शन में {analysisData.stdDev} उतार-चढ़ाव (Std. Dev)</div>
                              <div className="observation-desc">{analysisData.stdDev > 20 ? 'प्रदर्शन में काफी अस्थिरता है, कुछ दिनों में बहुत अच्छा और कुछ में बहुत खराब प्रदर्शन हो रहा है।' : 'प्रदर्शन काफी स्थिर और भरोसेमंद है, जो एक सकारात्मक संकेत है।'}</div>
                          </div>
                          {analysisData.bestSubject && 
                          <div className="observation-row">
                              <div className="observation-label">सबसे मज़बूत विषय:</div>
                              <div className="observation-value">{analysisData.bestSubject.subject}</div>
                              <div className="observation-desc">(औसत स्कोर: {analysisData.bestSubject.average.toFixed(1)}%) में छात्र का प्रदर्शन सबसे सराहनीय रहा है।</div>
                          </div>
                          }
                      </div>
                  </div>

                  <div className="analysis-card">
                      <h4>शिक्षक/अभिभावक के लिए सुझाव</h4>
                      <p>
                          {analysisData.attendancePercentage < 80 ? 'सबसे पहले, कृपया छात्र की नियमित उपस्थिति सुनिश्चित करें। अनुपस्थिति सीखने की प्रक्रिया में सबसे बड़ी बाधा है। ' : 'छात्र की नियमित उपस्थिति सराहनीय है, यह उनकी सीखने की इच्छा को दर्शाता है। '}
                          {analysisData.worstSubject ? `खास तौर पर, '${analysisData.worstSubject.subject}' विषय पर ध्यान केंद्रित करें। इस विषय की अवधारणाओं को फिर से दोहराने और अतिरिक्त अभ्यास करने से लाभ होगा। ` : ''}
                          {analysisData.stdDev > 20 ? 'प्रदर्शन में स्थिरता लाने के लिए एक नियमित अध्ययन दिनचर्या बनाने पर काम करें। ' : ''}
                          {analysisData.performanceAvgScore < 60 ? 'अवधारणाओं की समझ को मज़बूत करने के लिए शिक्षक से अतिरिक्त सहायता लेने पर विचार करें। ' : 'समग्र प्रदर्शन अच्छा है, इसे और बेहतर बनाने के लिए नियमित अभ्यास जारी रखें।'}
                      </p>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TaskReport;