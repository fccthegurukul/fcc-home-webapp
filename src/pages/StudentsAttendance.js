import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import QrScanner from "react-qr-scanner"; // Import the QR scanner component
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "../pages/StudentsAttendance.css";

const StudentsAttendance = () => {
  const [fccId, setFccId] = useState("");
  const [ctc, setCtc] = useState(false);
  const [ctg, setCtg] = useState(false);
  const [taskCompleted, setTaskCompleted] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(false);
  const [message, setMessage] = useState("");
  const [successList, setSuccessList] = useState([]); // List of successful submissions
  const [failedList, setFailedList] = useState([]); // List of failed submissions

  // State for QR scanning
  const [scanning, setScanning] = useState(false);
  const [qrError, setQrError] = useState("");

  const inputRef = useRef(null);

  // Handle input changes for FCC ID (manual entry)
  const handleInputChange = (e) => {
    const inputValue = e.target.value;

    // Check if the user is pasting data
    if (e.inputType === "insertFromPaste") {
      const numericValue = inputValue.replace(/\D/g, ""); // Remove non-numeric characters
      setFccId(numericValue);
    } else if (/^\d{4}$/.test(inputValue)) {
      // If the input is exactly 4 digits, append "200025"
      setFccId(`${inputValue}200025`);
    } else {
      setFccId(inputValue.replace(/\D/g, "")); // Filter non-numeric characters
    }
  };

  // Ensure the input field is focused on page load
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  /**
   * Modified handleSubmit now accepts two optional parameters:
   * - autoScan (boolean): if true, the function was triggered by a QR scan.
   * - manualFCCId (string): if provided, use this value instead of state.
   */
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

      const response = await axios.post("http://localhost:5000/api/update-student", payload);
      const { message, ctcUpdated } = response.data;

      setMessage(message);

      if (ctcUpdated) {
        toast.success(message);
        playSound("success");
        setSuccessList((prev) => [...prev, id]);

        // If triggered via QR scan and attendance was successful, clear the FCC ID and re-open scanner after a short delay.
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

  // Keyboard controls remain unchanged.
  useEffect(() => {
    const handleKeyPress = (e) => {
      switch (e.key) {
        case "Enter":
          e.preventDefault();
          handleSubmit(); // Manual submission
          break;
        case "d":
          if (e.ctrlKey) {
            e.preventDefault();
            setTaskCompleted((prev) => !prev); // Toggle "Task Completed"
          }
          break;
        case "c":
          if (e.ctrlKey) {
            e.preventDefault();
            setCtc((prev) => !prev); // Toggle "Coaching to Come"
          }
          break;
        case "g":
          if (e.ctrlKey) {
            e.preventDefault();
            setCtg((prev) => !prev); // Toggle "Coaching to Go"
          }
          break;
        case "f":
          if (e.ctrlKey) {
            e.preventDefault();
            setForceUpdate((prev) => !prev); // Toggle "Force Update"
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);

    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [fccId, ctc, ctg, taskCompleted, forceUpdate]);

  // Play success or failure sound
  const playSound = (type) => {
    const soundPath = `/assets/${type}.mp3`;
    const audio = new Audio(soundPath);
    audio.onerror = () => {
      console.error(`Failed to load ${type} sound.`);
    };
    audio.play();
  };

  // Function to get current date and time in India (IST) in YYYY-MM-DD_HH-MM-SS AM/PM format
  const getCurrentDateTimeIndia = () => {
    const date = new Date();
    const options = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata'
    };

    const formatter = new Intl.DateTimeFormat('en-IN', options);
    const formattedDateTime = formatter.format(date).replace(/,/g, '').replace(/\//g, '-');

    return formattedDateTime.replace(" ", "_").replace(":", "-");
  };

  // Function to download Success List
  const downloadSuccessList = () => {
    const currentDateTimeIndia = getCurrentDateTimeIndia();
    const blob = new Blob([successList.join("\n")], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${currentDateTimeIndia}_success_list.txt`;
    link.click();
  };

  // Function to download Failed List
  const downloadFailedList = () => {
    const currentDateTimeIndia = getCurrentDateTimeIndia();
    const blob = new Blob([failedList.join("\n")], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${currentDateTimeIndia}_failed_list.txt`;
    link.click();
  };

  // ===== QR Scanner Functions =====

  // When a QR code is scanned, update the FCC ID and auto-submit attendance.
  const handleScan = (data) => {
    if (data) {
      // Extract text from scanned data (works if data is a string or an object with a 'text' property)
      const scannedText = typeof data === "string" ? data : data.text ? data.text : "";
      const numericData = scannedText.replace(/[^0-9]/g, "");
      // Stop scanning to avoid duplicate reads
      setScanning(false);
      // Automatically call handleSubmit with autoScan true and pass the scanned FCC ID.
      handleSubmit(true, numericData);
    }
  };

  // Handle any errors from the QR scanner
  const handleError = (err) => {
    console.error("QR Scanner Error:", err);
    setQrError("QR Scanner Error: " + err.message);
    setScanning(false);
  };

  // Start the QR scanning process
  const handleScanClick = () => {
    setScanning(true);
    setQrError("");
    setFccId("");
  };

  // Cancel QR scanning
  const handleScanCancel = () => {
    setScanning(false);
    setQrError("");
  };

  return (
    <div className="container">
      <h1 className="header">Students Attendance Management</h1>

      <div className="inputGroup2">
        <label className="label2">FCC ID:</label>
        <input
          type="text"
          value={fccId}
          onChange={handleInputChange}
          className="input"
          ref={inputRef}
          placeholder="Scan QR or type FCC ID"
        />
        {/* Button to start QR scanning */}
        <button onClick={handleScanClick} className="button" style={{ marginLeft: "10px" }}>
          Scan QR Code
        </button>
      </div>

      {/* Conditionally render the QR scanner */}
      {scanning && (
        <div className="qrScannerContainer">
          <QrScanner
            delay={300}
            style={{ width: "300px" }}
            onError={handleError}
            onScan={handleScan}
          />
          <button onClick={handleScanCancel} className="button" style={{ marginTop: "10px" }}>
            Cancel Scan
          </button>
          {qrError && <p className="error">{qrError}</p>}
        </div>
      )}

      <div className="inputGroup2">
        <label className="label2">
          <input
            type="checkbox"
            checked={ctc}
            onChange={(e) => setCtc(e.target.checked)}
          />
          Coaching to Come (CTC) ctrl + c
        </label>
        <label className="label2">
          <input
            type="checkbox"
            checked={ctg}
            onChange={(e) => setCtg(e.target.checked)}
          />
          Coaching to Go (CTG) ctrl + g 
        </label>
        <label className="label2">
          <input
            type="checkbox"
            checked={taskCompleted}
            onChange={(e) => setTaskCompleted(e.target.checked)}
          />
          Task Completed ctrl + d 
        </label>
      </div>
      <div className="inputGroup2">
        <label className="label2">
          <input
            type="checkbox"
            checked={forceUpdate}
            onChange={(e) => setForceUpdate(e.target.checked)}
          />
          Force Update CTC 
        </label>
      </div>
      <button onClick={() => handleSubmit()} className="button">
        Submit
      </button>
      {message && <p className="message">{message}</p>}

      {/* Success and Failed Lists */}
      <div className="resultLists">
        <h2>Success List</h2>
        <ul>
          {successList.map((id, index) => (
            <li key={index}>{id}</li>
          ))}
        </ul>
        <h2>Failed List</h2>
        <ul>
          {failedList.map((id, index) => (
            <li key={index}>{id}</li>
          ))}
        </ul>
      </div>

      <div className="downloadButtons">
        <button onClick={downloadSuccessList} className="button">
          Download Success List
        </button>
        <button onClick={downloadFailedList} className="button">
          Download Failed List
        </button>
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
