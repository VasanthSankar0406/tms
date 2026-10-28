import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import * as XLSX from "xlsx";
import {
  Armchair,
  Sparkles,
  RotateCcw,
  FileSpreadsheet,
  Search,
  X,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Users,
  UserCheck,
  UserX,
  MapPin,
  Route as RouteIcon
} from "lucide-react";
import { API_URL } from "../config";
import "../styles/BusSeatingAllocation.css";

const BusSeatingAllocation = () => {
  const navigate = useNavigate();

  // Core Data States
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState("1");
  const [busData, setBusData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAutoAllocating, setIsAutoAllocating] = useState(false);

  // Flash Notification State
  const [flashCard, setFlashCard] = useState(null);
  const flashTimerRef = useRef(null);

  // Table Search and Pagination States
  const [tableSearch, setTableSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5; // Fixed 5 records per page (No dropdown selector)

  // Modals
  const [allocateModal, setAllocateModal] = useState({ open: false, seat: null });
  const [selectedPassengerId, setSelectedPassengerId] = useState("");
  const [isSubmittingAllocation, setIsSubmittingAllocation] = useState(false);

  const [seatDetailsModal, setSeatDetailsModal] = useState({ open: false, seat: null });
  const [isDeallocating, setIsDeallocating] = useState(false);

  const showFlash = (message, type = "success", title = "") => {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    const defaultTitle =
      type === "danger" ? "Error Occurred" : type === "warning" ? "Notice" : "Success";
    setFlashCard({
      type,
      message,
      title: title || defaultTitle,
      id: Date.now()
    });
    flashTimerRef.current = setTimeout(() => {
      setFlashCard(null);
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, []);

  // Fetch initial vehicle list
  useEffect(() => {
    fetchVehicles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch seating data when selected vehicle changes
  useEffect(() => {
    if (selectedVehicleId) {
      fetchSeating(selectedVehicleId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVehicleId]);

  // Reset pagination to page 1 when vehicle or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedVehicleId, tableSearch]);

  const fetchVehicles = async () => {
    try {
      const res = await axios.get(`${API_URL}/getVehicle`);
      if (Array.isArray(res.data) && res.data.length > 0) {
        setVehicles(res.data);
        if (!selectedVehicleId) {
          setSelectedVehicleId(String(res.data[0].vehicleid));
        }
      }
    } catch (err) {
      console.error("Error fetching vehicles:", err);
      showFlash("Failed to fetch fleet vehicles.", "danger");
    }
  };

  const fetchSeating = async (vehId, isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    else setLoading(true);

    try {
      const res = await axios.get(`${API_URL}/api/bus-seating/${vehId}`);
      if (res.data && res.data.success) {
        setBusData(res.data);
        if (isManualRefresh) {
          showFlash(`Seating chart for Bus #${vehId} refreshed.`, "success", "Refreshed");
        }
      } else {
        showFlash(res.data?.message || "Failed to load bus seating data.", "danger");
      }
    } catch (err) {
      console.error("Error fetching seating layout:", err);
      showFlash("Failed to load seating chart layout.", "danger");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    if (selectedVehicleId) {
      fetchSeating(selectedVehicleId, true);
    }
  };

  // Seat Click Handler
  const handleSeatClick = (seat) => {
    if (seat.is_occupied) {
      setSeatDetailsModal({ open: true, seat });
    } else {
      setAllocateModal({ open: true, seat });
      setSelectedPassengerId("");
    }
  };

  // Confirm Seat Allocation
  const handleConfirmAllocate = async (e) => {
    e.preventDefault();
    if (!allocateModal.seat || !selectedPassengerId) return;
    setIsSubmittingAllocation(true);

    try {
      const res = await axios.post(`${API_URL}/api/bus-seating/allocate`, {
        vehicleid: selectedVehicleId,
        seat_no: allocateModal.seat.seat_no,
        traveller_id: Number(selectedPassengerId)
      });

      if (res.data && res.data.success) {
        showFlash(
          res.data.message || `Seat ${allocateModal.seat.seat_no} allocated successfully!`,
          "success",
          "Seat Allocated"
        );
        setAllocateModal({ open: false, seat: null });
        fetchSeating(selectedVehicleId);
      } else {
        showFlash(res.data?.message || "Failed to allocate seat.", "danger");
      }
    } catch (err) {
      console.error("Allocation error:", err);
      showFlash(err.response?.data?.message || "Failed to allocate seat.", "danger");
    } finally {
      setIsSubmittingAllocation(false);
    }
  };

  // Deallocate Seat
  const handleDeallocate = async (seatNo) => {
    setIsDeallocating(true);
    try {
      const res = await axios.post(`${API_URL}/api/bus-seating/deallocate`, {
        vehicleid: selectedVehicleId,
        seat_no: seatNo
      });

      if (res.data && res.data.success) {
        showFlash(
          res.data.message || `Seat ${seatNo} freed up successfully!`,
          "success",
          "Seat Deallocated"
        );
        setSeatDetailsModal({ open: false, seat: null });
        fetchSeating(selectedVehicleId);
      } else {
        showFlash(res.data?.message || "Failed to deallocate seat.", "danger");
      }
    } catch (err) {
      console.error("Deallocate error:", err);
      showFlash("Failed to deallocate seat.", "danger");
    } finally {
      setIsDeallocating(false);
    }
  };

  // Auto-allocate all unassigned route passengers
  const handleAutoAllocate = async () => {
    setIsAutoAllocating(true);
    try {
      const res = await axios.post(`${API_URL}/api/bus-seating/auto-allocate`, {
        vehicleid: selectedVehicleId
      });

      if (res.data && res.data.success) {
        showFlash(
          res.data.message || "Route passengers auto-allocated successfully!",
          "success",
          "Auto-Allocation Complete"
        );
        fetchSeating(selectedVehicleId);
      } else {
        showFlash(res.data?.message || "Failed to auto-allocate passengers.", "danger");
      }
    } catch (err) {
      console.error("Auto allocate error:", err);
      showFlash("Failed to auto-allocate passengers.", "danger");
    } finally {
      setIsAutoAllocating(false);
    }
  };

  // Export Seating Chart to Excel (.xlsx)
  const handleExportSeatingExcel = () => {
    if (!busData || !busData.seats || busData.seats.length === 0) {
      showFlash("No seating data available to export.", "warning");
      return;
    }

    const exportRows = busData.seats.map((s, idx) => ({
      "S.No": idx + 1,
      "Seat No": s.seat_no,
      "Seat Position": `${s.side} (${s.position})`,
      "Occupancy Status": s.is_occupied ? "Occupied" : "Available",
      "Passenger Name": s.passenger_name || "—",
      "Roll No / Staff ID": s.rollno || "—",
      Role: s.role || "—",
      Department: s.branch || "—",
      "Academic Year": s.year || "—",
      "Boarding Stage": s.stage_name || "—",
      "Contact Phone": s.phoneno || "—",
      "Allocated Date": s.allocated_at || "—"
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Bus_${selectedVehicleId}_Seating`);
    const dateStamp = new Date().toISOString().split("T")[0];
    const fileName = `Bus_${selectedVehicleId}_Seating_Chart_${dateStamp}.xlsx`;
    XLSX.writeFile(wb, fileName);
    showFlash(`Seating chart exported as "${fileName}"!`, "success", "Export Completed");
  };

  // Group seats by rows for chassis layout
  const groupedRows = useMemo(() => {
    if (!busData || !busData.seats) return { normalRows: {}, rearSeats: [] };

    const normal = {};
    const rear = [];

    busData.seats.forEach((seat) => {
      if (seat.is_rear_bench || String(seat.seat_no).startsWith("R")) {
        rear.push(seat);
      } else {
        if (!normal[seat.row]) normal[seat.row] = {};
        normal[seat.row][seat.column] = seat;
      }
    });

    return { normalRows: normal, rearSeats: rear };
  }, [busData]);

  // Filtered passenger seats for table
  const filteredTableSeats = useMemo(() => {
    const list = busData?.seats || [];
    if (!tableSearch.trim()) return list;

    const query = tableSearch.toLowerCase().trim();
    return list.filter((s) => {
      const seatNo = String(s.seat_no || "").toLowerCase();
      const passName = String(s.passenger_name || "").toLowerCase();
      const rollNo = String(s.rollno || "").toLowerCase();
      const branch = String(s.branch || "").toLowerCase();
      const stage = String(s.stage_name || "").toLowerCase();
      const role = String(s.role || "").toLowerCase();

      return (
        seatNo.includes(query) ||
        passName.includes(query) ||
        rollNo.includes(query) ||
        branch.includes(query) ||
        stage.includes(query) ||
        role.includes(query)
      );
    });
  }, [busData, tableSearch]);

  // Pagination Calculations (Fixed 5 records per page)
  const totalPages = Math.max(1, Math.ceil(filteredTableSeats.length / rowsPerPage));
  const startIndex = filteredTableSeats.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const endIndex = Math.min(currentPage * rowsPerPage, filteredTableSeats.length);
  const paginatedSeats = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredTableSeats.slice(start, start + rowsPerPage);
  }, [filteredTableSeats, currentPage, rowsPerPage]);

  return (
    <div className="seating-master-container">
      <div className="seating-box-wrapper">
        {/* 3-Second Flash Notification */}
        {flashCard && (
          <aside className={`m-flash-card ${flashCard.type}`} role="alert">
            <div className="m-flash-indicator" />
            <div className="m-flash-content">
              <div className="m-flash-header">
                <span className="m-flash-title">{flashCard.title}</span>
                <button
                  type="button"
                  className="m-flash-dismiss"
                  onClick={() => setFlashCard(null)}
                  aria-label="Close notification"
                >
                  <X size={14} />
                </button>
              </div>
              <p className="m-flash-message">{flashCard.message}</p>
            </div>
          </aside>
        )}

        {/* 1. Breadcrumbs Navigation & Header */}
        <nav className="vm-breadcrumb-nav" aria-label="Breadcrumb">
          <span className="link" onClick={() => navigate("/home")}>
            Dashboard
          </span>
          <span className="sep">/</span>
          <span className="link" onClick={() => navigate("/home")}>
            Vehicle Master
          </span>
          <span className="sep">/</span>
          <span className="current">Bus Seating Chart & Layout</span>
        </nav>

        <header className="vm-page-header">
          <div className="vm-header-left">
            <div className="vm-title-row">
              <div className="vm-title-icon-badge" title="Bus Seating Chart">
                <Armchair size={18} />
              </div>
              <h1 className="vm-page-title">Bus Seating Chart & Layout</h1>
              {busData?.vehicle && (
                <span className="vm-total-count-badge">
                  Bus #{selectedVehicleId} • {busData.vehicle.registrationno}
                </span>
              )}
            </div>
            <p className="vm-page-subtitle">
              Manage seat allocations, passenger assignments, and bus capacity.
            </p>
          </div>

          <div className="vm-header-actions">
            <button
              type="button"
              className="vm-btn-secondary"
              onClick={handleRefresh}
              disabled={isRefreshing}
              title="Refresh seating chart and capacity metrics"
            >
              <RotateCcw size={15} className={isRefreshing ? "spin-icon" : ""} />
              <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
            </button>

            <button
              type="button"
              className="vm-btn-primary"
              onClick={handleAutoAllocate}
              disabled={isAutoAllocating}
              title="Automatically assign pending passengers on this route to available seats"
            >
              <Sparkles size={15} />
              <span>{isAutoAllocating ? "Allocating..." : "Auto-Allocate Seats"}</span>
            </button>

            <button
              type="button"
              className="vm-btn-secondary vm-btn-excel"
              onClick={handleExportSeatingExcel}
              disabled={!busData || !busData.seats || busData.seats.length === 0}
              title="Download seating chart as formatted Excel file"
            >
              <FileSpreadsheet size={15} />
              <span>Export Seating Chart</span>
            </button>
          </div>
        </header>

        {/* 2. Vehicle Selection & Capacity Metrics Card */}
        <section className="seating-vehicle-selector-card" aria-label="Vehicle Selector & Capacity">
          <div className="seating-selector-left">
            <div className="seating-selector-input-row">
              <label htmlFor="vehicle-select" className="seating-field-label">
                Select Vehicle:
              </label>
              <select
                id="vehicle-select"
                className="seating-vehicle-select"
                value={selectedVehicleId}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
              >
                {vehicles.map((v) => (
                  <option key={v.vehicleid} value={v.vehicleid}>
                    Bus #{v.vehicleid} — {v.registrationno} ({v.vehicletype || "Bus"}, {v.seatcapacity} Seats)
                  </option>
                ))}
              </select>
            </div>

            {busData?.vehicle && (
              <div className="seating-meta-badges-row">
                <span className="seating-meta-badge" title="Assigned Route">
                  <RouteIcon size={13} /> Route {busData.vehicle.routeid}: {busData.vehicle.routename}
                </span>
                <span className="seating-meta-badge" title="Assigned Driver">
                  <UserCheck size={13} /> Driver: {busData.vehicle.driver_name} ({busData.vehicle.driver_phone})
                </span>
                <span className="seating-meta-badge" title="Depot / City">
                  <MapPin size={13} /> {busData.vehicle.city || "Campus Depot"}
                </span>
              </div>
            )}
          </div>

          {/* Capacity Metrics Chips */}
          {busData?.metrics && (
            <div className="seating-metrics-row">
              <div className="seating-metric-chip">
                <div className="seating-metric-val">{busData.metrics.totalSeats}</div>
                <div className="seating-metric-label">Total Seats</div>
              </div>

              <div className="seating-metric-chip metric-blue">
                <div className="seating-metric-val">{busData.metrics.occupiedCount}</div>
                <div className="seating-metric-label">Allocated</div>
              </div>

              <div className="seating-metric-chip metric-green">
                <div className="seating-metric-val">{busData.metrics.availableCount}</div>
                <div className="seating-metric-label">Available</div>
              </div>

              <div className="seating-metric-chip metric-amber">
                <div className="seating-metric-val">{busData.metrics.occupancyRate}%</div>
                <div className="seating-metric-label">Occupancy</div>
              </div>
            </div>
          )}
        </section>

        {/* 3. Seat Legend Card */}
        <section className="seating-legend-card" aria-label="Seat Legend">
          <span className="legend-title">Seat Legend:</span>

          <div className="legend-item">
            <div className="legend-swatch swatch-avail" />
            <span>Available (Click to Allocate)</span>
          </div>

          <div className="legend-item">
            <div className="legend-swatch swatch-occupied" />
            <span>Allocated to Student</span>
          </div>

          <div className="legend-item">
            <div className="legend-swatch swatch-staff" />
            <span>Faculty / Reserved</span>
          </div>

          <div className="legend-item">
            <div className="legend-swatch swatch-driver" />
            <span>Driver Cabin (Front RHD)</span>
          </div>
        </section>

        {/* 4. Interactive Visual Bus Seat Map Card */}
        <section className="seating-map-card" aria-label="Interactive Seat Map">
          <div className="seating-card-header">
            <h3 className="seating-card-title">
              Interactive Bus Seating Map • Bus #{selectedVehicleId}{" "}
              {busData?.vehicle?.registrationno ? `(${busData.vehicle.registrationno})` : ""}
            </h3>
            <p className="seating-card-subtitle">
              Click an available seat to assign a passenger, or click an occupied seat to view allocation details / deallocate.
            </p>
          </div>

          <div className="bus-layout-wrapper">
            {loading ? (
              <div style={{ padding: "48px", textAlign: "center", color: "#64748b" }}>
                Loading interactive seating chart...
              </div>
            ) : busData ? (
              <div className="bus-chassis">
                {/* Bus Front Windshield & Cabins */}
                <div className="bus-cabin-front">
                  <div className="bus-entry-door" title="Passenger Entry Door">
                    🚪 Passenger Entry Door
                  </div>

                  <div className="bus-windshield">
                    🚌 FRONT WINDSHIELD • BUS #{selectedVehicleId} ({busData.vehicle?.registrationno})
                  </div>

                  <div className="bus-driver-area" title="Driver Cabin (Front RHD)">
                    💺 Driver Cabin
                  </div>
                </div>

                {/* 2x2 Seating Grid Rows (1 to N) */}
                <div className="bus-rows-container">
                  {Object.keys(groupedRows.normalRows).map((rowNum) => {
                    const r = groupedRows.normalRows[rowNum];
                    return (
                      <div key={rowNum} className="bus-row">
                        <div className="row-label">R{rowNum}</div>

                        {/* Column A (Left Window) */}
                        {r["A"] ? (
                          <div
                            className={`bus-seat ${
                              r["A"].is_occupied
                                ? r["A"].role === "Staff"
                                  ? "seat-staff"
                                  : "seat-occupied"
                                : "seat-avail"
                            }`}
                            onClick={() => handleSeatClick(r["A"])}
                            title={
                              r["A"].is_occupied
                                ? `${r["A"].passenger_name} (${r["A"].rollno || "Allocated"}) - Click to view`
                                : `Seat ${r["A"].seat_no} is Available - Click to allocate`
                            }
                          >
                            <span className="seat-number-tag">{r["A"].seat_no}</span>
                            {r["A"].is_occupied ? (
                              <span className="seat-passenger-initials">
                                {r["A"].passenger_name?.split(" ")[0] || "Occupied"}
                              </span>
                            ) : (
                              <span className="seat-status-sub">+ Assign</span>
                            )}
                          </div>
                        ) : (
                          <div />
                        )}

                        {/* Column B (Left Aisle) */}
                        {r["B"] ? (
                          <div
                            className={`bus-seat ${
                              r["B"].is_occupied
                                ? r["B"].role === "Staff"
                                  ? "seat-staff"
                                  : "seat-occupied"
                                : "seat-avail"
                            }`}
                            onClick={() => handleSeatClick(r["B"])}
                            title={
                              r["B"].is_occupied
                                ? `${r["B"].passenger_name} (${r["B"].rollno || "Allocated"}) - Click to view`
                                : `Seat ${r["B"].seat_no} is Available - Click to allocate`
                            }
                          >
                            <span className="seat-number-tag">{r["B"].seat_no}</span>
                            {r["B"].is_occupied ? (
                              <span className="seat-passenger-initials">
                                {r["B"].passenger_name?.split(" ")[0] || "Occupied"}
                              </span>
                            ) : (
                              <span className="seat-status-sub">+ Assign</span>
                            )}
                          </div>
                        ) : (
                          <div />
                        )}

                        {/* Center Gangway / Aisle */}
                        <div className="aisle-gap">AISLE</div>

                        {/* Column C (Right Aisle) */}
                        {r["C"] ? (
                          <div
                            className={`bus-seat ${
                              r["C"].is_occupied
                                ? r["C"].role === "Staff"
                                  ? "seat-staff"
                                  : "seat-occupied"
                                : "seat-avail"
                            }`}
                            onClick={() => handleSeatClick(r["C"])}
                            title={
                              r["C"].is_occupied
                                ? `${r["C"].passenger_name} (${r["C"].rollno || "Allocated"}) - Click to view`
                                : `Seat ${r["C"].seat_no} is Available - Click to allocate`
                            }
                          >
                            <span className="seat-number-tag">{r["C"].seat_no}</span>
                            {r["C"].is_occupied ? (
                              <span className="seat-passenger-initials">
                                {r["C"].passenger_name?.split(" ")[0] || "Occupied"}
                              </span>
                            ) : (
                              <span className="seat-status-sub">+ Assign</span>
                            )}
                          </div>
                        ) : (
                          <div />
                        )}

                        {/* Column D (Right Window) */}
                        {r["D"] ? (
                          <div
                            className={`bus-seat ${
                              r["D"].is_occupied
                                ? r["D"].role === "Staff"
                                  ? "seat-staff"
                                  : "seat-occupied"
                                : "seat-avail"
                            }`}
                            onClick={() => handleSeatClick(r["D"])}
                            title={
                              r["D"].is_occupied
                                ? `${r["D"].passenger_name} (${r["D"].rollno || "Allocated"}) - Click to view`
                                : `Seat ${r["D"].seat_no} is Available - Click to allocate`
                            }
                          >
                            <span className="seat-number-tag">{r["D"].seat_no}</span>
                            {r["D"].is_occupied ? (
                              <span className="seat-passenger-initials">
                                {r["D"].passenger_name?.split(" ")[0] || "Occupied"}
                              </span>
                            ) : (
                              <span className="seat-status-sub">+ Assign</span>
                            )}
                          </div>
                        ) : (
                          <div />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Rear 5-Seat Bench */}
                {groupedRows.rearSeats.length > 0 && (
                  <div className="bus-rear-row">
                    <div className="rear-bench-label">REAR 5-SEAT BENCH</div>
                    <div className="rear-bench-grid">
                      {groupedRows.rearSeats.map((seat) => (
                        <div
                          key={seat.seat_no}
                          className={`bus-seat ${
                            seat.is_occupied
                              ? seat.role === "Staff"
                                ? "seat-staff"
                                : "seat-occupied"
                              : "seat-avail"
                          }`}
                          onClick={() => handleSeatClick(seat)}
                          title={
                            seat.is_occupied
                              ? `${seat.passenger_name} (${seat.rollno || "Allocated"}) - Click to view`
                              : `Seat ${seat.seat_no} is Available - Click to allocate`
                          }
                        >
                          <span className="seat-number-tag">{seat.seat_no}</span>
                          {seat.is_occupied ? (
                            <span className="seat-passenger-initials">
                              {seat.passenger_name?.split(" ")[0] || "Occupied"}
                            </span>
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
        </section>

        {/* 5. Passenger Registry Table Card with Fixed 5-Row Pagination */}
        <section className="seating-table-card" aria-label="Passenger Registry">
          <div className="seating-table-header-bar">
            <h3 className="seating-table-title">
              Bus #{selectedVehicleId} Seating Passenger Registry{" "}
              {busData?.vehicle?.registrationno ? `(${busData.vehicle.registrationno})` : ""}
            </h3>

            <div className="seating-search-box">
              <Search size={14} color="#94a3b8" />
              <input
                type="text"
                placeholder="Search seat, student, roll no..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                aria-label="Search passenger registry"
              />
              {tableSearch && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => setTableSearch("")}
                  title="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          <div className="seating-table-responsive">
            <table className="seating-table">
              <thead>
                <tr>
                  <th style={{ width: "85px" }}>Seat No</th>
                  <th style={{ width: "130px" }}>Position</th>
                  <th style={{ width: "110px" }}>Status</th>
                  <th>Passenger Name</th>
                  <th>Roll No / Staff ID</th>
                  <th>Department & Year</th>
                  <th>Boarding Stop</th>
                  <th>Contact</th>
                  <th style={{ textAlign: "center", width: "120px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedSeats.length > 0 ? (
                  paginatedSeats.map((s) => (
                    <tr key={s.seat_no}>
                      <td>
                        <span className="seating-seat-badge">{s.seat_no}</span>
                      </td>
                      <td>
                        <span className="seating-pos-sub">
                          {s.side} ({s.position})
                        </span>
                      </td>
                      <td>
                        <span
                          className={
                            s.is_occupied
                              ? "seating-badge-allocated"
                              : "seating-badge-available"
                          }
                        >
                          {s.is_occupied ? (
                            <>
                              <UserCheck size={11} /> Allocated
                            </>
                          ) : (
                            <>
                              <Armchair size={11} /> Available
                            </>
                          )}
                        </span>
                      </td>
                      <td>
                        <strong>{s.passenger_name || "—"}</strong>
                      </td>
                      <td>
                        {s.rollno ? (
                          <span className="seating-code-roll">{s.rollno}</span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>{s.branch ? `${s.branch} (${s.year || "N/A"})` : "—"}</td>
                      <td>{s.stage_name || "—"}</td>
                      <td>{s.phoneno || "—"}</td>
                      <td style={{ textAlign: "center" }}>
                        {s.is_occupied ? (
                          <button
                            type="button"
                            className="seating-btn-action-delete"
                            onClick={() => handleDeallocate(s.seat_no)}
                            disabled={isDeallocating}
                            title="Remove allocation for this seat"
                          >
                            <UserX size={12} />
                            <span>Remove</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="seating-btn-action-primary"
                            onClick={() => handleSeatClick(s)}
                            title="Assign passenger to this seat"
                          >
                            <Armchair size={12} />
                            <span>Assign</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9">
                      <div className="table-empty-box">
                        <Users size={36} strokeWidth={1.5} color="#94a3b8" />
                        <h4>No Seats or Passengers Found</h4>
                        <p>
                          {tableSearch
                            ? `No records match your search query "${tableSearch}". Clear your search to view all seats.`
                            : "No seat records available for this vehicle."}
                        </p>
                        {tableSearch && (
                          <button
                            type="button"
                            className="vm-btn-secondary"
                            onClick={() => setTableSearch("")}
                            style={{ marginTop: "8px" }}
                          >
                            Clear Search
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 6. Fixed 5-Row Pagination Footer (No rows-per-page dropdown) */}
          <div className="seating-pagination-bar">
            <div className="pagination-left">
              <span className="pagination-records-info">
                Showing {startIndex}–{endIndex} of {filteredTableSeats.length}{" "}
                {filteredTableSeats.length === 1 ? "passenger" : "passengers"}
              </span>
            </div>

            <div className="pagination-controls-wrap">
              <button
                type="button"
                className="pg-nav-btn"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                aria-label="Previous Page"
              >
                <ChevronLeft size={14} />
                <span>Prev</span>
              </button>

              <div className="pg-num-list">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => {
                  if (
                    totalPages <= 7 ||
                    pg === 1 ||
                    pg === totalPages ||
                    Math.abs(pg - currentPage) <= 1
                  ) {
                    return (
                      <button
                        key={pg}
                        type="button"
                        className={`pg-num-btn ${currentPage === pg ? "active" : ""}`}
                        onClick={() => setCurrentPage(pg)}
                        aria-current={currentPage === pg ? "page" : undefined}
                      >
                        {pg}
                      </button>
                    );
                  }
                  if (
                    (pg === 2 && currentPage > 3) ||
                    (pg === totalPages - 1 && currentPage < totalPages - 2)
                  ) {
                    return (
                      <span
                        key={pg}
                        style={{ padding: "0 4px", color: "#94a3b8", fontSize: "0.8rem" }}
                      >
                        ...
                      </span>
                    );
                  }
                  return null;
                })}
              </div>

              <button
                type="button"
                className="pg-nav-btn"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || filteredTableSeats.length === 0}
                aria-label="Next Page"
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Modal: Allocate Seat */}
      {allocateModal.open && allocateModal.seat && (
        <div
          className="seating-modal-backdrop"
          onClick={() => setAllocateModal({ open: false, seat: null })}
        >
          <div className="seating-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="seating-modal-header">
              <h3>Allocate Seat {allocateModal.seat.seat_no}</h3>
              <button
                type="button"
                className="seating-modal-close"
                onClick={() => setAllocateModal({ open: false, seat: null })}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmAllocate}>
              <div className="seating-modal-body">
                <div className="seating-callout-info">
                  <p className="seating-callout-title">
                    Selected Seat: {allocateModal.seat.seat_no} ({allocateModal.seat.side} •{" "}
                    {allocateModal.seat.position})
                  </p>
                  <p className="seating-callout-desc">
                    Vehicle #{selectedVehicleId} • Route {busData?.vehicle?.routeid} (
                    {busData?.vehicle?.routename})
                  </p>
                </div>

                <div className="seating-form-group">
                  <label htmlFor="passenger-select">Select Unassigned Route Passenger*</label>
                  <select
                    id="passenger-select"
                    className="seating-form-control"
                    required
                    value={selectedPassengerId}
                    onChange={(e) => setSelectedPassengerId(e.target.value)}
                  >
                    <option value="">-- Choose student or faculty --</option>
                    {(busData?.unassignedPassengers || []).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.rollno || "No ID"}) — {p.branch || "General"}{" "}
                        {p.year ? `(${p.year})` : ""} [Stop: {p.stage_name || p.point || "Campus"}]
                      </option>
                    ))}
                  </select>

                  {busData?.unassignedPassengers?.length === 0 && (
                    <p style={{ color: "#d97706", fontSize: "0.78rem", margin: "6px 0 0 0" }}>
                      All registered passengers on this route have already been allocated seats!
                    </p>
                  )}
                </div>
              </div>

              <div className="seating-modal-footer">
                <button
                  type="button"
                  className="vm-btn-secondary"
                  onClick={() => setAllocateModal({ open: false, seat: null })}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="vm-btn-primary"
                  disabled={!selectedPassengerId || isSubmittingAllocation}
                >
                  <CheckCircle2 size={15} />
                  <span>{isSubmittingAllocation ? "Allocating..." : "Confirm Allocation"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Occupied Seat Details */}
      {seatDetailsModal.open && seatDetailsModal.seat && (
        <div
          className="seating-modal-backdrop"
          onClick={() => setSeatDetailsModal({ open: false, seat: null })}
        >
          <div className="seating-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="seating-modal-header">
              <h3>Seat {seatDetailsModal.seat.seat_no} Allocation Details</h3>
              <button
                type="button"
                className="seating-modal-close"
                onClick={() => setSeatDetailsModal({ open: false, seat: null })}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="seating-modal-body">
              <div className="seating-passenger-detail-card">
                <div className="seating-passenger-detail-header">
                  <div className="seating-detail-avatar">
                    <UserCheck size={20} />
                  </div>
                  <div>
                    <h4>{seatDetailsModal.seat.passenger_name || "Assigned Passenger"}</h4>
                    <p>
                      Seat {seatDetailsModal.seat.seat_no} • {seatDetailsModal.seat.side} (
                      {seatDetailsModal.seat.position})
                    </p>
                  </div>
                </div>

                <div className="seating-detail-grid">
                  <div className="seating-detail-item">
                    <span className="seating-detail-label">Roll No / ID</span>
                    <span className="seating-detail-val">
                      {seatDetailsModal.seat.rollno || "—"}
                    </span>
                  </div>

                  <div className="seating-detail-item">
                    <span className="seating-detail-label">Role</span>
                    <span className="seating-detail-val">
                      {seatDetailsModal.seat.role || "Student"}
                    </span>
                  </div>

                  <div className="seating-detail-item">
                    <span className="seating-detail-label">Department & Year</span>
                    <span className="seating-detail-val">
                      {seatDetailsModal.seat.branch || "—"}{" "}
                      {seatDetailsModal.seat.year ? `(${seatDetailsModal.seat.year})` : ""}
                    </span>
                  </div>

                  <div className="seating-detail-item">
                    <span className="seating-detail-label">Boarding Stop</span>
                    <span className="seating-detail-val">
                      {seatDetailsModal.seat.stage_name || "Campus Gate"}
                    </span>
                  </div>

                  <div className="seating-detail-item">
                    <span className="seating-detail-label">Contact Phone</span>
                    <span className="seating-detail-val">
                      {seatDetailsModal.seat.phoneno || "—"}
                    </span>
                  </div>

                  <div className="seating-detail-item">
                    <span className="seating-detail-label">Allocated Date</span>
                    <span className="seating-detail-val">
                      {seatDetailsModal.seat.allocated_at || "Academic Term Start"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="seating-modal-footer">
              <button
                type="button"
                className="btn-danger"
                onClick={() => handleDeallocate(seatDetailsModal.seat.seat_no)}
                disabled={isDeallocating}
                title="Deallocate and free this seat"
              >
                <UserX size={15} />
                <span>{isDeallocating ? "Deallocating..." : "Deallocate / Free Seat"}</span>
              </button>
              <button
                type="button"
                className="vm-btn-secondary"
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
