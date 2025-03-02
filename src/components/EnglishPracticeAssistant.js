import React, { useState, useEffect, useRef } from 'react';
import './EnglishPracticeAssistant.css';

const EnglishPracticeAssistant = () => {
  const [isListening, setIsListening] = useState(false);
  const [spokenText, setSpokenText] = useState('');
  const [typedText, setTypedText] = useState('');
  const [correctedVersion, setCorrectedVersion] = useState('');
  const [hindiAnalysis, setHindiAnalysis] = useState('');
  const [pronunciationTip, setPronunciationTip] = useState('');
  const [vocabularyWord, setVocabularyWord] = useState('');
  const [score, setScore] = useState(null);
  const [badge, setBadge] = useState('');
  const [correctedScore, setCorrectedScore] = useState(null);
  const [correctedBadge, setCorrectedBadge] = useState('');
  const [secretInfo, setSecretInfo] = useState('');
  const [nextQuestion, setNextQuestion] = useState('Tell me about yourself.');
  const [nextQuestionHindi, setNextQuestionHindi] = useState('मुझे अपने बारे में बताएं।');
  const [miniInfo, setMiniInfo] = useState('इससे आपको शुरूआत करने की प्रैक्टिस मिलेगी!');
  const [personalizedMessage, setPersonalizedMessage] = useState('');
  const [conversationHistory, setConversationHistory] = useState([]);
  const [userName, setUserName] = useState('');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hindiPrompt, setHindiPrompt] = useState(false);

  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const submitTimerRef = useRef(null); // New ref for 3-second timer

  // Speech Recognition Setup
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setHindiAnalysis('आपका ब्राउज़र स्पीच रिकग्निशन को सपोर्ट नहीं करता।');
      return;
    }

    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.lang = 'en-US';
    recognitionRef.current.interimResults = true;

    recognitionRef.current.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join('');
      setSpokenText(transcript);
      setTypedText(transcript); // Update text input in real-time

      // Reset silence timer
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        if (isListening) {
          recognitionRef.current.stop(); // Stop after 2 seconds of silence
        }
      }, 2000); // Reduced to 2 seconds for quicker response
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
      if (spokenText.trim()) {
        // Start 3-second timer before auto-submit
        if (submitTimerRef.current) clearTimeout(submitTimerRef.current);
        submitTimerRef.current = setTimeout(() => {
          if (typedText.trim()) {
            submitTypedText(); // Auto-submit after 3 seconds
          }
        }, 3000);
      }
    };

    recognitionRef.current.onerror = (event) => {
      setHindiAnalysis('आवाज पहचानने में त्रुटि: ' + event.error);
      setIsListening(false);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (submitTimerRef.current) clearTimeout(submitTimerRef.current);
    };

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (submitTimerRef.current) clearTimeout(submitTimerRef.current);
    };
  }, [isListening]); // Only depend on isListening to avoid unnecessary re-renders

  // Fetch Conversation History
  const fetchConversationHistory = async () => {
    if (!userName) return;
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/conversation-history?userName=${userName}`);
      const data = await response.json();
      if (response.ok) setConversationHistory(data);
    } catch (error) {
      console.error('Error fetching conversation history:', error);
    }
  };

  // Load username without auto-starting mic
  useEffect(() => {
    const savedUserName = localStorage.getItem('userName');
    if (savedUserName) {
      setUserName(savedUserName);
      setIsLoginModalOpen(false);
      fetchConversationHistory();
    } else {
      setIsLoginModalOpen(true);
    }
  }, [userName]);

  // Start Listening
  const startListening = () => {
    if (!isListening && !isSpeaking && recognitionRef.current && !isLoading) {
      resetState();
      setIsListening(true);
      setTypedText(''); // Clear input before starting
      recognitionRef.current.start();
    }
  };

  // Reset State
  const resetState = () => {
    setSpokenText('');
    setTypedText('');
    setCorrectedVersion('');
    setHindiAnalysis('');
    setPronunciationTip('');
    setVocabularyWord('');
    setScore(null);
    setBadge('');
    setCorrectedScore(null);
    setCorrectedBadge('');
    setSecretInfo('');
    setPersonalizedMessage('');
    setHindiPrompt(false);
  };

  // Submit Typed Text
  const submitTypedText = () => {
    if (typedText.trim() && !isSpeaking && !isLoading) {
      const textToAnalyze = typedText; // Capture current typedText
      if (hindiPrompt) analyzeHindiResponse(textToAnalyze);
      else analyzeSpeech(textToAnalyze);
      setTypedText(''); // Clear input after submission
      setSpokenText(textToAnalyze); // Ensure spokenText stays in sync
    }
  };

  // Clean Response Text
  const cleanText = (text) => {
    return text.replace(/^\d+\.\s*(Corrected\s*Version|Hindi\s*Analysis|Pronunciation\s*Tip|Vocabulary\s*Word|Next\s*Question|Hindi|Mini\s*Info):?\s*/i, '').trim();
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
        setCorrectedVersion(cleanText(result.correctedVersion));
        setHindiAnalysis(cleanText(result.hindiAnalysis));
        setPronunciationTip(cleanText(result.pronunciationTip));
        setVocabularyWord(cleanText(result.vocabularyWord));
        setScore(result.score);
        setBadge(result.badge);
        setCorrectedScore(result.correctedScore);
        setCorrectedBadge(result.correctedBadge);
        setSecretInfo(cleanText(result.secretInfo));
        setNextQuestion(cleanText(result.nextQuestion));
        setNextQuestionHindi(cleanText(result.nextQuestionHindi));
        setMiniInfo(cleanText(result.miniInfo));
        setPersonalizedMessage(cleanText(result.personalizedMessage));
        setHindiPrompt(result.score <= 10);
        setConversationHistory((prev) => [
          ...prev,
          {
            user_input: text,
            corrected_version: cleanText(result.correctedVersion),
            hindi_analysis: cleanText(result.hindiAnalysis),
            pronunciation_tip: cleanText(result.pronunciationTip),
            vocabulary_word: cleanText(result.vocabularyWord),
            score: result.score,
            badge: result.badge,
            corrected_score: result.correctedScore,
            corrected_badge: result.correctedBadge,
            secret_info: cleanText(result.secretInfo),
            next_question: cleanText(result.nextQuestion),
            next_question_hindi: cleanText(result.nextQuestionHindi),
            mini_info: cleanText(result.miniInfo),
            personalized_message: cleanText(result.personalizedMessage),
          },
        ]);

        setTimeout(() => {
          if (result.correctedVersion) {
            speakFeedback(`यह सही रहेगा: ${cleanText(result.correctedVersion)}`, () => {
              setTimeout(() => {
                if (result.nextQuestion) {
                  speakFeedback(`अब यह बोलें: ${cleanText(result.nextQuestion)}`, () => {});
                }
              }, 2000);
            });
          }
        }, 1000);
      } else if (response.status === 429) {
        setHindiAnalysis('बहुत सारी रिक्वेस्ट्स भेज दी गई हैं। कृपया थोड़ी देर बाद कोशिश करें।');
        setPersonalizedMessage('थोड़ा इंतजार करें, फिर शुरू करें!');
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

  // Analyze Hindi Response (unchanged for brevity)
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
        setCorrectedVersion(cleanText(result.correctedVersion));
        setHindiAnalysis(cleanText(result.hindiAnalysis));
        setPronunciationTip(cleanText(result.pronunciationTip));
        setVocabularyWord(cleanText(result.vocabularyWord));
        setScore(result.score);
        setBadge(result.badge);
        setCorrectedScore(result.correctedScore);
        setCorrectedBadge(result.correctedBadge);
        setSecretInfo(cleanText(result.secretInfo));
        setNextQuestion(cleanText(result.nextQuestion));
        setNextQuestionHindi(cleanText(result.nextQuestionHindi));
        setMiniInfo(cleanText(result.miniInfo));
        setPersonalizedMessage(cleanText(result.personalizedMessage));
        setHindiPrompt(false);
        setConversationHistory((prev) => [
          ...prev,
          {
            user_input: hindiText,
            corrected_version: cleanText(result.correctedVersion),
            hindi_analysis: cleanText(result.hindiAnalysis),
            pronunciation_tip: cleanText(result.pronunciationTip),
            vocabulary_word: cleanText(result.vocabularyWord),
            score: result.score,
            badge: result.badge,
            corrected_score: result.correctedScore,
            corrected_badge: result.correctedBadge,
            secret_info: cleanText(result.secretInfo),
            next_question: cleanText(result.nextQuestion),
            next_question_hindi: cleanText(result.nextQuestionHindi),
            mini_info: cleanText(result.miniInfo),
            personalized_message: cleanText(result.personalizedMessage),
          },
        ]);

        setTimeout(() => {
          if (result.correctedVersion) {
            speakFeedback(`यह सही रहेगा: ${cleanText(result.correctedVersion)}`, () => {
              setTimeout(() => {
                if (result.nextQuestion) {
                  speakFeedback(`अब यह बोलें: ${cleanText(result.nextQuestion)}`, () => {});
                }
              }, 2000);
            });
          }
        }, 1000);
      } else if (response.status === 429) {
        setHindiAnalysis('बहुत सारी रिक्वेस्ट्स भेज दी गई हैं। कृपया थोड़ी देर बाद कोशिश करें।');
        setPersonalizedMessage('थोड़ा इंतजार करें, फिर शुरू करें!');
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

  // Enhanced Speak Feedback with Natural Voice (unchanged)
  const speakFeedback = (text, callback) => {
    if (!isSpeaking) {
      setIsSpeaking(true);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = text.match(/[अ-ह]/) ? 'hi-IN' : 'en-US';
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(voice => 
        voice.name.includes('Google') || 
        voice.name.includes('Natural') || 
        voice.name.includes('Samantha') || 
        voice.name.includes('Microsoft') || 
        voice.name.includes('Zira')
      ) || voices[0];
      utterance.voice = preferredVoice;
      utterance.pitch = 1.1;
      utterance.rate = 0.9;
      utterance.volume = 1.0;
      utterance.text = text.replace(/([.!?])\s+/g, '$1|');
      utterance.onboundary = (event) => {
        if (event.name === 'word' && event.charIndex > 0 && utterance.text[event.charIndex - 1] === '|') {
          window.speechSynthesis.pause();
          setTimeout(() => window.speechSynthesis.resume(), 200);
        }
      };
      utterance.onend = () => {
        setIsSpeaking(false);
        if (callback) callback();
      };
      window.speechSynthesis.speak(utterance);
    }
  };

  // Load voices on mount
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        // Voices loaded
      }
    };
    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();
  }, []);

  // Handle Login (unchanged)
  const handleLogin = (e) => {
    e.preventDefault();
    if (userName.trim()) {
      localStorage.setItem('userName', userName);
      setIsLoginModalOpen(false);
    }
  };

  // Format Text with Symbols (unchanged)
  const formatText = (text) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/"(.*?)"/g, '<q>$1</q>')
      .replace(/--/g, '—')
      .replace(/~/g, '<span class="highlight">~</span>');
  };

  // Calculate Progress (unchanged)
  const averageScore = conversationHistory.length > 0
    ? Math.round(conversationHistory.reduce((sum, entry) => sum + entry.score, 0) / conversationHistory.length)
    : 0;

  return (
    <div className="english-practice-container">
      <header className="header">
        <div className="header-content">
          <h1>English Speaking Assistant</h1>
          <p className="subtitle">{userName ? `${userName}, बोलें और सीखें!` : 'Learner, बोलें और सीखें!'}</p>
          {conversationHistory.length > 0 && (
            <div className="progress-container">
              <span className="progress-label">आपकी प्रगति: {averageScore}%</span>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${averageScore}%` }}></div>
              </div>
            </div>
          )}
          <div className="next-prompt">
            <h2>आगे क्या बोलें:</h2>
            <p className="prompt-text">{nextQuestion}</p>
            <p className="prompt-hindi">{nextQuestionHindi}</p>
          </div>
        </div>
      </header>

      <main className="main-content">
        <section className="interaction-section">
          <div className="input-area">
            <button
              onClick={startListening}
              disabled={isListening || isSpeaking || isLoading}
              className={`mic-button ${isListening ? 'listening' : ''}`}
            >
              <span>{isListening ? '🎤 सुन रहा हूँ...' : '🎤 बोलें'}</span>
            </button>

            <div className="text-input-wrapper">
              <input
                type="text"
                value={typedText}
                onChange={(e) => setTypedText(e.target.value)}
                placeholder={hindiPrompt ? 'हिंदी में बताएं...' : 'या यहाँ टाइप करें...'}
                onKeyPress={(e) => e.key === 'Enter' && submitTypedText()}
                className="text-input"
              />
              <button
                onClick={submitTypedText}
                disabled={isLoading || isSpeaking || !typedText.trim()}
                className="send-button"
              >
                ➤
              </button>
            </div>
          </div>

          {(correctedVersion || hindiAnalysis) && (
            <div className="feedback-area">
              {isLoading ? (
                <div className="loading-overlay">
                  <div className="spinner"></div>
                  <p>विश्लेषण कर रहा हूँ...</p>
                </div>
              ) : (
                <div className="feedback-card">
                  <div className="feedback-item input-feedback">
                    <h3>आपने कहा:</h3>
                    <p>{spokenText}</p>
                  </div>
                  <div className="feedback-item corrected-feedback">
                    <h3>सही तरीका:</h3>
                    <p>{correctedVersion}</p>
                    <button
                      onClick={() => speakFeedback(correctedVersion)}
                      className="speak-button"
                      disabled={isSpeaking}
                    >
                      🔊
                    </button>
                  </div>
                  <div className="feedback-item score-feedback">
                    <p>सटीकता: <span className={`score ${badge.toLowerCase()}`}>{score}% - {badge}</span></p>
                  </div>
                  <div className="feedback-item analysis-feedback">
                    <h3>यह बेहतर क्यों है:</h3>
                    <p dangerouslySetInnerHTML={{ __html: formatText(hindiAnalysis) }} />
                    {pronunciationTip && (
                      <>
                        <h3>उच्चारण टिप:</h3>
                        <p>{pronunciationTip}</p>
                      </>
                    )}
                    {vocabularyWord && (
                      <>
                        <h3>नया शब्द:</h3>
                        <p>{vocabularyWord}</p>
                      </>
                    )}
                    {personalizedMessage && (
                      <p className="personalized-message">{personalizedMessage}</p>
                    )}
                    {secretInfo && (
                      <p className="secret-info">टिप: <span>{secretInfo}</span></p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <section className="history-section">
          <h2>आपका अभ्यास इतिहास</h2>
          <div className="history-list">
            {conversationHistory.length === 0 ? (
              <p className="empty-history">यहाँ आपका इतिहास दिखेगा। बोलना शुरू करें!</p>
            ) : (
              conversationHistory.map((entry, index) => (
                <div key={index} className="history-item">
                  <p className="user-text"><strong>आप:</strong> {entry.user_input}</p>
                  <p className="corrected-text"><strong>सही:</strong> {entry.corrected_version}</p>
                  <p className="score-text">अंक: <span className={entry.badge.toLowerCase()}>{entry.score}% - {entry.badge}</span></p>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      {isLoginModalOpen && (
        <div className="login-modal">
          <div className="modal-content">
            <h2>English Practice में स्वागत है</h2>
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