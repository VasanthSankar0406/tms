import React, { useState } from "react";
import {
  Pencil,
  X,
  Bus,
  Route as RouteIcon,
  Calendar,
  Users,
  CheckCircle2
} from "lucide-react";

const EditStudentAttendance = ({ record, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    vehicleid: record?.vehicleid || "",
    routeid: record?.routeid || "",
    attendance_date: record?.attendance_date
      ? new Date(record.attendance_date).toISOString().split("T")[0]
      : "",
    student_count: record?.student_count !== undefined ? String(record.student_count) : "",
    marked_by: record?.marked_by || ""
  });

  const [formErrors, setFormErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validate = () => {
    const errors = {};
    if (!formData.vehicleid.trim()) errors.vehicleid = "Vehicle ID is required";
    if (!formData.routeid.trim()) errors.routeid = "Route ID is required";
    if (!formData.attendance_date) errors.attendance_date = "Attendance date is required";
    if (
      formData.student_count === "" ||
      isNaN(Number(formData.student_count)) ||
      Number(formData.student_count) < 0
    ) {
      errors.student_count = "Valid student count is required";
    }
    if (!formData.marked_by.trim()) errors.marked_by = "Staff / Driver ID is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    onSave({
      ...record,
      vehicleid: formData.vehicleid.trim(),
      routeid: formData.routeid.trim(),
      attendance_date: formData.attendance_date,
      student_count: parseInt(formData.student_count, 10),
      marked_by: formData.marked_by.trim()
    });
  };

  return (
    <div className="attendance-modal-overlay" onClick={onCancel}>
      <div
        className="attendance-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-attendance-title"
      >
        {/* Modal Header */}
        <div className="attendance-modal-header">
          <div className="attendance-modal-header-copy">
            <div className="attendance-modal-badge">
              <Pencil size={15} />
            </div>
            <div>
              <h2 id="edit-attendance-title" className="attendance-modal-title">
                Edit Student Attendance Record
              </h2>
              <p className="attendance-modal-subtitle">
                Update vehicle submission, count, and reporting details
              </p>
            </div>
          </div>
          <button
            type="button"
            className="attendance-modal-close-btn"
            onClick={onCancel}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="attendance-modal-form">
          <div className="attendance-modal-body">
            <div className="attendance-modal-grid">
              {/* Vehicle ID */}
              <div className="attendance-form-group">
                <label htmlFor="edit-vehicleid">
                  Vehicle ID <span className="req">*</span>
                </label>
                <div className="attendance-input-wrap">
                  <Bus size={15} className="input-field-icon" />
                  <input
                    id="edit-vehicleid"
                    type="text"
                    name="vehicleid"
                    className={`attendance-form-input ${formErrors.vehicleid ? "error" : ""}`}
                    value={formData.vehicleid}
                    onChange={handleChange}
                    placeholder="e.g. 1, 2, 3"
                  />
                </div>
                {formErrors.vehicleid && (
                  <span className="field-error-msg">{formErrors.vehicleid}</span>
                )}
              </div>

              {/* Route ID */}
              <div className="attendance-form-group">
                <label htmlFor="edit-routeid">
                  Route ID <span className="req">*</span>
                </label>
                <div className="attendance-input-wrap">
                  <RouteIcon size={15} className="input-field-icon" />
                  <input
                    id="edit-routeid"
                    type="text"
                    name="routeid"
                    className={`attendance-form-input ${formErrors.routeid ? "error" : ""}`}
                    value={formData.routeid}
                    onChange={handleChange}
                    placeholder="e.g. R001, R004"
                  />
                </div>
                {formErrors.routeid && (
                  <span className="field-error-msg">{formErrors.routeid}</span>
                )}
              </div>

              {/* Attendance Date */}
              <div className="attendance-form-group">
                <label htmlFor="edit-date">
                  Attendance Date <span className="req">*</span>
                </label>
                <div className="attendance-input-wrap">
                  <Calendar size={15} className="input-field-icon" />
                  <input
                    id="edit-date"
                    type="date"
                    name="attendance_date"
                    className={`attendance-form-input ${formErrors.attendance_date ? "error" : ""}`}
                    value={formData.attendance_date}
                    onChange={handleChange}
                  />
                </div>
                {formErrors.attendance_date && (
                  <span className="field-error-msg">{formErrors.attendance_date}</span>
                )}
              </div>

              {/* Student Count */}
              <div className="attendance-form-group">
                <label htmlFor="edit-count">
                  Reported Student Count <span className="req">*</span>
                </label>
                <div className="attendance-input-wrap">
                  <Users size={15} className="input-field-icon" />
                  <input
                    id="edit-count"
                    type="number"
                    name="student_count"
                    min="0"
                    className={`attendance-form-input ${formErrors.student_count ? "error" : ""}`}
                    value={formData.student_count}
                    onChange={handleChange}
                    placeholder="e.g. 35"
                  />
                </div>
                {formErrors.student_count && (
                  <span className="field-error-msg">{formErrors.student_count}</span>
                )}
              </div>

              {/* Marked By / Driver ID */}
              <div className="attendance-form-group full-width">
                <label htmlFor="edit-markedby">
                  Marked By (Driver / Staff ID) <span className="req">*</span>
                </label>
                <div className="attendance-input-wrap">
                  <input
                    id="edit-markedby"
                    type="text"
                    name="marked_by"
                    className={`attendance-form-input ${formErrors.marked_by ? "error" : ""}`}
                    value={formData.marked_by}
                    onChange={handleChange}
                    placeholder="e.g. D001, Samy, STAFF01"
                  />
                </div>
                {formErrors.marked_by && (
                  <span className="field-error-msg">{formErrors.marked_by}</span>
                )}
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="attendance-modal-footer">
            <button
              type="button"
              className="attendance-btn-cancel"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="attendance-btn-save"
            >
              <CheckCircle2 size={16} />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditStudentAttendance;
