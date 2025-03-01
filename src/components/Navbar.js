// Navbar.js
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navbar.css';

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
          <Link to="/" className="branding-link">
            एफसीसी होम
            <span className="beta-badge">Beta</span>
          </Link>
          <div className="location-label">
            <i className="location-icon">📍</i>
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
          <li><Link to="/" className="nav-link">होम</Link></li>
          <li><Link to="/dashboard" className="nav-link">डैशबोर्ड</Link></li>
          <li><Link to="/contact" className="nav-link">संपर्क</Link></li>
          <li><Link to="/puzzle-game" className="nav-link">पहेली</Link></li>
          {!isLoggedIn && (
            <>
              <li><Link to="/login" className="nav-link">लॉगिन</Link></li>
              <li><Link to="/register" className="nav-link">रजिस्टर</Link></li>
            </>
          )}
          {isLoggedIn && (
            <li>
              <button onClick={handleLogout} className="nav-link logout-button">
                लॉगआउट
              </button>
            </li>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;