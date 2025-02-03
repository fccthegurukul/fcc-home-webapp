// Leaderboard.js
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ClipLoader } from 'react-spinners';
import './Leaderboard.css';

const Leaderboard = () => {
  const location = useLocation();
  const { fccId } = location.state || {};
  const [leaderboard, setLeaderboard] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!fccId) {
      setError("FCC ID उपलब्ध नहीं है।");
      setLoading(false);
      return;
    }

    const fetchLeaderboardData = async () => {
      try {
        setLoading(true); // Start loading here to cover the initial fetch
        setError(""); // Clear any previous errors
        const response = await fetch(`http://localhost:5000/leaderboard/${fccId}`);
        const data = await response.json();
        if (response.ok) {
          setLeaderboard(data.leaderboard);
          setTasks(data.tasks);
          setStudent(data.student);
        } else {
          setError(data.error || "डेटा प्राप्त करने में समस्या हुई।");
        }
      } catch (err) {
        setError("कुछ त्रुटि हो गयी, कृपया बाद में पुनः प्रयास करें।");
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboardData();
  }, [fccId]);


  return (
    <div className="leaderboard-container">
      <h1 className="leaderboard-title">गतिशील लीडरबोर्ड</h1>

      {loading ? (
        <div className="loader">
          <ClipLoader color="#4A90E2" loading={loading} size={50} />
          <p>डेटा लोड हो रहा है...</p>
        </div>
      ) : error ? (
        <p className="error">{error}</p>
      ) : (
        <>
          {/* Student-specific information */}
          {student && (
            <div className="student-info-card">
              <h2 className="student-name">{student.student_name}</h2>
              <p className="student-score">कुल स्कोर: {student.total_score}</p>
            </div>
          )}

          {/* Leaderboard Table */}
          <div className="leaderboard-table-container">
            <h2 className="section-title">कक्षा लीडरबोर्ड</h2>
            <div className="table-responsive"> {/* For mobile responsiveness - horizontal scroll if needed */}
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th>रैंक</th>
                    <th>FCC ID</th>
                    <th>विद्यार्थी का नाम</th>
                    <th>कुल स्कोर</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry, index) => (
                    <tr
                      key={entry.id}
                      className={entry.student_fcc_id === fccId ? 'current-student' : ''} // Highlight current student
                    >
                      <td>{index + 1}</td>
                      <td>{entry.student_fcc_id}</td>
                      <td>{entry.student_name}</td>
                      <td>{entry.total_score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Personalized Message Section */}
          {student && tasks.some(task => task.status !== 'COMPLETED') && (
  <div className="personalized-message-container">
    <h2 className="section-title">पर्सनलाइज्ड संदेश</h2>
    <div className="message-card">
      <p className="message-text">
        <strong>{student.student_name}</strong>, अधिक अंक अर्जित करने के लिए अपने लंबित कार्यों को पूरा करें!
        {leaderboard.findIndex(entry => entry.student_fcc_id === fccId) !== -1 ? (
          <>
            वर्तमान में आपकी कक्षा में रैंक{' '}
            <strong>{leaderboard.findIndex(entry => entry.student_fcc_id === fccId) + 1}</strong> है!
          </>
        ) : (
          <>अपनी कक्षा में शीर्ष पर पहुंचने के लिए प्रयास करते रहें!</>
        )}
      </p>
    </div>
  </div>
)}


          {/* Task Section */}
          <div className="tasks-section">
            <h2 className="section-title">आपके कार्य</h2>
            {tasks.length > 0 ? (
              <div className="table-responsive">
                <table className="tasks-table">
                  <thead>
                    <tr>
                      <th>कार्य ID</th>
                      <th>कार्य का नाम</th>
                      <th>विवरण</th>
                      <th>अधिकतम अंक</th>
                      <th>आपके अंक</th>
                      <th>स्थिति</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map(task => (
                      <tr key={task.task_id}>
                        <td>{task.task_id}</td>
                        <td>{task.task_name}</td>
                        <td>{task.description}</td>
                        <td>{task.max_score}</td>
                        <td>{task.score_earned}</td>
                        <td>{task.status || 'पूरा नहीं हुआ'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="no-tasks-message">कोई कार्य उपलब्ध नहीं हैं।</p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Leaderboard;