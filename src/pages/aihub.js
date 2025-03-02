import React, { useState, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSyncAlt, faTimes, faRobot, faLanguage } from '@fortawesome/free-solid-svg-icons';
import FcchomeAI from './fcchome-ai';
import EnglishPracticeAssistant from '../components/EnglishPracticeAssistant';
import { v4 as uuidv4 } from 'uuid'; // For unique session IDs

function Aihub() {
    const [activeTab, setActiveTab] = useState('english-practice');
    const [isOpen, setIsOpen] = useState(false); // Toggle for switcher
    const sessionId = React.useRef(uuidv4()); // Unique session ID for tracking

    // Reusable function for logging user activity
    const logUserActivity = useCallback(async (activityType, activityDetails = {}) => {
        try {
            const activityData = {
                activity_type: activityType,
                activity_details: JSON.stringify({
                    ...activityDetails,
                    active_tab: activeTab,
                    timestamp: new Date().toISOString(),
                }),
                page_url: window.location.pathname,
                session_id: sessionId.current,
            };

            const response = await fetch("http://localhost:5000/api/user-activity-log", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(activityData),
            });

            if (!response.ok) throw new Error("Failed to log activity");
            console.log(`Activity '${activityType}' logged successfully`);
        } catch (error) {
            console.error("Error logging user activity:", error);
        }
    }, [activeTab]);

    // Click handlers
    const handleToggleClick = () => {
        setIsOpen((prev) => !prev);
        logUserActivity("Toggle Switcher", { is_open: !isOpen });
    };

    const handleTabSwitch = (tab) => {
        setActiveTab(tab);
        setIsOpen(false); // Close switcher after selection
        logUserActivity("Switch Tab", { selected_tab: tab });
    };

    return (
        <div className="aihub-container">
            {/* 🔹 Floating Modern Switcher */}
            <div className={`switcher-container ${isOpen ? 'open' : ''}`}>
                <button className="switcher-toggle" onClick={handleToggleClick}>
                    <FontAwesomeIcon
                        icon={isOpen ? faTimes : faSyncAlt}
                        className="switch-icon"
                    />
                </button>
                {isOpen && (
                    <div className="switcher-buttons">
                        <button
                            className={activeTab === 'english-practice' ? 'active' : ''}
                            onClick={() => handleTabSwitch('english-practice')}
                        >
                            <FontAwesomeIcon icon={faLanguage} className="btn-icon" />
                            English Practice
                        </button>
                        <button
                            className={activeTab === 'fcchome-ai' ? 'active' : ''}
                            onClick={() => handleTabSwitch('fcchome-ai')}
                        >
                            <FontAwesomeIcon icon={faRobot} className="btn-icon" />
                            FCC Home AI
                        </button>
                    </div>
                )}
            </div>

            {/* 🔹 Page Content */}
            <div className="tab-content">
                {activeTab === 'english-practice' && <EnglishPracticeAssistant />}
                {activeTab === 'fcchome-ai' && <FcchomeAI />}
            </div>

            {/* 🔹 Modern CSS Styling */}
            <style>{`
                /* 🌟 Full Page Layout */
                .aihub-container {
                    height: 90vh;
                    padding: 10px;
                    background: #f5f5f5;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    position: relative;
                }

                /* 🔹 Floating Switcher (Fixed Right Side) */
                .switcher-container {
                    position: fixed;
                    top: 50%;
                    right: 15px;
                    transform: translateY(-50%);
                    z-index: 1000;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }

                /* 🔵 Modern Switcher Toggle */
                .switcher-toggle {
                    background: rgba(255, 255, 255, 0.2);
                    backdrop-filter: blur(10px);
                    color: rgb(62, 155, 255);
                    border: none;
                    padding: 14px;
                    font-size: 22px;
                    cursor: pointer;
                    border-radius: 50%;
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
                    transition: all 0.3s ease-in-out;
                }

                .switcher-toggle:hover {
                    background: rgba(255, 255, 255, 0.4);
                    transform: scale(1.1);
                }

                /* 🔄 Rotate Icon Effect */
                .switch-icon {
                    transition: transform 0.3s ease;
                }

                /* 🌟 Switcher Buttons (Glassmorphism Effect) */
                .switcher-buttons {
                    display: flex;
                    flex-direction: column;
                    background: rgba(255, 255, 255, 0.3);
                    backdrop-filter: blur(12px);
                    border-radius: 12px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                    margin-top: 12px;
                    padding: 8px;
                    width: 190px;
                    text-align: center;
                    transition: all 0.3s ease-in-out;
                }

                /* 🎨 Button Styling */
                .switcher-buttons button {
                    border: none;
                    background: rgba(255, 255, 255, 0.15);
                    color: black;
                    padding: 12px;
                    font-size: 16px;
                    cursor: pointer;
                    transition: all 0.3s;
                    border-radius: 8px;
                    margin: 6px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                }

                /* 🟢 Active Button */
                .switcher-buttons button.active {
                    background: rgb(117, 183, 255);
                    color: white;
                    font-weight: bold;
                    box-shadow: 0 0 12px rgba(0, 123, 255, 0.6);
                }

                /* 🔥 Hover Animation */
                .switcher-buttons button:hover {
                    background: rgba(0, 123, 255, 0.2);
                    transform: translateY(-2px);
                }

                /* 🔹 Tab Content (Full Page View) */
                .tab-content {
                    width: 100%;
                    height: 100%;
                    overflow: auto;
                }

                /* 📱 Mobile Responsive */
                @media (max-width: 768px) {
                    .switcher-container {
                        right: 5px;
                    }
                    .switcher-buttons {
                        width: 160px;
                    }
                    .switcher-toggle {
                        padding: 12px;
                        font-size: 20px;
                    }
                }
            `}</style>
        </div>
    );
}

export default Aihub;