import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../../config";
import "../../styles/ViewRoute.css";
import { exportToExcel, exportRouteToPDF } from "../ReportGenerator"

const ViewRoute = () => {
  const navigate = useNavigate();
  const [city, setCity] = useState("");
  const [routeId, setRouteId] = useState("");
  const [routeName, setRouteName] = useState("");
  const [routes, setRoutes] = useState([]);
  const [allRoutes, setAllRoutes] = useState([]);
  const [routeIds, setRouteIds] = useState([]);
  const [error, setError] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRoute, setEditingRoute] = useState(null);
  const [editFormData, setEditFormData] = useState({
    routeid: "",
    routename: "",
    city: "",
    totalstages: "",
    totaldistance: ""
  });

  // Predefined list of cities
  const cities = [
    "Kovilpatti", "Thoothukudi", "Tirunelveli", "Sattur", "Virudhunagar",
    "Vilathikulam", "Sivakasi", "Kayathar", "Sankarankovil", "Kalugumalai"
  ];

  // Fetch all routes
  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const response = await axios.get(`${API_URL}/getRoute`);
        console.log("API Response:", response.data);
        setRoutes(response.data);
        setAllRoutes(response.data);
      } catch (error) {
        console.error("Error fetching routes:", error);
        setError("Failed to fetch routes. Please try again.");
      }
    };

    fetchRoutes();
  }, []);

  // Fetch Route IDs and Route Names from the database
  useEffect(() => {
    const fetchRouteIds = async () => {
      try {
        const response = await axios.get(`${API_URL}/getRoute`); // Adjust endpoint as needed
        setRouteIds(response.data);
      } catch (error) {
        console.error("Error fetching route IDs:", error);
      }
    };

    fetchRouteIds();
  }, []);

  // Get unique route names for dropdown
  const routeNames = [...new Set(allRoutes.map(route => route.routename))];

  // Handle search/filter
  const handleSearch = () => {
    const filtered = allRoutes.filter((route) => {
      return (
        (city === "" || route.city?.trim() === city.trim()) &&
        (routeId === "" || route.routeid.toString() === routeId.trim()) &&
        (routeName === "" || route.routename?.toLowerCase().includes(routeName.toLowerCase()))
      );
    });

    setRoutes(filtered);
    console.log("Filtered Routes:", filtered);

    setCity("");
    setRouteId("");
    setRouteName("");
  };

  // Handle edit route
  const handleEdit = (route) => {
    setEditingRoute(route);
    setEditFormData({
      routeid: route.routeid,
      routename: route.routename,
      city: route.city,
      totalstages: route.totalstages,
      totaldistance: route.totaldistance
    });
    setShowEditModal(true);
  };

  // Handle update route
  const handleUpdate = async () => {
    try {
      const response = await axios.put(`${API_URL}/updateRoute/${editingRoute.routeid}`, editFormData);
      alert(response.data.message);
      setShowEditModal(false);
      setEditingRoute(null);
      // Refresh routes
      const refreshResponse = await axios.get(`${API_URL}/getRoute`);
      setRoutes(refreshResponse.data);
      setAllRoutes(refreshResponse.data);
    } catch (error) {
      console.error("Error updating route:", error);
      alert("Failed to update route. Please try again.");
    }
  };

  // Handle delete route
  const handleDelete = async (routeId) => {
    if (window.confirm("Are you sure you want to delete this route?")) {
      try {
        const response = await axios.delete(`${API_URL}/deleteRoute/${routeId}`);
        alert(response.data.message);
        // Refresh routes
        const refreshResponse = await axios.get(`${API_URL}/getRoute`);
        setRoutes(refreshResponse.data);
        setAllRoutes(refreshResponse.data);
      } catch (error) {
        console.error("Error deleting route:", error);
        alert("Failed to delete route. Please try again.");
      }
    }
  };

  return (
    <div className="view-route-master-container">
      <div className="view-route-box-wrapper">
        <div className="view-route-main-title">ROUTE MASTER</div>
        <div className="view-route-title">View</div>

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

          {/* Route Name Dropdown */}
          <div className="view-filter-item">
            <label>Route Name</label>
            <select value={routeName} onChange={(e) => setRouteName(e.target.value)}>
              <option value="">All</option>
              {routeNames.map((name) => (
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
            onClick={() => exportToExcel(routes, "Routes_Report")}
          >
            Generate Report
          </button>
        </div>

        {/* Route Table */}
        <table className="view-route-table">
          <thead>
            <tr>
              <th>Route ID</th>
              <th>Route Name</th>
              <th>City</th>
              <th>Total Stages</th>
              <th>Total Distance (km)</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {routes.length > 0 ? (
              routes.map((route, index) => (
                <tr key={index}>
                  <td>{route.routeid}</td>
                  <td>{route.routename}</td>
                  <td>{route.city}</td>
                  <td>{route.totalstages}</td>
                  <td>{route.totaldistance}</td>
                  <td>
                    <button
                      className="edit-button"
                      onClick={() => handleEdit(route)}
                      style={{ marginRight: "5px" }}
                    >
                      Edit
                    </button>
                    <button
                      className="delete-button"
                      onClick={() => handleDelete(route.routeid)}
                      style={{ marginRight: "5px" }}
                    >
                      Delete
                    </button>
                    <button
                      className="pdf-button"
                      onClick={async () => {
                        try {
                          const response = await axios.get(`http://localhost:5000/getRouteDetails/${route.routeid}`);
                          exportRouteToPDF(response.data);
                        } catch (error) {
                          console.error("Error generating PDF:", error);
                          alert("Failed to generate PDF. Please try again.");
                        }
                      }}
                    >
                      Generate PDF
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6">No route data available</td>
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
              <h3>Edit Route</h3>
              <div className="route-form-group">
                <label>Route ID</label>
                <input
                  type="text"
                  value={editFormData.routeid}
                  onChange={(e) => setEditFormData({...editFormData, routeid: e.target.value})}
                  required
                />
              </div>
              <div className="route-form-group">
                <label>Route Name</label>
                <input
                  type="text"
                  value={editFormData.routename}
                  onChange={(e) => setEditFormData({...editFormData, routename: e.target.value})}
                  required
                />
              </div>
              <div className="route-form-group">
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
              <div className="route-form-group">
                <label>Total Stages</label>
                <input
                  type="number"
                  value={editFormData.totalstages}
                  onChange={(e) => setEditFormData({...editFormData, totalstages: e.target.value})}
                  required
                />
              </div>
              <div className="route-form-group">
                <label>Total Distance (km)</label>
                <input
                  type="number"
                  step="0.1"
                  value={editFormData.totaldistance}
                  onChange={(e) => setEditFormData({...editFormData, totaldistance: e.target.value})}
                  required
                />
              </div>
              <div style={{ textAlign: 'right', marginTop: '20px' }}>
                <button
                  className="route-submit-button"
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

export default ViewRoute;
