// CardHub.js

import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from "lucide-react";
import { Play } from "lucide-react";
import ReactPlayer from 'react-player'; // Import ReactPlayer
import './CardHub.css';
import NotFoundImage from '../assets/404-image.jpg'; // Import default image

const CardHub = () => {
  const [skills, setSkills] = useState([]);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState({ level: '', status: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const initialFccId = location.state?.fccId;
  const recentProfilesData = location.state?.recentProfiles || []; // Get recentProfiles from state
  const initialStudent = location.state?.student || null; // Get student object from state
  const [fccId, setFccId] = useState(initialFccId || localStorage.getItem("lastViewedFccId") || ""); // Load from localStorage or state
  const [recentProfiles, setRecentProfiles] = useState(recentProfilesData);
  const [student, setStudent] = useState(initialStudent); // State for current student

  // API URL from environment variable
  const apiUrl = process.env.REACT_APP_API_URL;

  // Static options (you can replace these if your options are dynamic)
  const skillLevels = ['Beginner', 'Intermediate', 'Expert', 'Done'];
  const skillStatuses = ['Learning', 'Completed', 'Next Step'];


  useEffect(() => {
    // If recentProfiles are not passed from StudentProfile, try to get from localStorage
    if (recentProfiles.length === 0) {
      const savedRecentProfiles = JSON.parse(localStorage.getItem("recentProfiles")) || [];
      setRecentProfiles(savedRecentProfiles);
    }
  }, []);


  useEffect(() => {
    const fetchSkills = async () => {
      if (!fccId) return; // Don't fetch if fccId is not available
      try {
        const response = await fetch(
          `${apiUrl}/get-student-skills/${fccId}`, // Using apiUrl here
          {
            headers: {
              "ngrok-skip-browser-warning": "true",
            },
          }
        );
        const data = await response.json();
        if (response.ok) {
          setSkills(data);
          setError('');
        } else {
          setSkills([]);
          setError(data.error || 'Failed to fetch skills');
        }
      } catch (error) {
        console.error('Error fetching skills:', error);
        setError('An error occurred while fetching skills');
      }
    };

    // Fetch student profile again if not passed in state or if fccId changes and student in state is outdated
    const fetchStudentProfile = async () => {
      try {
        const response = await fetch(
          `${apiUrl}/get-student-profile/${fccId}`, // Using apiUrl here
          {
            headers: {
              "ngrok-skip-browser-warning": "true",
            },
          }
        );
        if (response.ok) {
          const studentData = await response.json();
          setStudent(studentData);
          localStorage.setItem("studentProfile", JSON.stringify(studentData)); // Update localStorage student profile if needed
        } else {
          console.error("Failed to fetch student profile");
          setStudent(null);
        }
      } catch (error) {
        console.error("Error fetching student profile:", error);
        setStudent(null);
      }
    };


    if (!initialStudent || initialStudent.fcc_id !== fccId) {
      fetchStudentProfile(); // Fetch student profile if not available or outdated
    }


    fetchSkills();
    localStorage.setItem("lastViewedFccId", fccId); // Update last viewed FCC ID in localStorage
  }, [fccId, initialStudent, apiUrl]); // Refetch skills and student when fccId changes, include initialStudent to check for updates and apiUrl


  const filteredSkills = skills.filter(skill => {
    const level = skill.skill_level ? skill.skill_level.toUpperCase() : '';
    const status = skill.status ? skill.status.toUpperCase() : '';
    const searchMatch = !searchTerm || skill.skill_topic.toLowerCase().includes(searchTerm.toLowerCase());

    let levelMatch = true;
    let statusMatch = true;


    if (filter.level) {
      levelMatch = level === filter.level.toUpperCase();
    }

    if (filter.status) {
      statusMatch = status === filter.status.toUpperCase();
    }
    return levelMatch && statusMatch && searchMatch;
  });


  const handleCardClick = (skill) => {
    setSelectedSkill(skill);
    if (skill.skill_log && skill.skill_log[0]?.details?.image_url) {
      setPlaying(true); // Start video playback if video url available
    } else {
      setPlaying(false)
    }
  };


  const renderCards = () => {
    return filteredSkills.map((skill) => {
      const { skill_topic, skill_level, status, skill_description } = skill;
      const level = skill_level || 'Unknown';
      const description = skill_description || 'No description available';
      const currentStatus = status || 'Not Specified';
      const hasVideo = skill.skill_log && skill.skill_log[0]?.details?.image_url;


      let labelStyle = {};
      switch (level.toUpperCase()) {
        case 'DONE':
          labelStyle = { backgroundColor: 'green' };
          break;
        case 'EXPERT':
          labelStyle = { backgroundColor: 'red' };
          break;
        default:
          labelStyle = { backgroundColor: 'gray' };
          break;
      }

      return (
        <div key={skill_topic} className="card" onClick={() => handleCardClick(skill)}>
          <h2>{skill_topic}</h2>
          <p>Skill Level: {level}</p>
          <span className="label" style={labelStyle}>{level.toUpperCase()}</span>
          <p>Status: {currentStatus}</p>
          <p>Description: {description}</p>
          {hasVideo && (
            <div className="play-icon-container">
              <Play className="play-icon" />
            </div>
          )}
        </div>
      );
    });
  };

  const handleZoomClick = () => {
    setModalOpen(true);
  };

  const handlePlayPause = () => {
    setPlaying(!playing);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setPlaying(false);
  };


  const handleImageClick = () => {
    setModalOpen(true); // Open the modal
    setSelectedSkill((prevSkill) => ({
      ...prevSkill,
      imageBlurred: !prevSkill.imageBlurred, // Toggle the blur state
    }));
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilter({ ...filter, [name]: value });
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleClearFilter = () => {
    setFilter({ level: '', status: '' });
    setSearchTerm('');
  };


const handlePracticeClick = () => {
  if (selectedSkill && selectedSkill.skill_topic) {
     navigate(`/quiz/${selectedSkill.skill_topic.replace(/ /g, '-')}`, { state: { fccId: fccId, skillTopic: selectedSkill.skill_topic } });
  }
  console.log("Practice Clicked!", selectedSkill.skill_topic, fccId);
};

const handleProfileSwitch = (selectedFccId) => {
  setFccId(selectedFccId); // Update fccId state, which will trigger useEffect to fetch new data
};


  return (
    <div className="container">
      <div className="back-button-group">
        {/* Current Student Profile Image */}
        {student?.photo_url && (
          <img
            src={student.photo_url}
            alt={`${student.name} Profile`}
            className="current-profile-image"
            onError={(e) => { e.target.src = NotFoundImage; }}
          />
        )}

        {/* Profile Switcher Dropdown */}
        {recentProfiles.length > 0 && (
          <select
            className="profile-switcher"
            value={fccId}
            onChange={(e) => handleProfileSwitch(e.target.value)}
            aria-label="Switch Student Profile"
          >
            <option value="">प्रोफ़ाइल बदलें</option>
            {recentProfiles.map((profile) => (
              <option key={profile.fcc_id} value={profile.fcc_id} className="profile-option">
                {profile.photo_url && (
                  <img
                    src={profile.photo_url}
                    alt={`${profile.name} का प्रोफाइल`}
                    className="profile-switcher-image"
                    onError={(e) => { e.target.src = NotFoundImage; }}
                  />
                )}
                <span className="profile-switcher-name">{profile.name} ({profile.fcc_id})</span>
              </option>
            ))}
          </select>
        )}
      </div>


      <h1>Skill Hub</h1>
      {error && <p className="error">{error}</p>}

      <div className="controls">
        <input
          type="text"
          placeholder="Search skills..."
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
          <option value="">All Levels</option>
          {skillLevels.map((level) => (
            <option key={level} value={level}>{level}</option>
          ))}
        </select>

        <select
          name="status"
          value={filter.status}
          onChange={handleFilterChange}
          className="filter-dropdown"
        >
          <option value="">All Statuses</option>
          {skillStatuses.map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
        <button onClick={handleClearFilter} className="clear-filter-button">Clear Filters</button>
      </div>

      <div className="card-list">
        {filteredSkills.length > 0 ? renderCards() : <p>No skills available to display cards.</p>}
      </div>

      {selectedSkill && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{selectedSkill.skill_topic}</h2>
            <p><strong>Level:</strong> {selectedSkill.skill_level}</p>
            <p><strong>Status:</strong> {selectedSkill.status}</p>
            <p><strong>Description:</strong> {selectedSkill.skill_description}</p>

            <div className="image-container" onClick={handleImageClick}>
              <img
                src={selectedSkill.skill_image_url || NotFoundImage}
                alt="Skill"
                className={`skill-image ${modalOpen ? 'enlarged' : ''}`}
                onError={(e) => { e.target.src = NotFoundImage; }} // Fallback image
              />
            </div>

            {/* Display ReactPlayer if video URL is available in skill log */}
            {selectedSkill.skill_log && selectedSkill.skill_log[0]?.details?.image_url && (
              <div className="video-container">
                <ReactPlayer
                  url={selectedSkill.skill_log[0].details.image_url}
                  playing={playing}
                  width='100%'
                  height='280px'
                  config={{
                    youtube: {
                      playerVars: {
                        controls: 0,  // Hide the player controls
                        showinfo: 0,  // Hide video title and uploader
                        modestbranding: 1, // Hide the YouTube logo
                        rel: 0 // Disable related videos at the end
                      },
                    }
                  }}
                />
                <button onClick={handlePlayPause}>{playing ? 'रोके' : 'चालू करे'}</button>
              </div>
            )}

            {modalOpen && (
              <div className="modal-overlay" onClick={handleCloseModal}>
                <div className="modal-content">
                  <img
                    src={selectedSkill.skill_image_url}
                    alt="Enlarged Skill"
                    className="modal-image"
                    onError={(e) => { e.target.src = NotFoundImage; }} // Fallback image
                  />
                  <span className="modal-close" onClick={handleCloseModal}>×</span>
                </div>
              </div>
            )}

            {selectedSkill.skill_log && (
              <div className="skill-log">
                {/* ... Existing skill log rendering code */}
                <strong>Skill Log:</strong>
                <ul>
                  {selectedSkill.skill_log.map((log, index) => (
                    <li key={index}>
                      <p><strong>Time:</strong> {new Date(log.time).toLocaleString()}</p>
                      <p><strong>Action:</strong> {log.action}</p>
                      <p><strong>Details:</strong></p>
                      <ul>
                        {log.details &&
                          Object.entries(log.details)
                            .filter(([key]) => key !== 'image_url')
                            .map(([key, value]) => (
                              <li key={key}>
                                <strong>{key.charAt(0).toUpperCase() + key.slice(1)}:</strong> {value}
                              </li>
                            ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              </div>
            )}
<div className="button-group">
  <button className="close-button" onClick={() => setSelectedSkill(null)}>
    <ArrowLeft size={16} /> पीछे जाये
  </button>
  <button className="practice-button" onClick={handlePracticeClick}>
    <Play size={16} /> प्रैक्टिस चालू करे
  </button>
</div>
              </div>
        </div>
      )}
    </div>
  );
};

export default CardHub;