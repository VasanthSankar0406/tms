import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_URL } from "../../../config";
import "../../../styles/ViewPermit.css";
import { exportToExcel } from "../../ReportGenerator"

const ViewPermit = () => {
  const [vehicleId, setVehicleId] = useState("");
  const [permitId, setPermitId] = useState("");
  const [permitData, setPermitData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [vehicleIds, setVehicleIds] = useState([]);
  const [permitIds, setPermitIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingPermit, setEditingPermit] = useState(null);
  const [editForm, setEditForm] = useState({
    permittype: "",
    issuedate: "",
    expirydate: "",
    status: ""
  });

  useEffect(() => {
    const fetchPermitData = async () => {
      try {
        const response = await axios.get(`${API_URL}/getPermit`);
        setPermitData(response.data);
        setFilteredData(response.data);
        setPermitIds(response.data.map(p => p.permitno));
      } catch (error) {
        console.error("Error fetching permit data:", error);
        setError("Failed to fetch permit data.");
      }
    };

    const fetchVehicleIds = async () => {
      try {
        const response = await axios.get(`${API_URL}/getVehicle`);
        const vehicleIds = response.data.map(vehicle => vehicle.vehicleid);
        setVehicleIds(vehicleIds);
      } catch (error) {
        console.error("Error fetching vehicle IDs:", error);
        setError("Failed to fetch vehicle IDs.");
      }
    };

    fetchPermitData();
    fetchVehicleIds();
    setLoading(false);
  }, []);

  const handleSearch = () => {
    const result = permitData.filter(item =>
      (vehicleId === "" || item.vehicleid.toLowerCase().includes(vehicleId.toLowerCase())) &&
      (permitId === "" || item.permitno.toLowerCase().includes(permitId.toLowerCase()))
    );
    setFilteredData(result);
  };

  const handleEdit = (permit) => {
    setEditingPermit(permit);
    setEditForm({
      permittype: permit.permittype,
      issuedate: permit.issuedate.split('T')[0],
      expirydate: permit.expirydate.split('T')[0],
      status: permit.status
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_URL}/updatePermit/${editingPermit.vehicleid}/${editingPermit.permitno}`, editForm);
      setEditingPermit(null);
      // Refresh data
      const response = await axios.get(`${API_URL}/getPermit`);
      setPermitData(response.data);
      setFilteredData(response.data);
      alert("Permit updated successfully!");
    } catch (error) {
      console.error("Error updating permit:", error);
      alert("Failed to update permit.");
    }
  };

  const handleDelete = async (permit) => {
    if (window.confirm(`Are you sure you want to delete permit ${permit.permitno} for vehicle ${permit.vehicleid}?`)) {
      try {
        await axios.delete(`${API_URL}/deletePermit/${permit.vehicleid}/${permit.permitno}`);
        // Refresh data
        const response = await axios.get(`${API_URL}/getPermit`);
        setPermitData(response.data);
        setFilteredData(response.data);
        alert("Permit deleted successfully!");
      } catch (error) {
        console.error("Error deleting permit:", error);
        alert("Failed to delete permit.");
      }
    }
  };

  return (
    <div className="view-permit-container">
      <div className="view-permit-box">
        <div className="view-permit-main-title">PERMIT DETAILS</div>

        <div className="view-permit-filter-container">
          {/* Vehicle ID Dropdown */}
          <div className="view-permit-filter-item">
            <label>Vehicle ID</label>
            <div className="view-permit-dropdown-container">
              <select
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                className="vehicle-id-dropdown"
              >
                <option value="">Select Vehicle ID</option>
                {vehicleIds.map((id, index) => (
                  <option key={index} value={id}>{id}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="view-permit-filter-item">
            <label>Permit No</label>
            <div className="view-permit-dropdown-container">
              <select
                value={permitId}
                onChange={(e) => setPermitId(e.target.value)}
                className="permit-id-dropdown"
              >
                <option value="">Select Permit No</option>
                {permitIds.map((id, index) => (
                  <option key={index} value={id}>{id}</option>
                ))}
              </select>
            </div>
          </div>

          <button className="view-permit-search-button" onClick={handleSearch}>
            SEARCH
          </button>
        </div>

        <div style={{ textAlign: "right", margin: "10px 0" }}>
          <button className="report-button" onClick={() => exportToExcel(filteredData, "Permit_Report")}>
            Generate Report
          </button>
        </div>        

        {error && <div className="error-message">{error}</div>}

        <table className="view-permit-table">
          <thead>
            <tr>
              <th>SNO</th>
              <th>Vehicle ID</th>
              <th>Permit No</th>
              <th>Permit Type</th>
              <th>Issue Date</th>
              <th>Expiry Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8">Loading...</td></tr>
            ) : filteredData.length > 0 ? (
              filteredData.map((permit, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td>{permit.vehicleid}</td>
                  <td>{permit.permitno}</td>
                  <td>{permit.permittype}</td>
                  <td>{permit.issuedate.split('T')[0]}</td>
                  <td>{permit.expirydate.split('T')[0]}</td>
                  <td>{permit.status}</td>
                  <td>
                    <button onClick={() => handleEdit(permit)} style={{ marginRight: '5px' }}>Edit</button>
                    <button onClick={() => handleDelete(permit)} style={{ color: 'red' }}>Delete</button>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="8">No Data Found</td></tr>
            )}
          </tbody>
        </table>

        {editingPermit && (
          <div style={{ marginTop: '20px', padding: '20px', border: '1px solid #ccc', borderRadius: '5px' }}>
            <h3>Edit Permit</h3>
            <form onSubmit={handleEditSubmit}>
              <div style={{ marginBottom: '10px' }}>
                <label>Permit Type: </label>
                <input
                  type="text"
                  value={editForm.permittype}
                  onChange={(e) => setEditForm({ ...editForm, permittype: e.target.value })}
                  required
                />
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label>Issue Date: </label>
                <input
                  type="date"
                  value={editForm.issuedate}
                  onChange={(e) => setEditForm({ ...editForm, issuedate: e.target.value })}
                  required
                />
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label>Expiry Date: </label>
                <input
                  type="date"
                  value={editForm.expirydate}
                  onChange={(e) => setEditForm({ ...editForm, expirydate: e.target.value })}
                  required
                />
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label>Status: </label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  required
                >
                  <option value="Active">Active</option>
                  <option value="Expired">Expired</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>
              <button type="submit" style={{ marginRight: '10px' }}>Update</button>
              <button type="button" onClick={() => setEditingPermit(null)}>Cancel</button>
            </form>
          </div>
        )}

        {error && <p className="error-message">{error}</p>}
      </div>
    </div>
  );
};

export default ViewPermit;
