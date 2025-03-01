import React, { useState, useEffect } from 'react';
import './EnglishPracticeAssistant.css';

const EnglishPracticeAssistant = () => {
  const [isListening, setIsListening] = useState(false);
  const [spokenText, setSpokenText] = useState('');
  const [typedText, setTypedText] = useState('');
  const [correctedVersion, setCorrectedVersion] = useState('');
  const [hindiAnalysis, setHindiAnalysis] = useState('');
  const [score, setScore] = useState(null);
  const [badge, setBadge] = useState('');
  const [correctedScore, setCorrectedScore] = useState(null);
  const [correctedBadge, setCorrectedBadge] = useState('');
  const [secretInfo, setSecretInfo] = useState('');
  const [nextQuestion, setNextQuestion] = useState('');
  const [nextQuestionHindi, setNextQuestionHindi] = useState('');
  const [miniInfo, setMiniInfo] = useState('');
  const [personalizedMessage, setPersonalizedMessage] = useState('');
  const [conversationHistory, setConversationHistory] = useState([]);
  const [userName, setUserName] = useState('');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false); // Default to false
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hindiPrompt, setHindiPrompt] = useState(false);

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

  recognition.onend = () => setIsListening(false);

  recognition.onerror = (event) => {
    setHindiAnalysis('आपकी आवाज पहचानने में त्रुटि: ' + event.error);
    setIsListening(false);
  };

  // Fetch Conversation History
  const fetchConversationHistory = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/conversation-history?userName=${userName}`);
      const data = await response.json();
      if (response.ok) setConversationHistory(data);
    } catch (error) {
      console.error('Error fetching conversation history:', error);
    }
  };

  // Load username from localStorage on component mount
  useEffect(() => {
    const savedUserName = localStorage.getItem('userName');
    if (savedUserName) {
      setUserName(savedUserName);
      setIsLoginModalOpen(false); // Skip modal if name exists
      fetchConversationHistory(); // Load history directly
    } else {
      setIsLoginModalOpen(true); // Show modal if no name is saved
    }
  }, []);

  // Start Listening
  const startListening = () => {
    if (!isListening) {
      setSpokenText('');
      setTypedText('');
      setCorrectedVersion('');
      setHindiAnalysis('');
      setScore(null);
      setBadge('');
      setCorrectedScore(null);
      setCorrectedBadge('');
      setSecretInfo('');
      setNextQuestion('');
      setNextQuestionHindi('');
      setMiniInfo('');
      setPersonalizedMessage('');
      setHindiPrompt(false);
      setIsListening(true);
      recognition.start();
    }
  };

  // Submit Typed Text
  const submitTypedText = () => {
    if (typedText.trim()) {
      if (hindiPrompt) analyzeHindiResponse(typedText);
      else analyzeSpeech(typedText);
      setTypedText('');
    }
  };

  // Analyze Speech with AI
  const analyzeSpeech = async (text) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/analyze-speech`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, history: conversationHistory, userName }),
      });
      const result = await response.json();

      if (response.ok) {
        setSpokenText(text);
        setCorrectedVersion(result.correctedVersion);
        setHindiAnalysis(result.hindiAnalysis);
        setScore(result.score);
        setBadge(result.badge);
        setCorrectedScore(result.correctedScore);
        setCorrectedBadge(result.correctedBadge);
        setSecretInfo(result.secretInfo);
        setNextQuestion(result.nextQuestion || 'What happens next?');
        setNextQuestionHindi(result.nextQuestionHindi || 'आगे क्या होता है?');
        setMiniInfo(result.miniInfo || 'इससे आपको अंग्रेजी बोलने की प्रैक्टिस मिलेगी!');
        setPersonalizedMessage(result.personalizedMessage || 'प्रैक्टिस करते रहें!');
        setHindiPrompt(result.score <= 10);
        setConversationHistory((prev) => [
          ...prev,
          {
            user_input: text,
            corrected_version: result.correctedVersion,
            hindi_analysis: result.hindiAnalysis,
            score: result.score,
            badge: result.badge,
            corrected_score: result.correctedScore,
            corrected_badge: result.correctedBadge,
            secret_info: result.secretInfo,
            next_question: result.nextQuestion,
            next_question_hindi: result.nextQuestionHindi,
            mini_info: result.miniInfo,
            personalized_message: result.personalizedMessage,
          },
        ]);

        if (result.correctedVersion) speakFeedback(result.correctedVersion);
        setTimeout(() => {
          if (result.nextQuestion) speakFeedback(`Now say: ${result.nextQuestion}`);
        }, 2000);
      } else {
        setHindiAnalysis('कुछ गलत हो गया। दोबारा कोशिश करें!');
        setScore(0);
        setBadge('Needs Improvement');
        setCorrectedScore(100);
        setCorrectedBadge('Excellent');
      }
    } catch (error) {
      setHindiAnalysis('सर्वर त्रुटि। दोबारा कोशिश करें!');
      setScore(0);
      setBadge('Needs Improvement');
      setCorrectedScore(100);
      setCorrectedBadge('Excellent');
    } finally {
      setIsLoading(false);
    }
  };

  // Analyze Hindi Response
  const analyzeHindiResponse = async (hindiText) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/analyze-speech`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: hindiText, history: conversationHistory, userName }),
      });
      const result = await response.json();

      if (response.ok) {
        setSpokenText(hindiText);
        setCorrectedVersion(result.correctedVersion);
        setHindiAnalysis(result.hindiAnalysis);
        setScore(result.score);
        setBadge(result.badge);
        setCorrectedScore(result.correctedScore);
        setCorrectedBadge(result.correctedBadge);
        setSecretInfo(result.secretInfo);
        setNextQuestion(result.nextQuestion || 'What happens next?');
        setNextQuestionHindi(result.nextQuestionHindi || 'आगे क्या होता है?');
        setMiniInfo(result.miniInfo || 'इससे आपको अंग्रेजी बोलने की प्रैक्टिस मिलेगी!');
        setPersonalizedMessage(result.personalizedMessage || 'प्रैक्टिस करते रहें!');
        setHindiPrompt(false);
        setConversationHistory((prev) => [
          ...prev,
          {
            user_input: hindiText,
            corrected_version: result.correctedVersion,
            hindi_analysis: result.hindiAnalysis,
            score: result.score,
            badge: result.badge,
            corrected_score: result.correctedScore,
            corrected_badge: result.correctedBadge,
            secret_info: result.secretInfo,
            next_question: result.nextQuestion,
            next_question_hindi: result.nextQuestionHindi,
            mini_info: result.miniInfo,
            personalized_message: result.personalizedMessage,
          },
        ]);

        if (result.correctedVersion) speakFeedback(result.correctedVersion);
        setTimeout(() => {
          if (result.nextQuestion) speakFeedback(`Now say: ${result.nextQuestion}`);
        }, 2000);
      } else {
        setHindiAnalysis('कुछ गलत हो गया। दोबारा कोशिश करें!');
        setScore(0);
        setBadge('Needs Improvement');
        setCorrectedScore(100);
        setCorrectedBadge('Excellent');
      }
    } catch (error) {
      setHindiAnalysis('सर्वर त्रुटि। दोबारा कोशिश करें!');
      setScore(0);
      setBadge('Needs Improvement');
      setCorrectedScore(100);
      setCorrectedBadge('Excellent');
    } finally {
      setIsLoading(false);
    }
  };

  // Speak AI Feedback
  const speakFeedback = (text) => {
    if (!isSpeaking) {
      setIsSpeaking(true);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  // Handle Login and Save to LocalStorage
  const handleLogin = (e) => {
    e.preventDefault();
    if (userName.trim()) {
      localStorage.setItem('userName', userName); // Save to localStorage
      setIsLoginModalOpen(false);
      fetchConversationHistory();
    }
  };

  // Format text with symbols
  const formatText = (text) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/"(.*?)"/g, '<q>$1</q>')
      .replace(/--/g, '—')
      .replace(/~/g, '<span class="highlight">~</span>');
  };

  // Calculate Progress (average score)
  const averageScore = conversationHistory.length > 0
    ? Math.round(conversationHistory.reduce((sum, entry) => sum + entry.score, 0) / conversationHistory.length)
    : 0;

  return (
    <div className="english-practice-container">
      <header className="header">
        <h1>English Speaking Assistant</h1>
        <p className="subtitle">Improve your English with practice, {userName || 'Learner'}!</p>
        {conversationHistory.length > 0 && (
          <div className="progress-bar">
            <span>आपकी प्रगति: {averageScore}%</span>
            <div className="progress-fill" style={{ width: `${averageScore}%` }}></div>
          </div>
        )}
      </header>

      <main className="main-content">
        <section className="input-section">
          <div className="input-wrapper">
            <div className="speech-input">
              <button onClick={startListening} disabled={isListening || isLoading} className="action-button speak-btn">
                {isListening ? 'सुन रहा है...' : '🎤 अभी बोलें'}
              </button>
              <p className="spoken-text">{spokenText || 'आपके बोले हुए शब्द यहां दिखेंगे...'}</p>
            </div>
            <div className="type-input">
              <input
                type="text"
                value={typedText}
                onChange={(e) => setTypedText(e.target.value)}
                placeholder={hindiPrompt ? 'हिंदी में बताएं आप क्या बोलना चाहते हैं...' : 'या अपना वाक्य यहां टाइप करें...'}
                disabled={isLoading}
              />
              <button onClick={submitTypedText} disabled={isLoading} className="action-button send-btn">
                {isLoading ? 'विश्लेषण कर रहा है...' : '➤ भेजें'}
              </button>
            </div>
            {nextQuestion && (
              <div className="next-question-preview">
                <p><strong>अगला सवाल:</strong> {nextQuestion}</p>
                <p className="hindi-translation">{nextQuestionHindi}</p>
                <p className="mini-info">{miniInfo}</p>
              </div>
            )}
          </div>
        </section>

        {(correctedVersion || hindiAnalysis) && (
          <section className="feedback-section">
            {isLoading ? (
              <p className="loading-text">आपके इनपुट का विश्लेषण कर रहा है...</p>
            ) : (
              <div className="feedback-cards">
                <div className="card corrected-card">
                  <h4>इसके बजाय यह कहें:</h4>
                  <p><strong>आपने कहा:</strong> {spokenText}</p>
                  <p><strong>सही संस्करण:</strong> {correctedVersion}</p>
                  <div className="score-comparison">
                    <span>आपके अंक: {score}% - {badge}</span>
                    <span>संभावित स्कोर: {correctedScore}% - {correctedBadge}</span>
                  </div>
                  <button
                    onClick={() => speakFeedback(correctedVersion)}
                    className="speak-button"
                    disabled={isSpeaking}
                  >
                    🔊
                  </button>
                </div>
                <div className="card analysis-card">
                  <h4>यह बेहतर क्यों है (हिंदी):</h4>
                  <p dangerouslySetInnerHTML={{ __html: formatText(hindiAnalysis) }} />
                  {personalizedMessage && (
                    <p className="personalized-message">{personalizedMessage}</p>
                  )}
                  {secretInfo && (
                    <p className="secret-info">टिप: <span>{secretInfo}</span></p>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        <section className="conversation-section">
          <h3>आपका अभ्यास इतिहास</h3>
          <div className="conversation-area">
            {conversationHistory.length === 0 ? (
              <p className="empty-history">अपना इतिहास यहां देखने के लिए अभ्यास शुरू करें!</p>
            ) : (
              conversationHistory.map((entry, index) => (
                <div key={index} className="conversation-entry">
                  <p className="user-text"><strong>आप:</strong> {entry.user_input}</p>
                  <div className="card corrected-card">
                    <h4>इसके बजाय यह कहें:</h4>
                    <p><strong>आपने कहा:</strong> {entry.user_input}</p>
                    <p><strong>सही संस्करण:</strong> {entry.corrected_version}</p>
                    <div className="score-comparison">
                      <span>आपके अंक: {entry.score}% - {entry.badge}</span>
                      <span>संभावित स्कोर: {entry.corrected_score}% - {entry.corrected_badge}</span>
                    </div>
                    <button
                      onClick={() => speakFeedback(entry.corrected_version)}
                      className="speak-button"
                      disabled={isSpeaking}
                    >
                      🔊
                    </button>
                  </div>
                  <div className="card analysis-card">
                    <h4>यह बेहतर क्यों है (हिंदी):</h4>
                    <p dangerouslySetInnerHTML={{ __html: formatText(entry.hindi_analysis) }} />
                    {entry.personalized_message && (
                      <p className="personalized-message">{entry.personalized_message}</p>
                    )}
                    <p className="secret-info">टिप: <span>{entry.secret_info}</span></p>
                  </div>
                  {entry.next_question && (
                    <div className="card next-question-card">
                      <h4>अगला सवाल:</h4>
                      <p>{entry.next_question}</p>
                      <p className="hindi-translation">{entry.next_question_hindi}</p>
                      <p className="mini-info">{entry.mini_info}</p>
                      <button
                        onClick={() => speakFeedback(entry.next_question)}
                        className="speak-button"
                        disabled={isSpeaking}
                      >
                        🔊
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      </main>

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
                  placeholder="अपना नाम दर्ज करें"
                  required
                />
              </div>
              <button type="submit" className="action-button">अभ्यास शुरू करें</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnglishPracticeAssistant;