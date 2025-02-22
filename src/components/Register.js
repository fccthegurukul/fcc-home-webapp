// Register.js
import React, { useState } from 'react';

const Register = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState(''); // Added confirm password field
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        try {
            const response = await fetch('http://localhost:5000/register', { // Adjust URL if needed
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            if (response.ok) {
                const data = await response.json();
                setSuccessMessage(data.message);
                // Optionally, redirect user to login page or dashboard after successful registration
                console.log("Registration successful:", data);
                setUsername(''); // Clear input fields after success
                setPassword('');
                setConfirmPassword('');
            } else {
                const errorData = await response.json();
                setError(errorData.message || 'Registration failed');
                console.error("Registration failed:", errorData);
            }
        } catch (err) {
            setError('Failed to connect to server.');
            console.error("Registration error:", err);
        }
    };

    return (
        <div>
            <h2>Register</h2>
            {successMessage && <p style={{ color: 'green' }}>{successMessage}</p>}
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <form onSubmit={handleRegister}>
                <div>
                    <label htmlFor="registerUsername">Username:</label>
                    <input
                        type="text"
                        id="registerUsername"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label htmlFor="registerPassword">Password:</label>
                    <input
                        type="password"
                        id="registerPassword"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label htmlFor="confirmPassword">Confirm Password:</label>
                    <input
                        type="password"
                        id="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                    />
                </div>
                <button type="submit">Register</button>
            </form>
        </div>
    );
};

export default Register;