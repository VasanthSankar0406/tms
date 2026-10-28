import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import {
  RotateCcw,
  FileSpreadsheet,
  FileText,
  Plus,
  Pencil,
  Trash2,
  User,
  Search,
  X,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Users
} from "lucide-react";
import "../../styles/ViewDriver.css";
import { exportToExcel, exportDriverToPDF } from "../ReportGenerator";
import AddEditDriverModal from "./AddEditDriverModal";
import { API_URL } from "../../config";

const ViewDriver = ({ initialOpenAdd = false }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Master Data
  const [drivers, setDrivers] = useState([]);
  const [vehicleIds, setVehicleIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter States
  const [staffCodeFilter, setStaffCodeFilter] = useState("");
  const [staffNameFilter, setStaffNameFilter] = useState("");
  const [routeNameFilter, setRouteNameFilter] = useState("");

  // Pagination States (Fixed 5 per page)
  const itemsPerPage = 5;
  const [currentPermPage, setCurrentPermPage] = useState(1);
  const [currentTempPage, setCurrentTempPage] = useState(1);

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [driverToEdit, setDriverToEdit] = useState(null);

  // Delete Confirmation Modal State
  const [driverToDelete, setDriverToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 3-Second Auto-Dismissing Flash Card Notification
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

  // Check if opened with initialOpenAdd or URL params
  useEffect(() => {
    if (
      initialOpenAdd ||
      location.search.includes("action=add") ||
      location.pathname.includes("adddriver")
    ) {
      handleOpenAddModal();
    }
  }, [initialOpenAdd, location.search, location.pathname]);

  // Fetch Drivers
  const fetchDrivers = async () => {
    try {
      setIsRefreshing(true);
      const response = await axios.get(`${API_URL}/getdrivers`);
      const list = Array.isArray(response.data) ? response.data : [];
      setDrivers(list);
    } catch (err) {
      console.error("Error fetching drivers:", err);
      showFlash("Failed to load driver records. Please try again.", "danger", "Connection Error");
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  };

  // Fetch Vehicle IDs for assignment dropdown
  const fetchVehicles = async () => {
    try {
      const response = await axios.get(`${API_URL}/getVehicle`);
      const vIds = Array.isArray(response.data)
        ? response.data.map((v) => v.vehicleid).filter(Boolean)
        : [];
      setVehicleIds(vIds);
    } catch (err) {
      console.error("Error fetching vehicles:", err);
    }
  };

  useEffect(() => {
    fetchDrivers();
    fetchVehicles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter Logic with AND criteria
  const isAnyFilterActive = Boolean(
    staffCodeFilter || staffNameFilter.trim() || routeNameFilter
  );

  const handleClearFilters = () => {
    setStaffCodeFilter("");
    setStaffNameFilter("");
    setRouteNameFilter("");
    setCurrentPermPage(1);
    setCurrentTempPage(1);
  };

  const filteredDrivers = useMemo(() => {
    return drivers.filter((driver) => {
      const dName = (driver.staffname || driver.name || "").toLowerCase();
      const sName = staffNameFilter.trim().toLowerCase();
      const dCode = String(driver.staffcode || "");
      const dRoute = String(driver.routename || "");

      const matchesCode = !staffCodeFilter || dCode === staffCodeFilter;
      const matchesName = !sName || dName.includes(sName);
      const matchesRoute = !routeNameFilter || dRoute === routeNameFilter;

      return matchesCode && matchesName && matchesRoute;
    });
  }, [drivers, staffCodeFilter, staffNameFilter, routeNameFilter]);

  // Split into Permanent and Temporary Drivers
  const permanentDrivers = useMemo(() => {
    return filteredDrivers.filter(
      (d) => !d.driver_type || String(d.driver_type).toLowerCase() === "permanent"
    );
  }, [filteredDrivers]);

  const temporaryDrivers = useMemo(() => {
    return filteredDrivers.filter(
      (d) => String(d.driver_type).toLowerCase() === "temporary"
    );
  }, [filteredDrivers]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPermPage(1);
    setCurrentTempPage(1);
  }, [staffCodeFilter, staffNameFilter, routeNameFilter]);

  // Unique Dropdown Options
  const uniqueStaffCodes = useMemo(() => {
    return [...new Set(drivers.map((d) => d.staffcode).filter(Boolean))].sort();
  }, [drivers]);

  const uniqueRouteNames = useMemo(() => {
    return [...new Set(drivers.map((d) => d.routename).filter(Boolean))].sort();
  }, [drivers]);

  // Permanent Pagination Calculations
  const totalPermPages = Math.max(1, Math.ceil(permanentDrivers.length / itemsPerPage));
  const paginatedPermanent = useMemo(() => {
    const start = (currentPermPage - 1) * itemsPerPage;
    return permanentDrivers.slice(start, start + itemsPerPage);
  }, [permanentDrivers, currentPermPage, itemsPerPage]);

  const startPermIndex = permanentDrivers.length === 0 ? 0 : (currentPermPage - 1) * itemsPerPage + 1;
  const endPermIndex = Math.min(currentPermPage * itemsPerPage, permanentDrivers.length);

  // Temporary Pagination Calculations
  const totalTempPages = Math.max(1, Math.ceil(temporaryDrivers.length / itemsPerPage));
  const paginatedTemporary = useMemo(() => {
    const start = (currentTempPage - 1) * itemsPerPage;
    return temporaryDrivers.slice(start, start + itemsPerPage);
  }, [temporaryDrivers, currentTempPage, itemsPerPage]);

  const startTempIndex = temporaryDrivers.length === 0 ? 0 : (currentTempPage - 1) * itemsPerPage + 1;
  const endTempIndex = Math.min(currentTempPage * itemsPerPage, temporaryDrivers.length);

  // Modal Handlers
  const handleOpenAddModal = () => {
    setDriverToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (driver) => {
    setDriverToEdit(driver);
    setIsModalOpen(true);
  };

  const handleModalSuccess = (msg, type, title) => {
    setIsModalOpen(false);
    setDriverToEdit(null);
    showFlash(msg, type, title);
    fetchDrivers();
  };

  // Delete Action Handlers
  const handleOpenDeleteDialog = (driver) => {
    setDriverToDelete(driver);
  };

  const handleConfirmDelete = async () => {
    if (!driverToDelete) return;
    setIsDeleting(true);
    try {
      await axios.delete(`${API_URL}/deleteDriver/${encodeURIComponent(driverToDelete.staffcode)}`);
      showFlash(
        `Driver ${driverToDelete.staffname || driverToDelete.staffcode} was deleted successfully.`,
        "success",
        "Driver Deleted"
      );
      setDriverToDelete(null);
      fetchDrivers();
    } catch (err) {
      console.error("Error deleting driver:", err);
      showFlash(
        err.response?.data?.message || "Failed to delete driver record.",
        "danger",
        "Delete Failed"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // Excel Export Handler
  const handleExportExcel = () => {
    if (!filteredDrivers.length) return;
    const excelRows = filteredDrivers.map((d, idx) => ({
      "S.No": idx + 1,
      "Driver Type": d.driver_type === "temporary" ? "Temporary" : "Permanent",
      "Staff Code": d.staffcode || "",
      "Staff Name": d.staffname || d.name || "",
      "Vehicle ID": d.vehicleid || "N/A",
      "Route Name": d.routename || "Unassigned",
      "Door No": d.doorno || "",
      "Street Name / Address": d.streetname || "",
      "City": d.city || "",
      "State": d.state || "",
      "Pincode": d.pincode || "",
      "Mobile No": d.mobileno || "",
      "Email": d.email || ""
    }));
    exportToExcel(excelRows, "Driver_Management_Report");
    showFlash("Driver records exported to Excel successfully!", "success", "Excel Downloaded");
  };

  return (
    <div className="view-driver-master-container">
      <div className="view-driver-box-wrapper">
        {/* ====================================================================
            1. BREADCRUMBS & COMPACT PAGE HEADER
            ==================================================================== */}
        <nav className="vm-breadcrumb-nav" aria-label="Breadcrumb">
          <span className="link" onClick={() => navigate("/home")}>
            Dashboard
          </span>
          <span className="sep">/</span>
          <span className="current">Driver Administration</span>
          <span className="sep">/</span>
          <span className="current">Driver Management</span>
        </nav>

        <header className="vm-page-header">
          <div className="vm-header-left">
            <div className="vm-title-row">
              <h1 className="vm-page-title">Driver Management</h1>
              <span className="vm-total-count-badge">
                {drivers.length} Total Drivers
              </span>
            </div>
            <p className="vm-page-subtitle">
              Manage permanent and temporary drivers, vehicle assignments, and driver information.
            </p>
          </div>

          <div className="vm-header-actions">
            <button
              type="button"
              className="vm-btn-secondary"
              onClick={fetchDrivers}
              disabled={isRefreshing}
              title="Refresh driver records"
            >
              <RotateCcw size={15} className={isRefreshing ? "spin-icon" : ""} />
              <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
            </button>

            <button
              type="button"
              className="vm-btn-secondary vm-btn-excel"
              onClick={handleExportExcel}
              disabled={filteredDrivers.length === 0}
              title="Export driver records to Excel"
            >
              <FileSpreadsheet size={15} />
              <span>Excel Report</span>
            </button>

            <button
              type="button"
              className="vm-btn-primary vm-btn-add"
              onClick={handleOpenAddModal}
              title="Register a new driver"
            >
              <Plus size={16} strokeWidth={2.4} />
              <span>Add Driver</span>
            </button>
          </div>
        </header>

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
                {flashCard.type === "danger" ? (
                  <AlertCircle size={18} />
                ) : (
                  <CheckCircle2 size={18} />
                )}
              </div>
              <div className="vm-flash-card-content">
                <strong className="vm-flash-card-title">{flashCard.title}: </strong>
                <span className="vm-flash-card-message">{flashCard.message}</span>
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
            <div className="vm-flash-card-progress">
              <div className="vm-flash-card-progress-bar" />
            </div>
          </aside>
        )}

        {/* ====================================================================
            2. COMPACT AUTO-FILTERING TOOLBAR (Single Row on Desktop)
            ==================================================================== */}
        <div className="fleet-filter-toolbar">
          {/* Filter 1: Staff Code Dropdown */}
          <div className="fleet-filter-field">
            <label htmlFor="filter-staffcode">Staff Code</label>
            <select
              id="filter-staffcode"
              className="fleet-filter-select"
              value={staffCodeFilter}
              onChange={(e) => setStaffCodeFilter(e.target.value)}
            >
              <option value="">All Staff Codes</option>
              {uniqueStaffCodes.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>

          {/* Filter 2: Staff Name Search Input */}
          <div className="fleet-filter-field search-field">
            <label htmlFor="filter-staffname">Staff Name</label>
            <div className="filter-input-wrap">
              <Search size={14} className="filter-input-icon" />
              <input
                id="filter-staffname"
                type="text"
                className="fleet-filter-input"
                placeholder="Search staff name..."
                value={staffNameFilter}
                onChange={(e) => setStaffNameFilter(e.target.value)}
              />
            </div>
          </div>

          {/* Filter 3: Route Name Dropdown */}
          <div className="fleet-filter-field">
            <label htmlFor="filter-routename">Route Name</label>
            <select
              id="filter-routename"
              className="fleet-filter-select"
              value={routeNameFilter}
              onChange={(e) => setRouteNameFilter(e.target.value)}
            >
              <option value="">All Routes</option>
              {uniqueRouteNames.map((route) => (
                <option key={route} value={route}>
                  {route}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filters Action Button */}
          <div className="fleet-filter-actions">
            <button
              type="button"
              className="btn-clear-filters"
              onClick={handleClearFilters}
              disabled={!isAnyFilterActive}
              title="Reset all filter criteria"
            >
              <RotateCcw size={14} />
              <span>Clear Filters</span>
            </button>
          </div>
        </div>

        {/* ====================================================================
            3. PERMANENT DRIVERS SECTION
            ==================================================================== */}
        <section className="driver-section" aria-labelledby="perm-drivers-heading">
          <div className="driver-section-header">
            <div className="section-title-wrapper">
              <User size={18} className="section-icon perm-icon" />
              <h2 id="perm-drivers-heading" className="driver-section-title">
                Permanent Drivers
              </h2>
              <span className="section-count-badge">
                {permanentDrivers.length} {permanentDrivers.length === 1 ? "Driver" : "Drivers"}
              </span>
            </div>
          </div>

          <div className="view-driver-table-container">
            <table className="view-driver-table">
              <thead>
                <tr>
                  <th>Staff Code</th>
                  <th>Staff Name</th>
                  <th>Vehicle ID</th>
                  <th>Route Name</th>
                  <th>Door No</th>
                  <th>Street Name</th>
                  <th>City</th>
                  <th>State</th>
                  <th>Pincode</th>
                  <th>Mobile No</th>
                  <th style={{ textAlign: "center" }}>Photo</th>
                  <th style={{ textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="12" className="table-loading-cell">
                      <Loader2 size={20} className="spin-icon" />
                      <span>Loading permanent drivers...</span>
                    </td>
                  </tr>
                ) : paginatedPermanent.length === 0 ? (
                  <tr>
                    <td colSpan="12" className="table-empty-cell">
                      <div className="empty-state-box">
                        <User size={32} className="empty-state-icon" />
                        <p className="empty-state-title">No Permanent Drivers Found</p>
                        <p className="empty-state-desc">
                          {isAnyFilterActive
                            ? "No permanent driver records match your active search filters."
                            : "No permanent drivers registered in the system."}
                        </p>
                        {isAnyFilterActive && (
                          <button
                            type="button"
                            className="empty-state-reset-btn"
                            onClick={handleClearFilters}
                          >
                            Reset Filters
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedPermanent.map((driver) => {
                    const fullName = driver.staffname || driver.name || "Driver";
                    return (
                      <tr key={driver.staffcode}>
                        <td>
                          <span className="staff-code-badge">{driver.staffcode}</span>
                        </td>
                        <td>
                          <strong className="driver-name-text">{fullName}</strong>
                          {driver.email && (
                            <span className="driver-sub-email">{driver.email}</span>
                          )}
                        </td>
                        <td>
                          {driver.vehicleid ? (
                            <span className="vehicle-id-badge">
                              Vehicle #{driver.vehicleid}
                            </span>
                          ) : (
                            <span className="unassigned-text">Unassigned</span>
                          )}
                        </td>
                        <td>
                          {driver.routename ? (
                            <span className="route-name-text">{driver.routename}</span>
                          ) : (
                            <span className="unassigned-text">No Route</span>
                          )}
                        </td>
                        <td>{driver.doorno || "—"}</td>
                        <td>{driver.streetname || "—"}</td>
                        <td>{driver.city || "—"}</td>
                        <td>{driver.state || "—"}</td>
                        <td>{driver.pincode || "—"}</td>
                        <td>
                          {driver.mobileno ? (
                            <span className="phone-text">{driver.mobileno}</span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          {driver.imageUrl ? (
                            <img
                              src={driver.imageUrl}
                              alt={fullName}
                              className="driver-thumbnail-img"
                              onError={(e) => {
                                e.target.style.display = "none";
                                e.target.nextSibling.style.display = "inline-flex";
                              }}
                            />
                          ) : null}
                          <div
                            className="driver-thumbnail-fallback"
                            style={{ display: driver.imageUrl ? "none" : "inline-flex" }}
                          >
                            <User size={15} />
                          </div>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <div className="table-actions-cell">
                            <button
                              type="button"
                              className="table-action-icon-btn action-edit-btn"
                              onClick={() => handleOpenEditModal(driver)}
                              title={`Edit details for ${fullName}`}
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              className="table-action-icon-btn action-delete-btn"
                              onClick={() => handleOpenDeleteDialog(driver)}
                              title={`Delete ${fullName}`}
                            >
                              <Trash2 size={14} />
                            </button>
                            <button
                              type="button"
                              className="table-action-icon-btn action-pdf-btn"
                              onClick={() => exportDriverToPDF(driver)}
                              title={`Download PDF profile for ${fullName}`}
                            >
                              <FileText size={14} />
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

          {/* Permanent Drivers Pagination */}
          <div className="pagination-footer">
            <span className="pagination-info-text">
              {permanentDrivers.length === 0 ? (
                "Showing 0 permanent drivers"
              ) : (
                <>
                  Showing <strong>{startPermIndex}–{endPermIndex}</strong> of{" "}
                  <strong>{permanentDrivers.length}</strong> permanent drivers (Page {currentPermPage} of {totalPermPages})
                </>
              )}
            </span>

            <div className="pagination-controls-group">
              <button
                type="button"
                className="page-nav-btn"
                disabled={currentPermPage === 1 || permanentDrivers.length === 0}
                onClick={() => setCurrentPermPage((prev) => Math.max(prev - 1, 1))}
              >
                <ChevronLeft size={14} />
                <span>Previous</span>
              </button>

              {Array.from({ length: Math.min(totalPermPages, 5) }, (_, i) => {
                let pageNum = i + 1;
                if (totalPermPages > 5) {
                  if (currentPermPage > 3 && currentPermPage < totalPermPages - 2) {
                    pageNum = currentPermPage - 2 + i;
                  } else if (currentPermPage >= totalPermPages - 2) {
                    pageNum = totalPermPages - 4 + i;
                  }
                }
                return (
                  <button
                    key={pageNum}
                    type="button"
                    className={`page-num-btn ${currentPermPage === pageNum ? "active" : ""}`}
                    onClick={() => setCurrentPermPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                type="button"
                className="page-nav-btn"
                disabled={currentPermPage === totalPermPages || permanentDrivers.length === 0}
                onClick={() => setCurrentPermPage((prev) => Math.min(prev + 1, totalPermPages))}
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </section>

        {/* ====================================================================
            4. TEMPORARY DRIVERS SECTION
            ==================================================================== */}
        <section className="driver-section temp-section" aria-labelledby="temp-drivers-heading">
          <div className="driver-section-header">
            <div className="section-title-wrapper">
              <Users size={18} className="section-icon temp-icon" />
              <h2 id="temp-drivers-heading" className="driver-section-title">
                Temporary Drivers
              </h2>
              <span className="section-count-badge temp-badge">
                {temporaryDrivers.length} {temporaryDrivers.length === 1 ? "Driver" : "Drivers"}
              </span>
            </div>
          </div>

          <div className="view-driver-table-container">
            <table className="view-driver-table">
              <thead>
                <tr>
                  <th>Staff Code</th>
                  <th>Staff Name</th>
                  <th>Address</th>
                  <th>City</th>
                  <th>Mobile No</th>
                  <th style={{ textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="table-loading-cell">
                      <Loader2 size={20} className="spin-icon" />
                      <span>Loading temporary drivers...</span>
                    </td>
                  </tr>
                ) : paginatedTemporary.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="table-empty-cell">
                      <div className="empty-state-box">
                        <Users size={32} className="empty-state-icon" />
                        <p className="empty-state-title">No Temporary Drivers Found</p>
                        <p className="empty-state-desc">
                          {isAnyFilterActive
                            ? "No temporary driver records match your active search filters."
                            : "No temporary drivers registered in the system."}
                        </p>
                        {isAnyFilterActive && (
                          <button
                            type="button"
                            className="empty-state-reset-btn"
                            onClick={handleClearFilters}
                          >
                            Reset Filters
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedTemporary.map((driver) => {
                    const fullName = driver.staffname || driver.name || "Driver";
                    return (
                      <tr key={driver.staffcode}>
                        <td>
                          <span className="staff-code-badge temp">{driver.staffcode}</span>
                        </td>
                        <td>
                          <strong className="driver-name-text">{fullName}</strong>
                          {driver.email && (
                            <span className="driver-sub-email">{driver.email}</span>
                          )}
                        </td>
                        <td>{driver.streetname || "—"}</td>
                        <td>{driver.city || "—"}</td>
                        <td>
                          {driver.mobileno ? (
                            <span className="phone-text">{driver.mobileno}</span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <div className="table-actions-cell">
                            <button
                              type="button"
                              className="table-action-icon-btn action-edit-btn"
                              onClick={() => handleOpenEditModal(driver)}
                              title={`Edit details for ${fullName}`}
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              className="table-action-icon-btn action-delete-btn"
                              onClick={() => handleOpenDeleteDialog(driver)}
                              title={`Delete ${fullName}`}
                            >
                              <Trash2 size={14} />
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

          {/* Temporary Drivers Pagination */}
          <div className="pagination-footer">
            <span className="pagination-info-text">
              {temporaryDrivers.length === 0 ? (
                "Showing 0 temporary drivers"
              ) : (
                <>
                  Showing <strong>{startTempIndex}–{endTempIndex}</strong> of{" "}
                  <strong>{temporaryDrivers.length}</strong> temporary drivers (Page {currentTempPage} of {totalTempPages})
                </>
              )}
            </span>

            <div className="pagination-controls-group">
              <button
                type="button"
                className="page-nav-btn"
                disabled={currentTempPage === 1 || temporaryDrivers.length === 0}
                onClick={() => setCurrentTempPage((prev) => Math.max(prev - 1, 1))}
              >
                <ChevronLeft size={14} />
                <span>Previous</span>
              </button>

              {Array.from({ length: Math.min(totalTempPages, 5) }, (_, i) => {
                let pageNum = i + 1;
                if (totalTempPages > 5) {
                  if (currentTempPage > 3 && currentTempPage < totalTempPages - 2) {
                    pageNum = currentTempPage - 2 + i;
                  } else if (currentTempPage >= totalTempPages - 2) {
                    pageNum = totalTempPages - 4 + i;
                  }
                }
                return (
                  <button
                    key={pageNum}
                    type="button"
                    className={`page-num-btn ${currentTempPage === pageNum ? "active" : ""}`}
                    onClick={() => setCurrentTempPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                type="button"
                className="page-nav-btn"
                disabled={currentTempPage === totalTempPages || temporaryDrivers.length === 0}
                onClick={() => setCurrentTempPage((prev) => Math.min(prev + 1, totalTempPages))}
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* ====================================================================
          5. ADD / EDIT DRIVER MODAL DIALOG
          ==================================================================== */}
      <AddEditDriverModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setDriverToEdit(null);
        }}
        onSuccess={handleModalSuccess}
        driverToEdit={driverToEdit}
        vehicleIds={vehicleIds}
      />

      {/* ====================================================================
          6. DELETE CONFIRMATION MODAL DIALOG
          ==================================================================== */}
      {driverToDelete && (
        <div
          className="driver-modal-overlay"
          onClick={() => !isDeleting && setDriverToDelete(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="driver-delete-dialog"
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
          >
            <div className="delete-modal-icon-badge">
              <Trash2 size={24} />
            </div>
            <h3 className="delete-modal-title">Delete Driver Record?</h3>
            <p className="delete-modal-body">
              Are you sure you want to permanently delete{" "}
              <strong>
                {driverToDelete.staffname || driverToDelete.name || "Driver"}
              </strong>{" "}
              (Staff Code: <strong>{driverToDelete.staffcode}</strong>)? This action cannot be undone.
            </p>
            <div className="delete-modal-actions">
              <button
                type="button"
                className="driver-btn-cancel"
                onClick={() => setDriverToDelete(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="driver-btn-danger"
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
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewDriver;
