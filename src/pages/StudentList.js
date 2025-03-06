import React, { useState, useEffect } from "react";
import "./StudentList.css";
import { Link } from 'react-router-dom';

const StudentList = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // States for filtering
  const [schoolingClassFilter, setSchoolingClassFilter] = useState("");
  const [fccClassFilter, setFccClassFilter] = useState("");
  const [paidFilter, setPaidFilter] = useState("");
  const [tuitionFeeFilter, setTuitionFeeFilter] = useState("");

  // State for modal
  const [selectedStudent, setSelectedStudent] = useState(null);

  const API_BASE_URL = process.env.REACT_APP_API_URL; // Define base URL from env variable

  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/get-students`, {
          headers: {
            "ngrok-skip-browser-warning": "true", // Added to bypass ngrok warning
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch students data");
        }

        const data = await response.json();
        setStudents(data);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [API_BASE_URL]);

  // Helper Function to Calculate Days Since Admission
  const calculateDaysSinceAdmission = (admissionDate) => {
    const admission = new Date(admissionDate);
    const today = new Date();
    const differenceInTime = today - admission;
    return Math.floor(differenceInTime / (1000 * 60 * 60 * 24)); // Convert milliseconds to days
  };

  // Filtered Students
  const filteredStudents = students.filter((student) => {
    const matchesSchoolingClass =
      schoolingClassFilter === "" || student.schooling_class === schoolingClassFilter;
    const matchesFccClass =
      fccClassFilter === "" || student.fcc_class === fccClassFilter;
    const matchesPaid =
      paidFilter === "" || (paidFilter === "paid" ? student.paid : !student.paid);
    const matchesTuitionFee =
      tuitionFeeFilter === "" ||
      (tuitionFeeFilter === "paid" ? student.tutionfee_paid : !student.tutionfee_paid);

    return matchesSchoolingClass && matchesFccClass && matchesPaid && matchesTuitionFee;
  });

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div className="student-list">
      <h1 className="title">Student List</h1>
      <Link to="/register">Register</Link>
      {/* Filters */}
      <div className="filters">
        <div className="filter-group">
          <label htmlFor="schooling-class-filter">Schooling Class:</label>
          <select
            id="schooling-class-filter"
            onChange={(e) => setSchoolingClassFilter(e.target.value)}
            value={schoolingClassFilter}
          >
            <option value="">All</option>
            {[...Array(10).keys()].map((i) => (
              <option key={i + 1} value={(i + 1).toString()}>
                {i + 1} Class
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="fcc-class-filter">FCC Class:</label>
          <select
            id="fcc-class-filter"
            onChange={(e) => setFccClassFilter(e.target.value)}
            value={fccClassFilter}
          >
            <option value="">All</option>
            {[...Array(10).keys()].map((i) => (
              <option key={i + 1} value={(i + 1).toString()}>
                Class {i + 1}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="paid-filter">Admission Fee Paid:</label>
          <select
            id="paid-filter"
            onChange={(e) => setPaidFilter(e.target.value)}
            value={paidFilter}
          >
            <option value="">All</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="tuition-fee-filter">Tuition Fee Paid:</label>
          <select
            id="tuition-fee-filter"
            onChange={(e) => setTuitionFeeFilter(e.target.value)}
            value={tuitionFeeFilter}
          >
            <option value="">All</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
          </select>
        </div>
      </div>

      {/* Student Table */}
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Father's Name</th>
            <th>Mother's Name</th>
            <th>Schooling Class</th>
            <th>FCC ID</th>
            <th>Mobile Number</th>
            <th>Admission Fee Paid</th>
            <th>Tuition Fee Paid</th>
            <th>Days Since Admission</th>
            <th>Skills</th> {/* Added column for skills */}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredStudents.map((student, index) => (
            <tr key={index}>
              <td>{student.name}</td>
              <td>{student.father}</td>
              <td>{student.mother}</td>
              <td>{student.schooling_class}</td>
              <td>{student.fcc_id}</td>
              <td>{student.mobile_number}</td>
              <td>
                {student.paid ? (
                  <>
                    Yes <span className="indicator yes">✔</span>
                  </>
                ) : (
                  <>
                    No <span className="indicator no">✘</span>
                  </>
                )}
              </td>
              <td>
                {student.tutionfee_paid ? (
                  <>
                    Yes <span className="indicator yes">✔</span>
                  </>
                ) : (
                  <>
                    No <span className="indicator no">✘</span>
                  </>
                )}
              </td>
              <td>{calculateDaysSinceAdmission(student.admission_date)} days</td>
              <td>{student.skills || 'N/A'}</td> {/* Added fallback for skills */}
              <td>
                <button
                  className="view-more"
                  onClick={() => setSelectedStudent(student)}
                >
                  View More
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Modal */}
      {selectedStudent && (
        <div className="modal">
          <div className="modal-content">
            <h2>Student Details</h2>
            <p><strong>Name:</strong> {selectedStudent.name}</p>
            <p><strong>Father's Name:</strong> {selectedStudent.father}</p>
            <p><strong>Mother's Name:</strong> {selectedStudent.mother}</p>
            <p><strong>Schooling Class:</strong> {selectedStudent.schooling_class}</p>
            <p><strong>Mobile Number:</strong> {selectedStudent.mobile_number}</p>
            <p><strong>Address:</strong> {selectedStudent.address}</p>
            <p>
              <strong>Admission Fee Paid:</strong> 
              {selectedStudent.paid ? (
                <>
                  Yes <span className="indicator yes">✔</span>
                </>
              ) : (
                <>
                  No <span className="indicator no">✘</span>
                </>
              )}
            </p>
            <p>
              <strong>Tuition Fee Paid:</strong> 
              {selectedStudent.tutionfee_paid ? (
                <>
                  Yes <span className="indicator yes">✔</span>
                </>
              ) : (
                <>
                  No <span className="indicator no">✘</span>
                </>
              )}
            </p>
            <p><strong>FCC Class:</strong> {selectedStudent.fcc_class}</p>
            <p><strong>FCC ID:</strong> {selectedStudent.fcc_id}</p>
            <p><strong>Admission Date:</strong> {selectedStudent.admission_date}</p>
            <p><strong>Skills:</strong> {selectedStudent.skills || 'N/A'}</p> {/* Added fallback */}
            <p>
              <strong>Days Since Admission:</strong>{" "}
              {calculateDaysSinceAdmission(selectedStudent.admission_date)} days
            </p>
            <button className="close-modal" onClick={() => setSelectedStudent(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentList;