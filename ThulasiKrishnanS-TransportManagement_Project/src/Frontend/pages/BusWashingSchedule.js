import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  Bus,
  CheckCircle2,
  Clock,
  RotateCcw,
  FileSpreadsheet,
  Plus,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  Trash2,
  Check,
  Calendar,
  Loader2,
  AlertTriangle,
  Droplets
} from "lucide-react";
import { API_URL } from "../config";
import { exportToExcel } from "./ReportGenerator";
import "../styles/BusWashingSchedule.css";

// Helper for date formatting
const formatDateInput = (date = new Date()) => {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const formatDisplayDate = (dateVal) => {
  if (!dateVal) return "—";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  } catch {
    return String(dateVal);
  }
};

const addDays = (dateStr, days) => {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return formatDateInput(d);
};

const BusWashingSchedule = () => {
  const navigate = useNavigate();

  // Data States
  const [schedules, setSchedules] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [todayDate, setTodayDate] = useState(formatDateInput(new Date()));
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 3-Second Flash Notification State
  const [flashCard, setFlashCard] = useState(null);
  const flashTimerRef = useRef(null);

  const showFlash = (message, type = "success", title = "") => {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    const defaultTitle =
      type === "success" ? "Success" : type === "danger" ? "Error" : "Notice";
    setFlashCard({
      message,
      type,
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

  // Filter States
  const [filterVehicleId, setFilterVehicleId] = useState("");
  const [filterRoute, setFilterRoute] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;

  // Modal States (Schedule New / Edit Schedule)
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // 'add' or 'edit'
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const [formData, setFormData] = useState({
    vehicleid: "",
    scheduled_date: formatDateInput(new Date()),
    wash_type: "Basic Bus Wash",
    service_bay: "Bay 1 - Automated Wash",
    cleaner_incharge: "Express Fleet Cleaners",
    scheduled_time: "10:00 AM",
    remarks: "Recurring wash every 30 days"
  });

  // Action Confirmation Modals
  const [completingSchedule, setCompletingSchedule] = useState(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [viewingSchedule, setViewingSchedule] = useState(null);
  const [deletingSchedule, setDeletingSchedule] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Washing Types & Bays
  const WASH_TYPES = [
    "Basic Bus Wash",
    "Exterior Foam Wash & Rinse",
    "Deep Interior & Exterior Detailing",
    "Chassis & Underbody Pressure Wash",
    "Engine Bay & Sanitization Wash"
  ];

  const SERVICE_BAYS = [
    "Bay 1 - Automated Wash Tunnel",
    "Bay 2 - Manual High-Pressure Detailing",
    "Bay 3 - Interior Vacuum & Foam Station",
    "Bay 4 - Inspection & Polish Station"
  ];

  // Fetch All Initial Data
  const fetchData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [washRes, vehRes, routeRes] = await Promise.all([
        axios.get(`${API_URL}/api/bus-washing`),
        axios.get(`${API_URL}/getVehicle`),
        axios.get(`${API_URL}/getRoute`)
      ]);

      if (washRes.data && Array.isArray(washRes.data.schedules)) {
        setSchedules(washRes.data.schedules);
        if (washRes.data.todayDate) setTodayDate(washRes.data.todayDate);
      }

      if (vehRes.data && Array.isArray(vehRes.data)) {
        setVehicles(vehRes.data);
      }

      if (routeRes.data && Array.isArray(routeRes.data.value)) {
        setRoutes(routeRes.data.value);
      } else if (Array.isArray(routeRes.data)) {
        setRoutes(routeRes.data);
      }
    } catch (err) {
      console.error("Error loading washing schedules:", err);
      showFlash("Failed to fetch bus washing schedules.", "danger");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Derived Status for each schedule item
  const getDerivedStatus = useCallback(
    (item) => {
      if (item.status === "Completed") return "Completed";
      if (!item.scheduled_date) return "Upcoming";
      if (item.scheduled_date === todayDate) return "Due Today";
      if (item.scheduled_date < todayDate) return "Overdue";
      return "Upcoming";
    },
    [todayDate]
  );

  // Friendly Day Remaining calculation
  const getDayCountdown = useCallback(
    (item) => {
      if (item.status === "Completed") {
        return { text: "Completed", type: "completed" };
      }
      if (!item.scheduled_date) {
        return { text: "—", type: "upcoming" };
      }
      const sched = new Date(`${item.scheduled_date}T00:00:00`);
      const curr = new Date(`${todayDate}T00:00:00`);
      const diffDays = Math.ceil((sched - curr) / 86400000);

      if (diffDays === 0) {
        return { text: "Due today", type: "due" };
      }
      if (diffDays > 0) {
        return {
          text: `Due in ${diffDays} day${diffDays === 1 ? "" : "s"}`,
          type: "upcoming"
        };
      }
      const overdueDays = Math.abs(diffDays);
      return {
        text: `Overdue by ${overdueDays} day${overdueDays === 1 ? "" : "s"}`,
        type: "overdue"
      };
    },
    [todayDate]
  );

  // Dynamic Summary Metrics
  const summaryMetrics = useMemo(() => {
    const totalBuses = schedules.length;
    let dueToday = 0;
    let upcoming = 0;
    let overdue = 0;

    schedules.forEach((s) => {
      const st = getDerivedStatus(s);
      if (st === "Due Today") dueToday++;
      else if (st === "Upcoming") upcoming++;
      else if (st === "Overdue") overdue++;
    });

    return {
      totalBuses,
      dueToday,
      upcoming,
      overdue
    };
  }, [schedules, getDerivedStatus]);

  // Filtered Schedules
  const filteredSchedules = useMemo(() => {
    return schedules.filter((item) => {
      // Vehicle Filter
      if (filterVehicleId) {
        if (String(item.vehicleid) !== String(filterVehicleId)) return false;
      }

      // Route Filter
      if (filterRoute) {
        if (String(item.routeid) !== String(filterRoute)) return false;
      }

      // Status Filter
      if (filterStatus && filterStatus !== "All") {
        const itemDerivedStatus = getDerivedStatus(item);
        if (itemDerivedStatus.toLowerCase() !== filterStatus.toLowerCase()) {
          return false;
        }
      }

      // Date Range Filter
      if (filterDateFrom && item.scheduled_date) {
        if (item.scheduled_date < filterDateFrom) return false;
      }
      if (filterDateTo && item.scheduled_date) {
        if (item.scheduled_date > filterDateTo) return false;
      }

      // Search Query (vehicle ID, reg no, route, service bay, cleaner)
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const vehId = String(item.vehicleid || "").toLowerCase();
        const regNo = String(item.registrationno || "").toLowerCase();
        const routeId = String(item.routeid || "").toLowerCase();
        const routeName = String(item.routename || "").toLowerCase();
        const bay = String(item.service_bay || "").toLowerCase();
        const staff = String(item.cleaner_incharge || "").toLowerCase();
        const washType = String(item.wash_type || "").toLowerCase();

        if (
          !vehId.includes(term) &&
          !regNo.includes(term) &&
          !routeId.includes(term) &&
          !routeName.includes(term) &&
          !bay.includes(term) &&
          !staff.includes(term) &&
          !washType.includes(term)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [
    schedules,
    filterVehicleId,
    filterRoute,
    filterStatus,
    filterDateFrom,
    filterDateTo,
    searchTerm,
    getDerivedStatus
  ]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    filterVehicleId,
    filterRoute,
    filterStatus,
    filterDateFrom,
    filterDateTo,
    searchTerm
  ]);

  const isFiltersActive = Boolean(
    filterVehicleId ||
      filterRoute ||
      filterStatus ||
      filterDateFrom ||
      filterDateTo ||
      searchTerm
  );

  const handleClearFilters = () => {
    setFilterVehicleId("");
    setFilterRoute("");
    setFilterStatus("");
    setFilterDateFrom("");
    setFilterDateTo("");
    setSearchTerm("");
    setCurrentPage(1);
  };

  // Pagination Calculations
  const totalPages = Math.max(1, Math.ceil(filteredSchedules.length / rowsPerPage));
  const paginatedSchedules = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredSchedules.slice(start, start + rowsPerPage);
  }, [filteredSchedules, currentPage, rowsPerPage]);

  const startIndex = filteredSchedules.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const endIndex = Math.min(currentPage * rowsPerPage, filteredSchedules.length);

  // Selected vehicle details in Modal form
  const modalVehicleObj = useMemo(() => {
    return vehicles.find((v) => String(v.vehicleid) === String(formData.vehicleid)) || null;
  }, [vehicles, formData.vehicleid]);

  const modalVehicleRoute = useMemo(() => {
    if (!modalVehicleObj || !modalVehicleObj.routeid) return null;
    return routes.find((r) => String(r.routeid) === String(modalVehicleObj.routeid)) || null;
  }, [modalVehicleObj, routes]);

  // Open Schedule Modal (Add Mode)
  const handleOpenAddModal = () => {
    setModalMode("add");
    setEditingSchedule(null);
    setFormErrors({});
    const firstVeh = vehicles[0]?.vehicleid ? String(vehicles[0].vehicleid) : "";
    setFormData({
      vehicleid: firstVeh,
      scheduled_date: formatDateInput(new Date()),
      wash_type: "Basic Bus Wash",
      service_bay: "Bay 1 - Automated Wash Tunnel",
      cleaner_incharge: "Express Fleet Cleaners",
      scheduled_time: "10:00 AM",
      remarks: "Recurring wash every 30 days"
    });
    setShowModal(true);
  };

  // Open Edit Schedule Modal
  const handleOpenEditModal = (schedule) => {
    setModalMode("edit");
    setEditingSchedule(schedule);
    setFormErrors({});
    setFormData({
      vehicleid: String(schedule.vehicleid || ""),
      scheduled_date: schedule.scheduled_date || formatDateInput(new Date()),
      wash_type: schedule.wash_type || "Basic Bus Wash",
      service_bay: schedule.service_bay || "Bay 1 - Automated Wash Tunnel",
      cleaner_incharge: schedule.cleaner_incharge || "Express Fleet Cleaners",
      scheduled_time: schedule.scheduled_time || "10:00 AM",
      remarks: schedule.remarks || ""
    });
    setShowModal(true);
  };

  // Validate Form
  const validateForm = () => {
    const errors = {};
    if (!formData.vehicleid) errors.vehicleid = "Please select a vehicle.";
    if (!formData.scheduled_date) errors.scheduled_date = "Please select a scheduled date.";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save Schedule Handler (POST / PUT)
  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);

    try {
      if (modalMode === "add") {
        const res = await axios.post(`${API_URL}/api/bus-washing`, formData);
        if (res.data && res.data.success) {
          showFlash(
            `Washing schedule for Bus #${formData.vehicleid} created successfully!`,
            "success",
            "Schedule Created"
          );
          setShowModal(false);
          fetchData();
        } else {
          showFlash(res.data?.message || "Failed to create washing schedule.", "danger");
        }
      } else {
        // Edit Mode
        const res = await axios.put(`${API_URL}/api/bus-washing/${editingSchedule.id}`, formData);
        if (res.data && res.data.success) {
          showFlash(
            `Washing schedule for Bus #${formData.vehicleid} updated successfully!`,
            "success",
            "Schedule Updated"
          );
          setShowModal(false);
          fetchData();
        } else {
          showFlash(res.data?.message || "Failed to update washing schedule.", "danger");
        }
      }
    } catch (err) {
      console.error("Error saving washing schedule:", err);
      showFlash(
        err.response?.data?.message || "An error occurred while saving the schedule.",
        "danger"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mark Complete Workflow (PUT /api/bus-washing/:id with status: 'Completed')
  const handleConfirmMarkComplete = async () => {
    if (!completingSchedule) return;
    setIsCompleting(true);

    try {
      const res = await axios.put(`${API_URL}/api/bus-washing/${completingSchedule.id}`, {
        status: "Completed",
        force: true
      });

      if (res.data && res.data.success) {
        const nextDate = res.data.record?.next_scheduled_date || addDays(todayDate, 30);
        showFlash(
          `Bus #${completingSchedule.vehicleid} marked as washed! Next 30-day wash cycle scheduled for ${formatDisplayDate(
            nextDate
          )}.`,
          "success",
          "Wash Cycle Completed"
        );
        setCompletingSchedule(null);
        fetchData();
      } else {
        showFlash(res.data?.message || "Failed to update washing status.", "danger");
      }
    } catch (err) {
      console.error("Error marking wash complete:", err);
      showFlash(
        err.response?.data?.message || "Failed to mark washing as complete.",
        "danger"
      );
    } finally {
      setIsCompleting(false);
    }
  };

  // Delete Schedule Workflow
  const handleConfirmDelete = async () => {
    if (!deletingSchedule) return;
    setIsDeleting(true);

    try {
      const res = await axios.delete(`${API_URL}/api/bus-washing/${deletingSchedule.id}`);
      if (res.data && res.data.success) {
        showFlash("Washing schedule record deleted successfully.", "success", "Record Removed");
        setDeletingSchedule(null);
        fetchData();
      } else {
        showFlash(res.data?.message || "Failed to delete schedule.", "danger");
      }
    } catch (err) {
      console.error("Error deleting schedule:", err);
      showFlash(
        err.response?.data?.message || "Failed to delete washing schedule.",
        "danger"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // Excel Report Export
  const handleExportExcel = () => {
    if (filteredSchedules.length === 0) {
      showFlash("No washing schedule records available to export.", "warning");
      return;
    }

    const exportData = filteredSchedules.map((s, idx) => {
      const statusText = getDerivedStatus(s);
      const countdown = getDayCountdown(s);

      return {
        "S.No": idx + 1,
        "Vehicle ID": s.vehicleid,
        "Registration No": s.registrationno || "—",
        Route: s.routeid ? `${s.routeid} (${s.routename || ""})` : "Unassigned",
        "Washing Type": s.wash_type || "Basic Bus Wash",
        "Last Washed Date": formatDisplayDate(s.last_washed_date || s.last_completed_at),
        "Scheduled Washing Date": formatDisplayDate(s.scheduled_date),
        "Days Remaining": countdown.text,
        "Washing Status": statusText,
        "Service Bay": s.service_bay || "Bay 1",
        "Cleaner In-Charge": s.cleaner_incharge || "Staff",
        "Cycle Remarks": s.remarks || "Recurring wash every 30 days"
      };
    });

    exportToExcel(exportData, "Bus_Washing_And_Cleaning_Schedule_Report");
    showFlash("Washing schedule exported to Excel successfully!", "success", "Export Completed");
  };

  return (
    <div className="washing-master-container">
      <div className="washing-box-wrapper">
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

        {/* 1. Breadcrumbs & Compact Page Header */}
        <nav className="vm-breadcrumb-nav" aria-label="Breadcrumb">
          <span className="link" onClick={() => navigate("/home")}>
            Dashboard
          </span>
          <span className="sep">/</span>
          <span className="link" onClick={() => navigate("/home")}>
            Vehicle Maintenance
          </span>
          <span className="sep">/</span>
          <span className="current">Bus Washing & Cleaning Schedule</span>
        </nav>

        <header className="vm-page-header">
          <div className="vm-header-left">
            <div className="vm-title-row">
              <div className="vm-title-icon-badge" title="Bus Washing & Bay Management">
                <Sparkles size={18} />
              </div>
              <h1 className="vm-page-title">Bus Washing & Cleaning Schedule</h1>
              <span className="vm-total-count-badge">
                {schedules.length} {schedules.length === 1 ? "Bus Tracked" : "Buses Tracked"}
              </span>
            </div>
            <p className="vm-page-subtitle">
              Manage vehicle cleaning schedules, monitor upcoming washes, and track completed cleaning cycles.
            </p>
          </div>

          <div className="vm-header-actions">
            <button
              type="button"
              className="vm-btn-secondary"
              onClick={fetchData}
              disabled={isRefreshing}
              title="Refresh washing schedules"
            >
              <RotateCcw size={15} className={isRefreshing ? "spin-icon" : ""} />
              <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
            </button>

            <button
              type="button"
              className="vm-btn-secondary"
              onClick={handleExportExcel}
              disabled={filteredSchedules.length === 0}
              title="Export washing schedules to Excel report"
            >
              <FileSpreadsheet size={15} />
              <span>Export Report</span>
            </button>

            <button
              type="button"
              className="vm-btn-primary"
              onClick={handleOpenAddModal}
              title="Schedule a new bus washing cycle"
            >
              <Plus size={16} strokeWidth={2.4} />
              <span>Schedule Washing</span>
            </button>
          </div>
        </header>

        {/* 2. Four Summary Metric Cards */}
        <section
          className="washing-summary-grid"
          aria-label="Bus Washing Overview Statistics"
        >
          {/* Card 1: Total Buses */}
          <div className="washing-summary-card">
            <div className="summary-icon-box summary-icon-blue">
              <Bus size={20} />
            </div>
            <div className="summary-card-content">
              <span className="summary-card-value">{summaryMetrics.totalBuses}</span>
              <span className="summary-card-label">Total Buses</span>
            </div>
          </div>

          {/* Card 2: Due Today */}
          <div className="washing-summary-card">
            <div className="summary-icon-box summary-icon-amber">
              <Clock size={20} />
            </div>
            <div className="summary-card-content">
              <span className="summary-card-value">{summaryMetrics.dueToday}</span>
              <span className="summary-card-label">Due Today</span>
            </div>
          </div>

          {/* Card 3: Upcoming Washes */}
          <div className="washing-summary-card">
            <div className="summary-icon-box summary-icon-emerald">
              <Droplets size={20} />
            </div>
            <div className="summary-card-content">
              <span className="summary-card-value">{summaryMetrics.upcoming}</span>
              <span className="summary-card-label">Upcoming Washes</span>
            </div>
          </div>

          {/* Card 4: Overdue Washes */}
          <div className="washing-summary-card">
            <div className="summary-icon-box summary-icon-rose">
              <AlertTriangle size={20} />
            </div>
            <div className="summary-card-content">
              <span className="summary-card-value">{summaryMetrics.overdue}</span>
              <span className="summary-card-label">Overdue Washes</span>
            </div>
          </div>
        </section>

        {/* 3. Informational Due Today Banner */}
        <div
          className={`washing-banner-today ${
            summaryMetrics.dueToday === 0 ? "banner-green" : "banner-amber"
          }`}
          role="status"
        >
          <div className="banner-icon-col">
            {summaryMetrics.dueToday === 0 ? (
              <CheckCircle2 size={18} />
            ) : (
              <Clock size={18} />
            )}
          </div>
          <div className="banner-copy-col">
            <strong>
              {summaryMetrics.dueToday === 0
                ? "No buses are due for washing today."
                : `${summaryMetrics.dueToday} bus${
                    summaryMetrics.dueToday === 1 ? "" : "es"
                  } due for washing today.`}
            </strong>
            <p>
              {summaryMetrics.dueToday === 0
                ? "Upcoming buses will appear according to their scheduled washing dates."
                : "Mark each bus complete after washing. The next 30-day cleaning cycle starts automatically upon completion."}
            </p>
          </div>
        </div>

        {/* 4. Horizontal Filter Card */}
        <div className="washing-filter-card" aria-label="Washing Schedule Filters">
          <div className="washing-filter-grid">
            {/* Filter 1: Vehicle ID */}
            <div className="filter-input-wrap">
              <select
                className="filter-control"
                value={filterVehicleId}
                onChange={(e) => setFilterVehicleId(e.target.value)}
                aria-label="Filter by vehicle"
              >
                <option value="">All Vehicles</option>
                {vehicles.map((v) => (
                  <option key={v.vehicleid} value={v.vehicleid}>
                    Bus #{v.vehicleid}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter 2: Route */}
            <div className="filter-input-wrap">
              <select
                className="filter-control"
                value={filterRoute}
                onChange={(e) => setFilterRoute(e.target.value)}
                aria-label="Filter by route"
              >
                <option value="">All Routes</option>
                {routes.map((r) => (
                  <option key={r.routeid} value={r.routeid}>
                    {r.routeid} ({r.routename})
                  </option>
                ))}
              </select>
            </div>

            {/* Filter 3: Washing Status */}
            <div className="filter-input-wrap">
              <select
                className="filter-control"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                aria-label="Filter by status"
              >
                <option value="">All Statuses</option>
                <option value="Upcoming">Upcoming</option>
                <option value="Due Today">Due Today</option>
                <option value="Overdue">Overdue</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            {/* Filter 4: Scheduled Date From */}
            <div className="filter-input-wrap">
              <input
                type="date"
                className="filter-control"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                title="Date From"
                aria-label="Scheduled Date From"
              />
            </div>

            {/* Filter 5: Scheduled Date To */}
            <div className="filter-input-wrap">
              <input
                type="date"
                className="filter-control"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                title="Date To"
                aria-label="Scheduled Date To"
              />
            </div>

            {/* Filter 6: Search Input */}
            <div className="filter-input-wrap">
              <Search size={14} className="filter-icon-inline" />
              <input
                type="text"
                className="filter-control with-icon"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search bus, reg no, bay..."
              />
            </div>

            {/* Clear Filters Button */}
            {isFiltersActive && (
              <button
                type="button"
                className="btn-clear-filter"
                onClick={handleClearFilters}
                title="Clear all active filters"
              >
                <X size={13} />
                <span>Clear Filters</span>
              </button>
            )}
          </div>
        </div>

        {/* 5. Washing Schedule Table Card */}
        <div className="washing-table-card">
          <div className="washing-table-responsive">
            <table className="washing-table">
              <thead>
                <tr>
                  <th style={{ width: "45px" }}>S.No</th>
                  <th>Vehicle ID</th>
                  <th>Registration Number</th>
                  <th>Route</th>
                  <th>Last Washed Date</th>
                  <th>Scheduled Washing Date</th>
                  <th>Days Remaining</th>
                  <th>Status</th>
                  <th style={{ textAlign: "center", width: "160px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="9">
                      <div className="table-empty-box">
                        <Loader2 size={24} className="spin-icon" color="#2563eb" />
                        <p>Loading bus washing schedules...</p>
                      </div>
                    </td>
                  </tr>
                ) : paginatedSchedules.length === 0 ? (
                  <tr>
                    <td colSpan="9">
                      <div className="table-empty-box">
                        <Droplets size={28} color="#94a3b8" />
                        <p>
                          {isFiltersActive
                            ? "No washing schedules match your selected filters."
                            : "No bus washing schedules found. Click '+ Schedule Washing' above to create one."}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedSchedules.map((s, idx) => {
                    const rowNumber = startIndex + idx;
                    const derivedStatus = getDerivedStatus(s);
                    const countdown = getDayCountdown(s);
                    const isDueToday = derivedStatus === "Due Today";

                    return (
                      <tr
                        key={s.id || s.vehicleid}
                        className={isDueToday ? "row-due-today" : ""}
                      >
                        <td>{rowNumber}</td>
                        <td>
                          <span className="badge-bus-washing">
                            <Bus size={12} />
                            <span>Bus #{s.vehicleid}</span>
                          </span>
                        </td>
                        <td>
                          <strong>{s.registrationno || "—"}</strong>
                        </td>
                        <td>
                          {s.routeid ? (
                            <span className="badge-route-pill" title={s.routename || ""}>
                              {s.routeid}
                            </span>
                          ) : (
                            <span style={{ color: "#94a3b8" }}>Unassigned</span>
                          )}
                        </td>
                        <td>
                          <span>
                            {formatDisplayDate(s.last_washed_date || s.last_completed_at)}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <Calendar size={13} color="#2563eb" />
                            <strong>{formatDisplayDate(s.scheduled_date)}</strong>
                          </div>
                        </td>
                        <td>
                          <span
                            className={`day-remaining-badge ${
                              countdown.type === "due"
                                ? "day-due-today"
                                : countdown.type === "overdue"
                                ? "day-overdue"
                                : "day-upcoming"
                            }`}
                          >
                            <Clock size={11} />
                            <span>{countdown.text}</span>
                          </span>
                        </td>
                        <td>
                          <span
                            className={`badge-wash-status ${
                              derivedStatus === "Due Today"
                                ? "badge-wash-due"
                                : derivedStatus === "Overdue"
                                ? "badge-wash-overdue"
                                : derivedStatus === "Completed"
                                ? "badge-wash-completed"
                                : "badge-wash-upcoming"
                            }`}
                          >
                            {derivedStatus === "Due Today" && <Clock size={11} />}
                            {derivedStatus === "Overdue" && <AlertTriangle size={11} />}
                            {derivedStatus === "Completed" && <CheckCircle2 size={11} />}
                            {derivedStatus === "Upcoming" && <Droplets size={11} />}
                            <span>{derivedStatus}</span>
                          </span>
                        </td>
                        <td>
                          <div className="washing-actions-wrap" style={{ justifyContent: "center" }}>
                            {/* Mark Complete Button */}
                            <button
                              type="button"
                              className="btn-action-complete"
                              onClick={() => setCompletingSchedule(s)}
                              title="Mark washing as completed (starts next 30-day cycle)"
                            >
                              <Check size={12} />
                              <span>Mark Complete</span>
                            </button>

                            {/* View Details */}
                            <button
                              type="button"
                              className="btn-action-icon btn-action-view"
                              onClick={() => setViewingSchedule(s)}
                              title="View washing schedule details"
                            >
                              <Eye size={13} />
                            </button>

                            {/* Edit Schedule */}
                            <button
                              type="button"
                              className="btn-action-icon btn-action-edit"
                              onClick={() => handleOpenEditModal(s)}
                              title="Edit washing date and bay"
                            >
                              <Pencil size={13} />
                            </button>

                            {/* Delete Schedule */}
                            <button
                              type="button"
                              className="btn-action-icon btn-action-delete"
                              onClick={() => setDeletingSchedule(s)}
                              title="Delete washing entry"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer (Fixed 5 records per page) */}
          <div className="washing-pagination-bar">
            <div className="pagination-left">
              <span className="pagination-records-info">
                Showing {startIndex}–{endIndex} of {filteredSchedules.length} records
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
                    (pg >= currentPage - 1 && pg <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={pg}
                        type="button"
                        className={`pg-num-btn ${pg === currentPage ? "active" : ""}`}
                        onClick={() => setCurrentPage(pg)}
                      >
                        {pg}
                      </button>
                    );
                  }
                  if (pg === currentPage - 2 || pg === currentPage + 2) {
                    return (
                      <span key={pg} style={{ padding: "0 2px", color: "#94a3b8" }}>
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
                disabled={currentPage === totalPages}
                aria-label="Next Page"
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* ====================================================================
            MODAL 1: SCHEDULE WASHING / EDIT SCHEDULE MODAL
            ==================================================================== */}
        {showModal && (
          <div
            className="m-modal-backdrop"
            role="dialog"
            aria-modal="true"
            onClick={(e) => {
              if (e.target === e.currentTarget && !isSubmitting) setShowModal(false);
            }}
          >
            <div className="m-modal-card">
              <div className="m-modal-header">
                <div>
                  <h3 className="m-modal-title">
                    {modalMode === "add" ? "Schedule Bus Washing" : "Edit Washing Schedule"}
                  </h3>
                  <p className="m-modal-subtitle">
                    Select a vehicle and schedule its next cleaning date.
                  </p>
                </div>
                <button
                  type="button"
                  className="m-modal-close-btn"
                  onClick={() => !isSubmitting && setShowModal(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveSchedule}>
                <div className="m-modal-body">
                  <div className="modal-form-grid">
                    {/* Vehicle ID Dropdown */}
                    <div className="modal-form-field">
                      <label className="modal-field-label" htmlFor="modal-vehicle-id">
                        Vehicle ID <span className="required">*</span>
                      </label>
                      <select
                        id="modal-vehicle-id"
                        className="modal-select"
                        value={formData.vehicleid}
                        onChange={(e) =>
                          setFormData({ ...formData, vehicleid: e.target.value })
                        }
                        disabled={modalMode === "edit"}
                        required
                      >
                        <option value="">Select Bus</option>
                        {vehicles.map((v) => (
                          <option key={v.vehicleid} value={v.vehicleid}>
                            Bus #{v.vehicleid} — {v.registrationno}
                          </option>
                        ))}
                      </select>
                      {formErrors.vehicleid && (
                        <small style={{ color: "#dc2626" }}>{formErrors.vehicleid}</small>
                      )}
                    </div>

                    {/* Registration Number (Auto-displayed) */}
                    <div className="modal-form-field">
                      <label className="modal-field-label" htmlFor="modal-reg-no">
                        Registration Number
                      </label>
                      <input
                        id="modal-reg-no"
                        type="text"
                        className="modal-input modal-readonly"
                        value={modalVehicleObj?.registrationno || "Auto-detected"}
                        readOnly
                      />
                    </div>

                    {/* Assigned Route (Auto-displayed) */}
                    <div className="modal-form-field">
                      <label className="modal-field-label" htmlFor="modal-route">
                        Assigned Route
                      </label>
                      <input
                        id="modal-route"
                        type="text"
                        className="modal-input modal-readonly"
                        value={
                          modalVehicleObj?.routeid
                            ? `${modalVehicleObj.routeid}${
                                modalVehicleRoute?.routename
                                  ? ` (${modalVehicleRoute.routename})`
                                  : ""
                              }`
                            : "Unassigned / Standby"
                        }
                        readOnly
                      />
                    </div>

                    {/* Scheduled Washing Date */}
                    <div className="modal-form-field">
                      <label className="modal-field-label" htmlFor="modal-sched-date">
                        Scheduled Washing Date <span className="required">*</span>
                      </label>
                      <input
                        id="modal-sched-date"
                        type="date"
                        className="modal-input"
                        value={formData.scheduled_date}
                        onChange={(e) =>
                          setFormData({ ...formData, scheduled_date: e.target.value })
                        }
                        required
                      />
                      {formErrors.scheduled_date && (
                        <small style={{ color: "#dc2626" }}>{formErrors.scheduled_date}</small>
                      )}
                    </div>

                    {/* Washing Type */}
                    <div className="modal-form-field">
                      <label className="modal-field-label" htmlFor="modal-wash-type">
                        Washing Type
                      </label>
                      <select
                        id="modal-wash-type"
                        className="modal-select"
                        value={formData.wash_type}
                        onChange={(e) =>
                          setFormData({ ...formData, wash_type: e.target.value })
                        }
                      >
                        {WASH_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Service Bay */}
                    <div className="modal-form-field">
                      <label className="modal-field-label" htmlFor="modal-bay">
                        Service Bay / Location
                      </label>
                      <select
                        id="modal-bay"
                        className="modal-select"
                        value={formData.service_bay}
                        onChange={(e) =>
                          setFormData({ ...formData, service_bay: e.target.value })
                        }
                      >
                        {SERVICE_BAYS.map((bay) => (
                          <option key={bay} value={bay}>
                            {bay}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Cleaning Vendor / Staff */}
                    <div className="modal-form-field">
                      <label className="modal-field-label" htmlFor="modal-cleaner">
                        Cleaning Vendor / Staff In-Charge
                      </label>
                      <input
                        id="modal-cleaner"
                        type="text"
                        className="modal-input"
                        value={formData.cleaner_incharge}
                        onChange={(e) =>
                          setFormData({ ...formData, cleaner_incharge: e.target.value })
                        }
                        placeholder="e.g. Express Fleet Cleaners"
                      />
                    </div>

                    {/* Scheduled Time */}
                    <div className="modal-form-field">
                      <label className="modal-field-label" htmlFor="modal-time">
                        Scheduled Time Slot
                      </label>
                      <input
                        id="modal-time"
                        type="text"
                        className="modal-input"
                        value={formData.scheduled_time}
                        onChange={(e) =>
                          setFormData({ ...formData, scheduled_time: e.target.value })
                        }
                        placeholder="e.g. 10:00 AM"
                      />
                    </div>

                    {/* Remarks */}
                    <div className="modal-form-field modal-field-full">
                      <label className="modal-field-label" htmlFor="modal-remarks">
                        Cycle Remarks & Notes
                      </label>
                      <textarea
                        id="modal-remarks"
                        className="modal-textarea"
                        rows={2}
                        value={formData.remarks}
                        onChange={(e) =>
                          setFormData({ ...formData, remarks: e.target.value })
                        }
                        placeholder="e.g. Recurring 30-day automated wash schedule"
                      />
                    </div>
                  </div>
                </div>

                <div className="m-modal-footer">
                  <button
                    type="button"
                    className="vm-btn-secondary"
                    onClick={() => setShowModal(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="vm-btn-primary"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={15} className="spin-icon" />
                        <span>Saving Schedule...</span>
                      </>
                    ) : (
                      <>
                        <Check size={15} />
                        <span>Save Schedule</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ====================================================================
            MODAL 2: MARK WASHING COMPLETE CONFIRMATION
            ==================================================================== */}
        {completingSchedule && (
          <div
            className="m-modal-backdrop"
            role="dialog"
            aria-modal="true"
            onClick={(e) => {
              if (e.target === e.currentTarget && !isCompleting) setCompletingSchedule(null);
            }}
          >
            <div className="m-modal-card m-modal-card-small">
              <div className="m-modal-header">
                <div>
                  <h3 className="m-modal-title">Confirm Washing Completion</h3>
                  <p className="m-modal-subtitle">
                    Record wash completion and schedule next 30-day cycle
                  </p>
                </div>
                <button
                  type="button"
                  className="m-modal-close-btn"
                  onClick={() => !isCompleting && setCompletingSchedule(null)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="m-modal-body">
                <div
                  className="delete-confirm-box"
                  style={{ background: "#f0fdf4", borderColor: "#bbf7d0" }}
                >
                  <CheckCircle2 size={30} color="#16a34a" />
                  <p className="delete-confirm-text" style={{ color: "#166534" }}>
                    Are you sure you want to mark <strong>Bus #{completingSchedule.vehicleid}</strong> (
                    {completingSchedule.registrationno}) as washed? Today's date will be recorded
                    as completed, and its next washing cycle will start 30 days from now (
                    <strong>{formatDisplayDate(addDays(todayDate, 30))}</strong>).
                  </p>
                </div>

                <div className="view-details-grid" style={{ gap: "8px" }}>
                  <div className="view-detail-item">
                    <span className="view-detail-label">Vehicle</span>
                    <span className="view-detail-value">Bus #{completingSchedule.vehicleid}</span>
                  </div>
                  <div className="view-detail-item">
                    <span className="view-detail-label">Current Scheduled Date</span>
                    <span className="view-detail-value">
                      {formatDisplayDate(completingSchedule.scheduled_date)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="m-modal-footer">
                <button
                  type="button"
                  className="vm-btn-secondary"
                  onClick={() => setCompletingSchedule(null)}
                  disabled={isCompleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="vm-btn-primary"
                  onClick={handleConfirmMarkComplete}
                  disabled={isCompleting}
                >
                  {isCompleting ? (
                    <>
                      <Loader2 size={15} className="spin-icon" />
                      <span>Recording...</span>
                    </>
                  ) : (
                    <>
                      <Check size={15} />
                      <span>Confirm & Mark Complete</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================================
            MODAL 3: VIEW WASHING DETAILS MODAL
            ==================================================================== */}
        {viewingSchedule && (
          <div
            className="m-modal-backdrop"
            role="dialog"
            aria-modal="true"
            onClick={(e) => {
              if (e.target === e.currentTarget) setViewingSchedule(null);
            }}
          >
            <div className="m-modal-card">
              <div className="m-modal-header">
                <div>
                  <h3 className="m-modal-title">Bus Washing Cycle Details</h3>
                  <p className="m-modal-subtitle">
                    Bus #{viewingSchedule.vehicleid} Maintenance Record
                  </p>
                </div>
                <button
                  type="button"
                  className="m-modal-close-btn"
                  onClick={() => setViewingSchedule(null)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="m-modal-body">
                <div className="view-details-grid">
                  <div className="view-detail-item">
                    <span className="view-detail-label">Vehicle ID</span>
                    <span className="view-detail-value">Bus #{viewingSchedule.vehicleid}</span>
                  </div>

                  <div className="view-detail-item">
                    <span className="view-detail-label">Registration Number</span>
                    <span className="view-detail-value">
                      {viewingSchedule.registrationno || "—"}
                    </span>
                  </div>

                  <div className="view-detail-item">
                    <span className="view-detail-label">Route</span>
                    <span className="view-detail-value">
                      {viewingSchedule.routeid
                        ? `${viewingSchedule.routeid} (${viewingSchedule.routename || ""})`
                        : "Unassigned"}
                    </span>
                  </div>

                  <div className="view-detail-item">
                    <span className="view-detail-label">Current Cycle Status</span>
                    <span className="view-detail-value">
                      <span className="badge-wash-status badge-wash-upcoming">
                        {getDerivedStatus(viewingSchedule)}
                      </span>
                    </span>
                  </div>

                  <div className="view-detail-item">
                    <span className="view-detail-label">Scheduled Washing Date</span>
                    <span className="view-detail-value">
                      {formatDisplayDate(viewingSchedule.scheduled_date)}
                    </span>
                  </div>

                  <div className="view-detail-item">
                    <span className="view-detail-label">Last Washed Date</span>
                    <span className="view-detail-value">
                      {formatDisplayDate(
                        viewingSchedule.last_washed_date || viewingSchedule.last_completed_at
                      ) || "Pending First Wash"}
                    </span>
                  </div>

                  <div className="view-detail-item">
                    <span className="view-detail-label">Service Bay</span>
                    <span className="view-detail-value">
                      {viewingSchedule.service_bay || "Bay 1 - Automated Wash Tunnel"}
                    </span>
                  </div>

                  <div className="view-detail-item">
                    <span className="view-detail-label">Cleaner / Vendor In-Charge</span>
                    <span className="view-detail-value">
                      {viewingSchedule.cleaner_incharge || "Express Fleet Cleaners"}
                    </span>
                  </div>

                  <div className="view-detail-item item-full">
                    <span className="view-detail-label">Washing Type</span>
                    <span className="view-detail-value" style={{ fontWeight: 600 }}>
                      {viewingSchedule.wash_type || "Basic Bus Wash"}
                    </span>
                  </div>

                  <div className="view-detail-item item-full">
                    <span className="view-detail-label">Remarks & 30-Day Cycle Rules</span>
                    <span
                      className="view-detail-value"
                      style={{
                        background: "#f8fafc",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        border: "1px solid #e2e8f0",
                        fontSize: "0.8rem"
                      }}
                    >
                      {viewingSchedule.remarks || "Recurring wash every 30 days"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="m-modal-footer">
                <button
                  type="button"
                  className="vm-btn-secondary"
                  onClick={() => setViewingSchedule(null)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="vm-btn-primary"
                  onClick={() => {
                    const s = viewingSchedule;
                    setViewingSchedule(null);
                    handleOpenEditModal(s);
                  }}
                >
                  <Pencil size={14} />
                  <span>Edit Schedule</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================================
            MODAL 4: DELETE CONFIRMATION
            ==================================================================== */}
        {deletingSchedule && (
          <div
            className="m-modal-backdrop"
            role="dialog"
            aria-modal="true"
            onClick={(e) => {
              if (e.target === e.currentTarget && !isDeleting) setDeletingSchedule(null);
            }}
          >
            <div className="m-modal-card m-modal-card-small">
              <div className="m-modal-header">
                <div>
                  <h3 className="m-modal-title">Delete Washing Entry</h3>
                  <p className="m-modal-subtitle">Confirm removal of schedule</p>
                </div>
                <button
                  type="button"
                  className="m-modal-close-btn"
                  onClick={() => !isDeleting && setDeletingSchedule(null)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="m-modal-body">
                <div className="delete-confirm-box">
                  <AlertTriangle size={28} color="#dc2626" />
                  <p className="delete-confirm-text">
                    Are you sure you want to remove the washing schedule for{" "}
                    <strong>Bus #{deletingSchedule.vehicleid}</strong> (
                    {deletingSchedule.registrationno})? This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="m-modal-footer">
                <button
                  type="button"
                  className="vm-btn-secondary"
                  onClick={() => setDeletingSchedule(null)}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="vm-btn-primary"
                  style={{ background: "#dc2626" }}
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 size={15} className="spin-icon" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 size={15} />
                      <span>Delete Entry</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BusWashingSchedule;
