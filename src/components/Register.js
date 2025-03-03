import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faLock, faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";

const Register = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [isRegistered, setIsRegistered] = useState(false);
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        setError("");
        setSuccessMessage("");

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        try {
            const response = await fetch("http://localhost:5000/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });

            if (response.ok) {
                setSuccessMessage("Your verification is under process.");
                setIsRegistered(true);

                setTimeout(() => {
                    navigate("/login");
                }, 10000); // Redirect after 3 seconds
            } else {
                const errorData = await response.json();
                setError(errorData.message || "Registration failed");
            }
        } catch (err) {
            setError("Failed to connect to the server.");
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
                <h2 style={{ marginBottom: "1rem", color: "#333" }}>Register</h2>

                {successMessage && <p style={{ color: "green", fontWeight: "bold" }}>{successMessage}</p>}
                {error && <p style={{ color: "red" }}>{error}</p>}

                {!isRegistered && (
                    <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        {/* Username Field */}
                        <div style={{ textAlign: "left", position: "relative" }}>
                            <label htmlFor="registerUsername" style={{ fontWeight: "bold" }}>Username:</label>
                            <div style={{ display: "flex", alignItems: "center", position: "relative" }}>
                                <FontAwesomeIcon icon={faUser} style={{ position: "absolute", left: "10px", color: "#555" }} />
                                <input
                                    type="text"
                                    id="registerUsername"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                    style={{
                                        width: "100%",
                                        padding: "10px 10px 10px 35px",
                                        borderRadius: "5px",
                                        border: "1px solid #ccc",
                                        marginTop: "5px"
                                    }}
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div style={{ textAlign: "left", position: "relative" }}>
                            <label htmlFor="registerPassword" style={{ fontWeight: "bold" }}>Password:</label>
                            <div style={{ display: "flex", alignItems: "center", position: "relative" }}>
                                <FontAwesomeIcon icon={faLock} style={{ position: "absolute", left: "10px", color: "#555" }} />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    id="registerPassword"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    style={{
                                        width: "100%",
                                        padding: "10px 35px 10px 35px",
                                        borderRadius: "5px",
                                        border: "1px solid #ccc",
                                        marginTop: "5px"
                                    }}
                                />
                                <FontAwesomeIcon
                                    icon={showPassword ? faEye : faEyeSlash}
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        position: "absolute",
                                        right: "10px",
                                        cursor: "pointer",
                                        color: "#555"
                                    }}
                                />
                            </div>
                        </div>

                        {/* Confirm Password Field */}
                        <div style={{ textAlign: "left", position: "relative" }}>
                            <label htmlFor="confirmPassword" style={{ fontWeight: "bold" }}>Confirm Password:</label>
                            <div style={{ display: "flex", alignItems: "center", position: "relative" }}>
                                <FontAwesomeIcon icon={faLock} style={{ position: "absolute", left: "10px", color: "#555" }} />
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    id="confirmPassword"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    style={{
                                        width: "100%",
                                        padding: "10px 35px 10px 35px",
                                        borderRadius: "5px",
                                        border: password !== confirmPassword && confirmPassword ? "1px solid red" : "1px solid #ccc",
                                        marginTop: "5px",
                                        backgroundColor: password !== confirmPassword && confirmPassword ? "#ffe6e6" : "white"
                                    }}
                                />
                                <FontAwesomeIcon
                                    icon={showConfirmPassword ? faEye : faEyeSlash}
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    style={{
                                        position: "absolute",
                                        right: "10px",
                                        cursor: "pointer",
                                        color: "#555"
                                    }}
                                />
                            </div>
                            {password !== confirmPassword && confirmPassword && (
                                <p style={{ color: "red", fontSize: "0.9rem", marginTop: "5px" }}>
                                    ❌ Passwords do not match!
                                </p>
                            )}
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
                            Register
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default Register;
