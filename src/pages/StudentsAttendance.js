import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
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
  const inputRef = useRef(null);


  // Handle input changes for FCC ID
  const handleInputChange = (e) => {
    const inputValue = e.target.value;

    // Check if the user is pasting data
    if (e.inputType === "insertFromPaste") {
      const numericValue = inputValue.replace(/\D/g, ""); // Remove non-numeric characters
      setFccId(numericValue);
    } else if (/^\d{4}$/.test(inputValue)) {
      // If the input is exactly 4 digits, append "200024"
      setFccId(`${inputValue}200024`);
    } else {
      setFccId(inputValue.replace(/\D/g, "")); // Filter non-numeric characters
    }
  };

  // Ensure the input field is focused on page load
  useEffect(() => {
    inputRef.current.focus();
  }, []);

  // Handle form submission
  const handleSubmit = async () => {
    if (!fccId || fccId.length < 4) {
      toast.error("Please enter a valid FCC ID.");
      playSound("failed");
      setFailedList((prev) => [...prev, fccId]); // Add to failed list
      return;
    }

    try {
      const payload = { fcc_id: fccId, ctc, ctg, task_completed: taskCompleted, forceUpdate };

      const response = await axios.post("http://localhost:5000/api/update-student", payload);
      const { message, ctcUpdated } = response.data;

      setMessage(message);

      if (ctcUpdated) {
        toast.success(message);
        playSound("success");
        setSuccessList((prev) => [...prev, fccId]); // Add to success list
      } else {
        toast.error(message);
        playSound("failed");
        setFailedList((prev) => [...prev, fccId]); // Add to failed list
      }

      setFccId(""); // Clear the input field
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Something went wrong.";
      toast.error(errorMessage);
      playSound("failed");
      setFailedList((prev) => [...prev, fccId]); // Add to failed list
    }
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e) => {
      switch (e.key) {
        case "Enter":
          e.preventDefault(); // Prevent default form submission
          handleSubmit(); // Call handleSubmit
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

    // Cleanup listener on unmount
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [fccId, ctc, ctg, taskCompleted, forceUpdate]); // Include dependencies

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
    hour12: true, // 12-hour format with AM/PM
    timeZone: 'Asia/Kolkata' // Indian Standard Time (IST)
  };
  
  const formatter = new Intl.DateTimeFormat('en-IN', options);
  const formattedDateTime = formatter.format(date).replace(/,/g, '').replace(/\//g, '-'); // Formatting the output

  return formattedDateTime.replace(" ", "_").replace(":", "-"); // Replace space and colon for valid filename
};

// Function to download Success List
const downloadSuccessList = () => {
  const currentDateTimeIndia = getCurrentDateTimeIndia();
  const blob = new Blob([successList.join("\n")], { type: "text/plain;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${currentDateTimeIndia}_success_list.txt`; // Filename with current date and time in IST
  link.click();
};

// Function to download Failed List
const downloadFailedList = () => {
  const currentDateTimeIndia = getCurrentDateTimeIndia();
  const blob = new Blob([failedList.join("\n")], { type: "text/plain;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${currentDateTimeIndia}_failed_list.txt`; // Filename with current date and time in IST
  link.click();
};


  return (
    <div className="container">
      <h1 className="header">Students Attendance Management</h1>
      <div className="inputGroup">
        <label className="label">FCC ID:</label>
        <input
          type="text"
          value={fccId}
          onChange={handleInputChange}
          className="input"
          ref={inputRef}
        />
      </div>
      <div className="inputGroup">
        <label className="label">
          <input
            type="checkbox"
            checked={ctc}
            onChange={(e) => setCtc(e.target.checked)}
          />
          Coaching to Come (CTC) ctrl + c
        </label>
        <label className="label">
          <input
            type="checkbox"
            checked={ctg}
            onChange={(e) => setCtg(e.target.checked)}
          />
          Coaching to Go (CTG) ctrl + g 
        </label>
        <label className="label">
          <input
            type="checkbox"
            checked={taskCompleted}
            onChange={(e) => setTaskCompleted(e.target.checked)}
          />
          Task Completed ctrl + d 
        </label>
      </div>
      <div className="inputGroup">
        <label className="label">
          <input
            type="checkbox"
            checked={forceUpdate}
            onChange={(e) => setForceUpdate(e.target.checked)}
          />
          Force Update CTC 
        </label>
      </div>
      <button onClick={handleSubmit} className="button">
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
