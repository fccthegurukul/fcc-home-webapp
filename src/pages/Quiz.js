import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import './Quiz.css';

const Quiz = () => {
    const [questions, setQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState({});
    const [score, setScore] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [sessionId, setSessionId] = useState(null);
    const [startTime, setStartTime] = useState(null);
    const [endTime, setEndTime] = useState(null);
    const [duration, setDuration] = useState(null); // Duration in HH:MM:SS format
    const [congratulationMessage, setCongratulationMessage] = useState('');
    const [quizReport, setQuizReport] = useState([]);
    const [isQuizSubmitted, setIsQuizSubmitted] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0); // Elapsed time in seconds
    const [quizStartTime, setQuizStartTime] = useState(null); // Quiz start timestamp
    const timerIntervalRef = useRef(null);

    const navigate = useNavigate();
    const { skillTopic: skillTopicFromParams } = useParams();
    const location = useLocation();
    const skillTopicFromState = location.state?.skillTopic;
    const fccId = location.state?.fccId;

    const skillTopic = skillTopicFromState || skillTopicFromParams;

    useEffect(() => {
        const fetchQuiz = async () => {
            setLoading(true);
            setError('');
            setIsQuizSubmitted(false);
            setScore(null);
            setQuizReport([]);
            setCongratulationMessage('');
            setElapsedTime(0);
            setQuizStartTime(null);
            clearInterval(timerIntervalRef.current); // Clear any existing interval

            try {
                const questionsResponse = await fetch(`http://localhost:5000/get-quiz-by-topic/${encodeURIComponent(skillTopic)}`);
                if (!questionsResponse.ok) {
                    throw new Error('क्विज़ प्रश्न प्राप्त करने में विफल');
                }
                const questionsData = await questionsResponse.json();
                setQuestions(questionsData);
                setCurrentQuestionIndex(0);
                setUserAnswers({});
                setScore(null);
                setQuizReport([]);
                setCongratulationMessage('');

                const sessionResponse = await fetch('http://localhost:5000/start-quiz-session', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ fccId: fccId, skillTopic: skillTopic, totalQuestions: questionsData.length }),
                });

                if (!sessionResponse.ok) {
                    throw new Error('क्विज़ सेशन शुरू करने में विफल');
                }

                const sessionData = await sessionResponse.json();
                setSessionId(sessionData.sessionId);
                setStartTime(sessionData.startTime);

                setLoading(false);

                // Start timer immediately after successful quiz load and session start
                startTimer();


            } catch (error) {
                console.error('क्विज़ प्रश्न या सेशन शुरू करने में त्रुटि:', error);
                setError(error.message);
                setLoading(false);
                stopTimer();
            }
        };

        if (skillTopic) {
            fetchQuiz();
        } else {
            setError('स्किल टॉपिक नहीं मिला');
            setLoading(false);
        }

        return stopTimer; // Cleanup function to clear interval on unmount

    }, [skillTopic, fccId]);

    const startTimer = () => {
        stopTimer(); // Ensure any existing timer is cleared before starting a new one
        const start = Date.now();
        setQuizStartTime(start);
        timerIntervalRef.current = setInterval(() => {
            setElapsedTime(Math.floor((Date.now() - start) / 1000));
        }, 1000);
    };

    const stopTimer = () => {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
    };


    const handleAnswerChange = (questionId, answer) => {
        setUserAnswers(prevAnswers => ({
            ...prevAnswers,
            [questionId]: answer
        }));
    };

    const formatDuration = (durationInSeconds) => {
        const hours = Math.floor(durationInSeconds / 3600);
        const minutes = Math.floor((durationInSeconds % 3600) / 60);
        const seconds = Math.floor(durationInSeconds % 60);

        const hoursStr = String(hours).padStart(2, '0');
        const minutesStr = String(minutes).padStart(2, '0');
        const secondsStr = String(seconds).padStart(2, '0');

        return `${hoursStr}:${minutesStr}:${secondsStr}`;
    };


    const handleSubmitQuiz = async () => {
        if (isQuizSubmitted) {
            return;
        }
        setLoading(true);
        setError('');
        stopTimer(); // Stop timer when submitting

        try {
            const quizAnswersArray = questions.map(question => ({
                question_id: question.quiz_id,
                user_answer: userAnswers[question.quiz_id] || ''
            }));

            const response = await fetch('http://localhost:5000/submit-quiz-attempt', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ sessionId: sessionId, fccId: fccId, skillTopic: skillTopic, quizAnswers: quizAnswersArray }),
            });

            if (!response.ok) {
                throw new Error('क्विज़ सबमिट करने में विफल');
            }

            const data = await response.json();
            setScore(data.score);
            setEndTime(data.endTime);
            setDuration(formatDuration(elapsedTime)); // Final duration is the elapsed time at submission
            setLoading(false);
            setIsQuizSubmitted(true);

            const percentageScore = (data.score / questions.length) * 100;
            if (percentageScore >= 80) {
                setCongratulationMessage('उत्कृष्ट प्रदर्शन! आपने बहुत अच्छा किया!');
            } else if (percentageScore >= 60) {
                setCongratulationMessage('शानदार! आप बेहतर कर रहे हैं!');
            } else {
                setCongratulationMessage('अच्छा प्रयास! सुधार करते रहिए!');
            }

            const report = [];
            for (let i = 0; i < questions.length; i++) {
                const question = questions[i];
                const userAnswer = userAnswers[question.quiz_id];
                const isCorrect = userAnswer === question.correct_answer;
                report.push({
                    questionId: question.quiz_id,
                    questionText: question.question_text,
                    correctAnswer: question.correct_answer,
                    userAnswer: userAnswer,
                    isCorrect: isCorrect,
                });
            }
            setQuizReport(report);


        } catch (error) {
            console.error('क्विज़ सबमिशन में त्रुटि:', error);
            setError(error.message);
            setLoading(false);
        }
    };

    const handleBackToProfile = () => {
        stopTimer(); // Stop timer when navigating away
        navigate('/card-hub', { state: { fccId: fccId } });
    };

    const goToPreviousQuestion = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(currentQuestionIndex - 1);
        }
    };

    const goToNextQuestion = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        }
    };

    const handleTryAgain = () => {
        setIsQuizSubmitted(false);
        setScore(null);
        setQuizReport([]);
        setUserAnswers({});
        setCurrentQuestionIndex(0);
        setCongratulationMessage('');
        setElapsedTime(0);
        setQuizStartTime(null);
        startTimer(); // Restart timer on "Try Again"
    };


    if (loading) {
        return <p>क्विज़ लोड हो रहा है...</p>;
    }

    if (error) {
        return <p className="error">त्रुटि: {error}</p>;
    }

    const currentQuestion = questions[currentQuestionIndex];
    const isLastQuestion = currentQuestionIndex === questions.length - 1;

    const getOptionText = (optionLabel, question) => {
        return question[`option_${optionLabel.toLowerCase()}`];
    };


    return (
        <div className="quiz-container">
            {(score !== null) && (
                <div className="result-header">
                    <h2>आपका स्कोर: {score} / {questions.length}</h2>
                    {congratulationMessage && <p className="congrats-message">{congratulationMessage}</p>}
                    <p>शुरू होने का समय: {startTime ? new Date(startTime).toLocaleString() : 'N/A'}</p>
                    <p>ख़त्म होने का समय: {endTime ? new Date(endTime).toLocaleString() : 'N/A'}</p>
                    <p>कुल ड्यूरेशन: {duration} </p>
                </div>
            )}

            {!isQuizSubmitted && currentQuestion && (
                <div className="question-card">
                    <h3 className="question-number">प्रश्न {currentQuestionIndex + 1} / {questions.length}</h3>
                    <p className="question-text">{currentQuestion.question_text}</p>
                    <div className="options">
                        {['A', 'B', 'C', 'D'].map((optionLabel) => {
                            const optionText = getOptionText(optionLabel, currentQuestion);
                            return (
                                <label key={optionLabel}>
                                    <input
                                        type="radio"
                                        name={`question_${currentQuestion.quiz_id}`}
                                        value={optionLabel}
                                        checked={userAnswers[currentQuestion.quiz_id] === optionLabel}
                                        onChange={() => handleAnswerChange(currentQuestion.quiz_id, optionLabel)}
                                    />
                                    {optionLabel}. {optionText}
                                </label>
                            );
                        })}
                    </div>
                    <div className="question-navigation">
                        <button onClick={goToPreviousQuestion} disabled={currentQuestionIndex === 0 || isQuizSubmitted}>पिछला प्रश्न</button>
                        {!isLastQuestion ? (
                            <button onClick={goToNextQuestion} disabled={isQuizSubmitted}>अगला प्रश्न</button>
                        ) : (
                            <button onClick={handleSubmitQuiz} disabled={loading || isQuizSubmitted}>क्विज़ सबमिट करें</button>
                        )}
                    </div>
                </div>
            )}

            {isQuizSubmitted && (score !== null) && (
                <div className="quiz-report">
                    <h3>रिपोर्ट:</h3>
                    {quizReport.map((reportItem) => {
                        const question = questions.find(q => q.quiz_id === reportItem.questionId);
                        const userAnswerOptionText = question ? getOptionText(reportItem.userAnswer, question) : 'N/A';
                        const correctAnswerOptionText = question ? getOptionText(reportItem.correctAnswer, question) : 'N/A';

                        return (
                            <div key={reportItem.questionId} className={`report-item ${reportItem.isCorrect ? 'correct-answer' : 'incorrect-answer'}`}>
                                <p className="report-question-text">{reportItem.questionText}</p>
                                <p>आपका उत्तर: {reportItem.userAnswer ? `${reportItem.userAnswer}. ${userAnswerOptionText}` : 'छोड़ा गया'}</p>
                                <p>सही उत्तर: {`${reportItem.correctAnswer}. ${correctAnswerOptionText}`}</p>
                                <p className={`answer-status ${reportItem.isCorrect ? 'correct' : 'incorrect'}`}>
                                    {reportItem.isCorrect ? 'सही' : 'गलत'}
                                </p>
                            </div>
                        );
                    })}
                    <div className="quiz-report-buttons">
                        <button className="profile-button" onClick={handleBackToProfile}>प्रोफाइल पर वापस जाएँ</button>
                        <button className="try-again-button" onClick={handleTryAgain}>Try Again</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Quiz;