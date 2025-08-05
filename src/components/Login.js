import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";

// App.js से पास किए गए props को यहाँ प्राप्त करें
const Login = ({ setIsLoggedIn, logUserActivity }) => {
  const [fccId, setFccId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // यह हुक उपयोगकर्ता को स्वचालित रूप से लॉग इन करने का प्रयास करता है यदि वे पहले से ही लॉग इन हैं
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const user = JSON.parse(storedUser);
        console.log("User found in localStorage, attempting auto-login:", user);
        setIsLoggedIn(true);
        navigate("/dashboard", { replace: true });
      }
    } catch (e) {
      console.error("Failed to parse user from localStorage", e);
      localStorage.removeItem("user");
      localStorage.removeItem("loginTimestamp");
    }
  }, [navigate, setIsLoggedIn]);

  // यह फ़ंक्शन लॉगिन प्रयासों को `login_log` टेबल में लॉग करता है (यह वैकल्पिक है, लेकिन अच्छा है)
  const logLoginAttempt = async (userData, attemptedId, status) => {
    try {
      const { error: logError } = await supabase.from("login_log").insert({
        user_uuid: userData ? userData.id : null,
        teacher_id_attempted: attemptedId,
        status: status,
      });

      if (logError) {
        console.error("Error while logging login attempt:", logError.message);
      }
    } catch (err) {
      console.error("An unexpected error occurred in logLoginAttempt:", err);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const trimmedFccId = fccId.trim();

    if (!trimmedFccId) {
      setError("FCC ID is required.");
      setLoading(false);
      return;
    }

    try {
      // Supabase से उपयोगकर्ता डेटा प्राप्त करने का प्रयास करें
      const { data, error: fetchError } = await supabase
        .from("front_login")
        .select("id, teacher_id, name, accessType")
        .ilike("teacher_id", trimmedFccId)
        .single();

      // यदि उपयोगकर्ता नहीं मिला या कोई त्रुटि हुई
      if (fetchError) {
        console.error("Supabase fetch error:", fetchError.message);
        setError("Invalid FCC ID. User not found or connection issue.");
        await logLoginAttempt(null, trimmedFccId, "failure");
        
        // `user_activity_log` में असफल लॉगिन को लॉग करें
        if (logUserActivity) {
          await logUserActivity("Login Failure", { 
            attemptedId: trimmedFccId, 
            error: "Invalid FCC ID" 
          });
        }
        setLoading(false);
        return;
      }

      // लॉगिन सफल
      console.log("Login successful! User data:", data);
      
      // 1. सबसे पहले localStorage में उपयोगकर्ता डेटा सेट करें
      localStorage.setItem("user", JSON.stringify(data));
      localStorage.setItem('loginTimestamp', Date.now().toString()); 

      if (data.accessType) {
        localStorage.setItem("accessType", data.accessType);
      } else {
        localStorage.removeItem("accessType");
      }
      
      // 2. इसके बाद ऐप की isLoggedIn स्टेट को अपडेट करें
      setIsLoggedIn(true);

      // 3. `login_log` में सफल प्रयास को लॉग करें
      await logLoginAttempt(data, trimmedFccId, "success");

      // 4. `user_activity_log` में सफल लॉगिन को लॉग करें
      // हम सीधे Supabase में डेटा भेज रहे हैं ताकि user_uuid के null होने की समस्या न हो
      if (logUserActivity) {
          await supabase.from('user_activity_log').insert([{
              user_name: data.name || 'logged_in_user',
              session_id: null, // Session ID App.js में प्रबंधित होती है
              page_url: '/login',
              activity_type: 'Login Success',
              activity_details: JSON.stringify({
                  is_logged_in: true, // हम जानते हैं कि यह सच है
                  user_uuid: data.id, // यहाँ से सीधे UUID भेजें
              })
          }]);
      }

      // 5. उपयोगकर्ता को डैशबोर्ड पर भेजें
      navigate("/dashboard", { replace: true });

    } catch (err) {
      console.error("An unexpected JavaScript error during login:", err);
      setError("An unexpected error occurred. Please try again.");
      await logLoginAttempt(null, trimmedFccId, "failure");
      
       // `user_activity_log` में अप्रत्याशित त्रुटि को भी लॉग करें
      if (logUserActivity) {
          await logUserActivity("Login Failure", { 
            attemptedId: trimmedFccId, 
            error: err.message 
          });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        backgroundColor: "#f4f4f4",
        padding: "20px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: "2rem",
          borderRadius: "10px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
          width: "100%",
          maxWidth: "400px",
          textAlign: "center",
        }}
      >
        <h2 style={{ marginBottom: "1.5rem", color: "#333", fontWeight: "600" }}>
          Member Login
        </h2>

        {error && (
          <p style={{ color: "#D32F2F", backgroundColor: "#FFEBEE", padding: '10px', borderRadius: '5px', marginBottom: "1rem" }}>
            {error}
          </p>
        )}

        <form
          onSubmit={handleLogin}
          style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          <div style={{ textAlign: "left" }}>
            <label htmlFor="fccId" style={{ fontWeight: "bold", color: "#555" }}>
              Enter Your FCC ID:
            </label>
            <input
              type="text"
              id="fccId"
              value={fccId}
              onChange={(e) => setFccId(e.target.value)}
              required
              placeholder="e.g., FCC001"
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "5px",
                border: "1px solid #ccc",
                marginTop: "5px",
                fontSize: "1rem",
                boxSizing: 'border-box'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              backgroundColor: loading ? "#B0BEC5" : "#007BFF",
              color: "#fff",
              padding: "12px",
              border: "none",
              borderRadius: "5px",
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: "1rem",
              fontWeight: "bold",
              transition: "background-color 0.3s",
              marginTop: '10px'
            }}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;