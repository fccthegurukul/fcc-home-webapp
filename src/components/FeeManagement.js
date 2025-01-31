import React, { useState, useEffect } from "react";
import axios from "axios";
import "./FeeManagement.css";
import qrCodeImage from "../assets/upiqr.png";



const FeeManagement = () => {
  const [payments, setPayments] = useState([]);
  const [paymentData, setPaymentData] = useState({
    fcc_id: "",
    amount: "",
    payment_method: "",
    payment_status: "Pending",
    student_name: "",
    monthly_cycle_days: [],
  });
  const [filters, setFilters] = useState({
    fcc_id: "",
    payment_status: "",
    payment_method: "",
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    fetchPayments();
  }, [filters]);

  const [isVisible, setIsVisible] = useState(true); // State for visibility of QR code

  useEffect(() => {
    fetchPayments();
    const handleScroll = () => {
      // Hide QR code when the page is scrolled down
      if (window.scrollY > 0) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
    };

    window.addEventListener("scroll", handleScroll);

    return () => window.removeEventListener("scroll", handleScroll); // Cleanup on unmount
  }, [filters]);

  const fetchPayments = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/payments", {
        params: filters,
      });
      setPayments(response.data);
    } catch (error) {
      console.error("Error fetching payments:", error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPaymentData({ ...paymentData, [name]: value });
     let updatedValue = value;

  // If the field is 'amount', calculate the total fee with 18% GST
  if (name === 'amount' && value) {
    const amountWithGST = parseFloat(value) * 1.18;
    setPaymentData({
      ...paymentData,
      [name]: value,
      totalFee: amountWithGST.toFixed(2), // Store the total fee
    });
  } else {
    setPaymentData({
      ...paymentData,
      [name]: updatedValue,
    });
  }
  };

  const handleCycleChange = (e) => {
    const { value } = e.target;
    setPaymentData({
      ...paymentData,
      monthly_cycle_days: value.split(',').map(day => parseInt(day.trim(), 10)),
    });
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({ ...filters, [name]: value });
  };
  

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post("http://localhost:5000/api/payments", paymentData);
      const { receipt } = response.data;
  
      // Open the receipt in a new window or trigger a download
      window.open(`http://localhost:5000/${receipt}`, '_blank');
      
      fetchPayments(); // Refresh the payment list
      setPaymentData({
        fcc_id: "",
        amount: "",
        payment_method: "",
        payment_status: "Pending",
        student_name: "",
        monthly_cycle_days: [],
      });
    } catch (error) {
      console.error("Error adding payment:", error);
    }
  };
  


  return (
    <div className="fee-management">
      <h1>Fee Management</h1>
   {/* QR Code that hides on scroll */}
   {isVisible && (
        <div className="qr-code">
          <img src={qrCodeImage} alt="QR Code" className="qr-code-img" />
        </div>
      )}

      {/* Payment Form */}
      <form onSubmit={handleSubmit} className="payment-form">
        <label>
          FCC ID:
          <input
            type="text"
            name="fcc_id"
            value={paymentData.fcc_id}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          Amount:
          <input
            type="number"
            name="amount"
            value={paymentData.amount}
            onChange={handleChange}
            required
          />
        </label>
        <label>
</label>
<label>
  Total Fee (with 18% GST):
  <input
    type="text"
    value={paymentData.totalFee || 0}
    readOnly
  />
</label>

        <label>
          Payment Method:
          <input
            type="text"
            name="payment_method"
            value={paymentData.payment_method}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          Payment Status:
          <select
            name="payment_status"
            value={paymentData.payment_status}
            onChange={handleChange}
          >
            <option value="Pending">Pending</option>
            <option value="Completed">Completed</option>
            <option value="Failed">Failed</option>
          </select>
        </label>
        <label>
          Student Name:
          <input
            type="text"
            name="student_name"
            value={paymentData.student_name}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          Monthly Cycle Days (Comma Separated):
          <input
            type="text"
            name="monthly_cycle_days"
            value={paymentData.monthly_cycle_days.join(", ")}
            onChange={handleCycleChange}
            placeholder="e.g., 10, 20"
            required
          />
        </label>
        <button type="submit">Submit Payment</button>
      </form>

      {/* Filters */}
      <h2>Filter Payments</h2>
      <div className="filters">
        <label>
          FCC ID:
          <input
            type="text"
            name="fcc_id"
            value={filters.fcc_id}
            onChange={handleFilterChange}
          />
        </label>
        <label>
          Payment Status:
          <select
            name="payment_status"
            value={filters.payment_status}
            onChange={handleFilterChange}
          >
            <option value="">All</option>
            <option value="Pending">Pending</option>
            <option value="Completed">Completed</option>
            <option value="Failed">Failed</option>
          </select>
        </label>
        <label>
          Payment Method:
          <input
            type="text"
            name="payment_method"
            value={filters.payment_method}
            onChange={handleFilterChange}
          />
        </label>
        <label>
          Start Date:
          <input
            type="date"
            name="startDate"
            value={filters.startDate}
            onChange={handleFilterChange}
          />
        </label>
        <label>
          End Date:
          <input
            type="date"
            name="endDate"
            value={filters.endDate}
            onChange={handleFilterChange}
          />
        </label>
        <label>
  Monthly Cycle Days:
  <input
    type="text"
    name="monthly_cycle_days"
    value={filters.monthly_cycle_days}
    onChange={handleFilterChange}
    placeholder="e.g., 10, 20"
  />
</label>

      </div>

      {/* Payment Table */}
      <table>
        <thead>
          <tr>
            <th>Student Name</th>
            <th>FCC ID</th>
            <th>Amount</th>
            <th>Payment Method</th>
            <th>Payment Status</th>
            <th>Monthly Cycle Days</th>
            <th>Payment Date</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((payment) => (
            <tr key={payment.id}>
              <td>{payment.student_name}</td>
              <td>{payment.fcc_id}</td>
              <td>{payment.amount}</td>
              <td>{payment.payment_method}</td>
              <td>{payment.payment_status}</td>
              <td>{(payment.monthly_cycle_days || []).join(", ")}</td>
              <td>{new Date(payment.payment_date).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default FeeManagement;
