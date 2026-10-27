import React, { useState } from "react";
import "../../../styles/ViewInsurance.css";

const EditInsurance = ({ insurance, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    vehicleId: insurance.vehicleid || "",
    policyNo: insurance.policyno || "",
    companyName: insurance.companyname || "",
    issueDate: insurance.issuedate ? new Date(insurance.issuedate).toISOString().split('T')[0] : "",
    expiryDate: insurance.expirydate ? new Date(insurance.expirydate).toISOString().split('T')[0] : "",
    premiumAmount: insurance.premiumamount || "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...insurance,
      vehicleid: formData.vehicleId,
      policyno: formData.policyNo,
      companyname: formData.companyName,
      issuedate: formData.issueDate,
      expirydate: formData.expiryDate,
      premiumamount: formData.premiumAmount,
    });
  };

  return (
    <div className="edit-insurance-modal">
      <div className="edit-insurance-content">
        <h2>Edit Insurance</h2>
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
            <label>Policy No</label>
            <input
              type="text"
              name="policyNo"
              value={formData.policyNo}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Company Name</label>
            <input
              type="text"
              name="companyName"
              value={formData.companyName}
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
            <label>Premium Amount</label>
            <input
              type="number"
              name="premiumAmount"
              value={formData.premiumAmount}
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

export default EditInsurance;
