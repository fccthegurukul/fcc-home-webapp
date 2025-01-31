import React, { useState } from "react";
import "./StudentAdmission.css";

const StudentAdmission = () => {
  const [formData, setFormData] = useState({
    name: "",
    father: "",
    mother: "",
    schooling_class: "",
    mobile_number: "",
    address: "",
    paid: false,
    tutionfee_paid: false,
    fcc_class: "",
    fcc_id: "",
    skills: "",
    admission_date: "",  // Added admission_date here
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("http://localhost:5000/add-student", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Something went wrong");
      }
  
      const data = await response.json();
      alert("Student added successfully: " + JSON.stringify(data));
      setFormData({
        name: "",
        father: "",
        mother: "",
        schooling_class: "",
        mobile_number: "",
        address: "",
        paid: false,
        tutionfee_paid: false,
        fcc_class: "",
        fcc_id: "",
        skills: "",
        admission_date: "",  // Reset admission_date as well
      });
    } catch (error) {
      alert("Error adding student: " + error.message);
    }
  };

  return (
    <div className="student-admission">
      <h1>New Student Admission</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Admission Date:
          <input
            type="date"
            name="admission_date"
            value={formData.admission_date}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          Name:
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          Father's Name:
          <input
            type="text"
            name="father"
            value={formData.father}
            onChange={handleChange}
          />
        </label>
        <label>
          Mother's Name:
          <input
            type="text"
            name="mother"
            value={formData.mother}
            onChange={handleChange}
          />
        </label>
        <label>
          Schooling Class:
          <input
            type="text"
            name="schooling_class"
            value={formData.schooling_class}
            onChange={handleChange}
          />
        </label>
        <label>
          Mobile Number:
          <input
            type="text"
            name="mobile_number"
            value={formData.mobile_number}
            onChange={handleChange}
          />
        </label>
        <label>
          Address:
          <textarea
            name="address"
            value={formData.address}
            onChange={handleChange}
          ></textarea>
        </label>
        <label>
          Paid 99₹:
          <input
            type="checkbox"
            name="paid"
            checked={formData.paid}
            onChange={handleChange}
          />
        </label>
        <label>
          Tuition Fee Paid₹:
          <input
            type="checkbox"
            name="tutionfee_paid"
            checked={formData.tutionfee_paid}
            onChange={handleChange}
          />
        </label>
        <label>
          FCC Class:
          <input
            type="text"
            name="fcc_class"
            value={formData.fcc_class}
            onChange={handleChange}
          />
        </label>
        <label>
          FCC ID:
          <input
            type="text"
            name="fcc_id"
            value={formData.fcc_id}
            onChange={handleChange}
          />
        </label>
        <label>
          Skills:
          <textarea
            name="skills"
            value={formData.skills}
            onChange={handleChange}
          ></textarea>
        </label>
        <button type="submit">Add Student</button>
      </form>
    </div>
  );
};

export default StudentAdmission;
