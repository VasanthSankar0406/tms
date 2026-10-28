import React, { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import {
  RotateCcw,
  FileSpreadsheet,
  Plus,
  Eye,
  Pencil,
  Trash2,
  BusFront,
  X,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ShieldCheck,
  Check,
  Loader2
} from "lucide-react";
import { API_URL } from "../../config";
import "../../styles/ViewVehicle.css";
import { exportToExcel } from "../ReportGenerator";

const ViewVehicle = () => {

  // Master fleet state
  const [allVehicles, setAllVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [routeOptions, setRouteOptions] = useState([]);

  // Live filter states
  const [vehicleType, setVehicleType] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [regNo, setRegNo] = useState("");

  // Pagination state (5 records per page as requested)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // 3-Second Auto-Dismissing Flash Card Notification
  const [flashCard, setFlashCard] = useState(null);
  const flashTimerRef = useRef(null);

  // Delete confirmation modal state
  const [vehicleToDelete, setVehicleToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Add Vehicle modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});
  const firstInputRef = useRef(null);

  const [addFormData, setAddFormData] = useState({
    vehicleId: "",
    vehicleType: "",
    seatCapacity: "",
    registrationNo: "",
    routeId: "",
    registrationDate: "",
    purchaseDate: "",
    vendorId: "",
    rcNo: "",
    registrationPlace: ""
  });

  // Edit Vehicle modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [editFormErrors, setEditFormErrors] = useState({});
  const [editTouchedFields, setEditTouchedFields] = useState({});
  const [editFormData, setEditFormData] = useState({
    vehicletype: "",
    seatcapacity: "",
    registrationno: "",
    routeid: "",
    registrationdate: "",
    purchasedate: "",
    vendorid: "",
    rcno: "",
    registrationplace: ""
  });

  // View Details modal state
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  // Fetch all vehicles from backend API
  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/getVehicle`);
      const data = Array.isArray(response.data) ? response.data : [];
      setAllVehicles(data);
      setError("");
    } catch (err) {
      console.error("Error fetching vehicles:", err);
      setError("Failed to fetch fleet vehicles. Please verify database connectivity.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch available routes for allocation dropdowns
  const fetchRoutes = async () => {
    try {
      const response = await axios.get(`${API_URL}/getRoute`);
      if (Array.isArray(response.data)) {
        const routeIds = response.data.map((r) => r.routeid).filter(Boolean);
        setRouteOptions(routeIds);
      }
    } catch (err) {
      console.error("Error fetching routes:", err);
    }
  };

  useEffect(() => {
    fetchVehicles();
    fetchRoutes();
  }, []);

  // Reset pagination to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [vehicleType, vehicleId, regNo]);

  // Focus management: automatically focus first input when Add Modal opens
  useEffect(() => {
    if (showAddModal) {
      const timer = setTimeout(() => {
        firstInputRef.current?.focus();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [showAddModal]);

  // Keyboard navigation: Escape key closes active modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (showAddModal && !isSubmitting) {
          handleCloseAddModal();
        } else if (showEditModal && !isEditSubmitting) {
          handleCloseEditModal();
        } else if (vehicleToDelete && !isDeleting) {
          setVehicleToDelete(null);
        } else if (showDetailsModal) {
          setShowDetailsModal(false);
          setSelectedVehicle(null);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAddModal, isSubmitting, showEditModal, isEditSubmitting, vehicleToDelete, isDeleting, showDetailsModal]);

  // Unique options extracted from the master dataset so options persist regardless of active filters
  const uniqueVehicleIds = useMemo(() => {
    return [...new Set(allVehicles.map((v) => v.vehicleid).filter((id) => id != null))].sort(
      (a, b) => Number(a) - Number(b)
    );
  }, [allVehicles]);

  const uniqueRegNumbers = useMemo(() => {
    return [...new Set(allVehicles.map((v) => v.registrationno).filter(Boolean))].sort();
  }, [allVehicles]);

  // Live filter computation: applies immediately when any dropdown changes or is reset
  const filteredVehicles = useMemo(() => {
    return allVehicles.filter((vehicle) => {
      // 1. Vehicle Type filter (case-insensitive, handles AC vs Non-AC variations)
      if (vehicleType) {
        const selectedTypeNorm = vehicleType.replace(/[^a-zA-Z]/g, "").toLowerCase();
        const vehicleTypeNorm = String(vehicle.vehicletype || "").replace(/[^a-zA-Z]/g, "").toLowerCase();
        if (selectedTypeNorm === "ac" && vehicleTypeNorm !== "ac") return false;
        if (selectedTypeNorm === "nonac" && vehicleTypeNorm !== "nonac") return false;
        if (selectedTypeNorm !== "ac" && selectedTypeNorm !== "nonac" && vehicleTypeNorm !== selectedTypeNorm) {
          return false;
        }
      }

      // 2. Vehicle ID filter
      if (vehicleId) {
        if (String(vehicle.vehicleid ?? "").trim() !== String(vehicleId).trim()) {
          return false;
        }
      }

      // 3. Registration Number filter
      if (regNo) {
        if (String(vehicle.registrationno || "").trim().toLowerCase() !== String(regNo).trim().toLowerCase()) {
          return false;
        }
      }

      return true;
    });
  }, [allVehicles, vehicleType, vehicleId, regNo]);

  const hasActiveFilters = Boolean(vehicleType || vehicleId || regNo);

  const handleResetFilters = () => {
    setVehicleType("");
    setVehicleId("");
    setRegNo("");
  };

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredVehicles.length / itemsPerPage));
  const paginatedVehicles = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredVehicles.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredVehicles, currentPage, itemsPerPage]);

  // Trigger 3-Second Auto-Dismissing Flash Card
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

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [vehicleType, vehicleId, regNo]);

  // Adjust page if current page exceeds total pages
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const startEntryIndex = filteredVehicles.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endEntryIndex = Math.min(currentPage * itemsPerPage, filteredVehicles.length);

  // Field Validation Helper
  const validateField = (name, value) => {
    let error = "";
    const str = String(value || "").trim();

    switch (name) {
      case "vehicleId":
        if (!str) error = "Vehicle ID is required";
        else if (isNaN(str) || Number(str) <= 0) error = "Enter a valid positive number";
        break;
      case "vehicleType":
        if (!str) error = "Please select vehicle type";
        break;
      case "seatCapacity":
        if (!str) error = "Seat capacity is required";
        else if (isNaN(str) || Number(str) <= 0) error = "Must be greater than 0";
        break;
      case "registrationNo":
        if (!str) error = "Registration number is required";
        break;
      case "routeId":
        if (!str) error = "Please select a route";
        break;
      case "registrationDate":
        if (!str) error = "Registration date is required";
        break;
      case "purchaseDate":
        if (!str) error = "Purchase date is required";
        break;
      case "vendorId":
        if (!str) error = "Vendor ID is required";
        break;
      case "rcNo":
        if (!str) error = "RC number is required";
        break;
      case "registrationPlace":
        if (!str) error = "Registration place is required";
        break;
      default:
        break;
    }

    setFormErrors((prev) => ({
      ...prev,
      [name]: error
    }));
    return !error;
  };

  // Add Vehicle Form Handlers
  const handleAddChange = (e) => {
    const { name, value } = e.target;
    setAddFormData((prev) => ({
      ...prev,
      [name]: value
    }));

    if (formErrors[name]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouchedFields((prev) => ({
      ...prev,
      [name]: true
    }));
    validateField(name, value);
  };

  const handleCloseAddModal = () => {
    if (isSubmitting) return;
    setShowAddModal(false);
    setTouchedFields({});
    setFormErrors({});
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();

    const fields = [
      "vehicleId",
      "vehicleType",
      "seatCapacity",
      "registrationNo",
      "routeId",
      "registrationDate",
      "purchaseDate",
      "vendorId",
      "rcNo",
      "registrationPlace"
    ];

    const newErrors = {};
    let firstErrorField = null;

    fields.forEach((field) => {
      const val = addFormData[field];
      const str = String(val || "").trim();
      if (!str) {
        newErrors[field] = "This field is required";
        if (!firstErrorField) firstErrorField = field;
      } else if (field === "seatCapacity" && Number(str) <= 0) {
        newErrors[field] = "Must be greater than 0";
        if (!firstErrorField) firstErrorField = field;
      } else if (field === "vehicleId" && Number(str) <= 0) {
        newErrors[field] = "Must be a valid positive number";
        if (!firstErrorField) firstErrorField = field;
      }
    });

    setTouchedFields(fields.reduce((acc, f) => ({ ...acc, [f]: true }), {}));
    setFormErrors(newErrors);

    if (firstErrorField) {
      const el = document.getElementById(`add-${firstErrorField.toLowerCase()}`);
      if (el) el.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await axios.post(`${API_URL}/addVehicle`, addFormData);
      if (response.data && response.data.success) {
        const addedId = addFormData.vehicleId;
        setShowAddModal(false);
        setAddFormData({
          vehicleId: "",
          vehicleType: "",
          seatCapacity: "",
          registrationNo: "",
          routeId: "",
          registrationDate: "",
          purchaseDate: "",
          vendorId: "",
          rcNo: "",
          registrationPlace: ""
        });
        setTouchedFields({});
        setFormErrors({});
        await fetchVehicles();
        showFlashCard(`Vehicle #${addedId} has been added and saved successfully!`, "success", "Vehicle Saved");
      } else {
        showFlashCard(response.data?.message || "Failed to add vehicle.", "danger", "Save Failed");
      }
    } catch (err) {
      console.error("Error adding vehicle:", err);
      const msg = err.response?.data?.message || "Failed to add vehicle. Please verify input fields.";
      showFlashCard(msg, "danger", "Save Failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit Vehicle Form Handlers
  const handleEdit = (vehicle) => {
    setEditingVehicle(vehicle);
    setEditFormData({
      vehicletype: vehicle.vehicletype || "",
      seatcapacity: vehicle.seatcapacity || "",
      registrationno: vehicle.registrationno || "",
      routeid: vehicle.routeid || "",
      registrationdate: vehicle.registrationdate
        ? new Date(vehicle.registrationdate).toISOString().split("T")[0]
        : "",
      purchasedate: vehicle.purchasedate
        ? new Date(vehicle.purchasedate).toISOString().split("T")[0]
        : "",
      vendorid: vehicle.vendorid || "",
      rcno: vehicle.rcno || "",
      registrationplace: vehicle.registrationplace || ""
    });
    setEditFormErrors({});
    setEditTouchedFields({});
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    if (isEditSubmitting) return;
    setShowEditModal(false);
    setEditingVehicle(null);
    setEditFormErrors({});
    setEditTouchedFields({});
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({
      ...prev,
      [name]: value
    }));

    if (editFormErrors[name]) {
      setEditFormErrors((prev) => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  const handleEditBlur = (e) => {
    const { name, value } = e.target;
    setEditTouchedFields((prev) => ({
      ...prev,
      [name]: true
    }));
    validateEditField(name, value);
  };

  const validateEditField = (name, value) => {
    let err = "";
    const str = String(value || "").trim();

    switch (name) {
      case "vehicletype":
        if (!str) err = "Please select vehicle type";
        break;
      case "seatcapacity":
        if (!str) err = "Seat capacity is required";
        else if (isNaN(str) || Number(str) <= 0) err = "Must be greater than 0";
        break;
      case "registrationno":
        if (!str) err = "Registration number is required";
        break;
      case "routeid":
        if (!str) err = "Please select a route";
        break;
      case "registrationdate":
        if (!str) err = "Registration date is required";
        break;
      case "purchasedate":
        if (!str) err = "Purchase date is required";
        break;
      case "vendorid":
        if (!str) err = "Vendor ID is required";
        break;
      case "rcno":
        if (!str) err = "RC number is required";
        break;
      case "registrationplace":
        if (!str) err = "Registration place is required";
        break;
      default:
        break;
    }

    setEditFormErrors((prev) => ({
      ...prev,
      [name]: err
    }));
    return !err;
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingVehicle) return;

    const fields = [
      "vehicletype",
      "seatcapacity",
      "registrationno",
      "routeid",
      "registrationdate",
      "purchasedate",
      "vendorid",
      "rcno",
      "registrationplace"
    ];

    const newErrors = {};
    let firstErrorField = null;

    fields.forEach((field) => {
      const val = editFormData[field];
      const str = String(val || "").trim();
      if (!str) {
        newErrors[field] = "This field is required";
        if (!firstErrorField) firstErrorField = field;
      } else if (field === "seatcapacity" && Number(str) <= 0) {
        newErrors[field] = "Must be greater than 0";
        if (!firstErrorField) firstErrorField = field;
      }
    });

    setEditTouchedFields(fields.reduce((acc, f) => ({ ...acc, [f]: true }), {}));
    setEditFormErrors(newErrors);

    if (firstErrorField) {
      const el = document.getElementById(`edit-${firstErrorField.toLowerCase()}`);
      if (el) el.focus();
      return;
    }

    setIsEditSubmitting(true);
    try {
      const payload = {
        vehicletype: editFormData.vehicletype,
        seatcapacity: Number(editFormData.seatcapacity),
        registrationno: editFormData.registrationno,
        routeid: editFormData.routeid,
        registrationdate: editFormData.registrationdate,
        purchasedate: editFormData.purchasedate,
        vendorid: editFormData.vendorid,
        rcno: editFormData.rcno,
        registrationplace: editFormData.registrationplace
      };

      const response = await axios.put(`${API_URL}/updateVehicle/${editingVehicle.vehicleid}`, payload);
      if (response.data && response.data.success) {
        const updatedId = editingVehicle.vehicleid;
        setShowEditModal(false);
        setEditingVehicle(null);
        await fetchVehicles();
        showFlashCard(`Vehicle #${updatedId} specifications updated successfully!`, "success", "Vehicle Updated");
      } else {
        showFlashCard(response.data?.message || "Failed to update vehicle record.", "danger", "Update Failed");
      }
    } catch (err) {
      console.error("Error updating vehicle:", err);
      const msg = err.response?.data?.message || "Failed to update vehicle record. Please check field formats.";
      showFlashCard(msg, "danger", "Update Failed");
    } finally {
      setIsEditSubmitting(false);
    }
  };

  // View Details Modal Handler
  const handleViewDetails = (vehicle) => {
    setSelectedVehicle(vehicle);
    setShowDetailsModal(true);
  };

  // Delete Vehicle Handler (with modal confirmation + 3-second flash card)
  const handleConfirmDelete = async (vehicleIdToDelete) => {
    setIsDeleting(true);
    try {
      const response = await axios.delete(`${API_URL}/deleteVehicle/${vehicleIdToDelete}`);
      if (response.data && response.data.success) {
        setVehicleToDelete(null);
        await fetchVehicles();
        showFlashCard(`Vehicle #${vehicleIdToDelete} has been deleted successfully.`, "success", "Vehicle Deleted");
      } else {
        showFlashCard(response.data?.message || "Delete operation did not complete.", "danger", "Delete Failed");
      }
    } catch (err) {
      console.error("Error deleting vehicle:", err);
      const msg = err.response?.data?.message || "Failed to delete vehicle. It may be currently allocated to an active route or driver.";
      showFlashCard(msg, "danger", "Delete Failed");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDelete = (vehicle) => {
    setVehicleToDelete(vehicle);
  };

  // Excel Report Export Handler
  const handleExportReport = () => {
    if (!filteredVehicles.length) return;
    exportToExcel(
      filteredVehicles.map((v) => ({
        "Vehicle Type": v.vehicletype,
        "Vehicle ID": v.vehicleid,
        "Seat Capacity": v.seatcapacity,
        "Allocated Seats": v.allocated_count ?? 0,
        "Available Seats": v.available_seats ?? v.seatcapacity ?? 0,
        "Registration No": v.registrationno,
        "Route ID": v.routeid || "Unassigned",
        "Registration Date": v.registrationdate ? new Date(v.registrationdate).toLocaleDateString() : "",
        "RC No": v.rcno,
        "Purchase Date": v.purchasedate ? new Date(v.purchasedate).toLocaleDateString() : "",
        "Vendor ID": v.vendorid || "",
        "Registration Place": v.registrationplace || ""
      })),
      "Vehicle_Master_Report"
    );
  };

  return (
    <div className="view-vehicle-master-container">
      <div className="view-vehicle-box-wrapper">
        {/* ====================================================================
            1. HEADER & ACTIONS (Matching Reference Screenshot Layout)
            Title & Subtitle on Left, "Generate Report" & "+ Add Vehicle" on Right
            ==================================================================== */}
        <div className="vm-page-header">
          <div className="vm-header-left">
            <h2 className="vm-page-title">Vehicle Master</h2>
          </div>

          <div className="vm-header-actions">
            <button
              type="button"
              className="vm-btn-secondary vm-btn-report"
              onClick={handleExportReport}
              disabled={!filteredVehicles.length}
              title="Export filtered records to Excel"
            >
              <FileSpreadsheet size={16} />
              <span>Generate Report</span>
            </button>

            <button
              type="button"
              className="vm-btn-primary vm-btn-add"
              onClick={() => setShowAddModal(true)}
              title="Add a new vehicle to fleet"
            >
              <Plus size={16} strokeWidth={2.4} />
              <span>Add Vehicle</span>
            </button>
          </div>
        </div>

        {/* ====================================================================
            FLASH CARD NOTIFICATION (Auto-dismisses in exactly 3 seconds)
            ==================================================================== */}
        {flashCard && (
          <aside
            className={`vm-flash-card vm-flash-card-${flashCard.type || "success"}`}
            role="status"
            aria-live="polite"
          >
            <div className="vm-flash-card-inner">
              <div className="vm-flash-card-badge" aria-hidden="true">
                {flashCard.type === "danger" ? (
                  <AlertCircle size={18} />
                ) : (
                  <CheckCircle2 size={18} />
                )}
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

        {/* Legacy Alert Banners */}
        {successMsg && (
          <div className="vm-alert vm-alert-success">
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
            <button
              type="button"
              className="vm-alert-close"
              onClick={() => setSuccessMsg("")}
              aria-label="Dismiss message"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Error Alert Banner */}
        {error && (
          <div className="vm-alert vm-alert-danger">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* ====================================================================
            2. RESPONSIVE FILTERS TOOLBAR - Live Instant Filtering
            ==================================================================== */}
        <div className="fleet-filter-toolbar">
          <div className="fleet-filter-field">
            <label htmlFor="filter-vehicle-type">Vehicle Type</label>
            <select
              id="filter-vehicle-type"
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
              className="fleet-filter-select"
              aria-label="Filter by vehicle type"
            >
              <option value="">All Types</option>
              <option value="A/C">A/C</option>
              <option value="Non-A/C">NON-A/C</option>
            </select>
          </div>

          <div className="fleet-filter-field">
            <label htmlFor="filter-vehicle-id">Vehicle ID</label>
            <select
              id="filter-vehicle-id"
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              className="fleet-filter-select"
              aria-label="Filter by vehicle ID"
            >
              <option value="">All IDs</option>
              {uniqueVehicleIds.map((id) => (
                <option key={id} value={id}>
                  Bus #{id}
                </option>
              ))}
            </select>
          </div>

          <div className="fleet-filter-field">
            <label htmlFor="filter-reg-no">Registration Number</label>
            <select
              id="filter-reg-no"
              value={regNo}
              onChange={(e) => setRegNo(e.target.value)}
              className="fleet-filter-select"
              aria-label="Filter by registration number"
            >
              <option value="">All Reg Numbers</option>
              {uniqueRegNumbers.map((reg) => (
                <option key={reg} value={reg}>
                  {reg}
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
            3. VEHICLE DATA TABLE - Styled Matching Reference Screenshot
            Zero Desktop Horizontal Overflow, Crisp Navy Header & Compact Rows
            ==================================================================== */}
        <div className="view-vehicle-table-container">
          <table className="view-vehicle-table">
            <thead>
              <tr>
                <th className="col-sno">S.NO</th>
                <th className="col-type">VEHICLE TYPE</th>
                <th className="col-id">VEHICLE ID</th>
                <th className="col-cap">SEAT CAP.</th>
                <th className="col-avail">AVAIL. SEATS</th>
                <th className="col-reg">REG NO</th>
                <th className="col-route">ROUTE ID</th>
                <th className="col-date">REG DATE</th>
                <th className="col-rc">RC NO</th>
                <th className="col-date">PURCHASE DATE</th>
                <th className="col-vendor">VENDOR ID</th>
                <th className="col-place">REG PLACE</th>
                <th className="col-actions">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="13" className="fleet-table-loading">
                    Loading vehicle inventory...
                  </td>
                </tr>
              ) : paginatedVehicles.length > 0 ? (
                paginatedVehicles.map((vehicle, index) => {
                  const globalIndex = (currentPage - 1) * itemsPerPage + index + 1;
                  return (
                    <tr key={vehicle.vehicleid}>
                      <td className="col-sno-td">{globalIndex}</td>
                      <td className="col-type-td">
                        <span
                          className={`fleet-type-pill ${(vehicle.vehicletype || "").toLowerCase().includes("non") ? "type-non-ac" : "type-ac"}`}
                        >
                          {vehicle.vehicletype || "Standard"}
                        </span>
                      </td>
                      <td className="col-id-td">
                        <strong className="fleet-id-text">#{vehicle.vehicleid}</strong>
                      </td>
                      <td className="col-cap-td">{vehicle.seatcapacity}</td>
                      <td className="col-avail-td">
                        <span className="fleet-seats-badge">
                          {vehicle.available_seats ?? vehicle.seatcapacity ?? "—"}
                        </span>
                      </td>
                      <td className="col-reg-td">
                        <code className="fleet-reg-code">{vehicle.registrationno}</code>
                      </td>
                      <td className="col-route-td">
                        {vehicle.routeid ? (
                          <span className="fleet-route-pill">{vehicle.routeid}</span>
                        ) : (
                          <span className="fleet-unassigned">—</span>
                        )}
                      </td>
                      <td className="col-date-td">
                        {vehicle.registrationdate
                          ? new Date(vehicle.registrationdate).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="col-rc-td">{vehicle.rcno || "—"}</td>
                      <td className="col-date-td">
                        {vehicle.purchasedate
                          ? new Date(vehicle.purchasedate).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="col-vendor-td">{vehicle.vendorid || "—"}</td>
                      <td className="col-place-td">{vehicle.registrationplace || "—"}</td>
                      <td className="fleet-actions-cell">
                        <div className="fleet-action-buttons-group">
                          <button
                            type="button"
                            className="fleet-action-btn fleet-action-view"
                            onClick={() => handleViewDetails(vehicle)}
                            title="View Details"
                            aria-label={`View details for vehicle ${vehicle.vehicleid}`}
                          >
                            <Eye size={12} />
                            <span>View</span>
                          </button>
                          <button
                            type="button"
                            className="fleet-action-btn fleet-action-edit"
                            onClick={() => handleEdit(vehicle)}
                            title="Edit Vehicle"
                            aria-label={`Edit vehicle ${vehicle.vehicleid}`}
                          >
                            <Pencil size={12} />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            className="fleet-action-btn fleet-action-delete"
                            onClick={() => handleDelete(vehicle)}
                            title="Delete Vehicle"
                            aria-label={`Delete vehicle ${vehicle.vehicleid}`}
                          >
                            <Trash2 size={12} />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="13" className="fleet-table-empty">
                    No vehicles match your selected filter criteria. Try adjusting or resetting filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ====================================================================
            4. PAGINATION FOOTER (Matching Reference Screenshot)
            "Showing X to Y of Z entries" on Left, Pagination Controls on Right
            ==================================================================== */}
        <div className="vm-table-footer">
          <div className="vm-footer-entries">
            Showing {startEntryIndex} to {endEntryIndex} of {filteredVehicles.length} entries
          </div>

          <div className="vm-pagination-controls">
            <button
              type="button"
              className="vm-page-btn"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              title="First Page"
              aria-label="First page"
            >
              <ChevronsLeft size={14} />
            </button>
            <button
              type="button"
              className="vm-page-btn"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              title="Previous Page"
              aria-label="Previous page"
            >
              <ChevronLeft size={14} />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                type="button"
                className={`vm-page-btn ${currentPage === page ? "active" : ""}`}
                onClick={() => setCurrentPage(page)}
                aria-label={`Page ${page}`}
                aria-current={currentPage === page ? "page" : undefined}
              >
                {page}
              </button>
            ))}

            <button
              type="button"
              className="vm-page-btn"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              title="Next Page"
              aria-label="Next page"
            >
              <ChevronRight size={14} />
            </button>
            <button
              type="button"
              className="vm-page-btn"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages || totalPages === 0}
              title="Last Page"
              aria-label="Last page"
            >
              <ChevronsRight size={14} />
            </button>
          </div>
        </div>

        {/* ====================================================================
            5. ADD VEHICLE MODAL DIALOG - NON-SCROLLABLE DESKTOP LAYOUT
            Side-by-Side Dual Column Panels (5 Fields Each), Zero Scrollbars,
            Compact Header & Fixed Footer
            ==================================================================== */}
        {showAddModal && (
          <div
            className="modal-overlay vm-modal-overlay"
            onClick={(e) => {
              if (e.target === e.currentTarget && !isSubmitting) handleCloseAddModal();
            }}
            role="presentation"
          >
            <div
              className="fleet-modal-box vm-add-modal-box"
              role="dialog"
              aria-modal="true"
              aria-labelledby="add-modal-title"
            >
              {/* Compact Header */}
              <div className="vm-modal-header">
                <div className="vm-modal-title-group">
                  <div className="vm-modal-icon-badge" aria-hidden="true">
                    <BusFront size={18} />
                  </div>
                  <div>
                    <h3 id="add-modal-title" className="vm-modal-title">
                      Add New Vehicle
                    </h3>
                    <p className="vm-modal-subtitle">
                      Enter vehicle specifications, route allocation, and registration details.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="vm-modal-close-btn"
                  onClick={handleCloseAddModal}
                  disabled={isSubmitting}
                  aria-label="Close modal"
                  title="Close modal (Esc)"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form Container with Side-by-Side Columns - Fits Viewport with Zero Scrolling */}
              <form onSubmit={handleAddSubmit} className="vm-modal-form-wrapper" noValidate>
                <div className="vm-modal-dual-columns">
                  {/* LEFT COLUMN: Vehicle Details */}
                  <div className="vm-column-panel">
                    <div className="vm-panel-header">
                      <BusFront size={14} className="vm-panel-icon" />
                      <h4 className="vm-panel-title">Vehicle Details</h4>
                    </div>

                    <div className="vm-panel-fields">
                      {/* Vehicle ID */}
                      <div className="fleet-form-field">
                        <div className="fleet-label-row">
                          <label htmlFor="add-vehicleid">
                            Vehicle ID <span className="req-star" title="Required">*</span>
                          </label>
                        </div>
                        <input
                          ref={firstInputRef}
                          id="add-vehicleid"
                          type="number"
                          name="vehicleId"
                          value={addFormData.vehicleId}
                          onChange={handleAddChange}
                          onBlur={handleBlur}
                          placeholder="e.g. 101"
                          className={touchedFields.vehicleId && formErrors.vehicleId ? "input-has-error" : ""}
                          required
                          min="1"
                        />
                        {touchedFields.vehicleId && formErrors.vehicleId && (
                          <span className="vm-field-error-msg">
                            <AlertCircle size={11} />
                            <span>{formErrors.vehicleId}</span>
                          </span>
                        )}
                      </div>

                      {/* Vehicle Type */}
                      <div className="fleet-form-field">
                        <div className="fleet-label-row">
                          <label htmlFor="add-vehicletype">
                            Vehicle Type <span className="req-star" title="Required">*</span>
                          </label>
                        </div>
                        <select
                          id="add-vehicletype"
                          name="vehicleType"
                          value={addFormData.vehicleType}
                          onChange={handleAddChange}
                          onBlur={handleBlur}
                          className={touchedFields.vehicleType && formErrors.vehicleType ? "input-has-error" : ""}
                          required
                        >
                          <option value="">Select Type</option>
                          <option value="A/C">A/C</option>
                          <option value="Non-A/C">Non-A/C</option>
                        </select>
                        {touchedFields.vehicleType && formErrors.vehicleType && (
                          <span className="vm-field-error-msg">
                            <AlertCircle size={11} />
                            <span>{formErrors.vehicleType}</span>
                          </span>
                        )}
                      </div>

                      {/* Seat Capacity */}
                      <div className="fleet-form-field">
                        <div className="fleet-label-row">
                          <label htmlFor="add-seatcapacity">
                            Seat Capacity <span className="req-star" title="Required">*</span>
                          </label>
                        </div>
                        <input
                          id="add-seatcapacity"
                          type="number"
                          name="seatCapacity"
                          value={addFormData.seatCapacity}
                          onChange={handleAddChange}
                          onBlur={handleBlur}
                          placeholder="e.g. 40"
                          className={touchedFields.seatCapacity && formErrors.seatCapacity ? "input-has-error" : ""}
                          required
                          min="1"
                        />
                        {touchedFields.seatCapacity && formErrors.seatCapacity && (
                          <span className="vm-field-error-msg">
                            <AlertCircle size={11} />
                            <span>{formErrors.seatCapacity}</span>
                          </span>
                        )}
                      </div>

                      {/* Route ID */}
                      <div className="fleet-form-field">
                        <div className="fleet-label-row">
                          <label htmlFor="add-routeid">
                            Assigned Route <span className="req-star" title="Required">*</span>
                          </label>
                        </div>
                        <select
                          id="add-routeid"
                          name="routeId"
                          value={addFormData.routeId}
                          onChange={handleAddChange}
                          onBlur={handleBlur}
                          className={touchedFields.routeId && formErrors.routeId ? "input-has-error" : ""}
                          required
                        >
                          <option value="">Select Route</option>
                          {routeOptions.map((route) => (
                            <option key={route} value={route}>
                              {route}
                            </option>
                          ))}
                        </select>
                        {touchedFields.routeId && formErrors.routeId && (
                          <span className="vm-field-error-msg">
                            <AlertCircle size={11} />
                            <span>{formErrors.routeId}</span>
                          </span>
                        )}
                      </div>

                      {/* Purchase Date */}
                      <div className="fleet-form-field">
                        <div className="fleet-label-row">
                          <label htmlFor="add-purchasedate">
                            Purchase Date <span className="req-star" title="Required">*</span>
                          </label>
                        </div>
                        <input
                          id="add-purchasedate"
                          type="date"
                          name="purchaseDate"
                          value={addFormData.purchaseDate}
                          onChange={handleAddChange}
                          onBlur={handleBlur}
                          className={touchedFields.purchaseDate && formErrors.purchaseDate ? "input-has-error" : ""}
                          required
                        />
                        {touchedFields.purchaseDate && formErrors.purchaseDate && (
                          <span className="vm-field-error-msg">
                            <AlertCircle size={11} />
                            <span>{formErrors.purchaseDate}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Vertical Divider */}
                  <div className="vm-dual-columns-divider" aria-hidden="true" />

                  {/* RIGHT COLUMN: Registration Details */}
                  <div className="vm-column-panel">
                    <div className="vm-panel-header">
                      <ShieldCheck size={14} className="vm-panel-icon" />
                      <h4 className="vm-panel-title">Registration Details</h4>
                    </div>

                    <div className="vm-panel-fields">
                      {/* Registration Number */}
                      <div className="fleet-form-field">
                        <div className="fleet-label-row">
                          <label htmlFor="add-registrationno">
                            Registration Number <span className="req-star" title="Required">*</span>
                          </label>
                        </div>
                        <input
                          id="add-registrationno"
                          type="text"
                          name="registrationNo"
                          value={addFormData.registrationNo}
                          onChange={handleAddChange}
                          onBlur={handleBlur}
                          placeholder="e.g. TN96K4296"
                          className={touchedFields.registrationNo && formErrors.registrationNo ? "input-has-error" : ""}
                          required
                        />
                        {touchedFields.registrationNo && formErrors.registrationNo && (
                          <span className="vm-field-error-msg">
                            <AlertCircle size={11} />
                            <span>{formErrors.registrationNo}</span>
                          </span>
                        )}
                      </div>

                      {/* RC Number */}
                      <div className="fleet-form-field">
                        <div className="fleet-label-row">
                          <label htmlFor="add-rcno">
                            RC Number <span className="req-star" title="Required">*</span>
                          </label>
                        </div>
                        <input
                          id="add-rcno"
                          type="text"
                          name="rcNo"
                          value={addFormData.rcNo}
                          onChange={handleAddChange}
                          onBlur={handleBlur}
                          placeholder="e.g. 9003"
                          className={touchedFields.rcNo && formErrors.rcNo ? "input-has-error" : ""}
                          required
                        />
                        {touchedFields.rcNo && formErrors.rcNo && (
                          <span className="vm-field-error-msg">
                            <AlertCircle size={11} />
                            <span>{formErrors.rcNo}</span>
                          </span>
                        )}
                      </div>

                      {/* Registration Date */}
                      <div className="fleet-form-field">
                        <div className="fleet-label-row">
                          <label htmlFor="add-registrationdate">
                            Registration Date <span className="req-star" title="Required">*</span>
                          </label>
                        </div>
                        <input
                          id="add-registrationdate"
                          type="date"
                          name="registrationDate"
                          value={addFormData.registrationDate}
                          onChange={handleAddChange}
                          onBlur={handleBlur}
                          className={touchedFields.registrationDate && formErrors.registrationDate ? "input-has-error" : ""}
                          required
                        />
                        {touchedFields.registrationDate && formErrors.registrationDate && (
                          <span className="vm-field-error-msg">
                            <AlertCircle size={11} />
                            <span>{formErrors.registrationDate}</span>
                          </span>
                        )}
                      </div>

                      {/* Vendor ID */}
                      <div className="fleet-form-field">
                        <div className="fleet-label-row">
                          <label htmlFor="add-vendorid">
                            Vendor ID <span className="req-star" title="Required">*</span>
                          </label>
                        </div>
                        <input
                          id="add-vendorid"
                          type="text"
                          name="vendorId"
                          value={addFormData.vendorId}
                          onChange={handleAddChange}
                          onBlur={handleBlur}
                          placeholder="e.g. 4344"
                          className={touchedFields.vendorId && formErrors.vendorId ? "input-has-error" : ""}
                          required
                        />
                        {touchedFields.vendorId && formErrors.vendorId && (
                          <span className="vm-field-error-msg">
                            <AlertCircle size={11} />
                            <span>{formErrors.vendorId}</span>
                          </span>
                        )}
                      </div>

                      {/* Registration Place */}
                      <div className="fleet-form-field">
                        <div className="fleet-label-row">
                          <label htmlFor="add-registrationplace">
                            Registration Place <span className="req-star" title="Required">*</span>
                          </label>
                        </div>
                        <input
                          id="add-registrationplace"
                          type="text"
                          name="registrationPlace"
                          value={addFormData.registrationPlace}
                          onChange={handleAddChange}
                          onBlur={handleBlur}
                          placeholder="e.g. Kovilpatti"
                          className={touchedFields.registrationPlace && formErrors.registrationPlace ? "input-has-error" : ""}
                          required
                        />
                        {touchedFields.registrationPlace && formErrors.registrationPlace && (
                          <span className="vm-field-error-msg">
                            <AlertCircle size={11} />
                            <span>{formErrors.registrationPlace}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Compact Visually Distinct Fixed Modal Footer */}
                <div className="vm-modal-footer">
                  <div className="vm-modal-footer-hint">
                    <span className="req-star">*</span> Indicates required fields
                  </div>
                  <div className="vm-modal-footer-actions">
                    <button
                      type="button"
                      className="cancel-btn vm-modal-cancel-btn"
                      onClick={handleCloseAddModal}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="save-btn vm-modal-save-btn"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 size={14} className="vm-spinner" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Check size={14} strokeWidth={2.4} />
                          <span>Save Vehicle</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ====================================================================
            6. EDIT VEHICLE MODAL DIALOG - Matching Add Vehicle Modal Exactly
            ==================================================================== */}
        {showEditModal && editingVehicle && (
          <div
            className="modal-overlay vm-modal-overlay"
            onClick={(e) => {
              if (e.target === e.currentTarget && !isEditSubmitting) handleCloseEditModal();
            }}
            role="presentation"
          >
            <div
              className="fleet-modal-box vm-add-modal-box"
              role="dialog"
              aria-modal="true"
              aria-labelledby="edit-modal-title"
            >
              {/* Header */}
              <div className="vm-modal-header">
                <div className="vm-modal-title-group">
                  <div className="vm-modal-icon-badge" aria-hidden="true">
                    <BusFront size={18} />
                  </div>
                  <div>
                    <h3 id="edit-modal-title" className="vm-modal-title">
                      Edit Vehicle #{editingVehicle.vehicleid}
                    </h3>
                    <p className="vm-modal-subtitle">
                      Update vehicle specifications, route allocation, and registration details.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="vm-modal-close-btn"
                  onClick={handleCloseEditModal}
                  disabled={isEditSubmitting}
                  aria-label="Close modal"
                  title="Close modal (Esc)"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form Container with Side-by-Side Dual Columns */}
              <form onSubmit={handleEditSubmit} className="vm-modal-form-wrapper" noValidate>
                <div className="vm-modal-dual-columns">
                  {/* LEFT COLUMN: Vehicle Details */}
                  <div className="vm-column-panel">
                    <div className="vm-panel-header">
                      <BusFront size={14} className="vm-panel-icon" />
                      <h4 className="vm-panel-title">Vehicle Details</h4>
                    </div>

                    <div className="vm-panel-fields">
                      {/* Vehicle ID (Read-only for Edit) */}
                      <div className="fleet-form-field">
                        <div className="fleet-label-row">
                          <label htmlFor="edit-vehicleid">
                            Vehicle ID <span className="vm-field-badge">Read-only</span>
                          </label>
                        </div>
                        <input
                          id="edit-vehicleid"
                          type="text"
                          value={`#${editingVehicle.vehicleid}`}
                          disabled
                          readOnly
                          className="input-disabled-readonly"
                        />
                      </div>

                      {/* Vehicle Type */}
                      <div className="fleet-form-field">
                        <div className="fleet-label-row">
                          <label htmlFor="edit-vehicletype">
                            Vehicle Type <span className="req-star" title="Required">*</span>
                          </label>
                        </div>
                        <select
                          id="edit-vehicletype"
                          name="vehicletype"
                          value={editFormData.vehicletype}
                          onChange={handleEditChange}
                          onBlur={handleEditBlur}
                          className={editTouchedFields.vehicletype && editFormErrors.vehicletype ? "input-has-error" : ""}
                          required
                        >
                          <option value="">Select Type</option>
                          <option value="A/C">A/C</option>
                          <option value="Non-A/C">Non-A/C</option>
                        </select>
                        {editTouchedFields.vehicletype && editFormErrors.vehicletype && (
                          <span className="vm-field-error-msg">
                            <AlertCircle size={11} />
                            <span>{editFormErrors.vehicletype}</span>
                          </span>
                        )}
                      </div>

                      {/* Seat Capacity */}
                      <div className="fleet-form-field">
                        <div className="fleet-label-row">
                          <label htmlFor="edit-seatcapacity">
                            Seat Capacity <span className="req-star" title="Required">*</span>
                          </label>
                        </div>
                        <input
                          id="edit-seatcapacity"
                          type="number"
                          name="seatcapacity"
                          value={editFormData.seatcapacity}
                          onChange={handleEditChange}
                          onBlur={handleEditBlur}
                          placeholder="e.g. 40"
                          className={editTouchedFields.seatcapacity && editFormErrors.seatcapacity ? "input-has-error" : ""}
                          required
                          min="1"
                        />
                        {editTouchedFields.seatcapacity && editFormErrors.seatcapacity && (
                          <span className="vm-field-error-msg">
                            <AlertCircle size={11} />
                            <span>{editFormErrors.seatcapacity}</span>
                          </span>
                        )}
                      </div>

                      {/* Route ID */}
                      <div className="fleet-form-field">
                        <div className="fleet-label-row">
                          <label htmlFor="edit-routeid">
                            Assigned Route <span className="req-star" title="Required">*</span>
                          </label>
                        </div>
                        <select
                          id="edit-routeid"
                          name="routeid"
                          value={editFormData.routeid}
                          onChange={handleEditChange}
                          onBlur={handleEditBlur}
                          className={editTouchedFields.routeid && editFormErrors.routeid ? "input-has-error" : ""}
                          required
                        >
                          <option value="">Select Route</option>
                          {routeOptions.map((route) => (
                            <option key={route} value={route}>
                              {route}
                            </option>
                          ))}
                        </select>
                        {editTouchedFields.routeid && editFormErrors.routeid && (
                          <span className="vm-field-error-msg">
                            <AlertCircle size={11} />
                            <span>{editFormErrors.routeid}</span>
                          </span>
                        )}
                      </div>

                      {/* Purchase Date */}
                      <div className="fleet-form-field">
                        <div className="fleet-label-row">
                          <label htmlFor="edit-purchasedate">
                            Purchase Date <span className="req-star" title="Required">*</span>
                          </label>
                        </div>
                        <input
                          id="edit-purchasedate"
                          type="date"
                          name="purchasedate"
                          value={editFormData.purchasedate}
                          onChange={handleEditChange}
                          onBlur={handleEditBlur}
                          className={editTouchedFields.purchasedate && editFormErrors.purchasedate ? "input-has-error" : ""}
                          required
                        />
                        {editTouchedFields.purchasedate && editFormErrors.purchasedate && (
                          <span className="vm-field-error-msg">
                            <AlertCircle size={11} />
                            <span>{editFormErrors.purchasedate}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Vertical Divider */}
                  <div className="vm-dual-columns-divider" aria-hidden="true" />

                  {/* RIGHT COLUMN: Registration Details */}
                  <div className="vm-column-panel">
                    <div className="vm-panel-header">
                      <ShieldCheck size={14} className="vm-panel-icon" />
                      <h4 className="vm-panel-title">Registration Details</h4>
                    </div>

                    <div className="vm-panel-fields">
                      {/* Registration Number */}
                      <div className="fleet-form-field">
                        <div className="fleet-label-row">
                          <label htmlFor="edit-registrationno">
                            Registration Number <span className="req-star" title="Required">*</span>
                          </label>
                        </div>
                        <input
                          id="edit-registrationno"
                          type="text"
                          name="registrationno"
                          value={editFormData.registrationno}
                          onChange={handleEditChange}
                          onBlur={handleEditBlur}
                          placeholder="e.g. TN96K4296"
                          className={editTouchedFields.registrationno && editFormErrors.registrationno ? "input-has-error" : ""}
                          required
                        />
                        {editTouchedFields.registrationno && editFormErrors.registrationno && (
                          <span className="vm-field-error-msg">
                            <AlertCircle size={11} />
                            <span>{editFormErrors.registrationno}</span>
                          </span>
                        )}
                      </div>

                      {/* RC Number */}
                      <div className="fleet-form-field">
                        <div className="fleet-label-row">
                          <label htmlFor="edit-rcno">
                            RC Number <span className="req-star" title="Required">*</span>
                          </label>
                        </div>
                        <input
                          id="edit-rcno"
                          type="text"
                          name="rcno"
                          value={editFormData.rcno}
                          onChange={handleEditChange}
                          onBlur={handleEditBlur}
                          placeholder="e.g. 9003"
                          className={editTouchedFields.rcno && editFormErrors.rcno ? "input-has-error" : ""}
                          required
                        />
                        {editTouchedFields.rcno && editFormErrors.rcno && (
                          <span className="vm-field-error-msg">
                            <AlertCircle size={11} />
                            <span>{editFormErrors.rcno}</span>
                          </span>
                        )}
                      </div>

                      {/* Registration Date */}
                      <div className="fleet-form-field">
                        <div className="fleet-label-row">
                          <label htmlFor="edit-registrationdate">
                            Registration Date <span className="req-star" title="Required">*</span>
                          </label>
                        </div>
                        <input
                          id="edit-registrationdate"
                          type="date"
                          name="registrationdate"
                          value={editFormData.registrationdate}
                          onChange={handleEditChange}
                          onBlur={handleEditBlur}
                          className={editTouchedFields.registrationdate && editFormErrors.registrationdate ? "input-has-error" : ""}
                          required
                        />
                        {editTouchedFields.registrationdate && editFormErrors.registrationdate && (
                          <span className="vm-field-error-msg">
                            <AlertCircle size={11} />
                            <span>{editFormErrors.registrationdate}</span>
                          </span>
                        )}
                      </div>

                      {/* Vendor ID */}
                      <div className="fleet-form-field">
                        <div className="fleet-label-row">
                          <label htmlFor="edit-vendorid">
                            Vendor ID <span className="req-star" title="Required">*</span>
                          </label>
                        </div>
                        <input
                          id="edit-vendorid"
                          type="text"
                          name="vendorid"
                          value={editFormData.vendorid}
                          onChange={handleEditChange}
                          onBlur={handleEditBlur}
                          placeholder="e.g. 4344"
                          className={editTouchedFields.vendorid && editFormErrors.vendorid ? "input-has-error" : ""}
                          required
                        />
                        {editTouchedFields.vendorid && editFormErrors.vendorid && (
                          <span className="vm-field-error-msg">
                            <AlertCircle size={11} />
                            <span>{editFormErrors.vendorid}</span>
                          </span>
                        )}
                      </div>

                      {/* Registration Place */}
                      <div className="fleet-form-field">
                        <div className="fleet-label-row">
                          <label htmlFor="edit-registrationplace">
                            Registration Place <span className="req-star" title="Required">*</span>
                          </label>
                        </div>
                        <input
                          id="edit-registrationplace"
                          type="text"
                          name="registrationplace"
                          value={editFormData.registrationplace}
                          onChange={handleEditChange}
                          onBlur={handleEditBlur}
                          placeholder="e.g. Kovilpatti"
                          className={editTouchedFields.registrationplace && editFormErrors.registrationplace ? "input-has-error" : ""}
                          required
                        />
                        {editTouchedFields.registrationplace && editFormErrors.registrationplace && (
                          <span className="vm-field-error-msg">
                            <AlertCircle size={11} />
                            <span>{editFormErrors.registrationplace}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="vm-modal-footer">
                  <div className="vm-modal-footer-hint">
                    <span className="req-star">*</span> Indicates required fields
                  </div>
                  <div className="vm-modal-footer-actions">
                    <button
                      type="button"
                      className="cancel-btn vm-modal-cancel-btn"
                      onClick={handleCloseEditModal}
                      disabled={isEditSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="save-btn vm-modal-save-btn"
                      disabled={isEditSubmitting}
                    >
                      {isEditSubmitting ? (
                        <>
                          <Loader2 size={14} className="vm-spinner" />
                          <span>Updating...</span>
                        </>
                      ) : (
                        <>
                          <Check size={14} strokeWidth={2.4} />
                          <span>Update Vehicle</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ====================================================================
            7. VIEW DETAILS MODAL DIALOG
            ==================================================================== */}
        {showDetailsModal && selectedVehicle && (
          <div
            className="modal-overlay"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowDetailsModal(false);
                setSelectedVehicle(null);
              }
            }}
          >
            <div className="modal-content fleet-modal-box" role="dialog" aria-modal="true" aria-labelledby="view-details-title">
              <div className="fleet-modal-header">
                <div>
                  <h3 id="view-details-title" className="fleet-modal-title">Vehicle Details - Bus #{selectedVehicle.vehicleid}</h3>
                  <p className="fleet-modal-subtitle">Comprehensive registry specifications and seating allotment status.</p>
                </div>
                <button
                  type="button"
                  className="fleet-modal-close"
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedVehicle(null);
                  }}
                  aria-label="Close dialog"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="fleet-details-grid">
                <div className="fleet-detail-item">
                  <span className="fleet-detail-label">Vehicle Type</span>
                  <span className="fleet-detail-value">{selectedVehicle.vehicletype || "N/A"}</span>
                </div>
                <div className="fleet-detail-item">
                  <span className="fleet-detail-label">Registration No</span>
                  <span className="fleet-detail-value">
                    <code className="fleet-reg-code">{selectedVehicle.registrationno || "N/A"}</code>
                  </span>
                </div>
                <div className="fleet-detail-item">
                  <span className="fleet-detail-label">Seat Capacity</span>
                  <span className="fleet-detail-value">{selectedVehicle.seatcapacity || "N/A"} Seats</span>
                </div>
                <div className="fleet-detail-item">
                  <span className="fleet-detail-label">Available Seats</span>
                  <span className="fleet-detail-value">
                    {selectedVehicle.available_seats ?? selectedVehicle.seatcapacity ?? "N/A"} Seats
                  </span>
                </div>
                <div className="fleet-detail-item">
                  <span className="fleet-detail-label">Allocated Seats</span>
                  <span className="fleet-detail-value">{selectedVehicle.allocated_count ?? 0} Seats</span>
                </div>
                <div className="fleet-detail-item">
                  <span className="fleet-detail-label">Assigned Route</span>
                  <span className="fleet-detail-value">
                    {selectedVehicle.routeid ? `Route #${selectedVehicle.routeid}` : "Unassigned"}
                  </span>
                </div>
                <div className="fleet-detail-item">
                  <span className="fleet-detail-label">Registration Date</span>
                  <span className="fleet-detail-value">
                    {selectedVehicle.registrationdate
                      ? new Date(selectedVehicle.registrationdate).toLocaleDateString()
                      : "N/A"}
                  </span>
                </div>
                <div className="fleet-detail-item">
                  <span className="fleet-detail-label">Purchase Date</span>
                  <span className="fleet-detail-value">
                    {selectedVehicle.purchasedate
                      ? new Date(selectedVehicle.purchasedate).toLocaleDateString()
                      : "N/A"}
                  </span>
                </div>
                <div className="fleet-detail-item">
                  <span className="fleet-detail-label">RC Number</span>
                  <span className="fleet-detail-value">{selectedVehicle.rcno || "N/A"}</span>
                </div>
                <div className="fleet-detail-item">
                  <span className="fleet-detail-label">Vendor ID</span>
                  <span className="fleet-detail-value">{selectedVehicle.vendorid || "N/A"}</span>
                </div>
                <div className="fleet-detail-item fleet-detail-full">
                  <span className="fleet-detail-label">Registration Place</span>
                  <span className="fleet-detail-value">{selectedVehicle.registrationplace || "N/A"}</span>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedVehicle(null);
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================================
            8. DELETE VEHICLE CONFIRMATION MODAL
            ==================================================================== */}
        {vehicleToDelete && (
          <div
            className="modal-overlay vm-modal-overlay"
            onClick={(e) => {
              if (e.target === e.currentTarget && !isDeleting) setVehicleToDelete(null);
            }}
            role="presentation"
          >
            <div
              className="fleet-modal-box vm-delete-modal-box"
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-dialog-title"
            >
              <div className="vm-delete-modal-header">
                <div className="vm-delete-icon-badge" aria-hidden="true">
                  <Trash2 size={20} />
                </div>
                <div className="vm-delete-modal-text">
                  <h3 id="delete-dialog-title" className="vm-delete-modal-title">
                    Delete Vehicle #{vehicleToDelete.vehicleid}?
                  </h3>
                  <p className="vm-delete-modal-desc">
                    Are you sure you want to permanently delete vehicle <strong>#{vehicleToDelete.vehicleid}</strong> (Reg No: <strong>{vehicleToDelete.registrationno || "N/A"}</strong>)? This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="vm-modal-footer">
                <div className="vm-modal-footer-hint">
                  Permanently deletes fleet record
                </div>
                <div className="vm-modal-footer-actions">
                  <button
                    type="button"
                    className="cancel-btn vm-modal-cancel-btn"
                    onClick={() => setVehicleToDelete(null)}
                    disabled={isDeleting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="vm-btn-danger-confirm"
                    onClick={() => handleConfirmDelete(vehicleToDelete.vehicleid)}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 size={15} className="vm-spinner" />
                        <span>Deleting...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 size={15} />
                        <span>Delete Vehicle</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewVehicle;
