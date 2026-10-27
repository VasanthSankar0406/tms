import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_URL } from "../../../config";
import "../../../styles/ViewInsurance.css";
import { exportToExcel } from "../../ReportGenerator";
import EditInsurance from "./EditInsurance";

const ViewInsurance = () => {
  const [vehicleid, setVehicleid] = useState("");
  const [insuranceno, setInsuranceno] = useState(""); // Insurance No for filtering
  const [insuranceDetails, setInsuranceDetails] = useState([]);
  const [allInsuranceDetails, setAllInsuranceDetails] = useState([]);
  const [vehicleIds, setVehicleIds] = useState([]);
  const [insuranceNos, setInsuranceNos] = useState([]);
  const [error, setError] = useState("");
  const [editingInsurance, setEditingInsurance] = useState(null);

  useEffect(() => {
    const fetchInsuranceDetails = async () => {
      try {
        const response = await axios.get(`${API_URL}/getInsurance`);

        const formattedData = response.data.map((ins) => ({
          ...ins,
          vehicleid: String(ins.vehicleid).trim(),
          policyno: String(ins.policyno).trim(),
          status: new Date(ins.expirydate) > new Date() ? 'Active' : 'Expired',
        }));

        setInsuranceDetails(formattedData);
        setAllInsuranceDetails(formattedData);

        // Extract unique Vehicle IDs and Policy Nos
        setVehicleIds([...new Set(formattedData.map((ins) => ins.vehicleid))]);
        setInsuranceNos([...new Set(formattedData.map((ins) => ins.policyno))]);
      } catch (error) {
        console.error("Error fetching insurance details:", error);
        setError("Failed to fetch insurance details. Please try again.");
      }
    };

    fetchInsuranceDetails();
  }, []);

  const handleSearch = () => {
    const filtered = allInsuranceDetails.filter((ins) => {
      return (
        (vehicleid === "" || String(ins.vehicleid).trim() === vehicleid) &&
        (insuranceno === "" || String(ins.policyno).trim() === insuranceno)
      );
    });

    setInsuranceDetails(filtered);

    // Reset dropdowns after search
    setVehicleid("");
    setInsuranceno("");
  };

  const handleEdit = (insurance) => {
    setEditingInsurance(insurance);
  };

  const handleDelete = async (insuranceId) => {
    if (window.confirm("Are you sure you want to delete this insurance record?")) {
      try {
        await axios.delete(`${API_URL}/deleteInsurance/${insuranceId}`);
        alert("Insurance record deleted successfully");
        // Refresh the list
        const response = await axios.get(`${API_URL}/getInsurance`);
        const formattedData = response.data.map((ins) => ({
          ...ins,
          vehicleid: String(ins.vehicleid).trim(),
          policyno: String(ins.policyno).trim(),
          status: new Date(ins.expirydate) > new Date() ? 'Active' : 'Expired',
        }));
        setInsuranceDetails(formattedData);
        setAllInsuranceDetails(formattedData);
        setVehicleIds([...new Set(formattedData.map((ins) => ins.vehicleid))]);
        setInsuranceNos([...new Set(formattedData.map((ins) => ins.policyno))]);
      } catch (error) {
        console.error("Error deleting insurance:", error);
        alert("Failed to delete insurance record");
      }
    }
  };

  const handleSaveEdit = async (updatedInsurance) => {
    try {
      const payload = {
        vehicleId: updatedInsurance.vehicleid,
        policyNo: updatedInsurance.policyno,
        companyName: updatedInsurance.companyname,
        issueDate: updatedInsurance.issuedate,
        expiryDate: updatedInsurance.expirydate,
        premiumAmount: updatedInsurance.premiumamount,
      };
      await axios.put(`${API_URL}/updateInsurance/${updatedInsurance.insuranceid}`, payload);
      alert("Insurance record updated successfully");
      setEditingInsurance(null);
      // Refresh the list
      const response = await axios.get(`${API_URL}/getInsurance`);
      const formattedData = response.data.map((ins) => ({
        ...ins,
        vehicleid: String(ins.vehicleid).trim(),
        policyno: String(ins.policyno).trim(),
        status: new Date(ins.expirydate) > new Date() ? 'Active' : 'Expired',
      }));
      setInsuranceDetails(formattedData);
      setAllInsuranceDetails(formattedData);
      setVehicleIds([...new Set(formattedData.map((ins) => ins.vehicleid))]);
      setInsuranceNos([...new Set(formattedData.map((ins) => ins.policyno))]);
    } catch (error) {
      console.error("Error updating insurance:", error);
      alert("Failed to update insurance record");
    }
  };

  const handleCancelEdit = () => {
    setEditingInsurance(null);
  };

  return (
    <div className="view-insurance-container">
      <div className="view-insurance-box">
        <div className="view-insurance-title-main">View Insurance Details</div>

        <div className="view-insurance-filter-container">
          {/* Vehicle ID Dropdown */}
          <div className="view-insurance-filter-item">
            <label>Vehicle ID</label>
            <select value={vehicleid} onChange={(e) => setVehicleid(e.target.value)}>
              <option value="">Select Vehicle Id</option>
              {vehicleIds.map((id, index) => (
                <option key={index} value={id}>{id}</option>
              ))}
            </select>
          </div>

          {/* Insurance No Dropdown */}
          <div className="view-insurance-filter-item">
            <label>Insurance No</label>
            <select value={insuranceno} onChange={(e) => setInsuranceno(e.target.value)}>
              <option value="">Select Insurance No</option>
              {insuranceNos.map((no, index) => (
                <option key={index} value={no}>{no}</option>
              ))}
            </select>
          </div>

          <button className="view-insurance-search-button" onClick={handleSearch}>
            SEARCH
          </button>
        </div>

        <div style={{ textAlign: "right", margin: "10px 0" }}>
          <button className="report-button" onClick={() => exportToExcel(insuranceDetails, "Insurance_Report")}>
            Generate Report
          </button>
        </div>

        <table className="view-insurance-table">
          <thead>
            <tr>
              <th>Insurance ID</th>
              <th>Vehicle ID</th>
              <th>Insurance No</th>
              <th>Issue Date</th>
              <th>Expiry Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {insuranceDetails.length > 0 ? (
              insuranceDetails.map((ins, index) => (
                <tr key={index}>
                  <td>{ins.insuranceid}</td>
                  <td>{ins.vehicleid}</td>
                  <td>{ins.policyno}</td>
                  <td>{ins.issuedate ? new Date(ins.issuedate).toLocaleDateString() : "N/A"}</td>
                  <td>{ins.expirydate ? new Date(ins.expirydate).toLocaleDateString() : "N/A"}</td>
                  <td>{ins.status}</td>
                  <td>
                    <button onClick={() => handleEdit(ins)} style={{ marginRight: '5px' }}>Edit</button>
                    <button onClick={() => handleDelete(ins.insuranceid)}>Delete</button>
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

        {editingInsurance && (
          <EditInsurance
            insurance={editingInsurance}
            onSave={handleSaveEdit}
            onCancel={handleCancelEdit}
          />
        )}
      </div>
    </div>
  );
};

export default ViewInsurance;
