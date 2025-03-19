import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styles from "./StudentProfile.module.css";
import { ClipLoader } from "react-spinners";
import NotFoundImage from "../assets/404-image.jpg";
import QrScanner from "react-qr-scanner";
import { QrCode, ScanLine, XCircle } from "lucide-react";
import upiQR from "../assets/upiqr.png";
import { v4 as uuidv4 } from 'uuid';

const StudentProfile = () => {
    const [fccId, setFccId] = useState("");
    const [student, setStudent] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [recentProfiles, setRecentProfiles] = useState([]);
    const [scanning, setScanning] = useState(false);
    const [toast, setToast] = useState(null);
    const [feeDetails, setFeeDetails] = useState(null);
    const [feeLoading, setFeeLoading] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const navigate = useNavigate();
    const { fccId: urlFccId } = useParams();
    const inputRef = useRef(null);
    const profileCardRef = useRef(null);
    const sessionId = useRef(uuidv4());

    // New state variable to track if input is rendered
    const [isInputRendered, setIsInputRendered] = useState(false);

    const apiUrl = process.env.REACT_APP_API_URL;

    const getPaymentAmount = () => {
        if (!feeDetails) return null;
        const now = new Date();
        if (feeDetails.offer_valid_till) {
            const offerValidTill = new Date(feeDetails.offer_valid_till);
            if (now <= offerValidTill && feeDetails.offer_price) return feeDetails.offer_price;
        }
        return feeDetails.fee_remaining;
    };

    const showToast = (message, type = "info") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const logUserActivity = useCallback(async (activityType, activityDetails = null) => {
        try {
            const activityData = {
                activity_type: activityType,
                activity_details: activityDetails ? JSON.stringify(activityDetails) : null,
                page_url: window.location.pathname,
                session_id: sessionId.current,
            };

            await fetch(`${apiUrl}/api/user-activity-log`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    "ngrok-skip-browser-warning": "true"
                },
                body: JSON.stringify(activityData)
            });
            console.log(`User activity '${activityType}' logged successfully.`);
        } catch (error) {
            console.error("Error logging user activity:", error);
        }
    }, [apiUrl]);

    const handleSearch = useCallback(async (searchFccId) => {
        const fccToSearch = searchFccId;
        if (!fccToSearch || !fccToSearch.trim()) {
            setError("FCC ID खाली नहीं हो सकता");
            return;
        }

        setLoading(true);
        setError("");
        setStudent(null);

        try {
            const response = await fetch(`${apiUrl}/get-student-profile/${fccToSearch}`, {
                method: "GET",
                headers: { "ngrok-skip-browser-warning": "true" },
            });
            const data = await response.json();

            if (response.ok) {
                setStudent(data);
                setError("");
                localStorage.setItem("lastViewedFccId", data.fcc_id);
                localStorage.setItem("bypassedStudent", JSON.stringify(data));

                const existingRecentProfiles = JSON.parse(localStorage.getItem("recentProfiles")) || [];
                const isAlreadyRecent = existingRecentProfiles.some((profile) => profile.fcc_id === data.fcc_id);

                let updatedRecentProfiles;
                if (!isAlreadyRecent) {
                    updatedRecentProfiles = [
                        { name: data.name, photo_url: data.photo_url, fcc_id: data.fcc_id },
                        ...existingRecentProfiles,
                    ];
                } else {
                    updatedRecentProfiles = existingRecentProfiles;
                }

                setRecentProfiles(updatedRecentProfiles);
                localStorage.setItem("recentProfiles", JSON.stringify(updatedRecentProfiles));
                logUserActivity('Search Student Profile', { fcc_id: fccToSearch, search_result: 'success' });
            } else {
                setStudent(null);
                setError(data.error || "विद्यार्थी नहीं मिला");
                showToast(data.error || "विद्यार्थी नहीं मिला", "error");
                logUserActivity('Search Student Profile', { fcc_id: fccToSearch, search_result: 'failure', error: data.error });
            }
        } catch (error) {
            setError("कुछ त्रुटि हो गयी, कृपया बाद में पुनः प्रयास करें।");
            showToast("कुछ त्रुटि हो गयी, कृपया बाद में पुनः प्रयास करें।", "error");
            logUserActivity('Search Student Profile', { fcc_id: fccToSearch, search_result: 'exception', error: error.message });
        } finally {
            setLoading(false);
            setScanning(false);
            setFccId("");
            if (inputRef.current) inputRef.current.value = "";
        }
    }, [apiUrl, logUserActivity]);

    // Effect to handle URL based FCC ID and delayed search trigger
    useEffect(() => {
        if (isInputRendered && urlFccId) { // Check if input is rendered and urlFccId exists
            setFccId(urlFccId);
            // Delay handleSearch to ensure component is fully mounted
            setTimeout(() => {
                handleSearch(urlFccId);
                if (inputRef.current) {
                    inputRef.current.value = urlFccId; // Manually set input value
                }
            }, 100); // 100ms delay
            logUserActivity('Auto Load Profile', { url_fcc_id: urlFccId });
        }
    }, [urlFccId, handleSearch, logUserActivity, isInputRendered]); // Added isInputRendered as dependency

    useEffect(() => {
        setIsInputRendered(true); // Set isInputRendered to true after input is rendered in DOM
    }, []);

    useEffect(() => {
        const savedRecentProfiles = JSON.parse(localStorage.getItem("recentProfiles")) || [];
        setRecentProfiles(savedRecentProfiles);

        const storedFccId = localStorage.getItem("lastViewedFccId");
        if (!urlFccId && storedFccId) {
            setFccId(storedFccId);
            handleSearch(storedFccId);
        }
    }, [handleSearch, urlFccId]);

    useEffect(() => {
        if (student?.fcc_id) {
            localStorage.setItem("lastViewedFccId", student.fcc_id);
        }
    }, [student]);

    useEffect(() => {
        if (student && profileCardRef.current) {
            profileCardRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [student]);

    useEffect(() => {
        if (student && student.tutionfee_paid) {
            setFeeLoading(true);
            fetch(`${apiUrl}/get-tuition-fee-details/${student.fcc_id}`, {
                method: "GET",
                headers: { "ngrok-skip-browser-warning": "true" },
            })
                .then((res) => res.json())
                .then((data) => {
                    setFeeDetails(data);
                    setFeeLoading(false);
                })
                .catch((err) => {
                    console.error("फीस विवरण लोड करने में त्रुटि:", err);
                    setFeeLoading(false);
                });
        } else {
            setFeeDetails(null);
        }
    }, [student, apiUrl]);

    const handleInputChange = (e) => {
        const input = e.target.value;
        const numericValue = input.replace(/[^0-9]/g, "");
        if (input !== numericValue) showToast("केवल संख्याएँ मान्य हैं", "warning");
        setFccId(numericValue);
    };

    const handleSearchClick = () => {
        if (fccId.trim() === "") {
            showToast("कृपया FCC ID दर्ज करें", "warning");
            logUserActivity('Empty Search Attempt');
            return;
        }
        logUserActivity('Click Search Button', { fcc_id: fccId });
        handleSearch(fccId);
    };

    const handleRecentProfileClick = (profile) => {
        setFccId(profile.fcc_id);
        handleSearch(profile.fcc_id);
        localStorage.setItem("lastViewedFccId", profile.fcc_id);
        logUserActivity('Click Recent Profile', { recent_fcc_id: profile.fcc_id, recent_profile_name: profile.name });
    };

    const handleRemoveRecentProfile = (e, fcc_id) => {
        e.stopPropagation();
        const updatedRecent = recentProfiles.filter((profile) => profile.fcc_id !== fcc_id);
        setRecentProfiles(updatedRecent);
        localStorage.setItem("recentProfiles", JSON.stringify(updatedRecent));
        showToast("प्रोफ़ाइल हटा दी गई", "info");
        logUserActivity('Remove Recent Profile', { removed_fcc_id: fcc_id });
    };

    const handleScan = (data) => {
        if (data) {
            const scannedText = typeof data === "string" ? data : data.text || "";
            const numericData = scannedText.replace(/[^0-9]/g, "");
            setFccId(numericData);
            setScanning(false);
            logUserActivity('Successful QR Scan', { scanned_fcc_id: numericData });
            setTimeout(() => {
                handleSearch(numericData);
                if (inputRef.current) inputRef.current.value = "";
            }, 1000);
        }
    };

    const handleError = (err) => {
        console.error("QR स्कैनर त्रुटि:", err);
        setError("QR स्कैनर में त्रुटि: " + err.message);
        setScanning(false);
        logUserActivity('QR Scan Error', { error_message: err.message });
    };

    const handleScanClick = () => {
        setScanning(true);
        setError("");
        setStudent(null);
        setFccId("");
        logUserActivity('Initiate QR Scan');
    };

    const handleScanCancel = () => {
        setScanning(false);
        setError("");
        logUserActivity('Cancel QR Scan');
    };

    const handlePaymentButtonClick = () => {
        setShowPaymentModal(true);
        logUserActivity('Click Payment Button', { fcc_id: student.fcc_id, payment_due: feeDetails?.fee_remaining });
    };

    const handleViewCtcCtgButtonClick = () => {
        logUserActivity('Click View Coaching Time Button', { fcc_id: student.fcc_id, student_name: student.name });
        navigate("/view-ctc-ctg", {
            state: { fccId: student.fcc_id, name: student.name, father: student.father, mobile_number: student.mobile_number, recentProfiles, student },
        });
    };

    const handleCardHubButtonClick = () => {
        logUserActivity('Click View Card Hub Button', { fcc_id: student.fcc_id, student_name: student.name });
        navigate("/card-hub", { state: { fccId: student.fcc_id, recentProfiles, student } });
    };

    const handleLeaderboardButtonClick = () => {
        logUserActivity('Click Leaderboard Button', { fcc_id: student.fcc_id, student_name: student.name });
        navigate("/leaderboard", { state: { fccId: student.fcc_id, student } });
    };
    const handleClassroomButtonClick = () => {
        logUserActivity('Click Classroom Button');
        navigate("/classroom");
    };


    const SkeletonProfileCard = () => (
        <div className={styles.skeletonProfileCard}>
            <div className={styles.skeletonCircle}></div>
            <div className={styles.skeletonLineShort}></div>
            <div className={styles.skeletonLine}></div>
            <div className={styles.skeletonLine}></div>
            <div className={styles.skeletonLine}></div>
        </div>
    );

    return (
        <div className={styles.profileContainer}>
            <h1 className={styles.profileHeading}>विद्यार्थी प्रोफाइल</h1>
            <div className={styles.searchBar}>
                <input
                    type="text"
                    value={fccId}
                    onChange={handleInputChange}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && fccId.trim() !== "") handleSearchClick();
                    }}
                    placeholder="FCC ID डालें"
                    className={styles.searchInput}
                    aria-label="FCC ID खोजें"
                    autoComplete="off"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    ref={inputRef}
                    disabled={scanning}
                />
                <button
                    onClick={handleSearchClick}
                    className={styles.searchButton}
                    disabled={loading || !fccId.trim() || scanning}
                    aria-label="प्रोफ़ाइल खोजें"
                    aria-busy={loading}
                >
                    {loading ? <ClipLoader color="#ffffff" loading={loading} size={15} /> : "खोजें"}
                </button>
                <button
                    onClick={handleScanClick}
                    className={styles.scanButton}
                    disabled={loading || scanning}
                    aria-label="QR कोड स्कैन करें"
                >
                    {scanning ? (
                        <ClipLoader color="#ffffff" loading={scanning} size={15} />
                    ) : (
                        <>
                            <QrCode size={20} /> QR स्कैन <ScanLine size={20} />
                        </>
                    )}
                </button>
            </div>

            {scanning && (
                <div className={styles.qrScannerContainer}>
                    <QrScanner delay={300} onError={handleError} onScan={handleScan} style={{ width: "100%" }} />
                    <button className={styles.scanCancelButton} onClick={handleScanCancel}>रद्द करें</button>
                    {error && <p className={styles.errorMessage}>{error}</p>}
                </div>
            )}

            {error && !scanning && <p className={styles.errorMessage} role="alert">{error}</p>}
            {toast && <div className={`${styles.toast} ${styles[`toast${toast.type.charAt(0).toUpperCase() + toast.type.slice(1)}`]}`} role="status">{toast.message}</div>}
            {loading && !student && (
                <div className={styles.loaderContainer}>
                    <SkeletonProfileCard />
                    <p className={styles.loaderText}>प्रोफ़ाइल लोड हो रहा है...</p>
                </div>
            )}

            {recentProfiles.length > 0 && (
                <div className={styles.recentProfiles}>
                    <h2 className={styles.recentProfilesHeading}>हाल ही में देखे गए प्रोफ़ाइल</h2>
                    <div className={styles.recentProfilesSlider}>
                        {recentProfiles.map((profile) => (
                            <div
                                key={profile.fcc_id}
                                className={styles.recentProfileCard}
                                onClick={() => handleRecentProfileClick(profile)}
                                role="button"
                                tabIndex="0"
                                onKeyDown={(e) => { if (e.key === "Enter") handleRecentProfileClick(profile); }}
                            >
                                {profile.photo_url ? (
                                    <img src={profile.photo_url || NotFoundImage} alt={`${profile.name} का प्रोफ़ाइल`} className={styles.recentProfilePicture} />
                                ) : (
                                    <p className={styles.noPhotoText}>कोई फोटो उपलब्ध नहीं है</p>
                                )}
                                <p className={styles.recentProfileName}>{profile.name}</p>
                                <button
                                    className={styles.removeRecentProfile}
                                    onClick={(e) => handleRemoveRecentProfile(e, profile.fcc_id)}
                                    aria-label="प्रोफ़ाइल हटाएं"
                                >
                                    <XCircle size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {student && !loading && !scanning && (
                <div className={styles.profileCard} ref={profileCardRef}>
                    <h2 className={styles.profileCardHeading}>विद्यार्थी प्रोफ़ाइल</h2>
                    {student.photo_url ? (
                        <img src={student.photo_url} alt={`${student.name} का प्रोफ़ाइल`} className={styles.profilePicture} />
                    ) : (
                        <p className={styles.noPhotoText}>कोई फोटो उपलब्ध नहीं है</p>
                    )}
                    <p className={styles.profileText}><strong>नाम:</strong> {student.name}</p>
                    <p className={styles.profileText}><strong>FCC ID:</strong> {student.fcc_id}</p>
                    <p className={styles.profileText}><strong>पिता का नाम:</strong> {student.father}</p>
                    <p className={styles.profileText}><strong>माता का नाम:</strong> {student.mother}</p>
                    <p className={styles.profileText}><strong>स्कूलिंग क्लास:</strong> {student.schooling_class}</p>
                    <hr style={{ borderTop: "1px dotted rgba(0, 0, 0, 0.2)", margin: "8px 0", borderBottom: "none" }} />
                    <p className={styles.profileText}><strong>ट्यूशन क्लास:</strong> {student.fcc_class}</p>
                    <p className={styles.profileText}><strong>मोबाइल नंबर:</strong> {student.mobile_number}</p>
                    <p className={styles.profileText}><strong>पता:</strong> {student.address}</p>
                    <p className={styles.profileText}><strong>ट्यूशन शुल्क भुगतान:</strong> {student.tutionfee_paid ? "बाकी ⏳" : "जम्मा ✅"}</p>

                    {student && student.tutionfee_paid && (
                        <div className={styles.feeDetails}>
                            <h3 className={styles.feeDetailsHeading}>बकाया फीस विवरण</h3>
                            {feeLoading ? (
                                <p className={styles.feeLoadingText}>फीस विवरण लोड हो रहा है...</p>
                            ) : feeDetails ? (
                                <table className={styles.feeTable}>
                                    <thead>
                                        <tr>
                                            <th className={styles.feeTableHeader}>बाकी फीस</th>
                                            <th className={styles.feeTableHeader}>देय तारीख</th>
                                            <th className={styles.feeTableHeader}>ऑफर प्राइस</th>
                                            <th className={styles.feeTableHeader}>ऑफर की अंतिम तिथि</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td className={styles.feeTableCell}>{feeDetails.fee_remaining}</td>
                                            <td className={styles.feeTableCell}>{feeDetails.due_date ? new Date(feeDetails.due_date).toLocaleDateString("hi-IN") : "-"}</td>
                                            <td className={styles.feeTableCell}>{feeDetails.offer_price || "-"}</td>
                                            <td className={styles.feeTableCell}>{feeDetails.offer_valid_till ? new Date(feeDetails.offer_valid_till).toLocaleDateString("hi-IN") : "-"}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            ) : (
                                <p className={styles.noFeeDetailsText}>कोई फीस विवरण उपलब्ध नहीं है</p>
                            )}
                        </div>
                    )}

                    {student && student.tutionfee_paid && feeDetails && feeDetails.fee_remaining > 0 && (
                        <button className={styles.paymentButton} onClick={handlePaymentButtonClick}>जमा करें</button>
                    )}

                    <div className={styles.buttonGroup}>
                        <button
                            className={styles.viewCtcCtgButton}
                            onClick={handleViewCtcCtgButtonClick}
                            aria-label={`${student.name} का कोचिंग टाइम देखें`}
                        >
                            <span className={styles.buttonTitle}>{student.name} का कोचिंग टाइम</span>
                            <span className={styles.buttonSubtext}>देखें और जानें ➤</span>
                        </button>
                    </div>
                    <button
                        className={styles.cardHubButton}
                        onClick={handleCardHubButtonClick}
                        aria-label={`${student.name} का पढ़ाई विवरण देखें`}
                    >
                        <span className={styles.buttonTitle}>{student.name} का पढ़ाई विवरण</span>
                        <span className={styles.buttonSubtext}>सभी जानकारी देखें ➤</span>
                    </button>
                    <button
                        className={styles.viewLeaderboardButton}
                        onClick={handleLeaderboardButtonClick}
                        aria-label="लीडरबोर्ड देखें"
                    >
                        <span className={styles.buttonTitle}>लीडरबोर्ड</span>
                        <span className={styles.buttonSubtext}>रैंक और टास्क देखें ➤</span>
                    </button>
                    <button
                        className={styles.viewClassroomButton}
                        onClick={handleClassroomButtonClick}
                    >
                        <span className={styles.buttonTitle}>Go to Classroom</span>
                        <span className={styles.buttonSubtext}>View Class ➤</span>
                    </button>
                </div>
            )}

            {error && !scanning && <p className={styles.errorMessage} role="alert">{error}</p>}

            {showPaymentModal && student && feeDetails && feeDetails.fee_remaining > 0 && (
                <div className={styles.modalOverlay} onClick={() => setShowPaymentModal(false)}>
                    <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
                        <button className={styles.modalCloseButton} onClick={() => setShowPaymentModal(false)}>
                            <XCircle size={20} />
                        </button>
                        <img src={upiQR} alt="UPI QR Code" className={styles.upiQrImage} />
                        <p className={styles.modalText}><strong>UPI ID:</strong> 9135365331@okbizaxis<br /><strong>मोबाईल नंबर:</strong> 9135365331</p>
                        <p className={styles.paymentNote}>ध्यान दें: भुगतान करने के बाद, आपका डेटा कुछ देर में स्वचालित रूप से अपडेट हो जाएगा।</p>
                        <p className={styles.modalText}><strong>रुपये:</strong> ₹{getPaymentAmount()}</p>
                        {feeDetails.offer_valid_till && new Date() > new Date(feeDetails.offer_valid_till) && (
                            <p className={styles.offerExpiredText}>Offer Expired</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentProfile;