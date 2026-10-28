import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  RotateCcw,
  FileSpreadsheet,
  Plus,
  Eye,
  Pencil,
  Trash2,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  BusFront,
  Wrench,
  CalendarCheck2,
  AlertTriangle,
  IndianRupee
} from "lucide-react";
import { exportToExcel } from "./ReportGenerator";
import { API_URL } from "../config";
import "../styles/MaintenanceManagement.css";

const toDateInput = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
};

const getRecordStatus = (record) => {
  const raw = String(record.status || "").trim();
  if (raw.toLowerCase() === "completed") return "Completed";

  if (record.next_due_date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(record.next_due_date);
    due.setHours(0, 0, 0, 0);
    if (!isNaN(due.getTime()) && due < today) {
      return "Overdue";
    }
  }

  if (raw.toLowerCase() === "upcoming") return "Upcoming";
  if (raw.toLowerCase() === "overdue") return "Overdue";
  return raw || "Scheduled";
};

const MaintenanceManagement = () => {
  const navigate = useNavigate();

  // Data States
  const [maintenanceRecords, setMaintenanceRecords] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 3-Second Auto-Dismissing Flash Notification
  const [flashCard, setFlashCard] = useState(null);
  const flashTimerRef = useRef(null);

  const showFlash = (message, type = "success", title = "") => {
    if (flashTimerRef.current) {
      clearTimeout(flashTimerRef.current);
    }
    const defaultTitle = type === "success" ? "Success" : type === "danger" ? "Error" : "Notice";
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
  const [vehicleFilter, setVehicleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFromFilter, setDateFromFilter] = useState("");
  const [dateToFilter, setDateToFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Pagination States (Fixed 5 records per page)
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;

  // Modal States (Add & Edit)
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // 'add' or 'edit'
  const [editingRecord, setEditingRecord] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const [formData, setFormData] = useState({
    vehicleid: "",
    service_type: "",
    service_date: toDateInput(new Date()),
    next_due_date: "",
    cost: "",
    vendor: "",
    status: "Scheduled",
    remarks: ""
  });

  // View Details Modal State
  const [viewingRecord, setViewingRecord] = useState(null);

  // Delete Confirmation Modal State
  const [deletingRecord, setDeletingRecord] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch initial data
  useEffect(() => {
    fetchRecords();
    fetchVehicles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchVehicles = async () => {
    try {
      const res = await axios.get(`${API_URL}/getVehicle`);
      if (Array.isArray(res.data)) {
        setVehicles(res.data);
      }
    } catch (err) {
      console.error("Error fetching vehicles:", err);
    }
  };

  const fetchRecords = async () => {
    setIsRefreshing(true);
    try {
      const res = await axios.get(`${API_URL}/api/maintenance`);
      if (res.data && Array.isArray(res.data.maintenanceRecords)) {
        const active = res.data.maintenanceRecords.filter(
          (r) => !r.isDeleted && String(r.status || "").toLowerCase() !== "deleted"
        );
        setMaintenanceRecords(active);
      } else {
        setMaintenanceRecords([]);
      }
    } catch (err) {
      console.error("Error fetching maintenance records:", err);
      showFlash("Failed to load maintenance records from server.", "danger", "Connection Error");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Summary Metrics (Dynamically Calculated)
  const summaryMetrics = useMemo(() => {
    const totalRecords = maintenanceRecords.length;
    let upcomingCount = 0;
    let overdueCount = 0;
    let totalCost = 0;

    maintenanceRecords.forEach((r) => {
      const status = getRecordStatus(r);
      if (status === "Upcoming" || status === "Scheduled") {
        upcomingCount++;
      } else if (status === "Overdue") {
        overdueCount++;
      }
      totalCost += Number(r.cost) || 0;
    });

    return {
      totalRecords,
      upcomingCount,
      overdueCount,
      totalCost
    };
  }, [maintenanceRecords]);

  // Unique Vehicle IDs for Filter Dropdown
  const uniqueVehicleIds = useMemo(() => {
    const fromRecords = maintenanceRecords.map((r) => String(r.vehicleid || "")).filter(Boolean);
    const fromVehicles = vehicles.map((v) => String(v.vehicleid || "")).filter(Boolean);
    return Array.from(new Set([...fromVehicles, ...fromRecords])).sort((a, b) => {
      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });
  }, [maintenanceRecords, vehicles]);

  // Filtering Logic
  const filteredRecords = useMemo(() => {
    return maintenanceRecords.filter((record) => {
      // Vehicle Filter
      if (vehicleFilter && String(record.vehicleid) !== String(vehicleFilter)) {
        return false;
      }

      // Status Filter
      if (statusFilter) {
        const computedStatus = getRecordStatus(record);
        if (computedStatus.toLowerCase() !== statusFilter.toLowerCase()) {
          return false;
        }
      }

      // Date Range Filters
      if (dateFromFilter && record.service_date) {
        if (new Date(record.service_date) < new Date(dateFromFilter)) {
          return false;
        }
      }
      if (dateToFilter && record.service_date) {
        if (new Date(record.service_date) > new Date(dateToFilter)) {
          return false;
        }
      }

      // Search Term (Description, Service Type, Vendor, Remarks)
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const serviceType = String(record.service_type || "").toLowerCase();
        const vendor = String(record.vendor || "").toLowerCase();
        const remarks = String(record.remarks || "").toLowerCase();
        const busNum = String(record.vehicleid || "").toLowerCase();
        if (
          !serviceType.includes(term) &&
          !vendor.includes(term) &&
          !remarks.includes(term) &&
          !busNum.includes(term)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [maintenanceRecords, vehicleFilter, statusFilter, dateFromFilter, dateToFilter, searchTerm]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [vehicleFilter, statusFilter, dateFromFilter, dateToFilter, searchTerm]);

  const isFiltersActive = Boolean(
    vehicleFilter || statusFilter || dateFromFilter || dateToFilter || searchTerm
  );

  const handleClearFilters = () => {
    setVehicleFilter("");
    setStatusFilter("");
    setDateFromFilter("");
    setDateToFilter("");
    setSearchTerm("");
    setCurrentPage(1);
  };

  // Pagination Calculations
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / rowsPerPage));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredRecords.slice(start, start + rowsPerPage);
  }, [filteredRecords, currentPage, rowsPerPage]);

  const startIndex = filteredRecords.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const endIndex = Math.min(currentPage * rowsPerPage, filteredRecords.length);

  // Open Add Modal
  const handleOpenAddModal = () => {
    const today = new Date();
    const nextDue = new Date(today);
    nextDue.setDate(nextDue.getDate() + 30);

    setFormData({
      vehicleid: vehicles[0]?.vehicleid ? String(vehicles[0].vehicleid) : "",
      service_type: "",
      service_date: toDateInput(today),
      next_due_date: toDateInput(nextDue),
      cost: "",
      vendor: "",
      status: "Scheduled",
      remarks: ""
    });
    setFormErrors({});
    setModalMode("add");
    setEditingRecord(null);
    setShowModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (record) => {
    setFormData({
      vehicleid: String(record.vehicleid || ""),
      service_type: record.service_type || "",
      service_date: record.service_date ? record.service_date.split("T")[0] : "",
      next_due_date: record.next_due_date ? record.next_due_date.split("T")[0] : "",
      cost: record.cost !== undefined && record.cost !== null ? String(record.cost) : "",
      vendor: record.vendor || "",
      status: record.status || "Scheduled",
      remarks: record.remarks || ""
    });
    setFormErrors({});
    setModalMode("edit");
    setEditingRecord(record);
    setShowModal(true);
  };

  // Form Validation
  const validateForm = () => {
    const errors = {};
    if (!formData.vehicleid) {
      errors.vehicleid = "Please select a vehicle";
    }
    if (!formData.service_type.trim()) {
      errors.service_type = "Service type / maintenance title is required";
    }
    if (!formData.service_date) {
      errors.service_date = "Service date is required";
    }
    if (formData.cost !== "" && Number(formData.cost) < 0) {
      errors.cost = "Cost cannot be negative";
    }
    if (formData.service_date && formData.next_due_date) {
      if (new Date(formData.next_due_date) < new Date(formData.service_date)) {
        errors.next_due_date = "Next due date cannot be earlier than service date";
      }
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Handler (Create & Update)
  const handleSubmitService = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    const payload = {
      vehicleid: String(formData.vehicleid),
      service_type: formData.service_type.trim(),
      service_date: formData.service_date,
      next_due_date: formData.next_due_date || null,
      cost: Number(formData.cost) || 0,
      vendor: formData.vendor.trim() || "Authorized Service Station",
      status: formData.status || "Scheduled",
      remarks: formData.remarks.trim() || "Routine maintenance entry"
    };

    try {
      if (modalMode === "add") {
        const res = await axios.post(`${API_URL}/api/maintenance`, payload);
        if (res.data && res.data.success) {
          showFlash("Vehicle service entry logged successfully!", "success", "Service Saved");
          setShowModal(false);
          fetchRecords();
        } else {
          showFlash(res.data?.message || "Failed to log maintenance record.", "danger");
        }
      } else {
        const res = await axios.put(`${API_URL}/api/maintenance/${editingRecord.id}`, payload);
        if (res.data && res.data.success) {
          showFlash("Maintenance record updated successfully!", "success", "Record Updated");
          setShowModal(false);
          fetchRecords();
        } else {
          showFlash(res.data?.message || "Failed to update maintenance record.", "danger");
        }
      }
    } catch (err) {
      console.error("Error saving maintenance record:", err);
      showFlash("An error occurred while saving the service record.", "danger", "Request Error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Status Update (Mark Completed)
  const handleQuickStatusUpdate = async (id, newStatus) => {
    try {
      const res = await axios.put(`${API_URL}/api/maintenance/${id}`, { status: newStatus });
      if (res.data && res.data.success) {
        showFlash(`Service status marked as ${newStatus}.`, "success", "Status Updated");
        fetchRecords();
      }
    } catch (err) {
      console.error("Error updating status:", err);
      showFlash("Failed to update status.", "danger");
    }
  };

  // Delete Handler
  const handleConfirmDelete = async () => {
    if (!deletingRecord) return;
    setIsDeleting(true);
    try {
      const res = await axios.delete(`${API_URL}/api/maintenance/${deletingRecord.id}`);
      if (res.data && res.data.success) {
        showFlash(`Maintenance record #${deletingRecord.id} deleted successfully.`, "success", "Record Deleted");
        setDeletingRecord(null);
        fetchRecords();
        return;
      }
    } catch (err) {
      // Fallback in case backend process hasn't reloaded the DELETE route
      try {
        await axios.put(`${API_URL}/api/maintenance/${deletingRecord.id}`, { status: "Deleted", isDeleted: true });
        showFlash(`Maintenance record #${deletingRecord.id} deleted successfully.`, "success", "Record Deleted");
        setDeletingRecord(null);
        fetchRecords();
        return;
      } catch (err2) {
        console.error("Error deleting maintenance record:", err2);
        showFlash("Failed to delete record. Please try again.", "danger", "Delete Error");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // Excel Export
  const handleExportExcel = () => {
    if (!filteredRecords.length) {
      showFlash("No maintenance records available to export.", "notice", "Export Notice");
      return;
    }

    const exportData = filteredRecords.map((r, idx) => ({
      "S.No": idx + 1,
      "Vehicle ID": `Bus #${r.vehicleid}`,
      "Maintenance Description": r.service_type || "N/A",
      "Service Date": r.service_date ? r.service_date.split("T")[0] : "N/A",
      "Next Due Date": r.next_due_date ? r.next_due_date.split("T")[0] : "N/A",
      "Cost (INR)": Number(r.cost) || 0,
      "Service Vendor": r.vendor || "N/A",
      Status: getRecordStatus(r),
      Remarks: r.remarks || ""
    }));

    exportToExcel(exportData, "Vehicle_Maintenance_Schedule");
    showFlash("Maintenance records exported to Excel successfully!", "success", "Export Completed");
  };

  return (
    <div className="maintenance-master-container">
      <div className="maintenance-box-wrapper">
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

        {/* 1. Breadcrumbs & Header */}
        <nav className="vm-breadcrumb-nav" aria-label="Breadcrumb">
          <span className="link" onClick={() => navigate("/home")}>
            Dashboard
          </span>
          <span className="sep">/</span>
          <span className="link" onClick={() => navigate("/home")}>
            Vehicle Maintenance
          </span>
          <span className="sep">/</span>
          <span className="current">Service History & Schedule</span>
        </nav>

        <header className="vm-page-header">
          <div className="vm-header-left">
            <div className="vm-title-row">
              <h1 className="vm-page-title">Service History & Schedule</h1>
              <span className="vm-total-count-badge">
                {summaryMetrics.totalRecords} Records
              </span>
            </div>
            <p className="vm-page-subtitle">
              Manage vehicle maintenance records, upcoming service schedules, repair costs, and service vendors.
            </p>
          </div>

          <div className="vm-header-actions">
            <button
              type="button"
              className="vm-btn-secondary"
              onClick={fetchRecords}
              disabled={isRefreshing}
              title="Refresh maintenance records"
            >
              <RotateCcw size={15} className={isRefreshing ? "spin-icon" : ""} />
              <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
            </button>

            <button
              type="button"
              className="vm-btn-secondary"
              onClick={handleExportExcel}
              disabled={filteredRecords.length === 0}
              title="Export maintenance records to Excel report"
            >
              <FileSpreadsheet size={15} />
              <span>Excel Report</span>
            </button>

            <button
              type="button"
              className="vm-btn-primary"
              onClick={handleOpenAddModal}
              title="Log new vehicle maintenance entry"
            >
              <Plus size={16} strokeWidth={2.4} />
              <span>Log New Service</span>
            </button>
          </div>
        </header>

        {/* 2. Summary Cards (Four Compact Cards in One Row) */}
        <section className="maintenance-summary-grid" aria-label="Maintenance Summary Overview">
          {/* Card 1: Total Records */}
          <div className="maintenance-summary-card">
            <div className="summary-icon-box summary-icon-blue">
              <Wrench size={20} />
            </div>
            <div className="summary-card-content">
              <span className="summary-card-value">{summaryMetrics.totalRecords}</span>
              <span className="summary-card-label">Total Service Records</span>
            </div>
          </div>

          {/* Card 2: Upcoming Services */}
          <div className="maintenance-summary-card">
            <div className="summary-icon-box summary-icon-amber">
              <CalendarCheck2 size={20} />
            </div>
            <div className="summary-card-content">
              <span className="summary-card-value">{summaryMetrics.upcomingCount}</span>
              <span className="summary-card-label">Upcoming Services</span>
            </div>
          </div>

          {/* Card 3: Overdue Services */}
          <div className="maintenance-summary-card">
            <div className="summary-icon-box summary-icon-red">
              <AlertTriangle size={20} />
            </div>
            <div className="summary-card-content">
              <span className="summary-card-value">{summaryMetrics.overdueCount}</span>
              <span className="summary-card-label">Overdue Services</span>
            </div>
          </div>

          {/* Card 4: Total Maintenance Cost */}
          <div className="maintenance-summary-card">
            <div className="summary-icon-box summary-icon-green">
              <IndianRupee size={20} />
            </div>
            <div className="summary-card-content">
              <span className="summary-card-value">
                ₹{summaryMetrics.totalCost.toLocaleString("en-IN")}
              </span>
              <span className="summary-card-label">Total Maintenance Cost</span>
            </div>
          </div>
        </section>

        {/* 3. Compact Filter Card */}
        <section className="maintenance-filter-card" aria-label="Maintenance Filters">
          <div className="maintenance-filter-row">
            {/* Filter: Vehicle ID */}
            <div className="maintenance-filter-item">
              <label htmlFor="filter-vehicle-id" className="maintenance-filter-label">
                Vehicle ID
              </label>
              <select
                id="filter-vehicle-id"
                className="maintenance-filter-select"
                value={vehicleFilter}
                onChange={(e) => setVehicleFilter(e.target.value)}
              >
                <option value="">All Vehicles</option>
                {uniqueVehicleIds.map((vId) => (
                  <option key={vId} value={vId}>
                    Bus #{vId}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter: Status */}
            <div className="maintenance-filter-item">
              <label htmlFor="filter-status" className="maintenance-filter-label">
                Service Status
              </label>
              <select
                id="filter-status"
                className="maintenance-filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Upcoming">Upcoming</option>
                <option value="Completed">Completed</option>
                <option value="Overdue">Overdue</option>
              </select>
            </div>

            {/* Filter: Date From */}
            <div className="maintenance-filter-item">
              <label htmlFor="filter-date-from" className="maintenance-filter-label">
                Service Date From
              </label>
              <input
                type="date"
                id="filter-date-from"
                className="maintenance-filter-input"
                value={dateFromFilter}
                onChange={(e) => setDateFromFilter(e.target.value)}
              />
            </div>

            {/* Filter: Date To */}
            <div className="maintenance-filter-item">
              <label htmlFor="filter-date-to" className="maintenance-filter-label">
                Service Date To
              </label>
              <input
                type="date"
                id="filter-date-to"
                className="maintenance-filter-input"
                value={dateToFilter}
                onChange={(e) => setDateToFilter(e.target.value)}
              />
            </div>

            {/* Filter: Search Keyword */}
            <div className="maintenance-filter-item filter-search-item">
              <label htmlFor="filter-search-kw" className="maintenance-filter-label">
                Search Description / Vendor
              </label>
              <input
                type="text"
                id="filter-search-kw"
                className="maintenance-filter-input"
                placeholder="Search service, vendor, notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filter Buttons */}
            <div className="maintenance-filter-item filter-actions-item">
              <button
                type="button"
                className="btn-filter-clear"
                onClick={handleClearFilters}
                disabled={!isFiltersActive}
                title="Reset all filter selections"
              >
                <X size={14} />
                <span>Clear Filters</span>
              </button>
            </div>
          </div>
        </section>

        {/* 4. Maintenance Records Table */}
        <section className="maintenance-table-container" aria-label="Maintenance Records Table">
          {loading ? (
            <div className="m-loading-container">
              <Loader2 size={32} className="spin-icon" color="#0f2744" />
              <p style={{ marginTop: "10px", fontSize: "0.86rem" }}>
                Loading vehicle maintenance records...
              </p>
            </div>
          ) : (
            <>
              <div className="table-responsive-wrapper">
                <table className="maintenance-table">
                  <thead>
                    <tr>
                      <th style={{ width: "50px" }}>S.No</th>
                      <th style={{ width: "110px" }}>Vehicle ID</th>
                      <th>Maintenance Description</th>
                      <th style={{ width: "120px" }}>Service Date</th>
                      <th style={{ width: "120px" }}>Next Due Date</th>
                      <th style={{ width: "100px" }}>Cost (₹)</th>
                      <th style={{ width: "160px" }}>Service Vendor</th>
                      <th style={{ width: "110px" }}>Status</th>
                      <th style={{ width: "140px", textAlign: "center" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRecords.length > 0 ? (
                      paginatedRecords.map((record, idx) => {
                        const computedStatus = getRecordStatus(record);
                        const statusClass = `status-${computedStatus.toLowerCase()}`;
                        const isCompleted = computedStatus === "Completed";

                        return (
                          <tr key={record.id || idx}>
                            <td className="td-sno">
                              {(currentPage - 1) * rowsPerPage + idx + 1}
                            </td>
                            <td>
                              <span className="td-vehicle-badge">
                                <BusFront size={12} />
                                Bus #{record.vehicleid}
                              </span>
                            </td>
                            <td>
                              <div className="td-desc-title">{record.service_type}</div>
                              {record.remarks && (
                                <div className="td-desc-remarks" title={record.remarks}>
                                  {record.remarks}
                                </div>
                              )}
                            </td>
                            <td className="td-date">{formatDate(record.service_date)}</td>
                            <td className="td-date">{formatDate(record.next_due_date)}</td>
                            <td className="td-cost">
                              ₹{(Number(record.cost) || 0).toLocaleString("en-IN")}
                            </td>
                            <td className="td-vendor">{record.vendor || "—"}</td>
                            <td>
                              <span className={`m-status-badge ${statusClass}`}>
                                {computedStatus}
                              </span>
                            </td>
                            <td>
                              <div className="table-actions-cell">
                                <button
                                  type="button"
                                  className="btn-action-icon btn-action-view"
                                  onClick={() => setViewingRecord(record)}
                                  title="View Details"
                                  aria-label="View Details"
                                >
                                  <Eye size={14} />
                                </button>

                                <button
                                  type="button"
                                  className="btn-action-icon btn-action-edit"
                                  onClick={() => handleOpenEditModal(record)}
                                  title="Edit Service"
                                  aria-label="Edit Service"
                                >
                                  <Pencil size={14} />
                                </button>

                                <button
                                  type="button"
                                  className="btn-action-icon btn-action-delete"
                                  onClick={() => setDeletingRecord(record)}
                                  title="Delete Record"
                                  aria-label="Delete Record"
                                >
                                  <Trash2 size={14} />
                                </button>

                                {!isCompleted && (
                                  <button
                                    type="button"
                                    className="btn-action-complete"
                                    onClick={() => handleQuickStatusUpdate(record.id, "Completed")}
                                    title="Mark service as Completed"
                                  >
                                    <Check size={12} />
                                    <span>Complete</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="9">
                          <div className="m-empty-container">
                            <Wrench size={40} strokeWidth={1.5} color="#94a3b8" />
                            <h4 className="m-empty-title">No Maintenance Records Found</h4>
                            <p className="m-empty-desc">
                              {isFiltersActive
                                ? "No records match your active search and filter criteria. Try clearing your filters."
                                : "No vehicle maintenance records logged yet. Click 'Log New Service' above to schedule an entry."}
                            </p>
                            {isFiltersActive && (
                              <button
                                type="button"
                                className="vm-btn-secondary"
                                onClick={handleClearFilters}
                                style={{ marginTop: "12px" }}
                              >
                                Clear All Filters
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* 5. Pagination Footer (Fixed 5 records per page) */}
              <div className="maintenance-pagination-bar">
                <div className="pagination-left">
                  <span className="pagination-records-info">
                    Showing {startIndex}–{endIndex} of {filteredRecords.length} records
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
                    <ChevronLeft size={15} />
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
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            </>
          )}
        </section>

        {/* ====================================================================
            6. ADD & EDIT SERVICE MODAL POPUP
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
                <div className="m-modal-title-wrap">
                  <h3 className="m-modal-title">
                    {modalMode === "add" ? "Log New Service" : "Edit Service"}
                  </h3>
                  <p className="m-modal-subtitle">
                    {modalMode === "add"
                      ? "Enter vehicle service details, maintenance costs, and the next service schedule."
                      : "Update vehicle service details, maintenance costs, and service schedules."}
                  </p>
                </div>
                <button
                  type="button"
                  className="m-modal-close-btn"
                  onClick={() => !isSubmitting && setShowModal(false)}
                  aria-label="Close popup"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmitService} noValidate>
                <div className="m-modal-body">
                  <div className="m-form-grid">
                    {/* Bus Number / Vehicle ID */}
                    <div className="m-field-group">
                      <label htmlFor="form-vehicle-id" className="m-field-label">
                        Bus Number / Vehicle ID <span className="m-req-star">*</span>
                      </label>
                      <select
                        id="form-vehicle-id"
                        className={`m-form-control ${formErrors.vehicleid ? "input-error" : ""}`}
                        value={formData.vehicleid}
                        onChange={(e) => {
                          setFormData({ ...formData, vehicleid: e.target.value });
                          if (formErrors.vehicleid) setFormErrors({ ...formErrors, vehicleid: "" });
                        }}
                      >
                        <option value="">Select a registered bus</option>
                        {vehicles.map((v) => (
                          <option key={v.vehicleid} value={v.vehicleid}>
                            Bus #{v.vehicleid} {v.registrationno ? `(${v.registrationno})` : ""}
                          </option>
                        ))}
                      </select>
                      {formErrors.vehicleid && (
                        <span className="m-inline-error">{formErrors.vehicleid}</span>
                      )}
                    </div>

                    {/* Service Type / Maintenance Title */}
                    <div className="m-field-group">
                      <label htmlFor="form-service-type" className="m-field-label">
                        Service Type / Maintenance Title <span className="m-req-star">*</span>
                      </label>
                      <input
                        type="text"
                        id="form-service-type"
                        className={`m-form-control ${formErrors.service_type ? "input-error" : ""}`}
                        placeholder="e.g. Engine Oil Service, Brake Pad Replacement"
                        value={formData.service_type}
                        onChange={(e) => {
                          setFormData({ ...formData, service_type: e.target.value });
                          if (formErrors.service_type)
                            setFormErrors({ ...formErrors, service_type: "" });
                        }}
                      />
                      {formErrors.service_type && (
                        <span className="m-inline-error">{formErrors.service_type}</span>
                      )}
                    </div>

                    {/* Service Date */}
                    <div className="m-field-group">
                      <label htmlFor="form-service-date" className="m-field-label">
                        Service Date <span className="m-req-star">*</span>
                      </label>
                      <input
                        type="date"
                        id="form-service-date"
                        className={`m-form-control ${formErrors.service_date ? "input-error" : ""}`}
                        value={formData.service_date}
                        onChange={(e) => {
                          setFormData({ ...formData, service_date: e.target.value });
                          if (formErrors.service_date)
                            setFormErrors({ ...formErrors, service_date: "" });
                        }}
                      />
                      {formErrors.service_date && (
                        <span className="m-inline-error">{formErrors.service_date}</span>
                      )}
                    </div>

                    {/* Next Service Due Date */}
                    <div className="m-field-group">
                      <label htmlFor="form-next-due-date" className="m-field-label">
                        Next Service Due Date
                      </label>
                      <input
                        type="date"
                        id="form-next-due-date"
                        className={`m-form-control ${formErrors.next_due_date ? "input-error" : ""}`}
                        value={formData.next_due_date}
                        onChange={(e) => {
                          setFormData({ ...formData, next_due_date: e.target.value });
                          if (formErrors.next_due_date)
                            setFormErrors({ ...formErrors, next_due_date: "" });
                        }}
                      />
                      {formErrors.next_due_date && (
                        <span className="m-inline-error">{formErrors.next_due_date}</span>
                      )}
                    </div>

                    {/* Estimated Cost */}
                    <div className="m-field-group">
                      <label htmlFor="form-cost" className="m-field-label">
                        Estimated Service Cost (₹)
                      </label>
                      <input
                        type="number"
                        id="form-cost"
                        min="0"
                        className={`m-form-control ${formErrors.cost ? "input-error" : ""}`}
                        placeholder="e.g. 8500"
                        value={formData.cost}
                        onChange={(e) => {
                          setFormData({ ...formData, cost: e.target.value });
                          if (formErrors.cost) setFormErrors({ ...formErrors, cost: "" });
                        }}
                      />
                      {formErrors.cost && <span className="m-inline-error">{formErrors.cost}</span>}
                    </div>

                    {/* Vendor Name */}
                    <div className="m-field-group">
                      <label htmlFor="form-vendor" className="m-field-label">
                        Vendor / Service Center Name
                      </label>
                      <input
                        type="text"
                        id="form-vendor"
                        className="m-form-control"
                        placeholder="e.g. Authorized Ashok Leyland Service Station"
                        value={formData.vendor}
                        onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                      />
                    </div>

                    {/* Status Select */}
                    <div className="m-field-group m-form-col-full">
                      <label htmlFor="form-status" className="m-field-label">
                        Service Status
                      </label>
                      <select
                        id="form-status"
                        className="m-form-control"
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      >
                        <option value="Scheduled">Scheduled</option>
                        <option value="Upcoming">Upcoming</option>
                        <option value="Completed">Completed</option>
                        <option value="Overdue">Overdue</option>
                      </select>
                    </div>

                    {/* Remarks & Notes */}
                    <div className="m-field-group m-form-col-full">
                      <label htmlFor="form-remarks" className="m-field-label">
                        Service Remarks & Safety Audit Notes
                      </label>
                      <textarea
                        id="form-remarks"
                        rows="3"
                        className="m-form-control m-form-textarea"
                        placeholder="Enter service details, parts replaced, technician notes, or safety observations..."
                        value={formData.remarks}
                        onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
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
                        <Loader2 size={16} className="spin-icon" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check size={16} />
                        <span>{modalMode === "add" ? "Save Service" : "Update Service"}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ====================================================================
            7. VIEW DETAILS MODAL POPUP (Read-Only)
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
                <div className="m-modal-title-wrap">
                  <h3 className="m-modal-title">Maintenance Record Details</h3>
                  <p className="m-modal-subtitle">
                    Viewing full log for Bus #{viewingRecord.vehicleid}
                  </p>
                </div>
                <button
                  type="button"
                  className="m-modal-close-btn"
                  onClick={() => setViewingRecord(null)}
                  aria-label="Close details"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="m-modal-body">
                <div className="view-details-grid">
                  <div className="view-detail-item">
                    <span className="view-detail-label">Vehicle ID</span>
                    <span className="view-detail-value">Bus #{viewingRecord.vehicleid}</span>
                  </div>

                  <div className="view-detail-item">
                    <span className="view-detail-label">Service Status</span>
                    <span className="view-detail-value">
                      <span
                        className={`m-status-badge status-${getRecordStatus(
                          viewingRecord
                        ).toLowerCase()}`}
                      >
                        {getRecordStatus(viewingRecord)}
                      </span>
                    </span>
                  </div>

                  <div className="view-detail-item item-full">
                    <span className="view-detail-label">Maintenance Title / Service Type</span>
                    <span className="view-detail-value">{viewingRecord.service_type || "—"}</span>
                  </div>

                  <div className="view-detail-item">
                    <span className="view-detail-label">Service Date</span>
                    <span className="view-detail-value">
                      {formatDate(viewingRecord.service_date)}
                    </span>
                  </div>

                  <div className="view-detail-item">
                    <span className="view-detail-label">Next Service Due Date</span>
                    <span className="view-detail-value">
                      {formatDate(viewingRecord.next_due_date)}
                    </span>
                  </div>

                  <div className="view-detail-item">
                    <span className="view-detail-label">Maintenance Cost</span>
                    <span className="view-detail-value">
                      ₹{(Number(viewingRecord.cost) || 0).toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="view-detail-item">
                    <span className="view-detail-label">Service Vendor / Station</span>
                    <span className="view-detail-value">{viewingRecord.vendor || "—"}</span>
                  </div>

                  <div className="view-detail-item item-full">
                    <span className="view-detail-label">Remarks & Safety Audit Notes</span>
                    <span
                      className="view-detail-value"
                      style={{ whiteSpace: "pre-wrap", fontWeight: 400 }}
                    >
                      {viewingRecord.remarks || "No additional remarks noted."}
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
                <button
                  type="button"
                  className="vm-btn-primary"
                  onClick={() => {
                    const rec = viewingRecord;
                    setViewingRecord(null);
                    handleOpenEditModal(rec);
                  }}
                >
                  <Pencil size={14} />
                  <span>Edit Record</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================================
            8. DELETE CONFIRMATION MODAL POPUP
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
                <div className="m-modal-title-wrap">
                  <h3 className="m-modal-title">Delete Maintenance Record</h3>
                  <p className="m-modal-subtitle">Confirm removal of service schedule</p>
                </div>
                <button
                  type="button"
                  className="m-modal-close-btn"
                  onClick={() => !isDeleting && setDeletingRecord(null)}
                  aria-label="Close modal"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="m-modal-body">
                <div className="delete-confirm-box">
                  <AlertTriangle size={32} color="#dc2626" />
                  <p className="delete-confirm-text">
                    Are you sure you want to delete the maintenance record for{" "}
                    <strong>Bus #{deletingRecord.vehicleid}</strong> (
                    <em>{deletingRecord.service_type}</em>)? This action cannot be undone.
                  </p>
                </div>

                <div className="view-details-grid" style={{ gap: "8px" }}>
                  <div className="view-detail-item">
                    <span className="view-detail-label">Service Date</span>
                    <span className="view-detail-value">
                      {formatDate(deletingRecord.service_date)}
                    </span>
                  </div>
                  <div className="view-detail-item">
                    <span className="view-detail-label">Cost</span>
                    <span className="view-detail-value">
                      ₹{(Number(deletingRecord.cost) || 0).toLocaleString("en-IN")}
                    </span>
                  </div>
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
                  className="btn-action-icon btn-action-delete"
                  style={{ width: "auto", padding: "0 16px", height: "36px", gap: "6px" }}
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

export default MaintenanceManagement;
