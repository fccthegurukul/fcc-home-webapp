import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaHome, FaTachometerAlt, FaPhoneAlt, FaGamepad, FaTools, FaSignInAlt, FaUserPlus, FaSignOutAlt } from "react-icons/fa";
import './Navbar.css';

const Navbar = ({ isLoggedIn, handleLogout }) => {
  const [isMenuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [location]);

  const toggleMenu = () => {
    setMenuOpen(!isMenuOpen);
  };

  // Updated handleLogout function
  const handleLogoutClick = async () => {
    try {
      // Clear the username cookie
      document.cookie = 'username=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;';

      // Call the handleLogout function passed from the parent component
      await handleLogout();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <nav className="fcc-navbar">
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

        <div className={`fcc-menu-icon ${isMenuOpen ? 'open' : ''}`} onClick={toggleMenu}>
          <div className="fcc-bar"></div>
          <div className="fcc-bar"></div>
          <div className="fcc-bar"></div>
        </div>

        <ul className={`fcc-nav-links ${isMenuOpen ? 'active' : ''}`}>
          <li><Link to="/" className="fcc-nav-link"><FaHome /> होम</Link></li>
          <li><Link to="/dashboard" className="fcc-nav-link"><FaTachometerAlt /> डैशबोर्ड</Link></li>
          <li className="fcc-highlight"><Link to="/troubleshooting" className="fcc-nav-link"><FaTools /> समस्या निवारण</Link></li>
          <li className="fcc-highlight"><Link to="/contact" className="fcc-nav-link"><FaPhoneAlt /> संपर्क करें</Link></li>
          <li><Link to="/puzzle-game" className="fcc-nav-link"><FaGamepad /> गेम</Link></li>

          {!isLoggedIn ? (
            <>
              <li><Link to="/login" className="fcc-nav-link"><FaSignInAlt /> लॉगिन</Link></li>
              <li><Link to="/register" className="fcc-nav-link"><FaUserPlus /> रजिस्टर</Link></li>
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
  );
};

export default Navbar;