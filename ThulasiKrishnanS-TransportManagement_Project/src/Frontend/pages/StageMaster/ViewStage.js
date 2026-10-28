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
  MapPin,
  Route as RouteIcon,
  Clock,
  IndianRupee,
  Loader2,
  Milestone
} from "lucide-react";
import { API_URL } from "../../config";
import "../../styles/ViewVehicle.css";
import "../../styles/ViewStage.css";
import { exportToExcel } from "../ReportGenerator";

const DEFAULT_CITIES = [
  "Kovilpatti",
  "Thoothukudi",
  "Tirunelveli",
  "Sattur",
  "Virudhunagar",
  "Vilathikulam",
  "Sivakasi",
  "Kayathar",
  "Sankarankovil",
  "Kalugumalai"
];

const ViewStage = () => {
  const navigate = useNavigate();

  // Master State
  const [allStages, setAllStages] = useState([]);
  const [allRoutes, setAllRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Live filter states (No search button)
  const [filterCity, setFilterCity] = useState("");
  const [filterRouteId, setFilterRouteId] = useState("");
  const [filterStageName, setFilterStageName] = useState("");

  // Pagination state (5 records per page matching other Master pages)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // 3-Second Auto-Dismissing Flash Card Notification
  const [flashCard, setFlashCard] = useState(null);
  const flashTimerRef = useRef(null);

  // Add Stage modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});
  const firstAddInputRef = useRef(null);

  const [addFormData, setAddFormData] = useState({
    stageId: "",
    stageName: "",
    city: "",
    routeId: "",
    arrivalTime: "",
    departureTime: "",
    fee: ""
  });

  // Edit Stage modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStage, setEditingStage] = useState(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [editFormErrors, setEditFormErrors] = useState({});
  const [editTouchedFields, setEditTouchedFields] = useState({});

  const [editFormData, setEditFormData] = useState({
    stageName: "",
    city: "",
    routeId: "",
    arrivalTime: "",
    departureTime: "",
    fee: ""
  });

  // View Details modal state
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedStage, setSelectedStage] = useState(null);

  // Delete confirmation modal state
  const [stageToDelete, setStageToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // Time formatting helper
  const formatTime = (time) => {
    if (!time) return "-";
    const timeStr = String(time).trim();
    if (timeStr.includes(":")) {
      const parts = timeStr.split(":");
      const hours = parseInt(parts[0], 10);
      const minutes = parts[1];
      if (isNaN(hours)) return timeStr;
      const ampm = hours >= 12 ? "PM" : "AM";
      const formattedHours = hours % 12 || 12;
      return `${formattedHours}:${minutes} ${ampm}`;
    }
    return timeStr;
  };

  // Convert time string to HH:MM format for <input type="time" />
  const formatTimeForInput = (time) => {
    if (!time) return "";
    const timeStr = String(time).trim();
    if (timeStr.includes(":")) {
      const parts = timeStr.split(":");
      return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
    }
    return timeStr;
  };

  // Fee formatting helper
  const formatFee = (fee) => {
    if (fee == null || fee === "") return "₹0.00";
    const num = Number(fee);
    if (isNaN(num)) return `₹${fee}`;
    return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Fetch all stages from backend
  const fetchStages = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/getStage`);
      const data = Array.isArray(response.data) ? response.data : [];
      setAllStages(data);
      setError("");
    } catch (err) {
      console.error("Error fetching stages:", err);
      setError("Failed to fetch stage records. Please verify database connectivity.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch all routes from backend
  const fetchRoutes = async () => {
    try {
      const response = await axios.get(`${API_URL}/getRoute`);
      if (Array.isArray(response.data)) {
        setAllRoutes(response.data);
      }
    } catch (err) {
      console.error("Error fetching routes:", err);
    }
  };

  useEffect(() => {
    fetchStages();
    fetchRoutes();
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

  // Keyboard navigation: Escape key closes active modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (showAddModal && !isSubmitting) {
          handleCloseAddModal();
        } else if (showEditModal && !isEditSubmitting) {
          handleCloseEditModal();
        } else if (stageToDelete && !isDeleting) {
          setStageToDelete(null);
        } else if (showDetailsModal) {
          setShowDetailsModal(false);
          setSelectedStage(null);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showAddModal, isSubmitting, showEditModal, isEditSubmitting, stageToDelete, isDeleting, showDetailsModal]);

  // Combined city list
  const availableCities = useMemo(() => {
    const fromStages = allStages.map((s) => s.city?.trim()).filter(Boolean);
    const fromRoutes = allRoutes.map((r) => r.city?.trim()).filter(Boolean);
    const set = new Set([...DEFAULT_CITIES, ...fromStages, ...fromRoutes]);
    return Array.from(set).sort();
  }, [allStages, allRoutes]);

  // Unique filter dropdown options extracted from records
  const uniqueRouteIds = useMemo(() => {
    const idsFromStages = allStages.map((s) => String(s.routeid || "").trim()).filter(Boolean);
    const idsFromRoutes = allRoutes.map((r) => String(r.routeid || "").trim()).filter(Boolean);
    return [...new Set([...idsFromStages, ...idsFromRoutes])].sort();
  }, [allStages, allRoutes]);

  const uniqueStageNames = useMemo(() => {
    const names = allStages.map((s) => String(s.stagename || "").trim()).filter(Boolean);
    return [...new Set(names)].sort();
  }, [allStages]);

  // Routes available for Add Modal (filtered by city if city is chosen, else all routes)
  const addModalRouteOptions = useMemo(() => {
    if (addFormData.city) {
      const matching = allRoutes.filter((r) => r.city?.trim().toLowerCase() === addFormData.city.trim().toLowerCase());
      return matching.length > 0 ? matching : allRoutes;
    }
    return allRoutes;
  }, [allRoutes, addFormData.city]);

  // Routes available for Edit Modal
  const editModalRouteOptions = useMemo(() => {
    if (editFormData.city) {
      const matching = allRoutes.filter((r) => r.city?.trim().toLowerCase() === editFormData.city.trim().toLowerCase());
      return matching.length > 0 ? matching : allRoutes;
    }
    return allRoutes;
  }, [allRoutes, editFormData.city]);

  // Live filter computation: applies immediately on dropdown selection with AND logic
  const filteredStages = useMemo(() => {
    return allStages.filter((stage) => {
      // 1. City filter
      if (filterCity) {
        if (String(stage.city || "").trim().toLowerCase() !== filterCity.trim().toLowerCase()) {
          return false;
        }
      }

      // 2. Route ID filter
      if (filterRouteId) {
        if (String(stage.routeid || "").trim().toLowerCase() !== filterRouteId.trim().toLowerCase()) {
          return false;
        }
      }

      // 3. Stage Name filter
      if (filterStageName) {
        if (String(stage.stagename || "").trim().toLowerCase() !== filterStageName.trim().toLowerCase()) {
          return false;
        }
      }

      return true;
    });
  }, [allStages, filterCity, filterRouteId, filterStageName]);

  const hasActiveFilters = Boolean(filterCity || filterRouteId || filterStageName);

  const handleResetFilters = () => {
    setFilterCity("");
    setFilterRouteId("");
    setFilterStageName("");
  };

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterCity, filterRouteId, filterStageName]);

  // Pagination calculation (5 records per page)
  const totalPages = Math.max(1, Math.ceil(filteredStages.length / itemsPerPage));
  const paginatedStages = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredStages.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredStages, currentPage, itemsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const startEntryIndex = filteredStages.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endEntryIndex = Math.min(currentPage * itemsPerPage, filteredStages.length);

  // Field validation for Add Stage
  const validateAddField = (name, value) => {
    let err = "";
    const str = String(value || "").trim();

    switch (name) {
      case "stageId":
        if (!str) {
          err = "Stage ID is required";
        } else if (allStages.some((s) => String(s.stageid || "").toLowerCase() === str.toLowerCase())) {
          err = "Stage ID already exists";
        }
        break;
      case "stageName":
        if (!str) err = "Stage name is required";
        break;
      case "city":
        if (!str) err = "Please select a city";
        break;
      case "routeId":
        if (!str) err = "Please select a route ID";
        break;
      case "fee":
        if (str && (isNaN(Number(str)) || Number(str) < 0)) {
          err = "Enter a valid positive fee amount";
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
      validateAddField(name, value);
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
      stageId: "",
      stageName: "",
      city: "",
      routeId: "",
      arrivalTime: "",
      departureTime: "",
      fee: ""
    });
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();

    const requiredFields = ["stageId", "stageName", "city", "routeId"];
    const newErrors = {};
    let firstErr = null;

    requiredFields.forEach((f) => {
      const val = addFormData[f];
      const str = String(val || "").trim();
      if (!str) {
        newErrors[f] = "This field is required";
        if (!firstErr) firstErr = f;
      } else if (f === "stageId" && allStages.some((s) => String(s.stageid || "").toLowerCase() === str.toLowerCase())) {
        newErrors[f] = "Stage ID already exists";
        if (!firstErr) firstErr = f;
      }
    });

    if (addFormData.fee && (isNaN(Number(addFormData.fee)) || Number(addFormData.fee) < 0)) {
      newErrors.fee = "Enter a valid positive fee amount";
      if (!firstErr) firstErr = "fee";
    }

    setTouchedFields({
      stageId: true,
      stageName: true,
      city: true,
      routeId: true,
      fee: true
    });
    setFormErrors(newErrors);

    if (firstErr) {
      const el = document.getElementById(`add-stage-${firstErr.toLowerCase()}`);
      if (el) el.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        stageId: addFormData.stageId.trim(),
        stageName: addFormData.stageName.trim(),
        city: addFormData.city.trim(),
        routeId: addFormData.routeId.trim(),
        arrivalTime: addFormData.arrivalTime || null,
        departureTime: addFormData.departureTime || null,
        fee: addFormData.fee !== "" ? Number(addFormData.fee) : 0,
        stageid: addFormData.stageId.trim(),
        stagename: addFormData.stageName.trim(),
        routeid: addFormData.routeId.trim(),
        arrivaltime: addFormData.arrivalTime || null,
        departuretime: addFormData.departureTime || null
      };

      const response = await axios.post(`${API_URL}/addStage`, payload);
      if (response.data && (response.data.success || response.status === 200 || response.status === 201)) {
        const savedStageId = addFormData.stageId.trim();
        handleCloseAddModal();
        await fetchStages();
        showFlashCard(`Stage #${savedStageId} created successfully!`, "success", "Stage Created");
      } else {
        showFlashCard(response.data?.message || "Failed to create stage record.", "danger", "Creation Failed");
      }
    } catch (err) {
      console.error("Error adding stage:", err);
      const msg = err.response?.data?.message || "Failed to create stage. Stage ID may already exist or route capacity reached.";
      showFlashCard(msg, "danger", "Creation Failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Field validation for Edit Stage
  const validateEditField = (name, value) => {
    let err = "";
    const str = String(value || "").trim();

    switch (name) {
      case "stageName":
        if (!str) err = "Stage name is required";
        break;
      case "city":
        if (!str) err = "Please select a city";
        break;
      case "routeId":
        if (!str) err = "Please select a route ID";
        break;
      case "fee":
        if (str && (isNaN(Number(str)) || Number(str) < 0)) {
          err = "Enter a valid positive fee amount";
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
      validateEditField(name, value);
    }
  };

  const handleEditBlur = (e) => {
    const { name, value } = e.target;
    setEditTouchedFields((prev) => ({ ...prev, [name]: true }));
    validateEditField(name, value);
  };

  const handleOpenEdit = (stage) => {
    setEditingStage(stage);
    setEditFormData({
      stageName: String(stage.stagename || ""),
      city: String(stage.city || ""),
      routeId: String(stage.routeid || ""),
      arrivalTime: formatTimeForInput(stage.arrivaltime),
      departureTime: formatTimeForInput(stage.departuretime || stage.departureTime),
      fee: stage.fee != null ? String(stage.fee) : ""
    });
    setEditFormErrors({});
    setEditTouchedFields({});
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingStage(null);
    setEditFormErrors({});
    setEditTouchedFields({});
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingStage) return;

    const requiredFields = ["stageName", "city", "routeId"];
    const newErrors = {};
    let firstErr = null;

    requiredFields.forEach((f) => {
      const val = editFormData[f];
      const str = String(val || "").trim();
      if (!str) {
        newErrors[f] = "This field is required";
        if (!firstErr) firstErr = f;
      }
    });

    if (editFormData.fee && (isNaN(Number(editFormData.fee)) || Number(editFormData.fee) < 0)) {
      newErrors.fee = "Enter a valid positive fee amount";
      if (!firstErr) firstErr = "fee";
    }

    setEditTouchedFields({
      stageName: true,
      city: true,
      routeId: true,
      fee: true
    });
    setEditFormErrors(newErrors);

    if (firstErr) {
      const el = document.getElementById(`edit-stage-${firstErr.toLowerCase()}`);
      if (el) el.focus();
      return;
    }

    setIsEditSubmitting(true);
    try {
      const payload = {
        stagename: editFormData.stageName.trim(),
        city: editFormData.city.trim(),
        routeid: editFormData.routeId.trim(),
        arrivaltime: editFormData.arrivalTime || null,
        departuretime: editFormData.departureTime || null,
        fee: editFormData.fee !== "" ? Number(editFormData.fee) : 0,
        stageName: editFormData.stageName.trim(),
        routeId: editFormData.routeId.trim(),
        arrivalTime: editFormData.arrivalTime || null,
        departureTime: editFormData.departureTime || null
      };

      const response = await axios.put(`${API_URL}/updateStage/${editingStage.stageid}`, payload);
      if (response.data && (response.data.success || response.status === 200)) {
        const updatedStageId = editingStage.stageid;
        handleCloseEditModal();
        await fetchStages();
        showFlashCard(`Stage #${updatedStageId} updated successfully!`, "success", "Stage Updated");
      } else {
        showFlashCard(response.data?.message || "Failed to update stage record.", "danger", "Update Failed");
      }
    } catch (err) {
      console.error("Error updating stage:", err);
      const msg = err.response?.data?.message || "Failed to update stage record. Verify route capacity.";
      showFlashCard(msg, "danger", "Update Failed");
    } finally {
      setIsEditSubmitting(false);
    }
  };

  // View Details Modal Handler
  const handleViewDetails = (stage) => {
    setSelectedStage(stage);
    setShowDetailsModal(true);
  };

  // Delete Confirmation Handlers
  const handleOpenDelete = (stage) => {
    setStageToDelete(stage);
  };

  const handleConfirmDelete = async () => {
    if (!stageToDelete) return;
    setIsDeleting(true);
    try {
      const response = await axios.delete(`${API_URL}/deleteStage/${stageToDelete.stageid}`);
      if (response.data && (response.data.success || response.status === 200)) {
        const deletedStageId = stageToDelete.stageid;
        setStageToDelete(null);
        await fetchStages();
        showFlashCard(`Stage #${deletedStageId} deleted successfully.`, "success", "Stage Deleted");
      } else {
        showFlashCard(response.data?.message || "Delete operation failed.", "danger", "Delete Failed");
      }
    } catch (err) {
      console.error("Error deleting stage:", err);
      const isConstraint =
        err.response?.status === 500 ||
        err.response?.data?.message?.includes("foreign key") ||
        err.response?.data?.message?.includes("constraint");
      const msg = isConstraint
        ? `Cannot delete Stage #${stageToDelete.stageid} because it is referenced by existing student, staff, or route allotments.`
        : err.response?.data?.message || "Failed to delete stage record.";
      showFlashCard(msg, "danger", "Delete Failed");
    } finally {
      setIsDeleting(false);
    }
  };

  // Excel Report Export Handler
  const handleExportReport = () => {
    if (!filteredStages.length) return;
    exportToExcel(
      filteredStages.map((s, idx) => ({
        "S.No": idx + 1,
        "Stage ID": s.stageid,
        "Stage Name": s.stagename,
        "City": s.city,
        "Route ID": s.routeid,
        "Arrival Time": formatTime(s.arrivaltime),
        "Departure Time": formatTime(s.departuretime || s.departureTime),
        "Fee": formatFee(s.fee)
      })),
      "Stage_Master_Report"
    );
  };

  return (
    <div className="view-stage-master-container">
      <div className="view-stage-box-wrapper">
        {/* ====================================================================
            1. BREADCRUMBS & PAGE HEADER (Clean design without subtitle)
            ==================================================================== */}
        <div className="vm-breadcrumb-nav">
          <span className="link" onClick={() => navigate("/home")}>Dashboard</span>
          <span className="sep">/</span>
          <span className="link" onClick={() => navigate("/home/viewroute")}>Route & Stage Management</span>
          <span className="sep">/</span>
          <span className="current">Stage Master</span>
        </div>

        <div className="vm-page-header">
          <div className="vm-header-left">
            <h2 className="vm-page-title">Stage Master</h2>
          </div>

          <div className="vm-header-actions">
            <button
              type="button"
              className="vm-btn-secondary vm-btn-report"
              onClick={handleExportReport}
              disabled={!filteredStages.length}
              title="Export filtered records to Excel"
            >
              <FileSpreadsheet size={16} />
              <span>Generate Report</span>
            </button>

            <button
              type="button"
              className="vm-btn-primary vm-btn-add"
              onClick={() => setShowAddModal(true)}
              title="Add a new transit stage stop"
            >
              <Plus size={16} strokeWidth={2.4} />
              <span>Add Stage</span>
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
          {/* City Dropdown */}
          <div className="fleet-filter-field">
            <label htmlFor="filter-stage-city">City</label>
            <select
              id="filter-stage-city"
              value={filterCity}
              onChange={(e) => setFilterCity(e.target.value)}
              className="fleet-filter-select"
              aria-label="Filter by city"
            >
              <option value="">All Cities</option>
              {availableCities.map((cityName) => (
                <option key={cityName} value={cityName}>
                  {cityName}
                </option>
              ))}
            </select>
          </div>

          {/* Route ID Dropdown */}
          <div className="fleet-filter-field">
            <label htmlFor="filter-stage-route-id">Route ID</label>
            <select
              id="filter-stage-route-id"
              value={filterRouteId}
              onChange={(e) => setFilterRouteId(e.target.value)}
              className="fleet-filter-select"
              aria-label="Filter by route ID"
            >
              <option value="">All Route IDs</option>
              {uniqueRouteIds.map((id) => (
                <option key={id} value={id}>
                  Route #{id}
                </option>
              ))}
            </select>
          </div>

          {/* Stage Name Dropdown */}
          <div className="fleet-filter-field">
            <label htmlFor="filter-stage-name">Stage Name</label>
            <select
              id="filter-stage-name"
              value={filterStageName}
              onChange={(e) => setFilterStageName(e.target.value)}
              className="fleet-filter-select"
              aria-label="Filter by stage name"
            >
              <option value="">All Stage Names</option>
              {uniqueStageNames.map((name) => (
                <option key={name} value={name}>
                  {name}
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
            3. STAGE RECORDS TABLE - Solid Navy Header, Zero Desktop Overflow
            ==================================================================== */}
        <div className="view-stage-table-container">
          <table className="view-stage-table">
            <thead>
              <tr>
                <th className="col-stage-sno">S.NO</th>
                <th className="col-stage-name">STAGE NAME</th>
                <th className="col-stage-city">CITY</th>
                <th className="col-stage-route">ROUTE ID</th>
                <th className="col-stage-arrival">ARRIVAL TIME</th>
                <th className="col-stage-departure">DEPARTURE TIME</th>
                <th className="col-stage-fee">FEE</th>
                <th className="col-stage-actions">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="stage-table-loading">
                    Loading stage records...
                  </td>
                </tr>
              ) : paginatedStages.length > 0 ? (
                paginatedStages.map((stage, index) => {
                  const sNo = startEntryIndex + index;
                  return (
                    <tr key={`${stage.stageid}-${index}`}>
                      <td className="col-sno-td">{sNo}</td>
                      <td>
                        <span className="stage-name-text">{stage.stagename}</span>
                      </td>
                      <td>
                        <span className="stage-city-badge">
                          <MapPin size={11} /> {stage.city}
                        </span>
                      </td>
                      <td>
                        <span className="stage-route-badge">
                          <RouteIcon size={11} /> Route #{stage.routeid}
                        </span>
                      </td>
                      <td>
                        <span className="stage-time-badge">
                          <Clock size={11} /> {formatTime(stage.arrivaltime)}
                        </span>
                      </td>
                      <td>
                        <span className="stage-time-badge">
                          <Clock size={11} /> {formatTime(stage.departuretime || stage.departureTime)}
                        </span>
                      </td>
                      <td>
                        <span className="stage-fee-badge">
                          <IndianRupee size={11} /> {formatFee(stage.fee)}
                        </span>
                      </td>
                      <td className="fleet-actions-cell">
                        <div className="fleet-action-buttons-group">
                          {/* View Action */}
                          <button
                            type="button"
                            className="fleet-action-btn fleet-action-view"
                            onClick={() => handleViewDetails(stage)}
                            title={`View details of Stage #${stage.stageid}`}
                          >
                            <Eye size={13} />
                            <span>View</span>
                          </button>

                          {/* Edit Action */}
                          <button
                            type="button"
                            className="fleet-action-btn fleet-action-edit"
                            onClick={() => handleOpenEdit(stage)}
                            title={`Edit Stage #${stage.stageid}`}
                          >
                            <Pencil size={13} />
                            <span>Edit</span>
                          </button>

                          {/* Delete Action */}
                          <button
                            type="button"
                            className="fleet-action-btn fleet-action-delete"
                            onClick={() => handleOpenDelete(stage)}
                            title={`Delete Stage #${stage.stageid}`}
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
                  <td colSpan="8" className="stage-table-empty">
                    {hasActiveFilters
                      ? "No stage records match the selected filters. Click 'Reset Filters' to view all records."
                      : "No stage records found in system."}
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
            Showing {startEntryIndex} to {endEntryIndex} of {filteredStages.length} entries
            {hasActiveFilters && ` (filtered from ${allStages.length} total entries)`}
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
          5. ADD STAGE MODAL (Dual Columns Layout matching other Master pages)
          ==================================================================== */}
      {showAddModal && (
        <div
          className="modal-overlay vm-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmitting) handleCloseAddModal();
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-stage-title"
        >
          <div className="vm-add-modal-box">
            {/* Modal Header */}
            <div className="vm-modal-header">
              <div className="vm-modal-title-group">
                <div className="vm-modal-icon-badge" aria-hidden="true">
                  <Milestone size={18} strokeWidth={2.2} />
                </div>
                <div>
                  <h3 id="add-stage-title" className="vm-modal-title">
                    Add New Stage
                  </h3>
                  <p className="vm-modal-subtitle">
                    Enter stage specifications, route allocation, and schedule.
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
                {/* Column Left: Stage Details */}
                <div className="vm-column-panel">
                  <div className="vm-panel-header">
                    <Milestone size={14} className="vm-panel-icon" />
                    <h4 className="vm-panel-title">Stage Details</h4>
                  </div>

                  <div className="vm-panel-fields">
                    {/* Stage ID */}
                    <div className="fleet-form-field">
                      <div className="fleet-label-row">
                        <label htmlFor="add-stage-stageid">
                          Stage ID <span className="req-star">*</span>
                        </label>
                      </div>
                      <input
                        type="text"
                        id="add-stage-stageid"
                        name="stageId"
                        ref={firstAddInputRef}
                        placeholder="e.g. S011"
                        value={addFormData.stageId}
                        onChange={handleAddChange}
                        onBlur={handleAddBlur}
                        className={formErrors.stageId && touchedFields.stageId ? "input-has-error" : ""}
                        disabled={isSubmitting}
                      />
                      {formErrors.stageId && touchedFields.stageId && (
                        <span className="vm-field-error-msg" role="alert">
                          <AlertCircle size={11} /> {formErrors.stageId}
                        </span>
                      )}
                    </div>

                    {/* Stage Name */}
                    <div className="fleet-form-field">
                      <div className="fleet-label-row">
                        <label htmlFor="add-stage-stagename">
                          Stage Name <span className="req-star">*</span>
                        </label>
                      </div>
                      <input
                        type="text"
                        id="add-stage-stagename"
                        name="stageName"
                        placeholder="e.g. Bus Stand Junction"
                        value={addFormData.stageName}
                        onChange={handleAddChange}
                        onBlur={handleAddBlur}
                        className={formErrors.stageName && touchedFields.stageName ? "input-has-error" : ""}
                        disabled={isSubmitting}
                      />
                      {formErrors.stageName && touchedFields.stageName && (
                        <span className="vm-field-error-msg" role="alert">
                          <AlertCircle size={11} /> {formErrors.stageName}
                        </span>
                      )}
                    </div>

                    {/* City Dropdown */}
                    <div className="fleet-form-field">
                      <div className="fleet-label-row">
                        <label htmlFor="add-stage-city">
                          City <span className="req-star">*</span>
                        </label>
                      </div>
                      <select
                        id="add-stage-city"
                        name="city"
                        value={addFormData.city}
                        onChange={handleAddChange}
                        onBlur={handleAddBlur}
                        className={formErrors.city && touchedFields.city ? "input-has-error" : ""}
                        disabled={isSubmitting}
                      >
                        <option value="">Select City</option>
                        {availableCities.map((cityName) => (
                          <option key={cityName} value={cityName}>
                            {cityName}
                          </option>
                        ))}
                      </select>
                      {formErrors.city && touchedFields.city && (
                        <span className="vm-field-error-msg" role="alert">
                          <AlertCircle size={11} /> {formErrors.city}
                        </span>
                      )}
                    </div>

                    {/* Route ID Dropdown */}
                    <div className="fleet-form-field">
                      <div className="fleet-label-row">
                        <label htmlFor="add-stage-routeid">
                          Route ID <span className="req-star">*</span>
                        </label>
                      </div>
                      <select
                        id="add-stage-routeid"
                        name="routeId"
                        value={addFormData.routeId}
                        onChange={handleAddChange}
                        onBlur={handleAddBlur}
                        className={formErrors.routeId && touchedFields.routeId ? "input-has-error" : ""}
                        disabled={isSubmitting}
                      >
                        <option value="">Select Route ID</option>
                        {addModalRouteOptions.map((r) => (
                          <option key={r.routeid} value={r.routeid}>
                            Route #{r.routeid} - {r.routename} ({r.city})
                          </option>
                        ))}
                      </select>
                      {formErrors.routeId && touchedFields.routeId && (
                        <span className="vm-field-error-msg" role="alert">
                          <AlertCircle size={11} /> {formErrors.routeId}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="vm-dual-columns-divider" aria-hidden="true" />

                {/* Column Right: Schedule & Fee */}
                <div className="vm-column-panel">
                  <div className="vm-panel-header">
                    <Clock size={14} className="vm-panel-icon" />
                    <h4 className="vm-panel-title">Schedule & Fee</h4>
                  </div>

                  <div className="vm-panel-fields">
                    {/* Arrival Time */}
                    <div className="fleet-form-field">
                      <div className="fleet-label-row">
                        <label htmlFor="add-stage-arrivaltime">Arrival Time</label>
                      </div>
                      <input
                        type="time"
                        id="add-stage-arrivaltime"
                        name="arrivalTime"
                        value={addFormData.arrivalTime}
                        onChange={handleAddChange}
                        disabled={isSubmitting}
                      />
                    </div>

                    {/* Departure Time */}
                    <div className="fleet-form-field">
                      <div className="fleet-label-row">
                        <label htmlFor="add-stage-departuretime">Departure Time</label>
                      </div>
                      <input
                        type="time"
                        id="add-stage-departuretime"
                        name="departureTime"
                        value={addFormData.departureTime}
                        onChange={handleAddChange}
                        disabled={isSubmitting}
                      />
                    </div>

                    {/* Fee */}
                    <div className="fleet-form-field">
                      <div className="fleet-label-row">
                        <label htmlFor="add-stage-fee">Stage Fee (₹)</label>
                      </div>
                      <input
                        type="number"
                        id="add-stage-fee"
                        name="fee"
                        step="0.01"
                        min="0"
                        placeholder="e.g. 2500"
                        value={addFormData.fee}
                        onChange={handleAddChange}
                        onBlur={handleAddBlur}
                        className={formErrors.fee && touchedFields.fee ? "input-has-error" : ""}
                        disabled={isSubmitting}
                      />
                      {formErrors.fee && touchedFields.fee && (
                        <span className="vm-field-error-msg" role="alert">
                          <AlertCircle size={11} /> {formErrors.fee}
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
                      <span>Save Stage</span>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          6. EDIT STAGE MODAL (Identical UI Layout matching Add Stage)
          ==================================================================== */}
      {showEditModal && editingStage && (
        <div
          className="modal-overlay vm-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isEditSubmitting) handleCloseEditModal();
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-stage-title"
        >
          <div className="vm-add-modal-box">
            {/* Modal Header */}
            <div className="vm-modal-header">
              <div className="vm-modal-title-group">
                <div className="vm-modal-icon-badge" aria-hidden="true">
                  <Pencil size={18} strokeWidth={2.2} />
                </div>
                <div>
                  <h3 id="edit-stage-title" className="vm-modal-title">
                    Edit Stage #{editingStage.stageid}
                  </h3>
                  <p className="vm-modal-subtitle">
                    Update stage specifications, route allocation, and schedule.
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
                {/* Column Left: Stage Details */}
                <div className="vm-column-panel">
                  <div className="vm-panel-header">
                    <Milestone size={14} className="vm-panel-icon" />
                    <h4 className="vm-panel-title">Stage Details</h4>
                  </div>

                  <div className="vm-panel-fields">
                    {/* Stage Name */}
                    <div className="fleet-form-field">
                      <div className="fleet-label-row">
                        <label htmlFor="edit-stage-stagename">
                          Stage Name <span className="req-star">*</span>
                        </label>
                      </div>
                      <input
                        type="text"
                        id="edit-stage-stagename"
                        name="stageName"
                        value={editFormData.stageName}
                        onChange={handleEditChange}
                        onBlur={handleEditBlur}
                        className={editFormErrors.stageName && editTouchedFields.stageName ? "input-has-error" : ""}
                        disabled={isEditSubmitting}
                      />
                      {editFormErrors.stageName && editTouchedFields.stageName && (
                        <span className="vm-field-error-msg" role="alert">
                          <AlertCircle size={11} /> {editFormErrors.stageName}
                        </span>
                      )}
                    </div>

                    {/* City Dropdown */}
                    <div className="fleet-form-field">
                      <div className="fleet-label-row">
                        <label htmlFor="edit-stage-city">
                          City <span className="req-star">*</span>
                        </label>
                      </div>
                      <select
                        id="edit-stage-city"
                        name="city"
                        value={editFormData.city}
                        onChange={handleEditChange}
                        onBlur={handleEditBlur}
                        className={editFormErrors.city && editTouchedFields.city ? "input-has-error" : ""}
                        disabled={isEditSubmitting}
                      >
                        <option value="">Select City</option>
                        {availableCities.map((cityName) => (
                          <option key={cityName} value={cityName}>
                            {cityName}
                          </option>
                        ))}
                      </select>
                      {editFormErrors.city && editTouchedFields.city && (
                        <span className="vm-field-error-msg" role="alert">
                          <AlertCircle size={11} /> {editFormErrors.city}
                        </span>
                      )}
                    </div>

                    {/* Route ID Dropdown */}
                    <div className="fleet-form-field">
                      <div className="fleet-label-row">
                        <label htmlFor="edit-stage-routeid">
                          Route ID <span className="req-star">*</span>
                        </label>
                      </div>
                      <select
                        id="edit-stage-routeid"
                        name="routeId"
                        value={editFormData.routeId}
                        onChange={handleEditChange}
                        onBlur={handleEditBlur}
                        className={editFormErrors.routeId && editTouchedFields.routeId ? "input-has-error" : ""}
                        disabled={isEditSubmitting}
                      >
                        <option value="">Select Route ID</option>
                        {editModalRouteOptions.map((r) => (
                          <option key={r.routeid} value={r.routeid}>
                            Route #{r.routeid} - {r.routename} ({r.city})
                          </option>
                        ))}
                      </select>
                      {editFormErrors.routeId && editTouchedFields.routeId && (
                        <span className="vm-field-error-msg" role="alert">
                          <AlertCircle size={11} /> {editFormErrors.routeId}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="vm-dual-columns-divider" aria-hidden="true" />

                {/* Column Right: Schedule & Fee */}
                <div className="vm-column-panel">
                  <div className="vm-panel-header">
                    <Clock size={14} className="vm-panel-icon" />
                    <h4 className="vm-panel-title">Schedule & Fee</h4>
                  </div>

                  <div className="vm-panel-fields">
                    {/* Arrival Time */}
                    <div className="fleet-form-field">
                      <div className="fleet-label-row">
                        <label htmlFor="edit-stage-arrivaltime">Arrival Time</label>
                      </div>
                      <input
                        type="time"
                        id="edit-stage-arrivaltime"
                        name="arrivalTime"
                        value={editFormData.arrivalTime}
                        onChange={handleEditChange}
                        disabled={isEditSubmitting}
                      />
                    </div>

                    {/* Departure Time */}
                    <div className="fleet-form-field">
                      <div className="fleet-label-row">
                        <label htmlFor="edit-stage-departuretime">Departure Time</label>
                      </div>
                      <input
                        type="time"
                        id="edit-stage-departuretime"
                        name="departureTime"
                        value={editFormData.departureTime}
                        onChange={handleEditChange}
                        disabled={isEditSubmitting}
                      />
                    </div>

                    {/* Fee */}
                    <div className="fleet-form-field">
                      <div className="fleet-label-row">
                        <label htmlFor="edit-stage-fee">Stage Fee (₹)</label>
                      </div>
                      <input
                        type="number"
                        id="edit-stage-fee"
                        name="fee"
                        step="0.01"
                        min="0"
                        value={editFormData.fee}
                        onChange={handleEditChange}
                        onBlur={handleEditBlur}
                        className={editFormErrors.fee && editTouchedFields.fee ? "input-has-error" : ""}
                        disabled={isEditSubmitting}
                      />
                      {editFormErrors.fee && editTouchedFields.fee && (
                        <span className="vm-field-error-msg" role="alert">
                          <AlertCircle size={11} /> {editFormErrors.fee}
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
                      <span>Update Stage</span>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          7. VIEW STAGE DETAILS MODAL (Read-Only)
          ==================================================================== */}
      {showDetailsModal && selectedStage && (
        <div
          className="modal-overlay vm-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDetailsModal(false);
              setSelectedStage(null);
            }
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="view-stage-details-title"
        >
          <div className="fleet-modal-box">
            <div className="fleet-modal-header">
              <div className="vm-modal-title-group">
                <div className="vm-modal-icon-badge" aria-hidden="true">
                  <Milestone size={18} strokeWidth={2.2} />
                </div>
                <div>
                  <h3 id="view-stage-details-title" className="fleet-modal-title">
                    Stage Details
                  </h3>
                  <p className="fleet-modal-subtitle">
                    Specifications for Stage #{selectedStage.stageid}
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="fleet-modal-close"
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedStage(null);
                }}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className="fleet-details-grid">
              <div className="fleet-detail-item">
                <span className="fleet-detail-label">Stage ID</span>
                <span className="fleet-detail-value stage-code-badge">#{selectedStage.stageid}</span>
              </div>

              <div className="fleet-detail-item">
                <span className="fleet-detail-label">Stage Name</span>
                <span className="fleet-detail-value" style={{ fontWeight: 600 }}>{selectedStage.stagename}</span>
              </div>

              <div className="fleet-detail-item">
                <span className="fleet-detail-label">Designated City</span>
                <span className="fleet-detail-value">
                  <span className="stage-city-badge">
                    <MapPin size={11} /> {selectedStage.city}
                  </span>
                </span>
              </div>

              <div className="fleet-detail-item">
                <span className="fleet-detail-label">Assigned Route</span>
                <span className="fleet-detail-value">
                  <span className="stage-route-badge">
                    <RouteIcon size={11} /> Route #{selectedStage.routeid}
                  </span>
                </span>
              </div>

              <div className="fleet-detail-item">
                <span className="fleet-detail-label">Arrival Time</span>
                <span className="fleet-detail-value">
                  <span className="stage-time-badge">
                    <Clock size={11} /> {formatTime(selectedStage.arrivaltime)}
                  </span>
                </span>
              </div>

              <div className="fleet-detail-item">
                <span className="fleet-detail-label">Departure Time</span>
                <span className="fleet-detail-value">
                  <span className="stage-time-badge">
                    <Clock size={11} /> {formatTime(selectedStage.departuretime || selectedStage.departureTime)}
                  </span>
                </span>
              </div>

              <div className="fleet-detail-item">
                <span className="fleet-detail-label">Fee Amount</span>
                <span className="fleet-detail-value">
                  <span className="stage-fee-badge">
                    <IndianRupee size={11} /> {formatFee(selectedStage.fee)}
                  </span>
                </span>
              </div>
            </div>

            <div className="modal-actions" style={{ justifyContent: "flex-end", marginTop: "18px" }}>
              <button
                type="button"
                className="vm-modal-cancel-btn"
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedStage(null);
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
      {stageToDelete && (
        <div
          className="modal-overlay vm-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeleting) setStageToDelete(null);
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-stage-dialog-title"
        >
          <div className="vm-delete-modal-box">
            <div className="vm-delete-modal-header">
              <div className="vm-delete-icon-badge" aria-hidden="true">
                <Trash2 size={22} strokeWidth={2.2} />
              </div>

              <div className="vm-delete-modal-text">
                <h3 id="delete-stage-dialog-title" className="vm-delete-modal-title">
                  Delete Stage
                </h3>
                <p className="vm-delete-modal-desc">
                  Are you sure you want to delete Stage <strong>"{stageToDelete.stagename}"</strong> (ID #{stageToDelete.stageid}) on Route <strong>#{stageToDelete.routeid}</strong>? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="vm-modal-footer">
              <span className="vm-modal-footer-hint">Permanent deletion</span>
              <div className="vm-modal-footer-actions">
                <button
                  type="button"
                  className="vm-modal-cancel-btn"
                  onClick={() => setStageToDelete(null)}
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
                    <span>Delete Stage</span>
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

export default ViewStage;
