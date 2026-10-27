import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  FaSearch,
  FaBus,
  FaUserGraduate,
  FaUserTie,
  FaMapMarkerAlt,
  FaClock,
  FaPhoneAlt,
  FaRoute,
  FaUsers,
  FaEnvelope,
  FaExchangeAlt,
  FaCheckCircle
} from 'react-icons/fa';
import { API_URL } from '../config';
import '../styles/BusStudentLookup.css';

const BusStudentLookup = () => {
  const [activeTab, setActiveTab] = useState('student-search');

  // Tab 1: Student Lookup State
  const [studentQuery, setStudentQuery] = useState('');
  const [studentResults, setStudentResults] = useState([]);
  const [searchingStudent, setSearchingStudent] = useState(false);
  const [studentError, setStudentError] = useState('');

  // Tab 2: Staff Lookup State
  const [staffQuery, setStaffQuery] = useState('');
  const [staffResults, setStaffResults] = useState([]);
  const [searchingStaff, setSearchingStaff] = useState(false);
  const [staffError, setStaffError] = useState('');

  // Tab 3: Bus Details Lookup State
  const [selectedBusId, setSelectedBusId] = useState('1');
  const [availableBuses, setAvailableBuses] = useState([]);
  const [busDetails, setBusDetails] = useState(null);
  const [loadingBusDetails, setLoadingBusDetails] = useState(false);

  // Tab 4: Stop-wise Passenger Lookup State
  const [availableStops, setAvailableStops] = useState([]);
  const [selectedStop, setSelectedStop] = useState('Kovilstreet');
  const [stopPassengers, setStopPassengers] = useState(null);
  const [loadingStopData, setLoadingStopData] = useState(false);

  useEffect(() => {
    fetchVehicles();
    fetchStopsList();
  }, []);

  const fetchVehicles = async () => {
    try {
      const res = await axios.get(`${API_URL}/getVehicle`);
      const list = Array.isArray(res.data) ? res.data : [];
      setAvailableBuses(list);
      if (list.length > 0 && !selectedBusId) {
        setSelectedBusId(list[0].vehicleid);
      }
    } catch (err) {
      console.error('Error loading vehicles:', err);
    }
  };

  const fetchStopsList = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/lookup/stop-passengers`);
      if (res.data && res.data.availableStops) {
        setAvailableStops(res.data.availableStops);
        if (res.data.availableStops.length > 0) {
          setSelectedStop(res.data.availableStops[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching stops list:', err);
    }
  };

  // Student Search Handler
  const handleStudentSearch = async (e) => {
    if (e) e.preventDefault();
    if (!studentQuery.trim()) {
      setStudentError('Please enter a student name or roll number');
      return;
    }

    setSearchingStudent(true);
    setStudentError('');

    try {
      const res = await axios.get(`${API_URL}/api/lookup/student-to-bus?query=${encodeURIComponent(studentQuery.trim())}`);
      if (res.data && res.data.results) {
        setStudentResults(res.data.results);
        if (res.data.results.length === 0) {
          setStudentError('No student matching this name or roll number found');
        }
      }
    } catch (err) {
      console.error('Student lookup error:', err);
      setStudentError('Failed to fetch student details. Please try again.');
    } finally {
      setSearchingStudent(false);
    }
  };

  // Staff Search Handler
  const handleStaffSearch = async (e) => {
    if (e) e.preventDefault();
    if (!staffQuery.trim()) {
      setStaffError('Please enter a staff name or ID');
      return;
    }

    setSearchingStaff(true);
    setStaffError('');

    try {
      const res = await axios.get(`${API_URL}/api/lookup/staff-to-bus?query=${encodeURIComponent(staffQuery.trim())}`);
      if (res.data && res.data.results) {
        setStaffResults(res.data.results);
        if (res.data.results.length === 0) {
          setStaffError('No staff member matching this query found');
        }
      }
    } catch (err) {
      console.error('Staff lookup error:', err);
      setStaffError('Failed to fetch staff details. Please try again.');
    } finally {
      setSearchingStaff(false);
    }
  };

  // Bus Details Fetcher
  const handleFetchBusDetails = async (busId) => {
    setSelectedBusId(busId);
    setLoadingBusDetails(true);
    try {
      const res = await axios.get(`${API_URL}/api/lookup/bus-to-students?vehicleid=${encodeURIComponent(busId)}`);
      if (res.data) {
        setBusDetails(res.data);
      }
    } catch (err) {
      console.error('Error fetching bus details:', err);
    } finally {
      setLoadingBusDetails(false);
    }
  };

  // Stop Passengers Fetcher
  const handleFetchStopPassengers = async (stopName) => {
    setSelectedStop(stopName);
    setLoadingStopData(true);
    try {
      const res = await axios.get(`${API_URL}/api/lookup/stop-passengers?stage_name=${encodeURIComponent(stopName)}`);
      if (res.data) {
        setStopPassengers(res.data);
      }
    } catch (err) {
      console.error('Error fetching stop passengers:', err);
    } finally {
      setLoadingStopData(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'bus-details' && selectedBusId) {
      handleFetchBusDetails(selectedBusId);
    }
    if (activeTab === 'stop-passengers' && selectedStop) {
      handleFetchStopPassengers(selectedStop);
    }
  }, [activeTab]);

  return (
    <div className="bus-lookup-page">
      <header className="bus-lookup-header">
        <div className="bus-lookup-header-copy">
          <p className="bus-lookup-kicker">National Engineering College Transport System</p>
          <h1>Smart Transport Intelligence & Passenger Portal</h1>
          <p className="bus-lookup-sub">
            Lookup student & staff transport details, inspect complete bus rosters, view route stops, and analyze stop-wise passenger distribution.
          </p>
        </div>
      </header>

      {/* Tabs Navigation Bar */}
      <div className="bus-lookup-tabs">
        <button
          type="button"
          className={`bus-tab-btn ${activeTab === 'student-search' ? 'active' : ''}`}
          onClick={() => setActiveTab('student-search')}
        >
          <FaUserGraduate />
          <span>1. Student Transport Lookup</span>
        </button>

        <button
          type="button"
          className={`bus-tab-btn ${activeTab === 'staff-search' ? 'active' : ''}`}
          onClick={() => setActiveTab('staff-search')}
        >
          <FaUserTie />
          <span>2. Staff Transport Lookup</span>
        </button>

        <button
          type="button"
          className={`bus-tab-btn ${activeTab === 'bus-details' ? 'active' : ''}`}
          onClick={() => setActiveTab('bus-details')}
        >
          <FaBus />
          <span>3. Bus Details & Roster</span>
        </button>

        <button
          type="button"
          className={`bus-tab-btn ${activeTab === 'stop-passengers' ? 'active' : ''}`}
          onClick={() => setActiveTab('stop-passengers')}
        >
          <FaMapMarkerAlt />
          <span>4. Stop-wise Passenger Lookup</span>
        </button>
      </div>

      {/* TAB 1: STUDENT TRANSPORT LOOKUP */}
      {activeTab === 'student-search' && (
        <div className="bus-lookup-card">
          <div className="card-header">
            <h2>Student Transport Assignment Lookup</h2>
            <p>Enter any student name or roll number (e.g. <code>Kani</code>, <code>2312043</code>) to view their assigned bus, route, boarding stop, drop-off stop, and driver contact.</p>
          </div>

          <form onSubmit={handleStudentSearch} className="search-bar-form">
            <div className="search-input-wrap">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Enter Student Name or Roll Number (e.g. Kani, 2312043, Ram)..."
                value={studentQuery}
                onChange={(e) => setStudentQuery(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-search">
              {searchingStudent ? 'Searching...' : 'Find Transport Details'}
            </button>
          </form>

          {studentError && <div className="lookup-alert alert-error">{studentError}</div>}

          <div className="student-results-grid">
            {studentResults.map((item) => (
              <div key={item.traveller_id || item.rollno} className="result-card">
                <div className="result-card-badge">
                  <FaBus />
                  <span>Bus #{item.vehicleid}</span>
                </div>

                <div className="result-header">
                  <h3>{item.student_name}</h3>
                  <span className="roll-pill">Roll No: {item.rollno}</span>
                </div>

                <div className="result-details">
                  <div className="detail-item">
                    <span className="label">Branch & Year:</span>
                    <span className="val">{item.branch || 'N/A'} - {item.year || 'N/A'}</span>
                  </div>

                  <div className="detail-item">
                    <span className="label">Assigned Vehicle:</span>
                    <span className="val highlight">{item.registrationno} ({item.vehicletype})</span>
                  </div>

                  <div className="detail-item">
                    <span className="label">Route & Destination:</span>
                    <span className="val"><FaRoute /> {item.routename} ➔ <strong>{item.destination_city}</strong></span>
                  </div>

                  <div className="detail-item">
                    <span className="label">Boarding Stop:</span>
                    <span className="val"><FaMapMarkerAlt /> {item.boarding_stop}</span>
                  </div>

                  <div className="detail-item">
                    <span className="label">Drop-off Stop:</span>
                    <span className="val"><FaMapMarkerAlt /> {item.dropoff_stop}</span>
                  </div>

                  <div className="detail-item">
                    <span className="label">Driver Name:</span>
                    <span className="val">{item.driver_name}</span>
                  </div>

                  <div className="detail-item">
                    <span className="label">Driver Contact:</span>
                    <span className="val phone-link">
                      <FaPhoneAlt /> {item.driver_phone}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: STAFF TRANSPORT LOOKUP */}
      {activeTab === 'staff-search' && (
        <div className="bus-lookup-card">
          <div className="card-header">
            <h2>Staff Transport Assignment Lookup</h2>
            <p>Enter any staff name or Staff ID (e.g. <code>Dr. Arunkumar</code>, <code>STAFF01</code>) to view their transport details in a single view.</p>
          </div>

          <form onSubmit={handleStaffSearch} className="search-bar-form">
            <div className="search-input-wrap">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Enter Staff Name or Staff ID (e.g. Dr. Arunkumar, STAFF01, Subhashini)..."
                value={staffQuery}
                onChange={(e) => setStaffQuery(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-search">
              {searchingStaff ? 'Searching...' : 'Find Staff Details'}
            </button>
          </form>

          {staffError && <div className="lookup-alert alert-error">{staffError}</div>}

          <div className="student-results-grid">
            {staffResults.map((item) => (
              <div key={item.traveller_id || item.rollno} className="result-card staff-card">
                <div className="result-card-badge staff-badge">
                  <FaUserTie />
                  <span>Faculty / Staff</span>
                </div>

                <div className="result-header">
                  <h3>{item.staff_name}</h3>
                  <span className="roll-pill">ID: {item.rollno}</span>
                </div>

                <div className="result-details">
                  <div className="detail-item">
                    <span className="label">Department & Type:</span>
                    <span className="val">{item.branch} ({item.stafftype})</span>
                  </div>

                  <div className="detail-item">
                    <span className="label">Assigned Bus:</span>
                    <span className="val highlight">Bus #{item.vehicleid} — {item.registrationno}</span>
                  </div>

                  <div className="detail-item">
                    <span className="label">Route & City:</span>
                    <span className="val"><FaRoute /> {item.routename} ({item.destination_city})</span>
                  </div>

                  <div className="detail-item">
                    <span className="label">Boarding Stop:</span>
                    <span className="val"><FaMapMarkerAlt /> {item.boarding_stop}</span>
                  </div>

                  <div className="detail-item">
                    <span className="label">Drop-off Stop:</span>
                    <span className="val"><FaMapMarkerAlt /> {item.dropoff_stop}</span>
                  </div>

                  <div className="detail-item">
                    <span className="label">Assigned Driver:</span>
                    <span className="val">{item.driver_name} ({item.driver_phone})</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: BUS DETAILS & ROSTER */}
      {activeTab === 'bus-details' && (
        <div className="bus-lookup-card">
          <div className="card-header">
            <h2>Complete Bus Details, Driver & Passenger Roster</h2>
            <p>Select any Bus Number to view its assigned route, driver contact, seating capacity, list of students, and list of faculty members.</p>
          </div>

          <div className="bus-selector-bar">
            <label>Select Bus Number:</label>
            <select
              value={selectedBusId}
              onChange={(e) => handleFetchBusDetails(e.target.value)}
            >
              {availableBuses.map((b) => (
                <option key={b.vehicleid} value={b.vehicleid}>
                  Bus #{b.vehicleid} — {b.registrationno} ({b.vehicletype})
                </option>
              ))}
            </select>
          </div>

          {loadingBusDetails ? (
            <div className="loading-state">Loading complete details for Bus #{selectedBusId}...</div>
          ) : busDetails && (
            <div className="roster-view">
              <div className="bus-summary-box">
                <div>
                  <h3>Bus #{busDetails.busInfo?.vehicleid || selectedBusId} Complete Profile</h3>
                  <p>Reg No: <strong>{busDetails.busInfo?.registrationno}</strong> | Type: <strong>{busDetails.busInfo?.vehicletype}</strong> | Route: <strong>{busDetails.busInfo?.routename}</strong> | Driver: <strong>{busDetails.busInfo?.driver_name} ({busDetails.busInfo?.driver_phone})</strong></p>
                </div>
                <div className="roster-count-badge">
                  <span>Capacity Utilization</span>
                  <strong>{busDetails.totalPassengers} / {busDetails.busInfo?.seatcapacity || 40} Passengers</strong>
                </div>
              </div>

              {/* Roster Table */}
              <div className="table-responsive">
                <table className="roster-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Passenger Name</th>
                      <th>ID / Roll No</th>
                      <th>Role</th>
                      <th>Dept / Branch</th>
                      <th>Boarding Stop</th>
                      <th>Contact Number</th>
                    </tr>
                  </thead>
                  <tbody>
                    {busDetails.passengers.map((p, idx) => (
                      <tr key={p.traveller_id || idx}>
                        <td>{idx + 1}</td>
                        <td><strong>{p.student_name}</strong></td>
                        <td><code>{p.rollno}</code></td>
                        <td>
                          <span className={`role-pill ${p.role.toLowerCase()}`}>
                            {p.role}
                          </span>
                        </td>
                        <td>{p.branch} {p.year ? `(${p.year})` : ''}</td>
                        <td><FaMapMarkerAlt /> {p.stage_name}</td>
                        <td><FaPhoneAlt /> {p.phoneno}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: STOP-WISE PASSENGER LOOKUP */}
      {activeTab === 'stop-passengers' && (
        <div className="bus-lookup-card">
          <div className="card-header">
            <h2>Stop-wise Passenger Distribution Lookup</h2>
            <p>Select any boarding stop location to view all students and staff members assigned to board from that specific stop.</p>
          </div>

          <div className="bus-selector-bar">
            <label>Select Boarding Stop:</label>
            <select
              value={selectedStop}
              onChange={(e) => handleFetchStopPassengers(e.target.value)}
            >
              {availableStops.map((stop, idx) => (
                <option key={idx} value={stop}>
                  {stop}
                </option>
              ))}
            </select>
          </div>

          {loadingStopData ? (
            <div className="loading-state">Loading passengers boarding at {selectedStop}...</div>
          ) : stopPassengers && (
            <div>
              <div className="bus-summary-box">
                <div>
                  <h3>Boarding Location: {stopPassengers.stopName}</h3>
                  <p>Helps transport administrators analyze passenger load and bus stop distribution.</p>
                </div>
                <div className="roster-count-badge">
                  <span>Total Passengers Boarding</span>
                  <strong>{stopPassengers.totalBoardingPassengers} Passengers</strong>
                </div>
              </div>

              <div className="table-responsive">
                <table className="roster-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Passenger Name</th>
                      <th>Roll No / ID</th>
                      <th>Role</th>
                      <th>Branch</th>
                      <th>Assigned Bus</th>
                      <th>Route</th>
                      <th>Contact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stopPassengers.passengers.map((p, idx) => (
                      <tr key={p.id || idx}>
                        <td>{idx + 1}</td>
                        <td><strong>{p.name}</strong></td>
                        <td><code>{p.rollno}</code></td>
                        <td><span className={`role-pill ${p.role.toLowerCase()}`}>{p.role}</span></td>
                        <td>{p.branch}</td>
                        <td><strong className="highlight">Bus #{p.bus_id} ({p.bus_reg})</strong></td>
                        <td>{p.route_name}</td>
                        <td><FaPhoneAlt /> {p.phone}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BusStudentLookup;
