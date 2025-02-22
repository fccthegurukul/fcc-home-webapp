import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navbar.css'; // सुनिश्चित करें कि CSS फ़ाइल लिंक है

const Navbar = ({ isLoggedIn, handleLogout }) => {
  const [isMenuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false); // रूट बदलने पर मेनू बंद करें
  }, [location]);

  const toggleMenu = () => {
    setMenuOpen(!isMenuOpen);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
           {/* ब्रांडिंग और लोकेशन लेबल */}
        <div className="branding-area">
          <Link to="/" className="branding-link">एफसीसी होम</Link>
          <div className="location-label">
            <i className="location-icon">📍</i> {/* लोकेशन आइकन */}
            <span className="location-text">Motisabad</span>
          </div>
        </div>

             {/* हैमबर्गर मेनू आइकन (मोबाइल के लिए) */}
             <div className={`menu-icon ${isMenuOpen ? 'open' : ''}`} onClick={toggleMenu}>
          <div className="bar"></div>
          <div className="bar"></div>
          <div className="bar"></div>
        </div>



        {/* नेविगेशन लिंक */}
        <ul className={`nav-links ${isMenuOpen ? 'active' : ''}`}>
          <li><Link to="/" className="nav-link">Home</Link></li>
          <li><Link to="/dashboard" className="nav-link">Dashboard</Link></li>
          { !isLoggedIn && (
            <>
              <li><Link to="/login" className="nav-link">Login</Link></li>
              <li><Link to="/register" className="nav-link">Register</Link></li>
            </>
          )}
          { isLoggedIn && (
            <li>
              <button onClick={handleLogout} className="nav-link logout-button">
                Logout
              </button>
            </li>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;