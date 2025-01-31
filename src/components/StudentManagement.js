import React, { useState, useEffect } from 'react';
import './StudentManagement.css'; // Import the CSS file

const StudentManagement = () => {
    const [students, setStudents] = useState([]);
    const [payments, setPayments] = useState([]);
    const [editStudent, setEditStudent] = useState(null); // Track the student being edited
    const [skills, setSkills] = useState('');
    const [tutionfeePaid, setTutionfeePaid] = useState(false);
    const [paymentStatus, setPaymentStatus] = useState('');

    // Fetching students data from the backend when the component mounts
    useEffect(() => {
        const fetchStudents = async () => {
            try {
                const response = await fetch('http://localhost:5000/get-students');
                const data = await response.json();
                setStudents(data); // Set the fetched students into state
            } catch (error) {
                console.error('Error fetching students:', error);
            }
        };

        fetchStudents();
    }, []); // Fetch students once when the component mounts

    // Fetching payments data from the backend when the component mounts
    useEffect(() => {
        const fetchPayments = async () => {
            try {
                const response = await fetch('http://localhost:5000/api/payments');
                const data = await response.json();
                setPayments(data); // Set the fetched payments into state
            } catch (error) {
                console.error('Error fetching payments:', error);
            }
        };

        fetchPayments();
    }, []); // Fetch payments once when the component mounts

    // Function to format 'tutionfee_paid' (boolean) into a human-readable string
    const formatTuitionFeeStatus = (status) => {
        return status ? 'Paid' : 'Not Paid';
    };

    // Function to format the monthly_cycle_days array into a readable format
    const formatMonthlyCycleDays = (cycleDays) => {
        return cycleDays && cycleDays.length > 0 
            ? cycleDays.join(', ')  // Join the days into a comma-separated string
            : 'No cycle days specified'; // If no cycle days exist, display a fallback message
    };

    // Function to find matching payment data based on fcc_id
    const getMatchingPayment = (fccId) => {
        return payments.find(payment => payment.fcc_id === fccId);
    };

    // Function to handle student update
    const handleUpdate = async (fccId) => {
        try {
            const response = await fetch(`http://localhost:5000/update-student/${fccId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    skills: skills,
                    tutionfee_paid: tutionfeePaid,
                    payment_status: paymentStatus,
                }),
            });

            const result = await response.json();
            if (response.ok) {
                // Update the local state to reflect changes
                setStudents(prevStudents =>
                    prevStudents.map(student =>
                        student.fcc_id === fccId
                            ? { ...student, skills, tutionfee_paid: tutionfeePaid }
                            : student
                    )
                );
                alert(result.message);
            } else {
                alert('Error updating student data!');
            }
        } catch (error) {
            console.error('Error updating student:', error);
        }
    };

    return (
        <div>
            <h1>Student Management Dashboard</h1>

            {/* Matched Data Table */}
            <h2>Matched Data</h2>
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>FCC ID</th>
                        <th>Skills</th>
                        <th>Tuition Fee</th>
                        <th>Monthly Cycle Days</th>
                        <th>Father's Name</th>
                        <th>Payment Status</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {students.map((student, index) => {
                        const payment = getMatchingPayment(student.fcc_id);
                        if (payment) {
                            return (
                                <tr key={index}>
                                    <td>{student.name}</td>
                                    <td>{student.fcc_id}</td>
                                    <td>{student.skills}</td>
                                    <td>{formatTuitionFeeStatus(student.tutionfee_paid)}</td>
                                    <td className="payment-column">{formatMonthlyCycleDays(payment.monthly_cycle_days)}</td>
                                    <td>{student.father}</td>
                                    <td className="payment-column">{payment.payment_status}</td>
                                    <td>
                                        <button onClick={() => setEditStudent(student)}>Edit</button>
                                    </td>
                                </tr>
                            );
                        }
                        return null;
                    })}
                </tbody>
            </table>

            {/* Edit Student Form */}
            {editStudent && (
                <div className="edit-form">
                    <h2>Edit Student</h2>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleUpdate(editStudent.fcc_id);
                        }}
                    >
                        <label>
                            Skills:
                            <input
                                type="text"
                                value={skills}
                                onChange={(e) => setSkills(e.target.value)}
                            />
                        </label>
                        <label>
                            Tuition Fee Paid:
                            <input
                                type="checkbox"
                                checked={tutionfeePaid}
                                onChange={(e) => setTutionfeePaid(e.target.checked)}
                            />
                        </label>
                        <label>
                            Payment Status:
                            <select
                                value={paymentStatus}
                                onChange={(e) => setPaymentStatus(e.target.value)}
                            >
                                <option value="">Select Payment Status</option>
                                <option value="Completed">Completed</option>
                                <option value="Pending">Pending</option>
                            </select>
                        </label>
                        <button type="submit">Update</button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default StudentManagement;
