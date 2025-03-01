import React, { useState, useEffect } from 'react';
import './EnglishPracticeAssistant.css';

const EnglishPracticeAssistant = () => {
  const [isListening, setIsListening] = useState(false);
  const [spokenText, setSpokenText] = useState('');
  const [typedText, setTypedText] = useState('');
  const [feedback, setFeedback] = useState('');
  const [conversationHistory, setConversationHistory] = useState([]);
  const [userName, setUserName] = useState('');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Speech Recognition सेटअप
  const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.continuous = false;
  recognition.lang = 'en-US';
  recognition.interimResults = false;

  recognition.onresult = (event) => {
    const text = event.results[0][0].transcript;
    setSpokenText(text);
    analyzeSpeech(text);
  };

  recognition.onend = () => setIsListening(false);

  recognition.onerror = (event) => {
    setFeedback('आवाज़ पहचानने में त्रुटि: ' + event.error);
    setIsListening(false);
  };

  // बोलना शुरू करें
  const startListening = () => {
    if (!isListening) {
      setSpokenText('');
      setFeedback('');
      setIsListening(true);
      recognition.start();
    }
  };

  // टाइप किए गए टेक्स्ट को सबमिट करें
  const submitTypedText = () => {
    if (typedText.trim()) {
      analyzeSpeech(typedText);
      setTypedText('');
    }
  };

  // AI के साथ विश्लेषण
  const analyzeSpeech = async (text) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/analyze-speech`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, history: conversationHistory }),
      });
      const result = await response.json();

      if (response.ok) {
        setFeedback(result.feedback);
        setConversationHistory((prev) => [...prev, { user: text, ai: result.feedback }]);
      } else {
        setFeedback('विश्लेषण में त्रुटि। फिर से कोशिश करें।');
      }
    } catch (error) {
      setFeedback('सर्वर त्रुटि। कृपया फिर से कोशिश करें।');
    }
  };

  // AI का जवाब सुनें
  const speakFeedback = (text) => {
    if (!isSpeaking) {
      setIsSpeaking(true);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  // लॉगिन हैंडल करें
  const handleLogin = (e) => {
    e.preventDefault();
    if (userName.trim()) {
      setIsLoginModalOpen(false);
    }
  };

  return (
    <div className="english-practice-container">
      <h1>English Speaking Assistant</h1>
      <p className="subtitle">अपनी अंग्रेजी प्रैक्टिस करें, {userName || 'सीखने वाले'}!</p>

      <div className="conversation-area">
        {conversationHistory.map((entry, index) => (
          <div key={index} className="conversation-entry">
            <p className="user-text"><strong>आप:</strong> {entry.user}</p>
            <p className="ai-text">
              <strong>AI:</strong>{" "}
              <span dangerouslySetInnerHTML={{ __html: entry.ai }} />
              <button onClick={() => speakFeedback(entry.ai.replace(/<[^>]+>/g, ''))} className="speak-button">
                🔊
              </button>
            </p>
          </div>
        ))}
      </div>

      <div className="input-area">
        <div className="speech-area">
          <button onClick={startListening} disabled={isListening}>
            {isListening ? 'सुन रहा हूँ...' : 'अब बोलें'}
          </button>
          <p className="spoken-text">{spokenText || 'आपने बोला...'}</p>
        </div>

        <div className="type-area">
          <input
            type="text"
            value={typedText}
            onChange={(e) => setTypedText(e.target.value)}
            placeholder="या टाइप करें..."
          />
          <button onClick={submitTypedText}>भेजें</button>
        </div>
      </div>

      {feedback && (
        <div className="feedback">
          <h3>नवीनतम फीडबैक</h3>
          <p dangerouslySetInnerHTML={{ __html: feedback }} />
          <button onClick={() => speakFeedback(feedback.replace(/<[^>]+>/g, ''))} className="speak-button">
            🔊
          </button>
        </div>
      )}

      {isLoginModalOpen && (
        <div className="login-modal">
          <div className="modal-content">
            <h2>English Practice में आपका स्वागत है</h2>
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label>आपका नाम</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="अपना नाम डालें"
                  required
                />
              </div>
              <button type="submit">प्रैक्टिस शुरू करें</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnglishPracticeAssistant;