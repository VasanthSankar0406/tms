import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  Bus,
  Users,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  Search,
  MapPin,
  Route,
  LayoutDashboard,
  FileSpreadsheet,
  X,
  ChevronLeft,
  ChevronRight,
  Gauge
} from 'lucide-react';
import { API_URL } from '../config';
import { exportToExcel } from './ReportGenerator';
import '../styles/CapacityManagement.css';

const CapacityManagement = () => {
  const navigate = useNavigate();

  // State
  const [capacities, setCapacities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRoute, setFilterRoute] = useState('All');
  const [filterCity, setFilterCity] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  // Pagination (Strictly 5 per page)
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;

  // Flash card notification (3-second auto dismiss)
  const [flashCard, setFlashCard] = useState(null);
  const flashTimerRef = useRef(null);

  const showFlash = (message, type = 'success', title = '') => {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    const defaultTitle =
      type === 'danger' ? 'Capacity Alert' : type === 'warning' ? 'Notice' : 'Success';
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

  // Fetch Capacities from Backend
  const fetchCapacities = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    else setLoading(true);

    try {
      const res = await axios.get(`${API_URL}/api/capacity-management`);
      if (res.data && Array.isArray(res.data.capacities)) {
        setCapacities(res.data.capacities);
        if (isManualRefresh) {
          showFlash('Fleet capacity records refreshed successfully!', 'success', 'Data Synchronized');
        }
      } else {
        setCapacities([]);
      }
    } catch (err) {
      console.error('Error fetching capacity data:', err);
      showFlash('Failed to load fleet capacity metrics. Please retry.', 'danger', 'Connection Error');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCapacities();
  }, [fetchCapacities]);

  // Derived Vehicle Items with strict capacity calculations
  const enhancedCapacities = useMemo(() => {
    return capacities.map((c) => {
      const seatCapacity = Number(c.seatcapacity) || 0;
      const assignedPassengers = Number(c.assignedPassengers) || 0;
      const occupancyRate = seatCapacity > 0 ? Math.round((assignedPassengers / seatCapacity) * 100) : 0;
      const availableSeats = seatCapacity - assignedPassengers;

      // Status Definition:
      // Normal: within capacity (< 75% occupancy and assigned <= capacity)
      // Near Capacity: occupancy is 75% or above but assigned <= capacity (do not classify as over capacity when equal)
      // Over Capacity: assigned passengers strictly exceed seating capacity
      let capacityStatus = 'Normal';
      if (assignedPassengers > seatCapacity) {
        capacityStatus = 'Over Capacity';
      } else if (occupancyRate >= 75) {
        capacityStatus = 'Near Capacity';
      } else {
        capacityStatus = 'Normal';
      }

      return {
        ...c,
        seatCapacity,
        assignedPassengers,
        occupancyRate,
        availableSeats,
        capacityStatus
      };
    });
  }, [capacities]);

  // Fleet Summary Metrics
  const summaryMetrics = useMemo(() => {
    const totalBuses = enhancedCapacities.length;
    const totalPassengers = enhancedCapacities.reduce((acc, c) => acc + c.assignedPassengers, 0);
    const totalCapacity = enhancedCapacities.reduce((acc, c) => acc + c.seatCapacity, 0);
    const avgOccupancy = totalCapacity > 0 ? Math.round((totalPassengers / totalCapacity) * 100) : 0;
    const overAllocatedCount = enhancedCapacities.filter((c) => c.capacityStatus === 'Over Capacity').length;
    const nearCapacityCount = enhancedCapacities.filter((c) => c.capacityStatus === 'Near Capacity').length;

    return {
      totalBuses,
      totalPassengers,
      totalCapacity,
      avgOccupancy,
      overAllocatedCount,
      nearCapacityCount
    };
  }, [enhancedCapacities]);

  // Distinct Filter Options derived from existing data
  const availableRoutes = useMemo(() => {
    const map = new Map();
    enhancedCapacities.forEach((c) => {
      if (c.routeid && c.routeid !== 'Unassigned') {
        map.set(c.routeid, `${c.routeid} — ${c.routename || 'Route'}`);
      }
    });
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [enhancedCapacities]);

  const availableCities = useMemo(() => {
    const set = new Set();
    enhancedCapacities.forEach((c) => {
      if (c.city && c.city !== 'Depot' && c.city !== 'Unassigned') {
        set.add(c.city);
      }
    });
    return Array.from(set).sort();
  }, [enhancedCapacities]);

  // Filtering Logic
  const filteredCapacities = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return enhancedCapacities.filter((c) => {
      // 1. Search by vehicle ID or registration number
      if (query) {
        const matchVeh = String(c.vehicleid).toLowerCase().includes(query);
        const matchReg = String(c.registrationno || '').toLowerCase().includes(query);
        if (!matchVeh && !matchReg) return false;
      }

      // 2. Filter by Route
      if (filterRoute !== 'All') {
        if (c.routeid !== filterRoute) return false;
      }

      // 3. Filter by City
      if (filterCity !== 'All') {
        if (c.city !== filterCity) return false;
      }

      // 4. Filter by Capacity Status
      if (filterStatus !== 'All') {
        if (c.capacityStatus !== filterStatus) return false;
      }

      return true;
    });
  }, [enhancedCapacities, searchTerm, filterRoute, filterCity, filterStatus]);

  // Reset pagination to page 1 on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterRoute, filterCity, filterStatus]);

  // Check if any filters are active
  const isFilterActive =
    searchTerm.trim() !== '' ||
    filterRoute !== 'All' ||
    filterCity !== 'All' ||
    filterStatus !== 'All';

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterRoute('All');
    setFilterCity('All');
    setFilterStatus('All');
    setCurrentPage(1);
  };

  // Pagination Calculations (Strictly 5 records per page)
  const totalPages = Math.max(1, Math.ceil(filteredCapacities.length / rowsPerPage));
  const startIndex = filteredCapacities.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const endIndex = Math.min(currentPage * rowsPerPage, filteredCapacities.length);

  const paginatedCapacities = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredCapacities.slice(start, start + rowsPerPage);
  }, [filteredCapacities, currentPage, rowsPerPage]);

  // Export to Excel handler
  const handleExportExcel = () => {
    if (filteredCapacities.length === 0) {
      showFlash('No vehicle capacity records available to export.', 'warning');
      return;
    }

    const exportRows = filteredCapacities.map((c, idx) => ({
      'S.No': idx + 1,
      'Vehicle ID': `Bus #${c.vehicleid}`,
      'Registration No': c.registrationno || '—',
      'Vehicle Type': c.vehicletype || 'Standard',
      'Route ID': c.routeid || 'Unassigned',
      'Route Name': c.routename || 'Unassigned',
      'City / Depot': c.city || 'Depot',
      'Seating Capacity': c.seatCapacity,
      'Assigned Passengers': c.assignedPassengers,
      'Occupancy (%)': `${c.occupancyRate}%`,
      'Available Seats': c.availableSeats,
      'Capacity Status': c.capacityStatus
    }));

    exportToExcel(exportRows, 'Bus_Seating_And_Route_Load_Report');
    showFlash('Capacity report exported to Excel successfully!', 'success', 'Export Complete');
  };

  return (
    <div className="capacity-master-container">
      <div className="capacity-box-wrapper">
        {/* 3-Second Auto-Dismissing Flash Notification */}
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

        {/* 1. Breadcrumbs Navigation */}
        <nav className="vm-breadcrumb-nav" aria-label="Breadcrumb">
          <span className="link" onClick={() => navigate('/home')}>
            Dashboard
          </span>
          <span className="sep">/</span>
          <span className="link" onClick={() => navigate('/home')}>
            Capacity & Analytics
          </span>
          <span className="sep">/</span>
          <span className="current">Bus Seating & Route Load</span>
        </nav>

        {/* 2. Compact Page Heading */}
        <header className="vm-page-header">
          <div className="vm-header-left">
            <div className="vm-title-row">
              <div className="vm-title-icon-badge" title="Bus Seating & Route Load">
                <Gauge size={19} />
              </div>
              <h1 className="vm-page-title">Bus Seating & Route Load</h1>
              <span className="vm-total-count-badge">
                {capacities.length} {capacities.length === 1 ? 'Bus Monitored' : 'Buses Monitored'}
              </span>
            </div>
            <p className="vm-page-subtitle">
              Monitor fleet capacity, passenger allocation, route utilization, and seat availability.
            </p>
          </div>

          <div className="vm-header-actions">
            <button
              type="button"
              className="vm-btn-secondary"
              onClick={() => fetchCapacities(true)}
              disabled={isRefreshing}
              title="Refresh seating capacity data"
            >
              <RotateCcw size={15} className={isRefreshing ? 'spin-icon' : ''} />
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>

            <button
              type="button"
              className="vm-btn-secondary"
              onClick={handleExportExcel}
              disabled={filteredCapacities.length === 0}
              title="Export capacity data to Excel report"
            >
              <FileSpreadsheet size={15} />
              <span>Export Report</span>
            </button>

            <button
              type="button"
              className="vm-btn-secondary"
              onClick={() => navigate('/home')}
              title="Return to operations dashboard"
            >
              <LayoutDashboard size={15} />
              <span>Back to Dashboard</span>
            </button>
          </div>
        </header>

        {/* 3. Summary Statistics Cards (Four Equal-Width Cards in a Single Row) */}
        <section className="capacity-summary-grid" aria-label="Summary Fleet Capacity Statistics">
          {/* Card 1 — Total Fleet Buses */}
          <div className="capacity-summary-card">
            <div className="summary-icon-box summary-icon-blue">
              <Bus size={20} />
            </div>
            <div className="summary-card-content">
              <div className="summary-card-value-row">
                <span className="summary-card-value">{summaryMetrics.totalBuses}</span>
                <span className="summary-card-badge badge-green">Active Fleet</span>
              </div>
              <span className="summary-card-label">Total Fleet Buses</span>
              <span className="summary-card-sub">Vehicles monitored for seating capacity.</span>
            </div>
          </div>

          {/* Card 2 — Total Transport Passengers */}
          <div className="capacity-summary-card">
            <div className="summary-icon-box summary-icon-emerald">
              <Users size={20} />
            </div>
            <div className="summary-card-content">
              <div className="summary-card-value-row">
                <span className="summary-card-value">{summaryMetrics.totalPassengers}</span>
                <span className="summary-card-badge badge-green">Allocated</span>
              </div>
              <span className="summary-card-label">Total Transport Passengers</span>
              <span className="summary-card-sub">Passengers assigned across active routes.</span>
            </div>
          </div>

          {/* Card 3 — Average Occupancy */}
          <div className="capacity-summary-card">
            <div className="summary-icon-box summary-icon-purple">
              <Gauge size={20} />
            </div>
            <div className="summary-card-content">
              <div className="summary-card-value-row">
                <span
                  className={`summary-card-value ${
                    summaryMetrics.avgOccupancy >= 90
                      ? 'color-red'
                      : summaryMetrics.avgOccupancy >= 75
                      ? 'color-amber'
                      : 'color-green'
                  }`}
                >
                  {summaryMetrics.avgOccupancy}%
                </span>
                <span
                  className={`summary-card-badge ${
                    summaryMetrics.avgOccupancy >= 90
                      ? 'badge-red'
                      : summaryMetrics.avgOccupancy >= 75
                      ? 'badge-amber'
                      : 'badge-green'
                  }`}
                >
                  {summaryMetrics.avgOccupancy >= 90
                    ? 'High Load'
                    : summaryMetrics.avgOccupancy >= 75
                    ? 'Moderate'
                    : 'Optimal'}
                </span>
              </div>
              <div className="summary-progress-bar-wrap">
                <div className="summary-progress-bar-track">
                  <div
                    className="summary-progress-bar-fill"
                    style={{
                      width: `${Math.min(100, Math.max(0, summaryMetrics.avgOccupancy))}%`,
                      backgroundColor:
                        summaryMetrics.avgOccupancy >= 90
                          ? '#dc2626'
                          : summaryMetrics.avgOccupancy >= 75
                          ? '#d97706'
                          : '#16a34a'
                    }}
                  />
                </div>
              </div>
              <span className="summary-card-label" style={{ marginTop: '5px' }}>Average Occupancy</span>
              <span className="summary-card-sub">Fleet-wide seat utilization.</span>
            </div>
          </div>

          {/* Card 4 — Over-Allocation Alerts */}
          <div className="capacity-summary-card">
            <div
              className={`summary-icon-box ${
                summaryMetrics.overAllocatedCount > 0
                  ? 'summary-icon-rose'
                  : summaryMetrics.nearCapacityCount > 0
                  ? 'summary-icon-amber'
                  : 'summary-icon-emerald'
              }`}
            >
              {summaryMetrics.overAllocatedCount > 0 ? (
                <AlertTriangle size={20} />
              ) : summaryMetrics.nearCapacityCount > 0 ? (
                <AlertCircle size={20} />
              ) : (
                <CheckCircle2 size={20} />
              )}
            </div>
            <div className="summary-card-content">
              <div className="summary-card-value-row">
                <span
                  className={`summary-card-value ${
                    summaryMetrics.overAllocatedCount > 0
                      ? 'color-red'
                      : summaryMetrics.nearCapacityCount > 0
                      ? 'color-amber'
                      : 'color-green'
                  }`}
                >
                  {summaryMetrics.overAllocatedCount}
                </span>
                <span
                  className={`summary-card-badge ${
                    summaryMetrics.overAllocatedCount > 0
                      ? 'badge-red'
                      : summaryMetrics.nearCapacityCount > 0
                      ? 'badge-amber'
                      : 'badge-green'
                  }`}
                >
                  {summaryMetrics.overAllocatedCount > 0
                    ? 'Critical'
                    : summaryMetrics.nearCapacityCount > 0
                    ? `${summaryMetrics.nearCapacityCount} Near Limit`
                    : 'Zero Warnings'}
                </span>
              </div>
              <span className="summary-card-label">Over-Allocation Alerts</span>
              <span className="summary-card-sub">Vehicles exceeding available seating capacity.</span>
            </div>
          </div>
        </section>

        {/* 4. Dynamic Fleet Health & Warning Banner */}
        {summaryMetrics.overAllocatedCount > 0 ? (
          <aside className="capacity-status-banner banner-danger" role="alert">
            <div className="banner-icon-col">
              <AlertTriangle size={20} />
            </div>
            <div className="banner-copy-col">
              <strong>
                Capacity Over-Allocation Detected: {summaryMetrics.overAllocatedCount} vehicle(s) exceed maximum seating capacity!
              </strong>
              <p>
                Passenger allocations exceed available bus seating. Please re-assign passengers or allot spare vehicles to prevent over-crowding.
              </p>
            </div>
          </aside>
        ) : summaryMetrics.nearCapacityCount > 0 ? (
          <aside className="capacity-status-banner banner-warning" role="status">
            <div className="banner-icon-col">
              <AlertCircle size={20} />
            </div>
            <div className="banner-copy-col">
              <strong>
                Capacity Warning: {summaryMetrics.nearCapacityCount} vehicle(s) are approaching full seating capacity (>= 75%).
              </strong>
              <p>
                Monitor seat allocations carefully when adding new passengers on these routes.
              </p>
            </div>
          </aside>
        ) : (
          <aside className="capacity-status-banner banner-success" role="status">
            <div className="banner-icon-col">
              <CheckCircle2 size={20} />
            </div>
            <div className="banner-copy-col">
              <strong>All Fleet Vehicles Within Capacity</strong>
              <p>
                Passenger allocations are balanced across all active routes with zero over-capacity alerts detected.
              </p>
            </div>
          </aside>
        )}

        {/* 5. Compact Search & Filter Toolbar */}
        <section className="capacity-filter-card" aria-label="Search and filter vehicles">
          <div className="capacity-filter-grid">
            {/* Search by Vehicle ID or Registration */}
            <div className="capacity-filter-field">
              <label htmlFor="search-input">Search Vehicle / Reg No</label>
              <div className="filter-input-with-icon">
                <Search size={15} className="filter-search-icon" />
                <input
                  id="search-input"
                  type="text"
                  className="capacity-filter-input"
                  placeholder="Search Vehicle ID or Reg No..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Filter by Route */}
            <div className="capacity-filter-field">
              <label htmlFor="route-select">Filter by Route</label>
              <select
                id="route-select"
                className="capacity-filter-select"
                value={filterRoute}
                onChange={(e) => setFilterRoute(e.target.value)}
              >
                <option value="All">All Routes</option>
                {availableRoutes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by City */}
            <div className="capacity-filter-field">
              <label htmlFor="city-select">Filter by City</label>
              <select
                id="city-select"
                className="capacity-filter-select"
                value={filterCity}
                onChange={(e) => setFilterCity(e.target.value)}
              >
                <option value="All">All Cities</option>
                {availableCities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Capacity Status */}
            <div className="capacity-filter-field">
              <label htmlFor="status-select">Capacity Status</label>
              <select
                id="status-select"
                className="capacity-filter-select"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="All">All Statuses</option>
                <option value="Normal">Normal (&lt; 75%)</option>
                <option value="Near Capacity">Near Capacity (75%–100%)</option>
                <option value="Over Capacity">Over Capacity (&gt; 100%)</option>
              </select>
            </div>

            {/* Reset Filters Button */}
            <div className="capacity-filter-actions">
              <button
                type="button"
                className={`capacity-btn-reset-filters ${isFilterActive ? 'active' : ''}`}
                onClick={handleResetFilters}
                disabled={!isFilterActive}
                title="Reset all search filters"
              >
                <RotateCcw size={14} />
                <span>Reset Filters</span>
              </button>
            </div>
          </div>
        </section>

        {/* 6. Vehicle Capacity & Route Passenger Load Table Container */}
        <section className="capacity-table-card" aria-label="Vehicle Capacity Table">
          <div className="capacity-table-card-header">
            <div className="capacity-table-card-titles">
              <h2 className="capacity-table-card-title">Vehicle Capacity & Route Passenger Load</h2>
              <p className="capacity-table-card-subtitle">
                Compare passenger counts, seating capacity, and available seats for each vehicle.
              </p>
            </div>
            <div className="capacity-table-card-actions">
              <span className="pagination-info-text">
                Showing <strong>{startIndex}–{endIndex}</strong> of <strong>{filteredCapacities.length}</strong> vehicles
              </span>
            </div>
          </div>

          <div className="capacity-table-responsive">
            <table className="capacity-roster-table">
              <thead>
                <tr>
                  <th className="col-sno">S.No</th>
                  <th>Vehicle ID</th>
                  <th>Registration No</th>
                  <th>Route ID & City</th>
                  <th style={{ textAlign: 'center' }}>Seating Capacity</th>
                  <th style={{ textAlign: 'center' }}>Assigned Passengers</th>
                  <th>Occupancy</th>
                  <th style={{ textAlign: 'center' }}>Available Seats</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="9" className="capacity-table-empty">
                      <div className="empty-state-icon-box">
                        <RotateCcw size={22} className="spin-icon" />
                      </div>
                      <div className="empty-state-title">Loading fleet capacity analytics...</div>
                      <div className="empty-state-sub">Fetching latest route passenger allocations and bus capacities.</div>
                    </td>
                  </tr>
                ) : paginatedCapacities.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="capacity-table-empty">
                      <div className="empty-state-icon-box">
                        <Search size={22} />
                      </div>
                      <div className="empty-state-title">No matching vehicles found</div>
                      <div className="empty-state-sub">
                        {isFilterActive
                          ? 'No vehicles match your current search or filter criteria.'
                          : 'No vehicle records found in the transport database.'}
                      </div>
                      {isFilterActive && (
                        <button
                          type="button"
                          className="capacity-btn-reset-filters active"
                          onClick={handleResetFilters}
                          style={{ margin: '0 auto' }}
                        >
                          <RotateCcw size={14} />
                          <span>Clear All Filters</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  paginatedCapacities.map((c, index) => {
                    const rowNumber = (currentPage - 1) * rowsPerPage + index + 1;

                    // Occupancy styling
                    let occupancyFillClass = 'fill-green';
                    let occupancyTextClass = 'text-green';
                    if (c.occupancyRate >= 90) {
                      occupancyFillClass = 'fill-red';
                      occupancyTextClass = 'text-red';
                    } else if (c.occupancyRate >= 75) {
                      occupancyFillClass = 'fill-amber';
                      occupancyTextClass = 'text-amber';
                    }

                    // Available seats styling
                    let seatsClass = 'positive';
                    let seatsLabel = `${c.availableSeats} Seats Available`;
                    if (c.availableSeats < 0) {
                      seatsClass = 'negative';
                      seatsLabel = `${Math.abs(c.availableSeats)} Seats Over`;
                    } else if (c.availableSeats === 0) {
                      seatsClass = 'zero';
                      seatsLabel = '0 Seats (Full)';
                    }

                    // Status Badge styling
                    let statusClass = 'normal';
                    let statusIcon = <CheckCircle2 size={13} />;
                    if (c.capacityStatus === 'Over Capacity') {
                      statusClass = 'over';
                      statusIcon = <AlertTriangle size={13} />;
                    } else if (c.capacityStatus === 'Near Capacity') {
                      statusClass = 'near';
                      statusIcon = <AlertCircle size={13} />;
                    }

                    return (
                      <tr key={c.vehicleid}>
                        {/* 1. S.No */}
                        <td className="col-sno">{rowNumber}</td>

                        {/* 2. Vehicle ID */}
                        <td className="col-vehicle-id">
                          <span className="cap-vehicle-badge">
                            <Bus size={13} />
                            Bus #{c.vehicleid}
                          </span>
                        </td>

                        {/* 3. Registration No & Vehicle Type */}
                        <td>
                          <div className="cap-reg-block">
                            <span className="cap-reg-badge">{c.registrationno || '—'}</span>
                            <span
                              className={`cap-type-pill ${
                                (c.vehicletype || '').toLowerCase().includes('a/c') &&
                                !(c.vehicletype || '').toLowerCase().includes('non')
                                  ? 'ac'
                                  : ''
                              }`}
                            >
                              {c.vehicletype || 'Standard'}
                            </span>
                          </div>
                        </td>

                        {/* 4. Route ID & City */}
                        <td>
                          <div className="cap-route-block">
                            <div className="cap-route-line">
                              <span className="cap-route-badge">
                                <Route size={12} />
                                {c.routeid}
                              </span>
                              <span>{c.routename}</span>
                            </div>
                            <div className="cap-city-line">
                              <MapPin size={11} />
                              <span>{c.city}</span>
                            </div>
                          </div>
                        </td>

                        {/* 5. Seating Capacity */}
                        <td style={{ textAlign: 'center' }}>
                          <span className="col-num">{c.seatCapacity} Seats</span>
                        </td>

                        {/* 6. Assigned Passengers */}
                        <td style={{ textAlign: 'center' }}>
                          <span className="col-passengers-highlight">
                            {c.assignedPassengers} {c.assignedPassengers === 1 ? 'Passenger' : 'Passengers'}
                          </span>
                        </td>

                        {/* 7. Occupancy with Progress Bar */}
                        <td className="col-occupancy-wrap">
                          <div className="cap-occupancy-row">
                            <div className="cap-progress-track">
                              <div
                                className={`cap-progress-fill ${occupancyFillClass}`}
                                style={{
                                  width: `${Math.min(100, Math.max(0, c.occupancyRate))}%`
                                }}
                              />
                            </div>
                            <span className={`cap-occupancy-pct ${occupancyTextClass}`}>
                              {c.occupancyRate}%
                            </span>
                          </div>
                        </td>

                        {/* 8. Available Seats */}
                        <td style={{ textAlign: 'center' }}>
                          <span className={`cap-seats-badge ${seatsClass}`}>
                            {seatsLabel}
                          </span>
                        </td>

                        {/* 9. Status */}
                        <td>
                          <span className={`cap-status-badge ${statusClass}`}>
                            {statusIcon}
                            {c.capacityStatus}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* 7. Pagination Footer (Strictly 5 vehicles per page) */}
          <footer className="capacity-pagination-footer" aria-label="Table pagination">
            <div className="pagination-info-text">
              Showing <strong>{startIndex}–{endIndex}</strong> of <strong>{filteredCapacities.length}</strong> vehicles
            </div>

            <div className="pagination-controls-group">
              <button
                type="button"
                className="page-nav-btn"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1 || filteredCapacities.length === 0}
                aria-label="Previous page"
              >
                <ChevronLeft size={14} />
                <span>Previous</span>
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  className={`page-num-btn ${currentPage === pageNum ? 'active' : ''}`}
                  onClick={() => setCurrentPage(pageNum)}
                  aria-label={`Go to page ${pageNum}`}
                  aria-current={currentPage === pageNum ? 'page' : undefined}
                >
                  {pageNum}
                </button>
              ))}

              <button
                type="button"
                className="page-nav-btn"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages || filteredCapacities.length === 0}
                aria-label="Next page"
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </footer>
        </section>
      </div>
    </div>
  );
};

export default CapacityManagement;
