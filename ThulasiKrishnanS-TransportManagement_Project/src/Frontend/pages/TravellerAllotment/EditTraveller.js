import React, { useEffect, useState } from "react";
import axios from "axios";
import "../../styles/ViewTraveller.css";
import { API_URL } from "../../config";

const yearOptions = [
  { value: "1styear", label: "1st Year" },
  { value: "2ndyear", label: "2nd Year" },
  { value: "3rdyear", label: "3rd Year" },
  { value: "4thyear", label: "4th Year" }
];

const staffTypeOptions = ["Teaching", "Non Teaching"];

const EditTraveller = ({ traveller, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: traveller.name || "",
    rollno: traveller.rollno || "",
    role: traveller.role || "",
    year: traveller.year || "",
    stafftype: traveller.stafftype || "",
    branch: traveller.branch || "",
    phoneno: traveller.phoneno || "",
    city: traveller.city || traveller.place || "",
    routeid: traveller.routeid || "",
    stage: traveller.stage || traveller.point || ""
  });
  const [routes, setRoutes] = useState([]);
  const [stages, setStages] = useState([]);

  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const response = await axios.get(`${API_URL}/getRoute`);
        setRoutes(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error("Error fetching routes:", error);
      }
    };

    fetchRoutes();
  }, []);

  useEffect(() => {
    const fetchStages = async () => {
      if (!formData.routeid) {
        setStages([]);
        return;
      }

      try {
        const response = await axios.get(`${API_URL}/getStagesByRouteId`, {
          params: { routeid: formData.routeid }
        });
        setStages(response.data?.stages || []);
      } catch (error) {
        console.error("Error fetching stages:", error);
        setStages([]);
      }
    };

    fetchStages();
  }, [formData.routeid]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => {
      const updatedData = {
        ...previous,
        [name]: value
      };

      if (name === "role") {
        if (value === "Student") {
          updatedData.stafftype = "";
        }
        if (value === "Staff") {
          updatedData.year = "";
        }
      }

      if (name === "routeid") {
        updatedData.stage = "";
      }

      return updatedData;
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    onSave({
      ...traveller,
      ...formData,
      city: formData.city.trim(),
      stage: formData.stage
    });
  };

  return (
    <div className="edit-traveller-modal">
      <div className="edit-traveller-content">
        <h2>Edit Traveller</h2>
        <form onSubmit={handleSubmit} className="edit-traveller-form-grid">
          <div className="form-group">
            <label>Name</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label>Roll Number</label>
            <input type="text" name="rollno" value={formData.rollno} disabled required />
          </div>

          <div className="form-group">
            <label>Role</label>
            <select name="role" value={formData.role} onChange={handleChange} required>
              <option value="">Select Role</option>
              <option value="Student">Student</option>
              <option value="Staff">Staff</option>
            </select>
          </div>

          <div className="form-group">
            <label>{formData.role === "Staff" ? "Staff Type" : "Year"}</label>
            {formData.role === "Staff" ? (
              <select name="stafftype" value={formData.stafftype} onChange={handleChange} required>
                <option value="">Select Staff Type</option>
                {staffTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : (
              <select name="year" value={formData.year} onChange={handleChange} required={formData.role === "Student"}>
                <option value="">Select Year</option>
                {yearOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="form-group">
            <label>Branch</label>
            <input type="text" name="branch" value={formData.branch} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label>Phone Number</label>
            <input type="tel" name="phoneno" value={formData.phoneno} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label>City</label>
            <input type="text" name="city" value={formData.city} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label>Route</label>
            <select name="routeid" value={formData.routeid} onChange={handleChange} required>
              <option value="">Select Route</option>
              {routes.map((route) => (
                <option key={route.routeid} value={route.routeid}>
                  {route.routeid} - {route.routename}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group form-group-full">
            <label>Stage</label>
            <select name="stage" value={formData.stage} onChange={handleChange} required disabled={!formData.routeid}>
              <option value="">{formData.routeid ? "Select Stage" : "Select Route First"}</option>
              {stages.map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </select>
          </div>

          <div className="form-actions">
            <button type="submit">Save</button>
            <button type="button" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTraveller;
