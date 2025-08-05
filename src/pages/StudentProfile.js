import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styles from "./StudentProfile.module.css";
import { ClipLoader } from "react-spinners";
import NotFoundImage from "../assets/404-image.jpg";
import QrScanner from "react-qr-scanner";
import { QrCode, ScanLine, XCircle, Clock, BookOpen, BarChart3, School2 } from "lucide-react";
import upiQR from "../assets/upiqr.png";
import { v4 as uuidv4 } from 'uuid';
import { supabase } from "../utils/supabaseClient";
import StudentSkills from "../components/StudentSkills";

// हेल्पर फंक्शन: डिवाइस की जानकारी पाने के लिए
const getUserAgent = () => {
    try {
        const ua = navigator.userAgent;
        let os = 'Unknown OS', browser = 'Unknown Browser';
        if (ua.indexOf('Win') !== -1) os = 'Windows';
        if (ua.indexOf('Mac') !== -1) os = 'MacOS';
        if (ua.indexOf('Linux') !== -1) os = 'Linux';
        if (ua.indexOf('Android') !== -1) os = 'Android';
        if (ua.indexOf('like Mac') !== -1) os = 'iOS';
        if (ua.indexOf('Chrome') > -1 && ua.indexOf('Edg') === -1) browser = 'Chrome';
        if (ua.indexOf('Firefox') > -1) browser = 'Firefox';
        if (ua.indexOf('Safari') > -1 && ua.indexOf('Chrome') === -1) browser = 'Safari';
        if (ua.indexOf('Edg') > -1) browser = 'Edge';
        return `${os} | ${browser}`;
    } catch (e) { return 'Browser/Node.js'; }
};

const StudentProfile = () => {
    // --- States ---
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
    const [skillsData, setSkillsData] = useState(null);
    const [skillsLoading, setSkillsLoading] = useState(false);
    const [skillsError, setSkillsError] = useState("");

    // --- Refs and Hooks ---
    const navigate = useNavigate();
    const { fccId: urlFccId } = useParams();
    const inputRef = useRef(null);
    const sessionId = useRef(uuidv4());
    const profileCardRef = useRef(null);
    const userAgent = useRef(getUserAgent());

    const logUserActivity = useCallback(async (activityType, activityDetails = null) => {
        const activityData = {
            session_id: sessionId.current,
            page_url: window.location.pathname,
            activity_type: activityType,
            activity_details: activityDetails ? JSON.stringify(activityDetails) : null,
            user_name: userAgent.current,
        };
        try {
            await supabase.from("user_activity_log").insert([activityData]);
        } catch (err) { console.error("Supabase log exception:", err); }
    }, []);

    const showToast = (message, type = "info") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
        logUserActivity('Show Toast', { message, type });
    };

    // ✅ FIX: पुराने कोड से यह फंक्शन लिया गया है ताकि ऑफर प्राइस सही से दिखे।
    const getPaymentAmount = () => {
        if (!feeDetails) return null;
        const now = new Date();
        if (feeDetails.offer_valid_till) {
            const offerValidTill = new Date(feeDetails.offer_valid_till);
            if (now <= offerValidTill && feeDetails.offer_price) {
                return feeDetails.offer_price;
            }
        }
        return feeDetails.fee_remaining;
    };

    const handleSearch = useCallback(async (searchFccId) => {
        const fccToSearch = searchFccId.trim();
        if (!fccToSearch) {
            setError("FCC ID खाली नहीं हो सकता");
            return;
        }
        setLoading(true);
        setError("");
        setStudent(null);
        setSkillsData(null);
        setSkillsError("");
        logUserActivity("Start Profile Search", { fcc_id: fccToSearch });

        try {
            const { data, error } = await supabase.from("new_student_admission").select("*").eq("fcc_id", fccToSearch).maybeSingle();
            if (error || !data) {
                setStudent(null);
                setError("विद्यार्थी नहीं मिला");
                showToast("विद्यार्थी नहीं मिला", "error");
                logUserActivity("Search Result: Failure", { fcc_id: fccToSearch, error: error?.message });
                return;
            }
            setStudent(data);
            localStorage.setItem("lastViewedFccId", data.fcc_id);
            const currentRecent = JSON.parse(localStorage.getItem("recentProfiles")) || [];
            const isAlreadyRecent = currentRecent.some(p => p.fcc_id === data.fcc_id);
            if (!isAlreadyRecent) {
                const newProfile = { name: data.name, photo_url: data.photo_url, fcc_id: data.fcc_id };
                const updatedRecent = [newProfile, ...currentRecent].slice(0, 10);
                setRecentProfiles(updatedRecent);
                localStorage.setItem("recentProfiles", JSON.stringify(updatedRecent));
            }
            logUserActivity("Search Result: Success", { fcc_id: fccToSearch, name: data.name });
        } catch (err) {
            setError("कुछ त्रुटि हो गयी।");
            showToast("कुछ त्रुटि हो गयी।", "error");
            logUserActivity("Search Result: Exception", { fcc_id: fccToSearch, error: err.message });
        } finally {
            setLoading(false);
            setScanning(false);
            setFccId("");
            if (inputRef.current) inputRef.current.value = "";
        }
    }, [logUserActivity]);
    
    useEffect(() => {
        logUserActivity('Page Load');
        const savedRecentProfiles = JSON.parse(localStorage.getItem("recentProfiles")) || [];
        setRecentProfiles(savedRecentProfiles);
    }, [logUserActivity]);

    useEffect(() => {
        const fccIdToLoad = urlFccId || localStorage.getItem("lastViewedFccId");
        if (fccIdToLoad) { handleSearch(fccIdToLoad); } 
        else { setStudent(null); }
    }, [urlFccId, handleSearch]);
    
    useEffect(() => {
        if (student && profileCardRef.current) {
            profileCardRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }, [student]);

    useEffect(() => {
        const fetchDataForStudent = async () => {
            if (student?.fcc_id) {
                if (student.tutionfee_paid) {
                    setFeeLoading(true);
                    try {
                        const { data, error } = await supabase.from("tuition_fee_details").select("*").eq("fcc_id", student.fcc_id).maybeSingle();
                        if (error) throw error;
                        setFeeDetails(data);
                    } catch (err) { console.error("Fee fetch error:", err); setFeeDetails(null); } 
                    finally { setFeeLoading(false); }
                } else { setFeeDetails(null); }
                setSkillsLoading(true);
                setSkillsError("");
                try {
                    const { data, error } = await supabase.rpc('get_student_full_report', { p_student_fcc_id: student.fcc_id });
                    if (error) throw error;
                    setSkillsData(data?.targets || []);
                } catch (err) { setSkillsError("कौशल रिपोर्ट लाने में विफल।"); console.error("Skill fetch error:", err); } 
                finally { setSkillsLoading(false); }
            }
        };
        fetchDataForStudent();
    }, [student]);

    const handleInputChange = (e) => { const numericValue = e.target.value.replace(/[^0-9]/g, ""); if (e.target.value !== numericValue) showToast("केवल संख्याएँ मान्य हैं", "warning"); setFccId(numericValue); logUserActivity('Input Change', { value: numericValue }); };
    const handleSearchClick = () => { if (fccId.trim() === "") { showToast("कृपया FCC ID दर्ज करें", "warning"); logUserActivity('Empty Search Attempt'); return; } logUserActivity('Click Search Button', { fcc_id: fccId }); navigate(`/student/${fccId}`, { replace: true }); };
    const handleRecentProfileClick = (profile) => { logUserActivity('Click Recent Profile', { fcc_id: profile.fcc_id, name: profile.name }); navigate(`/student/${profile.fcc_id}`, { replace: true }); };
    const handleRemoveRecentProfile = (e, fcc_id_to_remove) => { e.stopPropagation(); logUserActivity('Attempt Remove Recent Profile', { removed_fcc_id: fcc_id_to_remove }); const updatedRecent = recentProfiles.filter(p => p.fcc_id !== fcc_id_to_remove); setRecentProfiles(updatedRecent); localStorage.setItem("recentProfiles", JSON.stringify(updatedRecent)); showToast("प्रोफ़ाइल हटा दी गई", "info"); };
    const handleScan = (data) => { if (data) { const numericData = (data.text || "").replace(/[^0-9]/g, ""); logUserActivity('Successful QR Scan', { scanned_fcc_id: numericData }); navigate(`/student/${numericData}`, { replace: true }); } };
    const handleError = (err) => { console.error("QR scanner error:", err); setScanning(false); logUserActivity('QR Scan Error', { error_message: err.message }); };
    const handleScanClick = () => { setScanning(true); logUserActivity('Initiate QR Scan'); };
    const handleScanCancel = () => { setScanning(false); logUserActivity('Cancel QR Scan'); };
    const handlePaymentButtonClick = () => { setShowPaymentModal(true); logUserActivity('Open Payment Modal', { fcc_id: student?.fcc_id, amount_due: getPaymentAmount() }); };
    const handleModalClose = () => { setShowPaymentModal(false); logUserActivity('Close Payment Modal', { fcc_id: student?.fcc_id }); };
    const handleWhatsAppClick = () => { if (!student) return; const url = `https://wa.me/9135365331?text=${encodeURIComponent(student.fcc_id + " ट्यूशन फीस की जानकारी")}`; logUserActivity('Click WhatsApp Fee Details', { fcc_id: student.fcc_id }); window.open(url, '_blank', 'noopener,noreferrer'); };
    const handleViewCtcCtgButtonClick = () => { logUserActivity('Click View Coaching Time Button', { fcc_id: student?.fcc_id }); navigate("/view-ctc-ctg", { state: { student } }); };
    const handleCardHubButtonClick = () => { logUserActivity('Click View Padhai Vivran Button', { fcc_id: student?.fcc_id }); navigate("/card-hub", { state: { student } }); };
    const handleLeaderboardButtonClick = () => { logUserActivity('Click Leaderboard Button', { fcc_id: student?.fcc_id }); navigate("/leaderboard", { state: { student } }); };
    const handleClassroomButtonClick = () => { logUserActivity('Click Classroom Button'); navigate("/classroom"); };

    return (
        <div className={styles.profileContainer}>
           <h1 style={{fontSize: "2.5rem", fontWeight: "bold", background: "linear-gradient(270deg, #6a11cb, #2575fc, #ff6a00, #00b09b)", backgroundSize: "800% 800%", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", animation: "gradientShift 8s ease infinite", marginBottom: "1rem"}}>
             विद्यार्थी प्रोफाइल
           </h1>
            <div className={styles.searchBar}>
                <input type="text" value={fccId} onChange={handleInputChange} onKeyDown={e => e.key === "Enter" && handleSearchClick()} placeholder="FCC ID डालें" className={styles.searchInput} ref={inputRef} disabled={scanning} />
                <button onClick={handleSearchClick} className={styles.searchButton} disabled={loading || !fccId.trim() || scanning}>{loading ? <ClipLoader color="#ffffff" size={15} /> : "खोजें"}</button>
                <button onClick={handleScanClick} className={styles.scanButton} disabled={loading || scanning}>{scanning ? <ClipLoader color="#ffffff" size={15} /> : <><QrCode size={20} /> QR स्कैन <ScanLine size={20} /></>}</button>
            </div>
            {scanning && <div className={styles.qrScannerContainer}><QrScanner delay={300} onError={handleError} onScan={handleScan} style={{ width: "100%" }} constraints={{ video: { facingMode: "environment" } }} /><button className={styles.scanCancelButton} onClick={handleScanCancel}>रद्द करें</button></div>}
            {error && !scanning && <p className={styles.errorMessage}>{error}</p>}
            {toast && <div className={`${styles.toast} ${styles[`toast${toast.type.charAt(0).toUpperCase() + toast.type.slice(1)}`]}`}>{toast.message}</div>}
            
            {recentProfiles.length > 0 && <div className={styles.recentProfiles}><h2 className={styles.recentProfilesHeading}>हाल ही में देखे गए प्रोफ़ाइल</h2><div className={styles.recentProfilesSlider}>{recentProfiles.map(p => (<div key={p.fcc_id} className={styles.recentProfileCard} onClick={() => handleRecentProfileClick(p)}>{p.photo_url ? <img src={p.photo_url || NotFoundImage} alt={p.name} className={styles.recentProfilePicture} /> : <div className={styles.noPhotoText}>फोटो नहीं</div>}<p className={styles.recentProfileName}>{p.name}</p><button className={styles.removeRecentProfile} onClick={(e) => handleRemoveRecentProfile(e, p.fcc_id)}><XCircle size={16} color="grey" /></button></div>))}</div></div>}
            
            {loading && <div className={styles.loaderContainer}><p className={styles.loaderText}>प्रोफ़ाइल लोड हो रहा है...</p></div>}
            
            {student && !loading && !scanning && (
                <div className={styles.profileCard} ref={profileCardRef}>
                    <h2 className={styles.profileCardHeading}>विद्यार्थी प्रोफ़ाइल</h2>
                    {student.photo_url ? <img src={student.photo_url} alt={student.name} className={styles.profilePicture} /> : <p className={styles.noPhotoText}>कोई फोटो उपलब्ध नहीं है</p>}
                    <p className={styles.profileText}><strong>नाम:</strong> {student.name}</p>
                    <p className={styles.profileText}><strong>FCC ID:</strong> {student.fcc_id}</p>
                    <p className={styles.profileText}><strong>पिता का नाम:</strong> {student.father}</p>
                    <p className={styles.profileText}><strong>ट्यूशन क्लास:</strong> {student.fcc_class}</p>
                    <p className={styles.profileText}><strong>पता:</strong> {student.address}</p>
                    <p className={styles.profileText}><strong>ट्यूशन शुल्क:</strong> {student.tutionfee_paid ? "बाकी ⏳" : "जम्मा ✅"}</p>

                    {/* ✅ FIX: यह सेक्शन अब पुराने कोड की तरह विस्तृत जानकारी दिखाएगा। */}
                    {student.tutionfee_paid && (
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
                                            <td className={styles.feeTableCell}>₹{feeDetails.fee_remaining}</td>
                                            <td className={styles.feeTableCell}>{feeDetails.due_date ? new Date(feeDetails.due_date).toLocaleDateString("hi-IN") : "-"}</td>
                                            <td className={styles.feeTableCell}>{feeDetails.offer_price ? `₹${feeDetails.offer_price}` : "-"}</td>
                                            <td className={styles.feeTableCell}>{feeDetails.offer_valid_till ? new Date(feeDetails.offer_valid_till).toLocaleDateString("hi-IN") : "-"}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            ) : (
                                <p className={styles.noFeeDetailsText}>कोई फीस विवरण उपलब्ध नहीं है</p>
                            )}
                        </div>
                    )}
                    
                    {student.tutionfee_paid && feeDetails && feeDetails.fee_remaining > 0 && (
                        <div className={styles.paymentActionsContainer}>
                            <button className={styles.paymentButton} onClick={handlePaymentButtonClick}>₹ जमा करें</button>
                            <button className={styles.whatsAppButton} onClick={handleWhatsAppClick}>पूरी जानकारी पता करें</button>
                        </div>
                    )}

                    <div className={styles.divider}></div>
                    <StudentSkills targets={skillsData} isLoading={skillsLoading} logActivity={logUserActivity} studentFccId={student.fcc_id} />
                    {skillsError && <p className={styles.errorMessage}>{skillsError}</p>}
                    <div className={styles.buttonGroup}>
                        <button className={`${styles.actionButton} ${styles.buttonCoachingTime}`} onClick={handleViewCtcCtgButtonClick}><div className={styles.buttonTextContainer}><span className={styles.buttonTitle}>{student.name} का कोचिंग टाइम</span><span className={styles.buttonSubtext}>देखें ➤</span></div><div className={styles.buttonIconContainer}><Clock size={24} /></div></button>
                        <button className={`${styles.actionButton} ${styles.buttonPadeiVavran}`} onClick={handleCardHubButtonClick}><div className={styles.buttonTextContainer}><span className={styles.buttonTitle}>{student.name} का पढ़ाई विवरण</span><span className={styles.buttonSubtext}>देखें ➤</span></div><div className={styles.buttonIconContainer}><BookOpen size={24} /></div></button>
                        <button className={`${styles.actionButton} ${styles.buttonLeaderboard}`} onClick={handleLeaderboardButtonClick}><div className={styles.buttonTextContainer}><span className={styles.buttonTitle}>लीडरबोर्ड</span><span className={styles.buttonSubtext}>देखें ➤</span></div><div className={styles.buttonIconContainer}><BarChart3 size={24} /></div></button>
                        <button className={`${styles.actionButton} ${styles.buttonClassroom}`} onClick={handleClassroomButtonClick}><div className={styles.buttonTextContainer}><span className={styles.buttonTitle}>क्लासरूम</span><span className={styles.buttonSubtext}>देखें ➤</span></div><div className={styles.buttonIconContainer}><School2 size={24} /></div></button>
                    </div>
                </div>
            )}
            
            {/* ✅ FIX: पेमेंट Modal अब ऑफर प्राइस और एक्सपायरी डेट दिखाएगा। */}
            {showPaymentModal && student && feeDetails && (
                <div className={styles.modalOverlay} onClick={handleModalClose}>
                    <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
                        <button className={styles.modalCloseButton} onClick={handleModalClose}><XCircle size={20} /></button>
                        <img src={upiQR} alt="UPI QR" className={styles.upiQrImage} />
                        <p className={styles.modalText}><strong>UPI ID:</strong> 9135365331@okbizaxis</p>
                        <p className={styles.paymentNote}>भुगतान के बाद डेटा अपडेट हो जाएगा।</p>
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