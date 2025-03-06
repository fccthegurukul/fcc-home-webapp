import React, { useState, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSyncAlt, faTimes, faRobot, faLanguage } from '@fortawesome/free-solid-svg-icons';
import FcchomeAI from './fcchome-ai';
import EnglishPracticeAssistant from '../components/EnglishPracticeAssistant';
import { v4 as uuidv4 } from 'uuid';

function Aihub() {
    const [activeTab, setActiveTab] = useState('english-practice');
    const [isOpen, setIsOpen] = useState(false);
    const sessionId = React.useRef(uuidv4());

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

            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/user-activity-log`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "ngrok-skip-browser-warning": "true", // Added to bypass ngrok warning
                },
                body: JSON.stringify(activityData),
            });

            if (!response.ok) throw new Error("Failed to log activity");
            console.log(`Activity '${activityType}' logged successfully`);
        } catch (error) {
            console.error("Error logging user activity:", error);
        }
    }, [activeTab]);

    const handleToggleClick = () => {
        setIsOpen((prev) => !prev);
        logUserActivity("Toggle Switcher", { is_open: !isOpen });
    };

    const handleTabSwitch = (tab) => {
        setActiveTab(tab);
        setIsOpen(false);
        logUserActivity("Switch Tab", { selected_tab: tab });
    };

    return (
        <div className="aihub-main-wrapper">
            {/* 🔹 Floating Modern Switcher */}
            <div className="aihub-switcher-panel">
                <button className="aihub-toggle-button" onClick={handleToggleClick}>
                    <FontAwesomeIcon
                        icon={isOpen ? faTimes : faSyncAlt}
                        className="aihub-toggle-icon"
                    />
                </button>
                {isOpen && (
                    <div className="aihub-option-panel">
                        <button
                            className={`aihub-option-button ${activeTab === 'english-practice' ? 'active' : ''}`}
                            onClick={() => handleTabSwitch('english-practice')}
                        >
                            <FontAwesomeIcon icon={faLanguage} className="aihub-option-icon" />
                            English Practice
                        </button>
                        <button
                            className={`aihub-option-button ${activeTab === 'fcchome-ai' ? 'active' : ''}`}
                            onClick={() => handleTabSwitch('fcchome-ai')}
                        >
                            <FontAwesomeIcon icon={faRobot} className="aihub-option-icon" />
                            FCC Home AI
                        </button>
                    </div>
                )}
            </div>

            {/* 🔹 Page Content */}
            <div className="aihub-content-area">
                {activeTab === 'english-practice' && <EnglishPracticeAssistant />}
                {activeTab === 'fcchome-ai' && <FcchomeAI />}
            </div>

            {/* 🔹 Modern CSS Styling */}
            <style>{`
                /* 🌟 Full Page Layout */
                .aihub-main-wrapper {
                    height: 90vh;
                    padding: 20px;
                    background: linear-gradient(135deg, #E5E7EB, #F3F4F6); /* Softer gradient background */
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    position: relative;
                    font-family: 'Inter', sans-serif; /* Modern font */
                }

                /* 🔹 Floating Switcher (Fixed Bottom-Right Corner) */
                .aihub-switcher-panel {
                    position: fixed;
                    bottom: 30px;
                    right: 30px;
                    z-index: 1000;
                    display: flex;
                    flex-direction: column;
                    align-items: flex-end;
                }

                /* 🔵 Modern Switcher Toggle */
                .aihub-toggle-button {
                    background: linear-gradient(135deg, #2C7A7B, #38B2AC); /* Teal gradient */
                    color: white;
                    border: none;
                    padding: 14px;
                    font-size: 22px;
                    cursor: pointer;
                    border-radius: 50%;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    transition: all 0.3s ease-in-out, transform 0.2s ease;
                }

                .aihub-toggle-button:hover {
                    background: linear-gradient(135deg, #236E6F, #2A9D8F);
                    transform: scale(1.1) rotate(15deg);
                }

                .aihub-toggle-button:focus {
                    outline: none;
                    box-shadow: 0 0 0 3px rgba(44, 122, 123, 0.4); /* Focus ring */
                }

                /* 🔄 Rotate Icon Effect */
                .aihub-toggle-icon {
                    transition: transform 0.3s ease;
                }

                .aihub-toggle-button[aria-expanded="true"] .aihub-toggle-icon {
                    transform: rotate(180deg);
                }

                /* 🌟 Switcher Options Panel (Cool Animation) */
                .aihub-option-panel {
                    display: flex;
                    gap: 12px;
                    background: rgba(255, 255, 255, 0.95); /* Slightly opaque white */
                    backdrop-filter: blur(10px);
                    border-radius: 12px;
                    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
                    padding: 15px;
                    margin-top: 12px;
                    opacity: 0;
                    transform: translateY(20px);
                    animation: slideIn 0.5s ease-out forwards;
                    border: 1px solid rgba(0, 0, 0, 0.05);
                }

                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                /* 🎨 Option Button Styling */
                .aihub-option-button {
                    border: none;
                    background: #F3F4F6; /* Neutral background */
                    color: #1F2937; /* Dark text for contrast */
                    padding: 10px 20px;
                    font-size: 15px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
                }

                .aihub-option-button:hover {
                    background: #E5E7EB;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
                }

                .aihub-option-button:focus {
                    outline: none;
                    box-shadow: 0 0 0 3px rgba(44, 122, 123, 0.3);
                }

                .aihub-option-button.active {
                    background: linear-gradient(135deg, #2C7A7B, #38B2AC);
                    color: white;
                    box-shadow: 0 4px 12px rgba(44, 122, 123, 0.3);
                    font-weight: 600;
                }

                /* 🔹 Option Icon */
                .aihub-option-icon {
                    font-size: 18px;
                }

                .aihub-option-button.active .aihub-option-icon {
                    color: white;
                }

                /* 🔹 Tab Content (Full Page View) */
                .aihub-content-area {
                    width: 100%;
                    height: 100%;
                    overflow: auto;
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
                }

                /* 📱 Mobile Responsive */
                @media (max-width: 768px) {
                    .aihub-main-wrapper {
                        padding: 10px;
                    }

                    .aihub-switcher-panel {
                        bottom: 48%;
                        right: 20px;
                    }

                    .aihub-toggle-button {
                        padding: 12px;
                        font-size: 20px;
                    }

                    .aihub-option-panel {
                        flex-direction: column;
                        width: 160px;
                        padding: 12px;
                    }

                    .aihub-option-button {
                        padding: 8px 16px;
                        font-size: 14px;
                    }
                }
            `}</style>
        </div>
    );
}

export default Aihub;