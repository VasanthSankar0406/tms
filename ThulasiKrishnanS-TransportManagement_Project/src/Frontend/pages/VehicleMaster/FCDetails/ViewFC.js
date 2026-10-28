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
  Award,
  CalendarDays,
  Loader2
} from "lucide-react";
import { API_URL } from "../../../config";
import "../../../styles/ViewVehicle.css";
import "../../../styles/ViewFC.css";
import { exportToExcel } from "../../ReportGenerator";

const ViewFC = () => {
  const navigate = useNavigate();

  // Master FC state
  const [allFC, setAllFC] = useState([]);
  const [vehicleOptions, setVehicleOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Live filter states
  const [filterVehicleId, setFilterVehicleId] = useState("");
  const [filterFcNo, setFilterFcNo] = useState("");

  // Pagination state (5 records per page matching Vehicle Master)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // 3-Second Auto-Dismissing Flash Card Notification
  const [flashCard, setFlashCard] = useState(null);
  const flashTimerRef = useRef(null);

  // Add FC modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});
  const firstAddInputRef = useRef(null);

  const [addFormData, setAddFormData] = useState({
    vehicleId: "",
    fcNo: "",
    issueDate: "",
    expiryDate: "",
    status: "Active"
  });

  // Edit FC modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingFC, setEditingFC] = useState(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [editFormErrors, setEditFormErrors] = useState({});
  const [editTouchedFields, setEditTouchedFields] = useState({});

  const [editFormData, setEditFormData] = useState({
    vehicleId: "",
    fcNo: "",
    issueDate: "",
    expiryDate: "",
    status: "Active"
  });

  // View Details modal state
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedFC, setSelectedFC] = useState(null);

  // Delete confirmation modal state
  const [fcToDelete, setFcToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Format date for standard display
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

  // Format date for HTML5 date input (YYYY-MM-DD)
  const formatDateForInput = (isoStr) => {
    if (!isoStr) return "";
    return String(isoStr).split("T")[0];
  };

  // Status badge calculation based on actual expiration dates and business rules
  const getStatusMeta = (status, expiryDate) => {
    const norm = String(status || "").toLowerCase().trim();
    let isPast = false;
    let isExpiringSoon = false;

    if (expiryDate) {
      const expTime = new Date(expiryDate).getTime();
      const today = new Date().setHours(0, 0, 0, 0);
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;

      if (!isNaN(expTime)) {
        if (expTime < today) {
          isPast = true;
        } else if (expTime - today <= thirtyDays) {
          isExpiringSoon = true;
        }
      }
    }

    if (isPast || norm === "expired") {
      return { label: "Expired", className: "status-expired" };
    }
    if (isExpiringSoon || norm === "expiring soon") {
      return { label: "Expiring Soon", className: "status-warning" };
    }
    if (norm === "active") {
      return { label: "Active", className: "status-active" };
    }
    return { label: status || "Active", className: "status-active" };
  };

  // 3-Second Auto-Dismissing Flash Card Notification
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

  // Fetch FC records from backend API
  const fetchFC = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/getFC`);
      const data = Array.isArray(response.data) ? response.data : [];
      setAllFC(data);
      setError("");
    } catch (err) {
      console.error("Error fetching FC records:", err);
      setError("Failed to fetch fitness certificate records. Please verify database connectivity.");
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
    fetchFC();
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
        } else if (fcToDelete && !isDeleting) {
          setFcToDelete(null);
        } else if (showDetailsModal) {
          setShowDetailsModal(false);
          setSelectedFC(null);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showAddModal, isSubmitting, showEditModal, isEditSubmitting, fcToDelete, isDeleting, showDetailsModal]);

  // Unique filter dropdown options extracted from master records
  const uniqueVehicleIds = useMemo(() => {
    const idsFromFC = allFC.map((fc) => fc.vehicleid).filter((id) => id != null);
    const combined = [...new Set([...idsFromFC, ...vehicleOptions])];
    return combined.sort((a, b) => Number(a) - Number(b));
  }, [allFC, vehicleOptions]);

  const uniqueFcNumbers = useMemo(() => {
    return [...new Set(allFC.map((fc) => fc.fcno).filter(Boolean))].sort();
  }, [allFC]);

  // Live filter computation: applies immediately on dropdown selection with AND logic
  const filteredFC = useMemo(() => {
    return allFC.filter((fc) => {
      // 1. Vehicle ID filter
      if (filterVehicleId) {
        if (String(fc.vehicleid ?? "").trim() !== String(filterVehicleId).trim()) {
          return false;
        }
      }

      // 2. FC Number filter
      if (filterFcNo) {
        if (String(fc.fcno ?? "").trim().toLowerCase() !== String(filterFcNo).trim().toLowerCase()) {
          return false;
        }
      }

      return true;
    });
  }, [allFC, filterVehicleId, filterFcNo]);

  const hasActiveFilters = Boolean(filterVehicleId || filterFcNo);

  const handleResetFilters = () => {
    setFilterVehicleId("");
    setFilterFcNo("");
  };

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterVehicleId, filterFcNo]);

  // Pagination calculation (5 records per page)
  const totalPages = Math.max(1, Math.ceil(filteredFC.length / itemsPerPage));
  const paginatedFC = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredFC.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredFC, currentPage, itemsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const startEntryIndex = filteredFC.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endEntryIndex = Math.min(currentPage * itemsPerPage, filteredFC.length);

  // Field validation for Add FC
  const validateAddField = (name, value, allValues = addFormData) => {
    let err = "";
    const str = String(value || "").trim();

    switch (name) {
      case "vehicleId":
        if (!str) err = "Please select a vehicle ID";
        break;
      case "fcNo":
        if (!str) err = "FC number is required";
        break;
      case "issueDate":
        if (!str) err = "Issue date is required";
        break;
      case "expiryDate":
        if (!str) {
          err = "Expiry date is required";
        } else if (allValues.issueDate && new Date(str) <= new Date(allValues.issueDate)) {
          err = "Expiry date must be after issue date";
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
      fcNo: "",
      issueDate: "",
      expiryDate: "",
      status: "Active"
    });
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();

    const fields = ["vehicleId", "fcNo", "issueDate", "expiryDate", "status"];
    const newErrors = {};
    let firstErr = null;

    fields.forEach((f) => {
      const val = addFormData[f];
      const str = String(val || "").trim();
      if (!str) {
        newErrors[f] = "This field is required";
        if (!firstErr) firstErr = f;
      } else if (f === "expiryDate" && addFormData.issueDate && new Date(str) <= new Date(addFormData.issueDate)) {
        newErrors[f] = "Expiry date must be after issue date";
        if (!firstErr) firstErr = f;
      }
    });

    setTouchedFields(fields.reduce((acc, f) => ({ ...acc, [f]: true }), {}));
    setFormErrors(newErrors);

    if (firstErr) {
      const el = document.getElementById(`add-fc-${firstErr.toLowerCase()}`);
      if (el) el.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        vehicleId: addFormData.vehicleId,
        fcNo: addFormData.fcNo.trim(),
        issueDate: addFormData.issueDate,
        expiryDate: addFormData.expiryDate,
        status: addFormData.status
      };

      const response = await axios.post(`${API_URL}/addFC`, payload);
      if (response.data && (response.data.success || response.status === 200 || response.status === 201)) {
        const savedFcNo = addFormData.fcNo.trim();
        handleCloseAddModal();
        await fetchFC();
        showFlashCard(`Fitness Certificate #${savedFcNo} added successfully!`, "success", "Certificate Added");
      } else {
        showFlashCard(response.data?.message || "Failed to create fitness certificate record.", "danger", "Creation Failed");
      }
    } catch (err) {
      console.error("Error adding FC:", err);
      const msg = err.response?.data?.message || "Failed to save fitness certificate. FC number may already exist.";
      showFlashCard(msg, "danger", "Creation Failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Field validation for Edit FC
  const validateEditField = (name, value, allValues = editFormData) => {
    let err = "";
    const str = String(value || "").trim();

    switch (name) {
      case "vehicleId":
        if (!str) err = "Please select a vehicle ID";
        break;
      case "fcNo":
        if (!str) err = "FC number is required";
        break;
      case "issueDate":
        if (!str) err = "Issue date is required";
        break;
      case "expiryDate":
        if (!str) {
          err = "Expiry date is required";
        } else if (allValues.issueDate && new Date(str) <= new Date(allValues.issueDate)) {
          err = "Expiry date must be after issue date";
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

  const handleOpenEdit = (fc) => {
    setEditingFC(fc);
    setEditFormData({
      vehicleId: String(fc.vehicleid || ""),
      fcNo: String(fc.fcno || ""),
      issueDate: formatDateForInput(fc.issuedate),
      expiryDate: formatDateForInput(fc.expirydate),
      status: fc.status || "Active"
    });
    setEditFormErrors({});
    setEditTouchedFields({});
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingFC(null);
    setEditFormErrors({});
    setEditTouchedFields({});
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingFC) return;

    const fields = ["vehicleId", "fcNo", "issueDate", "expiryDate", "status"];
    const newErrors = {};
    let firstErr = null;

    fields.forEach((f) => {
      const val = editFormData[f];
      const str = String(val || "").trim();
      if (!str) {
        newErrors[f] = "This field is required";
        if (!firstErr) firstErr = f;
      } else if (f === "expiryDate" && editFormData.issueDate && new Date(str) <= new Date(editFormData.issueDate)) {
        newErrors[f] = "Expiry date must be after issue date";
        if (!firstErr) firstErr = f;
      }
    });

    setEditTouchedFields(fields.reduce((acc, f) => ({ ...acc, [f]: true }), {}));
    setEditFormErrors(newErrors);

    if (firstErr) {
      const el = document.getElementById(`edit-fc-${firstErr.toLowerCase()}`);
      if (el) el.focus();
      return;
    }

    setIsEditSubmitting(true);
    try {
      const payload = {
        vehicleId: editFormData.vehicleId,
        fcNo: editFormData.fcNo.trim(),
        issueDate: editFormData.issueDate,
        expiryDate: editFormData.expiryDate,
        status: editFormData.status
      };

      const response = await axios.put(`${API_URL}/updateFC/${editingFC.fcid}`, payload);
      if (response.data && (response.data.success || response.status === 200)) {
        const updatedFcNo = editFormData.fcNo.trim();
        handleCloseEditModal();
        await fetchFC();
        showFlashCard(`Fitness Certificate #${updatedFcNo} updated successfully!`, "success", "Certificate Updated");
      } else {
        showFlashCard(response.data?.message || "Failed to update fitness certificate record.", "danger", "Update Failed");
      }
    } catch (err) {
      console.error("Error updating FC:", err);
      const msg = err.response?.data?.message || "Failed to update fitness certificate record.";
      showFlashCard(msg, "danger", "Update Failed");
    } finally {
      setIsEditSubmitting(false);
    }
  };

  // View Details Modal Handler
  const handleViewDetails = (fc) => {
    setSelectedFC(fc);
    setShowDetailsModal(true);
  };

  // Delete Confirmation Handlers
  const handleOpenDelete = (fc) => {
    setFcToDelete(fc);
  };

  const handleConfirmDelete = async () => {
    if (!fcToDelete) return;
    setIsDeleting(true);
    try {
      const response = await axios.delete(`${API_URL}/deleteFC/${fcToDelete.fcid}`);
      if (response.data && (response.data.success || response.status === 200)) {
        const deletedFcNo = fcToDelete.fcno;
        setFcToDelete(null);
        await fetchFC();
        showFlashCard(`Fitness Certificate #${deletedFcNo} has been deleted successfully.`, "success", "Certificate Deleted");
      } else {
        showFlashCard(response.data?.message || "Delete operation failed.", "danger", "Delete Failed");
      }
    } catch (err) {
      console.error("Error deleting FC:", err);
      const msg = err.response?.data?.message || "Failed to delete fitness certificate record.";
      showFlashCard(msg, "danger", "Delete Failed");
    } finally {
      setIsDeleting(false);
    }
  };

  // Excel Report Export Handler
  const handleExportReport = () => {
    if (!filteredFC.length) return;
    exportToExcel(
      filteredFC.map((fc, idx) => ({
        "S.No": idx + 1,
        "FC ID": fc.fcid,
        "Vehicle ID": fc.vehicleid,
        "FC Number": fc.fcno,
        "Issue Date": formatDateForDisplay(fc.issuedate),
        "Expiry Date": formatDateForDisplay(fc.expirydate),
        "Status": getStatusMeta(fc.status, fc.expirydate).label
      })),
      "Fitness_Certificate_Report"
    );
  };

  return (
    <div className="view-fc-master-container">
      <div className="view-fc-box-wrapper">
        {/* ====================================================================
            1. BREADCRUMBS & PAGE HEADER (Matches Vehicle, Permit & Insurance Master)
            ==================================================================== */}
        <div className="vm-breadcrumb-nav">
          <span className="link" onClick={() => navigate("/home")}>Dashboard</span>
          <span className="sep">/</span>
          <span className="link" onClick={() => navigate("/home/vehiclemaster")}>Bus & Fleet Master</span>
          <span className="sep">/</span>
          <span className="current">Fitness Certificate Master</span>
        </div>

        <div className="vm-page-header">
          <div className="vm-header-left">
            <h2 className="vm-page-title">Fitness Certificate Master</h2>
          </div>

          <div className="vm-header-actions">
            <button
              type="button"
              className="vm-btn-secondary vm-btn-report"
              onClick={handleExportReport}
              disabled={!filteredFC.length}
              title="Export filtered records to Excel"
            >
              <FileSpreadsheet size={16} />
              <span>Generate Report</span>
            </button>

            <button
              type="button"
              className="vm-btn-primary vm-btn-add"
              onClick={() => setShowAddModal(true)}
              title="Add a new vehicle fitness certificate"
            >
              <Plus size={16} strokeWidth={2.4} />
              <span>Add FC</span>
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
            <label htmlFor="filter-fc-vehicle-id">Vehicle ID</label>
            <select
              id="filter-fc-vehicle-id"
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
            <label htmlFor="filter-fc-number">FC Number</label>
            <select
              id="filter-fc-number"
              value={filterFcNo}
              onChange={(e) => setFilterFcNo(e.target.value)}
              className="fleet-filter-select"
              aria-label="Filter by FC number"
            >
              <option value="">All FC Numbers</option>
              {uniqueFcNumbers.map((no) => (
                <option key={no} value={no}>
                  {no}
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
            3. FC RECORDS TABLE - Solid Navy Header, Zero Desktop Overflow
            ==================================================================== */}
        <div className="view-fc-table-container">
          <table className="view-fc-table">
            <thead>
              <tr>
                <th className="col-fc-id">ID</th>
                <th className="col-fc-vehicleid">VEHICLE ID</th>
                <th className="col-fc-no">FC NUMBER</th>
                <th className="col-fc-issue">ISSUE DATE</th>
                <th className="col-fc-expiry">EXPIRY DATE</th>
                <th className="col-fc-status">STATUS</th>
                <th className="col-fc-actions">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="fc-table-loading">
                    Loading fitness certificate records...
                  </td>
                </tr>
              ) : paginatedFC.length > 0 ? (
                paginatedFC.map((fc, index) => {
                  const statusMeta = getStatusMeta(fc.status, fc.expirydate);

                  return (
                    <tr key={`${fc.fcid}-${fc.fcno}-${index}`}>
                      <td className="col-sno-td">{fc.fcid}</td>
                      <td>
                        <span className="fc-vehicle-badge">Vehicle #{fc.vehicleid}</span>
                      </td>
                      <td>
                        <span className="fc-code-badge">{fc.fcno}</span>
                      </td>
                      <td className="col-date-td">{formatDateForDisplay(fc.issuedate)}</td>
                      <td className="col-date-td">{formatDateForDisplay(fc.expirydate)}</td>
                      <td>
                        <span className={`fc-status-badge ${statusMeta.className}`}>
                          {statusMeta.label}
                        </span>
                      </td>
                      <td className="fleet-actions-cell">
                        <div className="fleet-action-buttons-group">
                          <button
                            type="button"
                            className="fleet-action-btn fleet-action-view"
                            onClick={() => handleViewDetails(fc)}
                            title={`View details of FC #${fc.fcno}`}
                          >
                            <Eye size={13} />
                            <span>View</span>
                          </button>

                          <button
                            type="button"
                            className="fleet-action-btn fleet-action-edit"
                            onClick={() => handleOpenEdit(fc)}
                            title={`Edit FC #${fc.fcno}`}
                          >
                            <Pencil size={13} />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            className="fleet-action-btn fleet-action-delete"
                            onClick={() => handleOpenDelete(fc)}
                            title={`Delete FC #${fc.fcno}`}
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
                  <td colSpan="7" className="fc-table-empty">
                    {hasActiveFilters
                      ? "No fitness certificate records match the selected filters. Click 'Reset Filters' to view all records."
                      : "No fitness certificate records found in system."}
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
            Showing {startEntryIndex} to {endEntryIndex} of {filteredFC.length} entries
            {hasActiveFilters && ` (filtered from ${allFC.length} total entries)`}
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
          5. ADD FC MODAL (Dual Columns Layout matching Add Vehicle/Permit/Insurance)
          ==================================================================== */}
      {showAddModal && (
        <div
          className="modal-overlay vm-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmitting) handleCloseAddModal();
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-fc-title"
        >
          <div className="vm-add-modal-box">
            {/* Modal Header */}
            <div className="vm-modal-header">
              <div className="vm-modal-title-group">
                <div className="vm-modal-icon-badge" aria-hidden="true">
                  <Award size={18} strokeWidth={2.2} />
                </div>
                <div>
                  <h3 id="add-fc-title" className="vm-modal-title">
                    Add Fitness Certificate
                  </h3>
                  <p className="vm-modal-subtitle">
                    Enter vehicle fitness certificate specifications and validity details.
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
                {/* Column Left: Certificate Details */}
                <div className="vm-column-panel">
                  <div className="vm-panel-header">
                    <Award size={14} className="vm-panel-icon" />
                    <h4 className="vm-panel-title">Certificate Details</h4>
                  </div>

                  <div className="vm-panel-fields">
                    {/* Vehicle ID Dropdown */}
                    <div className="fleet-form-field">
                      <div className="fleet-label-row">
                        <label htmlFor="add-fc-vehicleid">
                          Vehicle ID <span className="req-star">*</span>
                        </label>
                      </div>
                      <select
                        id="add-fc-vehicleid"
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

                    {/* FC Number */}
                    <div className="fleet-form-field">
                      <div className="fleet-label-row">
                        <label htmlFor="add-fc-fcno">
                          FC Number <span className="req-star">*</span>
                        </label>
                      </div>
                      <input
                        type="text"
                        id="add-fc-fcno"
                        name="fcNo"
                        placeholder="e.g. FC-2025-001"
                        value={addFormData.fcNo}
                        onChange={handleAddChange}
                        onBlur={handleAddBlur}
                        className={formErrors.fcNo && touchedFields.fcNo ? "input-has-error" : ""}
                        disabled={isSubmitting}
                      />
                      {formErrors.fcNo && touchedFields.fcNo && (
                        <span className="vm-field-error-msg" role="alert">
                          <AlertCircle size={11} /> {formErrors.fcNo}
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
                        <label htmlFor="add-fc-issuedate">
                          Issue Date <span className="req-star">*</span>
                        </label>
                      </div>
                      <input
                        type="date"
                        id="add-fc-issuedate"
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
                        <label htmlFor="add-fc-expirydate">
                          Expiry Date <span className="req-star">*</span>
                        </label>
                      </div>
                      <input
                        type="date"
                        id="add-fc-expirydate"
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
                        <label htmlFor="add-fc-status">
                          Status <span className="req-star">*</span>
                        </label>
                      </div>
                      <select
                        id="add-fc-status"
                        name="status"
                        value={addFormData.status}
                        onChange={handleAddChange}
                        onBlur={handleAddBlur}
                        className={formErrors.status && touchedFields.status ? "input-has-error" : ""}
                        disabled={isSubmitting}
                      >
                        <option value="Active">Active</option>
                        <option value="Expired">Expired</option>
                        <option value="Expiring Soon">Expiring Soon</option>
                        <option value="Pending">Pending</option>
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
                      <span>Save FC</span>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          6. EDIT FC MODAL (Identical UI Layout matching Add FC)
          ==================================================================== */}
      {showEditModal && editingFC && (
        <div
          className="modal-overlay vm-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isEditSubmitting) handleCloseEditModal();
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-fc-title"
        >
          <div className="vm-add-modal-box">
            {/* Modal Header */}
            <div className="vm-modal-header">
              <div className="vm-modal-title-group">
                <div className="vm-modal-icon-badge" aria-hidden="true">
                  <Pencil size={18} strokeWidth={2.2} />
                </div>
                <div>
                  <h3 id="edit-fc-title" className="vm-modal-title">
                    Edit Fitness Certificate #{editingFC.fcid}
                  </h3>
                  <p className="vm-modal-subtitle">
                    Update fitness certificate and validity details.
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
                {/* Column Left: Certificate Details */}
                <div className="vm-column-panel">
                  <div className="vm-panel-header">
                    <Award size={14} className="vm-panel-icon" />
                    <h4 className="vm-panel-title">Certificate Details</h4>
                  </div>

                  <div className="vm-panel-fields">
                    {/* Vehicle ID Dropdown */}
                    <div className="fleet-form-field">
                      <div className="fleet-label-row">
                        <label htmlFor="edit-fc-vehicleid">
                          Vehicle ID <span className="req-star">*</span>
                        </label>
                      </div>
                      <select
                        id="edit-fc-vehicleid"
                        name="vehicleId"
                        value={editFormData.vehicleId}
                        onChange={handleEditChange}
                        onBlur={handleEditBlur}
                        className={editFormErrors.vehicleId && editTouchedFields.vehicleId ? "input-has-error" : ""}
                        disabled={isEditSubmitting}
                      >
                        <option value="">Select Vehicle ID</option>
                        {uniqueVehicleIds.map((id) => (
                          <option key={id} value={id}>
                            Vehicle #{id}
                          </option>
                        ))}
                      </select>
                      {editFormErrors.vehicleId && editTouchedFields.vehicleId && (
                        <span className="vm-field-error-msg" role="alert">
                          <AlertCircle size={11} /> {editFormErrors.vehicleId}
                        </span>
                      )}
                    </div>

                    {/* FC Number */}
                    <div className="fleet-form-field">
                      <div className="fleet-label-row">
                        <label htmlFor="edit-fc-fcno">
                          FC Number <span className="req-star">*</span>
                        </label>
                      </div>
                      <input
                        type="text"
                        id="edit-fc-fcno"
                        name="fcNo"
                        value={editFormData.fcNo}
                        onChange={handleEditChange}
                        onBlur={handleEditBlur}
                        className={editFormErrors.fcNo && editTouchedFields.fcNo ? "input-has-error" : ""}
                        disabled={isEditSubmitting}
                      />
                      {editFormErrors.fcNo && editTouchedFields.fcNo && (
                        <span className="vm-field-error-msg" role="alert">
                          <AlertCircle size={11} /> {editFormErrors.fcNo}
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
                        <label htmlFor="edit-fc-issuedate">
                          Issue Date <span className="req-star">*</span>
                        </label>
                      </div>
                      <input
                        type="date"
                        id="edit-fc-issuedate"
                        name="issueDate"
                        value={editFormData.issueDate}
                        onChange={handleEditChange}
                        onBlur={handleEditBlur}
                        className={editFormErrors.issueDate && editTouchedFields.issueDate ? "input-has-error" : ""}
                        disabled={isEditSubmitting}
                      />
                      {editFormErrors.issueDate && editTouchedFields.issueDate && (
                        <span className="vm-field-error-msg" role="alert">
                          <AlertCircle size={11} /> {editFormErrors.issueDate}
                        </span>
                      )}
                    </div>

                    {/* Expiry Date */}
                    <div className="fleet-form-field">
                      <div className="fleet-label-row">
                        <label htmlFor="edit-fc-expirydate">
                          Expiry Date <span className="req-star">*</span>
                        </label>
                      </div>
                      <input
                        type="date"
                        id="edit-fc-expirydate"
                        name="expiryDate"
                        value={editFormData.expiryDate}
                        onChange={handleEditChange}
                        onBlur={handleEditBlur}
                        className={editFormErrors.expiryDate && editTouchedFields.expiryDate ? "input-has-error" : ""}
                        disabled={isEditSubmitting}
                      />
                      {editFormErrors.expiryDate && editTouchedFields.expiryDate && (
                        <span className="vm-field-error-msg" role="alert">
                          <AlertCircle size={11} /> {editFormErrors.expiryDate}
                        </span>
                      )}
                    </div>

                    {/* Status Dropdown */}
                    <div className="fleet-form-field">
                      <div className="fleet-label-row">
                        <label htmlFor="edit-fc-status">
                          Status <span className="req-star">*</span>
                        </label>
                      </div>
                      <select
                        id="edit-fc-status"
                        name="status"
                        value={editFormData.status}
                        onChange={handleEditChange}
                        onBlur={handleEditBlur}
                        className={editFormErrors.status && editTouchedFields.status ? "input-has-error" : ""}
                        disabled={isEditSubmitting}
                      >
                        <option value="Active">Active</option>
                        <option value="Expired">Expired</option>
                        <option value="Expiring Soon">Expiring Soon</option>
                        <option value="Pending">Pending</option>
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
                      <span>Update FC</span>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          7. VIEW FC DETAILS MODAL (Read-Only)
          ==================================================================== */}
      {showDetailsModal && selectedFC && (
        <div
          className="modal-overlay vm-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDetailsModal(false);
              setSelectedFC(null);
            }
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="view-fc-details-title"
        >
          <div className="fleet-modal-box">
            <div className="fleet-modal-header">
              <div className="vm-modal-title-group">
                <div className="vm-modal-icon-badge" aria-hidden="true">
                  <Award size={18} strokeWidth={2.2} />
                </div>
                <div>
                  <h3 id="view-fc-details-title" className="fleet-modal-title">
                    Fitness Certificate Details
                  </h3>
                  <p className="fleet-modal-subtitle">
                    Specifications for Fitness Certificate #{selectedFC.fcno}
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="fleet-modal-close"
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedFC(null);
                }}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className="fleet-details-grid">
              <div className="fleet-detail-item">
                <span className="fleet-detail-label">FC ID</span>
                <span className="fleet-detail-value">#{selectedFC.fcid}</span>
              </div>

              <div className="fleet-detail-item">
                <span className="fleet-detail-label">Vehicle ID</span>
                <span className="fleet-detail-value">Vehicle #{selectedFC.vehicleid}</span>
              </div>

              <div className="fleet-detail-item">
                <span className="fleet-detail-label">FC Number</span>
                <span className="fleet-detail-value fc-code-badge">{selectedFC.fcno}</span>
              </div>

              <div className="fleet-detail-item">
                <span className="fleet-detail-label">Current Status</span>
                <span className="fleet-detail-value">
                  {(() => {
                    const meta = getStatusMeta(selectedFC.status, selectedFC.expirydate);
                    return <span className={`fc-status-badge ${meta.className}`}>{meta.label}</span>;
                  })()}
                </span>
              </div>

              <div className="fleet-detail-item">
                <span className="fleet-detail-label">Issue Date</span>
                <span className="fleet-detail-value">{formatDateForDisplay(selectedFC.issuedate)}</span>
              </div>

              <div className="fleet-detail-item">
                <span className="fleet-detail-label">Expiry Date</span>
                <span className="fleet-detail-value">{formatDateForDisplay(selectedFC.expirydate)}</span>
              </div>
            </div>

            <div className="modal-actions" style={{ justifyContent: "flex-end", marginTop: "18px" }}>
              <button
                type="button"
                className="vm-modal-cancel-btn"
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedFC(null);
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
      {fcToDelete && (
        <div
          className="modal-overlay vm-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeleting) setFcToDelete(null);
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-fc-dialog-title"
        >
          <div className="vm-delete-modal-box">
            <div className="vm-delete-modal-header">
              <div className="vm-delete-icon-badge" aria-hidden="true">
                <Trash2 size={22} strokeWidth={2.2} />
              </div>

              <div className="vm-delete-modal-text">
                <h3 id="delete-fc-dialog-title" className="vm-delete-modal-title">
                  Delete Fitness Certificate
                </h3>
                <p className="vm-delete-modal-desc">
                  Are you sure you want to delete Fitness Certificate{" "}
                  <strong>"{fcToDelete.fcno}"</strong> (ID #{fcToDelete.fcid}) for{" "}
                  <strong>Vehicle #{fcToDelete.vehicleid}</strong>? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="vm-modal-footer">
              <span className="vm-modal-footer-hint">Permanent deletion</span>
              <div className="vm-modal-footer-actions">
                <button
                  type="button"
                  className="vm-modal-cancel-btn"
                  onClick={() => setFcToDelete(null)}
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
                    <span>Delete FC</span>
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

export default ViewFC;
