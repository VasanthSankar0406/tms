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
  ShieldCheck,
  CalendarDays,
  Loader2
} from "lucide-react";
import { API_URL } from "../../../config";
import "../../../styles/ViewVehicle.css";
import "../../../styles/ViewInsurance.css";
import { exportToExcel } from "../../ReportGenerator";

const ViewInsurance = () => {
  const navigate = useNavigate();

  // Master insurance state
  const [allInsurance, setAllInsurance] = useState([]);
  const [vehicleOptions, setVehicleOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Live filter states
  const [filterVehicleId, setFilterVehicleId] = useState("");
  const [filterPolicyNo, setFilterPolicyNo] = useState("");

  // Pagination state (5 records per page matching Vehicle Master)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // 3-Second Auto-Dismissing Flash Card Notification
  const [flashCard, setFlashCard] = useState(null);
  const flashTimerRef = useRef(null);

  // Add Insurance modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});
  const firstAddInputRef = useRef(null);

  const [addFormData, setAddFormData] = useState({
    vehicleId: "",
    policyNo: "",
    companyName: "",
    issueDate: "",
    expiryDate: "",
    premiumAmount: ""
  });

  // Edit Insurance modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingInsurance, setEditingInsurance] = useState(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [editFormErrors, setEditFormErrors] = useState({});
  const [editTouchedFields, setEditTouchedFields] = useState({});

  const [editFormData, setEditFormData] = useState({
    vehicleId: "",
    policyNo: "",
    companyName: "",
    issueDate: "",
    expiryDate: "",
    premiumAmount: ""
  });

  // View Details modal state
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedInsurance, setSelectedInsurance] = useState(null);

  // Delete confirmation modal state
  const [insuranceToDelete, setInsuranceToDelete] = useState(null);
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

  // Status badge calculation based on actual expiration dates
  const getStatusMeta = (expiryDate) => {
    if (!expiryDate) return { label: "Unknown", className: "status-warning" };
    try {
      const exp = new Date(expiryDate).getTime();
      const now = new Date().setHours(0, 0, 0, 0);
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;

      if (isNaN(exp)) return { label: "Active", className: "status-active" };

      if (exp < now) {
        return { label: "Expired", className: "status-expired" };
      } else if (exp - now <= thirtyDays) {
        return { label: "Expiring Soon", className: "status-warning" };
      } else {
        return { label: "Active", className: "status-active" };
      }
    } catch {
      return { label: "Active", className: "status-active" };
    }
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

  // Fetch insurance records from backend API
  const fetchInsurance = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/getInsurance`);
      const data = Array.isArray(response.data) ? response.data : [];
      setAllInsurance(data);
      setError("");
    } catch (err) {
      console.error("Error fetching insurance:", err);
      setError("Failed to fetch insurance records. Please verify database connectivity.");
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
    fetchInsurance();
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
        } else if (insuranceToDelete && !isDeleting) {
          setInsuranceToDelete(null);
        } else if (showDetailsModal) {
          setShowDetailsModal(false);
          setSelectedInsurance(null);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showAddModal, isSubmitting, showEditModal, isEditSubmitting, insuranceToDelete, isDeleting, showDetailsModal]);

  // Unique filter dropdown options extracted from master records
  const uniqueVehicleIds = useMemo(() => {
    const idsFromInsurance = allInsurance.map((ins) => ins.vehicleid).filter((id) => id != null);
    const combined = [...new Set([...idsFromInsurance, ...vehicleOptions])];
    return combined.sort((a, b) => Number(a) - Number(b));
  }, [allInsurance, vehicleOptions]);

  const uniquePolicyNumbers = useMemo(() => {
    return [...new Set(allInsurance.map((ins) => ins.policyno).filter(Boolean))].sort();
  }, [allInsurance]);

  // Live filter computation: applies immediately on dropdown selection with AND logic
  const filteredInsurance = useMemo(() => {
    return allInsurance.filter((ins) => {
      // 1. Vehicle ID filter
      if (filterVehicleId) {
        if (String(ins.vehicleid ?? "").trim() !== String(filterVehicleId).trim()) {
          return false;
        }
      }

      // 2. Policy / Insurance Number filter
      if (filterPolicyNo) {
        if (String(ins.policyno ?? "").trim().toLowerCase() !== String(filterPolicyNo).trim().toLowerCase()) {
          return false;
        }
      }

      return true;
    });
  }, [allInsurance, filterVehicleId, filterPolicyNo]);

  const hasActiveFilters = Boolean(filterVehicleId || filterPolicyNo);

  const handleResetFilters = () => {
    setFilterVehicleId("");
    setFilterPolicyNo("");
  };

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterVehicleId, filterPolicyNo]);

  // Pagination calculation (5 records per page)
  const totalPages = Math.max(1, Math.ceil(filteredInsurance.length / itemsPerPage));
  const paginatedInsurance = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredInsurance.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredInsurance, currentPage, itemsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const startEntryIndex = filteredInsurance.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endEntryIndex = Math.min(currentPage * itemsPerPage, filteredInsurance.length);

  // Field validation for Add Insurance
  const validateAddField = (name, value, allValues = addFormData) => {
    let err = "";
    const str = String(value || "").trim();

    switch (name) {
      case "vehicleId":
        if (!str) err = "Please select a vehicle ID";
        break;
      case "policyNo":
        if (!str) err = "Insurance policy number is required";
        break;
      case "companyName":
        if (!str) err = "Insurance company name is required";
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
      case "premiumAmount":
        if (!str) {
          err = "Premium amount is required";
        } else if (isNaN(str) || Number(str) <= 0) {
          err = "Enter a valid positive amount";
        }
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
      policyNo: "",
      companyName: "",
      issueDate: "",
      expiryDate: "",
      premiumAmount: ""
    });
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();

    const fields = ["vehicleId", "policyNo", "companyName", "issueDate", "expiryDate", "premiumAmount"];
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
      } else if (f === "premiumAmount" && (isNaN(str) || Number(str) <= 0)) {
        newErrors[f] = "Enter a valid positive amount";
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
        policyNo: addFormData.policyNo.trim(),
        companyName: addFormData.companyName.trim(),
        issueDate: addFormData.issueDate,
        expiryDate: addFormData.expiryDate,
        premiumAmount: Number(addFormData.premiumAmount)
      };

      const response = await axios.post(`${API_URL}/addInsurance`, payload);
      if (response.data && (response.data.success || response.status === 200 || response.status === 201)) {
        const savedPolicy = addFormData.policyNo.trim();
        handleCloseAddModal();
        await fetchInsurance();
        showFlashCard(`Insurance policy #${savedPolicy} added successfully!`, "success", "Insurance Added");
      } else {
        showFlashCard(response.data?.message || "Failed to create insurance record.", "danger", "Creation Failed");
      }
    } catch (err) {
      console.error("Error adding insurance:", err);
      const msg = err.response?.data?.message || "Failed to save insurance. Policy number may already exist.";
      showFlashCard(msg, "danger", "Creation Failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Field validation for Edit Insurance
  const validateEditField = (name, value, allValues = editFormData) => {
    let err = "";
    const str = String(value || "").trim();

    switch (name) {
      case "vehicleId":
        if (!str) err = "Please select a vehicle ID";
        break;
      case "policyNo":
        if (!str) err = "Insurance policy number is required";
        break;
      case "companyName":
        if (!str) err = "Insurance company name is required";
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
      case "premiumAmount":
        if (!str) {
          err = "Premium amount is required";
        } else if (isNaN(str) || Number(str) <= 0) {
          err = "Enter a valid positive amount";
        }
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

  const handleOpenEdit = (insurance) => {
    setEditingInsurance(insurance);
    setEditFormData({
      vehicleId: String(insurance.vehicleid || ""),
      policyNo: String(insurance.policyno || ""),
      companyName: String(insurance.companyname || ""),
      issueDate: formatDateForInput(insurance.issuedate),
      expiryDate: formatDateForInput(insurance.expirydate),
      premiumAmount: String(insurance.premiumamount || "")
    });
    setEditFormErrors({});
    setEditTouchedFields({});
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingInsurance(null);
    setEditFormErrors({});
    setEditTouchedFields({});
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingInsurance) return;

    const fields = ["vehicleId", "policyNo", "companyName", "issueDate", "expiryDate", "premiumAmount"];
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
      } else if (f === "premiumAmount" && (isNaN(str) || Number(str) <= 0)) {
        newErrors[f] = "Enter a valid positive amount";
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
        vehicleId: editFormData.vehicleId,
        policyNo: editFormData.policyNo.trim(),
        companyName: editFormData.companyName.trim(),
        issueDate: editFormData.issueDate,
        expiryDate: editFormData.expiryDate,
        premiumAmount: Number(editFormData.premiumAmount)
      };

      const response = await axios.put(`${API_URL}/updateInsurance/${editingInsurance.insuranceid}`, payload);
      if (response.data && (response.data.success || response.status === 200)) {
        const updatedPolicy = editFormData.policyNo.trim();
        handleCloseEditModal();
        await fetchInsurance();
        showFlashCard(`Insurance policy #${updatedPolicy} updated successfully!`, "success", "Insurance Updated");
      } else {
        showFlashCard(response.data?.message || "Failed to update insurance record.", "danger", "Update Failed");
      }
    } catch (err) {
      console.error("Error updating insurance:", err);
      const msg = err.response?.data?.message || "Failed to update insurance record.";
      showFlashCard(msg, "danger", "Update Failed");
    } finally {
      setIsEditSubmitting(false);
    }
  };

  // View Details Modal Handler
  const handleViewDetails = (insurance) => {
    setSelectedInsurance(insurance);
    setShowDetailsModal(true);
  };

  // Delete Confirmation Handlers
  const handleOpenDelete = (insurance) => {
    setInsuranceToDelete(insurance);
  };

  const handleConfirmDelete = async () => {
    if (!insuranceToDelete) return;
    setIsDeleting(true);
    try {
      const response = await axios.delete(`${API_URL}/deleteInsurance/${insuranceToDelete.insuranceid}`);
      if (response.data && (response.data.success || response.status === 200)) {
        const deletedPolicy = insuranceToDelete.policyno;
        setInsuranceToDelete(null);
        await fetchInsurance();
        showFlashCard(`Insurance policy #${deletedPolicy} has been deleted successfully.`, "success", "Insurance Deleted");
      } else {
        showFlashCard(response.data?.message || "Delete operation failed.", "danger", "Delete Failed");
      }
    } catch (err) {
      console.error("Error deleting insurance:", err);
      const msg = err.response?.data?.message || "Failed to delete insurance record.";
      showFlashCard(msg, "danger", "Delete Failed");
    } finally {
      setIsDeleting(false);
    }
  };

  // Excel Report Export Handler
  const handleExportReport = () => {
    if (!filteredInsurance.length) return;
    exportToExcel(
      filteredInsurance.map((ins, idx) => ({
        "S.No": idx + 1,
        "Insurance ID": ins.insuranceid,
        "Vehicle ID": ins.vehicleid,
        "Policy Number": ins.policyno,
        "Company Name": ins.companyname,
        "Issue Date": formatDateForDisplay(ins.issuedate),
        "Expiry Date": formatDateForDisplay(ins.expirydate),
        "Premium Amount (INR)": ins.premiumamount,
        "Status": getStatusMeta(ins.expirydate).label
      })),
      "Insurance_Master_Report"
    );
  };

  return (
    <div className="view-insurance-master-container">
      <div className="view-insurance-box-wrapper">
        {/* ====================================================================
            1. BREADCRUMBS & PAGE HEADER (Matches Vehicle & Permit Master Pattern)
            ==================================================================== */}
        <div className="vm-breadcrumb-nav">
          <span className="link" onClick={() => navigate("/home")}>Dashboard</span>
          <span className="sep">/</span>
          <span className="link" onClick={() => navigate("/home/vehiclemaster")}>Bus & Fleet Master</span>
          <span className="sep">/</span>
          <span className="current">Insurance Master</span>
        </div>

        <div className="vm-page-header">
          <div className="vm-header-left">
            <h2 className="vm-page-title">Insurance Master</h2>
          </div>

          <div className="vm-header-actions">
            <button
              type="button"
              className="vm-btn-secondary vm-btn-report"
              onClick={handleExportReport}
              disabled={!filteredInsurance.length}
              title="Export filtered records to Excel"
            >
              <FileSpreadsheet size={16} />
              <span>Generate Report</span>
            </button>

            <button
              type="button"
              className="vm-btn-primary vm-btn-add"
              onClick={() => setShowAddModal(true)}
              title="Add a new vehicle insurance policy"
            >
              <Plus size={16} strokeWidth={2.4} />
              <span>Add Insurance</span>
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
            <label htmlFor="filter-ins-vehicle-id">Vehicle ID</label>
            <select
              id="filter-ins-vehicle-id"
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
            <label htmlFor="filter-ins-policy-no">Insurance Number</label>
            <select
              id="filter-ins-policy-no"
              value={filterPolicyNo}
              onChange={(e) => setFilterPolicyNo(e.target.value)}
              className="fleet-filter-select"
              aria-label="Filter by insurance policy number"
            >
              <option value="">All Insurance Numbers</option>
              {uniquePolicyNumbers.map((no) => (
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
            3. INSURANCE RECORDS TABLE - Solid Navy Header, Zero Desktop Overflow
            ==================================================================== */}
        <div className="view-insurance-table-container">
          <table className="view-insurance-table">
            <thead>
              <tr>
                <th className="col-ins-id">ID</th>
                <th className="col-ins-vehicleid">VEHICLE ID</th>
                <th className="col-ins-policyno">INSURANCE NUMBER</th>
                <th className="col-ins-company">COMPANY NAME</th>
                <th className="col-ins-issue">ISSUE DATE</th>
                <th className="col-ins-expiry">EXPIRY DATE</th>
                <th className="col-ins-premium">PREMIUM (₹)</th>
                <th className="col-ins-status">STATUS</th>
                <th className="col-ins-actions">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" className="insurance-table-loading">
                    Loading insurance records...
                  </td>
                </tr>
              ) : paginatedInsurance.length > 0 ? (
                paginatedInsurance.map((ins, index) => {
                  const statusMeta = getStatusMeta(ins.expirydate);

                  return (
                    <tr key={`${ins.insuranceid}-${ins.policyno}-${index}`}>
                      <td className="col-sno-td">{ins.insuranceid}</td>
                      <td>
                        <span className="insurance-vehicle-badge">Vehicle #{ins.vehicleid}</span>
                      </td>
                      <td>
                        <span className="insurance-code-badge">{ins.policyno}</span>
                      </td>
                      <td className="insurance-company-text">{ins.companyname || "N/A"}</td>
                      <td className="col-date-td">{formatDateForDisplay(ins.issuedate)}</td>
                      <td className="col-date-td">{formatDateForDisplay(ins.expirydate)}</td>
                      <td className="insurance-premium-badge">
                        ₹{Number(ins.premiumamount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td>
                        <span className={`insurance-status-badge ${statusMeta.className}`}>
                          {statusMeta.label}
                        </span>
                      </td>
                      <td className="fleet-actions-cell">
                        <div className="fleet-action-buttons-group">
                          <button
                            type="button"
                            className="fleet-action-btn fleet-action-view"
                            onClick={() => handleViewDetails(ins)}
                            title={`View details of Insurance #${ins.policyno}`}
                          >
                            <Eye size={13} />
                            <span>View</span>
                          </button>

                          <button
                            type="button"
                            className="fleet-action-btn fleet-action-edit"
                            onClick={() => handleOpenEdit(ins)}
                            title={`Edit Insurance #${ins.policyno}`}
                          >
                            <Pencil size={13} />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            className="fleet-action-btn fleet-action-delete"
                            onClick={() => handleOpenDelete(ins)}
                            title={`Delete Insurance #${ins.policyno}`}
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
                  <td colSpan="9" className="insurance-table-empty">
                    {hasActiveFilters
                      ? "No insurance records match the selected filters. Click 'Reset Filters' to view all records."
                      : "No insurance records found in system."}
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
            Showing {startEntryIndex} to {endEntryIndex} of {filteredInsurance.length} entries
            {hasActiveFilters && ` (filtered from ${allInsurance.length} total entries)`}
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
          5. ADD INSURANCE MODAL (Dual Columns Layout matching Add Vehicle/Permit)
          ==================================================================== */}
      {showAddModal && (
        <div
          className="modal-overlay vm-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmitting) handleCloseAddModal();
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-insurance-title"
        >
          <div className="vm-add-modal-box">
            {/* Modal Header */}
            <div className="vm-modal-header">
              <div className="vm-modal-title-group">
                <div className="vm-modal-icon-badge" aria-hidden="true">
                  <ShieldCheck size={18} strokeWidth={2.2} />
                </div>
                <div>
                  <h3 id="add-insurance-title" className="vm-modal-title">
                    Add New Insurance
                  </h3>
                  <p className="vm-modal-subtitle">
                    Enter vehicle insurance coverage specifications and validity details.
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
                {/* Column Left: Insurance Details */}
                <div className="vm-column-panel">
                  <div className="vm-panel-header">
                    <ShieldCheck size={14} className="vm-panel-icon" />
                    <h4 className="vm-panel-title">Insurance Details</h4>
                  </div>

                  <div className="vm-panel-fields">
                    {/* Vehicle ID Dropdown */}
                    <div className="fleet-form-field">
                      <div className="fleet-label-row">
                        <label htmlFor="add-ins-vehicleid">
                          Vehicle ID <span className="req-star">*</span>
                        </label>
                      </div>
                      <select
                        id="add-ins-vehicleid"
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

                    {/* Policy / Insurance Number */}
                    <div className="fleet-form-field">
                      <div className="fleet-label-row">
                        <label htmlFor="add-ins-policyno">
                          Insurance Number <span className="req-star">*</span>
                        </label>
                      </div>
                      <input
                        type="text"
                        id="add-ins-policyno"
                        name="policyNo"
                        placeholder="e.g. POL-2025-001"
                        value={addFormData.policyNo}
                        onChange={handleAddChange}
                        onBlur={handleAddBlur}
                        className={formErrors.policyNo && touchedFields.policyNo ? "input-has-error" : ""}
                        disabled={isSubmitting}
                      />
                      {formErrors.policyNo && touchedFields.policyNo && (
                        <span className="vm-field-error-msg" role="alert">
                          <AlertCircle size={11} /> {formErrors.policyNo}
                        </span>
                      )}
                    </div>

                    {/* Company Name */}
                    <div className="fleet-form-field">
                      <div className="fleet-label-row">
                        <label htmlFor="add-ins-companyname">
                          Company Name <span className="req-star">*</span>
                        </label>
                      </div>
                      <input
                        type="text"
                        id="add-ins-companyname"
                        name="companyName"
                        placeholder="e.g. National Insurance / HDFC ERGO"
                        value={addFormData.companyName}
                        onChange={handleAddChange}
                        onBlur={handleAddBlur}
                        className={formErrors.companyName && touchedFields.companyName ? "input-has-error" : ""}
                        disabled={isSubmitting}
                      />
                      {formErrors.companyName && touchedFields.companyName && (
                        <span className="vm-field-error-msg" role="alert">
                          <AlertCircle size={11} /> {formErrors.companyName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="vm-dual-columns-divider" aria-hidden="true" />

                {/* Column Right: Coverage & Validity */}
                <div className="vm-column-panel">
                  <div className="vm-panel-header">
                    <CalendarDays size={14} className="vm-panel-icon" />
                    <h4 className="vm-panel-title">Coverage & Validity</h4>
                  </div>

                  <div className="vm-panel-fields">
                    {/* Issue Date */}
                    <div className="fleet-form-field">
                      <div className="fleet-label-row">
                        <label htmlFor="add-ins-issuedate">
                          Issue Date <span className="req-star">*</span>
                        </label>
                      </div>
                      <input
                        type="date"
                        id="add-ins-issuedate"
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
                        <label htmlFor="add-ins-expirydate">
                          Expiry Date <span className="req-star">*</span>
                        </label>
                      </div>
                      <input
                        type="date"
                        id="add-ins-expirydate"
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

                    {/* Premium Amount */}
                    <div className="fleet-form-field">
                      <div className="fleet-label-row">
                        <label htmlFor="add-ins-premiumamount">
                          Premium Amount (₹) <span className="req-star">*</span>
                        </label>
                      </div>
                      <input
                        type="number"
                        id="add-ins-premiumamount"
                        name="premiumAmount"
                        placeholder="e.g. 15000"
                        step="1"
                        value={addFormData.premiumAmount}
                        onChange={handleAddChange}
                        onBlur={handleAddBlur}
                        className={formErrors.premiumAmount && touchedFields.premiumAmount ? "input-has-error" : ""}
                        disabled={isSubmitting}
                      />
                      {formErrors.premiumAmount && touchedFields.premiumAmount && (
                        <span className="vm-field-error-msg" role="alert">
                          <AlertCircle size={11} /> {formErrors.premiumAmount}
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
                      <span>Save Insurance</span>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          6. EDIT INSURANCE MODAL (Identical UI Layout matching Add Insurance)
          ==================================================================== */}
      {showEditModal && editingInsurance && (
        <div
          className="modal-overlay vm-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isEditSubmitting) handleCloseEditModal();
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-insurance-title"
        >
          <div className="vm-add-modal-box">
            {/* Modal Header */}
            <div className="vm-modal-header">
              <div className="vm-modal-title-group">
                <div className="vm-modal-icon-badge" aria-hidden="true">
                  <Pencil size={18} strokeWidth={2.2} />
                </div>
                <div>
                  <h3 id="edit-insurance-title" className="vm-modal-title">
                    Edit Insurance #{editingInsurance.insuranceid}
                  </h3>
                  <p className="vm-modal-subtitle">
                    Update insurance coverage and validity details.
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
                {/* Column Left: Insurance Details */}
                <div className="vm-column-panel">
                  <div className="vm-panel-header">
                    <ShieldCheck size={14} className="vm-panel-icon" />
                    <h4 className="vm-panel-title">Insurance Details</h4>
                  </div>

                  <div className="vm-panel-fields">
                    {/* Vehicle ID Dropdown */}
                    <div className="fleet-form-field">
                      <div className="fleet-label-row">
                        <label htmlFor="edit-ins-vehicleid">
                          Vehicle ID <span className="req-star">*</span>
                        </label>
                      </div>
                      <select
                        id="edit-ins-vehicleid"
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

                    {/* Policy / Insurance Number */}
                    <div className="fleet-form-field">
                      <div className="fleet-label-row">
                        <label htmlFor="edit-ins-policyno">
                          Insurance Number <span className="req-star">*</span>
                        </label>
                      </div>
                      <input
                        type="text"
                        id="edit-ins-policyno"
                        name="policyNo"
                        value={editFormData.policyNo}
                        onChange={handleEditChange}
                        onBlur={handleEditBlur}
                        className={editFormErrors.policyNo && editTouchedFields.policyNo ? "input-has-error" : ""}
                        disabled={isEditSubmitting}
                      />
                      {editFormErrors.policyNo && editTouchedFields.policyNo && (
                        <span className="vm-field-error-msg" role="alert">
                          <AlertCircle size={11} /> {editFormErrors.policyNo}
                        </span>
                      )}
                    </div>

                    {/* Company Name */}
                    <div className="fleet-form-field">
                      <div className="fleet-label-row">
                        <label htmlFor="edit-ins-companyname">
                          Company Name <span className="req-star">*</span>
                        </label>
                      </div>
                      <input
                        type="text"
                        id="edit-ins-companyname"
                        name="companyName"
                        value={editFormData.companyName}
                        onChange={handleEditChange}
                        onBlur={handleEditBlur}
                        className={editFormErrors.companyName && editTouchedFields.companyName ? "input-has-error" : ""}
                        disabled={isEditSubmitting}
                      />
                      {editFormErrors.companyName && editTouchedFields.companyName && (
                        <span className="vm-field-error-msg" role="alert">
                          <AlertCircle size={11} /> {editFormErrors.companyName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="vm-dual-columns-divider" aria-hidden="true" />

                {/* Column Right: Coverage & Validity */}
                <div className="vm-column-panel">
                  <div className="vm-panel-header">
                    <CalendarDays size={14} className="vm-panel-icon" />
                    <h4 className="vm-panel-title">Coverage & Validity</h4>
                  </div>

                  <div className="vm-panel-fields">
                    {/* Issue Date */}
                    <div className="fleet-form-field">
                      <div className="fleet-label-row">
                        <label htmlFor="edit-ins-issuedate">
                          Issue Date <span className="req-star">*</span>
                        </label>
                      </div>
                      <input
                        type="date"
                        id="edit-ins-issuedate"
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
                        <label htmlFor="edit-ins-expirydate">
                          Expiry Date <span className="req-star">*</span>
                        </label>
                      </div>
                      <input
                        type="date"
                        id="edit-ins-expirydate"
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

                    {/* Premium Amount */}
                    <div className="fleet-form-field">
                      <div className="fleet-label-row">
                        <label htmlFor="edit-ins-premiumamount">
                          Premium Amount (₹) <span className="req-star">*</span>
                        </label>
                      </div>
                      <input
                        type="number"
                        id="edit-ins-premiumamount"
                        name="premiumAmount"
                        step="1"
                        value={editFormData.premiumAmount}
                        onChange={handleEditChange}
                        onBlur={handleEditBlur}
                        className={editFormErrors.premiumAmount && editTouchedFields.premiumAmount ? "input-has-error" : ""}
                        disabled={isEditSubmitting}
                      />
                      {editFormErrors.premiumAmount && editTouchedFields.premiumAmount && (
                        <span className="vm-field-error-msg" role="alert">
                          <AlertCircle size={11} /> {editFormErrors.premiumAmount}
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
                      <span>Update Insurance</span>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          7. VIEW INSURANCE DETAILS MODAL (Read-Only)
          ==================================================================== */}
      {showDetailsModal && selectedInsurance && (
        <div
          className="modal-overlay vm-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDetailsModal(false);
              setSelectedInsurance(null);
            }
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="view-insurance-details-title"
        >
          <div className="fleet-modal-box">
            <div className="fleet-modal-header">
              <div className="vm-modal-title-group">
                <div className="vm-modal-icon-badge" aria-hidden="true">
                  <ShieldCheck size={18} strokeWidth={2.2} />
                </div>
                <div>
                  <h3 id="view-insurance-details-title" className="fleet-modal-title">
                    Insurance Details
                  </h3>
                  <p className="fleet-modal-subtitle">
                    Specifications for Insurance Policy #{selectedInsurance.policyno}
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="fleet-modal-close"
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedInsurance(null);
                }}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className="fleet-details-grid">
              <div className="fleet-detail-item">
                <span className="fleet-detail-label">Insurance ID</span>
                <span className="fleet-detail-value">#{selectedInsurance.insuranceid}</span>
              </div>

              <div className="fleet-detail-item">
                <span className="fleet-detail-label">Vehicle ID</span>
                <span className="fleet-detail-value">Vehicle #{selectedInsurance.vehicleid}</span>
              </div>

              <div className="fleet-detail-item">
                <span className="fleet-detail-label">Policy Number</span>
                <span className="fleet-detail-value insurance-code-badge">{selectedInsurance.policyno}</span>
              </div>

              <div className="fleet-detail-item">
                <span className="fleet-detail-label">Company Name</span>
                <span className="fleet-detail-value">{selectedInsurance.companyname || "N/A"}</span>
              </div>

              <div className="fleet-detail-item">
                <span className="fleet-detail-label">Issue Date</span>
                <span className="fleet-detail-value">{formatDateForDisplay(selectedInsurance.issuedate)}</span>
              </div>

              <div className="fleet-detail-item">
                <span className="fleet-detail-label">Expiry Date</span>
                <span className="fleet-detail-value">{formatDateForDisplay(selectedInsurance.expirydate)}</span>
              </div>

              <div className="fleet-detail-item">
                <span className="fleet-detail-label">Premium Amount</span>
                <span className="fleet-detail-value insurance-premium-badge">
                  ₹{Number(selectedInsurance.premiumamount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="fleet-detail-item">
                <span className="fleet-detail-label">Current Status</span>
                <span className="fleet-detail-value">
                  {(() => {
                    const meta = getStatusMeta(selectedInsurance.expirydate);
                    return <span className={`insurance-status-badge ${meta.className}`}>{meta.label}</span>;
                  })()}
                </span>
              </div>
            </div>

            <div className="modal-actions" style={{ justifyContent: "flex-end", marginTop: "18px" }}>
              <button
                type="button"
                className="vm-modal-cancel-btn"
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedInsurance(null);
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
      {insuranceToDelete && (
        <div
          className="modal-overlay vm-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeleting) setInsuranceToDelete(null);
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-insurance-dialog-title"
        >
          <div className="vm-delete-modal-box">
            <div className="vm-delete-modal-header">
              <div className="vm-delete-icon-badge" aria-hidden="true">
                <Trash2 size={22} strokeWidth={2.2} />
              </div>

              <div className="vm-delete-modal-text">
                <h3 id="delete-insurance-dialog-title" className="vm-delete-modal-title">
                  Delete Insurance Record
                </h3>
                <p className="vm-delete-modal-desc">
                  Are you sure you want to delete Insurance Policy{" "}
                  <strong>"{insuranceToDelete.policyno}"</strong> (ID #{insuranceToDelete.insuranceid}) for{" "}
                  <strong>Vehicle #{insuranceToDelete.vehicleid}</strong>? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="vm-modal-footer">
              <span className="vm-modal-footer-hint">Permanent deletion</span>
              <div className="vm-modal-footer-actions">
                <button
                  type="button"
                  className="vm-modal-cancel-btn"
                  onClick={() => setInsuranceToDelete(null)}
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
                    <span>Delete Insurance</span>
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

export default ViewInsurance;
