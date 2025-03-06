import React, { useState, useRef, useEffect, useCallback } from 'react';
import './FcchomeAI.css';
import { FaPlus, FaRedo } from 'react-icons/fa';
import { FiCopy } from 'react-icons/fi';
import { v4 as uuidv4 } from 'uuid'; // For unique session IDs

const FcchomeAI = () => {
  const [userInput, setUserInput] = useState('');
  const [lastUserInput, setLastUserInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemini-flash');
  const [chatMessages, setChatMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const chatMessagesRef = useRef(null);
  const [copyTooltip, setCopyTooltip] = useState({ visible: false, message: '' });
  const copyButtonTimeout = useRef(null);
  const sessionId = useRef(uuidv4()); // Unique session ID for tracking

  useEffect(() => {
    chatMessagesRef.current?.scrollTo({
      top: chatMessagesRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [chatMessages]);

  // Reusable function for logging user activity
  const logUserActivity = useCallback(async (activityType, activityDetails = {}) => {
    try {
      const activityData = {
        activity_type: activityType,
        activity_details: JSON.stringify({
          ...activityDetails,
          selected_model: selectedModel,
          timestamp: new Date().toISOString(),
        }),
        page_url: window.location.pathname,
        session_id: sessionId.current,
      };

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/user-activity-log`, { // Updated URL
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activityData),
      });

      if (!response.ok) throw new Error('Failed to log activity');
      console.log(`Activity '${activityType}' logged successfully`);
    } catch (error) {
      console.error('Error logging user activity:', error);
    }
  }, [selectedModel]);

  const handleInputChange = (e) => {
    setUserInput(e.target.value);
  };

  const handleModelChange = (e) => {
    const newModel = e.target.value;
    setSelectedModel(newModel);
    logUserActivity('Change Model', { new_model: newModel });
  };

  const sendMessage = async () => {
    const messageToSend = userInput.trim();
    if (!messageToSend) return;

    const newUserMessage = { text: messageToSend, sender: 'user', timestamp: new Date().toISOString() };
    setChatMessages((prevMessages) => [...prevMessages, newUserMessage]);
    setUserInput('');
    setLastUserInput(messageToSend);
    setIsTyping(true);

    logUserActivity('Send Message', { message: messageToSend });

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/chat`, { // Updated URL
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageToSend,
          model: selectedModel,
          history: chatMessages,
        }),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      const botResponseMessage = {
        text: data.response,
        sender: 'bot',
        timestamp: data.timestamp,
      };
      setChatMessages((prevMessages) => [...prevMessages, botResponseMessage]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = {
        text: 'प्रतिक्रिया प्राप्त करने में त्रुटि हुई।',
        sender: 'bot',
        isError: true,
        timestamp: new Date().toISOString(),
      };
      setChatMessages((prevMessages) => [...prevMessages, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleRetry = (originalInput) => {
    if (!originalInput) return;

    const newUserMessage = { text: originalInput, sender: 'user', timestamp: new Date().toISOString() };
    setChatMessages((prevMessages) => [...prevMessages, newUserMessage]);
    setLastUserInput(originalInput);
    setIsTyping(true);

    logUserActivity('Retry Message', { original_input: originalInput });

    fetch(`${process.env.REACT_APP_API_URL}/api/chat`, { // Updated URL
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: originalInput,
        history: chatMessages,
        model: selectedModel,
      }),
    })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
      })
      .then((data) => {
        const botResponseMessage = {
          text: data.response,
          sender: 'bot',
          timestamp: new Date().toISOString(),
        };
        setChatMessages((prevMessages) => [...prevMessages, botResponseMessage]);
      })
      .catch((error) => {
        console.error('Error retrying message:', error);
        const errorMessage = {
          text: 'प्रतिक्रिया प्राप्त करने में त्रुटि हुई। कृपया दोबारा प्रयास करें।',
          sender: 'bot',
          isError: true,
          timestamp: new Date().toISOString(),
        };
        setChatMessages((prevMessages) => [...prevMessages, errorMessage]);
      })
      .finally(() => setIsTyping(false));
  };

  const handleNewChat = () => {
    setChatMessages([]);
    setUserInput('');
    setLastUserInput('');
    setCopyTooltip({ visible: false, message: '' });
    logUserActivity('New Chat');
  };

  const formatBotMessage = (message) => {
    const lines = message.split('\n');
    let htmlContent = '';
    let inQuestionSection = false;
    let options = [];

    lines.forEach((line, index) => {
      const boldedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

      if (boldedLine.match(/^\d+\.\s*प्रश्न:/)) {
        if (options.length > 0) {
          htmlContent += '<div class="options-container">' + options.join('') + '</div>';
          options = [];
        }
        inQuestionSection = true;
        htmlContent += `<div class="question highlighted">${boldedLine}</div>`;
      } else if (inQuestionSection && boldedLine.match(/^विकल्प:/)) {
        htmlContent += `<div class="option-header">${boldedLine}</div>`;
      } else if (inQuestionSection && boldedLine.match(/^[A-D]\)/)) {
        options.push(`<button class="option-button">${boldedLine}</button>`);
      } else if (inQuestionSection && boldedLine.match(/^उत्तर:/)) {
        if (options.length > 0) {
          htmlContent += '<div class="options-container">' + options.join('') + '</div>';
          options = [];
        }
        inQuestionSection = false;
        htmlContent += `<ul class="answer-list"><li class="answer highlighted">${boldedLine}</li></ul>`;
      } else if (boldedLine.trim() === '') {
        if (options.length > 0) {
          htmlContent += '<div class="options-container">' + options.join('') + '</div>';
          options = [];
        }
        htmlContent += '<br>';
      } else {
        htmlContent += `<div class="normal-text">${boldedLine}</div>`;
      }
    });

    if (options.length > 0) {
      htmlContent += '<div class="options-container">' + options.join('') + '</div>';
    }

    return <div dangerouslySetInnerHTML={{ __html: htmlContent }} />;
  };

  const handleCopyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopyTooltip({ visible: true, message: 'Copied!' });
      clearTimeout(copyButtonTimeout.current);
      copyButtonTimeout.current = setTimeout(() => setCopyTooltip({ visible: false, message: '' }), 1500);
      logUserActivity('Copy Message', { copied_text: text });
    }).catch((err) => {
      console.error('Clipboard API failed:', err);
      setCopyTooltip({ visible: true, message: 'Copy failed' });
      clearTimeout(copyButtonTimeout.current);
      copyButtonTimeout.current = setTimeout(() => setCopyTooltip({ visible: false, message: '' }), 2500);
      logUserActivity('Copy Message Failed', { error: err.message });
    });
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <span>FCC Home AI Chat</span>
        <button className="new-chat-button" onClick={handleNewChat} title="Start a new chat">
          <FaPlus /> New Chat
        </button>
      </div>

      <div className="model-selector">
        <label htmlFor="model-select">Model:</label>
        <select id="model-select" value={selectedModel} onChange={handleModelChange}>
          <option value="gemini-pro">Gemini Pro</option>
          <option value="gemini-flash">Gemini Flash</option>
          <option value="deepseek">DeepSeek R1 (Free)</option>
        </select>
      </div>

      <div className="chat-messages" ref={chatMessagesRef}>
        {chatMessages.length === 0 ? (
          <div className="initial-message">
            ⚠️ ध्यान दें: इस पेज पर AI Models का इस्तेमाल करके आप अपने सवालों के जवाब पा सकते हैं!
            लेकिन AI के जवाबों में कभी-कभी गलतियां हो सकती हैं। कोई भी जानकारी इस्तेमाल करने से पहले खुद एक बार जांच लें।
            🔒 आपकी चैट का कोई इतिहास सेव नहीं किया जाता, अगर कोई महत्वपूर्ण जानकारी मिले तो उसे खुद सुरक्षित रखना न भूलें! ✅
          </div>
        ) : (
          chatMessages.map((message, index) => (
            <div key={index} className={`message ${message.sender} ${message.isError ? 'error' : ''}`}>
              <div className="message-content">{formatBotMessage(message.text)}</div>
              <div className="message-actions">
                {message.isError && (
                  <button className="retry-button" onClick={() => handleRetry(message.originalInput)} aria-label="Retry">
                    <FaRedo />
                  </button>
                )}
                {message.sender === 'bot' && !message.isError && (
                  <div className="copy-button-wrapper">
                    <button
                      className="copy-button"
                      onClick={() => handleCopyToClipboard(message.text)}
                      aria-label="Copy Text"
                    >
                      <FiCopy />
                    </button>
                    {copyTooltip.visible && <div className="copy-tooltip">{copyTooltip.message}</div>}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {isTyping && <div className="message bot typing">...टाइपिंग...</div>}
      </div>

      <div className="chat-input-div">
        <div className="chat-input">
          <textarea
            rows="1"
            value={userInput}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="सवाल पूछें..."
            onInput={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
          />
          <button onClick={sendMessage} disabled={isTyping}>
            भेजें
          </button>
        </div>
      </div>
    </div>
  );
};

export default FcchomeAI;