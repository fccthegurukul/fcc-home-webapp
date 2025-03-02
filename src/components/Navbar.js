import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
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

  return (
    <nav className="fcc-navbar">
      <div className="fcc-navbar-container">
        <div className="fcc-branding-area">
          <Link to="/" className="fcc-branding-link">
            एफसीसी होम
            <span className="fcc-beta-badge">Beta</span>
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
          <li><Link to="/" className="fcc-nav-link">होम</Link></li>
          <li><Link to="/dashboard" className="fcc-nav-link">डैशबोर्ड</Link></li>
          <li><Link to="/contact" className="fcc-nav-link">संपर्क</Link></li>
          <li><Link to="/puzzle-game" className="fcc-nav-link">पहेली</Link></li>
          {!isLoggedIn && (
            <>
              <li><Link to="/login" className="fcc-nav-link">लॉगिन</Link></li>
              <li><Link to="/register" className="fcc-nav-link">रजिस्टर</Link></li>
            </>
          )}
          {isLoggedIn && (
            <li>
              <button onClick={handleLogout} className="fcc-nav-link fcc-logout-button">
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
