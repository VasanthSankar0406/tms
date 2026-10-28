import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaBus, FaRoute, FaUserTie, FaUsers, FaWrench, FaBell, FaShower } from 'react-icons/fa';
import { API_URL } from '../config';
import '../styles/BusStudentLookup.css';

const CentralizedDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [todayWashes, setTodayWashes] = useState([]);

  useEffect(() => {
    fetchDashboardStats();
    fetchTodayWashing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTodayWashing = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/bus-washing/today`);
      if (res.data && res.data.success) {
        setTodayWashes(res.data.buses || []);
      }
    } catch (e) {
      console.error('Error loading today washing in centralized dashboard:', e);
    }
  };

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/centralized-dashboard-stats`);
      if (res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Error loading centralized stats:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bus-lookup-page">
      <header className="bus-lookup-header" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #311b92 100%)' }}>
        <div className="bus-lookup-header-copy">
          <p className="bus-lookup-kicker" style={{ color: '#a5b4fc' }}>Executive Operations Control Center</p>
          <h1>Centralized Transport Command Dashboard</h1>
          <p className="bus-lookup-sub" style={{ color: '#c7d2fe' }}>
            Consolidated operational view of campus bus fleet, routes, drivers, passenger load, vehicle maintenance alerts, emergency notifications, and complaint resolutions.
          </p>
        </div>
      </header>

      {loading ? (
        <div className="loading-state">Loading executive command metrics...</div>
      ) : data && (
        <div>
          {/* Key Metrics Cards Grid */}
          <div className="student-results-grid" style={{ marginBottom: '24px' }}>
            <div className="result-card" style={{ borderLeft: '4px solid #2563eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p className="city-sub" style={{ textTransform: 'uppercase', fontWeight: '700', fontSize: '11px' }}>Fleet Vehicles</p>
                  <h2 style={{ fontSize: '32px', margin: '4px 0', color: '#0f172a' }}>{data.stats.totalBuses}</h2>
                  <span className="roll-pill">Active Fleet</span>
                </div>
                <FaBus style={{ fontSize: '36px', color: '#2563eb', opacity: 0.8 }} />
              </div>
            </div>

            <div className="result-card" style={{ borderLeft: '4px solid #059669' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p className="city-sub" style={{ textTransform: 'uppercase', fontWeight: '700', fontSize: '11px' }}>Active Bus Routes</p>
                  <h2 style={{ fontSize: '32px', margin: '4px 0', color: '#0f172a' }}>{data.stats.activeRoutes}</h2>
                  <span className="roll-pill" style={{ background: '#d1fae5', color: '#047857' }}>{data.stats.totalStages} Bus Stops</span>
                </div>
                <FaRoute style={{ fontSize: '36px', color: '#059669', opacity: 0.8 }} />
              </div>
            </div>

            <div className="result-card" style={{ borderLeft: '4px solid #7c3aed' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p className="city-sub" style={{ textTransform: 'uppercase', fontWeight: '700', fontSize: '11px' }}>Allocated Drivers</p>
                  <h2 style={{ fontSize: '32px', margin: '4px 0', color: '#0f172a' }}>{data.stats.totalDrivers}</h2>
                  <span className="roll-pill">Licensed Staff</span>
                </div>
                <FaUserTie style={{ fontSize: '36px', color: '#7c3aed', opacity: 0.8 }} />
              </div>
            </div>

            <div className="result-card" style={{ borderLeft: '4px solid #0284c7' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p className="city-sub" style={{ textTransform: 'uppercase', fontWeight: '700', fontSize: '11px' }}>Total Passengers</p>
                  <h2 style={{ fontSize: '32px', margin: '4px 0', color: '#0f172a' }}>{data.stats.totalPassengers}</h2>
                  <span className="roll-pill">Students & Faculty</span>
                </div>
                <FaUsers style={{ fontSize: '36px', color: '#0284c7', opacity: 0.8 }} />
              </div>
            </div>
          </div>

          {/* Operational Status Widgets */}
          <div className="intimation-layout" style={{ marginBottom: '24px' }}>
            <div className="bus-lookup-card">
              <h3><FaWrench /> Service & Maintenance Alerts ({data.stats.activeMaintenances})</h3>
              <p className="city-sub" style={{ marginBottom: '16px' }}>Upcoming vehicle services and active maintenance jobs.</p>
              
              {data.recentMaintenances.map((m) => (
                <div key={m.id} style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong>Bus #{m.vehicleid} — {m.service_type}</strong>
                    <span className={`role-pill ${m.status.toLowerCase().replace(' ', '-')}`}>{m.status}</span>
                  </div>
                  <p className="city-sub" style={{ margin: '4px 0 0 0' }}>Due Date: {m.next_due_date} | Vendor: {m.vendor}</p>
                </div>
              ))}
            </div>

            <div className="bus-lookup-card">
              <h3><FaShower /> Buses Scheduled for Washing Today ({todayWashes.length})</h3>
              <p className="city-sub" style={{ marginBottom: '16px' }}>Basic bus wash operations scheduled for today across bays.</p>

              {todayWashes.slice(0, 5).map((w) => (
                <div key={w.id} style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>Bus #{w.vehicleid} ({w.registrationno})</strong>
                    <span className={`role-pill ${w.status === 'Completed' ? 'resolved' : w.status === 'In Progress' ? 'in-progress' : 'pending'}`}>
                      {w.status}
                    </span>
                  </div>
                  <p className="city-sub" style={{ margin: '4px 0 0 0' }}>
                    Slot: {w.scheduled_time} | Bay: {w.service_bay} | Next Wash: {w.next_scheduled_date || 'N/A'}
                  </p>
                </div>
              ))}
              {todayWashes.length === 0 && (
                <p className="city-sub" style={{ textAlign: 'center', padding: '12px' }}>No buses scheduled for washing today.</p>
              )}
            </div>
          </div>

          {/* Recent Broadcast Dispatches */}
          <div className="bus-lookup-card">
            <h3><FaBell /> Recent Multi-Channel Dispatches (Email & SMS)</h3>
            <div className="table-responsive" style={{ marginTop: '14px' }}>
              <table className="roster-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Route</th>
                    <th>Substituted Vehicle</th>
                    <th>Message Sent</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentNotifications.map((n) => (
                    <tr key={n.id}>
                      <td>{n.effective_date}</td>
                      <td><strong>Route {n.routeid}</strong></td>
                      <td><strong className="highlight">{n.new_vehicleid}</strong></td>
                      <td>{n.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CentralizedDashboard;
