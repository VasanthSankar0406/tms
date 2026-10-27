import React, { useState } from "react";
import axios from "axios";
import { API_URL } from "../../config";
import "../../styles/AddRoute.css";

const AddRoute = () => {
  const [formData, setFormData] = useState({
    routeId: "",
    routeName: "",
    city: "",
    totalStages: "",
    totalDistance: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post(`${API_URL}/addRoute`, formData);
      alert(response.data.message);

      setFormData({
        routeId: "",
        routeName: "",
        city: "",
        totalStages: "",
        totalDistance: "",
      });
    } catch (error) {
      console.error("Error adding route:", error);
      alert("Failed to add route. Please try again.");
    }
  };

  return (
    <div className="route-form-container">
      <form className="route-form" onSubmit={handleSubmit}>
        <div className="route-title">Route Master Form</div>

        <div className="route-form-group">
          <label htmlFor="routeId">Route ID</label>
          <input
            type="text"
            id="routeId"
            name="routeId"
            placeholder="Enter Route ID"
            value={formData.routeId}
            onChange={handleChange}
            required
          />
        </div>

        <div className="route-form-group">
          <label htmlFor="routeName">Route Name</label>
          <input
            type="text"
            id="routeName"
            name="routeName"
            placeholder="Enter Route Name"
            value={formData.routeName}
            onChange={handleChange}
            required
          />
        </div>

        <div className="route-form-group">
          <label htmlFor="city">City</label>
          <select
            id="city"
            name="city"
            value={formData.city}
            onChange={handleChange}
            required
          >
            <option value="">Select City</option>
            <option value="Kovilpatti">Kovilpatti</option>
            <option value="Thoothukudi">Thoothukudi</option>
            <option value="Tirunelveli">Tirunelveli</option>
            <option value="Sattur">Sattur</option>
            <option value="Virudhunagar">Virudhunagar</option>
            <option value="Vilathikulam">Vilathikulam</option>
            <option value="Sivakasi">Sivakasi</option>
            <option value="Kayathar">Kayathar</option>
            <option value="Sankarakovil">Sankarakovil</option>
            <option value="Kalugumali">Kalugumali</option>
          </select>
        </div>

        <div className="route-form-group">
            <label htmlFor="totalStages">Total Stages</label>
            <input
            type="number"
            id="totalStages"
            name="totalStages"
            placeholder="Enter Total No of Stages"
            value={formData.totalStages}
            onChange={handleChange}
            required
          />
        </div>

        <div className="route-form-group">
          <label htmlFor="totalDistance">Total Distance (km)</label>
          <input
            type="number"
            id="totalDistance"
            name="totalDistance"
            placeholder="Enter Total Distance"
            value={formData.totalDistance}
            step={0.1}
            min={0}
            onChange={handleChange}
            required
          />
        </div>

        <button type="submit" className="route-submit-button">
          Add Route
        </button>
      </form>
    </div>
  );
};

export default AddRoute;
