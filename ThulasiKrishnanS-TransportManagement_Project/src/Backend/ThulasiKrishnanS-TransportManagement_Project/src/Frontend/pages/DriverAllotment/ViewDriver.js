import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../../styles/ViewDriver.css";
import "../../styles/LeaveRequest.css";
import { exportToExcel, exportDriverToPDF, exportLeaveRequestsToPDF, exportDriverQueriesToPDF } from "../ReportGenerator";
import EditDriverModal from "./EditDriverModal";
import AssignTempDriverModal from "./AssignTempDriverModal";
import { API_URL } from "../../config";

const ViewDriver = () => {
  const navigate = useNavigate();
  const [staffCode, setStaffCode] = useState("");
  const [staffName, setStaffName] = useState("");
  const [routeName, setRouteName] = useState("");
  const [drivers, setDrivers] = useState([]);
  const [allDrivers, setAllDrivers] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [queries, setQueries] = useState([]);
  const [error, setError] = useState("");
  const [leaveStaffCode, setLeaveStaffCode] = useState("");
  const [leaveStaffName, setLeaveStaffName] = useState("");
  const [queryStaffCode, setQueryStaffCode] = useState("");
  const [queryStaffName, setQueryStaffName] = useState("");

  // Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);

  // Assign Temp Driver Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedLeaveRequest, setSelectedLeaveRequest] = useState(null);
  const [availableTempDrivers, setAvailableTempDrivers] = useState([]);

  useEffect(() => {
    fetchDrivers();
    fetchLeaveRequests();
    fetchQueries();
  }, []);

  const fetchDrivers = async () => {
    try {
      const response = await axios.get(`${API_URL}/getdrivers`);
      const list = Array.isArray(response.data) ? response.data : [];
      setDrivers(list);
      setAllDrivers(list);
    } catch (error) {
      console.error("Error fetching drivers:", error);
      setError("Failed to fetch drivers. Please try again.");
    }
  };

  const fetchLeaveRequests = async () => {
    try {
      const response = await axios.get(`${API_URL}/getLeaveRequests`);
      setLeaveRequests(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Error fetching leave requests:', err);
    }
  };

  const fetchQueries = async () => {
    try {
      const response = await axios.get(`${API_URL}/getDriverQueries`);
      setQueries(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Error fetching queries:', err);
    }
  };

  const handleSearch = () => {
    const filtered = allDrivers.filter((driver) => {
      const dName = (driver.staffname || driver.name || "").toLowerCase();
      const sName = (staffName || "").toLowerCase();
      return (
        (staffCode === "" || driver.staffcode === staffCode) &&
        (staffName === "" || dName.includes(sName)) &&
        (routeName === "" || driver.routename === routeName)
      );
    });

    setDrivers(filtered);
    setStaffCode("");
    setStaffName("");
    setRouteName("");
  };

  const handleApprove = async (id, status) => {
    if (status === 'approved') {
      const request = leaveRequests.find(r => r.id === id);
      if (!request) {
        alert('Leave request details could not be loaded.');
        return;
      }

      try {
        const response = await axios.get(`${API_URL}/getAvailableTempDrivers/${request.leave_date}`);
        const tempDrivers = response.data || [];

        if (tempDrivers.length === 0) {
          alert('No temporary drivers are available for this leave date.');
          return;
        }

        setAvailableTempDrivers(tempDrivers);
        setSelectedLeaveRequest(request);
        setIsAssignModalOpen(true);
      } catch (err) {
        console.error('Error checking temporary drivers:', err);
        alert('Failed to check available temporary drivers.');
      }
    } else {
      updateLeaveStatus(id, status);
    }
  };

  const handleAssignTempDriver = async (assignedDriverCode) => {
    if (!selectedLeaveRequest) return;

    try {
      await axios.put(`${API_URL}/assignTempDriver/${selectedLeaveRequest.id}`, {
        temp_staffcode: assignedDriverCode
      });

      alert('Temporary driver assigned successfully!');
      setIsAssignModalOpen(false);
      setSelectedLeaveRequest(null);
      setAvailableTempDrivers([]);
      fetchLeaveRequests();
    } catch (err) {
      console.error('Error assigning temporary driver:', err);
      alert('Failed to assign temporary driver.');
    }
  };

  const updateLeaveStatus = async (id, status) => {
    try {
      await axios.put(`${API_URL}/updateLeaveRequestStatus/${id}`, { status });
      fetchLeaveRequests();
    } catch (err) {
      console.error('Error updating leave status:', err);
    }
  };

  const handleResolveQuery = async (id, status) => {
    try {
      await axios.put(`${API_URL}/updateDriverQueryStatus/${id}`, { status });
      fetchQueries();
    } catch (err) {
      console.error('Error resolving query:', err);
    }
  };

  const handleDelete = async (staffcode) => {
    if (window.confirm("Are you sure you want to delete this driver?")) {
      try {
        await axios.delete(`${API_URL}/deleteDriver/${staffcode}`);
        fetchDrivers();
      } catch (err) {
        console.error("Error deleting driver:", err);
      }
    }
  };

  const handleEdit = (driver) => {
    setSelectedDriver(driver);
    setIsEditModalOpen(true);
  };

  const handleUpdateSuccess = () => {
    fetchDrivers();
    setIsEditModalOpen(false);
  };

  return (
    <div className="view-driver-master-container">
      <div className="view-driver-box-wrapper">
        <h2 className="view-driver-title">DRIVER MANAGEMENT</h2>

        {error && <p style={{ color: "red", textAlign: "center" }}>{error}</p>}

        {/* Filter Bar */}
        <div className="view-filter-container">
          <div className="view-filter-item">
            <label>Staff Code</label>
            <select value={staffCode} onChange={(e) => setStaffCode(e.target.value)}>
              <option value="">All</option>
              {[...new Set(allDrivers.map(driver => driver.staffcode).filter(Boolean))].map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>

          <div className="view-filter-item">
            <label>Staff Name</label>
            <input
              type="text"
              placeholder="Search Name..."
              value={staffName}
              onChange={(e) => setStaffName(e.target.value)}
            />
          </div>

          <div className="view-filter-item">
            <label>Route Name</label>
            <select value={routeName} onChange={(e) => setRouteName(e.target.value)}>
              <option value="">All</option>
              {[...new Set(allDrivers.map(driver => driver.routename).filter(Boolean))].map((route) => (
                <option key={route} value={route}>
                  {route}
                </option>
              ))}
            </select>
          </div>

          <button className="view-search-button" onClick={handleSearch}>
            SEARCH
          </button>
        </div>

        <div style={{ textAlign: "right", margin: "10px 0" }}>
          <button
            className="report-button"
            onClick={() => exportToExcel(drivers, "Driver_Report")}
            style={{ marginRight: "10px" }}
          >
            Generate Excel Report
          </button>
        </div>

        {/* Permanent Drivers Table */}
        <h3 style={{ marginTop: '20px', color: '#333' }}>Permanent Drivers ({drivers.filter(d => !d.driver_type || d.driver_type === 'permanent').length})</h3>
        <div className="table-responsive" style={{ overflowX: 'auto' }}>
          <table className="view-driver-table">
            <thead>
              <tr>
                <th>Staff Code</th>
                <th>Staff Name</th>
                <th>Vehicle ID</th>
                <th>Route Name</th>
                <th>Door No</th>
                <th>Street Name</th>
                <th>City</th>
                <th>State</th>
                <th>Pincode</th>
                <th>Mobile No</th>
                <th>Photo</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {drivers.filter(d => !d.driver_type || d.driver_type === 'permanent').length > 0 ? (
                drivers.filter(d => !d.driver_type || d.driver_type === 'permanent').map((driver, index) => (
                  <tr key={index}>
                    <td>{driver.staffcode}</td>
                    <td><strong>{driver.staffname || driver.name || 'Driver'}</strong></td>
                    <td>{driver.vehicleid || 'N/A'}</td>
                    <td>{driver.routename || "Unassigned"}</td>
                    <td>{driver.doorno || ''}</td>
                    <td>{driver.streetname || ''}</td>
                    <td>{driver.city || ''}</td>
                    <td>{driver.state || ''}</td>
                    <td>{driver.pincode || ''}</td>
                    <td>{driver.mobileno || ''}</td>
                    <td>
                      {driver.imageUrl ? (
                        <img src={driver.imageUrl} alt="Driver" width="40" height="40" style={{ borderRadius: '50%' }} />
                      ) : (
                        "No Image"
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                        <button
                          className="edit-button"
                          onClick={() => handleEdit(driver)}
                          style={{
                            padding: "5px 10px",
                            backgroundColor: "#28a745",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "12px",
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="delete-button"
                          onClick={() => handleDelete(driver.staffcode)}
                          style={{
                            padding: "5px 10px",
                            backgroundColor: "#dc3545",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "12px",
                          }}
                        >
                          Delete
                        </button>
                        <button
                          className="pdf-button"
                          onClick={() => exportDriverToPDF(driver)}
                          style={{
                            padding: "5px 10px",
                            backgroundColor: "#007bff",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "12px"
                          }}
                        >
                          PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="12">No Permanent Drivers Found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Temporary Drivers Table */}
        <h3 style={{ marginTop: '30px', color: '#333' }}>Temporary Drivers ({drivers.filter(d => d.driver_type === 'temporary').length})</h3>
        <div className="table-responsive" style={{ overflowX: 'auto' }}>
          <table className="view-driver-table">
            <thead>
              <tr>
                <th>Staff Code</th>
                <th>Staff Name</th>
                <th>Address</th>
                <th>City</th>
                <th>Mobile No</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {drivers.filter(d => d.driver_type === 'temporary').length > 0 ? (
                drivers.filter(d => d.driver_type === 'temporary').map((driver, index) => (
                  <tr key={index}>
                    <td>{driver.staffcode}</td>
                    <td><strong>{driver.staffname || driver.name || 'Driver'}</strong></td>
                    <td>{driver.streetname || ''}</td>
                    <td>{driver.city || ''}</td>
                    <td>{driver.mobileno || ''}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                        <button
                          className="edit-button"
                          onClick={() => handleEdit(driver)}
                          style={{
                            padding: "5px 10px",
                            backgroundColor: "#28a745",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "12px",
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="delete-button"
                          onClick={() => handleDelete(driver.staffcode)}
                          style={{
                            padding: "5px 10px",
                            backgroundColor: "#dc3545",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "12px",
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6">No Temporary Drivers Found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Leave Requests */}
        <h2 style={{ marginTop: '30px' }}>Leave Requests</h2>
        <div className="view-filter-container" style={{ marginBottom: '20px' }}>
          <div className="view-filter-item">
            <label>Driver ID</label>
            <select value={leaveStaffCode} onChange={(e) => setLeaveStaffCode(e.target.value)}>
              <option value="">All</option>
              {[...new Set(leaveRequests.map(req => req.staffcode).filter(Boolean))].map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>

          <div className="view-filter-item">
            <label>Driver Name</label>
            <select value={leaveStaffName} onChange={(e) => setLeaveStaffName(e.target.value)}>
              <option value="">All</option>
              {[...new Set(leaveRequests.map(req => req.staffname).filter(Boolean))].map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <button
            className="report-button"
            onClick={() => exportLeaveRequestsToPDF(leaveRequests.filter(request =>
              (leaveStaffCode === "" || request.staffcode === leaveStaffCode) &&
              (leaveStaffName === "" || (request.staffname || "").toLowerCase().includes(leaveStaffName.toLowerCase()))
            ))}
            style={{ marginLeft: "10px" }}
          >
            Generate PDF Report
          </button>
        </div>

        <div className="leave-requests-list">
          {leaveRequests.length === 0 ? (
            <p className="no-requests">No leave requests found.</p>
          ) : (
            leaveRequests
              .filter(request =>
                (leaveStaffCode === "" || request.staffcode === leaveStaffCode) &&
                (leaveStaffName === "" || (request.staffname || "").toLowerCase().includes(leaveStaffName.toLowerCase()))
              )
              .map(request => {
                const reqStatus = String(request.status || 'pending');
                return (
                  <div key={request.id} className="leave-request-card">
                    <div className="request-header">
                      <h3>{request.staffname || request.staffcode || 'Driver'} ({request.staffcode})</h3>
                      <span className={`status status-${reqStatus}`}>
                        {reqStatus.charAt(0).toUpperCase() + reqStatus.slice(1)}
                      </span>
                    </div>

                    <div className="request-details">
                      <p><strong>Reason:</strong> {request.reason}</p>
                      <p><strong>Leave Date:</strong> {new Date(request.leave_date).toLocaleDateString()}</p>
                      <p><strong>Submitted:</strong> {new Date(request.submitted_at).toLocaleString()}</p>
                      <p><strong>Vehicle:</strong> {request.vehicleid || 'N/A'}</p>
                    </div>

                    {reqStatus === 'pending' && (
                      <div className="request-actions">
                        <button
                          className="approve-btn"
                          onClick={() => handleApprove(request.id, 'approved')}
                        >
                          Approve
                        </button>
                        <button
                          className="reject-btn"
                          onClick={() => handleApprove(request.id, 'rejected')}
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
          )}
        </div>

        {/* Driver Queries */}
        <h2 style={{ marginTop: '30px' }}>Driver Queries</h2>
        <div className="view-filter-container" style={{ marginBottom: '20px' }}>
          <div className="view-filter-item">
            <label>Driver ID</label>
            <select value={queryStaffCode} onChange={(e) => setQueryStaffCode(e.target.value)}>
              <option value="">All</option>
              {[...new Set(queries.map(q => q.staffcode).filter(Boolean))].map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>

          <div className="view-filter-item">
            <label>Driver Name</label>
            <select value={queryStaffName} onChange={(e) => setQueryStaffName(e.target.value)}>
              <option value="">All</option>
              {[...new Set(queries.map(q => q.staffname).filter(Boolean))].map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <button
            className="report-button"
            onClick={() => exportDriverQueriesToPDF(queries.filter(query =>
              (queryStaffCode === "" || query.staffcode === queryStaffCode) &&
              (queryStaffName === "" || (query.staffname || "").toLowerCase().includes(queryStaffName.toLowerCase()))
            ))}
            style={{ marginLeft: "10px" }}
          >
            Generate PDF Report
          </button>
        </div>

        <div className="leave-requests-list">
          {queries.length === 0 ? (
            <p className="no-requests">No driver queries found.</p>
          ) : (
            queries
              .filter(query =>
                (queryStaffCode === "" || query.staffcode === queryStaffCode) &&
                (queryStaffName === "" || (query.staffname || "").toLowerCase().includes(queryStaffName.toLowerCase()))
              )
              .map(query => {
                const qStatus = String(query.status || 'pending');
                return (
                  <div key={query.id} className="leave-request-card">
                    <div className="request-header">
                      <h3>{query.staffname || query.staffcode || 'Driver'} ({query.staffcode})</h3>
                      <span className={`status status-${qStatus}`}>
                        {qStatus.charAt(0).toUpperCase() + qStatus.slice(1)}
                      </span>
                    </div>

                    <div className="request-details">
                      <p><strong>Query:</strong> {query.query_text}</p>
                      <p><strong>Submitted:</strong> {new Date(query.submitted_at).toLocaleString()}</p>
                      <p><strong>Vehicle:</strong> {query.vehicleid || 'N/A'}</p>
                    </div>

                    {qStatus === 'pending' && (
                      <div className="request-actions">
                        <button
                          className="approve-btn"
                          onClick={() => handleResolveQuery(query.id, 'resolved')}
                        >
                          Resolve
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
          )}
        </div>
      </div>

      {isEditModalOpen && (
        <EditDriverModal
          driver={selectedDriver}
          onClose={() => setIsEditModalOpen(false)}
          onUpdateSuccess={handleUpdateSuccess}
        />
      )}

      {isAssignModalOpen && (
        <AssignTempDriverModal
          isOpen={isAssignModalOpen}
          onClose={() => {
            setIsAssignModalOpen(false);
            setSelectedLeaveRequest(null);
            setAvailableTempDrivers([]);
          }}
          onConfirm={handleAssignTempDriver}
          availableTempDrivers={availableTempDrivers}
          leaveRequestDetails={selectedLeaveRequest}
        />
      )}
    </div>
  );
};

export default ViewDriver;
