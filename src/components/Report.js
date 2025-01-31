import React, { useState, useEffect } from "react";
import axios from "axios";
import "./Report.css";

const Report = () => {
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [filters, setFilters] = useState({
    fcc_id: "",
    payment_status: "",
    payment_method: "",
    startDate: "",
    endDate: "",
    monthly_cycle_days: "",
  });

  useEffect(() => {
    fetchPayments();
  }, [filters]);

  useEffect(() => {
    // Apply filters for start and end date
    let filtered = payments;

    // Date filtering logic
    if (filters.startDate || filters.endDate) {
      filtered = payments.filter((payment) => {
        const paymentDate = new Date(payment.payment_date);
        const startDate = filters.startDate ? new Date(filters.startDate) : null;
        const endDate = filters.endDate ? new Date(filters.endDate) : null;

        return (
          (!startDate || paymentDate >= startDate) &&
          (!endDate || paymentDate <= endDate)
        );
      });
    }

    setFilteredPayments(filtered);
  }, [filters, payments]);

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

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({ ...filters, [name]: value });
  };

  // Calculate the total amount of payments
  const calculateTotalAmount = (payments) => {
    return payments.reduce((total, payment) => {
      return total + (parseFloat(payment.amount) || 0);
    }, 0);
  };

  const totalAmount = calculateTotalAmount(filteredPayments);

  return (
    <div className="report-page">
      <h1>Payment Report</h1>

      {/* Filters */}
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
      <table border="1" className="payments-table">
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
          {filteredPayments.length > 0 ? (
            filteredPayments.map((payment) => (
              <tr key={payment.id}>
                <td>{payment.student_name}</td>
                <td>{payment.fcc_id}</td>
                <td>{payment.amount}</td>
                <td>{payment.payment_method}</td>
                <td>{payment.payment_status}</td>
                <td>{(payment.monthly_cycle_days || []).join(", ")}</td>
                <td>{new Date(payment.payment_date).toLocaleString()}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="7">No payments found.</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Total Amount */}
      {filteredPayments.length > 0 && (
        <div className="total-amount">
          <h3>Total Amount: {totalAmount.toFixed(2)}</h3>
        </div>
      )}
    </div>
  );
};

export default Report;
