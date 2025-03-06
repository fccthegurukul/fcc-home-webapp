import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const Login = ({ setIsLoggedIn }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const navigate = useNavigate();
    const location = useLocation();

    const API_BASE_URL = process.env.REACT_APP_API_URL; // Define base URL from env variable

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        try {
            const response = await fetch(`${API_BASE_URL}/login`, { // Updated URL
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
                credentials: 'include', // Include credentials (cookies) in the request
            });

            if (response.ok) {
                const data = await response.json();
                setSuccessMessage(data.message);
                console.log("Login successful:", data);
                localStorage.setItem('authToken', 'your_auth_token_here'); // Replace with actual token if provided
                localStorage.setItem('accessType', data.accessType); // Save access type
                setIsLoggedIn(true);

                const redirectTo = location.state?.from?.pathname || '/dashboard';
                navigate(redirectTo, { replace: true });
            } else {
                const errorData = await response.json();
                setError(errorData.message || 'Login failed');
                console.error("Login failed:", errorData);
            }
        } catch (err) {
            setError('Failed to connect to server.');
            console.error("Login error:", err);
        }
    };

    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            backgroundColor: "#f4f4f4",
            padding: "20px"
        }}>
            <div style={{
                background: "#fff",
                padding: "2rem",
                borderRadius: "10px",
                boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
                width: "100%",
                maxWidth: "400px",
                textAlign: "center"
            }}>
                <h2 style={{ marginBottom: "1rem", color: "#333" }}>Login</h2>

                {successMessage && <p style={{ color: 'green' }}>{successMessage}</p>}
                {error && <p style={{ color: 'red' }}>{error}</p>}

                <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <div style={{ textAlign: "left" }}>
                        <label htmlFor="username" style={{ fontWeight: "bold" }}>Username:</label>
                        <input
                            type="text"
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            style={{
                                width: "100%",
                                padding: "10px",
                                borderRadius: "5px",
                                border: "1px solid #ccc",
                                marginTop: "5px"
                            }}
                        />
                    </div>

                    <div style={{ textAlign: "left", position: "relative" }}>
                        <label htmlFor="password" style={{ fontWeight: "bold" }}>Password:</label>
                        <input
                            type={showPassword ? "text" : "password"}
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            style={{
                                width: "100%",
                                padding: "10px",
                                borderRadius: "5px",
                                border: "1px solid #ccc",
                                marginTop: "5px"
                            }}
                        />
                        <span
                            onClick={() => setShowPassword(!showPassword)}
                            style={{
                                position: "absolute",
                                right: "10px",
                                top: "50%",
                                transform: "translateY(-50%)",
                                cursor: "pointer",
                                color: "#555"
                            }}
                        >
                            {showPassword ? "👁️" : "🔒"}
                        </span>
                    </div>

                    <button type="submit" style={{
                        backgroundColor: "#007BFF",
                        color: "#fff",
                        padding: "10px",
                        border: "none",
                        borderRadius: "5px",
                        cursor: "pointer",
                        fontSize: "1rem",
                        fontWeight: "bold",
                        transition: "0.3s"
                    }}
                        onMouseOver={(e) => e.target.style.backgroundColor = "#0056b3"}
                        onMouseOut={(e) => e.target.style.backgroundColor = "#007BFF"}
                    >
                        Login
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;