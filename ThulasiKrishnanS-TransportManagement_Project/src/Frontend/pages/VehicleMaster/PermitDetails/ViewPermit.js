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
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileCheck,
  CalendarDays,
  Loader2
} from "lucide-react";
import { API_URL } from "../../../config";
import "../../../styles/ViewVehicle.css";
import "../../../styles/ViewPermit.css";
import { exportToExcel } from "../../ReportGenerator";

const ViewPermit = () => {
  const navigate = useNavigate();

  // Master permit state
  const [allPermits, setAllPermits] = useState([]);
  const [vehicleOptions, setVehicleOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Live filter states
  const [filterVehicleId, setFilterVehicleId] = useState("");
  const [filterPermitNo, setFilterPermitNo] = useState("");

  // Pagination state (5 records per page matching Vehicle Master)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // 3-Second Auto-Dismissing Flash Card Notification
  const [flashCard, setFlashCard] = useState(null);
  const flashTimerRef = useRef(null);

  // Add Permit modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});
  const firstAddInputRef = useRef(null);

  const [addFormData, setAddFormData] = useState({
    vehicleId: "",
    permitNo: "",
    permitType: "State",
    issueDate: "",
    expiryDate: "",
    status: "Active"
  });

  // Edit Permit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPermit, setEditingPermit] = useState(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [editFormErrors, setEditFormErrors] = useState({});
  const [editTouchedFields, setEditTouchedFields] = useState({});

  const [editFormData, setEditFormData] = useState({
    vehicleid: "",
    permitno: "",
    permittype: "State",
    issuedate: "",
    expirydate: "",
    status: "Active"
  });

  // View Details modal state
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedPermit, setSelectedPermit] = useState(null);

  // Delete confirmation modal state
  const [permitToDelete, setPermitToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Helper: Format date for standard display
  const formatDateForDisplay = (isoStr) => {
    if (!isoStr) return "-";
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return String(isoStr).split("T")[0];
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric"
      });
    } catch {
      return String(isoStr).split("T")[0];
    }
  };

  // Helper: Format date for HTML5 date input (YYYY-MM-DD)
  const formatDateForInput = (isoStr) => {
    if (!isoStr) return "";
    return String(isoStr).split("T")[0];
  };

  // Helper: Status badge class & label
  const getStatusMeta = (status, expiryDate) => {
    const norm = String(status || "").toLowerCase().trim();
    let isPast = false;
    if (expiryDate) {
      const expTime = new Date(expiryDate).getTime();
      const today = new Date().setHours(0, 0, 0, 0);
      if (!isNaN(expTime) && expTime < today) {
        isPast = true;
      }
    }

    if (isPast || norm === "expired") {
      return {
        label: "Expired",
        className: "status-expired"
      };
    }
    if (norm === "active") {
      return {
        label: "Active",
        className: "status-active"
      };
    }
    return {
      label: status || "Suspended",
      className: "status-warning"
    };
  };

  // 3-Second Auto-Dismissing Flash Card Trigger
  const showFlashCard = (message, type = "success", title = "") => {
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

  // Fetch permit records from backend API
  const fetchPermits = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/getPermit`);
      const data = Array.isArray(response.data) ? response.data : [];
      setAllPermits(data);
      setError("");
    } catch (err) {
      console.error("Error fetching permits:", err);
      setError("Failed to fetch permit records. Please verify database connectivity.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch registered vehicles for allocation dropdowns
  const fetchVehicles = async () => {
    try {
      const response = await axios.get(`${API_URL}/getVehicle`);
      if (Array.isArray(response.data)) {
        const ids = response.data.map((v) => v.vehicleid).filter((id) => id != null);
        setVehicleOptions(ids);
      }
    } catch (err) {
      console.error("Error fetching vehicle IDs:", err);
    }
  };

  useEffect(() => {
    fetchPermits();
    fetchVehicles();
  }, []);

  // Autofocus first input when Add Modal opens
  useEffect(() => {
    if (showAddModal) {
      const timer = setTimeout(() => {
        firstAddInputRef.current?.focus();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [showAddModal]);

  // Keyboard navigation: Escape key closes any active modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (showAddModal && !isSubmitting) {
          handleCloseAddModal();
        } else if (showEditModal && !isEditSubmitting) {
          handleCloseEditModal();
        } else if (permitToDelete && !isDeleting) {
          setPermitToDelete(null);
        } else if (showDetailsModal) {
          setShowDetailsModal(false);
          setSelectedPermit(null);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showAddModal, isSubmitting, showEditModal, isEditSubmitting, permitToDelete, isDeleting, showDetailsModal]);

  // Unique dropdown filter options extracted from master records
  const uniqueVehicleIds = useMemo(() => {
    const idsFromPermits = allPermits.map((p) => p.vehicleid).filter((id) => id != null);
    const combined = [...new Set([...idsFromPermits, ...vehicleOptions])];
    return combined.sort((a, b) => Number(a) - Number(b));
  }, [allPermits, vehicleOptions]);

  const uniquePermitNumbers = useMemo(() => {
    return [...new Set(allPermits.map((p) => p.permitno).filter(Boolean))].sort();
  }, [allPermits]);

  // Live filter computation: applies immediately on dropdown selection with AND logic
  const filteredPermits = useMemo(() => {
    return allPermits.filter((permit) => {
      // 1. Vehicle ID filter
      if (filterVehicleId) {
        if (String(permit.vehicleid ?? "").trim() !== String(filterVehicleId).trim()) {
          return false;
        }
      }

      // 2. Permit Number filter
      if (filterPermitNo) {
        if (String(permit.permitno ?? "").trim().toLowerCase() !== String(filterPermitNo).trim().toLowerCase()) {
          return false;
        }
      }

      return true;
    });
  }, [allPermits, filterVehicleId, filterPermitNo]);

  const hasActiveFilters = Boolean(filterVehicleId || filterPermitNo);

  const handleResetFilters = () => {
    setFilterVehicleId("");
    setFilterPermitNo("");
  };

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterVehicleId, filterPermitNo]);

  // Pagination calculation (5 records per page)
  const totalPages = Math.max(1, Math.ceil(filteredPermits.length / itemsPerPage));
  const paginatedPermits = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredPermits.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredPermits, currentPage, itemsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const startEntryIndex = filteredPermits.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endEntryIndex = Math.min(currentPage * itemsPerPage, filteredPermits.length);

  // Field validation for Add Permit
  const validateAddField = (name, value, allValues = addFormData) => {
    let err = "";
    const str = String(value || "").trim();

    switch (name) {
      case "vehicleId":
        if (!str) err = "Please select a vehicle ID";
        break;
      case "permitNo":
        if (!str) err = "Permit number is required";
        break;
      case "permitType":
        if (!str) err = "Please select permit type";
        break;
      case "issueDate":
        if (!str) err = "Issue date is required";
        break;
      case "expiryDate":
        if (!str) {
          err = "Expiry date is required";
        } else if (allValues.issueDate && new Date(str) < new Date(allValues.issueDate)) {
          err = "Expiry date cannot be before issue date";
        }
        break;
      case "status":
        if (!str) err = "Please select status";
        break;
      default:
        break;
    }

    setFormErrors((prev) => ({ ...prev, [name]: err }));
    return !err;
  };

  const handleAddChange = (e) => {
    const { name, value } = e.target;
    const updated = { ...addFormData, [name]: value };
    setAddFormData(updated);

    if (touchedFields[name]) {
      validateAddField(name, value, updated);
    }
  };

  const handleAddBlur = (e) => {
    const { name, value } = e.target;
    setTouchedFields((prev) => ({ ...prev, [name]: true }));
    validateAddField(name, value);
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    setFormErrors({});
    setTouchedFields({});
    setAddFormData({
      vehicleId: "",
      permitNo: "",
      permitType: "State",
      issueDate: "",
      expiryDate: "",
      status: "Active"
    });
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();

    const fields = ["vehicleId", "permitNo", "permitType", "issueDate", "expiryDate", "status"];
    const newErrors = {};
    let firstErr = null;

    fields.forEach((f) => {
      const val = addFormData[f];
      const str = String(val || "").trim();
      if (!str) {
        newErrors[f] = "This field is required";
        if (!firstErr) firstErr = f;
      } else if (f === "expiryDate" && addFormData.issueDate && new Date(str) < new Date(addFormData.issueDate)) {
        newErrors[f] = "Expiry date cannot be before issue date";
        if (!firstErr) firstErr = f;
      }
    });

    setTouchedFields(fields.reduce((acc, f) => ({ ...acc, [f]: true }), {}));
    setFormErrors(newErrors);

    if (firstErr) {
      const el = document.getElementById(`add-${firstErr.toLowerCase()}`);
      if (el) el.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        vehicleId: addFormData.vehicleId,
        permitNo: addFormData.permitNo.trim(),
        permitType: addFormData.permitType,
        issueDate: addFormData.issueDate,
        expiryDate: addFormData.expiryDate,
        status: addFormData.status
      };

      const response = await axios.post(`${API_URL}/addPermit`, payload);
      if (response.data && (response.data.success || response.status === 201)) {
        const savedPermitNo = addFormData.permitNo.trim();
        handleCloseAddModal();
        await fetchPermits();
        showFlashCard(`Permit #${savedPermitNo} created successfully!`, "success", "Permit Added");
      } else {
        showFlashCard(response.data?.message || "Failed to create permit record.", "danger", "Creation Failed");
      }
    } catch (err) {
      console.error("Error adding permit:", err);
      const msg = err.response?.data?.message || "Failed to save permit. Permit number may already exist.";
      showFlashCard(msg, "danger", "Creation Failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Field validation for Edit Permit
  const validateEditField = (name, value, allValues = editFormData) => {
    let err = "";
    const str = String(value || "").trim();

    switch (name) {
      case "permittype":
        if (!str) err = "Please select permit type";
        break;
      case "issuedate":
        if (!str) err = "Issue date is required";
        break;
      case "expirydate":
        if (!str) {
          err = "Expiry date is required";
        } else if (allValues.issuedate && new Date(str) < new Date(allValues.issuedate)) {
          err = "Expiry date cannot be before issue date";
        }
        break;
      case "status":
        if (!str) err = "Please select status";
        break;
      default:
        break;
    }

    setEditFormErrors((prev) => ({ ...prev, [name]: err }));
    return !err;
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    const updated = { ...editFormData, [name]: value };
    setEditFormData(updated);

    if (editTouchedFields[name]) {
      validateEditField(name, value, updated);
    }
  };

  const handleEditBlur = (e) => {
    const { name, value } = e.target;
    setEditTouchedFields((prev) => ({ ...prev, [name]: true }));
    validateEditField(name, value);
  };

  const handleOpenEdit = (permit) => {
    setEditingPermit(permit);
    setEditFormData({
      vehicleid: permit.vehicleid,
      permitno: permit.permitno,
      permittype: permit.permittype || "State",
      issuedate: formatDateForInput(permit.issuedate),
      expirydate: formatDateForInput(permit.expirydate),
      status: permit.status || "Active"
    });
    setEditFormErrors({});
    setEditTouchedFields({});
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingPermit(null);
    setEditFormErrors({});
    setEditTouchedFields({});
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingPermit) return;

    const fields = ["permittype", "issuedate", "expirydate", "status"];
    const newErrors = {};
    let firstErr = null;

    fields.forEach((f) => {
      const val = editFormData[f];
      const str = String(val || "").trim();
      if (!str) {
        newErrors[f] = "This field is required";
        if (!firstErr) firstErr = f;
      } else if (f === "expirydate" && editFormData.issuedate && new Date(str) < new Date(editFormData.issuedate)) {
        newErrors[f] = "Expiry date cannot be before issue date";
        if (!firstErr) firstErr = f;
      }
    });

    setEditTouchedFields(fields.reduce((acc, f) => ({ ...acc, [f]: true }), {}));
    setEditFormErrors(newErrors);

    if (firstErr) {
      const el = document.getElementById(`edit-${firstErr.toLowerCase()}`);
      if (el) el.focus();
      return;
    }

    setIsEditSubmitting(true);
    try {
      const payload = {
        permittype: editFormData.permittype,
        issuedate: editFormData.issuedate,
        expirydate: editFormData.expirydate,
        status: editFormData.status
      };

      const response = await axios.put(
        `${API_URL}/updatePermit/${editingPermit.vehicleid}/${editingPermit.permitno}`,
        payload
      );

      if (response.data && (response.data.success || response.status === 200)) {
        const updatedPermitNo = editingPermit.permitno;
        handleCloseEditModal();
        await fetchPermits();
        showFlashCard(`Permit #${updatedPermitNo} specifications updated successfully!`, "success", "Permit Updated");
      } else {
        showFlashCard(response.data?.message || "Failed to update permit record.", "danger", "Update Failed");
      }
    } catch (err) {
      console.error("Error updating permit:", err);
      const msg = err.response?.data?.message || "Failed to update permit record.";
      showFlashCard(msg, "danger", "Update Failed");
    } finally {
      setIsEditSubmitting(false);
    }
  };

  // View Details Modal Handler
  const handleViewDetails = (permit) => {
    setSelectedPermit(permit);
    setShowDetailsModal(true);
  };

  // Delete Confirmation Handlers
  const handleOpenDelete = (permit) => {
    setPermitToDelete(permit);
  };

  const handleConfirmDelete = async () => {
    if (!permitToDelete) return;
    setIsDeleting(true);
    try {
      const response = await axios.delete(
        `${API_URL}/deletePermit/${permitToDelete.vehicleid}/${permitToDelete.permitno}`
      );
      if (response.data && (response.data.success || response.status === 200)) {
        const deletedPermitNo = permitToDelete.permitno;
        setPermitToDelete(null);
        await fetchPermits();
        showFlashCard(`Permit #${deletedPermitNo} has been deleted successfully.`, "success", "Permit Deleted");
      } else {
        showFlashCard(response.data?.message || "Delete operation failed.", "danger", "Delete Failed");
      }
    } catch (err) {
      console.error("Error deleting permit:", err);
      const msg = err.response?.data?.message || "Failed to delete permit record.";
      showFlashCard(msg, "danger", "Delete Failed");
    } finally {
      setIsDeleting(false);
    }
  };

  // Excel Report Export Handler
  const handleExportReport = () => {
    if (!filteredPermits.length) return;
    exportToExcel(
      filteredPermits.map((p, idx) => ({
        "S.No": idx + 1,
        "Vehicle ID": p.vehicleid,
        "Permit Number": p.permitno,
        "Permit Type": p.permittype || "State",
        "Issue Date": formatDateForDisplay(p.issuedate),
        "Expiry Date": formatDateForDisplay(p.expirydate),
        "Status": p.status || "Active"
      })),
      "Permit_Master_Report"
    );
  };

  return (
    <div className="view-permit-master-container">
      <div className="view-permit-box-wrapper">
        {/* ====================================================================
            1. BREADCRUMBS & PAGE HEADER (Matches Vehicle Master Pattern)
            ==================================================================== */}
        <div className="vm-breadcrumb-nav">
          <span className="link" onClick={() => navigate("/home")}>Dashboard</span>
          <span className="sep">/</span>
          <span className="link" onClick={() => navigate("/home/vehiclemaster")}>Bus & Fleet Master</span>
          <span className="sep">/</span>
          <span className="current">Permit Master</span>
        </div>

        <div className="vm-page-header">
          <div className="vm-header-left">
            <h2 className="vm-page-title">Permit Master</h2>
          </div>

          <div className="vm-header-actions">
            <button
              type="button"
              className="vm-btn-secondary vm-btn-report"
              onClick={handleExportReport}
              disabled={!filteredPermits.length}
              title="Export filtered records to Excel"
            >
              <FileSpreadsheet size={16} />
              <span>Generate Report</span>
            </button>

            <button
              type="button"
              className="vm-btn-primary vm-btn-add"
              onClick={() => setShowAddModal(true)}
              title="Add a new vehicle permit"
            >
              <Plus size={16} strokeWidth={2.4} />
              <span>Add Permit</span>
            </button>
          </div>
        </div>

        {/* ====================================================================
            3-SECOND AUTO-DISMISSING FLASH CARD NOTIFICATION
            ==================================================================== */}
        {flashCard && (
          <aside
            className={`vm-flash-card vm-flash-card-${flashCard.type || "success"}`}
            role="status"
            aria-live="polite"
          >
            <div className="vm-flash-card-inner">
              <div className="vm-flash-card-badge" aria-hidden="true">
                {flashCard.type === "danger" ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
              </div>
              <div className="vm-flash-card-content">
                <h4 className="vm-flash-card-title">{flashCard.title}</h4>
                <p className="vm-flash-card-message">{flashCard.message}</p>
              </div>
              <button
                type="button"
                className="vm-flash-card-close"
                onClick={() => {
                  if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
                  setFlashCard(null);
                }}
                aria-label="Dismiss notification"
              >
                <X size={15} />
              </button>
            </div>
            {/* 3-Second Countdown Progress Bar */}
            <div className="vm-flash-card-progress">
              <div className="vm-flash-card-progress-bar" />
            </div>
          </aside>
        )}

        {/* Error Alert Banner */}
        {error && (
          <div className="vm-alert vm-alert-danger">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* ====================================================================
            2. RESPONSIVE FILTERS TOOLBAR - Live Instant Filtering (No Search Button)
            ==================================================================== */}
        <div className="fleet-filter-toolbar">
          <div className="fleet-filter-field">
            <label htmlFor="filter-permit-vehicle-id">Vehicle ID</label>
            <select
              id="filter-permit-vehicle-id"
              value={filterVehicleId}
              onChange={(e) => setFilterVehicleId(e.target.value)}
              className="fleet-filter-select"
              aria-label="Filter by vehicle ID"
            >
              <option value="">All Vehicle IDs</option>
              {uniqueVehicleIds.map((id) => (
                <option key={id} value={id}>
                  Vehicle #{id}
                </option>
              ))}
            </select>
          </div>

          <div className="fleet-filter-field">
            <label htmlFor="filter-permit-number">Permit Number</label>
            <select
              id="filter-permit-number"
              value={filterPermitNo}
              onChange={(e) => setFilterPermitNo(e.target.value)}
              className="fleet-filter-select"
              aria-label="Filter by permit number"
            >
              <option value="">All Permit Numbers</option>
              {uniquePermitNumbers.map((num) => (
                <option key={num} value={num}>
                  {num}
                </option>
              ))}
            </select>
          </div>

          {/* Subtle Reset Filters Action */}
          <div className="fleet-filter-actions-group">
            <button
              type="button"
              className={`fleet-btn-reset-filters ${hasActiveFilters ? "active" : ""}`}
              onClick={handleResetFilters}
              disabled={!hasActiveFilters}
              title={hasActiveFilters ? "Clear all active filters" : "No filters active"}
            >
              <RotateCcw size={13} />
              <span>Reset Filters</span>
            </button>
          </div>
        </div>

        {/* ====================================================================
            3. PERMIT RECORDS TABLE - Solid Navy Header, Zero Desktop Overflow
            ==================================================================== */}
        <div className="view-permit-table-container">
          <table className="view-permit-table">
            <thead>
              <tr>
                <th className="col-permit-sno">S.NO</th>
                <th className="col-permit-vehicleid">VEHICLE ID</th>
                <th className="col-permit-no">PERMIT NUMBER</th>
                <th className="col-permit-type">PERMIT TYPE</th>
                <th className="col-permit-issue">ISSUE DATE</th>
                <th className="col-permit-expiry">EXPIRY DATE</th>
                <th className="col-permit-status">STATUS</th>
                <th className="col-permit-actions">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="permit-table-loading">
                    Loading permit records...
                  </td>
                </tr>
              ) : paginatedPermits.length > 0 ? (
                paginatedPermits.map((permit, index) => {
                  const globalIndex = (currentPage - 1) * itemsPerPage + index + 1;
                  const statusMeta = getStatusMeta(permit.status, permit.expirydate);

                  return (
                    <tr key={`${permit.vehicleid}-${permit.permitno}-${index}`}>
                      <td className="col-sno-td">{globalIndex}</td>
                      <td>
                        <span className="permit-vehicle-badge">Vehicle #{permit.vehicleid}</span>
                      </td>
                      <td>
                        <span className="permit-code-badge">{permit.permitno}</span>
                      </td>
                      <td>{permit.permittype || "State"}</td>
                      <td className="col-date-td">{formatDateForDisplay(permit.issuedate)}</td>
                      <td className="col-date-td">{formatDateForDisplay(permit.expirydate)}</td>
                      <td>
                        <span className={`permit-status-badge ${statusMeta.className}`}>
                          {statusMeta.label}
                        </span>
                      </td>
                      <td className="fleet-actions-cell">
                        <div className="fleet-action-buttons-group">
                          <button
                            type="button"
                            className="fleet-action-btn fleet-action-view"
                            onClick={() => handleViewDetails(permit)}
                            title={`View details of Permit #${permit.permitno}`}
                          >
                            <Eye size={13} />
                            <span>View</span>
                          </button>

                          <button
                            type="button"
                            className="fleet-action-btn fleet-action-edit"
                            onClick={() => handleOpenEdit(permit)}
                            title={`Edit Permit #${permit.permitno}`}
                          >
                            <Pencil size={13} />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            className="fleet-action-btn fleet-action-delete"
                            onClick={() => handleOpenDelete(permit)}
                            title={`Delete Permit #${permit.permitno}`}
                          >
                            <Trash2 size={13} />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="permit-table-empty">
                    {hasActiveFilters
                      ? "No permits match the selected filters. Click 'Reset Filters' to view all records."
                      : "No permit records found in system."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ====================================================================
            4. TABLE FOOTER & PAGINATION (5 Records Per Page)
            ==================================================================== */}
        <div className="vm-table-footer">
          <div className="vm-footer-entries">
            Showing {startEntryIndex} to {endEntryIndex} of {filteredPermits.length} entries
            {hasActiveFilters && ` (filtered from ${allPermits.length} total entries)`}
          </div>

          <div className="vm-pagination-controls">
            <button
              type="button"
              className="vm-page-btn"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              title="First Page"
            >
              <ChevronsLeft size={15} />
            </button>
            <button
              type="button"
              className="vm-page-btn"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              title="Previous Page"
            >
              <ChevronLeft size={15} />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                type="button"
                className={`vm-page-btn ${currentPage === page ? "active" : ""}`}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            ))}

            <button
              type="button"
              className="vm-page-btn"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              title="Next Page"
            >
              <ChevronRight size={15} />
            </button>
            <button
              type="button"
              className="vm-page-btn"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages || totalPages === 0}
              title="Last Page"
            >
              <ChevronsRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* ====================================================================
          5. ADD PERMIT MODAL (Dual Columns Layout matching Add Vehicle)
          ==================================================================== */}
      {showAddModal && (
        <div
          className="modal-overlay vm-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmitting) handleCloseAddModal();
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-permit-title"
        >
          <div className="vm-add-modal-box">
            {/* Modal Header */}
            <div className="vm-modal-header">
              <div className="vm-modal-title-group">
                <div className="vm-modal-icon-badge" aria-hidden="true">
                  <FileCheck size={18} strokeWidth={2.2} />
                </div>
                <div>
                  <h3 id="add-permit-title" className="vm-modal-title">
                    Add New Permit
                  </h3>
                  <p className="vm-modal-subtitle">
                    Enter vehicle permit specifications and validity details.
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="vm-modal-close-btn"
                onClick={handleCloseAddModal}
                disabled={isSubmitting}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleAddSubmit} className="vm-modal-form-wrapper" noValidate>
              <div className="vm-modal-dual-columns">
                {/* Column Left: Permit Details */}
                <div className="vm-column-panel">
                  <div className="vm-panel-header">
                    <FileCheck size={14} className="vm-panel-icon" />
                    <h4 className="vm-panel-title">Permit Details</h4>
                  </div>

                  <div className="vm-panel-fields">
                    {/* Vehicle ID Dropdown */}
                    <div className="fleet-form-field">
                      <div className="fleet-label-row">
                        <label htmlFor="add-vehicleid">
                          Vehicle ID <span className="req-star">*</span>
                        </label>
                      </div>
                      <select
                        id="add-vehicleid"
                        name="vehicleId"
                        ref={firstAddInputRef}
                        value={addFormData.vehicleId}
                        onChange={handleAddChange}
                        onBlur={handleAddBlur}
                        className={formErrors.vehicleId && touchedFields.vehicleId ? "input-has-error" : ""}
                        disabled={isSubmitting}
                      >
                        <option value="">Select Vehicle ID</option>
                        {uniqueVehicleIds.map((id) => (
                          <option key={id} value={id}>
                            Vehicle #{id}
                          </option>
                        ))}
                      </select>
                      {formErrors.vehicleId && touchedFields.vehicleId && (
                        <span className="vm-field-error-msg" role="alert">
                          <AlertCircle size={11} /> {formErrors.vehicleId}
                        </span>
                      )}
                    </div>

                    {/* Permit Number */}
                    <div className="fleet-form-field">
                      <div className="fleet-label-row">
                        <label htmlFor="add-permitno">
                          Permit Number <span className="req-star">*</span>
                        </label>
                      </div>
                      <input
                        type="text"
                        id="add-permitno"
                        name="permitNo"
                        placeholder="e.g. TN-PER-2025-01"
                        value={addFormData.permitNo}
                        onChange={handleAddChange}
                        onBlur={handleAddBlur}
                        className={formErrors.permitNo && touchedFields.permitNo ? "input-has-error" : ""}
                        disabled={isSubmitting}
                      />
                      {formErrors.permitNo && touchedFields.permitNo && (
                        <span className="vm-field-error-msg" role="alert">
                          <AlertCircle size={11} /> {formErrors.permitNo}
                        </span>
                      )}
                    </div>

                    {/* Permit Type */}
                    <div className="fleet-form-field">
                      <div className="fleet-label-row">
                        <label htmlFor="add-permittype">
                          Permit Type <span className="req-star">*</span>
                        </label>
                      </div>
                      <select
                        id="add-permittype"
                        name="permitType"
                        value={addFormData.permitType}
                        onChange={handleAddChange}
                        onBlur={handleAddBlur}
                        className={formErrors.permitType && touchedFields.permitType ? "input-has-error" : ""}
                        disabled={isSubmitting}
                      >
                        <option value="State">State Permit</option>
                        <option value="District">District Permit</option>
                        <option value="National">National Permit</option>
                        <option value="All India">All India Tourist Permit</option>
                      </select>
                      {formErrors.permitType && touchedFields.permitType && (
                        <span className="vm-field-error-msg" role="alert">
                          <AlertCircle size={11} /> {formErrors.permitType}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="vm-dual-columns-divider" aria-hidden="true" />

                {/* Column Right: Validity Details */}
                <div className="vm-column-panel">
                  <div className="vm-panel-header">
                    <CalendarDays size={14} className="vm-panel-icon" />
                    <h4 className="vm-panel-title">Validity Details</h4>
                  </div>

                  <div className="vm-panel-fields">
                    {/* Issue Date */}
                    <div className="fleet-form-field">
                      <div className="fleet-label-row">
                        <label htmlFor="add-issuedate">
                          Issue Date <span className="req-star">*</span>
                        </label>
                      </div>
                      <input
                        type="date"
                        id="add-issuedate"
                        name="issueDate"
                        value={addFormData.issueDate}
                        onChange={handleAddChange}
                        onBlur={handleAddBlur}
                        className={formErrors.issueDate && touchedFields.issueDate ? "input-has-error" : ""}
                        disabled={isSubmitting}
                      />
                      {formErrors.issueDate && touchedFields.issueDate && (
                        <span className="vm-field-error-msg" role="alert">
                          <AlertCircle size={11} /> {formErrors.issueDate}
                        </span>
                      )}
                    </div>

                    {/* Expiry Date */}
                    <div className="fleet-form-field">
                      <div className="fleet-label-row">
                        <label htmlFor="add-expirydate">
                          Expiry Date <span className="req-star">*</span>
                        </label>
                      </div>
                      <input
                        type="date"
                        id="add-expirydate"
                        name="expiryDate"
                        value={addFormData.expiryDate}
                        onChange={handleAddChange}
                        onBlur={handleAddBlur}
                        className={formErrors.expiryDate && touchedFields.expiryDate ? "input-has-error" : ""}
                        disabled={isSubmitting}
                      />
                      {formErrors.expiryDate && touchedFields.expiryDate && (
                        <span className="vm-field-error-msg" role="alert">
                          <AlertCircle size={11} /> {formErrors.expiryDate}
                        </span>
                      )}
                    </div>

                    {/* Status Dropdown */}
                    <div className="fleet-form-field">
                      <div className="fleet-label-row">
                        <label htmlFor="add-status">
                          Permit Status <span className="req-star">*</span>
                        </label>
                      </div>
                      <select
                        id="add-status"
                        name="status"
                        value={addFormData.status}
                        onChange={handleAddChange}
                        onBlur={handleAddBlur}
                        className={formErrors.status && touchedFields.status ? "input-has-error" : ""}
                        disabled={isSubmitting}
                      >
                        <option value="Active">Active</option>
                        <option value="Expired">Expired</option>
                        <option value="Suspended">Suspended</option>
                      </select>
                      {formErrors.status && touchedFields.status && (
                        <span className="vm-field-error-msg" role="alert">
                          <AlertCircle size={11} /> {formErrors.status}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer (Both buttons sized 140px x 40px) */}
              <div className="vm-modal-footer">
                <span className="vm-modal-footer-hint">
                  <span className="req-star">*</span> Required fields
                </span>

                <div className="vm-modal-footer-actions">
                  <button
                    type="button"
                    className="vm-modal-cancel-btn"
                    onClick={handleCloseAddModal}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>

                  <button type="submit" className="vm-modal-save-btn" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 size={16} className="vm-spinner" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>Save Permit</span>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          6. EDIT PERMIT MODAL (Identical UI Layout matching Add Permit)
          ==================================================================== */}
      {showEditModal && editingPermit && (
        <div
          className="modal-overlay vm-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isEditSubmitting) handleCloseEditModal();
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-permit-title"
        >
          <div className="vm-add-modal-box">
            {/* Modal Header */}
            <div className="vm-modal-header">
              <div className="vm-modal-title-group">
                <div className="vm-modal-icon-badge" aria-hidden="true">
                  <Pencil size={18} strokeWidth={2.2} />
                </div>
                <div>
                  <h3 id="edit-permit-title" className="vm-modal-title">
                    Edit Permit #{editingPermit.permitno}
                  </h3>
                  <p className="vm-modal-subtitle">
                    Update permit details and validity information.
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="vm-modal-close-btn"
                onClick={handleCloseEditModal}
                disabled={isEditSubmitting}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleEditSubmit} className="vm-modal-form-wrapper" noValidate>
              <div className="vm-modal-dual-columns">
                {/* Column Left: Permit Details */}
                <div className="vm-column-panel">
                  <div className="vm-panel-header">
                    <FileCheck size={14} className="vm-panel-icon" />
                    <h4 className="vm-panel-title">Permit Details</h4>
                  </div>

                  <div className="vm-panel-fields">
                    {/* Vehicle ID (Read-only Key) */}
                    <div className="fleet-form-field">
                      <div className="fleet-label-row">
                        <label htmlFor="edit-vehicleid">
                          Vehicle ID <span className="vm-field-badge">Read-Only</span>
                        </label>
                      </div>
                      <input
                        type="text"
                        id="edit-vehicleid"
                        name="vehicleid"
                        value={`Vehicle #${editFormData.vehicleid}`}
                        readOnly
                        className="input-disabled-readonly"
                      />
                    </div>

                    {/* Permit Number (Read-only Key) */}
                    <div className="fleet-form-field">
                      <div className="fleet-label-row">
                        <label htmlFor="edit-permitno">
                          Permit Number <span className="vm-field-badge">Key</span>
                        </label>
                      </div>
                      <input
                        type="text"
                        id="edit-permitno"
                        name="permitno"
                        value={editFormData.permitno}
                        readOnly
                        className="input-disabled-readonly"
                      />
                    </div>

                    {/* Permit Type */}
                    <div className="fleet-form-field">
                      <div className="fleet-label-row">
                        <label htmlFor="edit-permittype">
                          Permit Type <span className="req-star">*</span>
                        </label>
                      </div>
                      <select
                        id="edit-permittype"
                        name="permittype"
                        value={editFormData.permittype}
                        onChange={handleEditChange}
                        onBlur={handleEditBlur}
                        className={editFormErrors.permittype && editTouchedFields.permittype ? "input-has-error" : ""}
                        disabled={isEditSubmitting}
                      >
                        <option value="State">State Permit</option>
                        <option value="District">District Permit</option>
                        <option value="National">National Permit</option>
                        <option value="All India">All India Tourist Permit</option>
                      </select>
                      {editFormErrors.permittype && editTouchedFields.permittype && (
                        <span className="vm-field-error-msg" role="alert">
                          <AlertCircle size={11} /> {editFormErrors.permittype}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="vm-dual-columns-divider" aria-hidden="true" />

                {/* Column Right: Validity Details */}
                <div className="vm-column-panel">
                  <div className="vm-panel-header">
                    <CalendarDays size={14} className="vm-panel-icon" />
                    <h4 className="vm-panel-title">Validity Details</h4>
                  </div>

                  <div className="vm-panel-fields">
                    {/* Issue Date */}
                    <div className="fleet-form-field">
                      <div className="fleet-label-row">
                        <label htmlFor="edit-issuedate">
                          Issue Date <span className="req-star">*</span>
                        </label>
                      </div>
                      <input
                        type="date"
                        id="edit-issuedate"
                        name="issuedate"
                        value={editFormData.issuedate}
                        onChange={handleEditChange}
                        onBlur={handleEditBlur}
                        className={editFormErrors.issuedate && editTouchedFields.issuedate ? "input-has-error" : ""}
                        disabled={isEditSubmitting}
                      />
                      {editFormErrors.issuedate && editTouchedFields.issuedate && (
                        <span className="vm-field-error-msg" role="alert">
                          <AlertCircle size={11} /> {editFormErrors.issuedate}
                        </span>
                      )}
                    </div>

                    {/* Expiry Date */}
                    <div className="fleet-form-field">
                      <div className="fleet-label-row">
                        <label htmlFor="edit-expirydate">
                          Expiry Date <span className="req-star">*</span>
                        </label>
                      </div>
                      <input
                        type="date"
                        id="edit-expirydate"
                        name="expirydate"
                        value={editFormData.expirydate}
                        onChange={handleEditChange}
                        onBlur={handleEditBlur}
                        className={editFormErrors.expirydate && editTouchedFields.expirydate ? "input-has-error" : ""}
                        disabled={isEditSubmitting}
                      />
                      {editFormErrors.expirydate && editTouchedFields.expirydate && (
                        <span className="vm-field-error-msg" role="alert">
                          <AlertCircle size={11} /> {editFormErrors.expirydate}
                        </span>
                      )}
                    </div>

                    {/* Status Dropdown */}
                    <div className="fleet-form-field">
                      <div className="fleet-label-row">
                        <label htmlFor="edit-status">
                          Permit Status <span className="req-star">*</span>
                        </label>
                      </div>
                      <select
                        id="edit-status"
                        name="status"
                        value={editFormData.status}
                        onChange={handleEditChange}
                        onBlur={handleEditBlur}
                        className={editFormErrors.status && editTouchedFields.status ? "input-has-error" : ""}
                        disabled={isEditSubmitting}
                      >
                        <option value="Active">Active</option>
                        <option value="Expired">Expired</option>
                        <option value="Suspended">Suspended</option>
                      </select>
                      {editFormErrors.status && editTouchedFields.status && (
                        <span className="vm-field-error-msg" role="alert">
                          <AlertCircle size={11} /> {editFormErrors.status}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer (Both buttons sized 140px x 40px) */}
              <div className="vm-modal-footer">
                <span className="vm-modal-footer-hint">
                  <span className="req-star">*</span> Required fields
                </span>

                <div className="vm-modal-footer-actions">
                  <button
                    type="button"
                    className="vm-modal-cancel-btn"
                    onClick={handleCloseEditModal}
                    disabled={isEditSubmitting}
                  >
                    Cancel
                  </button>

                  <button type="submit" className="vm-modal-save-btn" disabled={isEditSubmitting}>
                    {isEditSubmitting ? (
                      <>
                        <Loader2 size={16} className="vm-spinner" />
                        <span>Updating...</span>
                      </>
                    ) : (
                      <span>Update Permit</span>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          7. VIEW PERMIT DETAILS MODAL (Read-Only)
          ==================================================================== */}
      {showDetailsModal && selectedPermit && (
        <div
          className="modal-overlay vm-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDetailsModal(false);
              setSelectedPermit(null);
            }
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="view-permit-details-title"
        >
          <div className="fleet-modal-box">
            <div className="fleet-modal-header">
              <div className="vm-modal-title-group">
                <div className="vm-modal-icon-badge" aria-hidden="true">
                  <FileCheck size={18} strokeWidth={2.2} />
                </div>
                <div>
                  <h3 id="view-permit-details-title" className="fleet-modal-title">
                    Permit Details
                  </h3>
                  <p className="fleet-modal-subtitle">
                    Comprehensive specification for Permit #{selectedPermit.permitno}
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="fleet-modal-close"
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedPermit(null);
                }}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className="fleet-details-grid">
              <div className="fleet-detail-item">
                <span className="fleet-detail-label">Vehicle ID</span>
                <span className="fleet-detail-value">Vehicle #{selectedPermit.vehicleid}</span>
              </div>

              <div className="fleet-detail-item">
                <span className="fleet-detail-label">Permit Number</span>
                <span className="fleet-detail-value permit-code-badge">{selectedPermit.permitno}</span>
              </div>

              <div className="fleet-detail-item">
                <span className="fleet-detail-label">Permit Type</span>
                <span className="fleet-detail-value">{selectedPermit.permittype || "State"}</span>
              </div>

              <div className="fleet-detail-item">
                <span className="fleet-detail-label">Current Status</span>
                <span className="fleet-detail-value">
                  {(() => {
                    const meta = getStatusMeta(selectedPermit.status, selectedPermit.expirydate);
                    return <span className={`permit-status-badge ${meta.className}`}>{meta.label}</span>;
                  })()}
                </span>
              </div>

              <div className="fleet-detail-item">
                <span className="fleet-detail-label">Issue Date</span>
                <span className="fleet-detail-value">{formatDateForDisplay(selectedPermit.issuedate)}</span>
              </div>

              <div className="fleet-detail-item">
                <span className="fleet-detail-label">Expiry Date</span>
                <span className="fleet-detail-value">{formatDateForDisplay(selectedPermit.expirydate)}</span>
              </div>
            </div>

            <div className="modal-actions" style={{ justifyContent: "flex-end", marginTop: "18px" }}>
              <button
                type="button"
                className="vm-modal-cancel-btn"
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedPermit(null);
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          8. DELETE CONFIRMATION MODAL (Themed In-App Dialog)
          ==================================================================== */}
      {permitToDelete && (
        <div
          className="modal-overlay vm-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeleting) setPermitToDelete(null);
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-permit-dialog-title"
        >
          <div className="vm-delete-modal-box">
            <div className="vm-delete-modal-header">
              <div className="vm-delete-icon-badge" aria-hidden="true">
                <Trash2 size={22} strokeWidth={2.2} />
              </div>

              <div className="vm-delete-modal-text">
                <h3 id="delete-permit-dialog-title" className="vm-delete-modal-title">
                  Delete Permit Record
                </h3>
                <p className="vm-delete-modal-desc">
                  Are you sure you want to delete Permit{" "}
                  <strong>"{permitToDelete.permitno}"</strong> for{" "}
                  <strong>Vehicle #{permitToDelete.vehicleid}</strong>? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="vm-modal-footer">
              <span className="vm-modal-footer-hint">Permanent deletion</span>
              <div className="vm-modal-footer-actions">
                <button
                  type="button"
                  className="vm-modal-cancel-btn"
                  onClick={() => setPermitToDelete(null)}
                  disabled={isDeleting}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="vm-btn-danger-confirm"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 size={16} className="vm-spinner" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <span>Delete Permit</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewPermit;
