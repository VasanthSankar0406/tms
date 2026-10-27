import React, { useState, useEffect} from "react";
import { useNavigate } from 'react-router-dom';
import axios from "axios";
import "../../../styles/AddFC.css";

const AddFC = () => {
  const navigate = useNavigate();

  const handleNavigation = (path) => {
    navigate(path);
  };

  const [formData, setFormData] = useState({
    vehicleId: "",
    fcNo: "",
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
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Date Validation
    if (new Date(formData.issueDate) >= new Date(formData.expiryDate)) {
      setError("Expiry date must be after the issue date.");
      return;
    }

    try {
      const response = await axios.post("http://localhost:5000/addFC", formData);
      alert(response.data.message);
      setFormData({
        vehicleId: "",
        fcNo: "",
        issueDate: "",
        expiryDate: "",
        status: "",
      });
      setError("");
    } catch (error) {
      console.error("Error submitting FC details:", error);
      setError("Failed to add FC details. Please try again.");
    }
  };

  return (
    <>
      <div className="fc-form-container">
        <div className="fc-form">
          <h2 className="fc-title">FC Details Form</h2>
          <form className="fc-form-grid" onSubmit={handleSubmit}>
            <div className="fc-form-group">
              <label>Vehicle Id</label>
              <select name="vehicleId" value={formData.vehicleId} onChange={handleChange} required>
                <option value="">Select vehicleId</option>
                {vehicleIds.map((route, index) => (
                  <option key={index} value={route}>{route}</option>
                ))}
              </select>
            </div>

            <div className="fc-form-group">
              <label>FC No</label>
              <input type="text" name="fcNo" value={formData.fcNo} onChange={handleChange} required />
            </div>

            <div className="fc-form-group">
              <label>Issue Date</label>
              <input type="date" name="issueDate" value={formData.issueDate} onChange={handleChange} required />
            </div>

            <div className="fc-form-group">
              <label>Expiry Date</label>
              <input
                type="date"
                name="expiryDate"
                value={formData.expiryDate}
                onChange={handleChange}
                required
              />
            </div>

            <div className="fc-form-group">
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
              </select>
            </div>

            <button
              type="submit"
              className="fc-submit-button"
              disabled={loading}
            >
              {loading ? "Loading..." : "Add FC"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
};

export default AddFC;
