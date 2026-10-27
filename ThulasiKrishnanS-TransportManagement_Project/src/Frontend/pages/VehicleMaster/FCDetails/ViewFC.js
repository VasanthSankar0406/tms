import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../../../config";
import "../../../styles/ViewFC.css";
import { exportToExcel } from "../../ReportGenerator";
import EditFC from "./EditFC";

const ViewFC = () => {
  const navigate = useNavigate();
  const [vehicleid, setVehicleid] = useState("");
  const [fcno, setFcno] = useState(""); // FC No for filtering
  const [fcDetails, setFcDetails] = useState([]);
  const [allFcDetails, setAllFcDetails] = useState([]);
  const [vehicleIds, setVehicleIds] = useState([]);
  const [fcNos, setFcNos] = useState([]); // FC No values
  const [error, setError] = useState("");
  const [editingFC, setEditingFC] = useState(null);

  useEffect(() => {
    const fetchFcDetails = async () => {
      try {
        const response = await axios.get(`${API_URL}/getFC`);

        const formattedData = response.data.map((fc) => ({
          ...fc,
          vehicleid: String(fc.vehicleid).trim(),
          fcno: String(fc.fcno).trim(),
        }));

        setFcDetails(formattedData);
        setAllFcDetails(formattedData);

        // Extract unique Vehicle IDs and FC No values
        setVehicleIds([...new Set(formattedData.map((fc) => fc.vehicleid))]);
        setFcNos([...new Set(formattedData.map((fc) => fc.fcno))]);
      } catch (error) {
        console.error("Error fetching FC details:", error);
        setError("Failed to fetch FC details. Please try again.");
      }
    };

    fetchFcDetails();
  }, []);

  const handleSearch = () => {
    const filtered = allFcDetails.filter((fc) => {
      return (
        (vehicleid === "" || String(fc.vehicleid).trim() === vehicleid) &&
        (fcno === "" || String(fc.fcno).trim() === fcno)
      );
    });

    setFcDetails(filtered);

    // Reset dropdowns after search
    setVehicleid("");
    setFcno("");
  };

  const handleEdit = (fc) => {
    setEditingFC(fc);
  };

  const handleDelete = async (fcId) => {
    if (window.confirm("Are you sure you want to delete this FC record?")) {
      try {
        await axios.delete(`${API_URL}/deleteFC/${fcId}`);
        alert("FC record deleted successfully");
        // Refresh the list
        const response = await axios.get(`${API_URL}/getFC`);
        const formattedData = response.data.map((fc) => ({
          ...fc,
          vehicleid: String(fc.vehicleid).trim(),
          fcno: String(fc.fcno).trim(),
        }));
        setFcDetails(formattedData);
        setAllFcDetails(formattedData);
        setVehicleIds([...new Set(formattedData.map((fc) => fc.vehicleid))]);
        setFcNos([...new Set(formattedData.map((fc) => fc.fcno))]);
      } catch (error) {
        console.error("Error deleting FC:", error);
        alert("Failed to delete FC record");
      }
    }
  };

  const handleSaveEdit = async (updatedFC) => {
    try {
      const payload = {
        vehicleId: updatedFC.vehicleid,
        fcNo: updatedFC.fcno,
        issueDate: updatedFC.issuedate,
        expiryDate: updatedFC.expirydate,
        status: updatedFC.status,
      };
      await axios.put(`${API_URL}/updateFC/${updatedFC.fcid}`, payload);
      alert("FC record updated successfully");
      setEditingFC(null);
      // Refresh the list
      const response = await axios.get(`${API_URL}/getFC`);
      const formattedData = response.data.map((fc) => ({
        ...fc,
        vehicleid: String(fc.vehicleid).trim(),
        fcno: String(fc.fcno).trim(),
      }));
      setFcDetails(formattedData);
      setAllFcDetails(formattedData);
      setVehicleIds([...new Set(formattedData.map((fc) => fc.vehicleid))]);
      setFcNos([...new Set(formattedData.map((fc) => fc.fcno))]);
    } catch (error) {
      console.error("Error updating FC:", error);
      alert("Failed to update FC record");
    }
  };

  const handleCancelEdit = () => {
    setEditingFC(null);
  };

  return (
    <div className="view-fc-container">
      <div className="view-fc-box">
        <div className="view-fc-title-main">View FC Details</div>

        <div className="view-fc-filter-container">
          {/* Vehicle ID Dropdown */}
          <div className="view-fc-filter-item">
            <label>Vehicle ID</label>
            <select value={vehicleid} onChange={(e) => setVehicleid(e.target.value)}>
              <option value="">All</option>
              {vehicleIds.map((id, index) => (
                <option key={index} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </div>

          {/* FC No Dropdown */}
          <div className="view-fc-filter-item">
            <label>FC No</label>
            <select value={fcno} onChange={(e) => setFcno(e.target.value)}>
              <option value="">All</option>
              {fcNos.map((no, index) => (
                <option key={index} value={no}>
                  {no}
                </option>
              ))}
            </select>
          </div>

          <button className="view-fc-search-button" onClick={handleSearch}>
            SEARCH
          </button>
        </div>

        <div style={{ textAlign: "right", margin: "10px 0" }}>
          <button className="report-button" onClick={() => exportToExcel(fcDetails, "FC_Report")}>
            Generate Report
          </button>
        </div>

        {editingFC && (
          <EditFC
            fc={editingFC}
            onSave={handleSaveEdit}
            onCancel={handleCancelEdit}
          />
        )}

        <table className="view-fc-table">
          <thead>
            <tr>
              <th>FC ID</th>
              <th>Vehicle ID</th>
              <th>FC No</th>
              <th>Issue Date</th>
              <th>Expiry Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {fcDetails.length > 0 ? (
              fcDetails.map((fc, index) => (
                <tr key={index}>
                  <td>{fc.fcid}</td>
                  <td>{fc.vehicleid}</td>
                  <td>{fc.fcno}</td>
                  <td>{fc.issuedate ? new Date(fc.issuedate).toLocaleDateString() : "N/A"}</td>
                  <td>{fc.expirydate ? new Date(fc.expirydate).toLocaleDateString() : "N/A"}</td>
                  <td>{fc.status}</td>
                  <td>
                    <button onClick={() => handleEdit(fc)} style={{ marginRight: '5px' }}>Edit</button>
                    <button onClick={() => handleDelete(fc.fcid)}>Delete</button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7">No records found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ViewFC;
