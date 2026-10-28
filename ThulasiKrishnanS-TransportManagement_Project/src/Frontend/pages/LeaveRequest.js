import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  RotateCcw,
  FileText,
  Calendar,
  Clock,
  Bus,
  User,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Check,
  X,
  ArrowLeft,
  History
} from "lucide-react";
import AssignTempDriverModal from "./DriverAllotment/AssignTempDriverModal";
import { exportLeaveRequestsToPDF } from "./ReportGenerator";
import { API_URL } from "../config";
import "../styles/LeaveRequest.css";

const LeaveRequest = () => {
  const navigate = useNavigate();

  // Mode check
  const [isDriver, setIsDriver] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Admin Data States
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [tempDrivers, setTempDrivers] = useState([]);

  // Driver Submission States
  const [driverLeaveRequests, setDriverLeaveRequests] = useState([]);
  const [formData, setFormData] = useState({
    reason: "",
    leaveDate: "",
    numOfDays: "1"
  });
  const [leaveType, setLeaveType] = useState("full");
  const [validationError, setValidationError] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Filter States for Admin View
  const [staffCodeFilter, setStaffCodeFilter] = useState("");
  const [staffNameFilter, setStaffNameFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Pagination for Admin View (Fixed 3 cards per page)
  const itemsPerPage = 3;
  const [currentPage, setCurrentPage] = useState(1);

  // Assign Temp Driver Modal States
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedLeaveRequest, setSelectedLeaveRequest] = useState(null);

  // Reject Confirmation Modal State
  const [requestToReject, setRequestToReject] = useState(null);
  const [isRejecting, setIsRejecting] = useState(false);

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

  // Initialize
  useEffect(() => {
    const initialize = async () => {
      try {
        const vehicleId = localStorage.getItem("vehicleId");
        setIsDriver(Boolean(vehicleId));

        if (!vehicleId) {
          // Admin View
          await Promise.all([fetchLeaveRequests(), fetchTemporaryDrivers()]);
        } else {
          // Driver View
          const driverResponse = await axios.get(`${API_URL}/api/driver/${vehicleId}`);
          const staffcode = driverResponse.data.staffcode;
          const leaveResponse = await axios.get(`${API_URL}/getDriverLeaveRequests/${staffcode}`);
          setDriverLeaveRequests(Array.isArray(leaveResponse.data) ? leaveResponse.data : []);
        }
      } catch (err) {
        console.error("Initialization error:", err);
        if (localStorage.getItem("vehicleId")) {
          showFlash("Failed to load driver leave requests.", "danger", "Connection Error");
        }
      } finally {
        setLoading(false);
      }
    };

    initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchLeaveRequests = async () => {
    try {
      setIsRefreshing(true);
      const response = await axios.get(`${API_URL}/getLeaveRequests`);
      setLeaveRequests(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Error fetching leave requests:", err);
      showFlash("Failed to load leave applications.", "danger", "Connection Error");
    } finally {
      setIsRefreshing(false);
    }
  };

  const fetchTemporaryDrivers = async () => {
    try {
      const response = await axios.get(`${API_URL}/getdrivers`);
      const list = Array.isArray(response.data) ? response.data : [];
      setTempDrivers(list.filter((d) => d.driver_type === "temporary"));
    } catch (err) {
      console.error("Error fetching temporary drivers:", err);
    }
  };

  // Admin Filter Logic
  const isAnyFilterActive = Boolean(staffCodeFilter || staffNameFilter || statusFilter);

  const handleClearFilters = () => {
    setStaffCodeFilter("");
    setStaffNameFilter("");
    setStatusFilter("");
    setCurrentPage(1);
  };

  const filteredRequests = useMemo(() => {
    return leaveRequests.filter((req) => {
      const sCode = String(req.staffcode || "");
      const sName = String(req.staffname || "").toLowerCase();
      const sStatus = String(req.status || "pending").toLowerCase();

      const matchesCode = !staffCodeFilter || sCode === staffCodeFilter;
      const matchesName = !staffNameFilter || sName === staffNameFilter.toLowerCase();
      const matchesStatus = !statusFilter || sStatus === statusFilter.toLowerCase();

      return matchesCode && matchesName && matchesStatus;
    });
  }, [leaveRequests, staffCodeFilter, staffNameFilter, statusFilter]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [staffCodeFilter, staffNameFilter, statusFilter]);

  // Unique options for dropdowns
  const uniqueStaffCodes = useMemo(() => {
    return [...new Set(leaveRequests.map((r) => r.staffcode).filter(Boolean))].sort();
  }, [leaveRequests]);

  const uniqueStaffNames = useMemo(() => {
    return [...new Set(leaveRequests.map((r) => r.staffname).filter(Boolean))].sort();
  }, [leaveRequests]);

  // Pagination Calculations
  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / itemsPerPage));
  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRequests.slice(start, start + itemsPerPage);
  }, [filteredRequests, currentPage, itemsPerPage]);

  const startIndex = filteredRequests.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, filteredRequests.length);

  // Approve & Reject Action Handlers
  const handleApprove = async (id, status) => {
    if (status === "approved") {
      const request = leaveRequests.find((req) => req.id === id);
      if (!request) {
        showFlash("Leave request details could not be loaded.", "danger", "Action Error");
        return;
      }

      const fallbackTempDrivers = tempDrivers.filter(
        (driver) => driver.driver_type === "temporary" || !driver.driver_type
      );

      try {
        const response = await axios.get(`${API_URL}/getAvailableTempDrivers/${request.leave_date}`);
        const availableDrivers = response.data || [];

        if (availableDrivers.length === 0) {
          showFlash(
            "No temporary drivers are available for this leave date. Cannot approve.",
            "danger",
            "No Temporary Driver"
          );
          return;
        }

        setTempDrivers(availableDrivers);
        setSelectedLeaveRequest(request);
        setIsAssignModalOpen(true);
      } catch (err) {
        if (fallbackTempDrivers.length === 0) {
          showFlash("No temporary drivers are available to assign.", "danger", "Unavailable");
          return;
        }

        setTempDrivers(fallbackTempDrivers);
        setSelectedLeaveRequest(request);
        setIsAssignModalOpen(true);
      }
      return;
    }
  };

  const handleOpenRejectDialog = (request) => {
    setRequestToReject(request);
  };

  const handleConfirmReject = async () => {
    if (!requestToReject) return;
    setIsRejecting(true);
    try {
      const response = await axios.put(`${API_URL}/approveLeaveRequest/${requestToReject.id}`, {
        status: "rejected"
      });
      if (response.data.success) {
        setLeaveRequests((prev) =>
          prev.map((req) =>
            req.id === requestToReject.id ? { ...req, status: "rejected" } : req
          )
        );
        showFlash(
          `Leave request for ${requestToReject.staffname || requestToReject.staffcode} was rejected.`,
          "danger",
          "Leave Rejected"
        );
        setRequestToReject(null);
      }
    } catch (err) {
      console.error("Error rejecting leave:", err);
      showFlash("Failed to reject leave request.", "danger", "Action Failed");
    } finally {
      setIsRejecting(false);
    }
  };

  const handleAssignTempDriver = async (tempDriverStaffCode, tempDriverEmail) => {
    if (!selectedLeaveRequest) return;

    try {
      const response = await axios.put(`${API_URL}/approveLeaveRequest/${selectedLeaveRequest.id}`, {
        status: "approved",
        tempDriverStaffCode,
        tempDriverEmail: tempDriverEmail || null,
        vehicleId: selectedLeaveRequest.vehicleid,
        leaveDate: selectedLeaveRequest.leave_date,
        permanentDriverStaffCode: selectedLeaveRequest.staffcode
      });

      if (response.data.success) {
        setLeaveRequests((prev) =>
          prev.map((req) =>
            req.id === selectedLeaveRequest.id ? { ...req, status: "approved" } : req
          )
        );
        setIsAssignModalOpen(false);
        setSelectedLeaveRequest(null);
        showFlash(
          response.data.message || "Temporary driver assigned and leave approved successfully!",
          "success",
          "Leave Approved"
        );
      }
    } catch (err) {
      showFlash(
        err.response?.data?.error || "Failed to approve and assign temporary driver.",
        "danger",
        "Approval Failed"
      );
    }
  };

  // Driver Mode Input & Submit
  const handleDriverInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "leaveType") {
      setLeaveType(value);
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    setValidationError("");
  };

  const handleDriverSubmit = async (e) => {
    e.preventDefault();
    setValidationError("");

    const now = new Date();
    const todayStr = now.toLocaleDateString("en-CA");
    const leaveDateStr = formData.leaveDate;

    if (leaveDateStr === todayStr) {
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      if (leaveType === "full" || leaveType === "half_morning") {
        if (currentMinutes >= 7 * 60) {
          setValidationError(
            "Full day or morning half-day leave can only be requested before 7:00 AM on the same day."
          );
          return;
        }
      } else if (leaveType === "half_afternoon") {
        if (currentMinutes >= 15 * 60) {
          setValidationError(
            "Afternoon half-day leave can only be requested before 3:00 PM on the same day."
          );
          return;
        }
      }
    }

    setSubmitLoading(true);

    try {
      const vehicleId = localStorage.getItem("vehicleId");
      const driverResponse = await axios.get(`${API_URL}/api/driver/${vehicleId}`);
      const staffcode = driverResponse.data.staffcode;

      const response = await axios.post(`${API_URL}/submitLeaveRequest`, {
        staffcode,
        leave_type: leaveType,
        num_days: parseFloat(formData.numOfDays),
        reason: formData.reason,
        leaveDate: formData.leaveDate
      });

      if (response.data.success) {
        showFlash("Leave request submitted successfully!", "success", "Submitted");
        setFormData({ reason: "", leaveDate: "", numOfDays: "1" });
        setLeaveType("full");
        // Refresh driver history
        const leaveResponse = await axios.get(`${API_URL}/getDriverLeaveRequests/${staffcode}`);
        setDriverLeaveRequests(Array.isArray(leaveResponse.data) ? leaveResponse.data : []);
      }
    } catch (err) {
      showFlash("Failed to submit leave request. Please try again.", "danger", "Submission Error");
    } finally {
      setSubmitLoading(false);
    }
  };

  // PDF Export
  const handleExportPDF = () => {
    if (!filteredRequests.length) return;
    exportLeaveRequestsToPDF(filteredRequests);
    showFlash("Leave requests report generated successfully!", "success", "PDF Generated");
  };

  if (loading) {
    return (
      <div className="leave-loading-screen">
        <Loader2 size={32} className="spin-icon" />
        <p>Loading leave applications...</p>
      </div>
    );
  }

  // ==========================================================================
  // DRIVER SUBMISSION MODE
  // ==========================================================================
  if (isDriver) {
    return (
      <div className="leave-master-container">
        <div className="leave-box-wrapper" style={{ maxWidth: "800px" }}>
          <div className="vm-breadcrumb-nav">
            <span className="link" onClick={() => navigate(-1)}>
              <ArrowLeft size={13} style={{ display: "inline", verticalAlign: "middle" }} /> Back
            </span>
            <span className="sep">/</span>
            <span className="current">Driver Portal</span>
            <span className="sep">/</span>
            <span className="current">Submit Leave Request</span>
          </div>

          <div className="vm-page-header">
            <div className="vm-header-left">
              <h1 className="vm-page-title">Submit Leave Request</h1>
              <p className="vm-page-subtitle">
                Apply for temporary absence and notify fleet management
              </p>
            </div>
          </div>

          {flashCard && (
            <aside className={`vm-flash-card vm-flash-card-${flashCard.type || "success"}`}>
              <div className="vm-flash-card-inner">
                <div className="vm-flash-card-badge">
                  {flashCard.type === "danger" ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
                </div>
                <div className="vm-flash-card-content">
                  <strong className="vm-flash-card-title">{flashCard.title}: </strong>
                  <span>{flashCard.message}</span>
                </div>
              </div>
            </aside>
          )}

          <div className="driver-submit-card">
            <form onSubmit={handleDriverSubmit} className="driver-leave-form">
              <div className="form-grid-2">
                <div className="driver-field-group">
                  <label htmlFor="leaveType">
                    Leave Type <span className="req">*</span>
                  </label>
                  <select
                    id="leaveType"
                    name="leaveType"
                    value={leaveType}
                    onChange={handleDriverInputChange}
                  >
                    <option value="full">Full Day Leave</option>
                    <option value="half_morning">Half Day (Morning Shift)</option>
                    <option value="half_afternoon">Half Day (Afternoon Shift)</option>
                  </select>
                </div>

                <div className="driver-field-group">
                  <label htmlFor="numOfDays">
                    Number of Days <span className="req">*</span>
                  </label>
                  <input
                    type="number"
                    id="numOfDays"
                    name="numOfDays"
                    value={formData.numOfDays}
                    onChange={handleDriverInputChange}
                    required
                    min="0.5"
                    step="0.5"
                    placeholder="1 or 0.5"
                  />
                </div>

                <div className="driver-field-group full-width">
                  <label htmlFor="leaveDate">
                    Start Date <span className="req">*</span>
                  </label>
                  <input
                    type="date"
                    id="leaveDate"
                    name="leaveDate"
                    value={formData.leaveDate}
                    onChange={handleDriverInputChange}
                    required
                    min={new Date().toISOString().split("T")[0]}
                  />
                </div>

                {formData.leaveDate && formData.numOfDays > 0 && (
                  <div className="leave-duration-preview full-width">
                    <Calendar size={15} />
                    <span>
                      <strong>Leave Period:</strong> {formData.numOfDays} day(s), starting{" "}
                      {new Date(formData.leaveDate).toLocaleDateString("en-IN", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        year: "numeric"
                      })}
                    </span>
                  </div>
                )}

                <div className="driver-field-group full-width">
                  <label htmlFor="reason">
                    Reason for Leave <span className="req">*</span>
                  </label>
                  <textarea
                    id="reason"
                    name="reason"
                    value={formData.reason}
                    onChange={handleDriverInputChange}
                    required
                    placeholder="Please specify a clear reason for your absence"
                    rows="3"
                  />
                </div>
              </div>

              {validationError && (
                <div className="leave-validation-alert">
                  <AlertCircle size={15} />
                  <span>{validationError}</span>
                </div>
              )}

              <div style={{ marginTop: "16px", display: "flex", gap: "12px" }}>
                <button
                  type="submit"
                  className="vm-btn-primary"
                  disabled={submitLoading || Boolean(validationError)}
                  style={{ height: "40px", padding: "0 22px" }}
                >
                  {submitLoading ? (
                    <>
                      <Loader2 size={15} className="spin-icon" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <span>Submit Leave Application</span>
                  )}
                </button>

                <button
                  type="button"
                  className="vm-btn-secondary"
                  onClick={() => setShowHistory(!showHistory)}
                  style={{ height: "40px" }}
                >
                  <History size={15} />
                  <span>{showHistory ? "Hide History" : "View Leave History"}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Leave History Table */}
          {showHistory && (
            <div className="driver-history-section" style={{ marginTop: "24px" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: "700", color: "#0f2744", marginBottom: "12px" }}>
                My Leave History
              </h3>
              {driverLeaveRequests.length === 0 ? (
                <p style={{ color: "#64748b", fontSize: "0.84rem" }}>No previous leave submissions recorded.</p>
              ) : (
                <div className="view-driver-table-container">
                  <table className="view-driver-table">
                    <thead>
                      <tr>
                        <th>Status</th>
                        <th>Leave Date</th>
                        <th>Submitted At</th>
                        <th>Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {driverLeaveRequests.map((req) => {
                        const st = String(req.status || "pending").toLowerCase();
                        return (
                          <tr key={req.id}>
                            <td>
                              <span className={`leave-status-badge status-${st}`}>
                                {st.charAt(0).toUpperCase() + st.slice(1)}
                              </span>
                            </td>
                            <td>{new Date(req.leave_date).toLocaleDateString("en-IN")}</td>
                            <td>{new Date(req.submitted_at).toLocaleString("en-IN")}</td>
                            <td>{req.reason}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==========================================================================
  // ADMIN REVIEW & MANAGEMENT MODE
  // ==========================================================================
  return (
    <div className="leave-master-container">
      <div className="leave-box-wrapper">
        {/* ====================================================================
            1. BREADCRUMBS & COMPACT PAGE HEADER
            ==================================================================== */}
        <nav className="vm-breadcrumb-nav" aria-label="Breadcrumb">
          <span className="link" onClick={() => navigate("/home")}>
            Dashboard
          </span>
          <span className="sep">/</span>
          <span className="link" onClick={() => navigate("/home/viewdriver")}>
            Driver Administration
          </span>
          <span className="sep">/</span>
          <span className="current">Leave Requests</span>
        </nav>

        <header className="vm-page-header">
          <div className="vm-header-left">
            <div className="vm-title-row">
              <h1 className="vm-page-title">Leave Requests</h1>
              <span className="vm-total-count-badge">
                {leaveRequests.length} Total Requests
              </span>
            </div>
            <p className="vm-page-subtitle">
              Review and manage driver leave applications and replacement assignments
            </p>
          </div>

          <div className="vm-header-actions">
            <button
              type="button"
              className="vm-btn-secondary"
              onClick={fetchLeaveRequests}
              disabled={isRefreshing}
              title="Refresh leave requests"
            >
              <RotateCcw size={15} className={isRefreshing ? "spin-icon" : ""} />
              <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
            </button>

            <button
              type="button"
              className="vm-btn-secondary vm-btn-pdf"
              onClick={handleExportPDF}
              disabled={filteredRequests.length === 0}
              title="Export filtered leave requests to PDF"
            >
              <FileText size={15} />
              <span>PDF Report</span>
            </button>
          </div>
        </header>

        {/* Flash Card Notification */}
        {flashCard && (
          <aside className={`vm-flash-card vm-flash-card-${flashCard.type || "success"}`}>
            <div className="vm-flash-card-inner">
              <div className="vm-flash-card-badge">
                {flashCard.type === "danger" ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
              </div>
              <div className="vm-flash-card-content">
                <strong className="vm-flash-card-title">{flashCard.title}: </strong>
                <span>{flashCard.message}</span>
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
            2. COMPACT AUTO-FILTERING TOOLBAR
            ==================================================================== */}
        <div className="fleet-filter-toolbar">
          {/* Filter 1: Driver ID */}
          <div className="fleet-filter-field">
            <label htmlFor="filter-leave-code">Driver ID</label>
            <select
              id="filter-leave-code"
              className="fleet-filter-select"
              value={staffCodeFilter}
              onChange={(e) => setStaffCodeFilter(e.target.value)}
            >
              <option value="">All Driver IDs</option>
              {uniqueStaffCodes.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>

          {/* Filter 2: Driver Name */}
          <div className="fleet-filter-field">
            <label htmlFor="filter-leave-name">Driver Name</label>
            <select
              id="filter-leave-name"
              className="fleet-filter-select"
              value={staffNameFilter}
              onChange={(e) => setStaffNameFilter(e.target.value)}
            >
              <option value="">All Driver Names</option>
              {uniqueStaffNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Filter 3: Status */}
          <div className="fleet-filter-field">
            <label htmlFor="filter-leave-status">Status</label>
            <select
              id="filter-leave-status"
              className="fleet-filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Action: Clear Filters */}
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
            3. LEAVE REQUESTS PRESENTATION (Responsive Cards Grid)
            ==================================================================== */}
        {filteredRequests.length === 0 ? (
          <div className="leave-empty-container">
            <Calendar size={36} className="empty-state-icon" />
            <p className="empty-state-title">No Leave Requests Found</p>
            <p className="empty-state-desc">
              {isAnyFilterActive
                ? "No leave applications match your active filter criteria."
                : "No driver leave applications have been submitted yet."}
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
        ) : (
          <div className="leave-requests-grid">
            {paginatedRequests.map((req) => {
              const reqStatus = String(req.status || "pending").toLowerCase();
              const isPending = reqStatus === "pending";
              const formattedDate = req.leave_date
                ? new Date(req.leave_date).toLocaleDateString("en-IN", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    year: "numeric"
                  })
                : "Unspecified";

              const submittedTime = req.submitted_at
                ? new Date(req.submitted_at).toLocaleString("en-IN", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit"
                  })
                : "—";

              return (
                <div key={req.id} className="leave-card">
                  {/* Card Header */}
                  <div className="leave-card-header">
                    <div className="leave-driver-info">
                      <div className="leave-driver-badge">
                        <User size={16} />
                      </div>
                      <div>
                        <h3 className="leave-driver-name">
                          {req.staffname || req.staffcode || "Driver"}
                        </h3>
                        <span className="leave-staff-code">
                          ID: {req.staffcode}
                        </span>
                      </div>
                    </div>
                    <span className={`leave-status-badge status-${reqStatus}`}>
                      {reqStatus.charAt(0).toUpperCase() + reqStatus.slice(1)}
                    </span>
                  </div>

                  {/* Card Body Details */}
                  <div className="leave-card-body">
                    <div className="leave-meta-row">
                      <div className="leave-meta-item">
                        <Calendar size={13} className="meta-icon" />
                        <span>
                          <strong>Leave Date:</strong> {formattedDate}
                        </span>
                      </div>
                      <div className="leave-meta-item">
                        <Bus size={13} className="meta-icon" />
                        <span>
                          <strong>Vehicle:</strong>{" "}
                          {req.vehicleid ? (
                            <span className="vehicle-tag">Vehicle #{req.vehicleid}</span>
                          ) : (
                            <span className="unassigned-tag">Unassigned</span>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="leave-reason-box">
                      <strong className="reason-label">Reason:</strong>
                      <p className="reason-text">{req.reason || "No reason provided."}</p>
                    </div>

                    <div className="leave-timestamp-row">
                      <Clock size={12} />
                      <span>Submitted: {submittedTime}</span>
                    </div>
                  </div>

                  {/* Card Actions (For Pending Requests) */}
                  {isPending && (
                    <div className="leave-card-actions">
                      <button
                        type="button"
                        className="leave-btn-approve"
                        onClick={() => handleApprove(req.id, "approved")}
                        title="Assign temporary driver and approve leave"
                      >
                        <Check size={14} />
                        <span>Approve</span>
                      </button>
                      <button
                        type="button"
                        className="leave-btn-reject"
                        onClick={() => handleOpenRejectDialog(req)}
                        title="Reject leave application"
                      >
                        <X size={14} />
                        <span>Reject</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ====================================================================
            4. PAGINATION FOOTER
            ==================================================================== */}
        <div className="pagination-footer">
          <span className="pagination-info-text">
            {filteredRequests.length === 0 ? (
              "Showing 0 requests"
            ) : (
              <>
                Showing <strong>{startIndex}–{endIndex}</strong> of{" "}
                <strong>{filteredRequests.length}</strong> leave requests (Page {currentPage} of {totalPages})
              </>
            )}
          </span>

          <div className="pagination-controls-group">
            <button
              type="button"
              className="page-nav-btn"
              disabled={currentPage === 1 || filteredRequests.length === 0}
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            >
              <ChevronLeft size={14} />
              <span>Previous</span>
            </button>

            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageNum = i + 1;
              if (totalPages > 5) {
                if (currentPage > 3 && currentPage < totalPages - 2) {
                  pageNum = currentPage - 2 + i;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                }
              }
              return (
                <button
                  key={pageNum}
                  type="button"
                  className={`page-num-btn ${currentPage === pageNum ? "active" : ""}`}
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              type="button"
              className="page-nav-btn"
              disabled={currentPage === totalPages || filteredRequests.length === 0}
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            >
              <span>Next</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ====================================================================
          5. ASSIGN TEMPORARY DRIVER MODAL
          ==================================================================== */}
      <AssignTempDriverModal
        isOpen={isAssignModalOpen}
        onClose={() => {
          setIsAssignModalOpen(false);
          setSelectedLeaveRequest(null);
          fetchTemporaryDrivers();
        }}
        onConfirm={handleAssignTempDriver}
        availableTempDrivers={tempDrivers}
        leaveRequestDetails={selectedLeaveRequest}
      />

      {/* ====================================================================
          6. REJECT CONFIRMATION MODAL
          ==================================================================== */}
      {requestToReject && (
        <div
          className="driver-modal-overlay"
          onClick={() => !isRejecting && setRequestToReject(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="driver-delete-dialog"
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
          >
            <div className="delete-modal-icon-badge">
              <XCircle size={24} />
            </div>
            <h3 className="delete-modal-title">Reject Leave Application?</h3>
            <p className="delete-modal-body">
              Are you sure you want to reject the leave request for{" "}
              <strong>{requestToReject.staffname || requestToReject.staffcode}</strong> on{" "}
              <strong>
                {new Date(requestToReject.leave_date).toLocaleDateString("en-IN")}
              </strong>
              ?
            </p>
            <div className="delete-modal-actions">
              <button
                type="button"
                className="driver-btn-cancel"
                onClick={() => setRequestToReject(null)}
                disabled={isRejecting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="driver-btn-danger"
                onClick={handleConfirmReject}
                disabled={isRejecting}
              >
                {isRejecting ? (
                  <>
                    <Loader2 size={15} className="spin-icon" />
                    <span>Rejecting...</span>
                  </>
                ) : (
                  <>
                    <X size={15} />
                    <span>Confirm Rejection</span>
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

export default LeaveRequest;
