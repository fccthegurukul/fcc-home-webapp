import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBook, faCalendarDays, faUsers, faChalkboardTeacher, faListCheck, faPaperPlane, faPlus, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import './TodayTopicSubmissionPage.css';

const TodayTopicSubmissionPage = () => {
    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [displaySubject, setDisplaySubject] = useState('लोड हो रहा है...');
    const [activeTargets, setActiveTargets] = useState([]);
    const [classroomOptions, setClassroomOptions] = useState([]);
    const [view, setView] = useState('loading'); // 'loading', 'list', 'create'
    const [message, setMessage] = useState({ type: '', text: '' });
    const [isLoading, setIsLoading] = useState(false);

    // Form states for creating a new target
    const [newTargetName, setNewTargetName] = useState('');
    const [newTargetDays, setNewTargetDays] = useState('');
    const [classGroup, setClassGroup] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [otherSubject, setOtherSubject] = useState('');

    // State for multiple topic submission forms
    const [topicInputs, setTopicInputs] = useState({});

    useEffect(() => {
        try {
            const userDataString = localStorage.getItem('user');
            if (userDataString) {
                const parsedUser = JSON.parse(userDataString);
                setUser(parsedUser);
                if (parsedUser.subject && !parsedUser.subject.includes(',')) {
                    setSelectedSubject(parsedUser.subject);
                }
            } else {
                navigate('/login');
            }
        } catch (error) {
            navigate('/login');
        }
    }, [navigate]);

    useEffect(() => {
        const fetchClassrooms = async () => {
            try {
                const { data: batchesData, error: batchesError } = await supabase.from('school_shifts').select('shift_name');
                if (batchesError) console.error("Batch loading error:", batchesError.message);

                const { data: classesData, error: classesError } = await supabase.from('new_student_admission').select('fcc_class');
                if (classesError) throw new Error(`Classroom list error: ${classesError.message}`);

                const batchNames = batchesData?.map(item => item.shift_name).filter(Boolean) || [];
                const uniqueClasses = [...new Set(classesData?.map(item => item.fcc_class).filter(Boolean))].sort((a, b) => parseInt(a) - parseInt(b));
                const classNames = uniqueClasses.map(c => `Class ${c}`);
                
                setClassroomOptions([...batchNames, ...classNames]);
            } catch (e) {
                console.error("Could not fetch classroom options:", e.message);
                setMessage({ type: 'error', text: `क्लासरूम सूची लोड करने में विफल।` });
            }
        };
        fetchClassrooms();
    }, []);

    const fetchActiveTargets = useCallback(async (teacherId) => {
        setView('loading');
        setMessage({ type: '', text: '' });
        try {
            const { data: targets, error } = await supabase
                .from('teaching_targets')
                .select('*')
                .eq('teacher_fcc_id', teacherId)
                .eq('status', 'active');
            
            if (error) throw error;

            if (targets && targets.length > 0) {
                // Har target ke liye uske daily entries fetch karein
                const targetsWithEntries = await Promise.all(targets.map(async (target) => {
                    const { data: entries, error: entriesError } = await supabase
                        .from('daily_topic_entries')
                        .select('*')
                        .eq('target_id', target.id)
                        .order('submission_date', { ascending: true });
                    
                    if (entriesError) console.error(`Failed to fetch entries for target ${target.id}:`, entriesError.message);
                    
                    return { ...target, dailyEntries: entries || [] };
                }));

                setActiveTargets(targetsWithEntries);
                // Har target ke liye input state initialize karein
                const initialInputs = {};
                targetsWithEntries.forEach(t => {
                    initialInputs[t.id] = { subTopicName: '', description: '' };
                });
                setTopicInputs(initialInputs);
                setView('list');
            } else {
                setActiveTargets([]);
                setView('create'); // Agar koi target nahi hai, to seedhe create view par bhej do
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'सक्रिय लक्ष्य लोड करने में विफल। आप एक नया लक्ष्य बना सकते हैं।' });
            setView('create');
        }
    }, []);

    useEffect(() => {
        if (user) {
            fetchActiveTargets(user.teacher_id);
            const subjects = user.subject ? user.subject.split(',').map(s => s.trim()).join(', ') : 'कोई विषय निर्धारित नहीं है';
            setDisplaySubject(subjects);
        }
    }, [user, fetchActiveTargets]);

    const handleInputChange = (targetId, field, value) => {
        setTopicInputs(prev => ({
            ...prev,
            [targetId]: {
                ...prev[targetId],
                [field]: value,
            },
        }));
    };

    const handleCreateTarget = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage({ type: '', text: '' });

        const subjectForTarget = selectedSubject === 'other' ? otherSubject.trim() : selectedSubject;

        if (!subjectForTarget) {
            setMessage({ type: 'error', text: 'कृपया एक विषय चुनें या "अन्य" में टाइप करें।' });
            setIsLoading(false);
            return;
        }

        const targetData = {
            teacher_fcc_id: user.teacher_id,
            target_name: newTargetName,
            target_days: parseInt(newTargetDays, 10),
            class_group: classGroup,
            subject: subjectForTarget
        };
        try {
            const { error } = await supabase.from('teaching_targets').insert([targetData]);
            if (error) throw error;
            setMessage({ type: 'success', text: 'नया लक्ष्य सफलतापूर्वक बनाया गया!' });
            setNewTargetName('');
            setNewTargetDays('');
            setClassGroup('');
            setSelectedSubject(user.subject && !user.subject.includes(',') ? user.subject : '');
            setOtherSubject('');
            // Refresh the list of active targets
            await fetchActiveTargets(user.teacher_id);
        } catch (error) {
            setMessage({ type: 'error', text: `लक्ष्य बनाने में विफल: ${error.message}` });
            setView('create'); // Stay on create view on failure
        } finally {
            setIsLoading(false);
        }
    };

    const handleCompleteTarget = async (targetId, targetName) => {
        if (!window.confirm(`क्या आप वाकई "${targetName}" लक्ष्य को पूर्ण के रूप में चिह्नित करना चाहते हैं?`)) return;
        setIsLoading(true);
        try {
            const { error } = await supabase.from('teaching_targets').update({ status: 'completed', end_date: new Date().toISOString() }).eq('id', targetId);
            if (error) throw error;
            setMessage({ type: 'success', text: `लक्ष्य "${targetName}" सफलतापूर्वक पूर्ण हुआ!` });
            // Refresh targets list
            await fetchActiveTargets(user.teacher_id);
        } catch (error) {
            setMessage({ type: 'error', text: `लक्ष्य को पूर्ण करने में विफल: ${error.message}` });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmitDailyTopic = async (e, targetId) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage({ type: '', text: '' });
        
        const { subTopicName, description } = topicInputs[targetId];

        const entryData = {
            target_id: targetId,
            sub_topic_name: subTopicName,
            description: description
        };

        try {
            // Step 1: Roz ki topic entry save karein
            const { error: entryError } = await supabase.from('daily_topic_entries').insert([entryData]);
            if (entryError) throw new Error(`दैनिक प्रविष्टि सहेजने में विफल: ${entryError.message}`);

            // Step 2: Naye backend function ko call karein taaki woh sabhi students ke skills update kare
            const { error: rpcError } = await supabase.rpc('add_daily_topic_to_students', {
                p_target_id: targetId,
                p_sub_topic_name: subTopicName
            });
            if (rpcError) throw new Error(`छात्र कौशल को अपडेट करने में विफल: ${rpcError.message}`);
            
            setMessage({ type: 'success', text: `टॉपिक "${subTopicName}" सफलतापूर्वक जमा हो गया है और छात्रों के स्किल में जुड़ गया है!` });
            
            // Clear inputs for this form and refresh targets
            handleInputChange(targetId, 'subTopicName', '');
            handleInputChange(targetId, 'description', '');
            await fetchActiveTargets(user.teacher_id);

        } catch (error) {
            setMessage({ type: 'error', text: `प्रक्रिया विफल हुई: ${error.message}` });
        } finally {
            setIsLoading(false);
        }
    };
    
    const renderCreateTargetForm = () => {
        const subjectOptions = user?.subject ? user.subject.split(',').map(s => s.trim()) : [];
        return (
            <div className="topic-submission-card">
                <div className="card-content">
                    <div className="target-header">
                        <h2>नया शिक्षण लक्ष्य बनाएं</h2>
                        {activeTargets.length > 0 && (
                            <button onClick={() => setView('list')} className="back-btn">
                                <FontAwesomeIcon icon={faArrowLeft} /> वापस सूची पर
                            </button>
                        )}
                    </div>
                    <form onSubmit={handleCreateTarget}>
                        {/* Fields for creating a target */}
                        <div className="form-group">
                            <label htmlFor="targetName">विषय/टॉपिक का नाम</label>
                            <FontAwesomeIcon icon={faBook} className="input-icon" />
                            <input id="targetName" type="text" value={newTargetName} onChange={(e) => setNewTargetName(e.target.value)} placeholder="जैसे: क्लास 4 का हिंदी का 5 पाठ 'शेर पर सवा शेर'" required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="subjectSelect">विषय चुनें</label>
                            <select id="subjectSelect" value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} required>
                                <option value="">-- विषय चुनें --</option>
                                {subjectOptions.map(sub => (<option key={sub} value={sub}>{sub}</option>))}
                                <option value="other">अन्य (Other)</option>
                            </select>
                        </div>
                        {selectedSubject === 'other' && (
                            <div className="form-group">
                                <label htmlFor="otherSubject">अपना विषय टाइप करें</label>
                                <input id="otherSubject" type="text" value={otherSubject} onChange={(e) => setOtherSubject(e.target.value)} placeholder="जैसे: Moral Science" required/>
                            </div>
                        )}
                        <div className="form-group">
                            <label htmlFor="classGroup">क्लास या बैच चुनें</label>
                            <select id="classGroup" value={classGroup} onChange={(e) => setClassGroup(e.target.value)} required >
                                <option value="">-- चुनें --</option>
                                {classroomOptions.map(option => (<option key={option} value={option}>{option}</option>))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="targetDays">अनुमानित दिन</label>
                            <FontAwesomeIcon icon={faCalendarDays} className="input-icon" />
                            <input id="targetDays" type="number" min="1" value={newTargetDays} onChange={(e) => setNewTargetDays(e.target.value)} placeholder="जैसे: 15" required />
                        </div>
                        <button type="submit" className="submit-btn" disabled={isLoading}>
                            <FontAwesomeIcon icon={faPaperPlane} /> {isLoading ? 'बनाया जा रहा है...' : 'लक्ष्य बनाएं'}
                        </button>
                    </form>
                </div>
            </div>
        );
    };

    const renderTargetsList = () => {
        return (
            <div>
                <div className="list-header">
                    <h2>मेरे सक्रिय शिक्षण लक्ष्य ({activeTargets.length})</h2>
                    <button onClick={() => setView('create')} className="create-new-btn">
                        <FontAwesomeIcon icon={faPlus} /> नया लक्ष्य बनाएं
                    </button>
                </div>
                <div className="targets-grid">
                    {activeTargets.map(target => (
                        <div key={target.id} className="topic-submission-card target-item-card">
                            <div className="card-content">
                                <div className="target-header">
                                    <h3>{target.target_name}</h3>
                                    <button onClick={() => handleCompleteTarget(target.id, target.target_name)} className="complete-btn" disabled={isLoading}>लक्ष्य पूर्ण करें</button>
                                </div>
                                <div className="active-target-info">
                                    <p><strong><FontAwesomeIcon icon={faUsers} /> क्लास/बैच:</strong> {target.class_group}</p>
                                    <p><strong><FontAwesomeIcon icon={faBook} /> विषय:</strong> {target.subject}</p>
                                    <p><strong><FontAwesomeIcon icon={faCalendarDays} /> प्रगति:</strong> दिन {target.dailyEntries.length + 1} / {target.target_days}</p>
                                </div>
                                <hr />
                                <form onSubmit={(e) => handleSubmitDailyTopic(e, target.id)}>
                                    <h4>आज का विषय जमा करें</h4>
                                    <div className="form-group">
                                        <label htmlFor={`subTopicName-${target.id}`}>आज का सब-टॉपिक</label>
                                        <FontAwesomeIcon icon={faChalkboardTeacher} className="input-icon" />
                                        <input id={`subTopicName-${target.id}`} type="text" value={topicInputs[target.id]?.subTopicName || ''} onChange={(e) => handleInputChange(target.id, 'subTopicName', e.target.value)} placeholder="जैसे: Variables and Data Types" required />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor={`subTopicDescription-${target.id}`}>विवरण (वैकल्पिक)</label>
                                        <textarea id={`subTopicDescription-${target.id}`} value={topicInputs[target.id]?.description || ''} onChange={(e) => handleInputChange(target.id, 'description', e.target.value)} rows="3" placeholder="आज के टॉपिक के मुख्य बिंदु..."></textarea>
                                    </div>
                                    <button type="submit" className="submit-btn" disabled={isLoading}>
                                        <FontAwesomeIcon icon={faPaperPlane} /> {isLoading ? 'जमा हो रहा है...' : 'जमा करें'}
                                    </button>
                                </form>
                                <div className="recent-topics-history">
                                    <h4><FontAwesomeIcon icon={faListCheck} /> अब तक पढ़ाए गए टॉपिक</h4>
                                    {target.dailyEntries.length > 0 ? (
                                        <ul className="recent-topics-list">
                                            {target.dailyEntries.map((entry, index) => (
                                                <li key={entry.id}>
                                                    <span><strong>दिन {index + 1}:</strong> {entry.sub_topic_name}</span>
                                                    <span className="topic-date">{new Date(entry.submission_date).toLocaleDateString('hi-IN')}</span>
                                                </li>
                                            )).reverse()}
                                        </ul>
                                    ) : (
                                        <p>इस लक्ष्य के लिए अभी तक कोई विषय जमा नहीं किया गया है।</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderContent = () => {
        switch (view) {
            case 'loading':
                return <div className="loading-spinner-container"><div className="loading-spinner"></div></div>;
            case 'create':
                return renderCreateTargetForm();
            case 'list':
                return renderTargetsList();
            default:
                return <p>कुछ गड़बड़ है। कृपया पेज को रिफ्रेश करें।</p>;
        }
    };

    return (
        <div className="topic-submission-container">
            <div className="page-header">
                {user && <p className="teacher-info">शिक्षक: <strong>{user.name}</strong> | विषय: <strong>{displaySubject}</strong></p>}
                {message.text && <p className={`message ${message.type}`}>{message.text}</p>}
            </div>
            <div className="main-content-area">
                {renderContent()}
            </div>
        </div>
    );
};

export default TodayTopicSubmissionPage;