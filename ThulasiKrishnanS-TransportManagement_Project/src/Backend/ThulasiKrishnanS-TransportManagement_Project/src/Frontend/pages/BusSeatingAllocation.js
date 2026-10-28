import React, { useState, useEffect } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import {
  FaBus,
  FaChair,
  FaUserCheck,
  FaUserTimes,
  FaMagic,
  FaFileExcel,
  FaSearch,
  FaCheckCircle,
  FaTimes,
  FaRoute,
  FaUserTie,
  FaPhoneAlt,
  FaMapMarkerAlt
} from "react-icons/fa";
import { API_URL } from "../config";
import "../styles/BusSeatingAllocation.css";

const BusSeatingAllocation = () => {
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState("1");
  const [busData, setBusData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState("");
  const [tableSearch, setTableSearch] = useState("");

  // Modals
  const [allocateModal, setAllocateModal] = useState({ open: false, seat: null });
  const [selectedPassengerId, setSelectedPassengerId] = useState("");
  const [seatDetailsModal, setSeatDetailsModal] = useState({ open: false, seat: null });

  useEffect(() => {
    fetchVehicles();
  }, []);

  useEffect(() => {
    if (selectedVehicleId) {
      fetchSeating(selectedVehicleId);
    }
  }, [selectedVehicleId]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 4500);
  };

  const fetchVehicles = async () => {
    try {
      const res = await axios.get(`${API_URL}/getVehicle`);
      if (Array.isArray(res.data) && res.data.length > 0) {
        setVehicles(res.data);
        setSelectedVehicleId(String(res.data[0].vehicleid));
      }
    } catch (err) {
      console.error("Error fetching vehicles:", err);
    }
  };

  const fetchSeating = async (vehId) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/bus-seating/${vehId}`);
      if (res.data && res.data.success) {
        setBusData(res.data);
      }
    } catch (err) {
      console.error("Error fetching seating layout:", err);
    } finally {
      setLoading(false);
    }
  };

  // Click on seat
  const handleSeatClick = (seat) => {
    if (seat.is_occupied) {
      setSeatDetailsModal({ open: true, seat });
    } else {
      setAllocateModal({ open: true, seat });
      setSelectedPassengerId("");
    }
  };

  // Confirm seat allocation
  const handleConfirmAllocate = async (e) => {
    e.preventDefault();
    if (!allocateModal.seat || !selectedPassengerId) return;

    try {
      const res = await axios.post(`${API_URL}/api/bus-seating/allocate`, {
        vehicleid: selectedVehicleId,
        seat_no: allocateModal.seat.seat_no,
        traveller_id: Number(selectedPassengerId)
      });

      showToast(res.data.message || `Seat ${allocateModal.seat.seat_no} allocated!`);
      setAllocateModal({ open: false, seat: null });
      fetchSeating(selectedVehicleId);
    } catch (err) {
      console.error("Allocation error", err);
      showToast(err.response?.data?.message || "Failed to allocate seat.");
    }
  };

  // Deallocate seat
  const handleDeallocate = async (seatNo) => {
    try {
      const res = await axios.post(`${API_URL}/api/bus-seating/deallocate`, {
        vehicleid: selectedVehicleId,
        seat_no: seatNo
      });

      showToast(res.data.message || `Seat ${seatNo} freed up!`);
      setSeatDetailsModal({ open: false, seat: null });
      fetchSeating(selectedVehicleId);
    } catch (err) {
      console.error("Deallocate error", err);
      showToast("Failed to deallocate seat.");
    }
  };

  // Auto-allocate all unassigned route passengers
  const handleAutoAllocate = async () => {
    try {
      const res = await axios.post(`${API_URL}/api/bus-seating/auto-allocate`, {
        vehicleid: selectedVehicleId
      });

      showToast(res.data.message || "Passengers auto-allocated!");
      fetchSeating(selectedVehicleId);
    } catch (err) {
      console.error("Auto allocate error", err);
      showToast("Failed to auto-allocate.");
    }
  };

  // Export Seating Chart to Excel
  const handleExportSeatingExcel = () => {
    if (!busData || !busData.seats) return;

    const exportRows = busData.seats.map((s, idx) => ({
      "S.No": idx + 1,
      "Seat No": s.seat_no,
      "Seat Position": `${s.side} (${s.position})`,
      "Occupancy Status": s.is_occupied ? "Occupied" : "Available",
      "Passenger Name": s.passenger_name || "—",
      "Roll No / Staff ID": s.rollno || "—",
      "Role": s.role || "—",
      "Department": s.branch || "—",
      "Academic Year": s.year || "—",
      "Boarding Stage": s.stage_name || "—",
      "Contact Phone": s.phoneno || "—",
      "Allocated Date": s.allocated_at || "—"
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Bus_${selectedVehicleId}_Seating`);
    const fileName = `Bus_${selectedVehicleId}_Seating_Chart_${new Date().toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    showToast(`Seating chart exported as "${fileName}"!`);
  };

  // Group seats by rows for the visual layout
  const groupedRows = React.useMemo(() => {
    if (!busData || !busData.seats) return { normalRows: [], rearSeats: [] };

    const normal = {};
    const rear = [];

    busData.seats.forEach((seat) => {
      if (seat.is_rear_bench) {
        rear.push(seat);
      } else {
        if (!normal[seat.row]) normal[seat.row] = {};
        normal[seat.row][seat.column] = seat;
      }
    });

    return { normalRows: normal, rearSeats: rear };
  }, [busData]);

  // Filtered table rows
  const filteredTableSeats = (busData?.seats || []).filter((s) => {
    if (!tableSearch.trim()) return true;
    const q = tableSearch.toLowerCase();
    return (
      s.seat_no.toLowerCase().includes(q) ||
      (s.passenger_name && s.passenger_name.toLowerCase().includes(q)) ||
      (s.rollno && s.rollno.toLowerCase().includes(q)) ||
      (s.stage_name && s.stage_name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="seating-page-container">
      {/* Header Panel */}
      <header className="seating-header-panel">
        <div>
          <p className="seating-kicker">Bus Seating & Route Load Master</p>
          <h1>Bus Seating Allocation Portal</h1>
          <p className="seating-subtitle">
            Interactive visual seat map, seat assignment for students & faculty, auto-allocation engine, and digital seating charts.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleAutoAllocate}
            title="Automatically assign pending passengers on this route to available seats"
          >
            <FaMagic /> Auto-Allocate Seats
          </button>

          <button
            type="button"
            className="btn-success"
            onClick={handleExportSeatingExcel}
            title="Download seating chart as formatted Excel file"
          >
            <FaFileExcel /> Export Seating Chart (.xlsx)
          </button>
        </div>
      </header>

      {/* Toast */}
      {toastMsg && (
        <div className="feedback-toast toast-success" style={{ marginBottom: "20px" }}>
          <span>{toastMsg}</span>
          <button
            type="button"
            onClick={() => setToastMsg("")}
            style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer" }}
          >
            <FaTimes />
          </button>
        </div>
      )}

      {/* Bus Selector Bar */}
      <div className="bus-selector-card">
        <div className="bus-selector-left">
          <label style={{ fontWeight: "700", fontSize: "14px", color: "#0f172a" }}>Select Vehicle:</label>
          <select
            className="bus-dropdown-select"
            value={selectedVehicleId}
            onChange={(e) => setSelectedVehicleId(e.target.value)}
          >
            {vehicles.map((v) => (
              <option key={v.vehicleid} value={v.vehicleid}>
                Bus #{v.vehicleid} — {v.registrationno} ({v.vehicletype}, {v.seatcapacity} Seats)
              </option>
            ))}
          </select>

          {busData && busData.vehicle && (
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <span className="bus-meta-badge">
                <FaRoute color="#0d9488" /> {busData.vehicle.routeid} — {busData.vehicle.routename}
              </span>
              <span className="bus-meta-badge">
                <FaUserTie color="#2563eb" /> Driver: {busData.vehicle.driver_name} ({busData.vehicle.driver_phone})
              </span>
            </div>
          )}
        </div>

        {/* Capacity Metrics */}
        {busData && busData.metrics && (
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "700" }}>TOTAL SEATS</div>
              <div style={{ fontSize: "18px", fontWeight: "800", color: "#0f172a" }}>
                {busData.metrics.totalSeats}
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "11px", color: "#2563eb", fontWeight: "700" }}>ALLOCATED</div>
              <div style={{ fontSize: "18px", fontWeight: "800", color: "#2563eb" }}>
                {busData.metrics.occupiedCount}
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "11px", color: "#059669", fontWeight: "700" }}>AVAILABLE</div>
              <div style={{ fontSize: "18px", fontWeight: "800", color: "#059669" }}>
                {busData.metrics.availableCount}
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "11px", color: "#d97706", fontWeight: "700" }}>OCCUPANCY</div>
              <div style={{ fontSize: "18px", fontWeight: "800", color: "#d97706" }}>
                {busData.metrics.occupancyRate}%
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="seating-legend">
        <span style={{ fontWeight: "700", color: "#64748b", fontSize: "12px", textTransform: "uppercase" }}>
          Seat Legend:
        </span>
        <div className="legend-item">
          <div className="legend-swatch swatch-avail"></div>
          <span>Available (Click to Allocate)</span>
        </div>
        <div className="legend-item">
          <div className="legend-swatch swatch-occupied"></div>
          <span>Allocated to Student</span>
        </div>
        <div className="legend-item">
          <div className="legend-swatch swatch-staff"></div>
          <span>Faculty / Reserved</span>
        </div>
        <div className="legend-item">
          <div className="legend-swatch swatch-driver"></div>
          <span>Driver Cabin (Front RHD)</span>
        </div>
      </div>

      {/* Visual Bus Chassis Layout */}
      <div className="bus-layout-wrapper">
        {loading ? (
          <div style={{ padding: "60px", textAlign: "center", color: "#64748b" }}>
            Loading interactive bus seating layout...
          </div>
        ) : busData ? (
          <div className="bus-chassis">
            {/* Front of Bus */}
            <div className="bus-cabin-front">
              <div className="bus-entry-door">
                🚪 Passenger Entry Door
              </div>
              <div className="bus-windshield">
                🚌 FRONT WINDSHIELD • BUS #{selectedVehicleId} ({busData.vehicle?.registrationno})
              </div>
              <div className="bus-driver-area">
                💺 Driver Cabin
              </div>
            </div>

            {/* Seating Grid (Rows 1 to N) */}
            <div className="bus-rows-container">
              {Object.keys(groupedRows.normalRows).map((rowNum) => {
                const r = groupedRows.normalRows[rowNum];
                return (
                  <div key={rowNum} className="bus-row">
                    <div className="row-label">R{rowNum}</div>

                    {/* Left Window Seat (A) */}
                    {r["A"] ? (
                      <div
                        className={`bus-seat ${r["A"].is_occupied ? (r["A"].role === "Staff" ? "seat-staff" : "seat-occupied") : "seat-avail"}`}
                        onClick={() => handleSeatClick(r["A"])}
                        title={r["A"].is_occupied ? `${r["A"].passenger_name} (${r["A"].rollno})` : "Click to allocate seat"}
                      >
                        <span className="seat-number-tag">{r["A"].seat_no}</span>
                        {r["A"].is_occupied ? (
                          <span className="seat-passenger-initials">{r["A"].passenger_name.split(" ")[0]}</span>
                        ) : (
                          <span className="seat-status-sub">+ Assign</span>
                        )}
                      </div>
                    ) : <div />}

                    {/* Left Aisle Seat (B) */}
                    {r["B"] ? (
                      <div
                        className={`bus-seat ${r["B"].is_occupied ? (r["B"].role === "Staff" ? "seat-staff" : "seat-occupied") : "seat-avail"}`}
                        onClick={() => handleSeatClick(r["B"])}
                        title={r["B"].is_occupied ? `${r["B"].passenger_name} (${r["B"].rollno})` : "Click to allocate seat"}
                      >
                        <span className="seat-number-tag">{r["B"].seat_no}</span>
                        {r["B"].is_occupied ? (
                          <span className="seat-passenger-initials">{r["B"].passenger_name.split(" ")[0]}</span>
                        ) : (
                          <span className="seat-status-sub">+ Assign</span>
                        )}
                      </div>
                    ) : <div />}

                    {/* Center Gangway / Aisle */}
                    <div className="aisle-gap">AISLE</div>

                    {/* Right Aisle Seat (C) */}
                    {r["C"] ? (
                      <div
                        className={`bus-seat ${r["C"].is_occupied ? (r["C"].role === "Staff" ? "seat-staff" : "seat-occupied") : "seat-avail"}`}
                        onClick={() => handleSeatClick(r["C"])}
                        title={r["C"].is_occupied ? `${r["C"].passenger_name} (${r["C"].rollno})` : "Click to allocate seat"}
                      >
                        <span className="seat-number-tag">{r["C"].seat_no}</span>
                        {r["C"].is_occupied ? (
                          <span className="seat-passenger-initials">{r["C"].passenger_name.split(" ")[0]}</span>
                        ) : (
                          <span className="seat-status-sub">+ Assign</span>
                        )}
                      </div>
                    ) : <div />}

                    {/* Right Window Seat (D) */}
                    {r["D"] ? (
                      <div
                        className={`bus-seat ${r["D"].is_occupied ? (r["D"].role === "Staff" ? "seat-staff" : "seat-occupied") : "seat-avail"}`}
                        onClick={() => handleSeatClick(r["D"])}
                        title={r["D"].is_occupied ? `${r["D"].passenger_name} (${r["D"].rollno})` : "Click to allocate seat"}
                      >
                        <span className="seat-number-tag">{r["D"].seat_no}</span>
                        {r["D"].is_occupied ? (
                          <span className="seat-passenger-initials">{r["D"].passenger_name.split(" ")[0]}</span>
                        ) : (
                          <span className="seat-status-sub">+ Assign</span>
                        )}
                      </div>
                    ) : <div />}
                  </div>
                );
              })}
            </div>

            {/* Rear Bench Row (5 seats) */}
            {groupedRows.rearSeats.length > 0 && (
              <div className="bus-rear-row">
                <div style={{ textAlign: "center", fontSize: "11px", fontWeight: "700", color: "#64748b", marginBottom: "8px" }}>
                  REAR 5-SEAT BENCH
                </div>
                <div className="rear-bench-grid">
                  {groupedRows.rearSeats.map((seat) => (
                    <div
                      key={seat.seat_no}
                      className={`bus-seat ${seat.is_occupied ? (seat.role === "Staff" ? "seat-staff" : "seat-occupied") : "seat-avail"}`}
                      onClick={() => handleSeatClick(seat)}
                      title={seat.is_occupied ? `${seat.passenger_name} (${seat.rollno})` : "Click to allocate seat"}
                    >
                      <span className="seat-number-tag">{seat.seat_no}</span>
                      {seat.is_occupied ? (
                        <span className="seat-passenger-initials">{seat.passenger_name.split(" ")[0]}</span>
                      ) : (
                        <span className="seat-status-sub">+ Assign</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Tabular Roster & Search */}
      <div className="fees-table-card">
        <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0" }}>
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "800", color: "#0f172a" }}>
            Bus #{selectedVehicleId} Seating Passenger Registry
          </h3>
          <div className="fees-search-box" style={{ maxWidth: "300px" }}>
            <FaSearch color="#94a3b8" />
            <input
              type="text"
              placeholder="Search seat, student, roll no..."
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="table-responsive">
          <table className="fees-table">
            <thead>
              <tr>
                <th>Seat No</th>
                <th>Position</th>
                <th>Status</th>
                <th>Passenger Name</th>
                <th>Roll No / Staff ID</th>
                <th>Department & Year</th>
                <th>Boarding Stop</th>
                <th>Contact</th>
                <th style={{ textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTableSeats.length > 0 ? (
                filteredTableSeats.map((s) => (
                  <tr key={s.seat_no}>
                    <td>
                      <strong>{s.seat_no}</strong>
                    </td>
                    <td>
                      <span style={{ fontSize: "12px", color: "#64748b" }}>
                        {s.side} ({s.position})
                      </span>
                    </td>
                    <td>
                      <span className={`fee-badge ${s.is_occupied ? "badge-paid" : "badge-partial"}`}>
                        {s.is_occupied ? "Allocated" : "Available"}
                      </span>
                    </td>
                    <td>
                      <strong>{s.passenger_name || "—"}</strong>
                    </td>
                    <td>{s.rollno ? <code>{s.rollno}</code> : "—"}</td>
                    <td>
                      {s.branch ? `${s.branch} (${s.year})` : "—"}
                    </td>
                    <td>{s.stage_name || "—"}</td>
                    <td>{s.phoneno || "—"}</td>
                    <td style={{ textAlign: "center" }}>
                      {s.is_occupied ? (
                        <button
                          type="button"
                          className="btn-danger btn-sm"
                          onClick={() => handleDeallocate(s.seat_no)}
                          title="Remove allocation for this seat"
                        >
                          <FaUserTimes /> Remove
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn-primary btn-sm"
                          onClick={() => handleSeatClick(s)}
                          title="Assign passenger to seat"
                        >
                          <FaChair /> Assign
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" style={{ textAlign: "center", padding: "30px", color: "#94a3b8" }}>
                    No seats match the search filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Allocate Seat */}
      {allocateModal.open && allocateModal.seat && (
        <div className="modal-overlay" onClick={() => setAllocateModal({ open: false, seat: null })}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Allocate Seat {allocateModal.seat.seat_no}</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setAllocateModal({ open: false, seat: null })}
              >
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handleConfirmAllocate}>
              <div className="modal-body">
                <div style={{ background: "#f0fdf4", padding: "12px", borderRadius: "8px", border: "1px solid #bbf7d0", marginBottom: "16px" }}>
                  <p style={{ margin: "0 0 4px 0", fontWeight: "800", color: "#166534" }}>
                    Selected Seat: {allocateModal.seat.seat_no} ({allocateModal.seat.side} - {allocateModal.seat.position})
                  </p>
                  <p style={{ margin: 0, fontSize: "12px", color: "#15803d" }}>
                    Vehicle #{selectedVehicleId} • Route {busData?.vehicle?.routeid} ({busData?.vehicle?.routename})
                  </p>
                </div>

                <div className="form-group">
                  <label>Select Unassigned Route Passenger*</label>
                  <select
                    className="form-control"
                    required
                    value={selectedPassengerId}
                    onChange={(e) => setSelectedPassengerId(e.target.value)}
                  >
                    <option value="">-- Choose student or faculty --</option>
                    {(busData?.unassignedPassengers || []).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.rollno}) — {p.branch} {p.year} (Stop: {p.stage_name || p.point})
                      </option>
                    ))}
                  </select>
                  {busData?.unassignedPassengers?.length === 0 && (
                    <p style={{ color: "#d97706", fontSize: "12px", marginTop: "6px" }}>
                      All passengers on this route have already been allocated seats!
                    </p>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setAllocateModal({ open: false, seat: null })}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-success"
                  disabled={!selectedPassengerId}
                >
                  <FaCheckCircle /> Confirm Seat Allocation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Occupied Seat Details */}
      {seatDetailsModal.open && seatDetailsModal.seat && (
        <div className="modal-overlay" onClick={() => setSeatDetailsModal({ open: false, seat: null })}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Seat {seatDetailsModal.seat.seat_no} Allocation Details</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSeatDetailsModal({ open: false, seat: null })}
              >
                <FaTimes />
              </button>
            </div>
            <div className="modal-body">
              <div className="seat-passenger-badge">
                <h4>{seatDetailsModal.seat.passenger_name}</h4>
                <p><strong>Roll No:</strong> {seatDetailsModal.seat.rollno}</p>
                <p><strong>Department & Year:</strong> {seatDetailsModal.seat.branch} ({seatDetailsModal.seat.year})</p>
                <p><strong>Role:</strong> {seatDetailsModal.seat.role}</p>
                <p><strong>Boarding Stop:</strong> {seatDetailsModal.seat.stage_name}</p>
                <p><strong>Contact Phone:</strong> {seatDetailsModal.seat.phoneno}</p>
                <p><strong>Allocated On:</strong> {seatDetailsModal.seat.allocated_at || "Academic Term Start"}</p>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-danger"
                onClick={() => handleDeallocate(seatDetailsModal.seat.seat_no)}
              >
                <FaUserTimes /> Deallocate / Free Seat
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setSeatDetailsModal({ open: false, seat: null })}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusSeatingAllocation;
