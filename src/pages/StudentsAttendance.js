import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import QrScanner from "react-qr-scanner";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./StudentsAttendance.css";

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

  const handleSubmit = async (autoScan = false, manualFCCId = null) => {
    const id = manualFCCId !== null ? manualFCCId : fccId;
    if (!id || id.length < 4) {
      toast.error("Please enter a valid FCC ID.");
      playSound("failed");
      setFailedList((prev) => [...prev, id]);
      return;
    }

    try {
      const payload = { fcc_id: id, ctc, ctg, task_completed: taskCompleted, forceUpdate };
      const response = await apiClient.post("/api/update-student", payload);
      const { message, ctcUpdated } = response.data;

      setMessage(message);
      if (ctcUpdated) {
        toast.success(message);
        playSound("success");
        setSuccessList((prev) => [...prev, id]);
        if (autoScan) {
          setTimeout(() => {
            setFccId("");
            setScanning(true);
          }, 500);
        } else {
          setFccId("");
        }
      } else {
        toast.error(message);
        playSound("failed");
        setFailedList((prev) => [...prev, id]);
        setFccId("");
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Something went wrong.";
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
      const scannedText = typeof data === "string" ? data : data.text || "";
      const numericData = scannedText.replace(/[^0-9]/g, "");
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
                facingMode="environment"  // <-- Back camera enable karne ke liye yeh prop add karein
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