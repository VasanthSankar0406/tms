import React, { useState } from "react";
import "../../../styles/ViewFC.css";

const EditFC = ({ fc, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    vehicleId: fc.vehicleid || "",
    fcNo: fc.fcno || "",
    issueDate: fc.issuedate ? new Date(fc.issuedate).toISOString().split('T')[0] : "",
    expiryDate: fc.expirydate ? new Date(fc.expirydate).toISOString().split('T')[0] : "",
    status: fc.status || "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...fc,
      vehicleid: formData.vehicleId,
      fcno: formData.fcNo,
      issuedate: formData.issueDate,
      expirydate: formData.expiryDate,
      status: formData.status,
    });
  };

  return (
    <div className="edit-fc-modal">
      <div className="edit-fc-content">
        <h2>Edit FC</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Vehicle ID</label>
            <input
              type="text"
              name="vehicleId"
              value={formData.vehicleId}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>FC No</label>
            <input
              type="text"
              name="fcNo"
              value={formData.fcNo}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Issue Date</label>
            <input
              type="date"
              name="issueDate"
              value={formData.issueDate}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Expiry Date</label>
            <input
              type="date"
              name="expiryDate"
              value={formData.expiryDate}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              required
            >
              <option value="">Select Status</option>
              <option value="Active">Active</option>
              <option value="Expired">Expired</option>
              <option value="Pending">Pending</option>
            </select>
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

export default EditFC;
