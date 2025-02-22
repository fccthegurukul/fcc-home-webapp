import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const Login = ({ setIsLoggedIn }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
    
        try {
            const response = await fetch('http://localhost:5000/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
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
        <div>
            <h2>Login</h2>
            {successMessage && <p style={{ color: 'green' }}>{successMessage}</p>}
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <form onSubmit={handleLogin}>
                <div>
                    <label htmlFor="username">Username:</label>
                    <input
                        type="text"
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label htmlFor="password">Password:</label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                <button type="submit">Login</button>
            </form>
        </div>
    );
};

export default Login;