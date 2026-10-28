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
  Route as RouteIcon,
  MapPin,
  Milestone,
  FileText,
  Loader2
} from "lucide-react";
import { API_URL } from "../../config";
import "../../styles/ViewVehicle.css";
import "../../styles/ViewRoute.css";
import { exportToExcel, exportRouteToPDF } from "../ReportGenerator";

const DEFAULT_CITIES = [
  "Kovilpatti",
  "Thoothukudi",
  "Tirunelveli",
  "Sattur",
  "Virudhunagar",
  "Vilathikulam",
  "Sivakasi",
  "Kayathar",
  "Sankarakovil",
  "Kalugumali"
];

const ViewRoute = () => {
  const navigate = useNavigate();

  // Master Route state
  const [allRoutes, setAllRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Live filter states (No search button)
  const [filterCity, setFilterCity] = useState("");
  const [filterRouteId, setFilterRouteId] = useState("");
  const [filterRouteName, setFilterRouteName] = useState("");

  // Pagination state (5 records per page matching other Master pages)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // 3-Second Auto-Dismissing Flash Card Notification
  const [flashCard, setFlashCard] = useState(null);
  const flashTimerRef = useRef(null);

  // Add Route modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});
  const firstAddInputRef = useRef(null);

  const [addFormData, setAddFormData] = useState({
    routeId: "",
    routeName: "",
    city: "",
    totalStages: "",
    totalDistance: ""
  });

  // Edit Route modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRoute, setEditingRoute] = useState(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [editFormErrors, setEditFormErrors] = useState({});
  const [editTouchedFields, setEditTouchedFields] = useState({});

  const [editFormData, setEditFormData] = useState({
    routeId: "",
    routeName: "",
    city: "",
    totalStages: "",
    totalDistance: ""
  });

  // View Details modal state
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);

  // Delete confirmation modal state
  const [routeToDelete, setRouteToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // PDF generation state for active row
  const [generatingPdfId, setGeneratingPdfId] = useState(null);

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

  // Fetch Route records from backend API
  const fetchRoutes = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/getRoute`);
      const data = Array.isArray(response.data) ? response.data : [];
      setAllRoutes(data);
      setError("");
    } catch (err) {
      console.error("Error fetching routes:", err);
      setError("Failed to fetch route records. Please verify database connectivity.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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

  // Keyboard navigation: Escape key closes any active modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (showAddModal && !isSubmitting) {
          handleCloseAddModal();
        } else if (showEditModal && !isEditSubmitting) {
          handleCloseEditModal();
        } else if (routeToDelete && !isDeleting) {
          setRouteToDelete(null);
        } else if (showDetailsModal) {
          setShowDetailsModal(false);
          setSelectedRoute(null);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showAddModal, isSubmitting, showEditModal, isEditSubmitting, routeToDelete, isDeleting, showDetailsModal]);

  // Combined city list (Default cities + any unique cities in DB)
  const availableCities = useMemo(() => {
    const fromRoutes = allRoutes.map((r) => r.city?.trim()).filter(Boolean);
    const set = new Set([...DEFAULT_CITIES, ...fromRoutes]);
    return Array.from(set).sort();
  }, [allRoutes]);

  // Unique filter dropdown options extracted from master records
  const uniqueRouteIds = useMemo(() => {
    const ids = allRoutes.map((r) => String(r.routeid || "").trim()).filter(Boolean);
    return [...new Set(ids)].sort();
  }, [allRoutes]);

  const uniqueRouteNames = useMemo(() => {
    const names = allRoutes.map((r) => String(r.routename || "").trim()).filter(Boolean);
    return [...new Set(names)].sort();
  }, [allRoutes]);

  // Live filter computation: applies immediately on dropdown selection with AND logic
  const filteredRoutes = useMemo(() => {
    return allRoutes.filter((route) => {
      // 1. City filter
      if (filterCity) {
        if (String(route.city || "").trim().toLowerCase() !== filterCity.trim().toLowerCase()) {
          return false;
        }
      }

      // 2. Route ID filter
      if (filterRouteId) {
        if (String(route.routeid || "").trim().toLowerCase() !== filterRouteId.trim().toLowerCase()) {
          return false;
        }
      }

      // 3. Route Name filter
      if (filterRouteName) {
        if (String(route.routename || "").trim().toLowerCase() !== filterRouteName.trim().toLowerCase()) {
          return false;
        }
      }

      return true;
    });
  }, [allRoutes, filterCity, filterRouteId, filterRouteName]);

  const hasActiveFilters = Boolean(filterCity || filterRouteId || filterRouteName);

  const handleResetFilters = () => {
    setFilterCity("");
    setFilterRouteId("");
    setFilterRouteName("");
  };

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterCity, filterRouteId, filterRouteName]);

  // Pagination calculation (5 records per page)
  const totalPages = Math.max(1, Math.ceil(filteredRoutes.length / itemsPerPage));
  const paginatedRoutes = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRoutes.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRoutes, currentPage, itemsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const startEntryIndex = filteredRoutes.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endEntryIndex = Math.min(currentPage * itemsPerPage, filteredRoutes.length);

  // Field validation for Add Route
  const validateAddField = (name, value) => {
    let err = "";
    const str = String(value || "").trim();

    switch (name) {
      case "routeId":
        if (!str) {
          err = "Route ID is required";
        } else if (allRoutes.some((r) => String(r.routeid || "").toLowerCase() === str.toLowerCase())) {
          err = "Route ID already exists";
        }
        break;
      case "routeName":
        if (!str) err = "Route name is required";
        break;
      case "city":
        if (!str) err = "Please select a city";
        break;
      case "totalStages":
        if (!str) {
          err = "Total stages is required";
        } else if (isNaN(Number(str)) || Number(str) <= 0 || !Number.isInteger(Number(str))) {
          err = "Enter a valid positive whole number";
        }
        break;
      case "totalDistance":
        if (!str) {
          err = "Total distance is required";
        } else if (isNaN(Number(str)) || Number(str) <= 0) {
          err = "Enter a valid distance greater than 0";
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
      routeId: "",
      routeName: "",
      city: "",
      totalStages: "",
      totalDistance: ""
    });
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();

    const fields = ["routeId", "routeName", "city", "totalStages", "totalDistance"];
    const newErrors = {};
    let firstErr = null;

    fields.forEach((f) => {
      const val = addFormData[f];
      const str = String(val || "").trim();
      if (!str) {
        newErrors[f] = "This field is required";
        if (!firstErr) firstErr = f;
      } else if (f === "routeId" && allRoutes.some((r) => String(r.routeid || "").toLowerCase() === str.toLowerCase())) {
        newErrors[f] = "Route ID already exists";
        if (!firstErr) firstErr = f;
      } else if (f === "totalStages" && (isNaN(Number(str)) || Number(str) <= 0 || !Number.isInteger(Number(str)))) {
        newErrors[f] = "Must be a positive integer";
        if (!firstErr) firstErr = f;
      } else if (f === "totalDistance" && (isNaN(Number(str)) || Number(str) <= 0)) {
        newErrors[f] = "Must be greater than 0";
        if (!firstErr) firstErr = f;
      }
    });

    setTouchedFields(fields.reduce((acc, f) => ({ ...acc, [f]: true }), {}));
    setFormErrors(newErrors);

    if (firstErr) {
      const el = document.getElementById(`add-route-${firstErr.toLowerCase()}`);
      if (el) el.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        routeId: addFormData.routeId.trim(),
        routeName: addFormData.routeName.trim(),
        city: addFormData.city.trim(),
        totalStages: Number(addFormData.totalStages),
        totalDistance: Number(addFormData.totalDistance),
        routeid: addFormData.routeId.trim(),
        routename: addFormData.routeName.trim(),
        totalstages: Number(addFormData.totalStages),
        totaldistance: Number(addFormData.totalDistance)
      };

      const response = await axios.post(`${API_URL}/addRoute`, payload);
      if (response.data && (response.data.success || response.status === 200 || response.status === 201)) {
        const savedRouteId = addFormData.routeId.trim();
        handleCloseAddModal();
        await fetchRoutes();
        showFlashCard(`Route #${savedRouteId} created successfully!`, "success", "Route Created");
      } else {
        showFlashCard(response.data?.message || "Failed to create route record.", "danger", "Creation Failed");
      }
    } catch (err) {
      console.error("Error adding route:", err);
      const msg = err.response?.data?.message || "Failed to create route. Route ID may already exist.";
      showFlashCard(msg, "danger", "Creation Failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Field validation for Edit Route
  const validateEditField = (name, value) => {
    let err = "";
    const str = String(value || "").trim();

    switch (name) {
      case "routeId":
        if (!str) {
          err = "Route ID is required";
        } else if (
          editingRoute &&
          str.toLowerCase() !== String(editingRoute.routeid || "").toLowerCase() &&
          allRoutes.some((r) => String(r.routeid || "").toLowerCase() === str.toLowerCase())
        ) {
          err = "Route ID already exists";
        }
        break;
      case "routeName":
        if (!str) err = "Route name is required";
        break;
      case "city":
        if (!str) err = "Please select a city";
        break;
      case "totalStages":
        if (!str) {
          err = "Total stages is required";
        } else if (isNaN(Number(str)) || Number(str) <= 0 || !Number.isInteger(Number(str))) {
          err = "Enter a valid positive whole number";
        }
        break;
      case "totalDistance":
        if (!str) {
          err = "Total distance is required";
        } else if (isNaN(Number(str)) || Number(str) <= 0) {
          err = "Enter a valid distance greater than 0";
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

  const handleOpenEdit = (route) => {
    setEditingRoute(route);
    setEditFormData({
      routeId: String(route.routeid || ""),
      routeName: String(route.routename || ""),
      city: String(route.city || ""),
      totalStages: String(route.totalstages ?? ""),
      totalDistance: String(route.totaldistance ?? "")
    });
    setEditFormErrors({});
    setEditTouchedFields({});
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingRoute(null);
    setEditFormErrors({});
    setEditTouchedFields({});
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingRoute) return;

    const fields = ["routeId", "routeName", "city", "totalStages", "totalDistance"];
    const newErrors = {};
    let firstErr = null;

    fields.forEach((f) => {
      const val = editFormData[f];
      const str = String(val || "").trim();
      if (!str) {
        newErrors[f] = "This field is required";
        if (!firstErr) firstErr = f;
      } else if (
        f === "routeId" &&
        str.toLowerCase() !== String(editingRoute.routeid || "").toLowerCase() &&
        allRoutes.some((r) => String(r.routeid || "").toLowerCase() === str.toLowerCase())
      ) {
        newErrors[f] = "Route ID already exists";
        if (!firstErr) firstErr = f;
      } else if (f === "totalStages" && (isNaN(Number(str)) || Number(str) <= 0 || !Number.isInteger(Number(str)))) {
        newErrors[f] = "Must be a positive integer";
        if (!firstErr) firstErr = f;
      } else if (f === "totalDistance" && (isNaN(Number(str)) || Number(str) <= 0)) {
        newErrors[f] = "Must be greater than 0";
        if (!firstErr) firstErr = f;
      }
    });

    setEditTouchedFields(fields.reduce((acc, f) => ({ ...acc, [f]: true }), {}));
    setEditFormErrors(newErrors);

    if (firstErr) {
      const el = document.getElementById(`edit-route-${firstErr.toLowerCase()}`);
      if (el) el.focus();
      return;
    }

    setIsEditSubmitting(true);
    try {
      const payload = {
        routeid: editFormData.routeId.trim(),
        routename: editFormData.routeName.trim(),
        city: editFormData.city.trim(),
        totalstages: Number(editFormData.totalStages),
        totaldistance: Number(editFormData.totalDistance),
        routeId: editFormData.routeId.trim(),
        routeName: editFormData.routeName.trim(),
        totalStages: Number(editFormData.totalStages),
        totalDistance: Number(editFormData.totalDistance)
      };

      const response = await axios.put(`${API_URL}/updateRoute/${editingRoute.routeid}`, payload);
      if (response.data && (response.data.success || response.status === 200)) {
        const updatedRouteId = editFormData.routeId.trim();
        handleCloseEditModal();
        await fetchRoutes();
        showFlashCard(`Route #${updatedRouteId} updated successfully!`, "success", "Route Updated");
      } else {
        showFlashCard(response.data?.message || "Failed to update route record.", "danger", "Update Failed");
      }
    } catch (err) {
      console.error("Error updating route:", err);
      const msg = err.response?.data?.message || "Failed to update route record.";
      showFlashCard(msg, "danger", "Update Failed");
    } finally {
      setIsEditSubmitting(false);
    }
  };

  // View Details Modal Handler
  const handleViewDetails = (route) => {
    setSelectedRoute(route);
    setShowDetailsModal(true);
  };

  // Delete Confirmation Handlers
  const handleOpenDelete = (route) => {
    setRouteToDelete(route);
  };

  const handleConfirmDelete = async () => {
    if (!routeToDelete) return;
    setIsDeleting(true);
    try {
      const response = await axios.delete(`${API_URL}/deleteRoute/${routeToDelete.routeid}`);
      if (response.data && (response.data.success || response.status === 200)) {
        const deletedRouteId = routeToDelete.routeid;
        setRouteToDelete(null);
        await fetchRoutes();
        showFlashCard(`Route #${deletedRouteId} deleted successfully.`, "success", "Route Deleted");
      } else {
        showFlashCard(response.data?.message || "Delete operation failed.", "danger", "Delete Failed");
      }
    } catch (err) {
      console.error("Error deleting route:", err);
      // Detailed feedback for relationship constraints (stages, vehicles, drivers)
      const isConstraint =
        err.response?.status === 500 ||
        err.response?.data?.message?.includes("foreign key") ||
        err.response?.data?.message?.includes("constraint");
      const msg = isConstraint
        ? `Cannot delete Route #${routeToDelete.routeid} because it is referenced by existing stages or vehicles. Please reassign or remove associated stages and vehicles first.`
        : err.response?.data?.message || "Failed to delete route record.";
      showFlashCard(msg, "danger", "Delete Failed");
    } finally {
      setIsDeleting(false);
    }
  };

  // PDF Generation Handler for Individual Route
  const handleGeneratePDF = async (route) => {
    setGeneratingPdfId(route.routeid);
    try {
      const response = await axios.get(`${API_URL}/getRouteDetails/${route.routeid}`);
      if (response.data) {
        exportRouteToPDF(response.data);
        showFlashCard(`PDF generated for Route #${route.routeid} successfully!`, "success", "PDF Generated");
      } else {
        showFlashCard("No detailed route specifications found to generate PDF.", "danger", "PDF Error");
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      showFlashCard("Failed to generate PDF. Please try again.", "danger", "PDF Error");
    } finally {
      setGeneratingPdfId(null);
    }
  };

  // Excel Report Export Handler
  const handleExportReport = () => {
    if (!filteredRoutes.length) return;
    exportToExcel(
      filteredRoutes.map((r, idx) => ({
        "S.No": idx + 1,
        "Route ID": r.routeid,
        "Route Name": r.routename,
        "City": r.city,
        "Total Stages": r.totalstages,
        "Total Distance (km)": r.totaldistance
      })),
      "Route_Master_Report"
    );
  };

  return (
    <div className="view-route-master-container">
      <div className="view-route-box-wrapper">
        {/* ====================================================================
            1. BREADCRUMBS & PAGE HEADER (Clean design without subtitle)
            ==================================================================== */}
        <div className="vm-breadcrumb-nav">
          <span className="link" onClick={() => navigate("/home")}>Dashboard</span>
          <span className="sep">/</span>
          <span className="link" onClick={() => navigate("/home/viewroute")}>Route & Stage Management</span>
          <span className="sep">/</span>
          <span className="current">Route Master</span>
        </div>

        <div className="vm-page-header">
          <div className="vm-header-left">
            <h2 className="vm-page-title">Route Master</h2>
          </div>

          <div className="vm-header-actions">
            <button
              type="button"
              className="vm-btn-secondary vm-btn-report"
              onClick={handleExportReport}
              disabled={!filteredRoutes.length}
              title="Export filtered records to Excel"
            >
              <FileSpreadsheet size={16} />
              <span>Generate Report</span>
            </button>

            <button
              type="button"
              className="vm-btn-primary vm-btn-add"
              onClick={() => setShowAddModal(true)}
              title="Add a new transit route"
            >
              <Plus size={16} strokeWidth={2.4} />
              <span>Add Route</span>
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
            <label htmlFor="filter-route-city">City</label>
            <select
              id="filter-route-city"
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
            <label htmlFor="filter-route-id">Route ID</label>
            <select
              id="filter-route-id"
              value={filterRouteId}
              onChange={(e) => setFilterRouteId(e.target.value)}
              className="fleet-filter-select"
              aria-label="Filter by route ID"
            >
              <option value="">All Route IDs</option>
              {uniqueRouteIds.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </div>

          {/* Route Name Dropdown */}
          <div className="fleet-filter-field">
            <label htmlFor="filter-route-name">Route Name</label>
            <select
              id="filter-route-name"
              value={filterRouteName}
              onChange={(e) => setFilterRouteName(e.target.value)}
              className="fleet-filter-select"
              aria-label="Filter by route name"
            >
              <option value="">All Route Names</option>
              {uniqueRouteNames.map((name) => (
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
            3. ROUTE RECORDS TABLE - Solid Navy Header, Zero Desktop Overflow
            ==================================================================== */}
        <div className="view-route-table-container">
          <table className="view-route-table">
            <thead>
              <tr>
                <th className="col-route-id">ROUTE ID</th>
                <th className="col-route-name">ROUTE NAME</th>
                <th className="col-route-city">CITY</th>
                <th className="col-route-stages">TOTAL STAGES</th>
                <th className="col-route-distance">TOTAL DISTANCE (KM)</th>
                <th className="col-route-actions">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="route-table-loading">
                    Loading route records...
                  </td>
                </tr>
              ) : paginatedRoutes.length > 0 ? (
                paginatedRoutes.map((route, index) => {
                  return (
                    <tr key={`${route.routeid}-${index}`}>
                      <td>
                        <span className="route-code-badge">{route.routeid}</span>
                      </td>
                      <td>
                        <span className="route-name-text">{route.routename}</span>
                      </td>
                      <td>
                        <span className="route-city-badge">
                          <MapPin size={11} /> {route.city}
                        </span>
                      </td>
                      <td>
                        <span className="route-stat-badge">
                          {route.totalstages} Stage{route.totalstages !== 1 ? "s" : ""}
                        </span>
                      </td>
                      <td>
                        <span className="route-distance-badge">
                          <Milestone size={11} /> {route.totaldistance} km
                        </span>
                      </td>
                      <td className="fleet-actions-cell">
                        <div className="fleet-action-buttons-group">
                          {/* View Action */}
                          <button
                            type="button"
                            className="fleet-action-btn fleet-action-view"
                            onClick={() => handleViewDetails(route)}
                            title={`View details of Route #${route.routeid}`}
                          >
                            <Eye size={13} />
                            <span>View</span>
                          </button>

                          {/* Edit Action */}
                          <button
                            type="button"
                            className="fleet-action-btn fleet-action-edit"
                            onClick={() => handleOpenEdit(route)}
                            title={`Edit Route #${route.routeid}`}
                          >
                            <Pencil size={13} />
                            <span>Edit</span>
                          </button>

                          {/* Delete Action */}
                          <button
                            type="button"
                            className="fleet-action-btn fleet-action-delete"
                            onClick={() => handleOpenDelete(route)}
                            title={`Delete Route #${route.routeid}`}
                          >
                            <Trash2 size={13} />
                            <span>Delete</span>
                          </button>

                          {/* Generate PDF Action */}
                          <button
                            type="button"
                            className="fleet-action-btn fleet-action-pdf"
                            onClick={() => handleGeneratePDF(route)}
                            disabled={generatingPdfId === route.routeid}
                            title={`Generate PDF report for Route #${route.routeid}`}
                          >
                            {generatingPdfId === route.routeid ? (
                              <Loader2 size={13} className="vm-spinner" />
                            ) : (
                              <FileText size={13} />
                            )}
                            <span>PDF</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="route-table-empty">
                    {hasActiveFilters
                      ? "No route records match the selected filters. Click 'Reset Filters' to view all records."
                      : "No route records found in system."}
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
            Showing {startEntryIndex} to {endEntryIndex} of {filteredRoutes.length} entries
            {hasActiveFilters && ` (filtered from ${allRoutes.length} total entries)`}
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
          5. ADD ROUTE MODAL (Dual Columns Layout matching Add Vehicle/Permit/Insurance/FC)
          ==================================================================== */}
      {showAddModal && (
        <div
          className="modal-overlay vm-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmitting) handleCloseAddModal();
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-route-title"
        >
          <div className="vm-add-modal-box">
            {/* Modal Header */}
            <div className="vm-modal-header">
              <div className="vm-modal-title-group">
                <div className="vm-modal-icon-badge" aria-hidden="true">
                  <RouteIcon size={18} strokeWidth={2.2} />
                </div>
                <div>
                  <h3 id="add-route-title" className="vm-modal-title">
                    Add New Route
                  </h3>
                  <p className="vm-modal-subtitle">
                    Enter route specifications, designated city, and stage details.
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
                {/* Column Left: Route Identification */}
                <div className="vm-column-panel">
                  <div className="vm-panel-header">
                    <RouteIcon size={14} className="vm-panel-icon" />
                    <h4 className="vm-panel-title">Route Identification</h4>
                  </div>

                  <div className="vm-panel-fields">
                    {/* Route ID */}
                    <div className="fleet-form-field">
                      <div className="fleet-label-row">
                        <label htmlFor="add-route-routeid">
                          Route ID <span className="req-star">*</span>
                        </label>
                      </div>
                      <input
                        type="text"
                        id="add-route-routeid"
                        name="routeId"
                        ref={firstAddInputRef}
                        placeholder="e.g. R021"
                        value={addFormData.routeId}
                        onChange={handleAddChange}
                        onBlur={handleAddBlur}
                        className={formErrors.routeId && touchedFields.routeId ? "input-has-error" : ""}
                        disabled={isSubmitting}
                      />
                      {formErrors.routeId && touchedFields.routeId && (
                        <span className="vm-field-error-msg" role="alert">
                          <AlertCircle size={11} /> {formErrors.routeId}
                        </span>
                      )}
                    </div>

                    {/* Route Name */}
                    <div className="fleet-form-field">
                      <div className="fleet-label-row">
                        <label htmlFor="add-route-routename">
                          Route Name <span className="req-star">*</span>
                        </label>
                      </div>
                      <input
                        type="text"
                        id="add-route-routename"
                        name="routeName"
                        placeholder="e.g. Central Bypass Route"
                        value={addFormData.routeName}
                        onChange={handleAddChange}
                        onBlur={handleAddBlur}
                        className={formErrors.routeName && touchedFields.routeName ? "input-has-error" : ""}
                        disabled={isSubmitting}
                      />
                      {formErrors.routeName && touchedFields.routeName && (
                        <span className="vm-field-error-msg" role="alert">
                          <AlertCircle size={11} /> {formErrors.routeName}
                        </span>
                      )}
                    </div>

                    {/* City Dropdown */}
                    <div className="fleet-form-field">
                      <div className="fleet-label-row">
                        <label htmlFor="add-route-city">
                          City <span className="req-star">*</span>
                        </label>
                      </div>
                      <select
                        id="add-route-city"
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
                  </div>
                </div>

                <div className="vm-dual-columns-divider" aria-hidden="true" />

                {/* Column Right: Route Specifications */}
                <div className="vm-column-panel">
                  <div className="vm-panel-header">
                    <Milestone size={14} className="vm-panel-icon" />
                    <h4 className="vm-panel-title">Route Specifications</h4>
                  </div>

                  <div className="vm-panel-fields">
                    {/* Total Stages */}
                    <div className="fleet-form-field">
                      <div className="fleet-label-row">
                        <label htmlFor="add-route-totalstages">
                          Total Stages <span className="req-star">*</span>
                        </label>
                      </div>
                      <input
                        type="number"
                        id="add-route-totalstages"
                        name="totalStages"
                        min="1"
                        placeholder="e.g. 10"
                        value={addFormData.totalStages}
                        onChange={handleAddChange}
                        onBlur={handleAddBlur}
                        className={formErrors.totalStages && touchedFields.totalStages ? "input-has-error" : ""}
                        disabled={isSubmitting}
                      />
                      {formErrors.totalStages && touchedFields.totalStages && (
                        <span className="vm-field-error-msg" role="alert">
                          <AlertCircle size={11} /> {formErrors.totalStages}
                        </span>
                      )}
                    </div>

                    {/* Total Distance */}
                    <div className="fleet-form-field">
                      <div className="fleet-label-row">
                        <label htmlFor="add-route-totaldistance">
                          Total Distance (km) <span className="req-star">*</span>
                        </label>
                      </div>
                      <input
                        type="number"
                        id="add-route-totaldistance"
                        name="totalDistance"
                        step="0.1"
                        min="0.1"
                        placeholder="e.g. 35.5"
                        value={addFormData.totalDistance}
                        onChange={handleAddChange}
                        onBlur={handleAddBlur}
                        className={formErrors.totalDistance && touchedFields.totalDistance ? "input-has-error" : ""}
                        disabled={isSubmitting}
                      />
                      {formErrors.totalDistance && touchedFields.totalDistance && (
                        <span className="vm-field-error-msg" role="alert">
                          <AlertCircle size={11} /> {formErrors.totalDistance}
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
                      <span>Save Route</span>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          6. EDIT ROUTE MODAL (Identical UI Layout matching Add Route)
          ==================================================================== */}
      {showEditModal && editingRoute && (
        <div
          className="modal-overlay vm-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isEditSubmitting) handleCloseEditModal();
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-route-title"
        >
          <div className="vm-add-modal-box">
            {/* Modal Header */}
            <div className="vm-modal-header">
              <div className="vm-modal-title-group">
                <div className="vm-modal-icon-badge" aria-hidden="true">
                  <Pencil size={18} strokeWidth={2.2} />
                </div>
                <div>
                  <h3 id="edit-route-title" className="vm-modal-title">
                    Edit Route #{editingRoute.routeid}
                  </h3>
                  <p className="vm-modal-subtitle">
                    Update route details, designated city, and stage information.
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
                {/* Column Left: Route Identification */}
                <div className="vm-column-panel">
                  <div className="vm-panel-header">
                    <RouteIcon size={14} className="vm-panel-icon" />
                    <h4 className="vm-panel-title">Route Identification</h4>
                  </div>

                  <div className="vm-panel-fields">
                    {/* Route ID */}
                    <div className="fleet-form-field">
                      <div className="fleet-label-row">
                        <label htmlFor="edit-route-routeid">
                          Route ID <span className="req-star">*</span>
                        </label>
                      </div>
                      <input
                        type="text"
                        id="edit-route-routeid"
                        name="routeId"
                        value={editFormData.routeId}
                        onChange={handleEditChange}
                        onBlur={handleEditBlur}
                        className={editFormErrors.routeId && editTouchedFields.routeId ? "input-has-error" : ""}
                        disabled={isEditSubmitting}
                      />
                      {editFormErrors.routeId && editTouchedFields.routeId && (
                        <span className="vm-field-error-msg" role="alert">
                          <AlertCircle size={11} /> {editFormErrors.routeId}
                        </span>
                      )}
                    </div>

                    {/* Route Name */}
                    <div className="fleet-form-field">
                      <div className="fleet-label-row">
                        <label htmlFor="edit-route-routename">
                          Route Name <span className="req-star">*</span>
                        </label>
                      </div>
                      <input
                        type="text"
                        id="edit-route-routename"
                        name="routeName"
                        value={editFormData.routeName}
                        onChange={handleEditChange}
                        onBlur={handleEditBlur}
                        className={editFormErrors.routeName && editTouchedFields.routeName ? "input-has-error" : ""}
                        disabled={isEditSubmitting}
                      />
                      {editFormErrors.routeName && editTouchedFields.routeName && (
                        <span className="vm-field-error-msg" role="alert">
                          <AlertCircle size={11} /> {editFormErrors.routeName}
                        </span>
                      )}
                    </div>

                    {/* City Dropdown */}
                    <div className="fleet-form-field">
                      <div className="fleet-label-row">
                        <label htmlFor="edit-route-city">
                          City <span className="req-star">*</span>
                        </label>
                      </div>
                      <select
                        id="edit-route-city"
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
                  </div>
                </div>

                <div className="vm-dual-columns-divider" aria-hidden="true" />

                {/* Column Right: Route Specifications */}
                <div className="vm-column-panel">
                  <div className="vm-panel-header">
                    <Milestone size={14} className="vm-panel-icon" />
                    <h4 className="vm-panel-title">Route Specifications</h4>
                  </div>

                  <div className="vm-panel-fields">
                    {/* Total Stages */}
                    <div className="fleet-form-field">
                      <div className="fleet-label-row">
                        <label htmlFor="edit-route-totalstages">
                          Total Stages <span className="req-star">*</span>
                        </label>
                      </div>
                      <input
                        type="number"
                        id="edit-route-totalstages"
                        name="totalStages"
                        min="1"
                        value={editFormData.totalStages}
                        onChange={handleEditChange}
                        onBlur={handleEditBlur}
                        className={editFormErrors.totalStages && editTouchedFields.totalStages ? "input-has-error" : ""}
                        disabled={isEditSubmitting}
                      />
                      {editFormErrors.totalStages && editTouchedFields.totalStages && (
                        <span className="vm-field-error-msg" role="alert">
                          <AlertCircle size={11} /> {editFormErrors.totalStages}
                        </span>
                      )}
                    </div>

                    {/* Total Distance */}
                    <div className="fleet-form-field">
                      <div className="fleet-label-row">
                        <label htmlFor="edit-route-totaldistance">
                          Total Distance (km) <span className="req-star">*</span>
                        </label>
                      </div>
                      <input
                        type="number"
                        id="edit-route-totaldistance"
                        name="totalDistance"
                        step="0.1"
                        min="0.1"
                        value={editFormData.totalDistance}
                        onChange={handleEditChange}
                        onBlur={handleEditBlur}
                        className={editFormErrors.totalDistance && editTouchedFields.totalDistance ? "input-has-error" : ""}
                        disabled={isEditSubmitting}
                      />
                      {editFormErrors.totalDistance && editTouchedFields.totalDistance && (
                        <span className="vm-field-error-msg" role="alert">
                          <AlertCircle size={11} /> {editFormErrors.totalDistance}
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
                      <span>Update Route</span>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          7. VIEW ROUTE DETAILS MODAL (Read-Only)
          ==================================================================== */}
      {showDetailsModal && selectedRoute && (
        <div
          className="modal-overlay vm-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDetailsModal(false);
              setSelectedRoute(null);
            }
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="view-route-details-title"
        >
          <div className="fleet-modal-box">
            <div className="fleet-modal-header">
              <div className="vm-modal-title-group">
                <div className="vm-modal-icon-badge" aria-hidden="true">
                  <RouteIcon size={18} strokeWidth={2.2} />
                </div>
                <div>
                  <h3 id="view-route-details-title" className="fleet-modal-title">
                    Route Details
                  </h3>
                  <p className="fleet-modal-subtitle">
                    Specifications for Route #{selectedRoute.routeid}
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="fleet-modal-close"
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedRoute(null);
                }}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className="fleet-details-grid">
              <div className="fleet-detail-item">
                <span className="fleet-detail-label">Route ID</span>
                <span className="fleet-detail-value route-code-badge">#{selectedRoute.routeid}</span>
              </div>

              <div className="fleet-detail-item">
                <span className="fleet-detail-label">Route Name</span>
                <span className="fleet-detail-value" style={{ fontWeight: 600 }}>{selectedRoute.routename}</span>
              </div>

              <div className="fleet-detail-item">
                <span className="fleet-detail-label">Designated City</span>
                <span className="fleet-detail-value">
                  <span className="route-city-badge">
                    <MapPin size={11} /> {selectedRoute.city}
                  </span>
                </span>
              </div>

              <div className="fleet-detail-item">
                <span className="fleet-detail-label">Total Stages</span>
                <span className="fleet-detail-value">
                  <span className="route-stat-badge">
                    {selectedRoute.totalstages} Stage{selectedRoute.totalstages !== 1 ? "s" : ""}
                  </span>
                </span>
              </div>

              <div className="fleet-detail-item">
                <span className="fleet-detail-label">Total Distance</span>
                <span className="fleet-detail-value">
                  <span className="route-distance-badge">
                    <Milestone size={11} /> {selectedRoute.totaldistance} km
                  </span>
                </span>
              </div>
            </div>

            <div className="modal-actions" style={{ justifyContent: "space-between", marginTop: "18px" }}>
              <button
                type="button"
                className="fleet-action-btn fleet-action-pdf"
                onClick={() => handleGeneratePDF(selectedRoute)}
                disabled={generatingPdfId === selectedRoute.routeid}
                style={{ padding: "8px 16px", borderRadius: "8px" }}
              >
                {generatingPdfId === selectedRoute.routeid ? (
                  <Loader2 size={14} className="vm-spinner" />
                ) : (
                  <FileText size={14} />
                )}
                <span>Generate Route PDF</span>
              </button>

              <button
                type="button"
                className="vm-modal-cancel-btn"
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedRoute(null);
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
      {routeToDelete && (
        <div
          className="modal-overlay vm-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeleting) setRouteToDelete(null);
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-route-dialog-title"
        >
          <div className="vm-delete-modal-box">
            <div className="vm-delete-modal-header">
              <div className="vm-delete-icon-badge" aria-hidden="true">
                <Trash2 size={22} strokeWidth={2.2} />
              </div>

              <div className="vm-delete-modal-text">
                <h3 id="delete-route-dialog-title" className="vm-delete-modal-title">
                  Delete Route
                </h3>
                <p className="vm-delete-modal-desc">
                  Are you sure you want to delete Route <strong>"{routeToDelete.routename}"</strong> (ID #{routeToDelete.routeid}) in <strong>{routeToDelete.city}</strong>? This will permanently delete the route from the fleet network.
                </p>
              </div>
            </div>

            <div className="vm-modal-footer">
              <span className="vm-modal-footer-hint">Permanent deletion</span>
              <div className="vm-modal-footer-actions">
                <button
                  type="button"
                  className="vm-modal-cancel-btn"
                  onClick={() => setRouteToDelete(null)}
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
                    <span>Delete Route</span>
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

export default ViewRoute;
