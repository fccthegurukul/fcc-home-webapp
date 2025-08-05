import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient'; // Path ko check karein

const GradeTest = ({ user }) => {
    const [endedTests, setEndedTests] = useState([]);
    const [selectedTestId, setSelectedTestId] = useState('');
    const [participants, setParticipants] = useState([]);
    const [grades, setGrades] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    // Fetch tests that have ended and need grading
    useEffect(() => {
        const fetchEndedTests = async () => {
            const { data, error } = await supabase
                .from('tests')
                .select('id, test_name')
                .eq('status', 'Ended')
                .eq('created_by_teacher_id', user.teacher_id);
            if (!error) setEndedTests(data || []);
        };
        fetchEndedTests();
    }, [user]);

    // Fetch participants for the selected test
    useEffect(() => {
        if (!selectedTestId) {
            setParticipants([]);
            return;
        }

        const fetchParticipants = async () => {
            const { data, error } = await supabase
                .from('test_participants')
                .select(`
                    student_fcc_id,
                    new_student_admission(name)
                `)
                .eq('test_id', selectedTestId)
                .eq('is_present', true);

            if (!error && data) {
                setParticipants(data);
                // Initialize grades state
                setGrades(data.map(p => ({
                    fcc_id: p.student_fcc_id,
                    score: '',
                    remarks: '',
                    tag: 'Beginner' // Default tag
                })));
            }
        };

        fetchParticipants();
    }, [selectedTestId]);
    
    const handleGradeChange = (fcc_id, field, value) => {
        setGrades(prev => prev.map(grade => 
            grade.fcc_id === fcc_id ? { ...grade, [field]: value } : grade
        ));
    };

    const handleSaveGrades = async () => {
        setIsLoading(true);
        setMessage({text: '', type: ''});

        // Validation
        if (grades.some(g => g.score === '')) {
            setMessage({text: "Please enter a score for all students.", type: 'error'});
            setIsLoading(false);
            return;
        }

        try {
            const { error } = await supabase.rpc('grade_test_and_update_skills', {
                p_test_id: parseInt(selectedTestId),
                p_grades: grades
            });

            if (error) throw error;
            
            setMessage({text: "Grades saved and skills updated successfully!", type: "success"});
            setSelectedTestId('');
            setParticipants([]);
            setGrades([]);
            // Refresh ended tests list
             const { data, error:fetchErr } = await supabase.from('tests').select('id, test_name').eq('status', 'Ended').eq('created_by_teacher_id', user.teacher_id);
            if (!fetchErr) setEndedTests(data || []);

        } catch (error) {
            setMessage({text: `Error saving grades: ${error.message}`, type: 'error'});
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <div>
            <h2>Grade Tests</h2>
            {message.text && <p className={`message ${message.type}`}>{message.text}</p>}

            <div className="form-group">
                <label>Select Test to Grade</label>
                <select value={selectedTestId} onChange={e => setSelectedTestId(e.target.value)}>
                    <option value="">-- Select a Test --</option>
                    {endedTests.map(test => (
                        <option key={test.id} value={test.id}>{test.test_name}</option>
                    ))}
                </select>
            </div>

            {participants.length > 0 && (
                <>
                    <table className="grading-table">
                        <thead>
                            <tr>
                                <th>Student Name</th>
                                <th>Score</th>
                                <th>Remarks</th>
                                <th>Proficiency Tag</th>
                            </tr>
                        </thead>
                        <tbody>
                            {participants.map((p, index) => (
                                <tr key={p.student_fcc_id}>
                                    <td>{p.new_student_admission?.name || p.student_fcc_id}</td>
                                    <td>
                                        <input 
                                            type="number" 
                                            value={grades[index]?.score || ''}
                                            onChange={e => handleGradeChange(p.student_fcc_id, 'score', e.target.value)}
                                        />
                                    </td>
                                    <td>
                                        <input 
                                            type="text"
                                            value={grades[index]?.remarks || ''}
                                            onChange={e => handleGradeChange(p.student_fcc_id, 'remarks', e.target.value)}
                                        />
                                    </td>
                                    <td>
                                        <select
                                            value={grades[index]?.tag || 'Beginner'}
                                            onChange={e => handleGradeChange(p.student_fcc_id, 'tag', e.target.value)}
                                        >
                                            <option value="Beginner">Beginner</option>
                                            <option value="Intermediate">Intermediate</option>
                                            <option value="Expert">Expert</option>
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <button onClick={handleSaveGrades} disabled={isLoading} style={{marginTop: '20px'}}>
                        {isLoading ? 'Saving...' : 'Save All Grades'}
                    </button>
                </>
            )}
        </div>
    );
};

export default GradeTest;