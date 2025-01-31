import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from "lucide-react";
import { Play } from "lucide-react";
import ReactPlayer from 'react-player'; // Import ReactPlayer
import './CardHub.css';

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

  const fccId = location.state?.fccId;

  // Static options (you can replace these if your options are dynamic)
  const skillLevels = ['Beginner', 'Intermediate', 'Expert', 'Done'];
  const skillStatuses = ['Learning', 'Completed', 'Next Step'];

  useEffect(() => {
    const fetchSkills = async () => {
      try {
        const response = await fetch(`http://localhost:5000/get-student-skills/${fccId}`);
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
    if (fccId) fetchSkills();
  }, [fccId]);

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


// const handlePracticeClick = () => {
//   if (selectedSkill && selectedSkill.skill_topic) {
//      navigate(`/quiz/${selectedSkill.skill_topic.replace(/ /g, '-')}`, { state: { fccId: fccId, skillTopic: selectedSkill.skill_topic } });
//   }
//   console.log("Practice Clicked!", selectedSkill.skill_topic, fccId);
// };


const handlePracticeClick = () => {
  if (selectedSkill && selectedSkill.skill_topic) {
     navigate(`/quiz/${selectedSkill.skill_topic.replace(/ /g, '-')}`, { state: { fccId: fccId, skillTopic: selectedSkill.skill_topic } });
  }
  console.log("Practice Clicked!", selectedSkill.skill_topic, fccId);
};

  return (
    <div className="container">
      <div className="back-button-group">
        <button onClick={() => navigate("/student-profile")} className="back-button">
          <ArrowLeft className="icon" size={18} />
          Back to Profile
        </button>
      </div>

      <h1>Card Hub</h1>
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
                src={selectedSkill.skill_image_url}
                alt="Skill"
                className={`skill-image ${modalOpen ? 'enlarged' : ''}`}
              />
              <div className="zoom-icon" onClick={handleZoomClick}>
                <i className="fas fa-search-plus"></i>
              </div>
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
                <button onClick={handlePlayPause}>{playing ? 'Pause' : 'Play'}</button>
              </div>
            )}

            {modalOpen && (
              <div className="modal-overlay" onClick={handleCloseModal}>
                <div className="modal-content">
                  <img
                    src={selectedSkill.skill_image_url}
                    alt="Enlarged Skill"
                    className="modal-image"
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
     <button className="practice-button" onClick={handlePracticeClick}>Practice</button>
            <button className="close-button" onClick={() => setSelectedSkill(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CardHub;