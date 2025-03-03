import React, { useState, useEffect, useRef } from 'react';
import './PuzzleGame.css';

const PuzzleGame = () => {
  const initialTiles = [1, 2, 3, 4, 5, 6, 7, 8, null];
  const [tiles, setTiles] = useState(initialTiles);
  const [moves, setMoves] = useState(0);
  const [time, setTime] = useState(0);
  const [isGameActive, setIsGameActive] = useState(false);
  const [isSolved, setIsSolved] = useState(false);
  const [userName, setUserName] = useState(localStorage.getItem('userName') || '');
  const [secretCode, setSecretCode] = useState(localStorage.getItem('secretCode') || '');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(!userName || !secretCode);
  const messagesEndRef = useRef(null);

  // Tiles shuffle logic
  const shuffleTiles = () => {
    const shuffled = [...initialTiles];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setTiles(shuffled);
    setMoves(0);
    setTime(0);
    setIsGameActive(true);
    setIsSolved(false);
  };

  // Timer logic
  useEffect(() => {
    let timer;
    if (isGameActive && !isSolved) {
      timer = setInterval(() => setTime((prev) => prev + 1), 1000);
    }
    return () => clearInterval(timer);
  }, [isGameActive, isSolved]);

  // Auto-scroll effect
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [tiles]);

  // Check if puzzle is solved
  const checkWin = (newTiles) => {
    return newTiles.every((tile, index) => tile === initialTiles[index]);
  };

  // Move tiles logic
  const moveTile = (index) => {
    if (!isGameActive || isSolved) return;

    const emptyIndex = tiles.indexOf(null);
    const validMoves = [emptyIndex - 1, emptyIndex + 1, emptyIndex - 3, emptyIndex + 3];

    if (validMoves.includes(index) && Math.abs(emptyIndex - index) !== 2) {
      const newTiles = [...tiles];
      [newTiles[emptyIndex], newTiles[index]] = [newTiles[index], newTiles[emptyIndex]];
      setTiles(newTiles);
      setMoves((prev) => prev + 1);

      if (checkWin(newTiles)) {
        setIsSolved(true);
        setIsGameActive(false);
        saveScore();
      }
    }
  };

  // Save score to backend
  const saveScore = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/puzzle-score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName, secretCode, moves, time_taken: time }),
      });
      const result = await response.json();
      console.log('स्कोर सहेजा गया:', result);
    } catch (error) {
      console.error('स्कोर सहेजने में त्रुटि:', error);
    }
  };

  // Handle user login and save to Local Storage
  const handleLogin = (e) => {
    e.preventDefault();
    if (userName.trim() && secretCode.trim()) {
      localStorage.setItem('userName', userName);
      localStorage.setItem('secretCode', secretCode);
      setIsLoginModalOpen(false);
      shuffleTiles();
    }
  };

  return (
    <div className="puzzle-game-container">
      {/* Timeline Animation */}
      <div className="timeline">
        <div className="timeline-bar">
          <span>..........</span>
        </div>
      </div>

      <h1>संख्या पहेली खेल</h1>
      <p className="subtitle">टाइल्स को सही क्रम में लगाओ, {userName || 'खिलाड़ी'}!</p>

      <div className="game-stats">
        <span>चालें: {moves}</span>
        <span>समय: {time} सेकंड</span>
      </div>

      <div className="puzzle-grid">
        {tiles.map((tile, index) => (
          <div
            key={index}
            className={`tile ${tile === null ? 'empty' : ''} ${isSolved && tile !== null ? 'solved' : ''}`}
            onClick={() => moveTile(index)}
            style={{
              transform: tile !== null ? 'rotateY(0deg) scale(1)' : 'rotateY(180deg) scale(0.9)',
              transition: 'transform 0.5s ease, background 0.3s ease',
            }}
          >
            {tile}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {isSolved && (
        <div className="win-message">
          <h2>बधाई हो, {userName}! आपने पहेली हल कर ली!</h2>
          <p>चालें: {moves} | समय: {time} सेकंड</p>
        </div>
      )}

      <div className="game-controls">
        <button onClick={shuffleTiles} disabled={isGameActive && !isSolved}>
          नया खेल शुरू करें
        </button>
        <button onClick={() => setIsLoginModalOpen(true)} disabled={isGameActive && !isSolved}>
          खिलाड़ी रीसेट करें
        </button>
      </div>

      {/* Login Modal */}
      {isLoginModalOpen && (
        <div className="login-modal">
          <div className="modal-content">
            <h2>संख्या पहेली में आपका स्वागत है</h2>
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label>आपका नाम</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="अपना नाम दर्ज करें"
                  required
                />
              </div>
              <div className="form-group">
                <label>गुप्त कोड (अपना कोई भी चुनें)</label>
                <input
                  type="text"
                  value={secretCode}
                  onChange={(e) => setSecretCode(e.target.value)}
                  placeholder="अपना कोड दर्ज करें"
                  required
                />
              </div>
              <button type="submit">खेल शुरू करें</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PuzzleGame;
