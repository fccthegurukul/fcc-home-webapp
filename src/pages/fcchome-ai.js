// FcchomeAI.js
import React, { useState, useRef, useEffect } from 'react';
import './FcchomeAI.css';
import { FaRedo } from 'react-icons/fa';
import { FiCopy } from 'react-icons/fi';

const FcchomeAI = () => {
    const [userInput, setUserInput] = useState('');
    const [lastUserInput, setLastUserInput] = useState('');
    const [selectedModel, setSelectedModel] = useState('gemini');
    const [chatMessages, setChatMessages] = useState([]);
    const [isTyping, setIsTyping] = useState(false);
    const chatMessagesRef = useRef(null);
    const [copyTooltip, setCopyTooltip] = useState({ visible: false, message: '' });
    const copyButtonTimeout = useRef(null);

    useEffect(() => {
        chatMessagesRef.current?.scrollTo({
            top: chatMessagesRef.current.scrollHeight,
            behavior: 'smooth'
        });
    }, [chatMessages]);

    const handleInputChange = (e) => {
        setUserInput(e.target.value);
    };

    const handleModelChange = (e) => {
        setSelectedModel(e.target.value);
    };

    const sendMessage = async () => {
        const messageToSend = userInput;
        if (!messageToSend.trim()) return;

        const newUserMessage = { text: messageToSend, sender: 'user' };
        setChatMessages((prevMessages) => [...prevMessages, newUserMessage]);
        setUserInput('');
        setLastUserInput(messageToSend);
        setIsTyping(true);

        try {
            const response = await fetch('http://localhost:5000/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: messageToSend, model: selectedModel }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const botResponseMessage = { text: data.response, sender: 'bot' };
            setChatMessages((prevMessages) => [...prevMessages, botResponseMessage]);
        } catch (error) {
            console.error("Error sending message to API:", error);
            const errorMessage = { text: "प्रतिक्रिया प्राप्त करने में त्रुटि हुई। कृपया दोबारा प्रयास करें।", sender: 'bot', isError: true, originalInput: messageToSend };
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

        const newUserMessage = { text: originalInput, sender: 'user' };
        setChatMessages((prevMessages) => [...prevMessages, newUserMessage]);
        setLastUserInput(originalInput);
        setIsTyping(true);

        fetch('http://localhost:5000/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: originalInput, model: selectedModel }),
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            const botResponseMessage = { text: data.response, sender: 'bot' };
            setChatMessages((prevMessages) => [...prevMessages, botResponseMessage]);
        })
        .catch(error => {
            console.error("Error sending message to API:", error);
            const errorMessage = { text: "प्रतिक्रिया प्राप्त करने में त्रुटि हुई। कृपया दोबारा प्रयास करें।", sender: 'bot', isError: true };
            setChatMessages((prevMessages) => [...prevMessages, errorMessage]);
        })
        .finally(() => {
            setIsTyping(false);
        });
    };

    const formatBotMessage = (message) => {
        const lines = message.split('\n');
        return lines.map((line, index) => {
            let processedLine = line;
            processedLine = processedLine.replace(/\*\*|""/g, '');

            if (processedLine.startsWith('प्रश्न')) {
                return <p key={index} className="formatted-question">{processedLine}</p>;
            } else if (processedLine.startsWith('उत्तर')) {
                return <p key={index} className="formatted-answer">{processedLine}</p>;
            } else if (processedLine.startsWith('* ')) {
                processedLine = processedLine.substring(2);
                return <li key={index} className="formatted-list-item"><b>{processedLine}</b></li>;
            } else if (index === 0) {
                return <p key={index} className="formatted-paragraph-italic">{processedLine}</p>;
            } else {
                return <p key={index} className="formatted-paragraph">{processedLine}</p>;
            }
        });
    };

    const handleCopyToClipboard = (text) => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                setCopyTooltip({ visible: true, message: 'Copied!' });
                clearTimeout(copyButtonTimeout.current);
                copyButtonTimeout.current = setTimeout(() => {
                    setCopyTooltip({ visible: false, message: '' });
                }, 1500);
            }).catch(err => {
                console.error('Clipboard API failed: ', err);
                setCopyTooltip({ visible: true, message: 'Copy failed' });
                clearTimeout(copyButtonTimeout.current);
                copyButtonTimeout.current = setTimeout(() => {
                    setCopyTooltip({ visible: false, message: '' });
                }, 2500);
            });
        } else if (document.queryCommandSupported && document.queryCommandSupported('copy')) {
            // Fallback for browsers without Clipboard API but support for document.execCommand('copy')
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'absolute';
            textArea.style.left = '-9999px'; // Move off-screen
            textArea.style.top = '0';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                const successful = document.execCommand('copy');
                if (successful) {
                    setCopyTooltip({ visible: true, message: 'Copied!' });
                } else {
                    setCopyTooltip({ visible: true, message: 'Copy failed' });
                }
            } catch (err) {
                console.error('Fallback copy failed: ', err);
                setCopyTooltip({ visible: true, message: 'Copy failed' });
            } finally {
                document.body.removeChild(textArea); // Clean up temporary element
                clearTimeout(copyButtonTimeout.current);
                copyButtonTimeout.current = setTimeout(() => {
                    setCopyTooltip({ visible: false, message: '' });
                }, 1500);
            }
        }
         else {
            console.error('No copy functionality available in this browser.');
            setCopyTooltip({ visible: true, message: 'Copy not supported' });
            clearTimeout(copyButtonTimeout.current);
            copyButtonTimeout.current = setTimeout(() => {
                setCopyTooltip({ visible: false, message: '' });
            }, 3000);
        }
    };

    return (
        <div className="chat-container">
            <div className="chat-header">
                FCC Home AI Chat
                <div>
                    <span className="model-badge">
                        Powered by trusted API models – upgrades soon!
                    </span>
                </div>
            </div>

            <div className="model-selector">
                <label htmlFor="model-select">Model:</label>
                <select id="model-select" value={selectedModel} onChange={handleModelChange}>
                    <option value="gemini">Gemini Pro</option>
                    <option value="deepseek">DeepSeek R1 (Free)</option>
                </select>
            </div>

            <div className="chat-messages" ref={chatMessagesRef}>
                {chatMessages.length === 0 ? (
                    <div className="initial-message">संदेश भेजने के लिए कहें!</div>
                ) : (
                    chatMessages.map((message, index) => (
                        <div key={index} className={`message ${message.sender} ${message.isError ? 'error' : ''}`}>
                            <div className="message-content">
                                {message.sender === 'bot' && !message.isError ? (
                                    <div className="formatted-bot-message">
                                        <ul>{formatBotMessage(message.text)}</ul>
                                    </div>
                                ) : (
                                    message.text
                                )}
                            </div>
                            <div className="message-actions">
                                {message.isError && (
                                    <button className="retry-button" onClick={() => handleRetry(message.originalInput)} aria-label="Retry">
                                        <FaRedo />
                                    </button>
                                )}
                                {message.sender === 'bot' && !message.isError && (
                                    <div className="copy-button-wrapper">
                                        <button className="copy-button" onClick={() => handleCopyToClipboard(message.text)} aria-label="Copy Text">
                                            <FiCopy />
                                        </button>
                                        {copyTooltip.visible && (
                                            <div className="copy-tooltip">
                                                {copyTooltip.message}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
                {isTyping && <div className="message bot typing">...टाइपिंग...</div>}
            </div>

            <div className="chat-input-div" >
                <div className="chat-input">
                    <textarea
                        rows="1"
                        value={userInput}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder="सवाल पूछे..."
                        onInput={(e) => {
                            e.target.style.height = 'auto';
                            e.target.style.height = `${e.target.scrollHeight}px`;
                        }}
                    />
                    <button onClick={sendMessage} disabled={isTyping}>भेजें</button>
                </div>
            </div>
        </div>
    );
};

export default FcchomeAI;