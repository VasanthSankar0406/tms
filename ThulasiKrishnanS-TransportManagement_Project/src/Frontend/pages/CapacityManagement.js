import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaBus, FaUsers, FaExclamationTriangle, FaCheckCircle, FaChartBar, FaRoute } from 'react-icons/fa';
import { API_URL } from '../config';
import '../styles/BusStudentLookup.css';

const CapacityManagement = () => {
  const [capacities, setCapacities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCapacities();
  }, []);

  const fetchCapacities = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/capacity-management`);
      if (res.data && res.data.capacities) {
        setCapacities(res.data.capacities);
      }
    } catch (err) {
      console.error('Error fetching capacity data:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bus-lookup-page">
      <header className="bus-lookup-header">
        <div className="bus-lookup-header-copy">
          <p className="bus-lookup-kicker">Passenger Load & Fleet Capacity Analytics</p>
          <h1>Bus Capacity & Route Utilization Portal</h1>
          <p className="bus-lookup-sub">
            Monitor bus seating capacities, passenger load distribution, occupancy percentages, and prevent vehicle over-allocation across transport routes.
          </p>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="student-results-grid" style={{ marginBottom: '24px' }}>
        <div className="result-card">
          <div className="result-header">
            <h3>Total Fleet Buses</h3>
          </div>
          <p style={{ fontSize: '28px', fontWeight: '800', color: '#2563eb', margin: '8px 0' }}>
            {capacities.length} Active Vehicles
          </p>
          <p className="city-sub">Monitored for seating capacity</p>
        </div>

        <div className="result-card">
          <div className="result-header">
            <h3>Total Transport Passengers</h3>
          </div>
          <p style={{ fontSize: '28px', fontWeight: '800', color: '#059669', margin: '8px 0' }}>
            {capacities.reduce((acc, c) => acc + c.assignedPassengers, 0)} Students & Staff
          </p>
          <p className="city-sub">Assigned across active bus routes</p>
        </div>

        <div className="result-card">
          <div className="result-header">
            <h3>Over-Allocation Alert</h3>
          </div>
          <p style={{ fontSize: '28px', fontWeight: '800', color: capacities.some(c => c.overAllocated) ? '#dc2626' : '#059669', margin: '8px 0' }}>
            {capacities.filter(c => c.overAllocated).length} Vehicles Warning
          </p>
          <p className="city-sub">Buses exceeding total seating capacity</p>
        </div>
      </div>

      <div className="bus-lookup-card">
        <div className="card-header">
          <h2>Vehicle Capacity & Route Passenger Load</h2>
          <p>Visual breakdown of passenger occupancy vs total seating capacity for each bus.</p>
        </div>

        {loading ? (
          <div className="loading-state">Loading capacity analytics...</div>
        ) : (
          <div className="table-responsive">
            <table className="roster-table">
              <thead>
                <tr>
                  <th>Vehicle ID</th>
                  <th>Registration No</th>
                  <th>Route ID & City</th>
                  <th>Seating Capacity</th>
                  <th>Assigned Passengers</th>
                  <th>Occupancy Rate</th>
                  <th>Available Seats</th>
                  <th>Status & Warning</th>
                </tr>
              </thead>
              <tbody>
                {capacities.map((c) => (
                  <tr key={c.vehicleid}>
                    <td><strong>Bus #{c.vehicleid}</strong></td>
                    <td><code>{c.registrationno}</code> ({c.vehicletype})</td>
                    <td><FaRoute /> <strong>{c.routeid}</strong> — {c.routename} ({c.city})</td>
                    <td>{c.seatcapacity} Seats</td>
                    <td><strong>{c.assignedPassengers} Passengers</strong></td>
                    <td style={{ width: '180px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, height: '10px', background: '#e2e8f0', borderRadius: '5px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${Math.min(100, c.occupancyRate)}%`,
                              height: '100%',
                              background: c.occupancyRate > 100 ? '#dc2626' : c.occupancyRate > 85 ? '#d97706' : '#059669'
                            }}
                          ></div>
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: '700' }}>{c.occupancyRate}%</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ color: c.availableSeats === 0 ? '#dc2626' : '#059669', fontWeight: '700' }}>
                        {c.availableSeats} Available
                      </span>
                    </td>
                    <td>
                      {c.overAllocated ? (
                        <span className="lookup-alert alert-error" style={{ padding: '4px 8px', fontSize: '11px', margin: 0 }}>
                          <FaExclamationTriangle /> Over-allocated!
                        </span>
                      ) : (
                        <span className="lookup-alert alert-success" style={{ padding: '4px 8px', fontSize: '11px', margin: 0 }}>
                          <FaCheckCircle /> Capacity Normal
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CapacityManagement;
