import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient'; // Make sure this path is correct
import './StudentSkillReport.css'; // Importing the final CSS
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronRight, faDownload } from '@fortawesome/free-solid-svg-icons';

const StudentSkillReport = () => {
    const [allStudents, setAllStudents] = useState([]);
    const [filteredStudents, setFilteredStudents] = useState([]);
    const [filterText, setFilterText] = useState('');
    const [selectedStudentId, setSelectedStudentId] = useState('');

    const [reportData, setReportData] = useState(null);
    const [sortedTargets, setSortedTargets] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Using a Set to allow multiple accordions to be open by default
    const [openAccordions, setOpenAccordions] = useState(new Set());

    // Initial load of all students
    useEffect(() => {
        const fetchStudents = async () => {
            const { data, error } = await supabase
                .from('new_student_admission')
                .select('fcc_id, name, fcc_class')
                .order('name');
            
            if (error) console.error("Error fetching students:", error);
            else {
                setAllStudents(data || []);
                setFilteredStudents(data || []);
            }
        };
        fetchStudents();
    }, []);

    // Filter students based on text input
    useEffect(() => {
        if (!filterText) {
            setFilteredStudents(allStudents);
            return;
        }
        const lowercasedFilter = filterText.toLowerCase();
        const filtered = allStudents.filter(student =>
            student.name.toLowerCase().includes(lowercasedFilter) ||
            student.fcc_id.toLowerCase().includes(lowercasedFilter)
        );
        setFilteredStudents(filtered);
    }, [filterText, allStudents]);

    // Generate report when a student is selected
    useEffect(() => {
        if (!selectedStudentId) {
            setReportData(null);
            setSortedTargets([]);
            setOpenAccordions(new Set());
            return;
        }

        const generateReport = async () => {
            setIsLoading(true);
            setError('');
            try {
                const { data, error } = await supabase.rpc('get_student_full_report', {
                    p_student_fcc_id: selectedStudentId
                });

                if (error) throw error;
                setReportData(data);
                
            } catch (err) {
                setError(`Failed to generate report: ${err.message}`);
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        generateReport();
    }, [selectedStudentId]);

    // Process data after fetch: sort targets and set default open accordions
    useEffect(() => {
        if (reportData && reportData.targets) {
            const notStartedIds = new Set();
            
            const sorted = [...reportData.targets].sort((a, b) => {
                const isANotStarted = a.proficiency_level === 'Not Started';
                const isBNotStarted = b.proficiency_level === 'Not Started';
                if (isANotStarted && !isBNotStarted) return -1;
                if (!isANotStarted && isBNotStarted) return 1;
                return 0;
            });

            sorted.forEach(target => {
                if (target.proficiency_level === 'Not Started') {
                    notStartedIds.add(target.target_id);
                }
            });

            setSortedTargets(sorted);
            setOpenAccordions(notStartedIds);
        }
    }, [reportData]);


    const handleAccordionToggle = (targetId) => {
        setOpenAccordions(prevOpen => {
            const newOpen = new Set(prevOpen);
            if (newOpen.has(targetId)) {
                newOpen.delete(targetId);
            } else {
                newOpen.add(targetId);
            }
            return newOpen;
        });
    };

    const handleDownload = () => {
        window.print();
    };
    
    const StatusTag = ({ level }) => (
        <span className={`status ${level?.toLowerCase().replace(/\s/g, '-') || 'unknown'}`}>
            {level || 'N/A'}
        </span>
    );

    return (
        <div className="skill-report-container">
            <h2>STUDENT SKILL REPORT</h2>
            <div className="filter-bar">
                <input
                    type="text"
                    placeholder="Search by Name or FCC ID..."
                    value={filterText}
                    onChange={(e) => {
                        setFilterText(e.target.value);
                        const student = allStudents.find(s => s.fcc_id === e.target.value);
                        if (student) setSelectedStudentId(student.fcc_id);
                    }}
                />
                <select value={selectedStudentId} onChange={e => {
                    setSelectedStudentId(e.target.value);
                    const student = allStudents.find(s => s.fcc_id === e.target.value);
                    setFilterText(student ? student.fcc_id : e.target.value);
                }}>
                    <option value="">-- Choose a Student --</option>
                    {filteredStudents.map(s => <option key={s.fcc_id} value={s.fcc_id}>{s.name} ({s.fcc_id})</option>)}
                </select>
            </div>
            
            {isLoading && <p className="loading-message">Generating Report...</p>}
            {error && <p className="error-message">{error}</p>}

            {reportData && reportData.profile && (
                <div className="report-content-wrapper">
                    <div className="report-header">
                        <div className="student-profile-summary">
                            <div className="student-details">
                                <h3 className="student-name2">{reportData.profile.name}</h3>
                                <p className="student-info">FCC ID: {reportData.profile.fcc_id} | Class: {reportData.profile.fcc_class}</p>
                            </div>
                        </div>
                        <button onClick={handleDownload} className="download-btn">
                            <FontAwesomeIcon icon={faDownload} /> Download Report
                        </button>
                    </div>

                    <div className="accordion-container">
                        {sortedTargets.map(target => {
                            const hasSubTopics = target.sub_topics && target.sub_topics.length > 0;
                            const displayStatus = target.proficiency_level === 'Not Started' && hasSubTopics
                                ? 'Studying'
                                : target.proficiency_level;
                            const isAccordionOpen = openAccordions.has(target.target_id);

                            return (
                                <div className="accordion-item" key={target.target_id}>
                                    <div className="accordion-title" onClick={() => handleAccordionToggle(target.target_id)}>
                                        <span className="target-name">{target.target_name} ({target.subject})</span>
                                        <div className="status-and-arrow">
                                            <StatusTag level={displayStatus} />
                                            <FontAwesomeIcon
                                                icon={faChevronRight}
                                                className={`accordion-arrow ${isAccordionOpen ? 'open' : ''}`}
                                            />
                                        </div>
                                    </div>
                                    <div className="accordion-content" style={{maxHeight: isAccordionOpen ? '1000px' : '0'}}>
                                        <div className="content-section">
                                            <h4>Sub-Topics Covered</h4>
                                            {hasSubTopics ? (
                                                <ul className="subtopic-list">
                                                    {target.sub_topics.map((sub, index) => (
                                                        <li key={index}>
                                                            <span className="subtopic-arrow">»</span>
                                                            <div>
                                                                {sub.sub_topic} - 
                                                                {sub.proficiency_level?.includes('Missed') 
                                                                    ? <span className="status-missed"> {sub.proficiency_level}</span>
                                                                    : <span> {sub.proficiency_level}</span>
                                                                }
                                                            </div>
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : <p>No sub-topics covered yet.</p>}
                                        </div>
                                        <div className="content-section">
                                            <h4>Related Tests & Performance</h4>
                                            {target.tests && target.tests.length > 0 ? (
                                                 <ul className="test-list">
                                                     {target.tests.map(test => (
                                                         <li key={test.test_id}>
                                                             <span className="test-icon"></span>
                                                             <div className="test-details">
                                                                {test.test_name}: 
                                                                <strong> {test.score_obtained} / {test.max_marks} </strong>
                                                                (<StatusTag level={test.proficiency_tag} />)
                                                             </div>
                                                         </li>
                                                     ))}
                                                 </ul>
                                            ) : <p>No tests conducted for this chapter yet.</p>}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentSkillReport;