import React, { useState, useEffect, useRef } from 'react';
import './PuzzleGame.css';

const PuzzleGame = () => {
  const initialTiles = [1, 2, 3, 4, 5, 6, 7, 8, null];
  const [tiles, setTiles] = useState(initialTiles);
  const [moves, setMoves] = useState(0);
  const [time, setTime] = useState(0);
  const [isGameActive, setIsGameActive] = useState(false);
  const [isSolved, setIsSolved] = useState(false);
  const [userName, setUserName] = useState('');
  const [secretCode, setSecretCode] = useState('');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(true);
  const messagesEndRef = useRef(null);

  // Shuffle tiles
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

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [tiles]);

  // Check win condition
  const checkWin = (newTiles) => {
    return newTiles.every((tile, index) => tile === initialTiles[index]);
  };

  // Move tile with smooth animation
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

  // Save score to backend (optional)
  const saveScore = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/puzzle-score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName, secretCode, moves, time_taken: time }),
      });
      const result = await response.json();
      console.log('Score saved:', result);
    } catch (error) {
      console.error('Error saving score:', error);
    }
  };

  // Handle login
  const handleLogin = (e) => {
    e.preventDefault();
    if (userName.trim() && secretCode.trim()) {
      setIsLoginModalOpen(false);
      shuffleTiles();
    }
  };

  return (
    <div className="puzzle-game-container">
      {/* Animated Timeline */}
      <div className="timeline">
        <div className="timeline-bar">
          <span>New Game Coming in 5 Days!</span>
        </div>
      </div>

      <h1>Number Slider Puzzle</h1>
      <p className="subtitle">Arrange the tiles in order, {userName || 'Player'}!</p>

      <div className="game-stats">
        <span>Moves: {moves}</span>
        <span>Time: {time}s</span>
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
          <h2>Congratulations, {userName}! You Solved It!</h2>
          <p>Moves: {moves} | Time: {time}s</p>
        </div>
      )}

      <div className="game-controls">
        <button onClick={shuffleTiles} disabled={isGameActive && !isSolved}>
          New Game
        </button>
        <button onClick={() => setIsLoginModalOpen(true)} disabled={isGameActive && !isSolved}>
          Reset Player
        </button>
      </div>

      {/* Login Modal */}
      {isLoginModalOpen && (
        <div className="login-modal">
          <div className="modal-content">
            <h2>Welcome to the Puzzle</h2>
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label>Your Name</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Enter your name"
                  required
                />
              </div>
              <div className="form-group">
                <label>Secret Code</label>
                <input
                  type="text"
                  value={secretCode}
                  onChange={(e) => setSecretCode(e.target.value)}
                  placeholder="Enter your code"
                  required
                />
              </div>
              <button type="submit">Start Game</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PuzzleGame;