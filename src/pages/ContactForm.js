import React, { useState } from 'react';
import './ContactForm.css';

const ContactForm = () => {
  const [formData, setFormData] = useState({
    mobileNumber: '',
    message: '',
    termsAccepted: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [responseMessage, setResponseMessage] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.mobileNumber || !formData.message) {
      setResponseMessage('Please fill all required fields!');
      return;
    }
    if (!formData.termsAccepted) {
      setResponseMessage('Please accept the terms to proceed!');
      return;
    }

    setIsSubmitting(true);
    setResponseMessage(''); // Clear previous messages

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (response.ok) {
        setResponseMessage('Message sent successfully! We’ll get back to you soon.');
        setFormData({ mobileNumber: '', message: '', termsAccepted: false });
      } else {
        setResponseMessage(result.message || 'Failed to send message. Try again.');
      }
    } catch (error) {
      setResponseMessage('Something went wrong. Please try again later.');
      console.error('Error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="contact-form-container">
      <h2>Get in Touch</h2>
      <p className="subtitle">We’d love to hear from you! Fill out the form below.</p>
      <form onSubmit={handleSubmit} className="contact-form">
        <div className="form-group">
          <label htmlFor="mobileNumber">Mobile Number <span>*</span></label>
          <input
            type="tel"
            id="mobileNumber"
            name="mobileNumber"
            value={formData.mobileNumber}
            onChange={handleChange}
            placeholder="Enter 10-digit mobile number"
            pattern="[0-9]{10}"
            maxLength="10"
            required
          />
          <small>Enter a valid 10-digit number</small>
        </div>

        <div className="form-group">
          <label htmlFor="message">Your Message <span>*</span></label>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            placeholder="Type your message here..."
            rows="5"
            minLength="10"
            required
          />
          <small>Minimum 10 characters</small>
        </div>

        <div className="form-group checkbox-group">
          <input
            type="checkbox"
            id="termsAccepted"
            name="termsAccepted"
            checked={formData.termsAccepted}
            onChange={handleChange}
            required
          />
          <label htmlFor="termsAccepted">
            I agree to receive updates via WhatsApp
          </label>
        </div>

        <button type="submit" disabled={isSubmitting} className={isSubmitting ? 'submitting' : ''}>
          {isSubmitting ? 'Sending...' : 'Send Message'}
        </button>

        {responseMessage && (
          <p className={`response-message ${responseMessage.includes('success') ? 'success' : 'error'}`}>
            {responseMessage}
          </p>
        )}
      </form>
    </div>
  );
};

export default ContactForm;