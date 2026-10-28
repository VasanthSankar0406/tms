import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  MessageSquare,
  MessageCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  RotateCcw,
  LayoutDashboard,
  Search,
  RotateCcw as ResetIcon,
  Eye,
  Edit3,
  Trash2,
  ChevronLeft,
  ChevronRight,
  User,
  Shield,
  Tag,
  Send,
  X,
  Check
} from 'lucide-react';
import { API_URL } from '../config';
import '../styles/ComplaintManagement.css';

const DEFAULT_CATEGORIES = [
  'AC & Ventilation',
  'Schedule & Delay',
  'Driver Behavior',
  'Seat & Upholstery',
  'Safety & Speeding',
  'General Suggestion'
];

const ComplaintManagement = () => {
  const navigate = useNavigate();

  // Primary data states
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');

  // Strict 5 records per page pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // 3-Second Auto-Dismissing Flash Card Notification
  const [flashCard, setFlashCard] = useState(null);
  const flashTimerRef = useRef(null);

  const showFlashCard = (message, type = 'success', title = '') => {
    if (flashTimerRef.current) {
      clearTimeout(flashTimerRef.current);
    }
    const defaultTitle = type === 'success' ? 'Success' : type === 'danger' ? 'Error' : 'Notice';
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

  // Popup Modal: Submit Complaint / Feedback
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitForm, setSubmitForm] = useState({
    user_name: '',
    rollno: '',
    role: 'Student',
    category: 'AC & Ventilation',
    subject: '',
    description: '',
    phone: ''
  });
  const [submitErrors, setSubmitErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Popup Modal: View Details & Resolution
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [resStatus, setResStatus] = useState('Pending');
  const [resNote, setResNote] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  // Popup Modal: Delete Confirmation
  const [complaintToDelete, setComplaintToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch Complaints from Backend
  const fetchComplaints = async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    else setLoading(true);

    try {
      const res = await axios.get(`${API_URL}/api/complaints`);
      if (res.data && Array.isArray(res.data.complaints)) {
        setComplaints(res.data.complaints);
      } else {
        setComplaints([]);
      }
      if (isManualRefresh) {
        showFlashCard('Passenger feedback records refreshed successfully!', 'success', 'Records Updated');
      }
    } catch (err) {
      console.error('Error fetching complaints:', err);
      showFlashCard(err.response?.data?.message || 'Could not load feedback records.', 'danger', 'Connection Error');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Derived Category List (Combines defaults with existing data)
  const availableCategories = useMemo(() => {
    const set = new Set(DEFAULT_CATEGORIES);
    complaints.forEach((c) => {
      if (c.category && typeof c.category === 'string') {
        set.add(c.category.trim());
      }
    });
    return Array.from(set).sort();
  }, [complaints]);

  // Dynamic Summary Statistics calculated from data
  const summaryMetrics = useMemo(() => {
    const total = complaints.length;
    const pending = complaints.filter((c) => String(c.status || '').toLowerCase() === 'pending').length;
    const inProgress = complaints.filter((c) => String(c.status || '').toLowerCase() === 'in progress').length;
    const resolved = complaints.filter((c) => String(c.status || '').toLowerCase() === 'resolved').length;
    const rejected = complaints.filter((c) => String(c.status || '').toLowerCase() === 'rejected').length;

    return {
      total,
      pending,
      inProgress,
      resolved,
      rejected
    };
  }, [complaints]);

  // Combined Filtering Logic
  const filteredComplaints = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return complaints.filter((c) => {
      // 1. Search Query Match
      if (query) {
        const nameMatch = String(c.user_name || '').toLowerCase().includes(query);
        const rollMatch = String(c.rollno || '').toLowerCase().includes(query);
        const subjectMatch = String(c.subject || '').toLowerCase().includes(query);
        const descMatch = String(c.description || '').toLowerCase().includes(query);
        const respMatch = String(c.admin_response || '').toLowerCase().includes(query);

        if (!nameMatch && !rollMatch && !subjectMatch && !descMatch && !respMatch) {
          return false;
        }
      }

      // 2. Filter by Status
      if (filterStatus !== 'All') {
        if (String(c.status || '').toLowerCase() !== filterStatus.toLowerCase()) {
          return false;
        }
      }

      // 3. Filter by Category
      if (filterCategory !== 'All') {
        if (String(c.category || '').toLowerCase() !== filterCategory.toLowerCase()) {
          return false;
        }
      }

      return true;
    });
  }, [complaints, searchTerm, filterStatus, filterCategory]);

  // Auto reset pagination to page 1 on filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, filterCategory]);

  // Filter Active Check & Reset Handler
  const isFilterActive =
    searchTerm.trim() !== '' || filterStatus !== 'All' || filterCategory !== 'All';

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterStatus('All');
    setFilterCategory('All');
    setCurrentPage(1);
  };

  // Strictly 5 records per page pagination calculations
  const totalRecords = filteredComplaints.length;
  const totalPages = Math.ceil(totalRecords / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalRecords);
  const currentComplaints = filteredComplaints.slice(startIndex, endIndex);

  // Date Formatting Helper
  const formatDate = (dateStr) => {
    if (!dateStr) return 'Recently';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }) + ', ' + d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return dateStr;
    }
  };

  // Submit Modal Handlers
  const handleOpenSubmitModal = () => {
    setSubmitForm({
      user_name: '',
      rollno: '',
      role: 'Student',
      category: 'AC & Ventilation',
      subject: '',
      description: '',
      phone: ''
    });
    setSubmitErrors({});
    setShowSubmitModal(true);
  };

  const handleCloseSubmitModal = () => {
    setShowSubmitModal(false);
    setSubmitErrors({});
  };

  const validateSubmitForm = () => {
    const errs = {};
    if (!submitForm.user_name.trim()) errs.user_name = 'Passenger name is required.';
    if (!submitForm.rollno.trim()) errs.rollno = 'Roll Number / Staff ID is required.';
    if (!submitForm.subject.trim()) errs.subject = 'Subject title is required.';
    if (!submitForm.description.trim()) errs.description = 'Detailed complaint description is required.';
    setSubmitErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmitComplaint = async (e) => {
    e.preventDefault();
    if (!validateSubmitForm()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        user_name: submitForm.user_name.trim(),
        rollno: submitForm.rollno.trim(),
        role: submitForm.role,
        category: submitForm.category,
        subject: submitForm.subject.trim(),
        description: submitForm.description.trim(),
        phone: submitForm.phone ? submitForm.phone.trim() : null
      };

      const res = await axios.post(`${API_URL}/api/complaints`, payload);
      if (res.data && res.data.success) {
        showFlashCard('Complaint / Feedback submitted successfully! Transport coordinator notified.', 'success', 'Feedback Registered');
        setShowSubmitModal(false);
        await fetchComplaints();
      } else {
        showFlashCard(res.data?.message || 'Could not submit feedback.', 'danger', 'Submission Failed');
      }
    } catch (err) {
      console.error('Error submitting complaint:', err);
      showFlashCard(err.response?.data?.message || 'Submission failed. Please check your network.', 'danger', 'Submission Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Details & Resolution Handlers
  const handleOpenDetails = (complaint) => {
    setSelectedComplaint(complaint);
    setResStatus(complaint.status || 'Pending');
    setResNote(complaint.admin_response || '');
  };

  const handleCloseDetails = () => {
    setSelectedComplaint(null);
  };

  const handleSaveResolution = async () => {
    if (!selectedComplaint) return;
    setIsResolving(true);
    try {
      const res = await axios.put(`${API_URL}/api/complaints/${selectedComplaint.id}`, {
        status: resStatus,
        admin_response: resNote.trim()
      });

      if (res.data && res.data.success) {
        showFlashCard(`Complaint #${selectedComplaint.id} marked as ${resStatus}!`, 'success', 'Resolution Saved');
        setSelectedComplaint(null);
        await fetchComplaints();
      } else {
        showFlashCard(res.data?.message || 'Failed to update complaint status.', 'danger', 'Update Failed');
      }
    } catch (err) {
      console.error('Error updating complaint resolution:', err);
      showFlashCard(err.response?.data?.message || 'Failed to update complaint resolution.', 'danger', 'Update Failed');
    } finally {
      setIsResolving(false);
    }
  };

  // Delete Handlers
  const handleOpenDelete = (complaint) => {
    setComplaintToDelete(complaint);
  };

  const handleConfirmDelete = async () => {
    if (!complaintToDelete) return;
    setIsDeleting(true);
    try {
      const res = await axios.delete(`${API_URL}/api/complaints/${complaintToDelete.id}`);
      if (res.data && res.data.success) {
        showFlashCard(`Complaint record #${complaintToDelete.id} removed successfully.`, 'success', 'Record Deleted');
        setComplaintToDelete(null);
        await fetchComplaints();
      } else {
        showFlashCard(res.data?.message || 'Failed to delete complaint record.', 'danger', 'Delete Failed');
      }
    } catch (err) {
      console.error('Error deleting complaint:', err);
      showFlashCard(err.response?.data?.message || 'Failed to delete complaint record.', 'danger', 'Delete Failed');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="complaint-master-container">
      <div className="complaint-box-wrapper">
        {/* ====================================================================
            1. BREADCRUMBS & COMPACT PAGE HEADER
            ==================================================================== */}
        <nav className="vm-breadcrumb-nav" aria-label="Breadcrumb navigation">
          <span className="link" onClick={() => navigate('/home')}>Dashboard</span>
          <span className="sep">/</span>
          <span className="current">Feedback & Complaints</span>
          <span className="sep">/</span>
          <span className="current">Passenger Feedback Portal</span>
        </nav>

        <header className="vm-page-header">
          <div className="vm-header-left">
            <div className="vm-title-row">
              <div className="vm-title-icon-badge" aria-hidden="true">
                <MessageSquare size={19} strokeWidth={2.2} />
              </div>
              <h1 className="vm-page-title">Passenger Feedback Portal</h1>
              <span className="vm-total-count-badge">
                {complaints.length} {complaints.length === 1 ? 'Record Total' : 'Records Total'}
              </span>
            </div>
            <p className="vm-page-subtitle">
              Review passenger concerns, manage complaints, and track resolutions.
            </p>
          </div>

          <div className="vm-header-actions">
            <button
              type="button"
              className="vm-btn-secondary"
              onClick={() => fetchComplaints(true)}
              disabled={isRefreshing}
              title="Refresh complaint records"
            >
              <RotateCcw size={15} className={isRefreshing ? 'spin-icon' : ''} />
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>

            <button
              type="button"
              className="vm-btn-secondary"
              onClick={() => navigate('/home')}
              title="Return to operations dashboard"
            >
              <LayoutDashboard size={15} />
              <span>Back to Dashboard</span>
            </button>

            <button
              type="button"
              className="vm-btn-primary"
              onClick={handleOpenSubmitModal}
              title="Submit a new transport complaint or feedback"
            >
              <Plus size={16} strokeWidth={2.4} />
              <span>Submit Complaint / Feedback</span>
            </button>
          </div>
        </header>

        {/* ====================================================================
            2. 3-SECOND AUTO-DISMISSING FLASH CARD NOTIFICATION
            ==================================================================== */}
        {flashCard && (
          <aside
            className={`complaint-flash-card ${flashCard.type || 'success'}`}
            role="status"
            aria-live="polite"
          >
            <div className="complaint-flash-indicator" />
            <div className="complaint-flash-content">
              <div className="complaint-flash-header">
                <span className="complaint-flash-title">{flashCard.title}</span>
                <button
                  type="button"
                  className="complaint-flash-dismiss"
                  onClick={() => {
                    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
                    setFlashCard(null);
                  }}
                  aria-label="Dismiss notification"
                >
                  <X size={14} />
                </button>
              </div>
              <p className="complaint-flash-message">{flashCard.message}</p>
            </div>
          </aside>
        )}

        {/* ====================================================================
            3. FOUR COMPACT STATISTIC CARDS (Single Row on Desktop)
            ==================================================================== */}
        <section className="complaint-summary-grid" aria-label="Feedback and Complaint Summary">
          {/* Card 1: Total Complaints */}
          <div className="complaint-summary-card">
            <div className="summary-icon-box summary-icon-blue">
              <MessageCircle size={20} />
            </div>
            <div className="summary-card-content">
              <div className="summary-card-value-row">
                <span className="summary-card-value">{summaryMetrics.total}</span>
                <span className="summary-card-badge badge-blue">All Logs</span>
              </div>
              <span className="summary-card-label">Total Complaints</span>
              <span className="summary-card-sub">All passenger submissions logged in system.</span>
            </div>
          </div>

          {/* Card 2: Pending */}
          <div className="complaint-summary-card">
            <div className="summary-icon-box summary-icon-amber">
              <Clock size={20} />
            </div>
            <div className="summary-card-content">
              <div className="summary-card-value-row">
                <span className="summary-card-value">{summaryMetrics.pending}</span>
                <span className="summary-card-badge badge-amber">Action Req</span>
              </div>
              <span className="summary-card-label">Pending</span>
              <span className="summary-card-sub">Awaiting initial administrative review.</span>
            </div>
          </div>

          {/* Card 3: In Progress */}
          <div className="complaint-summary-card">
            <div className="summary-icon-box summary-icon-cyan">
              <Tag size={20} />
            </div>
            <div className="summary-card-content">
              <div className="summary-card-value-row">
                <span className="summary-card-value">{summaryMetrics.inProgress}</span>
                <span className="summary-card-badge badge-cyan">In Motion</span>
              </div>
              <span className="summary-card-label">In Progress</span>
              <span className="summary-card-sub">Under active investigation or inspection.</span>
            </div>
          </div>

          {/* Card 4: Resolved */}
          <div className="complaint-summary-card">
            <div className="summary-icon-box summary-icon-emerald">
              <CheckCircle2 size={20} />
            </div>
            <div className="summary-card-content">
              <div className="summary-card-value-row">
                <span className="summary-card-value">{summaryMetrics.resolved}</span>
                <span className="summary-card-badge badge-green">Closed</span>
              </div>
              <span className="summary-card-label">Resolved</span>
              <span className="summary-card-sub">Action completed and response dispatched.</span>
            </div>
          </div>
        </section>

        {/* ====================================================================
            4. COMPLAINT MANAGEMENT SECTION & TABLE CARD
            ==================================================================== */}
        <section className="complaint-table-card" aria-label="Complaints Table Section">
          <div className="complaint-table-card-header">
            <div className="complaint-table-card-titles">
              <h2 className="complaint-table-card-title">
                Transport Complaints & Resolution Dashboard
              </h2>
              <p className="complaint-table-card-subtitle">
                Review passenger feedback, update resolution notes, and track closed concerns.
              </p>
            </div>
          </div>

          {/* Compact Horizontal Filter Toolbar */}
          <div className="complaint-filter-toolbar">
            <div className="complaint-filter-grid">
              {/* Search Field */}
              <div className="complaint-filter-field">
                <label htmlFor="search-complaint-input">Search Complaints</label>
                <div className="filter-input-with-icon">
                  <Search size={15} className="filter-search-icon" />
                  <input
                    id="search-complaint-input"
                    type="text"
                    placeholder="Search by passenger name, roll no, subject..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="complaint-filter-input"
                    aria-label="Search complaints"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div className="complaint-filter-field">
                <label htmlFor="filter-status-select">Complaint Status</label>
                <select
                  id="filter-status-select"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="complaint-filter-select"
                  aria-label="Filter by Status"
                >
                  <option value="All">All Statuses</option>
                  <option value="Pending">Pending ({summaryMetrics.pending})</option>
                  <option value="In Progress">In Progress ({summaryMetrics.inProgress})</option>
                  <option value="Resolved">Resolved ({summaryMetrics.resolved})</option>
                  <option value="Rejected">Rejected ({summaryMetrics.rejected})</option>
                </select>
              </div>

              {/* Category Filter */}
              <div className="complaint-filter-field">
                <label htmlFor="filter-category-select">Complaint Category</label>
                <select
                  id="filter-category-select"
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="complaint-filter-select"
                  aria-label="Filter by Category"
                >
                  <option value="All">All Categories ({availableCategories.length})</option>
                  {availableCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reset Filters Button */}
              <div className="complaint-filter-field">
                <label>&nbsp;</label>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  disabled={!isFilterActive}
                  className={`complaint-btn-reset-filters ${isFilterActive ? 'active' : ''}`}
                  title="Clear all active search and filter criteria"
                >
                  <ResetIcon size={14} />
                  <span>Reset Filters</span>
                </button>
              </div>
            </div>
          </div>

          {/* Table Responsive Area */}
          <div className="complaint-table-responsive">
            <table className="complaint-roster-table">
              <thead>
                <tr>
                  <th className="col-sno">S.No</th>
                  <th>Passenger Name</th>
                  <th>Roll No / Staff ID</th>
                  <th>Category</th>
                  <th>Subject & Description</th>
                  <th>Submitted Date</th>
                  <th>Status</th>
                  <th>Admin Response</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="9" className="complaint-table-empty">
                      <div className="empty-state-icon-box">
                        <RotateCcw size={24} className="spin-icon" />
                      </div>
                      <div className="empty-state-title">Loading Passenger Feedback...</div>
                      <div className="empty-state-sub">Fetching real-time records from campus server.</div>
                    </td>
                  </tr>
                ) : currentComplaints.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="complaint-table-empty">
                      <div className="empty-state-icon-box">
                        <MessageSquare size={24} />
                      </div>
                      <div className="empty-state-title">No Complaints Found</div>
                      <div className="empty-state-sub">
                        {isFilterActive
                          ? 'No records match your active search or filter filters. Try resetting filters.'
                          : 'No passenger complaints or feedback submitted yet.'}
                      </div>
                      {isFilterActive && (
                        <button
                          type="button"
                          className="vm-btn-secondary"
                          onClick={handleResetFilters}
                        >
                          <ResetIcon size={14} />
                          <span>Clear Filters</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  currentComplaints.map((c, index) => {
                    const rowNumber = startIndex + index + 1;
                    const statusLower = String(c.status || 'pending').toLowerCase();
                    const statusClass =
                      statusLower === 'resolved'
                        ? 'status-resolved'
                        : statusLower === 'in progress'
                        ? 'status-in-progress'
                        : statusLower === 'rejected'
                        ? 'status-rejected'
                        : 'status-pending';

                    return (
                      <tr key={c.id || `complaint-${index}`}>
                        {/* S.No */}
                        <td className="col-sno">{rowNumber}</td>

                        {/* Passenger Name & Role */}
                        <td>
                          <div className="passenger-meta-block">
                            <span className="passenger-name-text">{c.user_name || 'Anonymous'}</span>
                            <span className="passenger-role-chip">
                              <User size={12} />
                              {c.role || 'Passenger'}
                            </span>
                          </div>
                        </td>

                        {/* Roll No / Staff ID */}
                        <td>
                          <span className="rollno-badge">{c.rollno || 'N/A'}</span>
                        </td>

                        {/* Complaint Category */}
                        <td>
                          <span className="category-pill">{c.category || 'General'}</span>
                        </td>

                        {/* Subject & Description */}
                        <td>
                          <div className="complaint-desc-block">
                            <span className="complaint-subject-title">{c.subject}</span>
                            <p className="complaint-snippet" title={c.description}>
                              {c.description}
                            </p>
                          </div>
                        </td>

                        {/* Submitted Date */}
                        <td>
                          <span className="col-date-text">
                            {formatDate(c.submitted_at)}
                          </span>
                        </td>

                        {/* Status */}
                        <td>
                          <span className={`status-badge ${statusClass}`}>
                            <span className="status-dot" />
                            {c.status || 'Pending'}
                          </span>
                        </td>

                        {/* Admin Response */}
                        <td>
                          {c.admin_response ? (
                            <div className="response-preview-block" title={c.admin_response}>
                              <span>{c.admin_response}</span>
                            </div>
                          ) : (
                            <span className="response-empty-note">Awaiting Response</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td>
                          <div className="col-actions-row">
                            <button
                              type="button"
                              className="tbl-action-btn btn-respond"
                              onClick={() => handleOpenDetails(c)}
                              title="View full details and update resolution"
                            >
                              <Eye size={15} />
                            </button>

                            <button
                              type="button"
                              className="tbl-action-btn btn-delete"
                              onClick={() => handleOpenDelete(c)}
                              title="Delete complaint record"
                            >
                              <Trash2 size={15} />
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

          {/* ==================================================================
              5. STRICTLY 5 COMPLAINTS PER PAGE PAGINATION
              ================================================================== */}
          {!loading && totalRecords > 0 && (
            <div className="complaint-pagination-footer">
              <span className="pagination-info-text">
                Showing <strong>{startIndex + 1}</strong>–<strong>{endIndex}</strong> of{' '}
                <strong>{totalRecords}</strong> complaints
              </span>

              <div className="pagination-controls-group">
                <button
                  type="button"
                  className="page-nav-btn"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  aria-label="Previous Page"
                >
                  <ChevronLeft size={14} />
                  <span>Previous</span>
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => {
                  // Show current page, edges, and adjacent numbers for clean navigation
                  if (
                    pg === 1 ||
                    pg === totalPages ||
                    (pg >= currentPage - 1 && pg <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={pg}
                        type="button"
                        className={`page-num-btn ${currentPage === pg ? 'active' : ''}`}
                        onClick={() => setCurrentPage(pg)}
                        aria-current={currentPage === pg ? 'page' : undefined}
                      >
                        {pg}
                      </button>
                    );
                  }
                  if (pg === currentPage - 2 || pg === currentPage + 2) {
                    return (
                      <span key={`dots-${pg}`} style={{ padding: '0 4px', color: '#94a3b8' }}>
                        ...
                      </span>
                    );
                  }
                  return null;
                })}

                <button
                  type="button"
                  className="page-nav-btn"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  aria-label="Next Page"
                >
                  <span>Next</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* ======================================================================
          6. POPUP MODAL: SUBMIT COMPLAINT / FEEDBACK
          ====================================================================== */}
      {showSubmitModal && (
        <div className="complaint-modal-backdrop" onClick={handleCloseSubmitModal}>
          <div
            className="complaint-modal-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="submit-modal-title"
          >
            <div className="complaint-modal-header">
              <div className="complaint-modal-header-copy">
                <h3 id="submit-modal-title" className="complaint-modal-title">
                  Submit Complaint or Feedback
                </h3>
                <p className="complaint-modal-subtitle">
                  Provide detailed transport information so administrators can review and resolve.
                </p>
              </div>
              <button
                type="button"
                className="complaint-modal-close-btn"
                onClick={handleCloseSubmitModal}
                aria-label="Close submit dialog"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitComplaint}>
              <div className="complaint-modal-body">
                <div className="complaint-form-grid">
                  {/* Passenger Type */}
                  <div className="complaint-field-group">
                    <label>Passenger Type <span className="req">*</span></label>
                    <div className="role-segment-selector">
                      <button
                        type="button"
                        className={`role-segment-btn ${submitForm.role === 'Student' ? 'active' : ''}`}
                        onClick={() => setSubmitForm({ ...submitForm, role: 'Student' })}
                      >
                        <User size={14} />
                        <span>Student</span>
                      </button>
                      <button
                        type="button"
                        className={`role-segment-btn ${submitForm.role === 'Staff' ? 'active' : ''}`}
                        onClick={() => setSubmitForm({ ...submitForm, role: 'Staff' })}
                      >
                        <Shield size={14} />
                        <span>Staff Member</span>
                      </button>
                    </div>
                  </div>

                  {/* Roll Number / Staff ID */}
                  <div className="complaint-field-group">
                    <label htmlFor="form-rollno">
                      Roll Number / Staff ID <span className="req">*</span>
                    </label>
                    <input
                      id="form-rollno"
                      type="text"
                      placeholder="e.g. 2312043 or EMP-1042"
                      value={submitForm.rollno}
                      onChange={(e) => {
                        setSubmitForm({ ...submitForm, rollno: e.target.value });
                        if (submitErrors.rollno) setSubmitErrors({ ...submitErrors, rollno: null });
                      }}
                    />
                    {submitErrors.rollno && <span className="field-error">{submitErrors.rollno}</span>}
                  </div>

                  {/* Passenger Name */}
                  <div className="complaint-field-group">
                    <label htmlFor="form-name">
                      Passenger Name <span className="req">*</span>
                    </label>
                    <input
                      id="form-name"
                      type="text"
                      placeholder="e.g. Kani / Dr. Sundararajan"
                      value={submitForm.user_name}
                      onChange={(e) => {
                        setSubmitForm({ ...submitForm, user_name: e.target.value });
                        if (submitErrors.user_name) setSubmitErrors({ ...submitErrors, user_name: null });
                      }}
                    />
                    {submitErrors.user_name && <span className="field-error">{submitErrors.user_name}</span>}
                  </div>

                  {/* Category */}
                  <div className="complaint-field-group">
                    <label htmlFor="form-category">
                      Complaint Category <span className="req">*</span>
                    </label>
                    <select
                      id="form-category"
                      value={submitForm.category}
                      onChange={(e) => setSubmitForm({ ...submitForm, category: e.target.value })}
                    >
                      {availableCategories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Subject Title */}
                  <div className="complaint-field-group full-width">
                    <label htmlFor="form-subject">
                      Subject Title <span className="req">*</span>
                    </label>
                    <input
                      id="form-subject"
                      type="text"
                      placeholder="Brief summary of concern or feedback"
                      value={submitForm.subject}
                      onChange={(e) => {
                        setSubmitForm({ ...submitForm, subject: e.target.value });
                        if (submitErrors.subject) setSubmitErrors({ ...submitErrors, subject: null });
                      }}
                    />
                    {submitErrors.subject && <span className="field-error">{submitErrors.subject}</span>}
                  </div>

                  {/* Description */}
                  <div className="complaint-field-group full-width">
                    <label htmlFor="form-desc">
                      Detailed Complaint Description <span className="req">*</span>
                    </label>
                    <textarea
                      id="form-desc"
                      rows="3"
                      placeholder="Specify bus number, boarding stop, timing, and nature of the issue..."
                      value={submitForm.description}
                      onChange={(e) => {
                        setSubmitForm({ ...submitForm, description: e.target.value });
                        if (submitErrors.description) setSubmitErrors({ ...submitErrors, description: null });
                      }}
                    />
                    {submitErrors.description && (
                      <span className="field-error">{submitErrors.description}</span>
                    )}
                  </div>

                  {/* Optional Contact Phone */}
                  <div className="complaint-field-group full-width">
                    <label htmlFor="form-phone">Contact Phone / Email (Optional)</label>
                    <input
                      id="form-phone"
                      type="text"
                      placeholder="e.g. 9876543210 or passenger@nec.edu.in"
                      value={submitForm.phone}
                      onChange={(e) => setSubmitForm({ ...submitForm, phone: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="complaint-modal-footer">
                <button
                  type="button"
                  className="complaint-btn-cancel"
                  onClick={handleCloseSubmitModal}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="complaint-btn-submit"
                  disabled={isSubmitting}
                >
                  <Send size={15} />
                  <span>{isSubmitting ? 'Submitting...' : 'Submit Complaint'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================================
          7. POPUP MODAL: COMPLAINT DETAILS & RESOLUTION
          ====================================================================== */}
      {selectedComplaint && (
        <div className="complaint-modal-backdrop" onClick={handleCloseDetails}>
          <div
            className="complaint-modal-dialog details-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="details-modal-title"
          >
            <div className="complaint-modal-header">
              <div className="complaint-modal-header-copy">
                <h3 id="details-modal-title" className="complaint-modal-title">
                  Complaint Details & Resolution Note
                </h3>
                <p className="complaint-modal-subtitle">
                  Ticket #{selectedComplaint.id} • Submitted on {formatDate(selectedComplaint.submitted_at)}
                </p>
              </div>
              <button
                type="button"
                className="complaint-modal-close-btn"
                onClick={handleCloseDetails}
                aria-label="Close details dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className="complaint-modal-body">
              {/* Passenger Metadata Summary */}
              <div className="details-summary-panel">
                <div className="details-summary-item">
                  <label>Passenger Name</label>
                  <span>{selectedComplaint.user_name || 'Anonymous'}</span>
                </div>
                <div className="details-summary-item">
                  <label>Roll No / Staff ID</label>
                  <span className="rollno-badge" style={{ alignSelf: 'flex-start' }}>
                    {selectedComplaint.rollno || 'N/A'}
                  </span>
                </div>
                <div className="details-summary-item">
                  <label>Role</label>
                  <span>{selectedComplaint.role || 'Student'}</span>
                </div>
                <div className="details-summary-item">
                  <label>Category</label>
                  <span>{selectedComplaint.category || 'General'}</span>
                </div>
                <div className="details-summary-item">
                  <label>Current Status</label>
                  <span
                    className={`status-badge status-${String(selectedComplaint.status || 'pending').toLowerCase().replace(' ', '-')}`}
                    style={{ alignSelf: 'flex-start' }}
                  >
                    <span className="status-dot" />
                    {selectedComplaint.status || 'Pending'}
                  </span>
                </div>
                <div className="details-summary-item">
                  <label>Submission Time</label>
                  <span>{formatDate(selectedComplaint.submitted_at)}</span>
                </div>
              </div>

              {/* Full Description Box */}
              <div className="details-description-box">
                <h4>{selectedComplaint.subject}</h4>
                <p>{selectedComplaint.description}</p>
              </div>

              {/* Admin Resolution Section */}
              <div className="resolution-box-card">
                <div className="resolution-box-header">
                  <span className="resolution-box-title">
                    <Edit3 size={15} />
                    Administrative Resolution & Status Update
                  </span>
                </div>

                {/* Status Switcher */}
                <div className="complaint-field-group">
                  <label>Update Complaint Status:</label>
                  <div className="resolution-status-options">
                    <button
                      type="button"
                      className={`res-status-btn pending ${resStatus === 'Pending' ? 'active' : ''}`}
                      onClick={() => setResStatus('Pending')}
                    >
                      <Clock size={13} />
                      <span>Pending</span>
                    </button>
                    <button
                      type="button"
                      className={`res-status-btn in-progress ${resStatus === 'In Progress' ? 'active' : ''}`}
                      onClick={() => setResStatus('In Progress')}
                    >
                      <Tag size={13} />
                      <span>In Progress</span>
                    </button>
                    <button
                      type="button"
                      className={`res-status-btn resolved ${resStatus === 'Resolved' ? 'active' : ''}`}
                      onClick={() => setResStatus('Resolved')}
                    >
                      <CheckCircle2 size={13} />
                      <span>Resolved</span>
                    </button>
                    <button
                      type="button"
                      className={`res-status-btn rejected ${resStatus === 'Rejected' ? 'active' : ''}`}
                      onClick={() => setResStatus('Rejected')}
                    >
                      <XCircle size={13} />
                      <span>Rejected</span>
                    </button>
                  </div>
                </div>

                {/* Admin Note Input */}
                <div className="complaint-field-group">
                  <label htmlFor="admin-response-input">
                    Official Admin Resolution Response / Notes:
                  </label>
                  <textarea
                    id="admin-response-input"
                    rows="3"
                    placeholder="Enter inspection feedback, actions taken by transport depot, or driver counseling notes..."
                    value={resNote}
                    onChange={(e) => setResNote(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="complaint-modal-footer">
              <button
                type="button"
                className="complaint-btn-cancel"
                onClick={handleCloseDetails}
                disabled={isResolving}
              >
                Close
              </button>
              <button
                type="button"
                className="complaint-btn-submit"
                onClick={handleSaveResolution}
                disabled={isResolving}
              >
                <Check size={15} />
                <span>{isResolving ? 'Saving...' : 'Save Resolution'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================
          8. POPUP MODAL: DELETE CONFIRMATION
          ====================================================================== */}
      {complaintToDelete && (
        <div className="complaint-modal-backdrop" onClick={() => setComplaintToDelete(null)}>
          <div
            className="complaint-modal-dialog delete-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
          >
            <div className="complaint-modal-header delete-header">
              <div className="complaint-modal-header-copy">
                <h3 id="delete-modal-title" className="complaint-modal-title">
                  Delete Complaint Record
                </h3>
                <p className="complaint-modal-subtitle">
                  Permanently remove this passenger feedback record
                </p>
              </div>
              <button
                type="button"
                className="complaint-modal-close-btn"
                onClick={() => setComplaintToDelete(null)}
                aria-label="Close delete dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className="complaint-modal-body">
              <p style={{ margin: 0, fontSize: '0.88rem', color: '#1e293b' }}>
                Are you sure you want to delete complaint ticket #{complaintToDelete.id}?
              </p>
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.82rem' }}>
                <p style={{ margin: '0 0 4px 0', fontWeight: 700, color: '#0f2744' }}>
                  {complaintToDelete.subject}
                </p>
                <p style={{ margin: 0, color: '#64748b' }}>
                  Submitted by {complaintToDelete.user_name} ({complaintToDelete.rollno})
                </p>
              </div>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#dc2626' }}>
                This action cannot be undone and will permanently remove this record from the database.
              </p>
            </div>

            <div className="complaint-modal-footer">
              <button
                type="button"
                className="complaint-btn-cancel"
                onClick={() => setComplaintToDelete(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="complaint-btn-danger"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                <Trash2 size={15} />
                <span>{isDeleting ? 'Deleting...' : 'Delete Record'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplaintManagement;
