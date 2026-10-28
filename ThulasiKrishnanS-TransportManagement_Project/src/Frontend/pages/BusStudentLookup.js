import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Search,
  Bus,
  GraduationCap,
  Briefcase,
  MapPin,
  Route as RouteIcon,
  Users,
  Phone,
  AlertCircle,
  Loader2,
  X
} from "lucide-react";
import { API_URL } from "../config";
import "../styles/BusStudentLookup.css";

const BusStudentLookup = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("student-search");

  // Tab 1: Student Lookup State
  const [studentQuery, setStudentQuery] = useState("");
  const [studentResults, setStudentResults] = useState([]);
  const [searchingStudent, setSearchingStudent] = useState(false);
  const [studentError, setStudentError] = useState("");
  const [hasSearchedStudent, setHasSearchedStudent] = useState(false);

  // Tab 2: Staff Lookup State
  const [staffQuery, setStaffQuery] = useState("");
  const [staffResults, setStaffResults] = useState([]);
  const [searchingStaff, setSearchingStaff] = useState(false);
  const [staffError, setStaffError] = useState("");
  const [hasSearchedStaff, setHasSearchedStaff] = useState(false);

  // Tab 3: Bus Details Lookup State
  const [selectedBusId, setSelectedBusId] = useState("");
  const [availableBuses, setAvailableBuses] = useState([]);
  const [busDetails, setBusDetails] = useState(null);
  const [loadingBusDetails, setLoadingBusDetails] = useState(false);

  // Tab 4: Stop-wise Passenger Lookup State
  const [availableStops, setAvailableStops] = useState([]);
  const [selectedStop, setSelectedStop] = useState("");
  const [stopPassengers, setStopPassengers] = useState(null);
  const [loadingStopData, setLoadingStopData] = useState(false);

  useEffect(() => {
    fetchVehicles();
    fetchStopsList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      console.error("Error loading vehicles:", err);
    }
  };

  const fetchStopsList = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/lookup/stop-passengers`);
      if (res.data && res.data.availableStops) {
        const stops = res.data.availableStops;
        setAvailableStops(stops);
        if (stops.length > 0 && !selectedStop) {
          setSelectedStop(stops[0]);
        }
      }
    } catch (err) {
      console.error("Error fetching stops list:", err);
    }
  };

  // Student Search Handler
  const handleStudentSearch = async (e) => {
    if (e) e.preventDefault();
    if (!studentQuery.trim()) {
      setStudentError("Please enter a student name or roll number");
      return;
    }

    setSearchingStudent(true);
    setStudentError("");
    setHasSearchedStudent(true);

    try {
      const res = await axios.get(
        `${API_URL}/api/lookup/student-to-bus?query=${encodeURIComponent(studentQuery.trim())}`
      );
      if (res.data && res.data.results) {
        setStudentResults(res.data.results);
        if (res.data.results.length === 0) {
          setStudentError("No student matching this name or roll number found");
        }
      }
    } catch (err) {
      console.error("Student lookup error:", err);
      setStudentError("Failed to fetch student details. Please try again.");
    } finally {
      setSearchingStudent(false);
    }
  };

  // Staff Search Handler
  const handleStaffSearch = async (e) => {
    if (e) e.preventDefault();
    if (!staffQuery.trim()) {
      setStaffError("Please enter a staff name or ID");
      return;
    }

    setSearchingStaff(true);
    setStaffError("");
    setHasSearchedStaff(true);

    try {
      const res = await axios.get(
        `${API_URL}/api/lookup/staff-to-bus?query=${encodeURIComponent(staffQuery.trim())}`
      );
      if (res.data && res.data.results) {
        setStaffResults(res.data.results);
        if (res.data.results.length === 0) {
          setStaffError("No staff member matching this query found");
        }
      }
    } catch (err) {
      console.error("Staff lookup error:", err);
      setStaffError("Failed to fetch staff details. Please try again.");
    } finally {
      setSearchingStaff(false);
    }
  };

  // Bus Details Fetcher
  const handleFetchBusDetails = async (busId) => {
    if (!busId) return;
    setSelectedBusId(busId);
    setLoadingBusDetails(true);
    try {
      const res = await axios.get(
        `${API_URL}/api/lookup/bus-to-students?vehicleid=${encodeURIComponent(busId)}`
      );
      if (res.data) {
        setBusDetails(res.data);
      }
    } catch (err) {
      console.error("Error fetching bus details:", err);
    } finally {
      setLoadingBusDetails(false);
    }
  };

  // Stop Passengers Fetcher
  const handleFetchStopPassengers = async (stopName) => {
    if (!stopName) return;
    setSelectedStop(stopName);
    setLoadingStopData(true);
    try {
      const res = await axios.get(
        `${API_URL}/api/lookup/stop-passengers?stage_name=${encodeURIComponent(stopName)}`
      );
      if (res.data) {
        setStopPassengers(res.data);
      }
    } catch (err) {
      console.error("Error fetching stop passengers:", err);
    } finally {
      setLoadingStopData(false);
    }
  };

  useEffect(() => {
    if (activeTab === "bus-details" && selectedBusId) {
      handleFetchBusDetails(selectedBusId);
    }
    if (activeTab === "stop-passengers" && selectedStop) {
      handleFetchStopPassengers(selectedStop);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  return (
    <div className="bus-lookup-master-container">
      <div className="bus-lookup-box-wrapper">
        {/* ====================================================================
            1. BREADCRUMBS & COMPACT PAGE HEADER
            ==================================================================== */}
        <nav className="vm-breadcrumb-nav" aria-label="Breadcrumb">
          <span className="link" onClick={() => navigate("/home")}>
            Dashboard
          </span>
          <span className="sep">/</span>
          <span className="link" onClick={() => navigate("/home/viewtraveller")}>
            Traveller & Passenger
          </span>
          <span className="sep">/</span>
          <span className="current">Student & Staff Lookup</span>
        </nav>

        <header className="vm-page-header">
          <div className="vm-header-left">
            <div className="vm-title-row">
              <h1 className="vm-page-title">Student & Staff Lookup</h1>
            </div>
            <p className="vm-page-subtitle">
              Find transport assignments, bus rosters, and boarding information
            </p>
          </div>
        </header>

        {/* ====================================================================
            2. CATEGORY SEGMENTED CONTROL TABS
            Exact same segmented-control appearance as Traveller Management
            ==================================================================== */}
        <div className="traveller-category-segmented-control" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "student-search"}
            className={`category-segment-tab ${activeTab === "student-search" ? "active" : ""}`}
            onClick={() => setActiveTab("student-search")}
          >
            <GraduationCap size={15} style={{ marginRight: "6px" }} />
            <span>Student Transport Lookup</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "staff-search"}
            className={`category-segment-tab ${activeTab === "staff-search" ? "active" : ""}`}
            onClick={() => setActiveTab("staff-search")}
          >
            <Briefcase size={15} style={{ marginRight: "6px" }} />
            <span>Staff Transport Lookup</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "bus-details"}
            className={`category-segment-tab ${activeTab === "bus-details" ? "active" : ""}`}
            onClick={() => setActiveTab("bus-details")}
          >
            <Bus size={15} style={{ marginRight: "6px" }} />
            <span>Bus Details & Roster</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "stop-passengers"}
            className={`category-segment-tab ${activeTab === "stop-passengers" ? "active" : ""}`}
            onClick={() => setActiveTab("stop-passengers")}
          >
            <MapPin size={15} style={{ marginRight: "6px" }} />
            <span>Stop-wise Passenger Lookup</span>
          </button>
        </div>

        {/* ====================================================================
            TAB 1: STUDENT TRANSPORT LOOKUP
            ==================================================================== */}
        {activeTab === "student-search" && (
          <div className="lookup-tab-content">
            <div className="lookup-search-card">
              <div className="lookup-card-meta">
                <h2 className="lookup-card-title">Student Transport Assignment Lookup</h2>
                <p className="lookup-card-desc">
                  Search by student name or roll number (e.g. <code>Kani</code>, <code>2312043</code>) to view assigned bus, route, boarding stage, and driver details.
                </p>
              </div>

              <form onSubmit={handleStudentSearch} className="lookup-search-form">
                <div className="lookup-input-wrapper">
                  <Search size={16} className="lookup-search-icon" />
                  <input
                    type="text"
                    className="lookup-search-input"
                    placeholder="Search by student name or roll number..."
                    value={studentQuery}
                    onChange={(e) => setStudentQuery(e.target.value)}
                  />
                  {studentQuery && (
                    <button
                      type="button"
                      className="lookup-clear-btn"
                      onClick={() => {
                        setStudentQuery("");
                        setStudentResults([]);
                        setStudentError("");
                        setHasSearchedStudent(false);
                      }}
                      aria-label="Clear search input"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  className="vm-btn-primary lookup-submit-btn"
                  disabled={searchingStudent}
                >
                  {searchingStudent ? (
                    <>
                      <Loader2 size={15} className="spin-icon" />
                      <span>Searching...</span>
                    </>
                  ) : (
                    <>
                      <Search size={15} />
                      <span>Find Transport Details</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {studentError && (
              <div className="lookup-alert alert-error">
                <AlertCircle size={16} />
                <span>{studentError}</span>
              </div>
            )}

            {searchingStudent ? (
              <div className="lookup-loading-box">
                <Loader2 size={26} className="spin-icon inline-icon" />
                <span>Searching student transport database...</span>
              </div>
            ) : studentResults.length > 0 ? (
              <div className="lookup-results-section">
                <div className="lookup-results-header">
                  <span className="results-count-text">
                    Showing <strong>{studentResults.length}</strong> matching transport assignment{studentResults.length > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="lookup-cards-grid">
                  {studentResults.map((item) => (
                    <div key={item.traveller_id || item.rollno} className="lookup-result-card">
                      <div className="result-card-topbar">
                        <div className="result-entity-info">
                          <h3 className="result-entity-name">{item.student_name || item.name}</h3>
                          <span className="traveller-rollno-badge">{item.rollno}</span>
                        </div>
                        <span className="result-bus-pill">
                          <Bus size={13} />
                          <span>Bus #{item.vehicleid}</span>
                        </span>
                      </div>

                      <div className="result-card-grid">
                        <div className="result-field-cell">
                          <span className="field-label">Branch & Year</span>
                          <span className="field-value">
                            {item.branch || "—"} {item.year ? `(${item.year})` : ""}
                          </span>
                        </div>
                        <div className="result-field-cell">
                          <span className="field-label">Assigned Vehicle</span>
                          <span className="field-value highlight-navy">
                            {item.registrationno} {item.vehicletype ? `(${item.vehicletype})` : ""}
                          </span>
                        </div>
                        <div className="result-field-cell">
                          <span className="field-label">Route & Destination</span>
                          <span className="field-value">
                            <RouteIcon size={12} className="cell-icon" />
                            <span>{item.routename || "—"} ➔ <strong>{item.destination_city || item.city || "—"}</strong></span>
                          </span>
                        </div>
                        <div className="result-field-cell">
                          <span className="field-label">Boarding Stop</span>
                          <span className="field-value">
                            <MapPin size={12} className="cell-icon text-accent" />
                            <span>{item.boarding_stop || item.stage_name || item.point || "—"}</span>
                          </span>
                        </div>
                        <div className="result-field-cell">
                          <span className="field-label">Drop-off Stop</span>
                          <span className="field-value">
                            <MapPin size={12} className="cell-icon" />
                            <span>{item.dropoff_stop || item.destination_city || item.city || "—"}</span>
                          </span>
                        </div>
                        <div className="result-field-cell">
                          <span className="field-label">Driver Details</span>
                          <span className="field-value">
                            {item.driver_name ? (
                              <div className="driver-contact-wrapper">
                                <span>{item.driver_name}</span>
                                {item.driver_phone && (
                                  <a href={`tel:${item.driver_phone}`} className="phone-badge-link">
                                    <Phone size={11} /> {item.driver_phone}
                                  </a>
                                )}
                              </div>
                            ) : (
                              "Not Assigned"
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : hasSearchedStudent && !studentError ? (
              <div className="lookup-empty-state">
                <Users size={32} />
                <p>No student transport records found matching your query.</p>
              </div>
            ) : null}
          </div>
        )}

        {/* ====================================================================
            TAB 2: STAFF TRANSPORT LOOKUP
            ==================================================================== */}
        {activeTab === "staff-search" && (
          <div className="lookup-tab-content">
            <div className="lookup-search-card">
              <div className="lookup-card-meta">
                <h2 className="lookup-card-title">Staff Transport Assignment Lookup</h2>
                <p className="lookup-card-desc">
                  Search by staff name or Staff ID (e.g. <code>Dr. Arunkumar</code>, <code>STAFF01</code>) to view transport allocations.
                </p>
              </div>

              <form onSubmit={handleStaffSearch} className="lookup-search-form">
                <div className="lookup-input-wrapper">
                  <Search size={16} className="lookup-search-icon" />
                  <input
                    type="text"
                    className="lookup-search-input"
                    placeholder="Search by staff name or Staff ID..."
                    value={staffQuery}
                    onChange={(e) => setStaffQuery(e.target.value)}
                  />
                  {staffQuery && (
                    <button
                      type="button"
                      className="lookup-clear-btn"
                      onClick={() => {
                        setStaffQuery("");
                        setStaffResults([]);
                        setStaffError("");
                        setHasSearchedStaff(false);
                      }}
                      aria-label="Clear search input"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  className="vm-btn-primary lookup-submit-btn"
                  disabled={searchingStaff}
                >
                  {searchingStaff ? (
                    <>
                      <Loader2 size={15} className="spin-icon" />
                      <span>Searching...</span>
                    </>
                  ) : (
                    <>
                      <Search size={15} />
                      <span>Find Staff Details</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {staffError && (
              <div className="lookup-alert alert-error">
                <AlertCircle size={16} />
                <span>{staffError}</span>
              </div>
            )}

            {searchingStaff ? (
              <div className="lookup-loading-box">
                <Loader2 size={26} className="spin-icon inline-icon" />
                <span>Searching staff transport database...</span>
              </div>
            ) : staffResults.length > 0 ? (
              <div className="lookup-results-section">
                <div className="lookup-results-header">
                  <span className="results-count-text">
                    Showing <strong>{staffResults.length}</strong> matching staff transport assignment{staffResults.length > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="lookup-cards-grid">
                  {staffResults.map((item) => (
                    <div key={item.traveller_id || item.rollno} className="lookup-result-card staff-card">
                      <div className="result-card-topbar">
                        <div className="result-entity-info">
                          <h3 className="result-entity-name">{item.staff_name || item.name}</h3>
                          <span className="traveller-rollno-badge">{item.rollno}</span>
                        </div>
                        <span className="traveller-role-badge staff">
                          <Briefcase size={11} />
                          <span>{item.stafftype || "Faculty / Staff"}</span>
                        </span>
                      </div>

                      <div className="result-card-grid">
                        <div className="result-field-cell">
                          <span className="field-label">Department / Branch</span>
                          <span className="field-value">{item.branch || "—"}</span>
                        </div>
                        <div className="result-field-cell">
                          <span className="field-label">Assigned Vehicle</span>
                          <span className="field-value highlight-navy">
                            Bus #{item.vehicleid} — {item.registrationno}
                          </span>
                        </div>
                        <div className="result-field-cell">
                          <span className="field-label">Route & City</span>
                          <span className="field-value">
                            <RouteIcon size={12} className="cell-icon" />
                            <span>{item.routename || "—"} ({item.destination_city || item.city || "—"})</span>
                          </span>
                        </div>
                        <div className="result-field-cell">
                          <span className="field-label">Boarding Stop</span>
                          <span className="field-value">
                            <MapPin size={12} className="cell-icon text-accent" />
                            <span>{item.boarding_stop || item.stage_name || item.point || "—"}</span>
                          </span>
                        </div>
                        <div className="result-field-cell">
                          <span className="field-label">Drop-off Stop</span>
                          <span className="field-value">
                            <MapPin size={12} className="cell-icon" />
                            <span>{item.dropoff_stop || item.destination_city || item.city || "—"}</span>
                          </span>
                        </div>
                        <div className="result-field-cell">
                          <span className="field-label">Driver Details</span>
                          <span className="field-value">
                            {item.driver_name ? (
                              <div className="driver-contact-wrapper">
                                <span>{item.driver_name}</span>
                                {item.driver_phone && (
                                  <a href={`tel:${item.driver_phone}`} className="phone-badge-link">
                                    <Phone size={11} /> {item.driver_phone}
                                  </a>
                                )}
                              </div>
                            ) : (
                              "Not Assigned"
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : hasSearchedStaff && !staffError ? (
              <div className="lookup-empty-state">
                <Users size={32} />
                <p>No staff transport records found matching your query.</p>
              </div>
            ) : null}
          </div>
        )}

        {/* ====================================================================
            TAB 3: BUS DETAILS & ROSTER
            ==================================================================== */}
        {activeTab === "bus-details" && (
          <div className="lookup-tab-content">
            <div className="lookup-search-card">
              <div className="lookup-card-meta">
                <h2 className="lookup-card-title">Complete Bus Details, Driver & Passenger Roster</h2>
                <p className="lookup-card-desc">
                  Select a vehicle to inspect assigned route, driver contact, seating capacity, and complete passenger allotment.
                </p>
              </div>

              <div className="lookup-selector-row">
                <div className="lookup-selector-group">
                  <label htmlFor="bus-select">Select Bus Number</label>
                  <select
                    id="bus-select"
                    className="lookup-select-field"
                    value={selectedBusId}
                    onChange={(e) => handleFetchBusDetails(e.target.value)}
                  >
                    <option value="" disabled>Choose a bus...</option>
                    {availableBuses.map((b) => (
                      <option key={b.vehicleid} value={b.vehicleid}>
                        Bus #{b.vehicleid} — {b.registrationno} ({b.vehicletype})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {loadingBusDetails ? (
              <div className="lookup-loading-box">
                <Loader2 size={26} className="spin-icon inline-icon" />
                <span>Loading complete details for Bus #{selectedBusId}...</span>
              </div>
            ) : busDetails ? (
              <div className="lookup-roster-section">
                {/* Summary Banner */}
                <div className="lookup-summary-card">
                  <div className="summary-left">
                    <div className="summary-title-row">
                      <Bus size={18} className="summary-icon" />
                      <h3>Bus #{busDetails.busInfo?.vehicleid || selectedBusId} Profile</h3>
                      <span className="summary-reg-badge">{busDetails.busInfo?.registrationno}</span>
                    </div>
                    <div className="summary-meta-chips">
                      <span>Type: <strong>{busDetails.busInfo?.vehicletype || "Bus"}</strong></span>
                      <span className="chip-sep">•</span>
                      <span>Route: <strong>{busDetails.busInfo?.routename || "—"}</strong></span>
                      <span className="chip-sep">•</span>
                      <span>Driver: <strong>{busDetails.busInfo?.driver_name || "—"}</strong> {busDetails.busInfo?.driver_phone ? `(${busDetails.busInfo.driver_phone})` : ""}</span>
                    </div>
                  </div>
                  <div className="summary-right">
                    <span className="capacity-label">Capacity Utilization</span>
                    <strong className="capacity-count">
                      {busDetails.totalPassengers || 0} / {busDetails.busInfo?.seatcapacity || 40} Passengers
                    </strong>
                  </div>
                </div>

                {/* Roster Table */}
                <div className="view-traveller-table-container">
                  <table className="view-traveller-table">
                    <thead>
                      <tr>
                        <th className="col-sno">S.NO</th>
                        <th>PASSENGER NAME</th>
                        <th>ROLL NO / ID</th>
                        <th>ROLE</th>
                        <th>DEPT / BRANCH</th>
                        <th>BOARDING STAGE</th>
                        <th>CONTACT NUMBER</th>
                      </tr>
                    </thead>
                    <tbody>
                      {busDetails.passengers?.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="traveller-table-empty">
                            <Users size={24} style={{ color: "#94a3b8", marginBottom: "4px" }} />
                            <p>No passengers allocated to Bus #{selectedBusId} yet.</p>
                          </td>
                        </tr>
                      ) : (
                        busDetails.passengers?.map((p, idx) => {
                          const isStudent = (p.role || "Student").toLowerCase() === "student";
                          return (
                            <tr key={p.traveller_id || idx}>
                              <td className="col-sno-td">{idx + 1}</td>
                              <td><strong className="traveller-name-cell">{p.student_name}</strong></td>
                              <td><span className="traveller-rollno-badge">{p.rollno}</span></td>
                              <td>
                                <span className={`traveller-role-badge ${isStudent ? "student" : "staff"}`}>
                                  {p.role || "Student"}
                                </span>
                              </td>
                              <td><span className="traveller-branch-text">{p.branch} {p.year ? `(${p.year})` : ""}</span></td>
                              <td>
                                <span className="traveller-city-badge">
                                  <MapPin size={11} /> {p.stage_name}
                                </span>
                              </td>
                              <td>
                                {p.phoneno ? (
                                  <a href={`tel:${p.phoneno}`} className="phone-table-link">
                                    <Phone size={11} /> {p.phoneno}
                                  </a>
                                ) : (
                                  <span className="text-muted">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* ====================================================================
            TAB 4: STOP-WISE PASSENGER LOOKUP
            ==================================================================== */}
        {activeTab === "stop-passengers" && (
          <div className="lookup-tab-content">
            <div className="lookup-search-card">
              <div className="lookup-card-meta">
                <h2 className="lookup-card-title">Stop-wise Passenger Distribution Lookup</h2>
                <p className="lookup-card-desc">
                  Select a boarding location to inspect passenger distribution, route allotments, and assigned vehicles.
                </p>
              </div>

              <div className="lookup-selector-row">
                <div className="lookup-selector-group">
                  <label htmlFor="stop-select">Select Boarding Stop</label>
                  <select
                    id="stop-select"
                    className="lookup-select-field"
                    value={selectedStop}
                    onChange={(e) => handleFetchStopPassengers(e.target.value)}
                  >
                    <option value="" disabled>Choose a boarding stage...</option>
                    {availableStops.map((stop, idx) => (
                      <option key={idx} value={stop}>
                        {stop}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {loadingStopData ? (
              <div className="lookup-loading-box">
                <Loader2 size={26} className="spin-icon inline-icon" />
                <span>Loading passengers boarding at {selectedStop}...</span>
              </div>
            ) : stopPassengers ? (
              <div className="lookup-roster-section">
                {/* Summary Banner */}
                <div className="lookup-summary-card">
                  <div className="summary-left">
                    <div className="summary-title-row">
                      <MapPin size={18} className="summary-icon text-accent" />
                      <h3>Boarding Stage: {stopPassengers.stopName}</h3>
                    </div>
                    <p className="summary-subtitle">
                      Passenger distribution and vehicle assignment for transport administration.
                    </p>
                  </div>
                  <div className="summary-right">
                    <span className="capacity-label">Total Boarding Passengers</span>
                    <strong className="capacity-count">
                      {stopPassengers.totalBoardingPassengers || 0} Passengers
                    </strong>
                  </div>
                </div>

                {/* Table */}
                <div className="view-traveller-table-container">
                  <table className="view-traveller-table">
                    <thead>
                      <tr>
                        <th className="col-sno">S.NO</th>
                        <th>PASSENGER NAME</th>
                        <th>ROLL NO / ID</th>
                        <th>ROLE</th>
                        <th>BRANCH</th>
                        <th>ASSIGNED BUS</th>
                        <th>ROUTE</th>
                        <th>CONTACT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stopPassengers.passengers?.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="traveller-table-empty">
                            <Users size={24} style={{ color: "#94a3b8", marginBottom: "4px" }} />
                            <p>No passengers boarding at {stopPassengers.stopName}.</p>
                          </td>
                        </tr>
                      ) : (
                        stopPassengers.passengers?.map((p, idx) => {
                          const isStudent = (p.role || "Student").toLowerCase() === "student";
                          return (
                            <tr key={p.id || p.rollno || idx}>
                              <td className="col-sno-td">{idx + 1}</td>
                              <td><strong className="traveller-name-cell">{p.name}</strong></td>
                              <td><span className="traveller-rollno-badge">{p.rollno}</span></td>
                              <td>
                                <span className={`traveller-role-badge ${isStudent ? "student" : "staff"}`}>
                                  {p.role || "Student"}
                                </span>
                              </td>
                              <td><span className="traveller-branch-text">{p.branch || "—"}</span></td>
                              <td>
                                <span className="traveller-bus-badge">
                                  <Bus size={11} /> Bus #{p.bus_id} ({p.bus_reg || "Assigned"})
                                </span>
                              </td>
                              <td>
                                <span className="traveller-route-badge">
                                  <RouteIcon size={11} /> {p.route_name || "—"}
                                </span>
                              </td>
                              <td>
                                {p.phone ? (
                                  <a href={`tel:${p.phone}`} className="phone-table-link">
                                    <Phone size={11} /> {p.phone}
                                  </a>
                                ) : (
                                  <span className="text-muted">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};

export default BusStudentLookup;
