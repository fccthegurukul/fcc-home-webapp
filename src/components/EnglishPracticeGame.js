import React, { useState, useEffect } from 'react';
import './EnglishPracticeGame.css';

const EnglishPracticeGame = () => {
  const [isListening, setIsListening] = useState(false);
  const [spokenText, setSpokenText] = useState('');
  const [feedback, setFeedback] = useState('');
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [userName, setUserName] = useState('');
  const [secretCode, setSecretCode] = useState('');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(true);
  const [hintsLeft, setHintsLeft] = useState(3);
  const [isGameActive, setIsGameActive] = useState(false);

  // Speech Recognition Setup
  const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.continuous = false;
  recognition.lang = 'en-US';
  recognition.interimResults = false;

  recognition.onresult = (event) => {
    const text = event.results[0][0].transcript;
    setSpokenText(text);
    analyzeSpeech(text);
  };

  recognition.onend = () => {
    setIsListening(false);
  };

  recognition.onerror = (event) => {
    setFeedback('Error recognizing speech: ' + event.error);
    setIsListening(false);
  };

  // Start listening
  const startListening = () => {
    if (!isListening && isGameActive) {
      setSpokenText('');
      setFeedback('');
      setIsListening(true);
      recognition.start();
    }
  };

  // Analyze spoken text with AI
  const analyzeSpeech = async (text) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/analyze-speech`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, level }),
      });
      const result = await response.json();

      if (response.ok) {
        setFeedback(result.feedback);
        setScore((prev) => prev + result.score);
        if (result.score >= 10 && level < 3) {
          setLevel((prev) => prev + 1);
          setHintsLeft(3);
        }
      } else {
        setFeedback('Error analyzing speech. Try again.');
      }
    } catch (error) {
      setFeedback('Server error. Please try again.');
      console.error('Error:', error);
    }
  };

  // Save progress to backend
  const saveProgress = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/english-progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName, secretCode, level, score }),
      });
      const result = await response.json();
      console.log('Progress saved:', result);
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  // Get hint from AI
  const getHint = () => {
    if (hintsLeft <= 0 || !isGameActive) return;
    setFeedback('Hint: Try saying a simple sentence like "I am learning English."');
    setHintsLeft((prev) => prev - 1);
  };

  // Handle login
  const handleLogin = (e) => {
    e.preventDefault();
    if (userName.trim() && secretCode.trim()) {
      setIsLoginModalOpen(false);
      setIsGameActive(true);
    }
  };

  // Reset game
  const resetGame = () => {
    setScore(0);
    setLevel(1);
    setHintsLeft(3);
    setSpokenText('');
    setFeedback('');
    setIsGameActive(true);
  };

  // Save progress when game becomes inactive and score exists
  useEffect(() => {
    if (!isGameActive && score > 0) {
      saveProgress();
    }
  }, [isGameActive, score, saveProgress]); // निर्भरताएँ जोड़ीं

  return (
    <div className="english-practice-container">
      <div className="timeline">
        <div className="timeline-bar">
          <span>New Challenges Coming in 5 Days!</span>
        </div>
      </div>

      <h1>English Speaking Practice</h1>
      <p className="subtitle">Improve your English with AI, {userName || 'Learner'}!</p>

      <div className="game-stats">
        <span>Score: {score}</span>
        <span>Level: {level}</span>
        <span>Hints Left: {hintsLeft}</span>
      </div>

      <div className="speech-area">
        <button onClick={startListening} disabled={isListening || !isGameActive}>
          {isListening ? 'Listening...' : 'Speak Now'}
        </button>
        <p className="spoken-text">{spokenText || 'Say something...'}</p>
      </div>

      {feedback && (
        <div className="feedback">
          <h3>Feedback</h3>
          <p>{feedback}</p>
        </div>
      )}

      <div className="game-controls">
        <button onClick={getHint} disabled={hintsLeft <= 0 || !isGameActive}>Get Hint</button>
        <button onClick={resetGame}>Reset Game</button>
        <button onClick={() => setIsLoginModalOpen(true)}>Change Player</button>
      </div>

      {isLoginModalOpen && (
        <div className="login-modal">
          <div className="modal-content">
            <h2>Welcome to English Practice</h2>
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
              <button type="submit">Start Learning</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnglishPracticeGame;