import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../../config";
import "../../styles/ViewStage.css";
import { exportToExcel } from "../ReportGenerator"

const ViewStage = () => {
  const navigate = useNavigate();
  const [city, setCity] = useState("");
  const [routeId, setRouteId] = useState("");
  const [stageName, setStageName] = useState("");
  const [stages, setStages] = useState([]);
  const [allStages, setAllStages] = useState([]);
  const [routeIds, setRouteIds] = useState([]);
  const [error, setError] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStage, setEditingStage] = useState(null);
  const [editFormData, setEditFormData] = useState({
    stagename: "",
    city: "",
    routeid: "",
    arrivaltime: "",
    departuretime: "",
    fee: ""
  });

  // Predefined list of cities
  const cities = [
    "Kovilpatti", "Thoothukudi", "Tirunelveli", "Sattur", "Virudhunagar",
    "Vilathikulam", "Sivakasi", "Kayathar", "Sankarankovil", "Kalugumalai"
  ];

  // Helper function to format time for display
  const formatTime = (time) => {
    if (!time) return "N/A";
    // If time is in HH:MM:SS format, extract HH:MM
    const timeStr = time.toString();
    if (timeStr.includes(':')) {
      const parts = timeStr.split(':');
      return `${parts[0]}:${parts[1]}`;
    }
    return timeStr;
  };

  // Fetch all stages
  useEffect(() => {
    const fetchStages = async () => {
      try {
        const response = await axios.get(`${API_URL}/getStage`);
        console.log("API Response:", response.data);
        setStages(response.data);
        setAllStages(response.data);
      } catch (error) {
        console.error("Error fetching stages:", error);
        setError("Failed to fetch stages. Please try again.");
      }
    };

    fetchStages();
  }, []);

  // Get unique stage names for dropdown
  const stageNames = [...new Set(allStages.map(stage => stage.stagename))].sort();

  // Fetch Route IDs from the database
  useEffect(() => {
    const fetchRouteIds = async () => {
      try {
        const response = await axios.get("http://localhost:5000/getRoute"); // Adjust endpoint as needed
        setRouteIds(response.data);
      } catch (error) {
        console.error("Error fetching routes:", error);
      }
    };

    fetchRouteIds();
  }, []);

  // Handle search/filter
  const handleSearch = () => {
    const filtered = allStages.filter((stage) => {
      return (
        (city === "" || stage.city?.trim() === city.trim()) &&
        (routeId === "" || stage.routeid.toString() === routeId.trim()) &&
        (stageName === "" || stage.stagename.toLowerCase().includes(stageName.toLowerCase()))
      );
    });

    setStages(filtered);
    console.log("Filtered Stages:", filtered);

    setCity("");
    setRouteId("");
    setStageName("");
  };

  // Handle edit stage
  const handleEdit = (stage) => {
    setEditingStage(stage);
    setEditFormData({
      stagename: stage.stagename,
      city: stage.city,
      routeid: stage.routeid,
      arrivaltime: stage.arrivaltime ? formatTime(stage.arrivaltime) : "",
      departuretime: stage.departureTime ? formatTime(stage.departureTime) : "",
      fee: stage.fee || ""
    });
    setShowEditModal(true);
  };

  // Handle update stage
  const handleUpdate = async () => {
    try {
      const response = await axios.put(`${API_URL}/updateStage/${editingStage.stageid}`, editFormData);
      alert(response.data.message);
      setShowEditModal(false);
      setEditingStage(null);
      // Refresh stages
      const refreshResponse = await axios.get(`${API_URL}/getStage`);
      setStages(refreshResponse.data);
      setAllStages(refreshResponse.data);
    } catch (error) {
      console.error("Error updating stage:", error);
      alert("Failed to update stage. Please try again.");
    }
  };

  // Handle delete stage
  const handleDelete = async (stageId) => {
    if (window.confirm("Are you sure you want to delete this stage?")) {
      try {
        const response = await axios.delete(`${API_URL}/deleteStage/${stageId}`);
        alert(response.data.message);
        // Refresh stages
        const refreshResponse = await axios.get(`${API_URL}/getStage`);
        setStages(refreshResponse.data);
        setAllStages(refreshResponse.data);
      } catch (error) {
        console.error("Error deleting stage:", error);
        alert("Failed to delete stage. Please try again.");
      }
    }
  };

  return (
    <div className="view-stage-master-container">
      <div className="view-stage-box-wrapper">
        <div className="view-stage-main-title">STAGE MASTER</div>
        <div className="view-stage-title">View</div>

        <div className="view-filter-container">
          {/* City Dropdown */}
          <div className="view-filter-item">
            <label>City</label>
            <select value={city} onChange={(e) => setCity(e.target.value)}>
              <option value="">All</option>
              {cities.map((cityName) => (
                <option key={cityName} value={cityName}>
                  {cityName}
                </option>
              ))}
            </select>
          </div>

          {/* Route ID Dropdown */}
          <div className="view-filter-item">
            <label>Route ID</label>
            <select value={routeId} onChange={(e) => setRouteId(e.target.value)}>
              <option value="">All</option>
              {routeIds.map((route) => (
                <option key={route.routeid} value={route.routeid}>
                  {route.routeid}
                </option>
              ))}
            </select>
          </div>

          {/* Stage Name Dropdown */}
          <div className="view-filter-item">
            <label>Stage Name</label>
            <select value={stageName} onChange={(e) => setStageName(e.target.value)}>
              <option value="">All</option>
              {stageNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Search Button */}
          <button className="view-search-button" onClick={handleSearch}>
            SEARCH
          </button>
        </div>

        <div style={{ textAlign: "right", margin: "10px 0" }}>
          <button
            className="report-button"
            onClick={() => exportToExcel(stages, "Stages_Report")}
          >
            Generate Report
          </button>
        </div>

        {/* Stage Table */}
        <table className="view-stage-table">
          <thead>
            <tr>
              <th>SNO</th>
              <th>Stage Name</th>
              <th>City</th>
              <th>Route ID</th>
              <th>Arrival Time</th>
              <th>Departure Time</th>
              <th>Fee</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {stages.length > 0 ? (
              stages.map((stage, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td>{stage.stagename}</td>
                  <td>{stage.city}</td>
                  <td>{stage.routeid}</td>
                  <td>{formatTime(stage.arrivaltime)}</td>
                  <td>{formatTime(stage.departureTime)}</td>
                  <td>{stage.fee}</td>
                  <td>
                    <button
                      className="edit-button"
                      onClick={() => handleEdit(stage)}
                      style={{ marginRight: "5px" }}
                    >
                      Edit
                    </button>
                    <button
                      className="delete-button"
                      onClick={() => handleDelete(stage.stageid)}
                      style={{ marginRight: "5px" }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8">No stage data available</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Edit Modal */}
        {showEditModal && (
          <div className="modal-overlay" style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <div className="modal-content" style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              width: '400px',
              maxWidth: '90%'
            }}>
              <h3>Edit Stage</h3>
              <div className="stage-form-group">
                <label>Stage Name</label>
                <input
                  type="text"
                  value={editFormData.stagename}
                  onChange={(e) => setEditFormData({...editFormData, stagename: e.target.value})}
                  required
                />
              </div>
              <div className="stage-form-group">
                <label>City</label>
                <select
                  value={editFormData.city}
                  onChange={(e) => setEditFormData({...editFormData, city: e.target.value})}
                  required
                >
                  <option value="">Select City</option>
                  {cities.map((cityName) => (
                    <option key={cityName} value={cityName}>
                      {cityName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="stage-form-group">
                <label>Route ID</label>
                <select
                  value={editFormData.routeid}
                  onChange={(e) => setEditFormData({...editFormData, routeid: e.target.value})}
                  required
                >
                  <option value="">Select Route ID</option>
                  {routeIds.map((route) => (
                    <option key={route.routeid} value={route.routeid}>
                      {route.routeid}
                    </option>
                  ))}
                </select>
              </div>
              <div className="stage-form-group">
                <label>Arrival Time</label>
                <input
                  type="time"
                  value={editFormData.arrivaltime}
                  onChange={(e) => setEditFormData({...editFormData, arrivaltime: e.target.value})}
                />
              </div>
              <div className="stage-form-group">
                <label>Departure Time</label>
                <input
                  type="time"
                  value={editFormData.departuretime}
                  onChange={(e) => setEditFormData({...editFormData, departuretime: e.target.value})}
                />
              </div>
              <div className="stage-form-group">
                <label>Fee</label>
                <input
                  type="number"
                  step="0.01"
                  value={editFormData.fee}
                  onChange={(e) => setEditFormData({...editFormData, fee: e.target.value})}
                />
              </div>
              <div style={{ textAlign: 'right', marginTop: '20px' }}>
                <button
                  className="stage-submit-button"
                  onClick={handleUpdate}
                  style={{ marginRight: '10px' }}
                >
                  Update
                </button>
                <button
                  onClick={() => setShowEditModal(false)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewStage;
