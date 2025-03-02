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
  const silenceTimeoutRef = useRef(null);

  // Speech Recognition Setup
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error('SpeechRecognition not supported in this browser.');
      setHindiAnalysis('आपका ब्राउज़र आवाज पहचान को सपोर्ट नहीं करता। कृपया Chrome का उपयोग करें।');
      return;
    }

    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.lang = 'en-US';
    recognitionRef.current.interimResults = true;

    recognitionRef.current.onresult = (event) => {
      const currentText = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join('');
      setSpokenText(currentText);

      if (currentText.trim()) {
        // Clear previous timeout and set a new 4-second silence timeout
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }
        silenceTimeoutRef.current = setTimeout(() => {
          recognitionRef.current.stop();
          setIsListening(false);
          analyzeSpeech(currentText.trim());
        }, 4000); // 4-second pause after speaking
      }
    };

    recognitionRef.current.onend = () => {
      if (!spokenText.trim() && !isSpeaking && !isLoading) {
        // Restart mic if no input yet
        setTimeout(() => {
          if (!isListening) startListening();
        }, 100);
      }
      setIsListening(false);
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
    };

    recognitionRef.current.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setHindiAnalysis(`आवाज पहचानने में त्रुटि: ${event.error}`);
      setIsListening(false);
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      setTimeout(startListening, 2000); // Retry after error
    };

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
    };
  }, [spokenText, isSpeaking, isLoading]);

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

  // Load username and auto-start mic
  useEffect(() => {
    const savedUserName = localStorage.getItem('userName');
    if (savedUserName) {
      setUserName(savedUserName);
      setIsLoginModalOpen(false);
      fetchConversationHistory();
      setTimeout(startListening, 1000);
    } else {
      setIsLoginModalOpen(true);
    }
  }, [userName]);

  // Start Listening
  const startListening = () => {
    if (!isListening && !isSpeaking && recognitionRef.current) {
      resetState();
      setIsListening(true);
      try {
        recognitionRef.current.start();
        console.log('Speech recognition started');
      } catch (error) {
        console.error('Error starting recognition:', error);
        setHindiAnalysis('माइक शुरू करने में समस्या। कृपया माइक की अनुमति दें।');
        setIsListening(false);
        setTimeout(startListening, 2000);
      }
    }
  };

  // Reset State
  const resetState = () => {
    setSpokenText('');
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
    if (typedText.trim() && !isSpeaking) {
      if (hindiPrompt) analyzeHindiResponse(typedText);
      else analyzeSpeech(typedText);
      setTypedText('');
    }
  };

  // Clean Response Text
  const cleanText = (text) => {
    if (!text) return '';
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
        setScore(result.score || 0);
        setBadge(result.badge || 'N/A');
        setCorrectedScore(result.correctedScore || 0);
        setCorrectedBadge(result.correctedBadge || 'N/A');
        setSecretInfo(cleanText(result.secretInfo));
        setNextQuestion(cleanText(result.nextQuestion) || 'Tell me about yourself.');
        setNextQuestionHindi(cleanText(result.nextQuestionHindi) || 'मुझे अपने बारे में बताएं।');
        setMiniInfo(cleanText(result.miniInfo) || 'इससे आपको प्रैक्टिस मिलेगी!');
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
            score: result.score || 0,
            badge: result.badge || 'N/A',
            corrected_score: result.correctedScore || 0,
            corrected_badge: result.correctedBadge || 'N/A',
            secret_info: cleanText(result.secretInfo),
            next_question: cleanText(result.nextQuestion),
            next_question_hindi: cleanText(result.nextQuestionHindi),
            mini_info: cleanText(result.miniInfo),
            personalized_message: cleanText(result.personalizedMessage),
          },
        ]);

        // Speak corrected version, then prompt next question after 4 seconds
        if (result.correctedVersion) {
          speakFeedback(cleanText(result.correctedVersion), () => {
            setTimeout(() => {
              if (result.nextQuestion) {
                speakFeedback(`अब यह बोलें: ${cleanText(result.nextQuestion)}`, startListening);
              } else {
                startListening();
              }
            }, 4000); // 4 seconds after corrected version
          });
        } else {
          setTimeout(() => {
            if (result.nextQuestion) {
              speakFeedback(`अब यह बोलें: ${cleanText(result.nextQuestion)}`, startListening);
            } else {
              startListening();
            }
          }, 4000);
        }
      } else if (response.status === 429) {
        setHindiAnalysis('बहुत सारी रिक्वेस्ट्स भेज दी गई हैं। कृपया थोड़ी देर बाद कोशिश करें।');
        setPersonalizedMessage('थोड़ा इंतजार करें, फिर शुरू करें!');
        setTimeout(startListening, 5000);
      } else {
        setHindiAnalysis('कुछ गलत हो गया। दोबारा कोशिश करें!');
        setScore(0);
        setBadge('Needs Improvement');
        setTimeout(startListening, 4000);
      }
    } catch (error) {
      console.error('Error analyzing speech:', error);
      setHindiAnalysis('सर्वर त्रुटि। दोबारा कोशिश करें!');
      setScore(0);
      setBadge('Needs Improvement');
      setTimeout(startListening, 4000);
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
        setCorrectedVersion(cleanText(result.correctedVersion));
        setHindiAnalysis(cleanText(result.hindiAnalysis));
        setPronunciationTip(cleanText(result.pronunciationTip));
        setVocabularyWord(cleanText(result.vocabularyWord));
        setScore(result.score || 0);
        setBadge(result.badge || 'N/A');
        setCorrectedScore(result.correctedScore || 0);
        setCorrectedBadge(result.correctedBadge || 'N/A');
        setSecretInfo(cleanText(result.secretInfo));
        setNextQuestion(cleanText(result.nextQuestion) || 'Tell me about yourself.');
        setNextQuestionHindi(cleanText(result.nextQuestionHindi) || 'मुझे अपने बारे में बताएं।');
        setMiniInfo(cleanText(result.miniInfo) || 'इससे आपको प्रैक्टिस मिलेगी!');
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
            score: result.score || 0,
            badge: result.badge || 'N/A',
            corrected_score: result.correctedScore || 0,
            corrected_badge: result.correctedBadge || 'N/A',
            secret_info: cleanText(result.secretInfo),
            next_question: cleanText(result.nextQuestion),
            next_question_hindi: cleanText(result.nextQuestionHindi),
            mini_info: cleanText(result.miniInfo),
            personalized_message: cleanText(result.personalizedMessage),
          },
        ]);

        if (result.correctedVersion) {
          speakFeedback(cleanText(result.correctedVersion), () => {
            setTimeout(() => {
              if (result.nextQuestion) {
                speakFeedback(`अब यह बोलें: ${cleanText(result.nextQuestion)}`, startListening);
              } else {
                startListening();
              }
            }, 4000);
          });
        } else {
          setTimeout(() => {
            if (result.nextQuestion) {
              speakFeedback(`अब यह बोलें: ${cleanText(result.nextQuestion)}`, startListening);
            } else {
              startListening();
            }
          }, 4000);
        }
      } else if (response.status === 429) {
        setHindiAnalysis('बहुत सारी रिक्वेस्ट्स भेज दी गई हैं। कृपया थोड़ी देर बाद कोशिश करें।');
        setPersonalizedMessage('थोड़ा इंतजार करें, फिर शुरू करें!');
        setTimeout(startListening, 5000);
      } else {
        setHindiAnalysis('कुछ गलत हो गया। दोबारा कोशिश करें!');
        setScore(0);
        setBadge('Needs Improvement');
        setTimeout(startListening, 4000);
      }
    } catch (error) {
      console.error('Error analyzing Hindi response:', error);
      setHindiAnalysis('सर्वर त्रुटि। दोबारा कोशिश करें!');
      setScore(0);
      setBadge('Needs Improvement');
      setTimeout(startListening, 4000);
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced Speak Feedback
  const speakFeedback = (text, callback) => {
    if (!isSpeaking && window.speechSynthesis && text) {
      setIsSpeaking(true);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = text.startsWith('अब यह बोलें') ? 'hi-IN' : 'en-US'; // Hindi for prompts, English for corrections
      const voices = window.speechSynthesis.getVoices();
      const naturalVoice =
        voices.find((voice) => voice.lang === utterance.lang && (voice.name.includes('Google') || voice.name.includes('Natural'))) ||
        voices.find((voice) => voice.lang === utterance.lang) ||
        voices[0];
      utterance.voice = naturalVoice;
      utterance.pitch = 1.1;
      utterance.rate = 0.9;
      utterance.volume = 1.0;
      utterance.onend = () => {
        setIsSpeaking(false);
        if (callback) callback();
      };
      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        setIsSpeaking(false);
        if (callback) callback();
      };
      window.speechSynthesis.speak(utterance);
    } else if (callback) {
      callback(); // Proceed even if no speech
    }
  };

  // Load voices on mount
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        console.log('Voices loaded:', voices);
      }
    };
    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();
  }, []);

  // Handle Login
  const handleLogin = (e) => {
    e.preventDefault();
    if (userName.trim()) {
      localStorage.setItem('userName', userName);
      setIsLoginModalOpen(false);
    }
  };

  // Format Text with Symbols
  const formatText = (text) => {
    if (!text) return '';
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/"(.*?)"/g, '<q>$1</q>')
      .replace(/--/g, '—')
      .replace(/~/g, '<span class="highlight">~</span>');
  };

  // Calculate Progress
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
              {isListening ? '🎤 सुन रहा हूँ...' : '🎤 बोलें'}
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

          {(spokenText || correctedVersion || hindiAnalysis) && (
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
                    <p>{spokenText || 'कोई इनपुट नहीं'}</p>
                  </div>
                  {correctedVersion && (
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
                  )}
                  {score !== null && (
                    <div className="feedback-item score-feedback">
                      <p>
                        सटीकता: <span className={`score ${badge.toLowerCase()}`}>{score}% - {badge}</span>
                      </p>
                    </div>
                  )}
                  {(hindiAnalysis || pronunciationTip || vocabularyWord || personalizedMessage || secretInfo) && (
                    <div className="feedback-item analysis-feedback">
                      {hindiAnalysis && (
                        <>
                          <h3>यह बेहतर क्यों है:</h3>
                          <p dangerouslySetInnerHTML={{ __html: formatText(hindiAnalysis) }} />
                        </>
                      )}
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
                  )}
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
                  <p className="user-text">
                    <strong>आप:</strong> {entry.user_input}
                  </p>
                  <p className="corrected-text">
                    <strong>सही:</strong> {entry.corrected_version || 'N/A'}
                  </p>
                  <p className="score-text">
                    अंक: <span className={entry.badge.toLowerCase()}>{entry.score}% - {entry.badge}</span>
                  </p>
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