import React, { useState } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import UploadedFiles from "./UploadedFiles"; // Import the UploadedFiles component
import "./FileUpload.css";

const FileUpload = () => {
  const [file, setFile] = useState(null);
  const [description, setDescription] = useState("");
  const [uploadStatus, setUploadStatus] = useState("");
  const apiUrl = process.env.REACT_APP_API_URL; // Define apiUrl from .env

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file || !description) {
      toast.error("Please select a file and enter a description.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("description", description);

    try {
      const response = await axios.post(`${apiUrl}/upload`, formData, { // Use apiUrl
        headers: {
          "Content-Type": "multipart/form-data",
          "ngrok-skip-browser-warning": "true" // Add ngrok bypass header
        },
      });

      setUploadStatus("File uploaded successfully!");
      toast.success("File uploaded successfully!"); // Show success toast
      console.log(response.data); // Log the uploaded file data
    } catch (error) {
      console.error("Error uploading file:", error);
      setUploadStatus("Error uploading file.");
      toast.error("Error uploading file!"); // Show error toast
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>File Upload</h2>
      <div>
        <input type="file" onChange={handleFileChange} />
      </div>
      <div style={{ marginTop: "10px" }}>
        <input
          type="text"
          placeholder="Enter description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{
            width: "100%",
            padding: "8px",
            marginBottom: "10px",
            border: "1px solid #ccc",
            borderRadius: "4px",
          }}
        />
      </div>
      <button
        onClick={handleUpload}
        style={{
          padding: "10px 20px",
          backgroundColor: "#007bff",
          color: "#fff",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        Upload
      </button>

      {/* Show upload status */}
      {uploadStatus && <p style={{ marginTop: "20px" }}>{uploadStatus}</p>}

      {/* Display UploadedFiles component below the upload form */}
      <UploadedFiles />

      {/* Toast Container for Notifications */}
      <ToastContainer />
    </div>
  );
};

export default FileUpload;