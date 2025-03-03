import React from 'react';
import { Link } from 'react-router-dom';
import StudentProfile from './StudentProfile'; // StudentProfile component ko import kare
import './HomePage.css';

const HomePage = () => {
  return (
    <div>
      {/* StudentProfile component ko yaha render kare */}
      <StudentProfile />
    </div>
  );
};

export default HomePage;