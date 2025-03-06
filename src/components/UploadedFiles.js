// Frontend: React Component for Uploaded Files
import React, { useState, useEffect } from "react";
import axios from "axios";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import "./UploadedFiles.css";

const UploadedFiles = () => {
  const [files, setFiles] = useState([]);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const API_BASE_URL = process.env.REACT_APP_API_URL; // Define base URL from env variable

  // Function to fetch files
  const fetchFiles = async (params = {}) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/files`, { params }); // Updated URL
      setFiles(response.data);
    } catch (error) {
      console.error("Error fetching files:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch files on component mount and when filters change
  useEffect(() => {
    const params = {};
    if (startDate) params.startDate = startDate.toISOString().split("T")[0];
    if (endDate) params.endDate = endDate.toISOString().split("T")[0];
    if (searchTerm) params.search = searchTerm;

    fetchFiles(params);
  }, [startDate, endDate, searchTerm]);

  return (
    <div style={{ padding: "20px" }}>
      <h2>Uploaded Files</h2>

      {/* Filters */}
      <div style={{ marginBottom: "20px" }}>
        <label>
          Start Date:
          <DatePicker
            selected={startDate}
            onChange={(date) => setStartDate(date)}
            dateFormat="yyyy-MM-dd"
            selectsStart
            startDate={startDate}
            endDate={endDate}
            placeholderText="Select start date"
          />
        </label>
        <label style={{ marginLeft: "20px" }}>
          End Date:
          <DatePicker
            selected={endDate}
            onChange={(date) => setEndDate(date)}
            dateFormat="yyyy-MM-dd"
            selectsEnd
            startDate={startDate}
            endDate={endDate}
            minDate={startDate}
            placeholderText="Select end date"
          />
        </label>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by filename or description"
          style={{ marginLeft: "20px", padding: "5px" }}
        />
        <button
          onClick={() => {
            setStartDate(null);
            setEndDate(null);
            setSearchTerm("");
            fetchFiles(); // Reset filters
          }}
          style={{
            marginLeft: "20px",
            padding: "5px 10px",
            backgroundColor: "#dc3545",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Clear Filters
        </button>
      </div>

      {/* Loading Indicator */}
      {loading && <p>Loading files...</p>}

      {/* Files Table */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "20px" }}>
        <thead>
          <tr>
            <th style={{ border: "1px solid #ddd", padding: "8px" }}>Filename</th>
            <th style={{ border: "1px solid #ddd", padding: "8px" }}>Description</th>
            <th style={{ border: "1px solid #ddd", padding: "8px" }}>Uploaded At</th>
            <th style={{ border: "1px solid #ddd", padding: "8px" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {files.length === 0 && !loading ? (
            <tr>
              <td colSpan="4" style={{ textAlign: "center", padding: "20px" }}>
                No files found
              </td>
            </tr>
          ) : (
            files.map((file) => (
              <tr key={file.id}>
                <td style={{ border: "1px solid #ddd", padding: "8px" }}>{file.filename}</td>
                <td style={{ border: "1px solid #ddd", padding: "8px" }}>{file.description}</td>
                <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                  {new Date(file.uploaded_at).toLocaleString()}
                </td>
                <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                  <button
                    onClick={async () => {
                      try {
                        const response = await axios.get(
                          `${API_BASE_URL}/files/download/${file.id}`, // Updated URL
                          { responseType: "blob" }
                        );

                        const url = window.URL.createObjectURL(new Blob([response.data]));
                        const link = document.createElement("a");
                        link.href = url;
                        link.setAttribute("download", file.filename);
                        document.body.appendChild(link);
                        link.click();
                        link.parentNode.removeChild(link);
                      } catch (error) {
                        console.error("Error downloading file:", error);
                      }
                    }}
                    style={{
                      padding: "5px 10px",
                      backgroundColor: "#28a745",
                      color: "#fff",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    Download
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default UploadedFiles;