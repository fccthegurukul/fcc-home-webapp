import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import QrScanner from "react-qr-scanner";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./StudentsAttendance.css";
// Apne Supabase client ko yahan import karein
import { supabase } from "../utils/supabaseClient"; // Maan liya aapne is path par file rakhi hai

const StudentsAttendance = () => {
  const [fccId, setFccId] = useState("");
  const [ctc, setCtc] = useState(false);
  const [ctg, setCtg] = useState(false);
  const [taskCompleted, setTaskCompleted] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(false);
  const [message, setMessage] = useState("");
  const [successList, setSuccessList] = useState([]);
  const [failedList, setFailedList] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [qrError, setQrError] = useState("");
  const [lastScanTime, setLastScanTime] = useState(0);
  
  const MIN_SCAN_DELAY = 1000; // 1 second minimum delay between scans

  const API_BASE_URL = process.env.REACT_APP_API_URL;
  const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      "ngrok-skip-browser-warning": "true",
    },
  });

  const inputRef = useRef(null);

  const handleInputChange = (e) => {
    const inputValue = e.target.value;
    if (e.inputType === "insertFromPaste") {
      const numericValue = inputValue.replace(/\D/g, "");
      setFccId(numericValue);
    } else if (/^\d{4}$/.test(inputValue)) {
      setFccId(`${inputValue}200025`);
    } else {
      setFccId(inputValue.replace(/\D/g, ""));
    }
  };

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

    // Naya handleSubmit function - YAHAN SARA LOGIC HAI
  const handleSubmit = async (autoScan = false, manualFCCId = null) => {
    const id = manualFCCId !== null ? manualFCCId : fccId;
    if (!id || id.length < 4) {
      toast.error("Please enter a valid FCC ID.");
      playSound("failed");
      setFailedList((prev) => [...prev, id || "invalid"]);
      return;
    }

    try {
      // 1. Check karo student pehle se hai ya nahi
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('fcc_id, ctc_time')
        .eq('fcc_id', id)
        .single(); // .single() ek object dega ya null

      if (studentError && studentError.code !== 'PGRST116') { // PGRST116 ka matlab 'not found', jo ki ek error nahi hai
        throw studentError;
      }
      
      let ctcUpdated = false;
      let message = "";

      // 2. Agar student hai, to update logic
      if (studentData) {
        // 30 ghante wala check
        if (studentData.ctc_time) {
            const ctcTime = new Date(studentData.ctc_time);
            const timeDiff = (new Date() - ctcTime) / (1000 * 60 * 60);
            if (timeDiff > 30 && !forceUpdate && ctc) {
                toast.error("CTC is more than 30 hours old. Use Force Update.");
                playSound("failed");
                setFailedList((prev) => [...prev, id]);
                return;
            }
        }
        
        // Student table ko update karo
        const { error: updateError } = await supabase
            .from('students')
            .update({ 
                ctc_time: ctc ? new Date().toISOString() : studentData.ctc_time,
                ctg_time: ctg ? new Date().toISOString() : undefined, // undefined fields update nahi hote
                task_completed: taskCompleted
            })
            .eq('fcc_id', id);

        if (updateError) throw updateError;
        message = "Student updated successfully.";
        ctcUpdated = true;

      } else {
        // 3. Agar student nahi hai, to naya insert karo
        const { error: insertError } = await supabase
            .from('students')
            .insert({
                fcc_id: id,
                ctc_time: ctc ? new Date().toISOString() : null,
                ctg_time: ctg ? new Date().toISOString() : null,
                task_completed: taskCompleted,
            });
        
        if (insertError) throw insertError;
        message = "New student added and updated.";
        ctcUpdated = true;
      }
      
      // 4. Attendance log me 'upsert' karo (hamesha)
      const { error: logError } = await supabase
        .from('attendance_log')
        .upsert({
            fcc_id: id,
            log_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
            ctc_time: ctc ? new Date().toISOString() : undefined,
            ctg_time: ctg ? new Date().toISOString() : undefined,
            task_completed: taskCompleted,
        }, { onConflict: 'fcc_id, log_date' }); // Yeh ahem hai

      if (logError) throw logError;
      
      // 5. Task submission aur leaderboard logic (agar CTC mark hua hai)
      if (ctc) {
        // Student ka class pata karo
        const { data: classData, error: classError } = await supabase
            .from('new_student_admission')
            .select('fcc_class')
            .eq('fcc_id', id)
            .single();

        if (classError && classError.code !== 'PGRST116') throw classError;
        
        if (classData && classData.fcc_class) {
            const task_name = `Attendance-${new Date().toLocaleDateString('en-GB')}`;
            const score = 10;
            
            // task_submissions me insert karo
            const { error: submissionError } = await supabase
                .from('task_submissions')
                .insert({ fcc_id: id, fcc_class: classData.fcc_class, task_name, score_obtained: score });
            if (submissionError) throw submissionError;

            // leaderboard me insert karo
            const { error: leaderboardError } = await supabase
                .from('leaderboard')
                .insert({ fcc_id: id, fcc_class: classData.fcc_class, task_name, score });
            if (leaderboardError) throw leaderboardError;
        }
      }

      // Sab kuch safal!
      toast.success(message);
      playSound("success");
      setSuccessList((prev) => [...prev, id]);
      if (autoScan) {
        setTimeout(() => {
          setFccId("");
          setScanning(true);
        }, MIN_SCAN_DELAY);
      } else {
        setFccId("");
      }

    } catch (error) {
      const errorMessage = error.message || "Something went wrong.";
      console.error("Supabase operation failed:", error);
      toast.error(errorMessage);
      playSound("failed");
      setFailedList((prev) => [...prev, id]);
      setFccId("");
    }
  };

  useEffect(() => {
    const handleKeyPress = (e) => {
      switch (e.key) {
        case "Enter":
          e.preventDefault();
          handleSubmit();
          break;
        case "d":
          if (e.ctrlKey) {
            e.preventDefault();
            setTaskCompleted((prev) => !prev);
          }
          break;
        case "c":
          if (e.ctrlKey) {
            e.preventDefault();
            setCtc((prev) => !prev);
          }
          break;
        case "g":
          if (e.ctrlKey) {
            e.preventDefault();
            setCtg((prev) => !prev);
          }
          break;
        case "f":
          if (e.ctrlKey) {
            e.preventDefault();
            setForceUpdate((prev) => !prev);
          }
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [fccId, ctc, ctg, taskCompleted, forceUpdate]);

  const playSound = (type) => {
    const soundPath = `/assets/${type}.mp3`;
    const audio = new Audio(soundPath);
    audio.onerror = () => console.error(`Failed to load ${type} sound.`);
    audio.play();
  };

  const getCurrentDateTimeIndia = () => {
    const date = new Date();
    const options = {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    };
    const formatter = new Intl.DateTimeFormat("en-IN", options);
    return formatter.format(date).replace(/,/g, "").replace(/\//g, "-").replace(" ", "_").replace(":", "-");
  };

  const downloadSuccessList = () => {
    const currentDateTimeIndia = getCurrentDateTimeIndia();
    const blob = new Blob([successList.join("\n")], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${currentDateTimeIndia}_success_list.txt`;
    link.click();
  };

  const downloadFailedList = () => {
    const currentDateTimeIndia = getCurrentDateTimeIndia();
    const blob = new Blob([failedList.join("\n")], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${currentDateTimeIndia}_failed_list.txt`;
    link.click();
  };

  const handleScan = (data) => {
    if (data) {
      const currentTime = Date.now();
      if (currentTime - lastScanTime < MIN_SCAN_DELAY) {
        return;
      }

      const scannedText = typeof data === "string" ? data : data.text || "";
      const numericData = scannedText.replace(/[^0-9]/g, "");
      
      setLastScanTime(currentTime);
      setScanning(false);
      handleSubmit(true, numericData);
    }
  };

  const handleError = (err) => {
    console.error("QR Scanner Error:", err);
    setQrError("QR Scanner Error: " + err.message);
    setScanning(false);
  };

  const handleScanClick = () => {
    setScanning(true);
    setQrError("");
    setFccId("");
  };

  const handleScanCancel = () => {
    setScanning(false);
    setQrError("");
  };

  return (
    <div className="attendance-container">
      <h1 className="attendance-header">Students Attendance Management</h1>

      <div className="attendance-main">
        {/* Left Section: Input and Scanner */}
        <div className="attendance-input-section">
          <div className="input-group">
            <label className="input-label">FCC ID:</label>
            <div className="input-row">
              <input
                type="text"
                value={fccId}
                onChange={handleInputChange}
                className="input-field"
                ref={inputRef}
                placeholder="Scan QR or type FCC ID"
              />
              <button onClick={handleScanClick} className="action-button">
                Scan QR
              </button>
            </div>
          </div>

          {scanning && (
            <div className="qr-scanner-section">
              <QrScanner
                delay={300}
                style={{ width: "100%", maxWidth: "300px" }}
                onError={handleError}
                onScan={handleScan}
              />
              <button onClick={handleScanCancel} className="action-button cancel-button">
                Cancel Scan
              </button>
              {qrError && <p className="error-text">{qrError}</p>}
            </div>
          )}
          <div className="checkbox-group">
            <label className="checkbox-label">
              <input type="checkbox" checked={ctc} onChange={(e) => setCtc(e.target.checked)} />
              Coaching to Come (CTC) <span className="shortcut">Ctrl + C</span>
            </label>
            <label className="checkbox-label">
              <input type="checkbox" checked={ctg} onChange={(e) => setCtg(e.target.checked)} />
              Coaching to Go (CTG) <span className="shortcut">Ctrl + G</span>
            </label>
            <label className="checkbox-label">
              <input type="checkbox" checked={taskCompleted} onChange={(e) => setTaskCompleted(e.target.checked)} />
              Task Completed <span className="shortcut">Ctrl + D</span>
            </label>
            <label className="checkbox-label">
              <input type="checkbox" checked={forceUpdate} onChange={(e) => setForceUpdate(e.target.checked)} />
              Force Update CTC <span className="shortcut">Ctrl + F</span>
            </label>
          </div>

          <button onClick={() => handleSubmit()} className="submit-button">
            Submit
          </button>
          {message && <p className="message-text">{message}</p>}
        </div>

        {/* Right Section: Success and Failed Lists */}
        <div className="attendance-results-section">
          <div className="list-container">
            <h2 className="list-header">Success List</h2>
            <ul className="result-list success-list">
              {successList.map((id, index) => (
                <li key={index}>{id}</li>
              ))}
            </ul>
            <button onClick={downloadSuccessList} className="download-button">
              Download Success List
            </button>
          </div>

          <div className="list-container">
            <h2 className="list-header">Failed List</h2>
            <ul className="result-list failed-list">
              {failedList.map((id, index) => (
                <li key={index}>{id}</li>
              ))}
            </ul>
            <button onClick={downloadFailedList} className="download-button">
              Download Failed List
            </button>
          </div>
        </div>
      </div>

      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </div>
  );
};

export default StudentsAttendance;