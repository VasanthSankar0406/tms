import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaWrench, FaCalendarAlt, FaCheckCircle, FaPlusCircle } from 'react-icons/fa';
import { API_URL } from '../config';
import '../styles/BusStudentLookup.css';

const toDateInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const MaintenanceManagement = () => {
  const [maintenanceRecords, setMaintenanceRecords] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(() => {
    const today = new Date();
    const nextDue = new Date(today);
    nextDue.setDate(nextDue.getDate() + 30);
    return {
      vehicleid: '',
      service_type: '',
      service_date: toDateInput(today),
      next_due_date: toDateInput(nextDue),
      cost: '',
      vendor: '',
      remarks: ''
    };
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchRecords();
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const res = await axios.get(`${API_URL}/getVehicle`);
      if (!Array.isArray(res.data)) return;
      setVehicles(res.data);
      setFormData((current) => ({
        ...current,
        vehicleid: current.vehicleid || String(res.data[0]?.vehicleid || '')
      }));
    } catch (err) {
      console.error('Error fetching fleet vehicles:', err);
    }
  };

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/maintenance`);
      if (res.data && res.data.maintenanceRecords) {
        setMaintenanceRecords(res.data.maintenanceRecords);
      }
    } catch (err) {
      console.error('Error fetching maintenance records:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMaintenance = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const res = await axios.post(`${API_URL}/api/maintenance`, formData);
      if (res.data && res.data.success) {
        setMessage('Maintenance schedule logged successfully!');
        setShowForm(false);
        fetchRecords();
      }
    } catch (err) {
      console.error('Error logging maintenance:', err);
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await axios.put(`${API_URL}/api/maintenance/${id}`, { status: newStatus });
      fetchRecords();
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  return (
    <div className="bus-lookup-page">
      <header className="bus-lookup-header">
        <div className="bus-lookup-header-copy">
          <p className="bus-lookup-kicker">Fleet Safety & Maintenance Control</p>
          <h1>Bus Maintenance & Service Management</h1>
          <p className="bus-lookup-sub">
            Track vehicle service schedules, maintenance history logs, vendor repair costs, and upcoming safety audits to prevent unexpected breakdowns.
          </p>
        </div>
        <button className="btn-search" style={{ marginTop: '16px' }} onClick={() => setShowForm(!showForm)}>
          <FaPlusCircle /> {showForm ? 'Close Form' : 'Log New Service Requirement'}
        </button>
      </header>

      {message && <div className="lookup-alert alert-success"><FaCheckCircle /> {message}</div>}

      {showForm && (
        <div className="bus-lookup-card" style={{ marginBottom: '24px' }}>
          <h3><FaWrench /> Schedule New Bus Service Entry</h3>
          <form onSubmit={handleCreateMaintenance} className="intimation-form" style={{ marginTop: '16px' }}>
            <div className="form-row">
              <div className="form-group">
                <label>Bus Number / ID:</label>
                <select value={formData.vehicleid} onChange={(e) => setFormData({ ...formData, vehicleid: e.target.value })} required>
                  <option value="">Select a registered bus</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.vehicleid} value={vehicle.vehicleid}>
                      {vehicle.vehicleid} ({vehicle.registrationno})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Service Type / Maintenance Title:</label>
                <input type="text" value={formData.service_type} onChange={(e) => setFormData({ ...formData, service_type: e.target.value })} required />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Service Date:</label>
                <input type="date" value={formData.service_date} onChange={(e) => setFormData({ ...formData, service_date: e.target.value })} required />
              </div>

              <div className="form-group">
                <label>Next Service Due Date:</label>
                <input type="date" value={formData.next_due_date} onChange={(e) => setFormData({ ...formData, next_due_date: e.target.value })} required />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Estimated Service Cost (₹):</label>
                <input type="number" value={formData.cost} onChange={(e) => setFormData({ ...formData, cost: e.target.value })} required />
              </div>

              <div className="form-group">
                <label>Vendor / Service Center Name:</label>
                <input type="text" value={formData.vendor} onChange={(e) => setFormData({ ...formData, vendor: e.target.value })} required />
              </div>
            </div>

            <div className="form-group">
              <label>Service Remarks & Safety Audit Notes:</label>
              <textarea rows="2" value={formData.remarks} onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}></textarea>
            </div>

            <button type="submit" className="btn-search" style={{ width: '100%', marginTop: '10px' }} disabled={!vehicles.length}>
              <FaWrench /> Save Maintenance Schedule
            </button>
          </form>
        </div>
      )}

      <div className="bus-lookup-card">
        <div className="card-header">
          <h2>Vehicle Maintenance Records & History</h2>
          <p>Real-time log of vehicle service history, maintenance progress, and costs.</p>
        </div>

        {loading ? (
          <div className="loading-state">Loading vehicle maintenance records...</div>
        ) : (
          <div className="table-responsive">
            <table className="roster-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Vehicle ID</th>
                  <th>Maintenance Description</th>
                  <th>Service Date</th>
                  <th>Next Due Date</th>
                  <th>Cost (₹)</th>
                  <th>Service Vendor</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {maintenanceRecords.length ? maintenanceRecords.map((m, idx) => (
                  <tr key={m.id || idx}>
                    <td>{idx + 1}</td>
                    <td><strong>Bus #{m.vehicleid}</strong></td>
                    <td>
                      <strong>{m.service_type}</strong>
                      <br /><small className="city-sub">{m.remarks}</small>
                    </td>
                    <td><FaCalendarAlt /> {m.service_date}</td>
                    <td><FaCalendarAlt /> {m.next_due_date}</td>
                    <td>₹{Number(m.cost).toLocaleString()}</td>
                    <td>{m.vendor}</td>
                    <td>
                      <span className={`role-pill ${(m.status || 'Scheduled').toLowerCase().replace(' ', '-')}`}>
                        {m.status || 'Scheduled'}
                      </span>
                    </td>
                    <td>
                      {m.status !== 'Completed' && (
                        <button
                          className="btn-search"
                          style={{ padding: '4px 10px', fontSize: '11px' }}
                          onClick={() => handleUpdateStatus(m.id, 'Completed')}
                        >
                          Mark Completed
                        </button>
                      )}
                    </td>
                  </tr>
                )) : <tr><td colSpan="9" className="loading-state">No maintenance records yet. Use “Log New Service Requirement” to add one.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MaintenanceManagement;
