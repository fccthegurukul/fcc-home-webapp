import React, { useState } from "react";
// 1. Apne banaye gaye Supabase client ko import karein
import { supabase } from "../utils/supabaseClient";
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
    admission_date: "",
  });

  // 2. API_BASE_URL ki ab zaroorat nahi hai
  // const API_BASE_URL = process.env.REACT_APP_API_URL;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  // 3. handleSubmit function ko Supabase ke liye update karein
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Supabase table me data insert karein
      // 'new_student_admission' aapke Supabase table ka naam hai
      const { data, error } = await supabase
        .from("new_student_admission")
        .insert([formData]); // formData ko array me daalein

      // Agar error hai to use handle karein
      if (error) {
        throw error;
      }

      // Success hone par
      alert("Student added successfully to Supabase!");
      console.log("Supabase response data:", data);

      // Form ko reset karein
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
        admission_date: "",
      });
    } catch (error) {
      console.error("Error adding student to Supabase:", error);
      alert("Error adding student: " + error.message);
    }
  };

  return (
    <div className="student-admission">
      <h1>New Student Admission (Direct to Supabase)</h1>
      <form onSubmit={handleSubmit}>
        {/* Aapka baaki ka form JSX jaisa tha waisa hi rahega */}
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