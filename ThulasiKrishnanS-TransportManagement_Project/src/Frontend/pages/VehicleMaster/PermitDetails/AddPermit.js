import React, { useState, useEffect } from "react";
import axios from "axios";
import "../../../styles/AddPermit.css";

const AddPermit = () => {

  const [formData, setFormData] = useState({
    vehicleId: "",
    permitNo: "",
    permitType:"",
    issueDate: "",
    expiryDate: "",
    status: "",
  });

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
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("http://localhost:5000/addPermit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (response.ok) {
        alert("Permit details added successfully!");
        setFormData({
          permitId: "",
          vehicleId: "",
          permitNo: "",
          issueDate: "",
          expiryDate: "",
          status: "",
        });
      } else {
        alert("Error: " + data.message);
      }
    } catch (error) {
      console.error("Error submitting permit details:", error);
      alert("Failed to add permit details.");
    }
  };

  return (
    <>
      <div className="vp-form-container">
        <div className="vp-form">
          <h2 className="vp-title">Permit Details Form</h2>
          <form className="vp-form-grid" onSubmit={handleSubmit}>
          <div className="vp-form-group">
              <label>Vehicle Id</label>
                  <select name="vehicleId" value={formData.vehicleId} onChange={handleChange} required>
                      <option value="">Select vehicleId</option>
                          {vehicleIds.map((route, index) => (
                             <option key={index} value={route}>{route}</option>
                            ))}
                    </select>
          </div>
           
            <div className="vp-form-group">
              <label>Permit No</label>
              <input
                type="text"
                name="permitNo"
                value={formData.permitNo}
                onChange={handleChange}
                required
              />
            </div>
            <div className="vp-form-group">
            <label htmlFor="permitType">Permit Type</label>
            <select
              id="permitType"
              name="permitType"
              value={formData.permitType}
              onChange={handleChange}
              required
            >
              <option value="">Select Permit Type</option>
              <option value="State">State</option>
              <option value="District">District</option>
            </select>
          </div>

            <div className="vp-form-group">
              <label>Issue Date</label>
              <input
                type="date"
                name="issueDate"
                value={formData.issueDate}
                onChange={handleChange}
                required
              />
            </div>

            <div className="vp-form-group">
              <label>Expiry Date</label>
              <input
                type="date"
                name="expiryDate"
                value={formData.expiryDate}
                onChange={handleChange}
                required
              />
            </div>

            <div className="vp-form-group">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              required
            >
              <option value="">Select Status</option>
              <option value="Active">Active</option>
              <option value="Expired">Expired</option>
            </select>
          </div>

            <button className="vp-submit-button" type="submit">
              Add Permit
            </button>
          </form>
        </div>
      </div>
    </>
  );
};

export default AddPermit;
