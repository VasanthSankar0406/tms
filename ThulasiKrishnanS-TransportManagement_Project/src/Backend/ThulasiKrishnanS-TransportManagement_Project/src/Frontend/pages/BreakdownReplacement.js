import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaExclamationTriangle, FaExchangeAlt, FaEnvelope, FaPaperPlane, FaCheckCircle, FaBus, FaBullhorn } from 'react-icons/fa';
import { API_URL } from '../config';
import '../styles/BusStudentLookup.css';

const BreakdownReplacement = () => {
  const [buses, setBuses] = useState([]);
  const [selectedBus, setSelectedBus] = useState('2');
  const [breakdownReason, setBreakdownReason] = useState('Engine Overheating Inspection');
  const [loading, setLoading] = useState(false);
  const [replacementResult, setReplacementResult] = useState(null);
  const [notificationLogs, setNotificationLogs] = useState([]);

  useEffect(() => {
    fetchBuses();
    fetchNotifications();
  }, []);

  const fetchBuses = async () => {
    try {
      const res = await axios.get(`${API_URL}/getVehicle`);
      if (Array.isArray(res.data)) {
        setBuses(res.data);
      }
    } catch (err) {
      console.error('Error fetching buses:', err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/notifications/bus-change`);
      if (res.data && res.data.notifications) {
        setNotificationLogs(res.data.notifications);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  const handleTriggerBreakdown = async (e) => {
    e.preventDefault();
    setLoading(true);
    setReplacementResult(null);

    try {
      const res = await axios.post(`${API_URL}/api/breakdown-replacement`, {
        broken_vehicleid: selectedBus,
        reason: breakdownReason
      });

      if (res.data && res.data.success) {
        setReplacementResult(res.data);
        fetchNotifications();
      }
    } catch (err) {
      console.error('Breakdown assignment error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bus-lookup-page">
      <header className="bus-lookup-header" style={{ background: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 50%, #b91c1c 100%)' }}>
        <div className="bus-lookup-header-copy">
          <p className="bus-lookup-kicker" style={{ color: '#fca5a5' }}>Emergency Fleet Dispatch & Passenger Protection</p>
          <h1>Bus Breakdown – Automatic Replacement Engine</h1>
          <p className="bus-lookup-sub" style={{ color: '#fecaca' }}>
            Automatically identify matching standby spare buses upon breakdown and instantly dispatch multi-channel Email & SMS notification alerts to all affected passengers.
          </p>
        </div>
      </header>

      {replacementResult && (
        <div className="lookup-alert alert-success" style={{ padding: '20px', display: 'block', marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FaCheckCircle /> Automatic Replacement Assigned Successfully!
          </h3>
          <p style={{ margin: '0 0 10px 0' }}>{replacementResult.message}</p>
          <div style={{ background: '#ffffff', padding: '14px', borderRadius: '8px', border: '1px solid #86efac' }}>
            <p style={{ margin: '0 0 6px 0', fontSize: '13px' }}>
              <strong>Assigned Replacement Bus:</strong> #{replacementResult.replacementBus?.vehicleid} ({replacementResult.replacementBus?.registrationno})
            </p>
            <p style={{ margin: '0 0 6px 0', fontSize: '13px' }}>
              <strong>Notifications Dispatched:</strong> Dispatched Email & SMS alerts to <strong>{replacementResult.affectedPassengersCount} passengers</strong> on the route.
            </p>
          </div>
        </div>
      )}

      <div className="intimation-layout">
        {/* Breakdown Form */}
        <form onSubmit={handleTriggerBreakdown} className="intimation-form">
          <h3><FaExclamationTriangle style={{ color: '#dc2626' }} /> Report Vehicle Breakdown</h3>
          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '18px' }}>
            Select the broken-down bus to activate the automated spare bus allocation algorithm.
          </p>

          <div className="form-group">
            <label>Select Affected Bus:</label>
            <select
              value={selectedBus}
              onChange={(e) => setSelectedBus(e.target.value)}
              required
            >
              {buses.map((b) => (
                <option key={b.vehicleid} value={b.vehicleid}>
                  Bus #{b.vehicleid} — {b.registrationno} (Route: {b.routeid || 'Unassigned'})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Breakdown Reason / Fault Description:</label>
            <input
              type="text"
              value={breakdownReason}
              onChange={(e) => setBreakdownReason(e.target.value)}
              placeholder="e.g. Engine overheating, tire puncture, brake hydraulic fault"
              required
            />
          </div>

          <button type="submit" className="btn-broadcast" disabled={loading}>
            {loading ? 'Running Auto-Replacement Engine...' : '⚡ Trigger Auto Replacement & Dispatch Email/SMS Alerts'}
          </button>
        </form>

        {/* Notifications Stream */}
        <div className="notif-list-section">
          <h3><FaEnvelope /> Active Email & SMS Dispatch Logs</h3>
          {notificationLogs.length === 0 ? (
            <p className="empty-msg">No breakdown intimation dispatches logged today.</p>
          ) : (
            notificationLogs.map((n) => (
              <div key={n.id} className="notif-banner">
                <div className="notif-head">
                  <span className="alert-badge"><FaBullhorn /> BUS CHANGE NOTIFICATION</span>
                  <span className="notif-date">{n.effective_date}</span>
                </div>
                <p className="notif-msg">{n.message}</p>
                <div className="notif-meta">
                  <span>Route: <strong>{n.routeid}</strong></span>
                  <span>Old Bus: <strong>{n.old_vehicleid}</strong></span>
                  <span>New Substituted Bus: <strong className="highlight-bus">{n.new_vehicleid}</strong></span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default BreakdownReplacement;
