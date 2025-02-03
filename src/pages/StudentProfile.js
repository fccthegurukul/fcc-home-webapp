// StudentProfile.js

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./StudentProfile.css";
import { ClipLoader } from 'react-spinners';
import NotFoundImage from "../assets/404-image.jpg";

const StudentProfile = () => {
  const [fccId, setFccId] = useState("");
  const [student, setStudent] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [recentProfiles, setRecentProfiles] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    // On component mount, load recent profiles from localStorage
    const savedRecentProfiles = JSON.parse(localStorage.getItem("recentProfiles")) || [];
    setRecentProfiles(savedRecentProfiles);

    // Optionally load last viewed FCC ID and fetch profile if needed (as before)
    const storedFccId = localStorage.getItem("lastViewedFccId");
    if (storedFccId) {
      setFccId(storedFccId);
      handleSearch(storedFccId);
    }
  }, []);

  useEffect(() => {
    // Update localStorage when student profile changes (after search) - still useful to store last viewed
    if (student?.fcc_id) {
      localStorage.setItem("lastViewedFccId", student.fcc_id);
    }
  }, [student]);

  const handleSearch = async (searchFccId) => {
    const fccToSearch = searchFccId;
    if (!fccToSearch || !fccToSearch.trim()) {
      setError("FCC ID खाली नहीं हो सकता");
      return;
    }

    setLoading(true);
    setError("");
    setStudent(null);

    try {
      const response = await fetch(
        `http://localhost:5000/get-student-profile/${fccToSearch}`
      );
      const data = await response.json();

      if (response.ok) {
        setStudent(data);
        setError("");
        localStorage.setItem("lastViewedFccId", data.fcc_id);

        // Load existing recent profiles from localStorage
        const existingRecentProfiles = JSON.parse(localStorage.getItem("recentProfiles")) || [];

        // Check if the current profile is already in recent profiles to avoid duplicates
        const isAlreadyRecent = existingRecentProfiles.some(profile => profile.fcc_id === data.fcc_id);

        let updatedRecentProfiles;
        if (!isAlreadyRecent) {
          // Add the new profile to the beginning of the list
          updatedRecentProfiles = [
            { name: data.name, photo_url: data.photo_url, fcc_id: data.fcc_id },
            ...existingRecentProfiles
          ];
        } else {
          // If it's already there, no need to add again, keep existing list
          updatedRecentProfiles = existingRecentProfiles;
        }

        setRecentProfiles(updatedRecentProfiles);
        localStorage.setItem("recentProfiles", JSON.stringify(updatedRecentProfiles)); // Save all recent profiles without limit
      } else {
        setStudent(null);
        setError(data.error || "विद्यार्थी नहीं मिला");
      }
    } catch (error) {
      setError("कुछ त्रुटि हो गयी, कृपया बाद में पुनः प्रयास करें। ");
    } finally {
      setLoading(false);
    }
  };

  const handleRecentProfileClick = (profile) => {
    setFccId(profile.fcc_id);
    handleSearch(profile.fcc_id);
    localStorage.setItem("lastViewedFccId", profile.fcc_id);
  };

  const handleInputChange = (e) => {
    setFccId(e.target.value);
  };

  const handleSearchClick = () => {
    handleSearch(fccId);
  };

  return (
    <div className="profile-container">
      <h1>विद्यार्थी प्रोफाइल</h1>

      <div className="search-bar">
        <input
          type="text"
          value={fccId}
          onChange={handleInputChange}
          placeholder="FCC ID डालें"
          className="search-input"
          aria-label="FCC ID खोजें"
          autoComplete="off"
          inputMode="numeric"
          pattern="[0-9]*"
        />
        <button
          onClick={handleSearchClick}
          className="search-button"
          disabled={loading || !fccId.trim()}
          aria-label="प्रोफाइल खोजें"
          aria-busy={loading}
        >
          {loading ? <ClipLoader color="#ffffff" loading={loading} size={15} /> : "खोजें"}
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {loading && !error && !student && <div className="loader-container"><ClipLoader color="#4A90E2" loading={loading} size={50} /><p>प्रोफ़ाइल लोड हो रहा है...</p></div>}

      {/* Display Recently Viewed Profiles */}
      {recentProfiles.length > 0 && (
        <div className="recent-profiles">
          <h2>हाल ही में देखे गए प्रोफाइल</h2>
          <div className="recent-profiles-slider">
            {recentProfiles.map((profile) => (
              <div
                key={profile.fcc_id}
                className="recent-profile-card"
                onClick={() => handleRecentProfileClick(profile)}
              >
                {profile.photo_url ? (
                  <img
                    src={profile.photo_url || NotFoundImage}
                    alt={`${profile.name} का प्रोफाइल`}
                    className="profile-picture"
                  />
                ) : (
                  <p>कोई फोटो उपलब्ध नहीं है</p>
                )}
                <p className="recent-profile-name">{profile.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Render Student Profile */}
      {student && !loading && (
        <div className="profile-card">
          <h2>विद्यार्थी प्रोफाइल</h2>
          {student.photo_url ? (
            <img
              src={student.photo_url}
              alt={`${student.name} का प्रोफाइल`}
              className="profile-picture"
            />
          ) : (
            <p>कोई फोटो उपलब्ध नहीं है</p>
          )}
          <p>
            <strong>नाम:</strong> {student.name}
          </p>
          <p>
            <strong>FCC ID:</strong> {student.fcc_id}
          </p>
          <p>
            <strong>पिता का नाम:</strong> {student.father}
          </p>
          <p>
            <strong>माता का नाम:</strong> {student.mother}
          </p>
          <p>
            <strong>स्कूलिंग क्लास:</strong> {student.schooling_class}
          </p>
          <hr style={{ borderTop: '1px dotted rgba(0, 0, 0, 0.2)', margin: '8px 0', borderBottom: 'none' }} />
          <p>
            <strong>ट्यूशन क्लास: </strong> {student.fcc_class}
          </p>
          <p>
            <strong>मोबाइल नंबर:</strong> {student.mobile_number}
          </p>
          <p>
            <strong>पता:</strong> {student.address}
          </p>
          <p>
            <strong>ट्यूशन शुल्क भुगतान:</strong> {student.tutionfee_paid ? "बाकि ⏳" : "जम्मा ✅"}
          </p>
          <div className="button-group">
            <button
              className="view-ctc-ctg-button"
              onClick={() =>
                navigate("/view-ctc-ctg", {
                  state: {
                    fccId: student.fcc_id,
                    name: student.name,
                    father: student.father,
                    mobile_number: student.mobile_number,
                    recentProfiles: recentProfiles,
                    student: student
                  },
                })
              }
              aria-label="CTC/CTG देखें"
            >
              <span className="button-title">{student.name} का कोचिंग टाइम</span>
              <span className="button-subtext">देखें और जानें ➤</span>
            </button>
          </div>

          <button
            className="card-hub-button"
            onClick={() =>
              navigate("/card-hub", { state: { fccId: student.fcc_id, recentProfiles: recentProfiles, student: student } })
            }
            aria-label="विद्यार्थी कार्ड देखें"
          >
            <span className="button-title">{student.name} का पढ़ाई विवरण</span>
            <span className="button-subtext">सभी जानकारी देखें ➤</span>
          </button>
          <button
                className="view-leaderboard-button"
                onClick={() =>
                    navigate("/leaderboard", {
                        // state: { fccId: student.fcc_id }, // Pass fccId as state
                        state: { fccId: student.fcc_id, student: student },
                    })
                }
                aria-label="लीडरबोर्ड देखें"
            >
                <span className="button-title">लीडरबोर्ड</span>
                <span className="button-subtext">रैंक और टास्क देखें ➤</span>
            </button>
        </div>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
};

export default StudentProfile;