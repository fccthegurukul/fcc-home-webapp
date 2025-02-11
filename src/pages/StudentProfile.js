// StudentProfile.js

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./StudentProfile.css";
import { ClipLoader } from "react-spinners";
import NotFoundImage from "../assets/404-image.jpg";
import QrScanner from "react-qr-scanner";
import { QrCode, ScanLine, XCircle } from "lucide-react";
import upiQR from "../assets/upiqr.png";

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
  const inputRef = useRef(null);
  const profileCardRef = useRef(null);
  const apiUrl = process.env.REACT_APP_API_URL;

  // Helper: UPI Payment Amount (यदि ऑफ़र वैध है तो offer_price, अन्यथा fee_remaining)
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

  // Toast helper: 3 सेकंड के बाद ऑटो-dismiss
  const showToast = (message, type = "info") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  // handleSearch को useCallback में रैप करें ताकि यह स्टेबल रहे
  const handleSearch = useCallback(async (searchFccId) => {
    const fccToSearch = searchFccId;
    if (!fccToSearch || !fccToSearch.trim()) {
      setError("FCC ID खाली नहीं हो सकता");
      showToast("FCC ID खाली नहीं हो सकता", "warning"); // Added toast for empty FCC ID
      return;
    }

    setLoading(true);
    setError("");
    setStudent(null);

    try {
      const response = await fetch(
        `${apiUrl}/get-student-profile/${fccToSearch}`
      );

      if (!response.ok) {
        const message = `HTTP error! status: ${response.status}`;
        console.error("API error:", message); // Log HTTP error for debugging
        let errorMessage = "विद्यार्थी नहीं मिला"; // Default error message
        try {
          const errorData = await response.json(); // Attempt to parse JSON error response
          errorMessage = errorData.error || errorMessage; // Use error from JSON if available
        } catch (jsonError) {
          console.error("Failed to parse error JSON:", jsonError);
          // If JSON parsing fails, use default message or a more generic one
          errorMessage = `विद्यार्थी नहीं मिला (HTTP ${response.status})`;
        }
        setError(errorMessage);
        showToast(errorMessage, "error");
        setStudent(null); // Ensure student state is reset on error
      } else {
        const data = await response.json();
        setStudent(data);
        setError("");
        localStorage.setItem("lastViewedFccId", data.fcc_id);

        const existingRecentProfiles =
          JSON.parse(localStorage.getItem("recentProfiles")) || [];
        const isAlreadyRecent = existingRecentProfiles.some(
          (profile) => profile.fcc_id === data.fcc_id
        );

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
        localStorage.setItem(
          "recentProfiles",
          JSON.stringify(updatedRecentProfiles)
        );
      }
    } catch (error) {
      console.error("Error during fetch operation:", error); // Log error during fetch
      setError("कुछ त्रुटि हो गयी, कृपया बाद में पुनः प्रयास करें। ");
      showToast("कुछ त्रुटि हो गयी, कृपया बाद में पुनः प्रयास करें।", "error");
      setStudent(null); // Ensure student state is reset on error
    } finally {
      setLoading(false);
      setScanning(false);
      setFccId("");
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }, [apiUrl, showToast, setError, setLoading, setStudent, setRecentProfiles]); // Added missing dependencies

  // Component mount पर recent profiles और last viewed FCC ID लोड करें
  useEffect(() => {
    const savedRecentProfiles =
      JSON.parse(localStorage.getItem("recentProfiles")) || [];
    setRecentProfiles(savedRecentProfiles);

    const storedFccId = localStorage.getItem("lastViewedFccId");
    if (storedFccId) {
      setFccId(storedFccId);
      handleSearch(storedFccId);
    }
  }, [handleSearch]);

  useEffect(() => {
    if (student?.fcc_id) {
      localStorage.setItem("lastViewedFccId", student.fcc_id);
    }
  }, [student]);

  // जब छात्र का प्रोफ़ाइल लोड हो जाए, तो उसे फोकस में लाने के लिए scrollIntoView करें
  useEffect(() => {
    if (student && profileCardRef.current) {
      profileCardRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [student]);

  // जब छात्र का डेटा बदलता है और फीस "बाकी ⏳" है, तो फीस विवरण API से लाएँ
  useEffect(() => {
    if (student && student.tutionfee_paid) {
      setFeeLoading(true);
      fetch(`${process.env.REACT_APP_API_URL}/get-tuition-fee-details/${student.fcc_id}`)
        .then((res) => {
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          return res.json();
        })
        .then((data) => {
          setFeeDetails(data);
          setFeeLoading(false);
        })
        .catch((err) => {
          console.error("फीस विवरण लोड करने में त्रुटि:", err);
          showToast("फीस विवरण लोड करने में त्रुटि", "error");
          setFeeLoading(false);
          setFeeDetails(null); // Reset feeDetails on error
        });
    } else {
      setFeeDetails(null);
    }
  }, [student, showToast]);

  // रीयल-टाइम इनपुट वैलिडेशन: केवल अंकों की अनुमति दें
  const handleInputChange = (e) => {
    const input = e.target.value;
    const numericValue = input.replace(/[^0-9]/g, "");
    if (input !== numericValue) {
      showToast("केवल संख्याएँ मान्य हैं", "warning");
    }
    setFccId(numericValue);
  };

  // सर्च बटन या एंटर की से सर्च ट्रिगर करें
  const handleSearchClick = () => {
    if (fccId.trim() === "") {
      showToast("कृपया FCC ID दर्ज करें", "warning");
      return;
    }
    handleSearch(fccId);
  };

  // Recent profile पर क्लिक होने पर प्रोफ़ाइल लोड करें
  const handleRecentProfileClick = (profile) => {
    setFccId(profile.fcc_id);
    handleSearch(profile.fcc_id);
    localStorage.setItem("lastViewedFccId", profile.fcc_id);
  };

  // Recent profiles में से किसी प्रोफ़ाइल को हटाने का ऑप्शन
  const handleRemoveRecentProfile = (e, fcc_id) => {
    e.stopPropagation();
    const updatedRecent = recentProfiles.filter(
      (profile) => profile.fcc_id !== fcc_id
    );
    setRecentProfiles(updatedRecent);
    localStorage.setItem("recentProfiles", JSON.stringify(updatedRecent));
    showToast("प्रोफ़ाइल हटा दी गई", "info");
  };

  // ==== QR स्कैनिंग (react-qr-scanner) ====

  const handleScan = (data) => {
    if (data) {
      // यदि data स्ट्रिंग नहीं है, तो data.text से स्ट्रिंग प्राप्त करें
      const scannedText =
        typeof data === "string" ? data : data.text ? data.text : "";
      const numericData = scannedText.replace(/[^0-9]/g, "");
      setFccId(numericData);
      setScanning(false);
      setTimeout(() => {
        handleSearch(numericData);
        if (inputRef.current) {
          inputRef.current.value = "";
        }
      }, 1000);
    }
  };

  const handleError = (err) => {
    console.error("QR स्कैनर त्रुटि:", err);
    setError("QR स्कैनर में त्रुटि: " + err.message);
    showToast("QR स्कैनर त्रुटि: " + err.message, "error"); // Added toast for QR scanner error
    setScanning(false);
  };

  // QR स्कैन बटन क्लिक पर स्कैनिंग प्रारंभ करें
  const handleScanClick = () => {
    setScanning(true);
    setError("");
    setStudent(null);
    setFccId("");
  };

  // स्कैनिंग रद्द करने के लिए
  const handleScanCancel = () => {
    setScanning(false);
    setError("");
  };

  // लोडिंग के दौरान दिखाने के लिए skeleton component
  const SkeletonProfileCard = () => (
    <div className="profile-card skeleton">
      <div className="skeleton-circle"></div>
      <div className="skeleton-line skeleton-line-short"></div>
      <div className="skeleton-line"></div>
      <div className="skeleton-line"></div>
      <div className="skeleton-line"></div>
    </div>
  );

  return (
    <div className="profile-container">
      <h1>विद्यार्थी प्रोफाइल</h1>

      <div className="search-bar">
        <input
          type="text"
          value={fccId}
          onChange={handleInputChange}
          onKeyDown={(e) => {
            if (e.key === "Enter" && fccId.trim() !== "") {
              handleSearchClick();
            }
          }}
          placeholder="FCC ID डालें"
          className="search-input"
          aria-label="FCC ID खोजें"
          autoComplete="off"
          inputMode="numeric"
          pattern="[0-9]*"
          ref={inputRef}
          disabled={scanning}
        />
        <button
          onClick={handleSearchClick}
          className="search-button"
          disabled={loading || !fccId.trim() || scanning}
          aria-label="प्रोफ़ाइल खोजें"
          aria-busy={loading}
        >
          {loading ? (
            <ClipLoader color="#ffffff" loading={loading} size={15} />
          ) : (
            "खोजें"
          )}
        </button>
        <button
          onClick={handleScanClick}
          className="scan-button flex items-center gap-2"
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
        <div className="qr-scanner-container">
          <QrScanner
            delay={300}
            onError={handleError}
            onScan={handleScan}
            style={{ width: "100%" }}
          />
          <button className="scan-cancel-button" onClick={handleScanCancel}>
            रद्द करें
          </button>
          {error && <p className="error">{error}</p>}
        </div>
      )}

      {error && !scanning && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`toast toast-${toast.type}`} role="status">
          {toast.message}
        </div>
      )}

      {loading && !student && (
        <div className="loader-container">
          <SkeletonProfileCard />
          <p>प्रोफ़ाइल लोड हो रहा है...</p>
        </div>
      )}

      {/* हाल ही में देखे गए प्रोफ़ाइल */}
      {recentProfiles.length > 0 && (
        <div className="recent-profiles">
          <h2>हाल ही में देखे गए प्रोफ़ाइल</h2>
          <div className="recent-profiles-slider">
            {recentProfiles.map((profile) => (
              <div
                key={profile.fcc_id}
                className="recent-profile-card"
                onClick={() => handleRecentProfileClick(profile)}
                role="button"
                tabIndex="0"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRecentProfileClick(profile);
                }}
              >
                {profile.photo_url ? (
                  <img
                    src={profile.photo_url || NotFoundImage}
                    alt={`${profile.name} का प्रोफ़ाइल`}
                    className="profile-picture"
                  />
                ) : (
                  <p>कोई फोटो उपलब्ध नहीं है</p>
                )}
                <p className="recent-profile-name">{profile.name}</p>
                <button
                  className="remove-recent-profile"
                  onClick={(e) =>
                    handleRemoveRecentProfile(e, profile.fcc_id)
                  }
                  aria-label="प्रोफ़ाइल हटाएं"
                >
                  <XCircle size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* विद्यार्थी प्रोफ़ाइल कार्ड */}
      {student && !loading && !scanning && (
        <div className="profile-card fade-in" ref={profileCardRef}>
          <h2>विद्यार्थी प्रोफाइल</h2>
          {student.photo_url ? (
            <img
              src={student.photo_url}
              alt={`${student.name} का प्रोफ़ाइल`}
              className="profile-picture"
            />
          ) : (
            <p>कोई फोटो उपलब्ध नहीं है</p>
          )}
          <p>
            <strong>नाम:</strong> {student.name}
          </p>
          <p>
            <strong>FCC ID:</strong> {student.fcc_id}
          </p>
          <p>
            <strong>पिता का नाम:</strong> {student.father}
          </p>
          <p>
            <strong>माता का नाम:</strong> {student.mother}
          </p>
          <p>
            <strong>स्कूलिंग क्लास:</strong> {student.schooling_class}
          </p>
          <hr
            style={{
              borderTop: "1px dotted rgba(0, 0, 0, 0.2)",
              margin: "8px 0",
              borderBottom: "none",
            }}
          />
          <p>
            <strong>ट्यूशन क्लास:</strong> {student.fcc_class}
          </p>
          <p>
            <strong>मोबाइल नंबर:</strong> {student.mobile_number}
          </p>
          <p>
            <strong>पता:</strong> {student.address}
          </p>
          <p>
            <strong>ट्यूशन शुल्क भुगतान:</strong>{" "}
            {student.tutionfee_paid ? "बाकी ⏳" : "जम्मा ✅"}
          </p>

          {/* यदि फीस अभी भी बाकी है, तो नीचे फीस विवरण टेबल दिखाएँ */}
          {student && student.tutionfee_paid && (
            <div className="fee-details">
              <h3>बकाया फीस विवरण</h3>
              {feeLoading ? (
                <p>फीस विवरण लोड हो रहा है...</p>
              ) : feeDetails ? (
                <table>
                  <thead>
                    <tr>
                      <th>बाकी फीस</th>
                      <th>देय तारीख</th>
                      <th>ऑफर प्राइस</th>
                      <th>ऑफर की अंतिम तिथि</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{feeDetails.fee_remaining}</td>
                      <td>
                        {feeDetails.due_date
                          ? new Date(feeDetails.due_date).toLocaleDateString("hi-IN")
                          : "-"}
                      </td>
                      <td>
                        {feeDetails.offer_price ? feeDetails.offer_price : "-"}
                      </td>
                      <td>
                        {feeDetails.offer_valid_till
                          ? new Date(feeDetails.offer_valid_till).toLocaleDateString("hi-IN")
                          : "-"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                <p>कोई फीस विवरण उपलब्ध नहीं है</p>
              )}
            </div>
          )}

          {/* Payment Button: केवल तब दिखाएँ जब फीस बाकी हो */}
          {student &&
            student.tutionfee_paid &&
            feeDetails &&
            feeDetails.fee_remaining > 0 && (
              <button
                className="payment-button"
                onClick={() => setShowPaymentModal(true)}
              >
                जमा करें
              </button>
          )}

          <div className="button-group">
            <button
              className="view-ctc-ctg-button"
              onClick={() =>
                navigate("/view-ctc-ctg", {
                  state: {
                    fccId: student.fcc_id,
                    name: student.name,
                    father: student.father,
                    mobile_number: student.mobile_number,
                    recentProfiles: recentProfiles,
                    student: student,
                  },
                })
              }
              aria-label={`${student.name} का कोचिंग टाइम देखें`}
            >
              <span className="button-title">
                {student.name} का कोचिंग टाइम
              </span>
              <span className="button-subtext">देखें और जानें ➤</span>
            </button>
          </div>

          <button
            className="card-hub-button"
            onClick={() =>
              navigate("/card-hub", {
                state: { fccId: student.fcc_id, recentProfiles: recentProfiles, student: student },
              })
            }
            aria-label={`${student.name} का पढ़ाई विवरण देखें`}
          >
            <span className="button-title">
              {student.name} का पढ़ाई विवरण
            </span>
            <span className="button-subtext">सभी जानकारी देखें ➤</span>
          </button>
          <button
            className="view-leaderboard-button"
            onClick={() =>
              navigate("/leaderboard", {
                state: { fccId: student.fcc_id, student: student },
              })
            }
            aria-label="लीडरबोर्ड देखें"
          >
            <span className="button-title">लीडरबोर्ड</span>
            <span className="button-subtext">रैंक और टास्क देखें ➤</span>
          </button>
        </div>
      )}

      {error && !scanning && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {/* Payment Modal: केवल तब दिखाएँ जब फीस अभी भी बाकी हो */}
      {showPaymentModal && student && feeDetails && feeDetails.fee_remaining > 0 && (
        <div
          className="modal-overlay"
          onClick={() => setShowPaymentModal(false)}
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close-button"
              onClick={() => setShowPaymentModal(false)}
            >
              <XCircle size={20} />
            </button>
            <img src={upiQR} alt="UPI QR Code" className="upi-qr" />
            <p>
              <strong>UPI ID:</strong> fccthegurukul@okaxis
              <br />
              <strong>मोबाईल नंबर:</strong> 9135365331
            </p>
            <p className="payment-note">
              ध्यान दें: भुगतान करने के बाद, आपका डेटा कुछ देर में स्वचालित रूप से अपडेट हो जाएगा।
            </p>
            <p>
              <strong>रुपये:</strong> ₹{getPaymentAmount()}
            </p>
            {feeDetails.offer_valid_till &&
              new Date() > new Date(feeDetails.offer_valid_till) && (
                <p style={{ color: "red", fontWeight: "bold" }}>
                  Offer Expired
                </p>
              )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentProfile;