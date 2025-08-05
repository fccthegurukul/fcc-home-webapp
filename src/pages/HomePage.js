import React from 'react';
import { Link } from 'react-router-dom';
import StudentProfile from './StudentProfile'; // StudentProfile component ko import kare
import ImageCarousel from '../components/component2/ImageCarousel'; // हमारा नया कैरोसेल कंपोनेंट
import './HomePage.css';

const HomePage = () => {
  return (
    <div className="homepage-container">
      <ImageCarousel />

      <div className="main-content">
        <StudentProfile />
      </div>
    </div>
  );
};

export default HomePage;