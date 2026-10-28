import React, { useState, useEffect } from "react";
import axios from "axios";
import "../../../styles/AddInsurance.css";

const AddInsurance = () => {

  

  const initialFormData = {
    vehicleId: "",
    policyNo: "",
    companyName: "",
    issueDate: "",
    expiryDate: "",
    premiumAmount: "",
  };

  const [formData, setFormData] = useState(initialFormData);
  const [vehicleIds, setVehicleIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchVehicleIds = async () => {
        try {
            const response = await axios.get("http://localhost:5000/getVehicle");
            const vehicleIds = response.data.map(vehicle => vehicle.vehicleid); // Extract only vehicleId
            setVehicleIds(vehicleIds);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching vehicle IDs:", error);
            setError("Failed to fetch vehicle IDs. Please try again.");
            setLoading(false);
        }
    };
    fetchVehicleIds();
}, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (new Date(formData.issueDate) >= new Date(formData.expiryDate)) {
      alert("Expiry date must be later than the issue date.");
      return;
    }

    try {
      const response = await axios.post("http://localhost:5000/addInsurance", formData);
      alert(response.data.message);
      setFormData(initialFormData);
    } catch (err) {
      console.error("Error submitting insurance details:", err);
      alert("Failed to add insurance details. Please try again.");
    }
  };

  return (
    <>
      <div className="ins-form-container">
        <form className="ins-form" onSubmit={handleSubmit}>
          <div className="ins-title">Insurance Details Form</div>
          {error && <p className="error-message" style={{ color: "red" }}>{error}</p>}

          <div className="ins-form-group">
              <label>Vehicle Id</label>
                  <select name="vehicleId" value={formData.vehicleId} onChange={handleChange} required>
                      <option value="">Select Vehicle Id</option>
                          {vehicleIds.map((route, index) => (
                             <option key={index} value={route}>{route}</option>
                            ))}
                    </select>
          </div>
          <div className="ins-form-group">
            <label htmlFor="policyNo">Policy No</label>
            <input
              type="text"
              id="policyNo"
              name="policyNo"
              value={formData.policyNo}
              onChange={handleChange}
              placeholder="Enter policy number"
              required
            />
          </div>

          <div className="ins-form-group">
            <label htmlFor="companyName">Company Name</label>
            <input
              type="text"
              id="companyName"
              name="companyName"
              value={formData.companyName}
              onChange={handleChange}
              placeholder="Enter company name"
              required
            />
          </div>

          <div className="ins-form-group">
            <label htmlFor="issueDate">Issue Date</label>
            <input
              type="date"
              id="issueDate"
              name="issueDate"
              value={formData.issueDate}
              onChange={handleChange}
              required
            />
          </div>

          <div className="ins-form-group">
            <label htmlFor="expiryDate">Expiry Date</label>
            <input
              type="date"
              id="expiryDate"
              name="expiryDate"
              value={formData.expiryDate}
              onChange={handleChange}
              required
            />
          </div>

          <div className="ins-form-group">
            <label htmlFor="premiumAmount">Premium Amount</label>
            <input
              type="number"
              id="premiumAmount"
              name="premiumAmount"
              value={formData.premiumAmount}
              onChange={handleChange}
              placeholder="Enter amount"
              step="1"
              required
            />
          </div>

          <button type="submit" className="ins-submit-button" disabled={loading}>
            {loading ? "Loading..." : "Add Insurance"}
          </button>
        </form>
      </div>
    </>
  );
};

export default AddInsurance;
