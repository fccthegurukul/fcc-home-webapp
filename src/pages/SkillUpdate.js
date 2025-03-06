import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './SkillUpdate.css';

const SkillUpdate = () => {
  const [skills, setSkills] = useState([]);
  const [filters, setFilters] = useState({ fcc_id: '', name: '', skill_topic: '', skill_level: '', status: '' });
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentSkill, setCurrentSkill] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [imagePreview, setImagePreview] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [studentProfile, setStudentProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const limit = 10;
  const API_BASE_URL = process.env.REACT_APP_API_URL; // Define base URL from env variable

  // Create axios instance with default headers to bypass ngrok warning
  const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'ngrok-skip-browser-warning': 'true', // Added to bypass ngrok warning
    },
  });

  // Skills ko fetch karna
  const fetchSkills = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ ...filters, page, limit });
      const response = await apiClient.get(`/api/skills?${params.toString()}`);
      setSkills(response.data.skills || []);
      setTotalPages(Math.ceil((response.data.total || 0) / limit));
    } catch (error) {
      console.error('Error fetching skills:', error);
      setError('Failed to fetch skills. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Students ko fetch karna
  const fetchStudents = async () => {
    try {
      const response = await apiClient.get('/api/students');
      setStudents(response.data);
    } catch (error) {
      console.error('Error fetching students:', error);
      setError('Failed to fetch students.');
    }
  };

  // Student profile fetch karna jab FCC ID change ho
  const fetchStudentProfile = async (fcc_id) => {
    if (!fcc_id) {
      setStudentProfile(null);
      return;
    }
    try {
      const response = await apiClient.get(`/get-student-profile/${fcc_id}`);
      setStudentProfile(response.data);
    } catch (error) {
      console.error('Error fetching student profile:', error);
      setStudentProfile(null);
    }
  };

  // Initial load ke liye useEffect
  useEffect(() => {
    fetchStudents();
    fetchSkills();
  }, [page, filters]);

  // Filter change handle karna
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPage(1); // Filter change hone par page 1 pe reset karo
  };

  // FCC ID filter change hone par student profile fetch karna
  useEffect(() => {
    if (filters.fcc_id) {
      fetchStudentProfile(filters.fcc_id);
    } else {
      setStudentProfile(null);
    }
  }, [filters.fcc_id]);

  // Filters reset karna
  const resetFilters = () => {
    setFilters({ fcc_id: '', name: '', skill_topic: '', skill_level: '', status: '' });
    setStudentProfile(null);
    setPage(1);
    fetchSkills();
  };

  // Naya skill create karne ke liye modal kholna
  const openCreateModal = () => {
    setIsEditing(false);
    setCurrentSkill(null);
    setSelectedStudent(null);
    setImagePreview(null);
    setVideoPreview(null);
    setShowModal(true);
  };

  // Skill edit karne ke liye modal kholna
  const openEditModal = (skill) => {
    setIsEditing(true);
    setCurrentSkill(skill);
    const student = students.find((s) => s.fcc_id === skill.fcc_id);
    setSelectedStudent(student || null);
    setImagePreview(null);
    setVideoPreview(null);
    setShowModal(true);
  };

  // Image preview ke liye
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // Video preview ke liye
  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setVideoPreview(URL.createObjectURL(file));
    }
  };

  // Form submit karna
  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    try {
      if (isEditing) {
        if (!currentSkill || !currentSkill.id) {
          throw new Error('No skill ID found for updating');
        }
        const response = await apiClient.put(`/api/skills/${currentSkill.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        alert('Skill updated successfully!');
        setCurrentSkill(response.data);
      } else {
        await apiClient.post('/api/skills', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        alert('Skill created successfully!');
      }
      setShowModal(false);
      fetchSkills();
    } catch (error) {
      console.error('Error saving skill:', error.response?.data || error);
      alert(`Error: ${error.response?.data?.error || 'Failed to save skill.'}`);
    }
  };

  return (
    <div className="skill-update-container">
      <h2>Skill Update Page</h2>

      {/* Student Profile Display */}
      {studentProfile && (
        <div className="student-profile">
          <h3>Student Profile</h3>
          <p>Name: {studentProfile.name}</p>
          <p>FCC ID: {studentProfile.fcc_id}</p>
          {studentProfile.photo_url && (
            <img
              src={studentProfile.photo_url}
              alt="Student"
              style={{ width: '100px', height: 'auto' }}
            />
          )}
        </div>
      )}

      {/* Filters */}
      <div className="filters">
        <input
          type="text"
          name="fcc_id"
          placeholder="Filter by FCC ID"
          value={filters.fcc_id}
          onChange={handleFilterChange}
        />
        <input
          type="text"
          name="name"
          placeholder="Filter by Student Name"
          value={filters.name}
          onChange={handleFilterChange}
        />
        <input
          type="text"
          name="skill_topic"
          placeholder="Filter by Skill Topic"
          value={filters.skill_topic}
          onChange={handleFilterChange}
        />
        <select
          name="skill_level"
          value={filters.skill_level}
          onChange={handleFilterChange}
        >
          <option value="">Filter by Skill Level</option>
          <option value="Beginner">Beginner</option>
          <option value="Intermediate">Intermediate</option>
          <option value="Advanced">Advanced</option>
        </select>
        <select
          name="status"
          value={filters.status}
          onChange={handleFilterChange}
        >
          <option value="">Filter by Status</option>
          <option value="Pending">Pending</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
        </select>
        <button onClick={resetFilters}>Reset Filters</button>
      </div>

      {/* Naya Skill Add Button */}
      <button className="add-btn" onClick={openCreateModal}>
        Add New Skill
      </button>

      {/* Error aur Loading States */}
      {error && <div className="error">{error}</div>}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          {/* Skills Table */}
          <table className="skills-table">
            <thead>
              <tr>
                <th>FCC ID</th>
                <th>Name</th>
                <th>Skill Topic</th>
                <th>Skill Level</th>
                <th>Status</th>
                <th>Image</th>
                <th>Video</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {skills.length > 0 ? (
                skills.map((skill) => (
                  <tr key={skill.id}>
                    <td>{skill.fcc_id}</td>
                    <td>{skill.student_name || 'N/A'}</td>
                    <td>{skill.skill_topic}</td>
                    <td>{skill.skill_level}</td>
                    <td>{skill.status || 'N/A'}</td>
                    <td>
                      {skill.skill_image_url ? (
                        <img
                          src={`${API_BASE_URL}${skill.skill_image_url}`}
                          alt="Skill"
                          style={{ width: '50px', height: 'auto' }}
                        />
                      ) : (
                        'No Image'
                      )}
                    </td>
                    <td>
                      {skill.skill_video_url ? (
                        <video
                          src={`${API_BASE_URL}${skill.skill_video_url}`}
                          controls
                          style={{ width: '50px', height: 'auto' }}
                        />
                      ) : (
                        'No Video'
                      )}
                    </td>
                    <td>
                      <button
                        className="edit-btn"
                        onClick={() => openEditModal(skill)}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8">No skills found</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="pagination">
            <button
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              disabled={page === 1}
            >
              Previous
            </button>
            <span>Page {page} of {totalPages || 1}</span>
            <button
              onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={page === totalPages}
            >
              Next
            </button>
          </div>
        </>
      )}

      {/* Modal for Create/Edit */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>{isEditing ? 'Edit Skill' : 'Create New Skill'}</h3>
            <form onSubmit={handleSubmit} encType="multipart/form-data">
              <label>Student:</label>
              <select
                name="fcc_id"
                value={selectedStudent?.fcc_id || currentSkill?.fcc_id || ''}
                onChange={(e) => {
                  const student = students.find((s) => s.fcc_id === e.target.value);
                  setSelectedStudent(student || null);
                  fetchStudentProfile(e.target.value);
                }}
                required
              >
                <option value="">Select Student</option>
                {students.map((student) => (
                  <option key={student.fcc_id} value={student.fcc_id}>
                    {student.name} ({student.fcc_id})
                  </option>
                ))}
              </select>

              <label>Skill Topic:</label>
              <input
                type="text"
                name="skill_topic"
                defaultValue={currentSkill?.skill_topic || ''}
                required
              />

              <label>Skill Level:</label>
              <select
                name="skill_level"
                defaultValue={currentSkill?.skill_level || ''}
                required
              >
                <option value="">Select Level</option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>

              <label>Status:</label>
              <select
                name="status"
                defaultValue={currentSkill?.status || ''}
                required
              >
                <option value="">Select Status</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>

              <label>Skill Description:</label>
              <textarea
                name="skill_description"
                defaultValue={currentSkill?.skill_description || ''}
                rows="3"
              />

              <label>Skill Image:</label>
              <input
                type="file"
                name="skill_image"
                accept="image/*"
                onChange={handleImageChange}
              />
              {imagePreview && (
                <div className="image-preview">
                  <p>Image Preview:</p>
                  <img
                    src={imagePreview}
                    alt="Preview"
                    style={{ width: '150px' }}
                  />
                </div>
              )}
              {isEditing && currentSkill?.skill_image_url && !imagePreview && (
                <div className="current-image">
                  <p>Current Image:</p>
                  <img
                    src={`${API_BASE_URL}${currentSkill.skill_image_url}`}
                    alt="Current Skill"
                    style={{ width: '150px', marginTop: '10px' }}
                  />
                </div>
              )}

              <label>Skill Video:</label>
              <input
                type="file"
                name="skill_video"
                accept="video/*"
                onChange={handleVideoChange}
              />
              {videoPreview && (
                <div className="video-preview">
                  <p>Video Preview:</p>
                  <video
                    src={videoPreview}
                    controls
                    style={{ width: '200px', height: 'auto' }}
                  />
                </div>
              )}
              {isEditing && currentSkill?.skill_video_url && !videoPreview && (
                <div className="current-video">
                  <p>Current Video:</p>
                  <video
                    src={`${API_BASE_URL}${currentSkill.skill_video_url}`}
                    controls
                    style={{ width: '200px', height: 'auto' }}
                  />
                </div>
              )}

              <div className="modal-actions">
                <button type="submit" className="submit-btn">
                  {isEditing ? 'Update Skill' : 'Create Skill'}
                </button>
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SkillUpdate;