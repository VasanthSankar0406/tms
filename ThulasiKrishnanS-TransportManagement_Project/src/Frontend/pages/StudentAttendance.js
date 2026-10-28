import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Calendar,
  Users,
  ClipboardCheck,
  Bus,
  Route as RouteIcon,
  FileText,
  RotateCcw,
  Filter,
  Pencil,
  Trash2,
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Clock
} from "lucide-react";
import { exportStudentAttendanceToPDF } from "./ReportGenerator";
import { API_URL } from "../config";
import "../styles/StudentAttendance.css";
import EditStudentAttendance from "./StudentAttendance/EditStudentAttendance";

const StudentAttendance = () => {
  const navigate = useNavigate();

  // Master Data & Filter States
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dateValidationError, setDateValidationError] = useState("");

  // Pagination State (Fixed 5 records per page, matching portal master pages)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Edit & Delete Modal States
  const [editingRecord, setEditingRecord] = useState(null);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 3-Second Auto-Dismissing Flash Notification
  const [flashCard, setFlashCard] = useState(null);
  const flashTimerRef = useRef(null);

  const showFlash = (message, type = "success", title = "") => {
    if (flashTimerRef.current) {
      clearTimeout(flashTimerRef.current);
    }
    setFlashCard({ message, type, title });
    flashTimerRef.current = setTimeout(() => {
      setFlashCard(null);
    }, 3000);
  };

  useEffect(() => {
    fetchAttendanceData();
    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, []);

  const fetchAttendanceData = async (start = "", end = "") => {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (start && end) {
        params.startDate = start;
        params.endDate = end;
      }
      const response = await axios.get(`${API_URL}/getStudentCounts`, { params });
      const records = Array.isArray(response.data) ? response.data : [];
      setAttendanceData(records);
    } catch (err) {
      console.error("Error fetching attendance data:", err);
      setError("Failed to fetch attendance data. Please verify your connection.");
    } finally {
      setLoading(false);
    }
  };

  // Date Filter Validation & Handler
  const handleApplyFilter = (e) => {
    if (e) e.preventDefault();
    setDateValidationError("");

    if (startDate && endDate) {
      const s = new Date(startDate);
      const eDate = new Date(endDate);
      if (s > eDate) {
        setDateValidationError("Start Date cannot be later than End Date");
        return;
      }
    }

    setCurrentPage(1);
    fetchAttendanceData(startDate, endDate);
  };

  const handleClearFilter = () => {
    setStartDate("");
    setEndDate("");
    setDateValidationError("");
    setCurrentPage(1);
    fetchAttendanceData();
  };

  // Summary Metrics Computation (Dynamic from actual records)
  const summaryMetrics = useMemo(() => {
    const totalRecords = attendanceData.length;
    const totalStudents = attendanceData.reduce(
      (sum, r) => sum + (Number(r.student_count) || 0),
      0
    );

    let latestDateStr = "No Submissions";
    if (totalRecords > 0) {
      const sortedByDate = [...attendanceData].sort((a, b) => {
        const da = new Date(a.attendance_date || a.timestamp || 0);
        const db = new Date(b.attendance_date || b.timestamp || 0);
        return db - da;
      });
      const topDate = sortedByDate[0].attendance_date || sortedByDate[0].timestamp;
      if (topDate) {
        latestDateStr = new Date(topDate).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric"
        });
      }
    }

    return { totalRecords, totalStudents, latestDateStr };
  }, [attendanceData]);

  // Edit Action Handlers
  const handleEdit = (record) => {
    setEditingRecord(record);
  };

  const handleSaveEdit = async (updatedRecord) => {
    try {
      await axios.put(`${API_URL}/updateStudentCount/${updatedRecord.id}`, updatedRecord);
      setEditingRecord(null);
      showFlash("Attendance record updated successfully!", "success", "Updated");
      fetchAttendanceData(startDate, endDate);
    } catch (err) {
      console.error("Error updating attendance record:", err);
      showFlash("Failed to update attendance record. Please try again.", "danger", "Error");
    }
  };

  const handleCancelEdit = () => {
    setEditingRecord(null);
  };

  // Delete Action Handlers (via clean modal dialog)
  const handleOpenDelete = (record) => {
    setRecordToDelete(record);
  };

  const handleConfirmDelete = async () => {
    if (!recordToDelete) return;
    setIsDeleting(true);
    try {
      await axios.delete(`${API_URL}/deleteStudentCount/${recordToDelete.id}`);
      showFlash(
        `Attendance record for Vehicle #${recordToDelete.vehicleid} was deleted.`,
        "success",
        "Deleted"
      );
      setRecordToDelete(null);
      fetchAttendanceData(startDate, endDate);
    } catch (err) {
      console.error("Error deleting attendance record:", err);
      showFlash("Failed to delete attendance record.", "danger", "Error");
    } finally {
      setIsDeleting(false);
    }
  };

  // Pagination Calculations
  const totalPages = Math.max(1, Math.ceil(attendanceData.length / itemsPerPage));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return attendanceData.slice(start, start + itemsPerPage);
  }, [attendanceData, currentPage, itemsPerPage]);

  const startEntryIndex = attendanceData.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endEntryIndex = Math.min(currentPage * itemsPerPage, attendanceData.length);

  return (
    <div className="attendance-master-container">
      <div className="attendance-box-wrapper">
        {/* ====================================================================
            1. BREADCRUMBS & COMPACT PAGE HEADER
            ==================================================================== */}
        <nav className="vm-breadcrumb-nav" aria-label="Breadcrumb">
          <span className="link" onClick={() => navigate("/home")}>
            Dashboard
          </span>
          <span className="sep">/</span>
          <span className="link" onClick={() => navigate("/home/viewtraveller")}>
            Traveller & Passenger
          </span>
          <span className="sep">/</span>
          <span className="current">Student Attendance</span>
        </nav>

        <header className="vm-page-header">
          <div className="vm-header-left">
            <div className="vm-title-row">
              <h1 className="vm-page-title">Student Attendance</h1>
              <span className="vm-total-count-badge">
                {attendanceData.length} Records
              </span>
            </div>
            <p className="vm-page-subtitle">
              View attendance submissions and filter records by date
            </p>
          </div>

          <div className="vm-header-actions">
            <button
              type="button"
              className="vm-btn-secondary"
              onClick={() => fetchAttendanceData(startDate, endDate)}
              title="Refresh attendance records"
              disabled={loading}
            >
              <RotateCcw size={14} className={loading ? "spin-icon" : ""} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              className="vm-btn-secondary vm-btn-pdf"
              onClick={() => exportStudentAttendanceToPDF(attendanceData, startDate, endDate)}
              disabled={attendanceData.length === 0 || loading}
              title="Generate comprehensive PDF attendance report"
            >
              <FileText size={15} />
              <span>Generate PDF</span>
            </button>
          </div>
        </header>

        {/* 3-Second Flash Notification */}
        {flashCard && (
          <div className={`vm-flash-card vm-flash-card-${flashCard.type}`} role="alert">
            <div className="vm-flash-card-inner">
              <div className="vm-flash-card-badge">
                {flashCard.type === "success" && <CheckCircle2 size={18} />}
                {flashCard.type === "danger" && <AlertCircle size={18} />}
              </div>
              <div className="vm-flash-card-content">
                {flashCard.title && (
                  <strong className="vm-flash-card-title">{flashCard.title}: </strong>
                )}
                <span>{flashCard.message}</span>
              </div>
              <button
                type="button"
                className="vm-flash-card-close"
                onClick={() => setFlashCard(null)}
                aria-label="Dismiss alert"
              >
                <X size={14} />
              </button>
            </div>
            <div className="vm-flash-card-progress">
              <div className="vm-flash-card-progress-bar" />
            </div>
          </div>
        )}

        {/* ====================================================================
            2. ATTENDANCE SUMMARY STATS
            ==================================================================== */}
        <section className="attendance-summary-card">
          <h2 className="summary-section-title">Student Attendance Overview</h2>
          <div className="attendance-stats-grid">
            {/* Stat 1: Total Records */}
            <div className="attendance-stat-box">
              <div className="stat-icon-wrapper navy-accent">
                <ClipboardCheck size={20} />
              </div>
              <div className="stat-content">
                <span className="stat-label">Total Attendance Records</span>
                <strong className="stat-value">{summaryMetrics.totalRecords}</strong>
              </div>
            </div>

            {/* Stat 2: Total Students Reported */}
            <div className="attendance-stat-box">
              <div className="stat-icon-wrapper blue-accent">
                <Users size={20} />
              </div>
              <div className="stat-content">
                <span className="stat-label">Total Students Reported</span>
                <strong className="stat-value">{summaryMetrics.totalStudents}</strong>
              </div>
            </div>

            {/* Stat 3: Latest Submission Date */}
            <div className="attendance-stat-box">
              <div className="stat-icon-wrapper green-accent">
                <Calendar size={20} />
              </div>
              <div className="stat-content">
                <span className="stat-label">Latest Submission Date</span>
                <strong className="stat-value stat-date">{summaryMetrics.latestDateStr}</strong>
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================================
            3. DATE FILTERS TOOLBAR
            Horizontal single-row filter controls on desktop
            ==================================================================== */}
        <div className="attendance-filter-card">
          <form onSubmit={handleApplyFilter} className="attendance-filter-toolbar">
            <div className="date-field-group">
              <label htmlFor="filter-start-date">Start Date</label>
              <div className="date-input-wrap">
                <Calendar size={14} className="date-icon" />
                <input
                  id="filter-start-date"
                  type="date"
                  className="attendance-date-input"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (dateValidationError) setDateValidationError("");
                  }}
                />
              </div>
            </div>

            <div className="date-field-group">
              <label htmlFor="filter-end-date">End Date</label>
              <div className="date-input-wrap">
                <Calendar size={14} className="date-icon" />
                <input
                  id="filter-end-date"
                  type="date"
                  className="attendance-date-input"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    if (dateValidationError) setDateValidationError("");
                  }}
                />
              </div>
            </div>

            <div className="filter-actions-row">
              <button
                type="button"
                className="attendance-filter-btn btn-apply-filter"
                onClick={handleApplyFilter}
                disabled={loading}
              >
                <Filter size={14} />
                <span>Apply Filter</span>
              </button>

              <button
                type="button"
                className="attendance-filter-btn btn-clear-filter"
                onClick={handleClearFilter}
                disabled={loading || (!startDate && !endDate)}
              >
                <RotateCcw size={14} />
                <span>Clear Filters</span>
              </button>

              <button
                type="button"
                className="attendance-filter-btn btn-export-pdf"
                onClick={() => exportStudentAttendanceToPDF(attendanceData, startDate, endDate)}
                disabled={attendanceData.length === 0 || loading}
              >
                <FileText size={14} />
                <span>Generate PDF</span>
              </button>
            </div>
          </form>

          {dateValidationError && (
            <div className="date-validation-alert">
              <AlertCircle size={15} />
              <span>{dateValidationError}</span>
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="lookup-alert alert-error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* ====================================================================
            4. ATTENDANCE TABLE
            Styled with exact same layout as Traveller Management
            ==================================================================== */}
        <div className="view-traveller-table-container">
          <table className="view-traveller-table">
            <thead>
              <tr>
                <th className="col-sno">S.NO</th>
                <th>VEHICLE ID</th>
                <th>REGISTRATION NO</th>
                <th>ROUTE NAME</th>
                <th>DATE</th>
                <th>STUDENT COUNT</th>
                <th>DRIVER NAME</th>
                <th>SUBMITTED AT</th>
                <th className="col-actions">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" className="traveller-table-empty">
                    <Loader2 size={24} className="spin-icon inline-icon" />
                    <span>Loading attendance records...</span>
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan="9" className="traveller-table-empty">
                    <Users size={28} style={{ color: "#94a3b8", marginBottom: "6px" }} />
                    <p style={{ margin: 0, fontWeight: 600, color: "#475569" }}>
                      No attendance submissions found matching the selected dates.
                    </p>
                    {(startDate || endDate) && (
                      <button
                        type="button"
                        className="empty-state-reset-btn"
                        onClick={handleClearFilter}
                        style={{ marginTop: "10px" }}
                      >
                        Reset Date Filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedData.map((record, index) => {
                  const sNo = startEntryIndex + index;
                  const dateStr = record.attendance_date
                    ? new Date(record.attendance_date).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric"
                      })
                    : "—";
                  const timeStr = record.timestamp
                    ? new Date(record.timestamp).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit"
                      })
                    : "—";

                  return (
                    <tr key={record.id || index}>
                      <td className="col-sno-td">{sNo}</td>
                      <td>
                        <span className="traveller-bus-badge">
                          <Bus size={11} /> Vehicle #{record.vehicleid}
                        </span>
                      </td>
                      <td>
                        <span className="traveller-rollno-badge">
                          {record.registrationno || "—"}
                        </span>
                      </td>
                      <td>
                        <span className="traveller-route-badge">
                          <RouteIcon size={11} /> {record.routename || `Route #${record.routeid || "—"}`}
                        </span>
                      </td>
                      <td>
                        <span className="attendance-date-pill">
                          <Calendar size={11} /> {dateStr}
                        </span>
                      </td>
                      <td>
                        <span className="attendance-count-badge">
                          <Users size={12} />
                          <strong>{record.student_count} Students</strong>
                        </span>
                      </td>
                      <td>
                        <div className="driver-name-wrapper">
                          <strong className="driver-name-text">
                            {record.driver_name || "Assigned Driver"}
                          </strong>
                          {record.marked_by && (
                            <span className="marked-by-sub">
                              Marked: {record.marked_by}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="timestamp-text">
                          <Clock size={11} /> {timeStr}
                        </span>
                      </td>
                      <td>
                        <div className="table-actions-cell">
                          <button
                            type="button"
                            className="table-action-icon-btn action-edit-btn"
                            onClick={() => handleEdit(record)}
                            title={`Edit attendance for Vehicle #${record.vehicleid}`}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            className="table-action-icon-btn action-delete-btn"
                            onClick={() => handleOpenDelete(record)}
                            title={`Delete attendance for Vehicle #${record.vehicleid}`}
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

        {/* ====================================================================
            5. PAGINATION FOOTER
            ==================================================================== */}
        <div className="attendance-pagination-footer">
          <span className="pagination-info-text">
            {attendanceData.length === 0 ? (
              "Showing 0 records"
            ) : (
              <>
                Showing <strong>{startEntryIndex}–{endEntryIndex}</strong> of{" "}
                <strong>{attendanceData.length}</strong> records (Page {currentPage} of {totalPages})
              </>
            )}
          </span>

          <div className="pagination-controls-group">
            <button
              type="button"
              className="page-nav-btn"
              disabled={currentPage === 1 || attendanceData.length === 0}
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
              disabled={currentPage === totalPages || attendanceData.length === 0}
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            >
              <span>Next</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* ====================================================================
            6. EDIT ATTENDANCE MODAL DIALOG
            ==================================================================== */}
        {editingRecord && (
          <EditStudentAttendance
            record={editingRecord}
            onSave={handleSaveEdit}
            onCancel={handleCancelEdit}
          />
        )}

        {/* ====================================================================
            7. DELETE CONFIRMATION MODAL
            ==================================================================== */}
        {recordToDelete && (
          <div
            className="attendance-modal-overlay"
            onClick={() => !isDeleting && setRecordToDelete(null)}
          >
            <div
              className="attendance-delete-dialog"
              onClick={(e) => e.stopPropagation()}
              role="alertdialog"
              aria-modal="true"
            >
              <div className="delete-modal-icon-badge">
                <Trash2 size={24} />
              </div>
              <h3 className="delete-modal-title">Delete Attendance Submission?</h3>
              <p className="delete-modal-body">
                Are you sure you want to permanently delete the attendance record for{" "}
                <strong>Vehicle #{recordToDelete.vehicleid}</strong> (
                {recordToDelete.registrationno || "No Reg"}) recorded on{" "}
                <strong>
                  {recordToDelete.attendance_date
                    ? new Date(recordToDelete.attendance_date).toLocaleDateString("en-IN")
                    : "Unknown date"}
                </strong>
                ? This action cannot be undone.
              </p>
              <div className="delete-modal-actions">
                <button
                  type="button"
                  className="attendance-btn-cancel"
                  onClick={() => setRecordToDelete(null)}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="attendance-btn-danger"
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
    </div>
  );
};

export default StudentAttendance;
