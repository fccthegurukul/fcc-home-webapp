import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient'; // Path ko check karein

const LiveTests = ({ user }) => {
    const [tests, setTests] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchConductibleTests = async () => {
        setLoading(true);
        if (!user || !user.teacher_id) {
            setLoading(false);
            return;
        }

        const { data, error } = await supabase
            .from('tests')
            .select('*')
            .in('status', ['Scheduled', 'Live'])
            .eq('created_by_teacher_id', user.teacher_id);

        if (error) {
            console.error("Error fetching tests", error);
        } else {
            setTests(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchConductibleTests();
    }, [user]);

    const handleTestStatusChange = async (testId, newStatus) => {
        const updateData = { status: newStatus };
        if (newStatus === 'Live') {
            updateData.start_time = new Date().toISOString();
        }
        if (newStatus === 'Ended') {
            updateData.end_time = new Date().toISOString();
        }

        const { error } = await supabase.from('tests').update(updateData).eq('id', testId);
        
        if (error) {
            alert(`Error: ${error.message}`);
        } else {
            // UI turant update karne ke liye list ko refresh karein
            fetchConductibleTests();
        }
    };
    
    // Live Timer Component (Optional but good to have)
    const LiveTimer = ({ startTime }) => {
        const [elapsedTime, setElapsedTime] = useState('');
        
        useEffect(() => {
            const timer = setInterval(() => {
                const now = new Date();
                const start = new Date(startTime);
                const diff = now - start;
                
                const hours = Math.floor(diff / (1000 * 60 * 60)).toString().padStart(2, '0');
                const minutes = Math.floor((diff / (1000 * 60)) % 60).toString().padStart(2, '0');
                const seconds = Math.floor((diff / 1000) % 60).toString().padStart(2, '0');
                
                setElapsedTime(`${hours}:${minutes}:${seconds}`);
            }, 1000);

            return () => clearInterval(timer);
        }, [startTime]);

        return <span> {elapsedTime}</span>;
    };

    if (loading) {
        return <p>Loading tests...</p>;
    }

    return (
        <div>
            <h2>Conduct Tests</h2>
            <div className="test-list">
                {tests.length === 0 ? (
                    <p>No scheduled or live tests found for you.</p>
                ) : (
                    tests.map(test => (
                        <div key={test.id} className={`test-card ${test.status.toLowerCase()}`}>
                            <h3>{test.test_name}</h3>
                            <p>Class: {test.class_group}</p>
                            <p>Date: {new Date(test.scheduled_date).toLocaleDateString()}</p>
                            <p>Status: <strong>{test.status}</strong></p>
                            
                            {test.status === 'Scheduled' && (
                                <button onClick={() => handleTestStatusChange(test.id, 'Live')} className="button-start">Start Test</button>
                            )}
                            
                            {test.status === 'Live' && (
                                <>
                                    <p>Running for:<LiveTimer startTime={test.start_time} /></p>
                                    <button onClick={() => handleTestStatusChange(test.id, 'Ended')} className="button-end">End Test</button>
                                </>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default LiveTests;