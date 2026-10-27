import React, { useState } from "react";

const EditStudentAttendance = ({ record, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    vehicleid: record.vehicleid || "",
    routeid: record.routeid || "",
    attendance_date: record.attendance_date ? new Date(record.attendance_date).toISOString().split('T')[0] : "",
    student_count: record.student_count || "",
    marked_by: record.marked_by || "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...record,
      vehicleid: formData.vehicleid,
      routeid: formData.routeid,
      attendance_date: formData.attendance_date,
      student_count: parseInt(formData.student_count),
      marked_by: formData.marked_by,
    });
  };

  return (
    <div className="edit-modal">
      <div className="edit-modal-content">
        <h2>Edit Student Attendance</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Vehicle ID</label>
            <input
              type="text"
              name="vehicleid"
              value={formData.vehicleid}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Route ID</label>
            <input
              type="text"
              name="routeid"
              value={formData.routeid}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Attendance Date</label>
            <input
              type="date"
              name="attendance_date"
              value={formData.attendance_date}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Student Count</label>
            <input
              type="number"
              name="student_count"
              value={formData.student_count}
              onChange={handleChange}
              required
              min="0"
            />
          </div>
          <div className="form-group">
            <label>Marked By</label>
            <input
              type="text"
              name="marked_by"
              value={formData.marked_by}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-actions">
            <button type="submit">Save</button>
            <button type="button" onClick={onCancel}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditStudentAttendance;
