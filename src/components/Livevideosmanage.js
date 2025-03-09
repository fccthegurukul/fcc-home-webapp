import React, { useEffect, useState } from "react";
import axios from "axios";
import "./LiveVideosManage.css";

const LiveVideosManage = () => {
  const [videos, setVideos] = useState([]);
  const [newVideo, setNewVideo] = useState({
    classroom_name: "",
    video_title: "",
    youtube_url: "",
    live_date: "",
  });
  const [editVideo, setEditVideo] = useState(null);

  const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/live-videos`, {
        headers: {
          "ngrok-skip-browser-warning": "true",
        },
        withCredentials: true, // Include cookies
      });
      setVideos(response.data);
    } catch (error) {
      console.error("Error fetching videos:", error);
    }
  };

  const handleAddVideo = async () => {
    try {
      await axios.post(`${API_BASE_URL}/live-videos`, newVideo, {
        headers: {
          "ngrok-skip-browser-warning": "true",
        },
        withCredentials: true,
      });
      fetchVideos();
      setNewVideo({ classroom_name: "", video_title: "", youtube_url: "", live_date: "" });
    } catch (error) {
      console.error("Error adding video:", error);
    }
  };

  const handleUpdateVideo = async () => {
    try {
      await axios.put(`${API_BASE_URL}/live-videos/${editVideo.video_id}`, editVideo, {
        headers: {
          "ngrok-skip-browser-warning": "true",
        },
        withCredentials: true,
      });
      fetchVideos();
      setEditVideo(null);
    } catch (error) {
      console.error("Error updating video:", error);
    }
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditVideo({ ...editVideo, [name]: value });
  };

  const getYouTubeEmbedUrl = (url) => {
    const videoId = url.split("v=")[1]?.split("&")[0] || url.split("/").pop();
    return `https://www.youtube.com/embed/${videoId}`;
  };

  return (
    <div className="video-management-container">
      <h2>Live Videos Management</h2>

      <div className="video-form">
        <input
          name="classroom_name"
          placeholder="Classroom Name"
          value={newVideo.classroom_name}
          onChange={(e) => setNewVideo({ ...newVideo, classroom_name: e.target.value })}
        />
        <input
          name="video_title"
          placeholder="Video Title"
          value={newVideo.video_title}
          onChange={(e) => setNewVideo({ ...newVideo, video_title: e.target.value })}
        />
        <input
          name="youtube_url"
          placeholder="YouTube URL"
          value={newVideo.youtube_url}
          onChange={(e) => setNewVideo({ ...newVideo, youtube_url: e.target.value })}
        />
        <input
          name="live_date"
          type="date"
          value={newVideo.live_date}
          onChange={(e) => setNewVideo({ ...newVideo, live_date: e.target.value })}
        />
        <button onClick={handleAddVideo}>Add Video</button>
      </div>

      <div className="video-list">
        {videos.map((video) => (
          <div key={video.video_id} className="video-item">
            <h3>
              {video.video_title} ({video.classroom_name})
            </h3>
            <div className="video-embed">
              <iframe
                src={getYouTubeEmbedUrl(video.youtube_url)}
                title={video.video_title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
            <p>Date: {new Date(video.live_date).toLocaleDateString()}</p>
            <button onClick={() => setEditVideo(video)}>Edit</button>
          </div>
        ))}
      </div>

      {editVideo && (
        <div className="edit-form">
          <h3>Edit Video</h3>
          <input
            name="classroom_name"
            value={editVideo.classroom_name}
            onChange={handleEditChange}
            placeholder="Classroom Name"
          />
          <input
            name="video_title"
            value={editVideo.video_title}
            onChange={handleEditChange}
            placeholder="Video Title"
          />
          <input
            name="youtube_url"
            value={editVideo.youtube_url}
            onChange={handleEditChange}
            placeholder="YouTube URL"
          />
          <input
            name="live_date"
            type="date"
            value={editVideo.live_date}
            onChange={handleEditChange}
          />
          <button onClick={handleUpdateVideo}>Update Video</button>
          <button onClick={() => setEditVideo(null)}>Cancel</button>
        </div>
      )}
    </div>
  );
};

export default LiveVideosManage;