import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '../utils/supabaseClient'; // Path को सही करें
import '../styles/TaskReportDynamic.css'; // आपकी CSS फ़ाइल

// Chart.js imports
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Export/Download library imports
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const TaskReportDynamic = () => {
    // --- State Management ---
    const [loading, setLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [error, setError] = useState('');
    
    // Filters State
    const [availableClasses, setAvailableClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().setDate(1)).toISOString().slice(0, 10),
        end: new Date().toISOString().slice(0, 10),
    });
    
    // Report Data State
    const [reportData, setReportData] = useState(null);
    const [taskInfo, setTaskInfo] = useState({});

    // Ref for PDF download
    const reportRef = useRef();

    // --- Initial Data Fetch: Get available classes ---
    useEffect(() => {
        const fetchClasses = async () => {
            const { data, error } = await supabase.from('leaderboard').select('fcc_class', { count: 'exact' });
            if (error) { console.error('Error fetching classes:', error); return; }
            const uniqueClasses = [...new Set(data.map(item => item.fcc_class).filter(Boolean))].sort();
            setAvailableClasses(uniqueClasses);
        };
        fetchClasses();
    }, []);

    // --- Main Function to Generate Report ---
    const handleGenerateReport = useCallback(async () => {
        if (!selectedClass) { setError('Please select a class.'); return; }
        
        setLoading(true);
        setError('');
        setReportData(null);

        try {
            // Step 1: Fetch submissions for the class and date range
            const { data: submissions, error: subErr } = await supabase
                .from('leaderboard')
                .select('fcc_id, task_name, score')
                .eq('fcc_class', selectedClass)
                .gte('submission_date', dateRange.start)
                .lte('submission_date', dateRange.end)
                .not('task_name', 'ilike', '%Attendance%');

            if (subErr) throw subErr;
            if (submissions.length === 0) throw new Error('No task submissions found for the selected criteria.');

            const studentIds = [...new Set(submissions.map(s => s.fcc_id))];
            const uniqueTaskNames = [...new Set(submissions.map(s => s.task_name))].sort();

            // Step 2: Fetch task descriptions and other info
            const { data: descData, error: descErr } = await supabase
                .from('leaderboard_scoring_task')
                .select('task_name, description, max_score')
                .in('task_name', uniqueTaskNames);
                
            if (descErr) console.warn("Could not fetch task descriptions.");
            
            const taskInfoMap = (descData || []).reduce((acc, task) => {
                acc[task.task_name] = {
                    description: task.description || "N/A",
                    max_score: task.max_score || 100 // Default max score
                };
                return acc;
            }, {});
            setTaskInfo(taskInfoMap);

            // Step 3: Fetch student names
            const { data: studentsInfo, error: stuErr } = await supabase.from('new_student_admission').select('fcc_id, name').in('fcc_id', studentIds);
            if (stuErr) throw stuErr;
            const studentNameMap = studentsInfo.reduce((acc, stu) => ({...acc, [stu.fcc_id]: stu.name}), {});

            // Step 4: Process data for each student
            const processedData = studentIds.map(fcc_id => {
                const studentSubs = submissions.filter(s => s.fcc_id === fcc_id);
                let totalScore = 0;
                
                const scores = uniqueTaskNames.reduce((acc, taskName) => {
                    const submission = studentSubs.find(s => s.task_name === taskName);
                    if (submission) {
                        totalScore += submission.score;
                    }
                    acc[taskName] = submission ? submission.score : null;
                    return acc;
                }, {});

                const tasksAttempted = studentSubs.length;
                return {
                    fcc_id,
                    name: studentNameMap[fcc_id] || fcc_id, // Fallback to ID if name not found
                    scores,
                    totalScore,
                    // Average calculation based on tasks attempted by the student
                    averageScore: tasksAttempted > 0 ? (totalScore / tasksAttempted) : 0,
                };
            }).sort((a, b) => b.averageScore - a.averageScore);

            setReportData({
                tasks: uniqueTaskNames,
                students: processedData,
            });

        } catch (err) {
            console.error('Error generating report:', err);
            setError(err.message || 'An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    }, [selectedClass, dateRange]);
    
    // --- Advanced Export to Excel Function ---
    const handleExportToExcel = useCallback(() => {
        if (!reportData) return;
        setIsDownloading(true);

        try {
            // Sheet 1: Detailed Report (The main requirement)
            const header = ["Student Name", "FCC ID"];
            // Dynamically create a header for each task: [Task Name, Task Description, Score]
            reportData.tasks.forEach(taskName => {
                header.push(taskName, "Description", "Score");
            });
            header.push("Total Score", "Average Score (%)");

            // Create data rows for each student
            const dataRows = reportData.students.map(student => {
                const row = [student.name, student.fcc_id];
                reportData.tasks.forEach(taskName => {
                    row.push(
                        taskName,                               // Task Name (Redundant but good for structure)
                        taskInfo[taskName]?.description || "N/A",// Task Description
                        student.scores[taskName] ?? 'N/A'       // Score
                    );
                });
                row.push(student.totalScore, student.averageScore.toFixed(1));
                return row;
            });
            
            const detailedWs = XLSX.utils.aoa_to_sheet([header, ...dataRows]);

            // Auto-fit columns for better readability
            const colWidths = header.map((_, i) => ({ wch: i < 2 ? 20 : (i % 3 === 0 ? 30 : 15) })); // Name, FCC ID, Task, Desc, Score
            detailedWs['!cols'] = colWidths;
            
            // Sheet 2: Summary
            // (Keeping this for a high-level overview)
            const summaryWs = XLSX.utils.aoa_to_sheet([["Summary sheet can be added here if needed."]]);

            // Create workbook and download
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, detailedWs, "Detailed Student Report");
            XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

            XLSX.writeFile(wb, `Class_${selectedClass}_Full_Report.xlsx`);

        } catch(e) {
            console.error(e);
            setError("Failed to create Excel file. Check console for details.");
        } finally {
            setIsDownloading(false);
        }

    }, [reportData, taskInfo, selectedClass]);


    const handleDownloadPDF = useCallback(() => {
        const reportElement = reportRef.current;
        if (!reportElement) return;

        setIsDownloading(true);
        html2canvas(reportElement, { scale: 2, useCORS: true, scrollX: -window.scrollX, scrollY: -window.scrollY, windowWidth: reportElement.scrollWidth, windowHeight: reportElement.scrollHeight })
          .then(canvas => {
             const imgData = canvas.toDataURL('image/png', 1.0);
             const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a2' }); // Larger format for wide tables
             const pdfWidth = pdf.internal.pageSize.getWidth();
             const pdfHeight = pdf.internal.pageSize.getHeight();
             const canvasWidth = canvas.width;
             const canvasHeight = canvas.height;
             const ratio = canvasWidth / canvasHeight;
             const newCanvasWidth = pdfWidth;
             const newCanvasHeight = newCanvasWidth / ratio;
             
             let height = newCanvasHeight > pdfHeight ? pdfHeight : newCanvasHeight;
             
             pdf.addImage(imgData, 'PNG', 0, 0, newCanvasWidth, height);
             pdf.save(`Class_${selectedClass}_Report.pdf`);
          })
          .catch(err => {
              console.error("Failed to generate PDF:", err);
              setError("Could not generate PDF.");
          })
          .finally(() => setIsDownloading(false));
     }, [selectedClass]);

    const getScoreCellClass = (score) => {
        if (score === null) return 'score-cell-no-submission';
        if (score > 80) return 'score-cell-high';
        if (score > 50) return 'score-cell-mid';
        return 'score-cell-low';
    };
    
    // Memoized summary for UI
    const reportSummary = useMemo(() => {
        if (!reportData?.students?.length) return null;
        const { students, tasks } = reportData;
        const totalAverage = students.reduce((sum, s) => sum + s.averageScore, 0) / students.length;
        const taskAverages = tasks.map(name => {
            const scores = students.map(s => s.scores[name]).filter(s => s !== null);
            const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
            return { name, average: avg };
        }).sort((a, b) => a.average - b.average);
        return {
            classAverage: totalAverage.toFixed(1),
            topStudent: students[0],
            hardestTask: taskAverages[0],
            easiestTask: taskAverages[taskAverages.length - 1],
        };
    }, [reportData]);

    return (
        <div className="report-dynamic-container">
            <h1>Dynamic Class Performance Report</h1>
            <div className="report-controls">
                <div className='control-filters'>
                     <div className="control-group">
                        <label>Select Class</label>
                        <select value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setReportData(null); }}>
                            <option value="" disabled>-- Choose a class --</option>
                            {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div className="control-group">
                        <label>Start Date</label>
                        <input type="date" value={dateRange.start} onChange={e => setDateRange(prev => ({...prev, start: e.target.value}))}/>
                    </div>
                    <div className="control-group">
                        <label>End Date</label>
                        <input type="date" value={dateRange.end} onChange={e => setDateRange(prev => ({...prev, end: e.target.value}))}/>
                    </div>
                     <div className="control-group">
                        <label> </label>
                        <button onClick={handleGenerateReport} disabled={loading || !selectedClass}>
                            {loading ? 'Generating...' : 'Generate Report'}
                        </button>
                    </div>
                </div>

                <div className="control-actions">
                    <button onClick={handleExportToExcel} disabled={!reportData || isDownloading} className="download-btn">
                        {isDownloading ? '...' : 'Export Full Excel'}
                    </button>
                    <button onClick={handleDownloadPDF} disabled={!reportData || isDownloading} className="download-btn">
                        {isDownloading ? '...' : 'Download PDF'}
                    </button>
                </div>
            </div>

            {loading && <div className="loading-error-message">Loading report data... Please wait.</div>}
            {error && <div className="loading-error-message" style={{color: '#d9534f'}}>{error}</div>}
            
            {reportData && (
                <div className='results-area' ref={reportRef}>
                    <h2>Report for Class {selectedClass}</h2>
                    <p style={{marginTop: '-15px', color: '#666'}}>Date Range: {dateRange.start} to {dateRange.end}</p>
                    
                    {reportSummary && 
                        <div className="report-summary-cards">
                           <div className="summary-card"><h4>Class Average Score</h4><p className="value">{reportSummary.classAverage}%</p></div>
                           <div className="summary-card"><h4>Top Performer</h4><p className="value">{reportSummary.topStudent.name}</p><p className="context">Avg. Score: {reportSummary.topStudent.averageScore.toFixed(1)}%</p></div>
                           <div className="summary-card" style={{borderColor: '#28a745'}}><h4>Easiest Task</h4><p className="value" style={{color: '#28a745'}}>{reportSummary.easiestTask?.name || 'N/A'}</p><p className="context">Avg: {reportSummary.easiestTask?.average.toFixed(1)}%</p></div>
                           <div className="summary-card" style={{borderColor: '#dc3545'}}><h4>Hardest Task</h4><p className="value" style={{color: '#dc3545'}}>{reportSummary.hardestTask?.name || 'N/A'}</p><p className="context">Avg: {reportSummary.hardestTask?.average.toFixed(1)}%</p></div>
                        </div>
                    }

                    <h3 style={{marginTop: '40px'}}>Detailed Scores</h3>
                    <div className="table-container">
                        <table className="results-table">
                            <thead>
                                <tr>
                                    <th>Student Name</th>
                                    {reportData.tasks.map(taskName => (
                                      <th key={taskName} className='task-header-cell'>
                                          <span className="task-header-name">{taskName}</span>
                                          <span className="task-header-desc">{taskInfo[taskName]?.description || ''}</span>
                                      </th>
                                    ))}
                                    <th>Total Score</th>
                                    <th>Average (%)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportData.students.map(student => (
                                    <tr key={student.fcc_id}>
                                        <td>{student.name}</td>
                                        {reportData.tasks.map(taskName => (
                                            <td key={taskName} className={getScoreCellClass(student.scores[taskName])}>
                                                {student.scores[taskName] ?? '—'}
                                            </td>
                                        ))}
                                        <td><strong>{student.totalScore}</strong></td>
                                        <td><strong>{student.averageScore.toFixed(1)}</strong></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                     
                    <div className="charts-container">
                        <div className="chart-wrapper">
                            <h3>Student Performance Ranking (Average Score)</h3>
                            <Bar options={{ responsive: true, indexAxis: 'y' }} data={{
                                labels: reportData.students.map(s => s.name),
                                datasets: [{
                                    label: 'Student Average Score',
                                    data: reportData.students.map(s => s.averageScore.toFixed(1)),
                                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                                }]
                            }}/>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TaskReportDynamic;