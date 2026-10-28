import React, { useEffect, useState } from "react";
import axios from "axios";
import { X, Check, Loader2 } from "lucide-react";
import "../../styles/ViewTraveller.css";
import { API_URL } from "../../config";

const yearOptions = [
  { value: "1styear", label: "1st Year" },
  { value: "2ndyear", label: "2nd Year" },
  { value: "3rdyear", label: "3rd Year" },
  { value: "4thyear", label: "4th Year" }
];

const staffTypeOptions = ["Teaching", "Non Teaching"];

const EditTraveller = ({ traveller, onSave, onCancel, onClose }) => {
  const handleClose = onClose || onCancel;

  const [formData, setFormData] = useState({
    name: traveller?.name || "",
    rollno: traveller?.rollno || "",
    role: traveller?.role || "Student",
    year: traveller?.year || "",
    stafftype: traveller?.stafftype || "",
    branch: traveller?.branch || "",
    phoneno: traveller?.phoneno || "",
    city: traveller?.city || traveller?.place || "",
    routeid: traveller?.routeid || "",
    stage: traveller?.stage || traveller?.stage_name || traveller?.point || ""
  });

  const [routes, setRoutes] = useState([]);
  const [stages, setStages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave({
        ...traveller,
        ...formData,
        city: (formData.city || "").trim(),
        stage: formData.stage
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="traveller-modal-overlay" onClick={handleClose}>
      <div
        className="traveller-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-traveller-title"
      >
        {/* Modal Header */}
        <div className="traveller-modal-header">
          <div className="traveller-modal-header-copy">
            <h3 id="edit-traveller-title" className="traveller-modal-title">
              Edit Traveller #{formData.rollno}
            </h3>
            <p className="traveller-modal-subtitle">
              Update traveller details, route allocation, and boarding point.
            </p>
          </div>
          <button
            type="button"
            className="traveller-modal-close-btn"
            onClick={handleClose}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="traveller-modal-form">
          <div className="traveller-modal-grid">
            <div className="traveller-field-group">
              <label>Full Name <span className="req">*</span></label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter full name"
                required
              />
            </div>

            <div className="traveller-field-group">
              <label>Roll Number / Staff ID <span className="req">*</span></label>
              <input
                type="text"
                name="rollno"
                value={formData.rollno}
                disabled
                title="Roll number cannot be changed"
                className="input-disabled"
                required
              />
            </div>

            <div className="traveller-field-group">
              <label>Role <span className="req">*</span></label>
              <select name="role" value={formData.role} onChange={handleChange} required>
                <option value="Student">Student</option>
                <option value="Staff">Staff</option>
              </select>
            </div>

            <div className="traveller-field-group">
              <label>
                {formData.role === "Staff" ? "Staff Type" : "Year"} <span className="req">*</span>
              </label>
              {formData.role === "Staff" ? (
                <select
                  name="stafftype"
                  value={formData.stafftype}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Staff Type</option>
                  {staffTypeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  name="year"
                  value={formData.year}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Year</option>
                  {yearOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="traveller-field-group">
              <label>Branch / Department</label>
              <input
                type="text"
                name="branch"
                value={formData.branch}
                onChange={handleChange}
                placeholder="e.g. CSE, ECE, MECH"
              />
            </div>

            <div className="traveller-field-group">
              <label>Phone Number</label>
              <input
                type="tel"
                name="phoneno"
                value={formData.phoneno}
                onChange={handleChange}
                placeholder="10-digit mobile number"
              />
            </div>

            <div className="traveller-field-group">
              <label>City <span className="req">*</span></label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="e.g. Kovilpatti"
                required
              />
            </div>

            <div className="traveller-field-group">
              <label>Route <span className="req">*</span></label>
              <select
                name="routeid"
                value={formData.routeid}
                onChange={handleChange}
                required
              >
                <option value="">Select Route</option>
                {routes.map((route) => (
                  <option key={route.routeid} value={route.routeid}>
                    Route #{route.routeid} - {route.routename} ({route.city})
                  </option>
                ))}
              </select>
            </div>

            <div className="traveller-field-group full-width">
              <label>Boarding Stage <span className="req">*</span></label>
              <select
                name="stage"
                value={formData.stage}
                onChange={handleChange}
                required
                disabled={!formData.routeid}
              >
                <option value="">
                  {formData.routeid ? "Select Boarding Stage" : "Select Route First"}
                </option>
                {stages.map((stageName) => (
                  <option key={stageName} value={stageName}>
                    {stageName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="traveller-modal-footer">
            <button
              type="button"
              className="traveller-btn-cancel"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="traveller-btn-primary-action"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="spin-icon" />
                  <span>UPDATING...</span>
                </>
              ) : (
                <>
                  <Check size={16} strokeWidth={2.4} />
                  <span>UPDATE TRAVELLER</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTraveller;
