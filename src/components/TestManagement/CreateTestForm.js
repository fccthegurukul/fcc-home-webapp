import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient'; // Path ko check karein

const CreateTestForm = ({ user }) => {
    const [testName, setTestName] = useState('');
    const [description, setDescription] = useState('');
    const [classGroup, setClassGroup] = useState('');
    const [maxMarks, setMaxMarks] = useState(100);
    const [scheduledDate, setScheduledDate] = useState('');
    
    const [availableClasses, setAvailableClasses] = useState([]);
    const [availableTargets, setAvailableTargets] = useState([]);
    const [selectedTargets, setSelectedTargets] = useState([]);
    
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    // Fetch available classes
    useEffect(() => {
        const fetchClasses = async () => {
            const { data, error } = await supabase.from('new_student_admission').select('fcc_class');
            if (!error && data) {
                const uniqueClasses = [...new Set(data.map(item => item.fcc_class).filter(Boolean))];
                setAvailableClasses(uniqueClasses.sort((a, b) => parseInt(a) - parseInt(b)).map(c => `Class ${c}`));
            }
        };
        fetchClasses();
    }, []);

    // Fetch teaching targets for the selected class
    useEffect(() => {
        if (!classGroup) {
            setAvailableTargets([]);
            return;
        }

        const fetchTargets = async () => {
            const { data, error } = await supabase
                .from('teaching_targets')
                .select('id, target_name')
                .eq('class_group', classGroup);

            if (error) {
                console.error("Error fetching targets:", error);
            } else {
                setAvailableTargets(data);
            }
        };

        fetchTargets();
    }, [classGroup]);


    const handleCreateTest = async (e) => {
        e.preventDefault();
        if (selectedTargets.length === 0) {
            setMessage({ text: "Please select at least one topic.", type: "error" });
            return;
        }

        setIsLoading(true);
        setMessage({ text: '', type: '' });

        try {
            const { data: newTest, error: testError } = await supabase
                .from('tests')
                .insert({
                    test_name: testName,
                    test_description: description,
                    created_by_teacher_id: user.teacher_id,
                    class_group: classGroup,
                    max_marks: maxMarks,
                    scheduled_date: scheduledDate
                })
                .select()
                .single();

            if (testError) throw testError;

            const links = selectedTargets.map(targetId => ({ test_id: newTest.id, target_id: parseInt(targetId) }));
            const { error: linkError } = await supabase.from('test_topics_link').insert(links);
            if (linkError) throw linkError;

            // FCC Class name se numeric part nikalein (e.g., "Class 10" -> "10")
            const classNumber = classGroup.replace(/[^0-9]/g, '');
            const { data: students, error: studentError } = await supabase
                .from('new_student_admission')
                .select('fcc_id')
                .eq('fcc_class', classNumber);
                
            if (studentError) throw studentError;
            
            if (students.length === 0) {
                setMessage({ text: 'Warning: Test created, but no students found for this class.', type: 'success' });
            } else {
                const participants = students.map(student => ({ test_id: newTest.id, student_fcc_id: student.fcc_id }));
                const { error: participantError } = await supabase.from('test_participants').insert(participants);
                if (participantError) throw participantError;
                
                setMessage({ text: `Test created successfully for ${students.length} students!`, type: 'success' });
            }

            // Form reset karein
            setTestName(''); setDescription(''); setMaxMarks(100); setScheduledDate(''); setSelectedTargets([]); setClassGroup('');
            
        } catch (error) {
            setMessage({ text: `Error creating test: ${error.message}`, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <form onSubmit={handleCreateTest} className="test-form">
            <h2>Create a New Offline Test</h2>
            {message.text && <p className={`message ${message.type}`}>{message.text}</p>}
            
            <div className="form-group">
                <label>Test Name</label>
                <input type="text" value={testName} onChange={e => setTestName(e.target.value)} placeholder="e.g., Monthly Maths Test" required />
            </div>

            <div className="form-group">
                <label>Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g., Trigonometry aur Algebra ke chapters se test hoga." />
            </div>

            <div className="form-group">
                <label>Class / Group</label>
                <select value={classGroup} onChange={e => setClassGroup(e.target.value)} required>
                    <option value="">-- Select Class --</option>
                    {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>
            
            <div className="form-group">
                <label>Topics to Include (Ctrl/Cmd + click for multiple)</label>
                <select multiple value={selectedTargets} onChange={(e) => setSelectedTargets(Array.from(e.target.selectedOptions, option => option.value))} required>
                    {availableTargets.map(target => (
                        <option key={target.id} value={target.id}>{target.target_name}</option>
                    ))}
                </select>
            </div>
            
             <div className="form-group">
                <label>Maximum Marks</label>
                <input type="number" value={maxMarks} onChange={e => setMaxMarks(e.target.value)} required min="1" />
            </div>

            <div className="form-group">
                <label>Scheduled Date</label>
                <input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} required />
            </div>
            
            <button type="submit" disabled={isLoading}>{isLoading ? 'Creating...' : 'Create Test'}</button>
        </form>
    );
};

export default CreateTestForm;