// CardHub.js
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Play, Pause, SkipForward, SkipBack } from 'lucide-react';
import './CardHub.css';
import NotFoundImage from '../assets/404-image.jpg';

const CardHub = () => {
    const [skills, setSkills] = useState([]);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState({ level: '', status: '' });
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSkill, setSelectedSkill] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [expandedLog, setExpandedLog] = useState(false);
    const [zoomedImage, setZoomedImage] = useState(null);
    const navigate = useNavigate(); // Fix: useNavigate assignment was missing
    const location = useLocation();

    const initialFccId = location.state?.fccId;
    const recentProfilesData = location.state?.recentProfiles || [];
    const initialStudent = location.state?.student || null;

    const videoRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isSeeking, setIsSeeking] = useState(false);

    const [fccId, setFccId] = useState(
        initialFccId || localStorage.getItem('lastViewedFccId') || ''
    );
    const [recentProfiles, setRecentProfiles] = useState(recentProfilesData);
    const [student, setStudent] = useState(initialStudent);

    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';

    const skillLevels = ['Beginner', 'Intermediate', 'Advanced', 'Done'];
    const skillStatuses = ['Pending', 'In Progress', 'Completed'];
    const [showPracticePopup, setShowPracticePopup] = useState(false);

    useEffect(() => {
        if (recentProfiles.length === 0) {
            const savedRecentProfiles = JSON.parse(localStorage.getItem('recentProfiles')) || [];
            setRecentProfiles(savedRecentProfiles);
        }
    }, []); // Fix: Dependency array corrected to []

    const fetchSkills = useCallback(async () => {
        if (!fccId) {
            console.error('fccId is not set');
            setError('कृपया एक छात्र प्रोफाइल चुनें।');
            setSkills([]);
            return;
        }
        try {
            const response = await fetch(`${apiUrl}/get-student-skills/${fccId}`, {
                headers: { 'ngrok-skip-browser-warning': 'true' },
            });
            const data = await response.json();
            if (response.ok) {
                setSkills(data);
                setError('');
            } else {
                setSkills([]);
                setError(data.error || 'स्किल प्राप्त करने में विफल');
            }
        } catch (error) {
            console.error('Error fetching skills:', error);
            setError('स्किल प्राप्त करते समय एक त्रुटि हुई');
        }
    }, [apiUrl, fccId]);

    const fetchStudentProfile = useCallback(async () => {
        if (!fccId) return;
        try {
            const response = await fetch(`${apiUrl}/get-student-profile/${fccId}`, {
                headers: { 'ngrok-skip-browser-warning': 'true' },
            });
            if (response.ok) {
                const studentData = await response.json();
                setStudent(studentData);
                localStorage.setItem('studentProfile', JSON.stringify(studentData));

                const updatedProfiles = [
                    { fcc_id: studentData.fcc_id, name: studentData.name, photo_url: studentData.photo_url },
                    ...recentProfiles.filter((p) => p.fcc_id !== studentData.fcc_id),
                ].slice(0, 5);
                setRecentProfiles(updatedProfiles);
                localStorage.setItem('recentProfiles', JSON.stringify(updatedProfiles));
            } else {
                console.error('Failed to fetch student profile');
                setStudent(null);
            }
        } catch (error) {
            console.error('Error fetching student profile:', error);
            setStudent(null);
        }
    }, [apiUrl, fccId]); // Fix: 'recentProfiles' removed from dependency array of fetchStudentProfile

    useEffect(() => {
        if (fccId) {
            if (!initialStudent || initialStudent.fcc_id !== fccId) {
                fetchStudentProfile();
            }
            fetchSkills();
            localStorage.setItem('lastViewedFccId', fccId);
        }
    }, [fccId, initialStudent, fetchSkills, apiUrl]); // Fix: 'fetchStudentProfile' removed, and 'apiUrl' added as it's used through fetchStudentProfile

    const filteredSkills = skills.filter((skill) => {
        const level = skill.skill_level ? skill.skill_level.toUpperCase() : '';
        const status = skill.status ? skill.status.toUpperCase() : '';
        const searchMatch =
            !searchTerm || skill.skill_topic.toLowerCase().includes(searchTerm.toLowerCase());
        const levelMatch = !filter.level || level === filter.level.toUpperCase();
        const statusMatch = !filter.status || status === filter.status.toUpperCase();
        return levelMatch && statusMatch && searchMatch;
    });

    const handleCardClick = (skill) => {
        setSelectedSkill(skill);
        setModalOpen(true);
        setExpandedLog(false);
        setIsPlaying(false);
    };

    const handleImageClick = (imageUrl) => {
        setZoomedImage(imageUrl);
    };

    const handleCloseZoom = () => {
        setZoomedImage(null);
    };

    const renderCards = () => {
        return filteredSkills.map((skill) => {
            const { skill_topic, skill_level, status, skill_description } = skill;
            const level = skill_level || 'Unknown';
            const description = skill_description || 'No description available';
            const currentStatus = status || 'Not Specified';
            let labelStyle = {};
            switch (level.toUpperCase()) {
                case 'DONE':
                    labelStyle = { backgroundColor: 'green' };
                    break;
                case 'ADVANCED':
                    labelStyle = { backgroundColor: 'red' };
                    break;
                case 'INTERMEDIATE':
                    labelStyle = { backgroundColor: 'orange' };
                    break;
                case 'BEGINNER':
                    labelStyle = { backgroundColor: 'blue' };
                    break;
                default:
                    labelStyle = { backgroundColor: 'gray' };
                    break;
            }

            return (
                <div key={skill_topic} className="card" onClick={() => handleCardClick(skill)}>
                    <h2>{skill_topic}</h2>
                    <p>
                        <strong style={{ color: "#e74c3c" }}>Skill Level:</strong>{' '}
                        <span style={{ color: "#2c3e50" }}>{level === 'Unknown' ? 'अज्ञात' : level}</span>
                    </p>
                    <span className="label" style={labelStyle}>
                        {level.toUpperCase()}
                    </span>
                    <p>
                        <strong style={{ color: "#27ae60" }}>Status:</strong>{' '}
                        <span style={{ color: "#f39c12" }}>{currentStatus === 'Not Specified' ? 'निर्दिष्ट नहीं' : currentStatus}</span>
                    </p>
                    <p>
                        <strong style={{ color: "#8e44ad" }}>Description:</strong>{' '}
                        <span style={{ color: "#2c3e50" }}>{description === 'No description available' ? 'कोई विवरण उपलब्ध नहीं' : description}</span>
                    </p>
                </div>
            );
        });
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setSelectedSkill(null);
        setExpandedLog(false);
        setIsPlaying(false);
        setShowPracticePopup(false);
    };

    const handleFilterChange = (e) => setFilter({ ...filter, [e.target.name]: e.target.value });
    const handleSearchChange = (e) => setSearchTerm(e.target.value);
    const handleClearFilter = () => setFilter({ level: '', status: '' });
 const handlePracticeClick = () => {
    // Display the popup instead of navigating
    setShowPracticePopup(true);
};

const closePracticePopup = () => {
    setShowPracticePopup(false);
}

    const handleProfileSwitch = (selectedFccId) => setFccId(selectedFccId);
    const toggleLogExpand = () => setExpandedLog(!expandedLog);

    const getSkillImageUrl = (relativeUrl) => {
        if (relativeUrl && relativeUrl.startsWith('/skill_images/')) {
            return `${apiUrl}${relativeUrl}`;
        }
        return relativeUrl || NotFoundImage;
    };

    const getSkillVideoUrl = (relativeUrl) => {
        if (relativeUrl && relativeUrl.startsWith('/skill_videos/')) {
            return `${apiUrl}${relativeUrl}`;
        }
        return relativeUrl;
    };

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const forwardVideo = (seconds = 5) => {
        if (videoRef.current) {
            videoRef.current.currentTime += seconds;
        }
    };

    const rewindVideo = (seconds = 5) => {
        if (videoRef.current) {
            videoRef.current.currentTime -= seconds;
        }
    };


    const handleSpeedChange = (speed) => {
        setPlaybackSpeed(speed);
        if (videoRef.current) {
            videoRef.current.playbackRate = speed;
        }
    };

    const formatTime = (timeInSeconds) => {
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = Math.floor(timeInSeconds % 60);
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    const handleTimeUpdate = () => {
        if (!isSeeking && videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
        }
    };

    const handleVideoLoadedMetadata = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
        }
    };

    const handleSeekbarChange = (e) => {
        setIsSeeking(true);
        setCurrentTime(parseFloat(e.target.value));
    };

    const handleSeekbarInput = (e) => {
        setCurrentTime(parseFloat(e.target.value));
    };

    const handleSeekbarMouseUp = () => {
        if (videoRef.current) {
            videoRef.current.currentTime = currentTime;
        }
        setIsSeeking(false);
    };
    const handleSeekbarMouseDown = () => {
        setIsSeeking(true);
    };

    return (
        <div className="container">
            <div className="back-button-group-cardhub">
                <button className="back-button" onClick={() => navigate(-1)}>
                    <ArrowLeft size={16} /> वापस
                </button>
                {student?.photo_url && (
                    <img
                        src={student.photo_url}
                        alt={`${student.name} Profile`}
                        className="current-profile-image-cardhub"
                        onError={(e) => {
                            e.target.src = NotFoundImage;
                        }}
                    />
                )}
                {recentProfiles.length > 0 && (
                    <select
                        className="profile-switcher"
                        value={fccId}
                        onChange={(e) => handleProfileSwitch(e.target.value)}
                        aria-label="Switch Student Profile"
                    >
                        <option value="">प्रोफ़ाइल चुनें</option>
                        {recentProfiles.map((profile) => (
                            <option key={profile.fcc_id} value={profile.fcc_id}>
                                {profile.name} ({profile.fcc_id})
                            </option>
                        ))}
                    </select>
                )}
            </div>

            <h1>स्किल केंद्र {student ? `- ${student.name}` : ''}</h1>
            {error && <p className="error">{error}</p>}

            <div className="controls">
                <input
                    type="text"
                    placeholder="स्किल खोजें..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    className="search-input"
                />
                <select
                    name="level"
                    value={filter.level}
                    onChange={handleFilterChange}
                    className="filter-dropdown"
                >
                    <option value="">सभी स्तर</option>
                    {skillLevels.map((level) => (
                        <option key={level} value={level}>
                            {level}
                        </option>
                    ))}
                </select>
                <select
                    name="status"
                    value={filter.status}
                    onChange={handleFilterChange}
                    className="filter-dropdown"
                >
                    <option value="">सभी स्थितियां</option>
                    {skillStatuses.map((status) => (
                        <option key={status} value={status}>
                            {status}
                        </option>
                    ))}
                </select>
                <button onClick={handleClearFilter} className="clear-filter-button">
                    फ़िल्टर साफ़ करें
                </button>
            </div>

            <div className="card-list">
                {filteredSkills.length > 0 ? renderCards() : <p>प्रदर्शन के लिए कोई स्किल उपलब्ध नहीं है।</p>}
            </div>

            {modalOpen && selectedSkill && (
                <div className="modal-overlay" onClick={handleCloseModal}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2>{selectedSkill.skill_topic}</h2>
                        <p className="level" style={{ position: "relative", zIndex: 9999 }}>
                            <strong style={{ color: "#ff5733" }}>Level:</strong>{' '}
                            <span style={{ color: "#3498db" }}>{selectedSkill.skill_level === 'Unknown' ? 'अज्ञात' : selectedSkill.skill_level || 'अज्ञात'}</span>
                        </p>

                        <p className="status" style={{ position: "relative", zIndex: 9999 }}>
                            <strong style={{ color: "#27ae60" }}>Status:</strong>{' '}
                            <span style={{ color: "#f39c12" }}>{selectedSkill.status === 'Not Specified' ? 'निर्दिष्ट नहीं' : selectedSkill.status || 'निर्दिष्ट नहीं'}</span>
                        </p>

                        <p className="description" style={{ position: "relative", zIndex: 9999 }}>
                            <strong style={{ color: "#8e44ad" }}>Description:</strong>{' '}
                            <span style={{ color: "#2c3e50" }}>{selectedSkill.skill_description === 'No description available' ? 'कोई विवरण उपलब्ध नहीं' : selectedSkill.skill_description || 'कोई विवरण उपलब्ध नहीं'}</span>
                        </p>

                        {/* Image Display */}
                        <div
                            className="image-container"
                            onClick={() => handleImageClick(getSkillImageUrl(selectedSkill.skill_image_url))}
                        >
                            <img
                                src={getSkillImageUrl(selectedSkill.skill_image_url)}
                                alt="Skill"
                                className="skill-image"
                                onError={(e) => {
                                    e.target.src = NotFoundImage;
                                }}
                            />
                        </div>

                        {/* Video Display with YouTube-like Controls */}
                        {selectedSkill.skill_video_url && (
                            <div className="video-container">
                                <video
                                    ref={videoRef}
                                    className="skill-video"
                                    src={getSkillVideoUrl(selectedSkill.skill_video_url)}
                                    controls={false}
                                    onTimeUpdate={handleTimeUpdate}
                                    onLoadedMetadata={handleVideoLoadedMetadata}
                                    onClick={togglePlay}
                                />
                                <div className="video-controls">
                                    <button onClick={() => rewindVideo(5)} className="video-control-button">
                                        <SkipBack size={18} />
                                    </button>
                                    <button onClick={togglePlay} className="video-control-button">
                                        {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                                    </button>
                                    <button onClick={() => forwardVideo(5)} className="video-control-button">
                                        <SkipForward size={18} />
                                    </button>

                                    <div className="video-progress">
                                        <input
                                            type="range"
                                            className="video-seekbar"
                                            min="0"
                                            max={duration}
                                            step="0.1"
                                            value={currentTime}
                                            onChange={handleSeekbarChange}
                                            onInput={handleSeekbarInput}
                                            onMouseUp={handleSeekbarMouseUp}
                                            onMouseDown={handleSeekbarMouseDown}
                                        />
                                        <span className="current-time">{formatTime(currentTime)}</span>
                                        <span className="total-duration">{formatTime(duration)}</span>
                                    </div>

                                    <select
                                        value={playbackSpeed}
                                        onChange={(e) => handleSpeedChange(Number(e.target.value))}
                                        className="speed-control-dropdown"
                                    >
                                        <option value={0.5}>0.5x</option>
                                        <option value={1}>1x</option>
                                        <option value={1.5}>1.5x</option>
                                        <option value={2}>2x</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {selectedSkill.skill_log && (
                            <div className="skill-log">
                                <div className="skill-log-header">
                                    <strong>स्किल लॉग (रॉ JSON):</strong>
                                    <button onClick={toggleLogExpand} className="expand-button">
                                        {expandedLog ? 'समेटें' : 'विस्तार करें'}
                                    </button>
                                </div>
                                {expandedLog && (
                                    <pre className="json-display">
                                        {JSON.stringify(selectedSkill.skill_log, null, 2)}
                                    </pre>
                                )}
                            </div>
                        )}

                        <div className="button-group">
                            <button className="close-button" onClick={handleCloseModal}>
                                <ArrowLeft size={16} /> वापस
                            </button>
                            <button className="practice-button" onClick={handlePracticeClick}>
                                <Play size={16} /> अभ्यास
                            </button>
                        </div>
                        {showPracticePopup && (
    <div className="practice-popup-overlay">
        <div className="practice-popup">
            <h3>यह सुविधा अभी विकास में है</h3>
            <p>हम इस फीचर पर काम कर रहे हैं!</p>
            <button className="close-button" onClick={closePracticePopup}>
                ठीक है
            </button>
        </div>
    </div>
)}
                    </div>
                </div>
            )}

            {zoomedImage && (
                <div className="image-zoom-overlay active" onClick={handleCloseZoom}>
                    <img src={zoomedImage} alt="Zoomed Skill" className="zoomed-image" />
                </div>
            )}
        </div>
    );
};

export default CardHub;