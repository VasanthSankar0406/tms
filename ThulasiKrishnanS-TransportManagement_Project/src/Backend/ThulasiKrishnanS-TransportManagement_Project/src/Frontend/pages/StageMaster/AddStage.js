import React, { useState, useEffect } from "react";
import { API_URL } from "../../config";
import "../../styles/AddStage.css";

const AddStage = () => {
  const [formData, setFormData] = useState({
    stageId: "",
    stageName: "",
    city: "",
    routeId: "",
    arrivalTime: "",
    departureTime: "",
    fee: ""
  });

  const [routeIds, setRouteIds] = useState([]);
 
  const cities = [
    "Kovilpatti", "Thoothukudi", "Tirunelveli", "Sattur", "Virudhunagar",
    "Vilathikulam", "Sivakasi", "Kayathar", "Sankarankovil", "Kalugumalai"
  ];

  const isRouteFull = (route) =>
    Number(route.totalstages) > 0 && Number(route.currentstages) >= Number(route.totalstages);

  useEffect(() => {
    const fetchRouteIds = async () => {
      if (formData.city) {
        try {
          const response = await fetch(`${API_URL}/getRouteByCity?city=${encodeURIComponent(formData.city)}`);
          const data = await response.json();
          if (response.ok) {
            setRouteIds(data.routes || []);
          } else {
            alert("Error fetching routes: " + data.message);
            setRouteIds([]);
          }
        } catch (error) {
          console.error("Error fetching routes:", error);
          setRouteIds([]);
        }
      } else {
        setRouteIds([]);
      }
      setFormData((currentData) => ({ ...currentData, routeId: "" }));
    };

    fetchRouteIds();
  }, [formData.city]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const selectedRoute = routeIds.find((route) => route.routeid === formData.routeId);
    if (selectedRoute && isRouteFull(selectedRoute)) {
      alert(
        `Cannot add stage. Route ${selectedRoute.routeid} already has ${selectedRoute.currentstages} of ${selectedRoute.totalstages} stages.`
      );
      return;
    }

    try {
      console.log(formData);
      const response = await fetch(`${API_URL}/addStage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        alert("Stage added successfully! Stage ID: " + data.stageId);
        setFormData({
          stageId: "",
          stageName: "",
          city: "",
          routeId: "",
          arrivalTime: "",
          departureTime: "",
          fee: ""
        });
      } else {
        alert("Error: " + data.message);
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      alert("Failed to submit stage data.");
    }
  };

  return (
    <div className="stage-form-container">
      <form className="stage-form" onSubmit={handleSubmit}>
        <div className="stage-title">Stage Master Form</div>

        <div className="stage-form-group">
          <label htmlFor="stageId">Stage ID</label>
          <input
            type="text"
            id="stageId"
            name="stageId"
            placeholder="Enter Stage ID"
            value={formData.stageId}
            onChange={handleChange}
          />
        </div>

        <div className="stage-form-group">
          <label htmlFor="stageName">Stage Name</label>
          <input
            type="text"
            id="stageName"
            name="stageName"
            placeholder="Enter Stage Name"
            value={formData.stageName}
            onChange={handleChange}
          />
        </div>

        <div className="stage-form-group">
          <label htmlFor="city">City</label>
          <select id="city" name="city" value={formData.city} onChange={handleChange}>
            <option value="">Select City</option>
            {cities.map((city, index) => (
              <option key={index} value={city}>{city}</option>
            ))}
          </select>
        </div>

        <div className="stage-form-group">
          <label htmlFor="routeId">Route ID</label>
          <select id="routeId" name="routeId" value={formData.routeId} onChange={handleChange} disabled={!formData.city}>
            <option value="">Select Route ID</option>
            {routeIds.map((route) => (
              <option
                key={route.routeid}
                value={route.routeid}
                disabled={isRouteFull(route)}
              >
                {route.routeid} ({route.currentstages}/{route.totalstages} stages)
              </option>
            ))}
          </select>
        </div>

        <div className="stage-form-group">
          <label htmlFor="arrivalTime">Arrival Time</label>
          <input
            type="time"
            id="arrivalTime"
            name="arrivalTime"
            value={formData.arrivalTime}
            onChange={handleChange}
          />
        </div>

        <div className="stage-form-group">
          <label htmlFor="departureTime">Departure Time</label>
          <input
            type="time"
            id="departureTime"
            name="departureTime"
            value={formData.departureTime}
            onChange={handleChange}
          />
        </div>

        <div className="stage-form-group">
          <label htmlFor="fee">Fee</label>
          <input
            type="number"
            id="fee"
            name="fee"
            placeholder="Enter Fee"
            value={formData.fee}
            onChange={handleChange}
          />
        </div>

        <button type="submit" className="stage-submit-button">
          Add Stage
        </button>
      </form>
    </div>
  );
};

export default AddStage;
