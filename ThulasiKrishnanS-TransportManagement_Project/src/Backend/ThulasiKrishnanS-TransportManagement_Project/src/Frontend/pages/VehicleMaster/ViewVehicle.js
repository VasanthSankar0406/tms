import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../../config";
import "../../styles/ViewVehicle.css";
import { exportToExcel } from "../ReportGenerator";

const ViewVehicle = () => {
  const navigate = useNavigate();
  const [vehicleType, setVehicleType] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [regNo, setRegNo] = useState("");
  const [vehicles, setVehicles] = useState([]); // Filtered data
  const [allVehicles, setAllVehicles] = useState([]); // All vehicles
  const [error, setError] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [editFormData, setEditFormData] = useState({
    vehicletype: "",
    seatcapacity: "",
    registrationno: "",
    routeid: "",
    registrationdate: "",
    purchasedate: "",
    vendorid: "",
    rcno: "",
    registrationplace: ""
  });


  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const response = await axios.get(`${API_URL}/getVehicle`);
        console.log("API Response:", response.data);
        setVehicles(response.data);
        setAllVehicles(response.data);
      } catch (error) {
        console.error("Error fetching vehicles:", error);
        setError("Failed to fetch vehicles. Please try again.");
      }
    };
    fetchVehicles();
  }, []);

const handleSearch = () => {
  const filtered = allVehicles.filter((vehicle) => {
    return (
      (vehicleType === "" || vehicle.vehicletype?.trim() === vehicleType.trim()) &&
      (vehicleId === "" || vehicle.vehicleid.toString() === vehicleId.trim()) &&
      (regNo === "" || vehicle.registrationno.toLowerCase() === regNo.trim().toLowerCase())
    );
  });

  setVehicles(filtered);
  console.log("Filtered Vehicles:", filtered);

  setVehicleType("");
   setVehicleId("");
    setRegNo("");
};

const handleEdit = (vehicle) => {
  setEditingVehicle(vehicle);
  setEditFormData({
    vehicletype: vehicle.vehicletype || "",
    seatcapacity: vehicle.seatcapacity || "",
    registrationno: vehicle.registrationno || "",
    routeid: vehicle.routeid || "",
    registrationdate: vehicle.registrationdate ? new Date(vehicle.registrationdate).toISOString().split('T')[0] : "",
    purchasedate: vehicle.purchasedate ? new Date(vehicle.purchasedate).toISOString().split('T')[0] : "",
    vendorid: vehicle.vendorid || "",
    rcno: vehicle.rcno || "",
    registrationplace: vehicle.registrationplace || ""
  });
  setShowEditModal(true);
};

const handleEditSubmit = async (e) => {
  e.preventDefault();
  try {
    const response = await axios.put(`${API_URL}/updateVehicle/${editingVehicle.vehicleid}`, editFormData);
    if (response.data.success) {
      // Refresh the vehicle list
      const updatedVehicles = await axios.get(`${API_URL}/getVehicle`);
      setVehicles(updatedVehicles.data);
      setAllVehicles(updatedVehicles.data);
      setShowEditModal(false);
      setEditingVehicle(null);
      alert("Vehicle updated successfully!");
    }
  } catch (error) {
    console.error("Error updating vehicle:", error);
    alert("Failed to update vehicle. Please try again.");
  }
};

const handleViewDetails = (vehicle) => {
  setSelectedVehicle(vehicle);
  setShowDetailsModal(true);
};

const handleDelete = async (vehicleId) => {
  if (window.confirm("Are you sure you want to delete this vehicle?")) {
    try {
      const response = await axios.delete(`${API_URL}/deleteVehicle/${vehicleId}`);
      if (response.data.success) {
        // Refresh the vehicle list
        const updatedVehicles = await axios.get(`${API_URL}/getVehicle`);
        setVehicles(updatedVehicles.data);
        setAllVehicles(updatedVehicles.data);
        alert("Vehicle deleted successfully!");
      }
    } catch (error) {
      console.error("Error deleting vehicle:", error);
      alert("Failed to delete vehicle. Please try again.");
    }
  }
};


  return (
    <div className="view-vehicle-master-container">
      <div className="view-vehicle-box-wrapper">
        <div className="view-vehicle-main-title">VEHICLE MASTER</div>
        <div className="view-vehicle-title">View</div>

        <div className="view-filter-container">
          <div className="view-filter-item">
            <label>Vehicle Type</label>
            <select value={vehicleType} onChange={(e) => setVehicleType(e.target.value)}>
              <option value="">All</option>
              <option value="A/C">A/C</option>
              <option value="Non-A/C">Non A/C</option>
            </select>
          </div>

          <div className="view-filter-item">
            <label>Vehicle ID</label>
            <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
              <option value="">All</option>
              {allVehicles.map((vehicle) => (
                <option key={vehicle.vehicleid} value={vehicle.vehicleid}>
                  {vehicle.vehicleid}
                </option>
              ))}
            </select>
          </div>

          <div className="view-filter-item">
            <label>Reg No</label>
            <select value={regNo} onChange={(e) => setRegNo(e.target.value)}>
              <option value="">All</option>
              {[...new Set(allVehicles.map(vehicle => vehicle.registrationno))].map((reg) => (
                <option key={reg} value={reg}>
                  {reg}
                </option>
              ))}
            </select>
          </div>

          <button className="view-search-button" onClick={handleSearch}>SEARCH</button>
        </div>

        <div style={{ textAlign: "right", margin: "10px 0" }}>
          <button
            className="report-button"
            onClick={() =>
              exportToExcel(
                vehicles.map((vehicle) => ({
                  "Vehicle Type": vehicle.vehicletype,
                  "Vehicle ID": vehicle.vehicleid,
                  "Seat Capacity": vehicle.seatcapacity,
                  "Allocated Seats": vehicle.allocated_count ?? 0,
                  "Available Seats": vehicle.available_seats ?? vehicle.seatcapacity ?? 0,
                  "Registration No": vehicle.registrationno,
                  "Route ID": vehicle.routeid,
                  "Registration Date": vehicle.registrationdate,
                  "RC No": vehicle.rcno,
                  "Purchase Date": vehicle.purchasedate,
                  "Vendor ID": vehicle.vendorid,
                  "Registration Place": vehicle.registrationplace
                })),
                "Vehicle_Report"
              )
            }
          >
            Generate Report
          </button>
        </div>

        <div className="view-vehicle-table-container">
          <table className="view-vehicle-table">
          <thead>
            <tr>
              <th>SNO</th>
              <th>Vehicle Type</th>
              <th>Vehicle ID</th>
              <th>Seat Capacity</th>
              <th>Available Seats</th>
              <th>Reg No</th>
              <th>Route ID</th>
              <th>Reg Date</th>
              <th>RC No</th>
              <th>Purchase Date</th>
              <th>Vendor ID</th>
              <th>Registration Place</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.length > 0 ? (
              vehicles.map((vehicle, index) => (
                <tr key={vehicle.vehicleid}>
                  <td>{index + 1}</td>
                  <td>{vehicle.vehicletype}</td>
                  <td>{vehicle.vehicleid}</td>
                  <td>{vehicle.seatcapacity}</td>
                  <td>{vehicle.available_seats ?? vehicle.seatcapacity ?? "N/A"}</td>
                  <td>{vehicle.registrationno}</td>
                  <td>{vehicle.routeid || "N/A"}</td>
                  <td>{vehicle.registrationdate ? new Date(vehicle.registrationdate).toLocaleDateString() : "N/A"}</td>
                  <td>{vehicle.rcno}</td>
                  <td>{vehicle.purchasedate ? new Date(vehicle.purchasedate).toLocaleDateString() : "N/A"}</td>
                  <td>{vehicle.vendorid || "N/A"}</td>
                  <td>{vehicle.registrationplace}</td>
                  <td>
                    <button
                      onClick={() => handleViewDetails(vehicle)}
                      style={{
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        padding: '5px 10px',
                        marginRight: '5px',
                        borderRadius: '3px',
                        cursor: 'pointer'
                      }}
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => handleEdit(vehicle)}
                      style={{
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        padding: '5px 10px',
                        marginRight: '5px',
                        borderRadius: '3px',
                        cursor: 'pointer'
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(vehicle.vehicleid)}
                      style={{
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        padding: '5px 10px',
                        borderRadius: '3px',
                        cursor: 'pointer'
                      }}
                    >
                      Delete
                    </button>
                  </td>

                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="13">No vehicle data available</td>
              </tr>
            )}
          </tbody>
        </table>
        </div>

        {showEditModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              width: '500px',
              maxHeight: '80vh',
              overflowY: 'auto'
            }}>
              <h3>Edit Vehicle</h3>
              <form onSubmit={handleEditSubmit}>
                <div style={{ marginBottom: '10px' }}>
                  <label>Vehicle Type:</label>
                  <select
                    value={editFormData.vehicletype}
                    onChange={(e) => setEditFormData({...editFormData, vehicletype: e.target.value})}
                    style={{ width: '100%', padding: '5px' }}
                    required
                  >
                    <option value="A/C">A/C</option>
                    <option value="Non-A/C">Non A/C</option>
                  </select>
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <label>Seat Capacity:</label>
                  <input
                    type="number"
                    value={editFormData.seatcapacity}
                    onChange={(e) => setEditFormData({...editFormData, seatcapacity: e.target.value})}
                    style={{ width: '100%', padding: '5px' }}
                    required
                  />
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <label>Registration No:</label>
                  <input
                    type="text"
                    value={editFormData.registrationno}
                    onChange={(e) => setEditFormData({...editFormData, registrationno: e.target.value})}
                    style={{ width: '100%', padding: '5px' }}
                    required
                  />
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <label>Route ID:</label>
                  <input
                    type="number"
                    value={editFormData.routeid}
                    onChange={(e) => setEditFormData({...editFormData, routeid: e.target.value})}
                    style={{ width: '100%', padding: '5px' }}
                    required
                  />
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <label>Registration Date:</label>
                  <input
                    type="date"
                    value={editFormData.registrationdate}
                    onChange={(e) => setEditFormData({...editFormData, registrationdate: e.target.value})}
                    style={{ width: '100%', padding: '5px' }}
                    required
                  />
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <label>Purchase Date:</label>
                  <input
                    type="date"
                    value={editFormData.purchasedate}
                    onChange={(e) => setEditFormData({...editFormData, purchasedate: e.target.value})}
                    style={{ width: '100%', padding: '5px' }}
                    required
                  />
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <label>Vendor ID:</label>
                  <input
                    type="number"
                    value={editFormData.vendorid}
                    onChange={(e) => setEditFormData({...editFormData, vendorid: e.target.value})}
                    style={{ width: '100%', padding: '5px' }}
                    required
                  />
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <label>RC No:</label>
                  <input
                    type="text"
                    value={editFormData.rcno}
                    onChange={(e) => setEditFormData({...editFormData, rcno: e.target.value})}
                    style={{ width: '100%', padding: '5px' }}
                    required
                  />
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <label>Registration Place:</label>
                  <input
                    type="text"
                    value={editFormData.registrationplace}
                    onChange={(e) => setEditFormData({...editFormData, registrationplace: e.target.value})}
                    style={{ width: '100%', padding: '5px' }}
                    required
                  />
                </div>
                <div style={{ textAlign: 'right', marginTop: '20px' }}>
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    style={{
                      backgroundColor: '#6c757d',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      marginRight: '10px',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Update
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {showDetailsModal && selectedVehicle && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1001
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '30px',
              borderRadius: '12px',
              width: '600px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0, color: '#333' }}>Vehicle Details - ID: {selectedVehicle.vehicleid}</h2>
                <button 
                  onClick={() => { setShowDetailsModal(false); setSelectedVehicle(null); }}
                  style={{
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '16px'
                  }}
                >
                  Close
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <strong>Vehicle Type:</strong> {selectedVehicle.vehicletype || 'N/A'}<br/>
                  <strong>Seat Capacity:</strong> {selectedVehicle.seatcapacity || 'N/A'}<br/>
                  <strong>Allocated Seats:</strong> {selectedVehicle.allocated_count ?? 0}<br/>
                  <strong>Available Seats:</strong> {selectedVehicle.available_seats ?? selectedVehicle.seatcapacity ?? 'N/A'}<br/>
                  <strong>Registration No:</strong> {selectedVehicle.registrationno || 'N/A'}<br/>
                  <strong>Route ID:</strong> {selectedVehicle.routeid || 'N/A'}<br/>
                  <strong>Registration Date:</strong> {selectedVehicle.registrationdate ? new Date(selectedVehicle.registrationdate).toLocaleDateString() : 'N/A'}<br/>
                </div>
                <div>
                  <strong>Purchase Date:</strong> {selectedVehicle.purchasedate ? new Date(selectedVehicle.purchasedate).toLocaleDateString() : 'N/A'}<br/>
                  <strong>Vendor ID:</strong> {selectedVehicle.vendorid || 'N/A'}<br/>
                  <strong>RC No:</strong> {selectedVehicle.rcno || 'N/A'}<br/>
                  <strong>Registration Place:</strong> {selectedVehicle.registrationplace || 'N/A'}<br/>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewVehicle;

