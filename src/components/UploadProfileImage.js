import React, { useState } from "react";

const UploadProfileImage = () => {
  const [fccId, setFccId] = useState("");
  const [image, setImage] = useState(null);
  const [message, setMessage] = useState("");

  const API_BASE_URL = process.env.REACT_APP_API_URL; // Define base URL from env variable

  const handleFileChange = (e) => {
    setImage(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!fccId || !image) {
      setMessage("Please provide both FCC ID and an image.");
      return;
    }

    const formData = new FormData();
    formData.append("profile_image", image);
    formData.append("fcc_id", fccId);

    try {
      const response = await fetch(`${API_BASE_URL}/upload-profile-image`, {
        method: "POST",
        headers: {
          "ngrok-skip-browser-warning": "true", // Added to bypass ngrok warning
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("Profile image uploaded successfully.");
      } else {
        setMessage(data.error || "Failed to upload profile image.");
      }
    } catch (err) {
      console.error(err);
      setMessage("An error occurred while uploading the image.");
    }
  };

  return (
    <div>
      <h1>Upload Student Profile Image</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>FCC ID:</label>
          <input
            type="text"
            value={fccId}
            onChange={(e) => setFccId(e.target.value)}
            placeholder="Enter FCC ID"
            required
          />
        </div>
        <div>
          <label>Profile Image:</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            required
          />
        </div>
        <button type="submit">Upload</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
};

export default UploadProfileImage;