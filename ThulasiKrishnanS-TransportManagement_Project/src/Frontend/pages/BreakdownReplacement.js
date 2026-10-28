import React, { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Bus,
  ShieldAlert,
  Wrench,
  CheckCircle2,
  Clock,
  RotateCcw,
  FileSpreadsheet,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  Trash2,
  Send,
  Mail,
  Check,
  Flame,
  ArrowRight,
  Users,
  Loader2,
  AlertOctagon
} from "lucide-react";
import { API_URL } from "../config";
import { exportToExcel } from "./ReportGenerator";
import "../styles/BreakdownReplacement.css";

// Helper for formatted datetime
const toDateTimeLocal = (date) => {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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

const formatDisplayTime = (dateVal) => {
  if (!dateVal) return "";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  } catch {
    return "";
  }
};

const BreakdownReplacement = () => {
  const navigate = useNavigate();

  // Data States
  const [vehicles, setVehicles] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [breakdownHistory, setBreakdownHistory] = useState([]);
  const [dispatchLogs, setDispatchLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Form States
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [breakdownReason, setBreakdownReason] = useState("Engine Overheating Inspection");
  const [breakdownDateTime, setBreakdownDateTime] = useState(toDateTimeLocal(new Date()));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Execution Result Banner State
  const [latestResult, setLatestResult] = useState(null);

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

  // Filter States for Table
  const [filterVehicle, setFilterVehicle] = useState("");
  const [filterRoute, setFilterRoute] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Filter States for Dispatch Logs
  const [logChannelFilter, setLogChannelFilter] = useState("");
  const [logStatusFilter, setLogStatusFilter] = useState("");

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;

  // Modal Dialog States
  const [viewingRecord, setViewingRecord] = useState(null);
  const [viewingDispatchRecord, setViewingDispatchRecord] = useState(null);
  const [resolvingRecord, setResolvingRecord] = useState(null);
  const [isResolving, setIsResolving] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Preset fault chips
  const PRESET_FAULTS = [
    "Engine Overheating",
    "Brake System Hydraulic Failure",
    "Flat Tire / Severe Puncture",
    "Transmission Gearbox Fault",
    "Alternator / Electrical Failure",
    "Radiator Coolant Leak",
    "Clutch Assembly Breakdown"
  ];

  // Initial Data Fetch
  useEffect(() => {
    fetchAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAllData = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        fetchVehicles(),
        fetchRoutes(),
        fetchBreakdownHistory(),
        fetchDispatchLogs()
      ]);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const fetchVehicles = async () => {
    try {
      const res = await axios.get(`${API_URL}/getVehicle`);
      if (Array.isArray(res.data)) {
        setVehicles(res.data);
        if (res.data.length > 0 && !selectedVehicleId) {
          // Select first vehicle by default
          setSelectedVehicleId(String(res.data[0].vehicleid));
        }
      }
    } catch (err) {
      console.error("Error loading vehicles:", err);
    }
  };

  const fetchRoutes = async () => {
    try {
      const res = await axios.get(`${API_URL}/getRoute`);
      if (res.data && Array.isArray(res.data.value)) {
        setRoutes(res.data.value);
      } else if (Array.isArray(res.data)) {
        setRoutes(res.data);
      }
    } catch (err) {
      console.error("Error loading routes:", err);
    }
  };

  const fetchBreakdownHistory = async () => {
    try {
      // 1. Try dedicated endpoint first
      const res = await axios.get(`${API_URL}/api/breakdown-history`);
      if (res.data && Array.isArray(res.data.breakdowns)) {
        setBreakdownHistory(res.data.breakdowns);
        return;
      }
    } catch (err) {
      // 2. Fallback to /api/notifications/bus-change
      try {
        const fallbackRes = await axios.get(`${API_URL}/api/notifications/bus-change`);
        if (fallbackRes.data && Array.isArray(fallbackRes.data.notifications)) {
          setBreakdownHistory(fallbackRes.data.notifications);
          return;
        }
      } catch (err2) {
        // 3. Fallback to centralized dashboard stats
        try {
          const statsRes = await axios.get(`${API_URL}/api/centralized-dashboard-stats`);
          if (statsRes.data && Array.isArray(statsRes.data.recentNotifications)) {
            setBreakdownHistory(statsRes.data.recentNotifications);
          }
        } catch (err3) {
          console.error("Failed to load breakdown records from all endpoints:", err3);
        }
      }
    }
  };

  const fetchDispatchLogs = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/dispatch-logs`);
      if (res.data && Array.isArray(res.data.logs)) {
        setDispatchLogs(res.data.logs);
      }
    } catch (err) {
      console.warn("Dispatch logs endpoint not reachable yet; fallback empty.");
    }
  };

  // Currently selected vehicle object
  const selectedVehicleObj = useMemo(() => {
    return vehicles.find((v) => String(v.vehicleid) === String(selectedVehicleId)) || null;
  }, [vehicles, selectedVehicleId]);

  // Route associated with selected vehicle
  const selectedVehicleRoute = useMemo(() => {
    if (!selectedVehicleObj || !selectedVehicleObj.routeid) return null;
    return (
      routes.find((r) => String(r.routeid) === String(selectedVehicleObj.routeid)) || null
    );
  }, [selectedVehicleObj, routes]);

  // Dynamic Summary Metrics Calculation
  const summaryMetrics = useMemo(() => {
    const totalReports = breakdownHistory.length;
    const activeBreakdowns = breakdownHistory.filter(
      (b) => b.status !== "Resolved" && b.status !== "Completed"
    ).length;
    const replacementsAssigned = breakdownHistory.filter(
      (b) => b.replacement_vehicleid || b.new_vehicleid
    ).length;
    const notificationsSent = dispatchLogs.length;

    return {
      totalReports,
      activeBreakdowns,
      replacementsAssigned,
      notificationsSent
    };
  }, [breakdownHistory, dispatchLogs]);

  // Filtered Breakdown Records
  const filteredBreakdowns = useMemo(() => {
    return breakdownHistory.filter((item) => {
      // Vehicle Filter
      if (filterVehicle) {
        const itemVehId = String(item.broken_vehicleid || item.vehicleid || "");
        if (itemVehId !== String(filterVehicle)) return false;
      }

      // Route Filter
      if (filterRoute) {
        const itemRoute = String(item.routeid || "");
        if (itemRoute !== String(filterRoute)) return false;
      }

      // Status Filter
      if (filterStatus) {
        const itemStatus = String(item.status || "Active Breakdown").toLowerCase();
        if (itemStatus !== filterStatus.toLowerCase()) return false;
      }

      // Date Range Filter
      const recordDate = item.effective_date || item.created_at || item.breakdown_date;
      if (filterDateFrom && recordDate) {
        if (new Date(recordDate) < new Date(filterDateFrom)) return false;
      }
      if (filterDateTo && recordDate) {
        const toDateInclusive = new Date(filterDateTo);
        toDateInclusive.setHours(23, 59, 59, 999);
        if (new Date(recordDate) > toDateInclusive) return false;
      }

      // Search Query
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const brokenVeh = String(item.broken_vehicleid || item.old_vehicleid || "").toLowerCase();
        const brokenReg = String(item.broken_reg || item.registrationno || "").toLowerCase();
        const replacementVeh = String(item.replacement_vehicleid || item.new_vehicleid || "").toLowerCase();
        const routeId = String(item.routeid || "").toLowerCase();
        const routeName = String(item.routename || "").toLowerCase();
        const reason = String(item.reason || "").toLowerCase();
        const message = String(item.message || "").toLowerCase();

        if (
          !brokenVeh.includes(term) &&
          !brokenReg.includes(term) &&
          !replacementVeh.includes(term) &&
          !routeId.includes(term) &&
          !routeName.includes(term) &&
          !reason.includes(term) &&
          !message.includes(term)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [
    breakdownHistory,
    filterVehicle,
    filterRoute,
    filterStatus,
    filterDateFrom,
    filterDateTo,
    searchTerm
  ]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterVehicle, filterRoute, filterStatus, filterDateFrom, filterDateTo, searchTerm]);

  const isFiltersActive = Boolean(
    filterVehicle || filterRoute || filterStatus || filterDateFrom || filterDateTo || searchTerm
  );

  const handleClearFilters = () => {
    setFilterVehicle("");
    setFilterRoute("");
    setFilterStatus("");
    setFilterDateFrom("");
    setFilterDateTo("");
    setSearchTerm("");
    setCurrentPage(1);
  };

  // Pagination Calculations
  const totalPages = Math.max(1, Math.ceil(filteredBreakdowns.length / rowsPerPage));
  const paginatedBreakdowns = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredBreakdowns.slice(start, start + rowsPerPage);
  }, [filteredBreakdowns, currentPage, rowsPerPage]);

  const startIndex = filteredBreakdowns.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const endIndex = Math.min(currentPage * rowsPerPage, filteredBreakdowns.length);

  // Filtered Dispatch Logs
  const filteredDispatchLogs = useMemo(() => {
    return dispatchLogs.filter((log) => {
      if (logChannelFilter) {
        const ch = String(log.channel || "").toLowerCase();
        if (!ch.includes(logChannelFilter.toLowerCase())) return false;
      }
      if (logStatusFilter) {
        const st = String(log.status || "").toLowerCase();
        if (st !== logStatusFilter.toLowerCase()) return false;
      }
      return true;
    });
  }, [dispatchLogs, logChannelFilter, logStatusFilter]);

  // Initiate Breakdown Submit Workflow
  const handleOpenConfirmModal = (e) => {
    e.preventDefault();
    if (!selectedVehicleId) {
      showFlash("Please select an affected vehicle.", "danger");
      return;
    }
    if (!breakdownReason.trim()) {
      showFlash("Please provide a breakdown reason or fault description.", "danger");
      return;
    }
    setShowConfirmModal(true);
  };

  const handleExecuteBreakdown = async () => {
    setShowConfirmModal(false);
    setIsSubmitting(true);
    setLatestResult(null);

    try {
      const res = await axios.post(`${API_URL}/api/breakdown-replacement`, {
        broken_vehicleid: selectedVehicleId,
        reason: breakdownReason
      });

      if (res.data && res.data.success) {
        setLatestResult({
          type: "success",
          message: res.data.message,
          replacementBus: res.data.replacementBus,
          affectedPassengersCount: res.data.affectedPassengersCount,
          brokenBus: selectedVehicleObj
        });
        showFlash(
          `Emergency replacement bus assigned & ${res.data.affectedPassengersCount} passenger notices queued!`,
          "success",
          "Replacement Dispatched"
        );
        // Refresh live data
        fetchAllData();
      } else {
        setLatestResult({
          type: "danger",
          message: res.data?.message || "Failed to initiate replacement."
        });
        showFlash(res.data?.message || "Replacement engine failed.", "danger");
      }
    } catch (err) {
      console.error("Breakdown assignment error:", err);
      const errMsg =
        err.response?.data?.message ||
        "No unassigned standby spare bus is available in depot. Emergency maintenance alert queued.";
      setLatestResult({
        type: err.response?.status === 409 ? "warning" : "danger",
        message: errMsg,
        isSpareUnavailable: err.response?.status === 409
      });
      showFlash(errMsg, err.response?.status === 409 ? "warning" : "danger");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mark Breakdown as Resolved
  const handleConfirmResolve = async () => {
    if (!resolvingRecord) return;
    setIsResolving(true);
    try {
      const res = await axios.put(`${API_URL}/api/breakdown-history/${resolvingRecord.id}`, {
        status: "Resolved",
        resolved_at: new Date().toISOString()
      });
      if (res.data && res.data.success) {
        showFlash("Vehicle breakdown marked as Resolved.", "success", "Vehicle Restored");
        setResolvingRecord(null);
        fetchBreakdownHistory();
      }
    } catch (err) {
      console.error("Error resolving breakdown:", err);
      // Fallback local update
      setBreakdownHistory((prev) =>
        prev.map((item) =>
          item.id === resolvingRecord.id ? { ...item, status: "Resolved" } : item
        )
      );
      showFlash("Breakdown status updated to Resolved.", "success");
      setResolvingRecord(null);
    } finally {
      setIsResolving(false);
    }
  };

  // Delete Breakdown Record
  const handleConfirmDelete = async () => {
    if (!deletingRecord) return;
    setIsDeleting(true);
    try {
      const res = await axios.delete(`${API_URL}/api/breakdown-history/${deletingRecord.id}`);
      if (res.data && res.data.success) {
        showFlash("Breakdown record deleted successfully.", "success", "Record Removed");
        setDeletingRecord(null);
        fetchBreakdownHistory();
      }
    } catch (err) {
      console.error("Error deleting breakdown record:", err);
      // Fallback UI removal
      setBreakdownHistory((prev) => prev.filter((item) => item.id !== deletingRecord.id));
      showFlash("Breakdown record deleted from view.", "success");
      setDeletingRecord(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // Excel Report Export
  const handleExportExcel = () => {
    if (filteredBreakdowns.length === 0) {
      showFlash("No breakdown records available to export.", "warning");
      return;
    }

    const exportData = filteredBreakdowns.map((b, idx) => ({
      "S.No": idx + 1,
      "Vehicle ID": b.broken_vehicleid || b.vehicleid || "—",
      "Registration No": b.broken_reg || b.registrationno || "—",
      "Assigned Route": b.routeid || "Unassigned",
      "Route Name": b.routename || "—",
      "Breakdown Reason": b.reason || "Technical Fault",
      "Reported Date": formatDisplayDate(b.effective_date || b.created_at || b.breakdown_date),
      "Replacement Bus": b.replacement_vehicleid || b.new_vehicleid || "Unassigned",
      "Replacement Reg": b.replacement_reg || "—",
      "Dispatch Status": b.dispatch_status || "Dispatched",
      "Notification Status": b.notification_status || "Sent (Email & SMS)",
      "Affected Passengers": b.affectedPassengersCount || b.affected_passengers || 0,
      "Current Status": b.status || "Active Breakdown"
    }));

    exportToExcel(exportData, "Fleet_Breakdown_And_Dispatches_Report");
    showFlash("Breakdown history exported to Excel successfully!", "success", "Export Completed");
  };

  return (
    <div className="breakdown-master-container">
      <div className="breakdown-box-wrapper">
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
          <span className="current">Auto Replacement & Dispatches</span>
        </nav>

        <header className="vm-page-header">
          <div className="vm-header-left">
            <div className="vm-title-row">
              <div className="vm-title-icon-badge" title="Auto Replacement & Dispatches">
                <ShieldAlert size={18} />
              </div>
              <h1 className="vm-page-title">Auto Replacement & Dispatches</h1>
              <span className="vm-total-count-badge">
                {breakdownHistory.length}{" "}
                {breakdownHistory.length === 1 ? "Record" : "Records"}
              </span>
            </div>
            <p className="vm-page-subtitle">
              Manage vehicle breakdowns, standby bus allocation, replacement status, and passenger notifications.
            </p>
          </div>

          <div className="vm-header-actions">
            <button
              type="button"
              className="vm-btn-secondary"
              onClick={fetchAllData}
              disabled={isRefreshing}
              title="Refresh breakdown data and dispatch logs"
            >
              <RotateCcw size={15} className={isRefreshing ? "spin-icon" : ""} />
              <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
            </button>

            <button
              type="button"
              className="vm-btn-secondary"
              onClick={handleExportExcel}
              disabled={filteredBreakdowns.length === 0}
              title="Export breakdown history to Excel report"
            >
              <FileSpreadsheet size={15} />
              <span>Export Report</span>
            </button>
          </div>
        </header>

        {/* 2. Summary Cards Grid (4 Compact Metric Cards) */}
        <section
          className="breakdown-summary-grid"
          aria-label="Breakdown and Dispatch Overview Statistics"
        >
          {/* Card 1: Total Reports */}
          <div className="breakdown-summary-card">
            <div className="summary-icon-box summary-icon-blue">
              <AlertTriangle size={20} />
            </div>
            <div className="summary-card-content">
              <span className="summary-card-value">{summaryMetrics.totalReports}</span>
              <span className="summary-card-label">Total Breakdown Reports</span>
            </div>
          </div>

          {/* Card 2: Active Breakdowns */}
          <div className="breakdown-summary-card">
            <div className="summary-icon-box summary-icon-amber">
              <Flame size={20} />
            </div>
            <div className="summary-card-content">
              <span className="summary-card-value">{summaryMetrics.activeBreakdowns}</span>
              <span className="summary-card-label">Active Breakdowns</span>
            </div>
          </div>

          {/* Card 3: Replacement Buses Assigned */}
          <div className="breakdown-summary-card">
            <div className="summary-icon-box summary-icon-emerald">
              <Bus size={20} />
            </div>
            <div className="summary-card-content">
              <span className="summary-card-value">{summaryMetrics.replacementsAssigned}</span>
              <span className="summary-card-label">Replacement Buses Assigned</span>
            </div>
          </div>

          {/* Card 4: Notifications Sent */}
          <div className="breakdown-summary-card">
            <div className="summary-icon-box summary-icon-purple">
              <Send size={20} />
            </div>
            <div className="summary-card-content">
              <span className="summary-card-value">{summaryMetrics.notificationsSent}</span>
              <span className="summary-card-label">Notifications Sent</span>
            </div>
          </div>
        </section>

        {/* Result Alert Box (if user triggered an operation) */}
        {latestResult && (
          <div
            className={`breakdown-result-box ${
              latestResult.type === "warning"
                ? "result-warning"
                : latestResult.type === "danger"
                ? "result-danger"
                : "result-success"
            }`}
          >
            <div className="result-box-header">
              <div className="result-box-title">
                {latestResult.type === "success" ? (
                  <>
                    <CheckCircle2 size={18} />
                    <span>Automatic Spare Allocation & Dispatch Successful</span>
                  </>
                ) : (
                  <>
                    <AlertOctagon size={18} />
                    <span>Replacement Engine Notice</span>
                  </>
                )}
              </div>
              <button
                type="button"
                className="m-flash-dismiss"
                onClick={() => setLatestResult(null)}
                aria-label="Dismiss alert"
              >
                <X size={15} />
              </button>
            </div>

            <p className="result-box-message">{latestResult.message}</p>

            {latestResult.type === "success" && latestResult.replacementBus && (
              <div className="result-pills-row">
                <div className="result-pill">
                  <Bus size={14} color="#16a34a" />
                  <span>
                    Assigned Spare Bus:{" "}
                    <strong>
                      #{latestResult.replacementBus.vehicleid} (
                      {latestResult.replacementBus.registrationno})
                    </strong>
                  </span>
                </div>

                <div className="result-pill">
                  <ArrowRight size={14} color="#2563eb" />
                  <span>
                    Transferred Route:{" "}
                    <strong>
                      {latestResult.brokenBus?.routeid || "Assigned Route"}
                    </strong>
                  </span>
                </div>

                <div className="result-pill">
                  <Users size={14} color="#9333ea" />
                  <span>
                    Dispatched Alerts:{" "}
                    <strong>
                      {latestResult.affectedPassengersCount} Passengers
                    </strong>
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. Report Vehicle Breakdown Card */}
        <section className="breakdown-card" aria-label="Report Vehicle Breakdown Form">
          <div className="card-header-bar">
            <div className="card-title-group">
              <h2>
                <AlertTriangle size={18} color="#dc2626" />
                <span>Report Vehicle Breakdown</span>
              </h2>
              <p className="card-subtitle">
                Select the affected vehicle and provide the fault details to initiate the replacement and dispatch workflow.
              </p>
            </div>
          </div>

          <form onSubmit={handleOpenConfirmModal}>
            <div className="breakdown-form-grid">
              {/* Field 1: Affected Bus Dropdown */}
              <div className="bd-form-field">
                <label className="bd-field-label" htmlFor="bd-vehicle-select">
                  Affected Bus / Vehicle ID <span className="required">*</span>
                </label>
                <select
                  id="bd-vehicle-select"
                  className="bd-select"
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  required
                >
                  <option value="">Select Affected Fleet Bus</option>
                  {vehicles.map((v) => (
                    <option key={v.vehicleid} value={v.vehicleid}>
                      Bus #{v.vehicleid} — {v.registrationno} (Route:{" "}
                      {v.routeid || "Unassigned Spare"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Field 2: Registration Number (Auto populated) */}
              <div className="bd-form-field">
                <label className="bd-field-label" htmlFor="bd-reg-no">
                  Registration Number
                </label>
                <input
                  id="bd-reg-no"
                  type="text"
                  className="bd-input bd-readonly"
                  value={selectedVehicleObj?.registrationno || "Auto-detected upon vehicle selection"}
                  readOnly
                />
              </div>

              {/* Field 3: Assigned Route (Auto populated) */}
              <div className="bd-form-field">
                <label className="bd-field-label" htmlFor="bd-route-assigned">
                  Assigned Route
                </label>
                <input
                  id="bd-route-assigned"
                  type="text"
                  className="bd-input bd-readonly"
                  value={
                    selectedVehicleObj?.routeid
                      ? `${selectedVehicleObj.routeid}${
                          selectedVehicleRoute?.routename
                            ? ` — ${selectedVehicleRoute.routename}`
                            : ""
                        }`
                      : "Unassigned / Standby Spare Vehicle"
                  }
                  readOnly
                />
              </div>

              {/* Field 4: Breakdown Date and Time */}
              <div className="bd-form-field">
                <label className="bd-field-label" htmlFor="bd-datetime">
                  Breakdown Date and Time <span className="required">*</span>
                </label>
                <input
                  id="bd-datetime"
                  type="datetime-local"
                  className="bd-input"
                  value={breakdownDateTime}
                  onChange={(e) => setBreakdownDateTime(e.target.value)}
                  required
                />
              </div>

              {/* Field 5: Breakdown Reason / Fault Description */}
              <div className="bd-form-field form-field-full">
                <label className="bd-field-label" htmlFor="bd-reason-input">
                  Breakdown Reason / Fault Description <span className="required">*</span>
                </label>
                <textarea
                  id="bd-reason-input"
                  className="bd-textarea"
                  rows={2}
                  value={breakdownReason}
                  onChange={(e) => setBreakdownReason(e.target.value)}
                  placeholder="e.g. Engine overheating inspection, transmission failure, tire blowout on highway"
                  required
                />

                {/* Quick preset chips */}
                <div className="fault-chips-container">
                  <span className="fault-chip-hint">Quick Presets:</span>
                  {PRESET_FAULTS.map((fault) => (
                    <button
                      key={fault}
                      type="button"
                      className="fault-chip"
                      onClick={() => setBreakdownReason(fault)}
                    >
                      {fault}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="form-actions-row">
              <button
                type="submit"
                className="vm-btn-primary"
                disabled={isSubmitting || !selectedVehicleId}
                style={{ height: "38px", padding: "0 22px" }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="spin-icon" />
                    <span>Initiating Replacement Engine...</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert size={16} />
                    <span>Report Breakdown & Initiate Dispatch</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* 4. Breakdown & Replacement History Table Card */}
        <section
          className="breakdown-card"
          aria-label="Breakdown and Standby Bus Replacement History"
        >
          <div className="card-header-bar">
            <div className="card-title-group">
              <h3>
                <Wrench size={18} color="#1e3a8a" />
                <span>Breakdown & Replacement History</span>
              </h3>
              <p className="card-subtitle">
                Audit log of reported breakdowns, standby bus reassignments, and dispatch records.
              </p>
            </div>
          </div>

          {/* Compact Filter Toolbar */}
          <div className="breakdown-filter-bar">
            {/* Filter 1: Vehicle */}
            <div className="filter-input-wrap">
              <select
                className="filter-control"
                value={filterVehicle}
                onChange={(e) => setFilterVehicle(e.target.value)}
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

            {/* Filter 3: Status */}
            <div className="filter-input-wrap">
              <select
                className="filter-control"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                aria-label="Filter by status"
              >
                <option value="">All Statuses</option>
                <option value="Active Breakdown">Active Breakdown</option>
                <option value="Replaced">Replaced / Assigned</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>

            {/* Filter 4: Date From */}
            <div className="filter-input-wrap">
              <input
                type="date"
                className="filter-control"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                title="Date From"
                aria-label="Date From"
              />
            </div>

            {/* Filter 5: Date To */}
            <div className="filter-input-wrap">
              <input
                type="date"
                className="filter-control"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                title="Date To"
                aria-label="Date To"
              />
            </div>

            {/* Filter 6: Search Query */}
            <div className="filter-input-wrap">
              <Search size={14} className="filter-icon-inline" />
              <input
                type="text"
                className="filter-control with-icon"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search bus, route, reason..."
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

          {/* Records Table */}
          <div className="breakdown-table-responsive">
            <table className="breakdown-table">
              <thead>
                <tr>
                  <th style={{ width: "45px" }}>S.No</th>
                  <th>Vehicle ID</th>
                  <th>Registration No</th>
                  <th>Route</th>
                  <th>Breakdown Reason</th>
                  <th>Reported Date & Time</th>
                  <th>Replacement Bus</th>
                  <th>Dispatch Status</th>
                  <th>Notification Status</th>
                  <th style={{ textAlign: "center", width: "120px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="10">
                      <div className="table-empty-box">
                        <Loader2 size={24} className="spin-icon" color="#2563eb" />
                        <p>Loading breakdown history records...</p>
                      </div>
                    </td>
                  </tr>
                ) : paginatedBreakdowns.length === 0 ? (
                  <tr>
                    <td colSpan="10">
                      <div className="table-empty-box">
                        <ShieldAlert size={28} color="#94a3b8" />
                        <p>
                          {isFiltersActive
                            ? "No breakdown records match your filter criteria."
                            : "No vehicle breakdown records reported yet. Use the form above to log an event."}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedBreakdowns.map((b, idx) => {
                    const rowNumber = startIndex + idx;
                    const brokenId = b.broken_vehicleid || b.vehicleid || "—";
                    const brokenReg = b.broken_reg || b.registrationno || "—";
                    const spareId = b.replacement_vehicleid || b.new_vehicleid || "—";
                    const statusText = b.status || "Active Breakdown";

                    return (
                      <tr key={b.id || idx}>
                        <td>{rowNumber}</td>
                        <td>
                          <span className="badge-bus-broken">
                            <Bus size={12} />
                            <span>Bus #{brokenId}</span>
                          </span>
                        </td>
                        <td>
                          <strong>{brokenReg}</strong>
                        </td>
                        <td>
                          {b.routeid ? (
                            <span className="badge-route-pill" title={b.routename || ""}>
                              {b.routeid}
                            </span>
                          ) : (
                            <span style={{ color: "#94a3b8" }}>—</span>
                          )}
                        </td>
                        <td>
                          <span title={b.reason || ""}>
                            {b.reason || "Technical Breakdown"}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            <span>{formatDisplayDate(b.effective_date || b.created_at)}</span>
                            <small style={{ color: "#64748b", fontSize: "0.72rem" }}>
                              {formatDisplayTime(b.created_at) || "09:00 AM"}
                            </small>
                          </div>
                        </td>
                        <td>
                          {spareId !== "—" ? (
                            <span className="badge-bus-spare">
                              <CheckCircle2 size={12} />
                              <span>Spare #{spareId}</span>
                            </span>
                          ) : (
                            <span style={{ color: "#94a3b8" }}>Unassigned</span>
                          )}
                        </td>
                        <td>
                          <span
                            className={`badge-status ${
                              b.dispatch_status === "Failed"
                                ? "badge-status-active"
                                : "badge-status-replaced"
                            }`}
                          >
                            {b.dispatch_status || "Dispatched"}
                          </span>
                        </td>
                        <td>
                          <span className="badge-status badge-status-resolved">
                            <Send size={11} />
                            <span>{b.notification_status || "Sent"}</span>
                          </span>
                        </td>
                        <td>
                          <div className="breakdown-actions-wrap">
                            {/* View Details */}
                            <button
                              type="button"
                              className="btn-bd-action btn-bd-view"
                              onClick={() => setViewingRecord(b)}
                              title="View breakdown details"
                            >
                              <Eye size={13} />
                            </button>

                            {/* View Dispatch Info */}
                            <button
                              type="button"
                              className="btn-bd-action btn-bd-dispatch"
                              onClick={() => setViewingDispatchRecord(b)}
                              title="View dispatch notification information"
                            >
                              <Mail size={13} />
                            </button>

                            {/* Mark Resolved */}
                            {statusText !== "Resolved" && (
                              <button
                                type="button"
                                className="btn-bd-action btn-bd-resolve"
                                onClick={() => setResolvingRecord(b)}
                                title="Mark breakdown as resolved and restore bus"
                              >
                                <Check size={13} />
                              </button>
                            )}

                            {/* Delete Record */}
                            <button
                              type="button"
                              className="btn-bd-action btn-bd-delete"
                              onClick={() => setDeletingRecord(b)}
                              title="Delete breakdown entry"
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

          {/* Pagination Footer */}
          <div className="breakdown-pagination-bar">
            <div className="pagination-left">
              <span className="pagination-records-info">
                Showing {startIndex}–{endIndex} of {filteredBreakdowns.length} records
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
        </section>

        {/* 5. Active Email & SMS Dispatch Logs Card */}
        <section className="dispatch-logs-card" aria-label="Passenger Email and SMS Dispatch Logs">
          <div className="card-header-bar">
            <div className="card-title-group">
              <h3>
                <Mail size={18} color="#9333ea" />
                <span>Active Email & SMS Dispatch Logs</span>
              </h3>
              <p className="card-subtitle">
                Live multi-channel passenger notification feed and transmission status.
              </p>
            </div>

            {/* Channel and Status Filters */}
            <div className="dispatch-filter-bar">
              <select
                className="filter-control"
                style={{ width: "160px", height: "30px" }}
                value={logChannelFilter}
                onChange={(e) => setLogChannelFilter(e.target.value)}
              >
                <option value="">All Channels</option>
                <option value="Email & SMS">Email & SMS</option>
                <option value="SMS">SMS Only</option>
                <option value="Email">Email Only</option>
              </select>

              <select
                className="filter-control"
                style={{ width: "140px", height: "30px" }}
                value={logStatusFilter}
                onChange={(e) => setLogStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="Queued">Queued</option>
                <option value="Sent">Sent</option>
                <option value="Failed">Failed</option>
              </select>
            </div>
          </div>

          {filteredDispatchLogs.length === 0 ? (
            <div className="table-empty-box">
              <Mail size={32} color="#cbd5e1" />
              <p>No dispatch notifications have been recorded yet.</p>
            </div>
          ) : (
            <div className="dispatch-log-list">
              {filteredDispatchLogs.map((log, idx) => (
                <div key={log.id || idx} className="dispatch-log-item">
                  <div className="log-item-top">
                    <div className="log-recipient-info">
                      <Users size={14} color="#0f2744" />
                      <span>{log.recipient || "Affected Passenger"}</span>
                    </div>

                    <div className="log-meta-right">
                      <span className="log-channel-badge">
                        <Send size={11} />
                        <span>{log.channel || "Email & SMS"}</span>
                      </span>

                      <span
                        className={`badge-status ${
                          log.status === "Queued"
                            ? "badge-status-queued"
                            : log.status === "Failed"
                            ? "badge-status-active"
                            : "badge-status-resolved"
                        }`}
                      >
                        {log.status || "Queued"}
                      </span>
                    </div>
                  </div>

                  <p className="log-message-preview">{log.message}</p>

                  <div className="log-item-bottom">
                    <span className="log-timestamp">
                      <Clock size={12} />
                      <span>{formatDisplayDate(log.sent_at)}</span>
                      <span>•</span>
                      <span>{formatDisplayTime(log.sent_at) || "Just now"}</span>
                    </span>

                    {log.vehicle_ref && (
                      <span>
                        Reference: <strong>{log.vehicle_ref}</strong>
                      </span>
                    )}

                    {log.routeid && (
                      <span>
                        Route: <strong>{log.routeid}</strong>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ====================================================================
            MODAL 1: CONFIRM EMERGENCY DISPATCH
            ==================================================================== */}
        {showConfirmModal && (
          <div
            className="m-modal-backdrop"
            role="dialog"
            aria-modal="true"
            onClick={(e) => {
              if (e.target === e.currentTarget && !isSubmitting) setShowConfirmModal(false);
            }}
          >
            <div className="m-modal-card m-modal-card-small">
              <div className="m-modal-header">
                <div>
                  <h3 className="m-modal-title">Confirm Emergency Replacement</h3>
                  <p className="m-modal-subtitle">Verify fleet transfer and dispatch broadcast</p>
                </div>
                <button
                  type="button"
                  className="m-modal-close-btn"
                  onClick={() => !isSubmitting && setShowConfirmModal(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="m-modal-body">
                <div className="delete-confirm-box" style={{ background: "#eff6ff", borderColor: "#bfdbfe" }}>
                  <ShieldAlert size={28} color="#1d4ed8" />
                  <p className="delete-confirm-text" style={{ color: "#1e3a8a" }}>
                    Are you sure you want to report a breakdown for{" "}
                    <strong>Bus #{selectedVehicleId}</strong> ({selectedVehicleObj?.registrationno})?
                    This action will query available standby buses, transfer Route{" "}
                    <strong>{selectedVehicleObj?.routeid || "N/A"}</strong>, and queue Email & SMS
                    dispatches to affected passengers.
                  </p>
                </div>

                <div className="view-details-grid">
                  <div className="view-detail-item">
                    <span className="view-detail-label">Reported Fault</span>
                    <span className="view-detail-value">{breakdownReason}</span>
                  </div>
                  <div className="view-detail-item">
                    <span className="view-detail-label">Timestamp</span>
                    <span className="view-detail-value">
                      {new Date(breakdownDateTime).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>

              <div className="m-modal-footer">
                <button
                  type="button"
                  className="vm-btn-secondary"
                  onClick={() => setShowConfirmModal(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="vm-btn-primary"
                  onClick={handleExecuteBreakdown}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="spin-icon" />
                      <span>Dispatching...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Confirm & Initiate Dispatch</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================================
            MODAL 2: VIEW BREAKDOWN DETAILS
            ==================================================================== */}
        {viewingRecord && (
          <div
            className="m-modal-backdrop"
            role="dialog"
            aria-modal="true"
            onClick={(e) => {
              if (e.target === e.currentTarget) setViewingRecord(null);
            }}
          >
            <div className="m-modal-card">
              <div className="m-modal-header">
                <div>
                  <h3 className="m-modal-title">Breakdown & Replacement Details</h3>
                  <p className="m-modal-subtitle">
                    Vehicle #{viewingRecord.broken_vehicleid || viewingRecord.vehicleid} Audit Log
                  </p>
                </div>
                <button
                  type="button"
                  className="m-modal-close-btn"
                  onClick={() => setViewingRecord(null)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="m-modal-body">
                <div className="view-details-grid">
                  <div className="view-detail-item">
                    <span className="view-detail-label">Affected Vehicle</span>
                    <span className="view-detail-value">
                      Bus #{viewingRecord.broken_vehicleid || viewingRecord.vehicleid}
                    </span>
                  </div>

                  <div className="view-detail-item">
                    <span className="view-detail-label">Registration Number</span>
                    <span className="view-detail-value">
                      {viewingRecord.broken_reg || viewingRecord.registrationno || "—"}
                    </span>
                  </div>

                  <div className="view-detail-item">
                    <span className="view-detail-label">Assigned Route</span>
                    <span className="view-detail-value">
                      {viewingRecord.routeid
                        ? `${viewingRecord.routeid} ${
                            viewingRecord.routename ? `(${viewingRecord.routename})` : ""
                          }`
                        : "Unassigned"}
                    </span>
                  </div>

                  <div className="view-detail-item">
                    <span className="view-detail-label">Replacement Spare Bus</span>
                    <span className="view-detail-value">
                      {viewingRecord.replacement_vehicleid || viewingRecord.new_vehicleid
                        ? `Spare #${viewingRecord.replacement_vehicleid || viewingRecord.new_vehicleid}`
                        : "None Allocated"}
                    </span>
                  </div>

                  <div className="view-detail-item">
                    <span className="view-detail-label">Reported Date & Time</span>
                    <span className="view-detail-value">
                      {formatDisplayDate(viewingRecord.effective_date || viewingRecord.created_at)}{" "}
                      {formatDisplayTime(viewingRecord.created_at)}
                    </span>
                  </div>

                  <div className="view-detail-item">
                    <span className="view-detail-label">Operational Status</span>
                    <span className="view-detail-value">
                      <span className="badge-status badge-status-active">
                        {viewingRecord.status || "Active Breakdown"}
                      </span>
                    </span>
                  </div>

                  <div className="view-detail-item item-full">
                    <span className="view-detail-label">Breakdown Reason / Fault Description</span>
                    <span className="view-detail-value" style={{ fontWeight: 600 }}>
                      {viewingRecord.reason || "Technical Fault"}
                    </span>
                  </div>

                  <div className="view-detail-item item-full">
                    <span className="view-detail-label">Passenger Broadcast Message</span>
                    <span
                      className="view-detail-value"
                      style={{
                        background: "#f8fafc",
                        padding: "10px 12px",
                        borderRadius: "6px",
                        border: "1px solid #e2e8f0",
                        fontSize: "0.8rem",
                        lineHeight: 1.45
                      }}
                    >
                      {viewingRecord.message || "Standard fleet breakdown notification dispatched."}
                    </span>
                  </div>
                </div>
              </div>

              <div className="m-modal-footer">
                <button
                  type="button"
                  className="vm-btn-secondary"
                  onClick={() => setViewingRecord(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================================
            MODAL 3: VIEW DISPATCH INFORMATION
            ==================================================================== */}
        {viewingDispatchRecord && (
          <div
            className="m-modal-backdrop"
            role="dialog"
            aria-modal="true"
            onClick={(e) => {
              if (e.target === e.currentTarget) setViewingDispatchRecord(null);
            }}
          >
            <div className="m-modal-card m-modal-card-large">
              <div className="m-modal-header">
                <div>
                  <h3 className="m-modal-title">Passenger Dispatch Information</h3>
                  <p className="m-modal-subtitle">
                    Route {viewingDispatchRecord.routeid || "N/A"} Broadcast Summary
                  </p>
                </div>
                <button
                  type="button"
                  className="m-modal-close-btn"
                  onClick={() => setViewingDispatchRecord(null)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="m-modal-body">
                <div style={{ marginBottom: "14px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <div className="result-pill">
                    <Bus size={13} color="#dc2626" />
                    <span>
                      Broken Bus: <strong>#{viewingDispatchRecord.broken_vehicleid || viewingDispatchRecord.vehicleid}</strong>
                    </span>
                  </div>
                  <div className="result-pill">
                    <Bus size={13} color="#16a34a" />
                    <span>
                      Spare Bus: <strong>#{viewingDispatchRecord.replacement_vehicleid || viewingDispatchRecord.new_vehicleid}</strong>
                    </span>
                  </div>
                  <div className="result-pill">
                    <Mail size={13} color="#9333ea" />
                    <span>Channel: <strong>Email & SMS Alerts</strong></span>
                  </div>
                </div>

                <div className="view-detail-item" style={{ marginBottom: "16px" }}>
                  <span className="view-detail-label">Dispatched Message Content</span>
                  <div
                    style={{
                      background: "#f8fafc",
                      padding: "12px 14px",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      fontSize: "0.82rem",
                      lineHeight: 1.45,
                      color: "#1e293b"
                    }}
                  >
                    {viewingDispatchRecord.message || "Emergency replacement notification dispatched."}
                  </div>
                </div>

                <div>
                  <span className="view-detail-label" style={{ marginBottom: "8px", display: "block" }}>
                    Passenger Transmission Log Feed
                  </span>

                  {dispatchLogs.length === 0 ? (
                    <p style={{ fontSize: "0.82rem", color: "#64748b" }}>
                      Individual passenger delivery receipts are recorded in the central SMS gateway.
                    </p>
                  ) : (
                    <div style={{ maxHeight: "240px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
                      {dispatchLogs
                        .filter(
                          (l) =>
                            !viewingDispatchRecord.routeid ||
                            l.routeid === viewingDispatchRecord.routeid
                        )
                        .slice(0, 15)
                        .map((l, i) => (
                          <div
                            key={l.id || i}
                            style={{
                              padding: "8px 10px",
                              background: "#ffffff",
                              border: "1px solid #e2e8f0",
                              borderRadius: "6px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              fontSize: "0.78rem"
                            }}
                          >
                            <span>
                              <strong>{l.recipient}</strong>
                            </span>
                            <span className="badge-status badge-status-resolved">
                              {l.status || "Queued"}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="m-modal-footer">
                <button
                  type="button"
                  className="vm-btn-secondary"
                  onClick={() => setViewingDispatchRecord(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================================
            MODAL 4: MARK AS RESOLVED
            ==================================================================== */}
        {resolvingRecord && (
          <div
            className="m-modal-backdrop"
            role="dialog"
            aria-modal="true"
            onClick={(e) => {
              if (e.target === e.currentTarget && !isResolving) setResolvingRecord(null);
            }}
          >
            <div className="m-modal-card m-modal-card-small">
              <div className="m-modal-header">
                <div>
                  <h3 className="m-modal-title">Resolve Breakdown & Restore Fleet</h3>
                  <p className="m-modal-subtitle">Mark maintenance repairs complete</p>
                </div>
                <button
                  type="button"
                  className="m-modal-close-btn"
                  onClick={() => !isResolving && setResolvingRecord(null)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="m-modal-body">
                <div className="delete-confirm-box" style={{ background: "#f0fdf4", borderColor: "#bbf7d0" }}>
                  <CheckCircle2 size={28} color="#16a34a" />
                  <p className="delete-confirm-text" style={{ color: "#166534" }}>
                    Are you sure you want to mark the breakdown for{" "}
                    <strong>Bus #{resolvingRecord.broken_vehicleid || resolvingRecord.vehicleid}</strong> as{" "}
                    <strong>Resolved</strong>? This will update the status to active service.
                  </p>
                </div>
              </div>

              <div className="m-modal-footer">
                <button
                  type="button"
                  className="vm-btn-secondary"
                  onClick={() => setResolvingRecord(null)}
                  disabled={isResolving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="vm-btn-primary"
                  onClick={handleConfirmResolve}
                  disabled={isResolving}
                >
                  {isResolving ? (
                    <>
                      <Loader2 size={16} className="spin-icon" />
                      <span>Resolving...</span>
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      <span>Mark as Resolved</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================================
            MODAL 5: DELETE CONFIRMATION
            ==================================================================== */}
        {deletingRecord && (
          <div
            className="m-modal-backdrop"
            role="dialog"
            aria-modal="true"
            onClick={(e) => {
              if (e.target === e.currentTarget && !isDeleting) setDeletingRecord(null);
            }}
          >
            <div className="m-modal-card m-modal-card-small">
              <div className="m-modal-header">
                <div>
                  <h3 className="m-modal-title">Delete Breakdown Record</h3>
                  <p className="m-modal-subtitle">Confirm deletion of entry</p>
                </div>
                <button
                  type="button"
                  className="m-modal-close-btn"
                  onClick={() => !isDeleting && setDeletingRecord(null)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="m-modal-body">
                <div className="delete-confirm-box">
                  <AlertTriangle size={28} color="#dc2626" />
                  <p className="delete-confirm-text">
                    Are you sure you want to delete the breakdown record for{" "}
                    <strong>Bus #{deletingRecord.broken_vehicleid || deletingRecord.vehicleid}</strong>?
                    This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="m-modal-footer">
                <button
                  type="button"
                  className="vm-btn-secondary"
                  onClick={() => setDeletingRecord(null)}
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
                      <Loader2 size={16} className="spin-icon" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 size={16} />
                      <span>Delete Record</span>
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

export default BreakdownReplacement;
