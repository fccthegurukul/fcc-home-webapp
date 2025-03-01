// import React, { useState, useEffect } from 'react';
// import './ColorMatchGame.css';

// const ColorMatchGame = () => {
//   const colors = ['#e74c3c', '#3498db', '#27ae60', '#f1c40f', '#8e44ad', '#e67e22', '#2ecc71']; // More colors
//   const levels = {
//     1: { colorsToMatch: 2, speed: 2000, rounds: 5, penalty: 0.5 },
//     2: { colorsToMatch: 3, speed: 1500, rounds: 8, penalty: 1 },
//     3: { colorsToMatch: 4, speed: 1000, rounds: 12, penalty: 1.5 },
//   };

//   const [level, setLevel] = useState(1);
//   const [colorPattern, setColorPattern] = useState([]);
//   const [userPattern, setUserPattern] = useState([]);
//   const [score, setScore] = useState(0);
//   const [timeLeft, setTimeLeft] = useState(levels[1].speed / 1000);
//   const [isGameActive, setIsGameActive] = useState(false);
//   const [roundsLeft, setRoundsLeft] = useState(levels[1].rounds);
//   const [userName, setUserName] = useState('');
//   const [secretCode, setSecretCode] = useState('');
//   const [isLoginModalOpen, setIsLoginModalOpen] = useState(true);
//   const [hintsLeft, setHintsLeft] = useState(3);
//   const [message, setMessage] = useState('');

//   // Generate random color pattern
//   const generatePattern = () => {
//     const pattern = [];
//     for (let i = 0; i < levels[level].colorsToMatch; i++) {
//       pattern.push(colors[Math.floor(Math.random() * colors.length)]);
//     }
//     setColorPattern(pattern);
//     setUserPattern([]);
//     setTimeLeft(levels[level].speed / 1000);
//   };

//   // Game loop
//   useEffect(() => {
//     let timer;
//     if (isGameActive && roundsLeft > 0 && timeLeft > 0) {
//       timer = setInterval(() => {
//         setTimeLeft((prev) => {
//           if (prev <= 0) {
//             setRoundsLeft((prev) => prev - 1);
//             setMessage('Time’s up! Round lost.');
//             generatePattern();
//             return levels[level].speed / 1000;
//           }
//           return prev - 0.1;
//         });
//       }, 100);
//     } else if (roundsLeft <= 0) {
//       setIsGameActive(false);
//       saveScore();
//     }
//     return () => clearInterval(timer);
//   }, [isGameActive, timeLeft, roundsLeft, level]);

//   // Handle color click
//   const handleColorClick = (clickedColor) => {
//     if (!isGameActive) return;

//     const newUserPattern = [...userPattern, clickedColor];
//     setUserPattern(newUserPattern);

//     const currentIndex = newUserPattern.length - 1;
//     if (newUserPattern[currentIndex] !== colorPattern[currentIndex]) {
//       setScore((prev) => Math.max(0, prev - 10));
//       setTimeLeft((prev) => Math.max(0, prev - levels[level].penalty));
//       setMessage('Wrong color! Time penalty applied.');
//       setUserPattern([]);
//       return;
//     }

//     if (newUserPattern.length === colorPattern.length) {
//       setScore((prev) => prev + 20 * level);
//       setRoundsLeft((prev) => prev - 1);
//       setMessage('Perfect match! Next round.');
//       generatePattern();
//     }
//   };

//   // Help system with penalty
//   const getHint = () => {
//     if (!isGameActive || hintsLeft <= 0) return;
//     const nextColor = colorPattern[userPattern.length];
//     setMessage(`Hint: Next color is ${nextColor}. (-5 points)`);
//     setScore((prev) => Math.max(0, prev - 5));
//     setHintsLeft((prev) => prev - 1);
//   };

//   // Save score to backend
//   const saveScore = async () => {
//     try {
//       const response = await fetch(`${process.env.REACT_APP_API_URL}/api/color-match-score`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ userName, secretCode, level, score }),
//       });
//       const result = await response.json();
//       console.log('Score saved:', result);
//     } catch (error) {
//       console.error('Error saving score:', error);
//     }
//   };

//   // Handle login
//   const handleLogin = (e) => {
//     e.preventDefault();
//     if (userName.trim() && secretCode.trim()) {
//       setIsLoginModalOpen(false);
//       setIsGameActive(true);
//       generatePattern();
//     }
//   };

//   // Start new game
//   const startNewGame = () => {
//     setScore(0);
//     setRoundsLeft(levels[level].rounds);
//     setHintsLeft(3);
//     setMessage('');
//     setIsGameActive(true);
//     generatePattern();
//   };

//   // Change level
//   const changeLevel = (newLevel) => {
//     if (!isGameActive) {
//       setLevel(newLevel);
//       setRoundsLeft(levels[newLevel].rounds);
//       startNewGame();
//     }
//   };

//   return (
//     <div className="color-match-container">
//       <div className="timeline">
//         <div className="timeline-bar">
//           <span>New Game Coming in 5 Days!</span>
//         </div>
//       </div>

//       <h1>Advanced Color Match</h1>
//       <p className="subtitle">Match the pattern, {userName || 'Player'}!</p>

//       <div className="game-stats">
//         <span>Score: {score}</span>
//         <span>Time Left: {timeLeft.toFixed(1)}s</span>
//         <span>Rounds Left: {roundsLeft}</span>
//         <span>Hints Left: {hintsLeft}</span>
//       </div>

//       <div className="level-selector">
//         <button onClick={() => changeLevel(1)} disabled={level === 1 && isGameActive}>Level 1</button>
//         <button onClick={() => changeLevel(2)} disabled={level === 2 && isGameActive}>Level 2</button>
//         <button onClick={() => changeLevel(3)} disabled={level === 3 && isGameActive}>Level 3</button>
//       </div>

//       {isGameActive && colorPattern.length > 0 && (
//         <div className="color-pattern">
//           {colorPattern.map((color, index) => (
//             <div
//               key={index}
//               className="pattern-box"
//               style={{ backgroundColor: color }}
//             />
//           ))}
//         </div>
//       )}

//       <div className="color-buttons">
//         {colors.map((color) => (
//           <div
//             key={color}
//             className="color-button"
//             style={{ backgroundColor: color }}
//             onClick={() => handleColorClick(color)}
//           />
//         ))}
//       </div>

//       {message && (
//         <div className={`message ${message.includes('Perfect') ? 'success' : 'error'}`}>
//           {message}
//         </div>
//       )}

//       {!isGameActive && roundsLeft <= 0 && (
//         <div className="win-message">
//           <h2>Game Over, {userName}!</h2>
//           <p>Final Score: {score} | Level: {level}</p>
//         </div>
//       )}

//       <div className="game-controls">
//         <button onClick={startNewGame} disabled={isGameActive}>New Game</button>
//         <button onClick={getHint} disabled={!isGameActive || hintsLeft <= 0}>Get Hint</button>
//         <button onClick={() => setIsLoginModalOpen(true)} disabled={isGameActive}>Reset Player</button>
//       </div>

//       {isLoginModalOpen && (
//         <div className="login-modal">
//           <div className="modal-content">
//             <h2>Welcome to Color Match</h2>
//             <form onSubmit={handleLogin}>
//               <div className="form-group">
//                 <label>Your Name</label>
//                 <input
//                   type="text"
//                   value={userName}
//                   onChange={(e) => setUserName(e.target.value)}
//                   placeholder="Enter your name"
//                   required
//                 />
//               </div>
//               <div className="form-group">
//                 <label>Secret Code</label>
//                 <input
//                   type="text"
//                   value={secretCode}
//                   onChange={(e) => setSecretCode(e.target.value)}
//                   placeholder="Enter your code"
//                   required
//                 />
//               </div>
//               <button type="submit">Start Game</button>
//             </form>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default ColorMatchGame;