import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  FaHome,
  FaTachometerAlt,
  FaSignInAlt,
  FaUserPlus,
  FaSignOutAlt,
  FaBars,
  FaExternalLinkAlt,
} from "react-icons/fa";
import './Navbar.css';

const Navbar = ({ isLoggedIn, handleLogout }) => {
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [isNavbarVisible, setNavbarVisible] = useState(true);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [location]);

  const toggleMenu = () => {
    setMenuOpen(!isMenuOpen);
  };

  const toggleNavbarVisibility = () => {
    setNavbarVisible(!isNavbarVisible);
  };

  const handleLogoutClick = async () => {
    try {
      document.cookie = 'username=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;';
      await handleLogout();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <>
      <nav className={`fcc-navbar ${isNavbarVisible ? '' : 'hidden'}`}>
        <div className="fcc-navbar-container">
          <div className="fcc-branding-area">
            <Link to="/" className="fcc-branding-link">
              एफसीसी होम
              <span className="fcc-beta-badge">Beta Version</span>
            </Link>
            <div className="fcc-location-label">
              <i className="fcc-location-icon">📍</i>
              <span className="fcc-location-text">Motisabad</span>
            </div>
          </div>

          <div className="fcc-controls">
            <button className="fcc-toggle-navbar" onClick={toggleNavbarVisibility}>
              <FaBars /> {isNavbarVisible ? 'छुपाएं' : 'दिखाएं'}
            </button>
            <div className={`fcc-menu-icon ${isMenuOpen ? 'open' : ''}`} onClick={toggleMenu}>
              <div className="fcc-bar"></div>
              <div className="fcc-bar"></div>
              <div className="fcc-bar"></div>
            </div>
          </div>

          <ul className={`fcc-nav-links ${isMenuOpen ? 'active' : ''}`}>
            <li><Link to="/" className="fcc-nav-link"><FaHome /> होम</Link></li>
            <li><Link to="/dashboard" className="fcc-nav-link"><FaTachometerAlt /> डैशबोर्ड</Link></li>

            {/* Commented unused items */}
            {/*
            <li className="fcc-highlight"><Link to="/troubleshooting" className="fcc-nav-link"><FaTools /> समस्या निवारण</Link></li>
            <li className="fcc-highlight"><Link to="/contact" className="fcc-nav-link"><FaPhoneAlt /> संपर्क करें</Link></li>
            <li><Link to="/puzzle-game" className="fcc-nav-link"><FaGamepad /> गेम</Link></li>
            */}

            {/* ✅ External links */}
            <li>
              <a href="http://resultbuzz.com/" className="fcc-nav-link" target="_blank" rel="noopener noreferrer">
                <FaExternalLinkAlt /> ResultBuzz
              </a>
            </li>
            <li>
              <a href="https://fccthegurukul.in/" className="fcc-nav-link" target="_blank" rel="noopener noreferrer">
                <FaExternalLinkAlt /> FCC The Gurukul
              </a>
            </li>

            {!isLoggedIn ? (
              <>
                {/* <li><Link to="/login" className="fcc-nav-link"><FaSignInAlt /> लॉगिन</Link></li> */}
                {/* <li><Link to="/register" className="fcc-nav-link"><FaUserPlus /> रजिस्टर</Link></li> */}
              </>
            ) : (
              <li>
                <button onClick={handleLogoutClick} className="fcc-nav-link fcc-logout-button">
                  <FaSignOutAlt /> लॉगआउट
                </button>
              </li>
            )}
          </ul>
        </div>
      </nav>

      {!isNavbarVisible && (
        <button className="fcc-show-navbar-popup" onClick={toggleNavbarVisibility}>
          <FaBars /> नैवबार दिखाएं
        </button>
      )}
    </>
  );
};

export default Navbar;
