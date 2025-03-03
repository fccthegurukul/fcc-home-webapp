import React, { useState, useEffect } from "react";
import { FaTools, FaWhatsapp, FaEnvelope } from "react-icons/fa";

const Troubleshooting = () => {
    const [issue, setIssue] = useState(() => {
        return localStorage.getItem("userIssue") || "सर्वर स्टार्ट / वेबसाइट काम नहीं कर रही";
    });

    useEffect(() => {
        localStorage.setItem("userIssue", issue);
    }, [issue]);

    const getCurrentTime = () => {
        return new Date().toLocaleString();
    };

    const sendWhatsAppMessage = () => {
        const encodedMessage = encodeURIComponent(
            `🔧 सर्वर समस्या अनुरोध\n📝 समस्या: ${issue}\n⏰ समय: ${getCurrentTime()}`
        );
        const adminPhoneNumber = "9135365331";
        const url = `https://wa.me/${adminPhoneNumber}?text=${encodedMessage}`;
        window.open(url, "_blank");
    };

    const sendEmail = () => {
        const subject = encodeURIComponent("सर्वर समस्या अनुरोध");
        const body = encodeURIComponent(`📝 समस्या: ${issue}\n⏰ समय: ${getCurrentTime()}`);
        const email = "support@example.com";
        const mailtoLink = `mailto:${email}?subject=${subject}&body=${body}`;
        window.location.href = mailtoLink;
    };

    return (
        <div style={styles.container}>
            <h2 style={styles.heading}>
                <FaTools /> समस्या निवारण
            </h2>
            <p style={styles.description}>
                यदि वेबसाइट काम नहीं कर रही है, तो सर्वर पुनः प्रारंभ करने का अनुरोध करें।
            </p>

            <label style={styles.label}>समस्या का विवरण:</label>
            <textarea
                value={issue}
                onChange={(e) => setIssue(e.target.value)}
                rows="4"
                style={styles.textarea}
            />

            <button onClick={sendWhatsAppMessage} style={{ ...styles.button, backgroundColor: "#218838" }}>
                <FaWhatsapp /> व्हाट्सएप अनुरोध भेजें
            </button>

            <button onClick={sendEmail} style={{ ...styles.button, backgroundColor: "#D44638" }}>
                <FaEnvelope /> Gmail अनुरोध भेजें
            </button>
        </div>
    );
};

const styles = {
    container: {
        maxWidth: "400px",
        margin: "20px auto",
        padding: "15px",
        backgroundColor: "#f9f9f9",
        borderRadius: "10px",
        boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.1)",
        textAlign: "center",
    },
    heading: {
        fontSize: "20px",
        fontWeight: "bold",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
        color: "#333",
    },
    description: {
        fontSize: "14px",
        color: "#555",
        marginBottom: "10px",
    },
    label: {
        fontSize: "14px",
        fontWeight: "bold",
        color: "#333",
        display: "block",
        textAlign: "left",
        marginBottom: "5px",
    },
    textarea: {
        width: "100%",
        padding: "10px",
        fontSize: "14px",
        borderRadius: "5px",
        border: "1px solid #ccc",
        resize: "none",
    },
    button: {
        width: "100%",
        padding: "12px",
        color: "#fff",
        fontSize: "16px",
        border: "none",
        borderRadius: "5px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        marginTop: "10px",
    },
};

export default Troubleshooting;
