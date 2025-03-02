import React, { useState, useEffect, useRef, useCallback } from 'react';
import './EnglishPracticeAssistant.css';
import { v4 as uuidv4 } from 'uuid'; // For unique session IDs

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
  const sessionId = useRef(uuidv4()); // Unique session ID for tracking

  const VOICERSS_API_KEY = '351d9f38051c43cc8556afc1a82a208f';

  // Reusable function for logging user activity
  const logUserActivity = useCallback(async (activityType, activityDetails = {}) => {
    try {
      const activityData = {
        activity_type: activityType,
        activity_details: JSON.stringify({
          ...activityDetails,
          user_name: userName || 'Anonymous',
          timestamp: new Date().toISOString(),
        }),
        page_url: window.location.pathname,
        session_id: sessionId.current,
      };

      const response = await fetch('http://localhost:5000/api/user-activity-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activityData),
      });

      if (!response.ok) throw new Error('Failed to log activity');
      console.log(`Activity '${activityType}' logged successfully`);
    } catch (error) {
      console.error('Error logging user activity:', error);
    }
  }, [userName]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setHindiAnalysis('आपका ब्राउज़र स्पीच रिकग्निशन को सपोर्ट नहीं करता।');
      return;
    }

    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.lang = 'en-US';
    recognitionRef.current.interimResults = true;

    recognitionRef.current.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalTranscript += transcript;
        else interimTranscript = transcript;
      }

      const currentText = finalTranscript || interimTranscript;
      setSpokenText(currentText);
      setTypedText(currentText);

      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        if (isListening && finalTranscript) recognitionRef.current.stop();
      }, 3500);
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
      if (typedText.trim() && !isSpeaking && !isLoading) {
        submitTypedText();
      }
    };

    recognitionRef.current.onerror = (event) => {
      setHindiAnalysis('आवाज पहचानने में त्रुटि: ' + event.error);
      setIsListening(false);
    };

    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, [isListening, typedText, isSpeaking, isLoading]);

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

  const startListening = () => {
    if (!isListening && !isSpeaking && recognitionRef.current && !isLoading) {
      resetState();
      setIsListening(true);
      setTypedText('');
      recognitionRef.current.start();
      logUserActivity('Start Listening');
    }
  };

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

  const submitTypedText = () => {
    if (typedText.trim() && !isSpeaking && !isLoading) {
      const textToAnalyze = typedText;
      if (hindiPrompt) {
        analyzeHindiResponse(textToAnalyze);
        logUserActivity('Submit Hindi Text', { text: textToAnalyze });
      } else {
        analyzeSpeech(textToAnalyze);
        logUserActivity('Submit English Text', { text: textToAnalyze });
      }
      setTypedText('');
      setSpokenText(textToAnalyze);
    }
  };

  const cleanText = (text) => {
    return text.replace(/^\d+\.\s*(Corrected\s*Version|Hindi\s*Analysis|Pronunciation\s*Tip|Vocabulary\s*Word|Next\s*Question|Hindi|Mini\s*Info):?\s*/i, '').trim();
  };

  const analyzeSpeech = async (text) => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
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
            speakFeedback(cleanText(result.correctedVersion), () => {
              setTimeout(() => {
                if (result.nextQuestion && result.nextQuestionHindi) {
                  speakFeedback(cleanText(result.nextQuestion), () => {
                    setTimeout(() => {
                      speakFeedback(cleanText(result.nextQuestionHindi), () => {});
                    }, 2000);
                  });
                }
              }, 2000);
            });
          }
        }, 1000);
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

  const analyzeHindiResponse = async (hindiText) => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
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
            speakFeedback(cleanText(result.correctedVersion), () => {
              setTimeout(() => {
                if (result.nextQuestion && result.nextQuestionHindi) {
                  speakFeedback(cleanText(result.nextQuestion), () => {
                    setTimeout(() => {
                      speakFeedback(cleanText(result.nextQuestionHindi), () => {});
                    }, 2000);
                  });
                }
              }, 2000);
            });
          }
        }, 1000);
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

  const speakFeedback = async (text, callback) => {
    if (!isSpeaking) {
      setIsSpeaking(true);
      logUserActivity('Speak Feedback', { text });
      try {
        const lang = text.match(/[अ-ह]/) ? 'hi-in' : 'en-us';
        const speed = lang === 'en-us' ? -2 : 0;
        const url = `http://api.voicerss.org/?key=${VOICERSS_API_KEY}&hl=${lang}&src=${encodeURIComponent(text)}&r=${speed}&f=48khz_16bit_stereo`;
        const audio = new Audio(url);
        audio.onended = () => {
          setIsSpeaking(false);
          if (callback) callback();
        };
        audio.onerror = () => {
          console.error('VoiceRSS API error, falling back to Web Speech API');
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = lang === 'hi-in' ? 'hi-IN' : 'en-US';
          utterance.rate = lang === 'en-US' ? 0.7 : 1.0;
          const voices = window.speechSynthesis.getVoices();
          utterance.voice = voices.find(voice => voice.name.includes('Google')) || voices[0];
          utterance.onend = () => {
            setIsSpeaking(false);
            if (callback) callback();
          };
          window.speechSynthesis.speak(utterance);
        };
        audio.play();
      } catch (error) {
        console.error('Error in VoiceRSS API:', error);
        setIsSpeaking(false);
      }
    }
  };

  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) console.log('Available voices:', voices.map(v => v.name));
    };
    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (userName.trim()) {
      localStorage.setItem('userName', userName);
      setIsLoginModalOpen(false);
      logUserActivity('Login', { user_name: userName });
    }
  };

  const averageScore = conversationHistory.length > 0
    ? Math.round(conversationHistory.reduce((sum, entry) => sum + entry.score, 0) / conversationHistory.length)
    : 0;

  const scoreDifference = correctedScore && score ? correctedScore - score : null;

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
            <h2 className='next-question-h2'>आगे क्या बोलें</h2>
            <p className="prompt-text">{nextQuestion}</p>
            <p className="prompt-hindi">{nextQuestionHindi}</p>
          </div>
        </div>
      </header>

      <main className="main-content">
        <section className="interaction-section">
          <div className="input-area">
            <div className={`ai-assistant ${isSpeaking ? 'speaking' : ''}`}>
              <div className="ai-avatar">
                <span className="avatar-icon">
                  <i className="fas fa-robot"></i>
                </span>
              </div>
              <div className="ai-speech-bubble">
                <p>{isSpeaking ? 'मैं बोल रहा हूँ...' : 'अब आप बोलिए | आपकी बारी →'}</p>
              </div>
              <button
                onClick={startListening}
                disabled={isListening || isSpeaking || isLoading}
                className={`mic-button ${isListening ? 'listening' : ''}`}
              >
                <span className={`mic-icon ${isListening ? 'animate' : ''}`}>
                  <i className="fas fa-microphone"></i>
                </span>
              </button>
            </div>

            <div className="text-input-wrapper">
              <input
                type="text"
                value={typedText}
                onChange={(e) => setTypedText(e.target.value)}
                placeholder={hindiPrompt ? 'हिंदी में बताएं / लिखे...' : 'यहाँ लिखे या बोलें...'}
                onKeyPress={(e) => e.key === 'Enter' && submitTypedText()}
                className="text-input"
              />
              <button
                onClick={submitTypedText}
                disabled={isLoading || isSpeaking || !typedText.trim()}
                className="send-button"
              >
                <span className="send-icon">➤</span>
              </button>
            </div>
          </div>

          {(spokenText || correctedVersion) && (
            <div className="feedback-area">
              {isLoading ? (
                <div className="in-page-loader">
                  <div className="loader-bar">
                    <div className="loader-progress"></div>
                  </div>
                  <p className="loader-text">विश्लेषण हो रहा है...</p>
                </div>
              ) : (
                <div className="feedback-card">
                  <div className="comparison-section">
                    <div className="comparison-item">
                      <h3>आपने कहा</h3>
                      <p>{spokenText}</p>
                      <p className="score-display">स्कोर: {score}% ({badge})</p>
                    </div>
                    <div className="comparison-item">
                      <h3>सही तरीका</h3>
                      <p>{correctedVersion}</p>
                      <p className="score-display">स्कोर: {correctedScore}% ({correctedBadge})</p>
                      <button
                        onClick={() => speakFeedback(correctedVersion)}
                        className="speak-button"
                        disabled={isSpeaking}
                      >
                        🔊
                      </button>
                    </div>
                    {scoreDifference !== null && (
                      <p className="score-difference">
                        अंतर: <span className={scoreDifference > 0 ? 'positive' : 'negative'}>
                          {scoreDifference > 0 ? `+${scoreDifference}` : scoreDifference}%
                        </span>
                      </p>
                    )}
                  </div>
                  <div className="feedback-item analysis-feedback">
                    <h3 className='h3-feedback'>यह बेहतर क्यों है</h3>
                    <p>{hindiAnalysis}</p>
                    {pronunciationTip && (
                      <>
                        <h3 className='h3-feedback'>उच्चारण टिप</h3>
                        <p>{pronunciationTip}</p>
                      </>
                    )}
                    {vocabularyWord && (
                      <>
                        <h3 className='h3-feedback'>नया शब्द</h3>
                        <p>{vocabularyWord}</p>
                      </>
                    )}
                    {personalizedMessage && (
                      <p className="personalized-message">{personalizedMessage}</p>
                    )}
                    {secretInfo && (
                      <p className="secret-info"><span>{secretInfo}</span></p>
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
              <p className="empty-history">अभी कोई इतिहास नहीं है। बोलना शुरू करें!</p>
            ) : (
              conversationHistory.map((entry, index) => (
                <div key={index} className="history-item">
                  <p className="user-text"><strong>आप:</strong> {entry.user_input}</p>
                  <p className="corrected-text"><strong>सही:</strong> {entry.corrected_version}</p>
                  <p className="score-text">स्कोर: <span className={entry.badge.toLowerCase()}>{entry.score}% ({entry.badge})</span></p>
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