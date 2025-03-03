import React, { useState } from "react";
import { FaMicrophone, FaMobileAlt, FaWhatsapp } from "react-icons/fa";
import "./ContactForm.css";

const ContactForm = () => {
  const [formData, setFormData] = useState({
    mobileNumber: "",
    message: "",
    termsAccepted: true, // By default checked
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [responseMessage, setResponseMessage] = useState("");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  // Speech Recognition API for message input
  const handleVoiceInput = () => {
    if ("webkitSpeechRecognition" in window) {
      const recognition = new window.webkitSpeechRecognition();
      recognition.lang = "hi-IN"; // Hindi language
      recognition.onresult = (event) => {
        setFormData((prev) => ({
          ...prev,
          message: event.results[0][0].transcript,
        }));
      };
      recognition.start();
    } else {
      alert("आपका ब्राउज़र वॉइस इनपुट को सपोर्ट नहीं करता।");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.mobileNumber || !formData.message) {
      setResponseMessage("कृपया सभी आवश्यक फ़ील्ड भरें!");
      return;
    }
    if (!formData.termsAccepted) {
      setResponseMessage("कृपया व्हाट्सएप अपडेट प्राप्त करने की सहमति दें!");
      return;
    }

    setIsSubmitting(true);
    setResponseMessage("");

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (response.ok) {
        setResponseMessage("संदेश सफलतापूर्वक भेजा गया!");
        setFormData({ mobileNumber: "", message: "", termsAccepted: true });
      } else {
        setResponseMessage(result.message || "संदेश भेजने में विफल! पुन: प्रयास करें।");
      }
    } catch (error) {
      setResponseMessage("कुछ गलत हुआ, कृपया बाद में पुनः प्रयास करें।");
      console.error("Error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="contact-form-container">
      <h2>हमसे संपर्क करें</h2>
      <p className="subtitle">कोचिंग से जुड़ी जानकारी प्राप्त करने के लिए फॉर्म भरें।</p>
      <form onSubmit={handleSubmit} className="contact-form">
        <div className="form-group">
          <label htmlFor="mobileNumber">
            <FaMobileAlt /> मोबाइल नंबर <span>*</span>
          </label>
          <input
            type="tel"
            id="mobileNumber"
            name="mobileNumber"
            value={formData.mobileNumber}
            onChange={handleChange}
            placeholder="अपना 10-अंकीय मोबाइल नंबर दर्ज करें"
            pattern="[0-9]{10}"
            maxLength="10"
            required
          />
        </div>

        <div className="form-group message-group">
          <label htmlFor="message">
            संदेश <span>*</span>
          </label>
          <div className="message-input">
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              placeholder="अपना संदेश यहां टाइप करें..."
              rows="4"
              required
            />
            <button type="button" className="mic-button" onClick={handleVoiceInput}>
              <FaMicrophone />
            </button>
          </div>
        </div>

        <div className="form-group checkbox-group">
          <input
            type="checkbox"
            id="termsAccepted"
            name="termsAccepted"
            checked={formData.termsAccepted}
            onChange={handleChange}
          />
          <label htmlFor="termsAccepted">
            <FaWhatsapp /> मैं व्हाट्सएप अपडेट प्राप्त करने के लिए सहमत हूँ।
          </label>
        </div>

        <button type="submit" disabled={isSubmitting} className={isSubmitting ? "submitting" : ""}>
          {isSubmitting ? "भेजा जा रहा है..." : "संदेश भेजें 🚀"}
        </button>

        {responseMessage && (
          <p className={`response-message ${responseMessage.includes("सफलतापूर्वक") ? "success" : "error"}`}>
            {responseMessage}
          </p>
        )}
      </form>

      <a
        href="https://wa.me/9135365331?text=मुझे%20कोचिंग%20से%20कुछ%20बातों%20को%20जानने%20के%20लिए%20संपर्क%20करना%20चाहता%20हूं।"
        className="whatsapp-link"
        target="_blank"
        rel="noopener noreferrer"
      >
        <FaWhatsapp /> WhatsApp पर संपर्क करें
      </a>
    </div>
  );
};

export default ContactForm;
