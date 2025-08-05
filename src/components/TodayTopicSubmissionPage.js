import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBook, faCalendarDays, faUsers, faChalkboardTeacher, faListCheck, faPaperPlane } from '@fortawesome/free-solid-svg-icons';
import './TodayTopicSubmissionPage.css';

const TodayTopicSubmissionPage = () => {
    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [displaySubject, setDisplaySubject] = useState('लोड हो रहा है...');
    const [activeTarget, setActiveTarget] = useState(null);
    const [dailyEntries, setDailyEntries] = useState([]);
    const [classroomOptions, setClassroomOptions] = useState([]);
    const [view, setView] = useState('loading');
    const [message, setMessage] = useState({ type: '', text: '' });
    const [isLoading, setIsLoading] = useState(false);

    const [newTargetName, setNewTargetName] = useState('');
    const [newTargetDays, setNewTargetDays] = useState('');
    const [classGroup, setClassGroup] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [otherSubject, setOtherSubject] = useState('');
    const [subTopicName, setSubTopicName] = useState('');
    const [subTopicDescription, setSubTopicDescription] = useState('');

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

    const fetchDailyEntries = useCallback(async (targetId) => {
        const { data, error } = await supabase.from('daily_topic_entries').select('*').eq('target_id', targetId).order('submission_date', { ascending: true });
        if (error) console.error('Failed to fetch daily entries:', error.message);
        else setDailyEntries(data || []);
    }, []);

    const fetchActiveTarget = useCallback(async (teacherId) => {
        setView('loading');
        setMessage({ type: '', text: '' });
        try {
            const { data, error } = await supabase.from('teaching_targets').select('*').eq('teacher_fcc_id', teacherId).eq('status', 'active').single();
            if (error && error.code !== 'PGRST116') throw error;
            if (data) {
                setActiveTarget(data);
                fetchDailyEntries(data.id);
                setView('submitDaily');
            } else {
                setActiveTarget(null);
                setView('createTarget');
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'सक्रिय लक्ष्य लोड करने में विफल। आप एक नया लक्ष्य बना सकते हैं।' });
            setView('createTarget');
        }
    }, [fetchDailyEntries]);

    useEffect(() => {
        if (user) fetchActiveTarget(user.teacher_id);
    }, [user, fetchActiveTarget]);

    useEffect(() => {
        if (!user) {
            return;
        }
        if (user.subject) {
            setDisplaySubject(user.subject);
        } else {
            const fetchTeacherSubjects = async () => {
                try {
                    const { data, error } = await supabase.from('teaching_targets').select('subject').eq('teacher_fcc_id', user.teacher_id);
                    if (error) throw error;

                    if (data && data.length > 0) {
                        const subjects = [...new Set(data.map(target => target.subject).filter(Boolean))];
                        setDisplaySubject(subjects.length > 0 ? subjects.join(', ') : 'कोई विषय निर्धारित नहीं है');
                    } else {
                        setDisplaySubject('कोई विषय निर्धारित नहीं है');
                    }
                } catch (error) {
                    console.error("शिक्षक का विषय लोड करने में विफल:", error.message);
                    setDisplaySubject('विषय लोड नहीं हो सका');
                }
            };
            fetchTeacherSubjects();
        }
    }, [user, activeTarget]);

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
            setSelectedSubject('');
            setOtherSubject('');
            fetchActiveTarget(user.teacher_id);
        } catch (error) {
            setMessage({ type: 'error', text: `लक्ष्य बनाने में विफल: ${error.message}` });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCompleteTarget = async () => {
        if (!window.confirm(`क्या आप वाकई "${activeTarget.target_name}" लक्ष्य को पूर्ण के रूप में चिह्नित करना चाहते हैं?`)) return;
        setIsLoading(true);
        try {
            const { error } = await supabase.from('teaching_targets').update({ status: 'completed', end_date: new Date().toISOString() }).eq('id', activeTarget.id);
            if (error) throw error;
            setMessage({ type: 'success', text: 'लक्ष्य सफलतापूर्वक पूर्ण हुआ!' });
            setActiveTarget(null);
            setView('createTarget');
        } catch (error) {
            setMessage({ type: 'error', text: `लक्ष्य को पूर्ण करने में विफल: ${error.message}` });
        } finally {
            setIsLoading(false);
        }
    };

    // const handleSubmitDailyTopic = async (e) => {
    //     e.preventDefault();
    //     setIsLoading(true);
    //     const entryData = { target_id: activeTarget.id, sub_topic_name: subTopicName, description: subTopicDescription };
    //     try {
    //         const { error } = await supabase.from('daily_topic_entries').insert([entryData]);
    //         if (error) throw error;
    //         setMessage({ type: 'success', text: 'आज का टॉपिक सफलतापूर्वक जमा हो गया है!' });
    //         setSubTopicName('');
    //         setSubTopicDescription('');
    //         fetchDailyEntries(activeTarget.id);
    //     } catch (error) {
    //         setMessage({ type: 'error', text: `सब-टॉपिक जमा करने में विफल: ${error.message}` });
    //     } finally {
    //         setIsLoading(false);
    //     }
    // };

//... TodayTopicSubmissionPage.js ...

    const handleSubmitDailyTopic = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage({ type: '', text: '' }); // Reset message

        // Data `daily_topic_entries` me daalne ke liye
        const entryData = {
            target_id: activeTarget.id,
            sub_topic_name: subTopicName,
            description: subTopicDescription
        };

        try {
            // Transaction me dono kaam ek saath karein
            // Step 1: Roz ki topic entry save karein
            const { error: entryError } = await supabase.from('daily_topic_entries').insert([entryData]);
            if (entryError) throw new Error(`Failed to save daily entry: ${entryError.message}`);

            // Step 2: Naye backend function ko call karein taaki woh sabhi students ke skills update kare
            const { error: rpcError } = await supabase.rpc('add_daily_topic_to_students', {
                p_target_id: activeTarget.id,
                p_sub_topic_name: subTopicName
            });
            if (rpcError) throw new Error(`Failed to update student skills: ${rpcError.message}`);
            
            setMessage({ type: 'success', text: 'आज का टॉपिक सफलतापूर्वक जमा हो गया है और छात्रों के स्किल में जुड़ गया है!' });
            setSubTopicName('');
            setSubTopicDescription('');
            fetchDailyEntries(activeTarget.id);

        } catch (error) {
            setMessage({ type: 'error', text: `प्रक्रिया विफल हुई: ${error.message}` });
        } finally {
            setIsLoading(false);
        }
    };

//... baaki saara code waisa hi rahega ...

    const renderContent = () => {
        switch (view) {
            case 'loading':
                return <div className="loading-spinner-container"><div className="loading-spinner"></div></div>;
            case 'createTarget':
                const subjectOptions = user?.subject ? user.subject.split(',').map(s => s.trim()) : [];
                return (
                    <div className="card-content">
                        <h2>नया शिक्षण लक्ष्य बनाएं</h2>
                        <form onSubmit={handleCreateTarget}>
                            <div className="form-group">
                                <label htmlFor="targetName">विषय/टॉपिक का नाम</label>
                                <FontAwesomeIcon icon={faBook} className="input-icon" />
                                <input id="targetName" type="text" value={newTargetName} onChange={(e) => setNewTargetName(e.target.value)} placeholder="जैसे: क्लास 4 का हिंदी का 5 पाठ 'शेर पर सवा शेर'" required />
                            </div>

                            <div className="form-group">
                                <label htmlFor="subjectSelect">विषय चुनें</label>
                                <select id="subjectSelect" value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} required>
                                    <option value="">-- विषय चुनें --</option>
                                    {subjectOptions.map(sub => (
                                        <option key={sub} value={sub}>{sub}</option>
                                    ))}
                                    <option value="other">अन्य (Other)</option>
                                </select>
                            </div>

                            {selectedSubject === 'other' && (
                                <div className="form-group">
                                    <label htmlFor="otherSubject">अपना विषय टाइप करें</label>
                                    <input
                                        id="otherSubject"
                                        type="text"
                                        value={otherSubject}
                                        onChange={(e) => setOtherSubject(e.target.value)}
                                        placeholder="जैसे: Moral Science"
                                        required
                                    />
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
                );
            case 'submitDaily':
                return (
                    <div className="card-content">
                        <div className="target-header">
                            <h2>आज का विषय जमा करें</h2>
                            <button onClick={handleCompleteTarget} className="complete-btn" disabled={isLoading}>लक्ष्य पूर्ण करें</button>
                        </div>
                        <div className="active-target-info">
                            <p><strong>वर्तमान लक्ष्य:</strong> {activeTarget.target_name}</p>
                            <p><strong>प्रगति:</strong> दिन {dailyEntries.length + 1} / {activeTarget.target_days}</p>
                            <p><strong>क्लास/बैच:</strong> {activeTarget.class_group}</p>
                        </div>
                        <form onSubmit={handleSubmitDailyTopic}>
                            <div className="form-group">
                                <label htmlFor="subTopicName">आज का सब-टॉपिक</label>
                                <FontAwesomeIcon icon={faChalkboardTeacher} className="input-icon" />
                                <input id="subTopicName" type="text" value={subTopicName} onChange={(e) => setSubTopicName(e.target.value)} placeholder="जैसे: Variables and Data Types" required />
                            </div>
                            <div className="form-group">
                                <label htmlFor="subTopicDescription">विवरण (वैकल्पिक)</label>
                                <textarea id="subTopicDescription" value={subTopicDescription} onChange={(e) => setSubTopicDescription(e.target.value)} rows="4" placeholder="आज के टॉपिक के मुख्य बिंदु..."></textarea>
                            </div>
                            <button type="submit" className="submit-btn" disabled={isLoading}>
                                <FontAwesomeIcon icon={faPaperPlane} /> {isLoading ? 'जमा हो रहा है...' : 'जमा करें'}
                            </button>
                        </form>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="topic-submission-container">
            <div className="page-header">
                {user && <p className="teacher-info">शिक्षक: <strong>{user.name}</strong> | विषय: <strong>{displaySubject}</strong></p>}
                {message.text && <p className={`message ${message.type}`}>{message.text}</p>}
            </div>
            <div className="main-content-area">
                <div className="topic-submission-card">{renderContent()}</div>
                <div className="recent-topics-card">
                    <div className="card-content">
                        <h3><FontAwesomeIcon icon={faListCheck} /> {activeTarget ? `"${activeTarget.target_name}" का इतिहास` : "लक्ष्य का इतिहास"}</h3>
                        {view === 'submitDaily' && dailyEntries.length > 0 ? (
                            <ul className="recent-topics-list">
                                {dailyEntries.map((entry, index) => (
                                    <li key={entry.id}>
                                        <span><strong>दिन {index + 1}:</strong> {entry.sub_topic_name}</span>
                                        <span className="topic-date">{new Date(entry.submission_date).toLocaleDateString('hi-IN')}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p>{view === 'createTarget' ? "पहले एक नया लक्ष्य बनाएं। इतिहास यहाँ दिखेगा।" : view === 'submitDaily' ? "इस लक्ष्य के लिए अभी तक कोई विषय जमा नहीं किया गया है।" : ""}</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TodayTopicSubmissionPage;