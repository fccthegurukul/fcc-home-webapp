import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./StudentProfile.css";
// Importing the default image from assets (if required)
import NotFoundImage from "../assets/pro-not-found.jpg";

const StudentProfile = () => {
  const [fccId, setFccId] = useState("");
  const [student, setStudent] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [recentProfiles, setRecentProfiles] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const savedProfile = JSON.parse(localStorage.getItem("studentProfile"));
    if (savedProfile) {
      setStudent(savedProfile);
    }

    const savedRecentProfiles = JSON.parse(localStorage.getItem("recentProfiles")) || [];
    setRecentProfiles(savedRecentProfiles);
  }, []);

  const handleSearch = async () => {
    if (!fccId.trim()) {
      setError("FCC ID खाली नहीं हो सकता");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `http://localhost:5000/get-student-profile/${fccId}`
      );
      const data = await response.json();

      if (response.ok) {
        setStudent(data);
        setError("");
        localStorage.setItem("studentProfile", JSON.stringify(data));

        const updatedRecentProfiles = [
          { name: data.name, photo_url: data.photo_url, fcc_id: data.fcc_id },
          ...recentProfiles.filter((profile) => profile.fcc_id !== data.fcc_id),
        ].slice(0, 5); // केवल 5 प्रोफाइल तक सीमित करें।

        setRecentProfiles(updatedRecentProfiles);
        localStorage.setItem("recentProfiles", JSON.stringify(updatedRecentProfiles));
      } else {
        setStudent(null);
        setError(data.error || "विद्यार्थी नहीं मिला");
      }
    } catch (error) {
      setError("डेटा लोड करते समय एक त्रुटि हुई");
    } finally {
      setFccId("");
      setLoading(false);
    }
  };

  const handleRecentProfileClick = (profile) => {
    setStudent(profile);
  };

  return (
    <div className="profile-container">
      <h1>विद्यार्थी प्रोफाइल</h1>

      {/* Search Bar */}
      <div className="search-bar">
        <input
          type="text"
          value={fccId}
          onChange={(e) => setFccId(e.target.value)}
          placeholder="FCC ID डालें"
          className="search-input"
          aria-label="FCC ID खोजें"
        />
        <button
          onClick={handleSearch}
          className="search-button"
          disabled={loading}
          aria-label="प्रोफाइल खोजें"
        >
          {loading ? "खोजी जा रही है..." : "खोजें"}
        </button>
      </div>

      {error && <p className="error">{error}</p>}

{/* Recently Viewed Profiles */}
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
           src={student.photo_url || NotFoundImage} // Use default image if not found
           alt={`${student.name} का प्रोफाइल`}
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
      {student && (
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
    navigate("/card-hub", { state: { fccId: student.fcc_id } })
  }
  aria-label="विद्यार्थी कार्ड देखें"
>
  <span className="button-title">{student.name} का पढ़ाई विवरण</span>
  <span className="button-subtext">सभी जानकारी देखें ➤</span>
</button>


        </div>
      )}
    </div>
  );
};

export default StudentProfile;
