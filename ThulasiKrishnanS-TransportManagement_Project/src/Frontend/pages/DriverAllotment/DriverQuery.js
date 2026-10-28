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
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Check,
  X,
  ArrowLeft,
  MessageSquare,
  Send,
  HelpCircle
} from "lucide-react";
import { exportDriverQueriesToPDF } from "../ReportGenerator";
import { API_URL } from "../../config";
import DriverPageHeader from "../../components/DriverPageHeader";
import "../../styles/DriverQuery.css";

const DriverQuery = () => {
  const navigate = useNavigate();

  // Mode & Loading States
  const [isDriver, setIsDriver] = useState(false);
  const [driverStaffCode, setDriverStaffCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Queries Data
  const [queries, setQueries] = useState([]);

  // Driver Submission States
  const [driverQueries, setDriverQueries] = useState([]);
  const [queryText, setQueryText] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [driverTab, setDriverTab] = useState("submit"); // 'submit' or 'history'

  // Admin Filter States
  const [staffCodeFilter, setStaffCodeFilter] = useState("");
  const [staffNameFilter, setStaffNameFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Pagination for Admin View (Fixed 3 cards per page)
  const itemsPerPage = 3;
  const [currentPage, setCurrentPage] = useState(1);

  // Resolve Confirmation Dialog State
  const [queryToResolve, setQueryToResolve] = useState(null);
  const [isResolving, setIsResolving] = useState(false);

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
        const isDriverUser = Boolean(vehicleId);
        setIsDriver(isDriverUser);

        if (!isDriverUser) {
          // Admin View: Fetch all driver queries
          await fetchAllQueries();
        } else {
          // Driver View: Fetch queries submitted by this driver
          const driverResponse = await axios.get(`${API_URL}/api/driver/${vehicleId}`);
          const staffcode = driverResponse.data?.staffcode;
          setDriverStaffCode(staffcode);

          if (staffcode) {
            const queryResponse = await axios.get(`${API_URL}/getDriverQueriesByStaffcode/${staffcode}`);
            setDriverQueries(Array.isArray(queryResponse.data) ? queryResponse.data : []);
          }
        }
      } catch (err) {
        console.error("Initialization error:", err);
        setError("Failed to initialize driver queries. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch all queries (Admin)
  const fetchAllQueries = async () => {
    try {
      setIsRefreshing(true);
      const response = await axios.get(`${API_URL}/getDriverQueries`);
      setQueries(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Error fetching driver queries:", err);
      showFlash("Failed to fetch driver queries from server.", "danger", "Connection Error");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Driver Submission Handler
  const handleDriverSubmit = async (e) => {
    e.preventDefault();
    if (!queryText.trim()) {
      showFlash("Please provide your query message before submitting.", "danger", "Required Field");
      return;
    }

    setSubmitLoading(true);
    try {
      const vehicleId = localStorage.getItem("vehicleId");
      let staffcode = driverStaffCode;

      if (!staffcode) {
        const driverResponse = await axios.get(`${API_URL}/api/driver/${vehicleId}`);
        staffcode = driverResponse.data?.staffcode;
        setDriverStaffCode(staffcode);
      }

      const response = await axios.post(`${API_URL}/submitDriverQuery`, {
        staffcode,
        queryText: queryText.trim()
      });

      if (response.data.success) {
        showFlash("Your query has been submitted to transport administration.", "success", "Query Submitted");
        setQueryText("");

        // Refresh driver's query history
        const refreshed = await axios.get(`${API_URL}/getDriverQueriesByStaffcode/${staffcode}`);
        setDriverQueries(Array.isArray(refreshed.data) ? refreshed.data : []);
        setDriverTab("history");
      } else {
        showFlash(response.data.message || "Failed to submit query.", "danger");
      }
    } catch (err) {
      console.error("Error submitting query:", err);
      showFlash("Failed to submit query. Please try again.", "danger", "Submission Error");
    } finally {
      setSubmitLoading(false);
    }
  };

  // Resolve Handler (Admin)
  const handleConfirmResolve = async () => {
    if (!queryToResolve) return;

    setIsResolving(true);
    try {
      const response = await axios.put(`${API_URL}/updateDriverQueryStatus/${queryToResolve.id}`, {
        status: "resolved"
      });

      if (response.data.success) {
        showFlash(`Query from ${queryToResolve.staffname || queryToResolve.staffcode} marked as resolved.`, "success", "Query Resolved");
        // Update local list
        setQueries((prev) =>
          prev.map((q) => (q.id === queryToResolve.id ? { ...q, status: "resolved" } : q))
        );
        setQueryToResolve(null);
      } else {
        showFlash("Failed to update query status.", "danger");
      }
    } catch (err) {
      console.error("Error resolving query:", err);
      showFlash("Failed to resolve driver query. Please try again.", "danger", "Update Error");
    } finally {
      setIsResolving(false);
    }
  };

  // Filter options
  const uniqueStaffCodes = useMemo(() => {
    return Array.from(new Set(queries.map((q) => q.staffcode).filter(Boolean))).sort();
  }, [queries]);

  const uniqueStaffNames = useMemo(() => {
    return Array.from(new Set(queries.map((q) => q.staffname).filter(Boolean))).sort();
  }, [queries]);

  // Filter queries
  const filteredQueries = useMemo(() => {
    return queries.filter((q) => {
      const matchCode = staffCodeFilter === "" || q.staffcode === staffCodeFilter;
      const matchName = staffNameFilter === "" || q.staffname === staffNameFilter;
      const matchStatus = statusFilter === "" || (q.status || "pending").toLowerCase() === statusFilter.toLowerCase();
      return matchCode && matchName && matchStatus;
    });
  }, [queries, staffCodeFilter, staffNameFilter, statusFilter]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [staffCodeFilter, staffNameFilter, statusFilter]);

  // Paginated queries
  const totalPages = Math.max(1, Math.ceil(filteredQueries.length / itemsPerPage));
  const paginatedQueries = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredQueries.slice(start, start + itemsPerPage);
  }, [filteredQueries, currentPage, itemsPerPage]);

  const isFiltersActive = staffCodeFilter !== "" || staffNameFilter !== "" || statusFilter !== "";

  const handleClearFilters = () => {
    setStaffCodeFilter("");
    setStaffNameFilter("");
    setStatusFilter("");
    setCurrentPage(1);
  };

  // Stats calculation
  const stats = useMemo(() => {
    const total = queries.length;
    const pending = queries.filter((q) => (q.status || "pending").toLowerCase() === "pending").length;
    const resolved = queries.filter((q) => (q.status || "").toLowerCase() === "resolved").length;
    return { total, pending, resolved };
  }, [queries]);

  // Loading Screen
  if (loading) {
    return (
      <div className="driver-unified-loading">
        <Loader2 className="spinner" size={32} />
        <span>Loading Driver Queries...</span>
      </div>
    );
  }

  // Error Screen
  if (error && !queries.length && !driverQueries.length) {
    return (
      <div className="driver-unified-error">
        <AlertCircle size={36} color="#dc2626" />
        <h3>Failed to Load Data</h3>
        <p>{error}</p>
        <button
          className="driver-btn-secondary"
          onClick={() => window.location.reload()}
          style={{ marginTop: "14px" }}
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="unified-driver-page">
      {/* 3-Second Flash Notification */}
      {flashCard && (
        <div className={`driver-flash-card ${flashCard.type}`} role="alert">
          <div className="flash-card-indicator" />
          <div className="flash-card-content">
            <div className="flash-card-header">
              <span className="flash-card-title">{flashCard.title}</span>
              <button
                type="button"
                className="flash-card-dismiss"
                onClick={() => setFlashCard(null)}
                aria-label="Close notification"
              >
                <X size={14} />
              </button>
            </div>
            <p className="flash-card-message">{flashCard.message}</p>
          </div>
        </div>
      )}

      {/* Driver View (Submit Query & History) */}
      {isDriver ? (
        <div className="driver-portal-submission-wrap">
          <DriverPageHeader />

          <div className="driver-portal-nav-bar">
            <button
              type="button"
              className="driver-btn-secondary"
              onClick={() => navigate(-1)}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>
            <div className="driver-portal-tabs">
              <button
                type="button"
                className={`driver-tab-btn ${driverTab === "submit" ? "active" : ""}`}
                onClick={() => setDriverTab("submit")}
              >
                <Send size={15} />
                <span>Submit Query</span>
              </button>
              <button
                type="button"
                className={`driver-tab-btn ${driverTab === "history" ? "active" : ""}`}
                onClick={() => setDriverTab("history")}
              >
                <MessageSquare size={15} />
                <span>My Queries ({driverQueries.length})</span>
              </button>
            </div>
          </div>

          {driverTab === "submit" ? (
            <div className="driver-portal-form-card">
              <div className="portal-form-header">
                <h2>Driver Assistance & Query</h2>
                <p>Have an inquiry, vehicle issue, route question, or assistance request? Submit your query to transport dispatch below.</p>
              </div>

              <form onSubmit={handleDriverSubmit} className="driver-query-portal-form">
                <div className="driver-form-group">
                  <label htmlFor="portalQueryText">
                    Your Query / Message <span className="req-star">*</span>
                  </label>
                  <textarea
                    id="portalQueryText"
                    rows="5"
                    className="driver-form-control driver-textarea"
                    placeholder="Enter detailed description of your query, issue, or question..."
                    value={queryText}
                    onChange={(e) => setQueryText(e.target.value)}
                    required
                  />
                  <span className="driver-field-hint">
                    {queryText.length} characters entered. Keep your message clear and specific.
                  </span>
                </div>

                <div className="portal-form-actions">
                  <button
                    type="submit"
                    className="driver-btn-primary driver-btn-submit"
                    disabled={submitLoading || !queryText.trim()}
                  >
                    {submitLoading ? (
                      <>
                        <Loader2 size={16} className="spinner" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <Send size={16} />
                        <span>Submit Query</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="driver-portal-history-card">
              <div className="portal-form-header">
                <h2>Your Query History</h2>
                <p>Track the real-time status of your queries submitted to management.</p>
              </div>

              {driverQueries.length === 0 ? (
                <div className="driver-empty-state">
                  <HelpCircle size={40} className="empty-icon" />
                  <h4>No Queries Submitted</h4>
                  <p>You have not submitted any queries yet.</p>
                  <button
                    type="button"
                    className="driver-btn-primary"
                    onClick={() => setDriverTab("submit")}
                    style={{ marginTop: "12px" }}
                  >
                    Submit a Query
                  </button>
                </div>
              ) : (
                <div className="driver-queries-history-list">
                  {driverQueries.map((item) => {
                    const isPending = (item.status || "pending").toLowerCase() === "pending";
                    return (
                      <div key={item.id} className="driver-history-query-card">
                        <div className="history-query-top">
                          <span className={`status-pill ${isPending ? "status-pending" : "status-approved"}`}>
                            {isPending ? (
                              <>
                                <Clock size={12} />
                                <span>Pending</span>
                              </>
                            ) : (
                              <>
                                <Check size={12} />
                                <span>Resolved</span>
                              </>
                            )}
                          </span>
                          <span className="history-query-date">
                            <Calendar size={13} />
                            {item.submitted_at ? new Date(item.submitted_at).toLocaleString() : "Recently"}
                          </span>
                        </div>
                        <div className="history-query-body">
                          <p className="history-query-text">{item.query_text}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Admin View */
        <div className="unified-master-container">
          {/* Header Card */}
          <div className="master-header-card">
            <div className="master-header-left">
              <div className="master-breadcrumb">
                <span className="breadcrumb-muted">Dashboard</span>
                <span className="breadcrumb-sep">/</span>
                <span className="breadcrumb-muted">Driver Administration</span>
                <span className="breadcrumb-sep">/</span>
                <span className="breadcrumb-current">Driver Queries</span>
              </div>
              <div className="master-title-row">
                <h1 className="master-title">Driver Queries</h1>
                <span className="driver-count-badge">
                  Total: {queries.length} {queries.length === 1 ? "Query" : "Queries"}
                </span>
                {stats.pending > 0 && (
                  <span className="driver-pending-badge">
                    {stats.pending} Pending
                  </span>
                )}
              </div>
              <p className="master-subtitle">
                Review, track, and resolve queries and assistance requests submitted by drivers.
              </p>
            </div>

            <div className="master-header-actions">
              <button
                type="button"
                className="driver-btn-secondary"
                onClick={fetchAllQueries}
                disabled={isRefreshing}
                title="Refresh query records"
              >
                <RotateCcw size={15} className={isRefreshing ? "spinner" : ""} />
                <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
              </button>

              <button
                type="button"
                className="driver-btn-secondary"
                onClick={() => exportDriverQueriesToPDF(filteredQueries)}
                title="Export filtered queries to PDF report"
              >
                <FileText size={15} />
                <span>PDF Report</span>
              </button>
            </div>
          </div>

          {/* Filters Toolbar */}
          <div className="master-filter-card">
            <div className="driver-filter-row">
              <div className="driver-filter-group">
                <label htmlFor="filterStaffCode" className="driver-filter-label">
                  Driver ID
                </label>
                <select
                  id="filterStaffCode"
                  className="driver-filter-select"
                  value={staffCodeFilter}
                  onChange={(e) => setStaffCodeFilter(e.target.value)}
                >
                  <option value="">All</option>
                  {uniqueStaffCodes.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              </div>

              <div className="driver-filter-group">
                <label htmlFor="filterStaffName" className="driver-filter-label">
                  Driver Name
                </label>
                <select
                  id="filterStaffName"
                  className="driver-filter-select"
                  value={staffNameFilter}
                  onChange={(e) => setStaffNameFilter(e.target.value)}
                >
                  <option value="">All</option>
                  {uniqueStaffNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="driver-filter-group filter-actions-group" style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                <button
                  type="button"
                  className="driver-btn-secondary"
                  onClick={() => exportDriverQueriesToPDF(filteredQueries)}
                  title="Generate PDF Report"
                >
                  <FileText size={15} />
                  <span>Generate PDF Report</span>
                </button>

                {isFiltersActive && (
                  <button
                    type="button"
                    className="driver-btn-clear"
                    onClick={handleClearFilters}
                    title="Clear Filters"
                  >
                    <X size={14} />
                    <span>Clear Filters</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Queries Grid */}
          <div className="master-content-panel">
            {filteredQueries.length === 0 ? (
              <div className="driver-empty-state">
                <MessageSquare size={44} className="empty-icon" />
                <h4>No Driver Queries Found</h4>
                <p>
                  {isFiltersActive
                    ? "No queries match the selected filters. Try clearing your filters."
                    : "No driver queries found."}
                </p>
                {isFiltersActive && (
                  <button
                    type="button"
                    className="driver-btn-secondary"
                    onClick={handleClearFilters}
                    style={{ marginTop: "12px" }}
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="leave-requests-grid">
                  {paginatedQueries.map((query) => {
                    const isPending = (query.status || "pending").toLowerCase() === "pending";
                    const submittedTime = query.submitted_at
                      ? new Date(query.submitted_at).toLocaleString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit"
                        })
                      : "—";

                    return (
                      <div key={query.id} className="leave-card">
                        {/* Card Header */}
                        <div className="leave-card-header">
                          <div className="leave-driver-info">
                            <div className="leave-driver-badge">
                              <User size={16} />
                            </div>
                            <div>
                              <h3 className="leave-driver-name">
                                {query.staffname || query.staffcode || "Driver"}
                              </h3>
                              <span className="leave-staff-code">
                                ID: {query.staffcode}
                              </span>
                            </div>
                          </div>
                          <span
                            className={`leave-status-badge status-${
                              isPending ? "pending" : "approved"
                            }`}
                          >
                            {isPending ? "PENDING" : "RESOLVED"}
                          </span>
                        </div>

                        {/* Card Body Details */}
                        <div className="leave-card-body">
                          <div className="leave-meta-row">
                            <div className="leave-meta-item">
                              <Bus size={13} className="meta-icon" />
                              <span>
                                <strong>Vehicle:</strong>{" "}
                                {query.vehicleid ? (
                                  <span className="vehicle-tag">Vehicle #{query.vehicleid}</span>
                                ) : (
                                  <span className="unassigned-tag">Unassigned</span>
                                )}
                              </span>
                            </div>
                          </div>

                          <div className="leave-reason-box">
                            <strong className="reason-label">QUERY:</strong>
                            <p className="reason-text">{query.query_text || "No query text provided."}</p>
                          </div>

                          <div className="leave-timestamp-row">
                            <Clock size={12} />
                            <span>Submitted: {submittedTime}</span>
                          </div>
                        </div>

                        {/* Card Actions (For Pending Queries) */}
                        {isPending && (
                          <div className="leave-card-actions">
                            <button
                              type="button"
                              className="leave-btn-approve"
                              style={{ width: "100%" }}
                              onClick={() => setQueryToResolve(query)}
                              title="Resolve driver query"
                            >
                              <Check size={14} />
                              <span>Resolve</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Compact Pagination Bar */}
                {totalPages > 1 && (
                  <div className="driver-pagination-bar">
                    <span className="pagination-info">
                      Showing {(currentPage - 1) * itemsPerPage + 1}–
                      {Math.min(currentPage * itemsPerPage, filteredQueries.length)} of{" "}
                      {filteredQueries.length} queries (Page {currentPage} of {totalPages})
                    </span>

                    <div className="pagination-controls">
                      <button
                        type="button"
                        className="pagination-btn"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        aria-label="Previous Page"
                      >
                        <ChevronLeft size={16} />
                        <span>Prev</span>
                      </button>

                      <div className="pagination-pages">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <button
                            key={page}
                            type="button"
                            className={`pagination-num-btn ${page === currentPage ? "active" : ""}`}
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        className="pagination-btn"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        aria-label="Next Page"
                      >
                        <span>Next</span>
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Resolve Confirmation Modal Dialog */}
      {queryToResolve && (
        <div className="driver-modal-overlay" role="dialog" aria-modal="true">
          <div className="driver-modal-card confirm-modal-card">
            <div className="driver-modal-header">
              <div className="modal-title-block">
                <h3 className="driver-modal-title">Resolve Driver Query</h3>
                <p className="driver-modal-subtitle">
                  Confirm resolution for driver inquiry
                </p>
              </div>
              <button
                type="button"
                className="driver-modal-close"
                onClick={() => setQueryToResolve(null)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="driver-modal-body">
              <div className="confirm-prompt-box">
                <CheckCircle2 size={36} color="#15803d" />
                <p className="confirm-text">
                  Are you sure you want to mark this query from{" "}
                  <strong>{queryToResolve.staffname || queryToResolve.staffcode}</strong> as resolved?
                </p>
              </div>

              <div className="confirm-query-details">
                <div className="detail-item">
                  <span className="detail-label">Driver Code:</span>
                  <span className="detail-value">{queryToResolve.staffcode}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Vehicle:</span>
                  <span className="detail-value">{queryToResolve.vehicleid || "N/A"}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Query:</span>
                  <span className="detail-value query-excerpt">
                    "{queryToResolve.query_text}"
                  </span>
                </div>
              </div>
            </div>

            <div className="driver-modal-footer">
              <button
                type="button"
                className="driver-btn-secondary"
                onClick={() => setQueryToResolve(null)}
                disabled={isResolving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="driver-btn-primary driver-btn-submit"
                onClick={handleConfirmResolve}
                disabled={isResolving}
              >
                {isResolving ? (
                  <>
                    <Loader2 size={16} className="spinner" />
                    <span>Resolving...</span>
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    <span>Confirm Resolve</span>
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

export default DriverQuery;
