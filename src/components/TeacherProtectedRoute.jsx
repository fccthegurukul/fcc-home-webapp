import { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";
import { useLocation } from "react-router-dom";
import "./TeacherPopup.css";

const TeacherProtectedRoute = ({ children }) => {
  const [verified, setVerified] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [teacherId, setTeacherId] = useState("");
  const [error, setError] = useState("");
  const location = useLocation();

  useEffect(() => {
    const storedId = localStorage.getItem("teacher_id");

    if (storedId) {
      const logAccess = async () => {
        await supabase.from("access_logs").insert([
          {
            teacher_id: storedId,
            page: location.pathname,
          },
        ]);
      };

      logAccess(); // Auto log on auto-login
      setVerified(true);
    } else {
      setShowPrompt(true);
    }
  }, [location.pathname]);
const handleVerify = async () => {
  if (!teacherId.trim()) {
    setError("Please enter your Teacher ID.");
    return;
  }

  const { data, error } = await supabase
    .from("front_login")
    .select("*")
    .eq("teacher_id", teacherId)
    .single();

  if (error || !data) {
    // ❌ Log failed attempt
    await supabase.from("access_logs").insert([
      {
        teacher_id: teacherId,
        page: location.pathname,
        name: "unknown", // failed attempt
      },
    ]);

    setError("Invalid Teacher ID. Access Denied.");
    return;
  }

  // ✅ Successful login
  localStorage.setItem("teacher_id", teacherId);

  await supabase.from("access_logs").insert([
    {
      teacher_id: teacherId,
      name: data.name,
      page: location.pathname,
    },
  ]);

  setVerified(true);
  setShowPrompt(false);
};


  if (verified) return children;

  return (
    <>
      {showPrompt && (
        <div className="popup-overlay">
          <div className="popup-modal">
            <h2>🔐 Teacher Access</h2>
            <input
              type="text"
              placeholder="Enter your Teacher ID"
              value={teacherId}
              onChange={(e) => {
                setError("");
                setTeacherId(e.target.value);
              }}
            />
            {error && <p className="error-message">{error}</p>}
            <button onClick={handleVerify}>Submit</button>
          </div>
        </div>
      )}
    </>
  );
};

export default TeacherProtectedRoute;
