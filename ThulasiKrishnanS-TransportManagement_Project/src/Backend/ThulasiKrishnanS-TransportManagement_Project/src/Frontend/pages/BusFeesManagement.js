import React, { useState, useEffect } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import {
  FaMoneyBillWave,
  FaFileExcel,
  FaDownload,
  FaUpload,
  FaSearch,
  FaCheckCircle,
  FaExclamationCircle,
  FaExclamationTriangle,
  FaClock,
  FaFilter,
  FaBell,
  FaPrint,
  FaCreditCard,
  FaTimes,
  FaUserGraduate
} from "react-icons/fa";
import { API_URL } from "../config";
import "../styles/BusFeesManagement.css";

const BusFeesManagement = ({ initialTab = "all" }) => {
  const [activeTab, setActiveTab] = useState(initialTab); // "all" or "pending"
  const [fees, setFees] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [routeFeeRows, setRouteFeeRows] = useState([]);
  const [savingRouteFee, setSavingRouteFee] = useState("");
  const [summary, setSummary] = useState({
    totalFeesAssessed: 0,
    totalPaid: 0,
    totalPending: 0,
    collectionRate: 0,
    defaultersCount: 0,
    criticalOverdueCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [selectedRoute, setSelectedRoute] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedYear, setSelectedYear] = useState("All");
  const [selectedBranch, setSelectedBranch] = useState("All");

  // Payment Modal state
  const [paymentModal, setPaymentModal] = useState({ open: false, item: null });
  const [payAmount, setPayAmount] = useState("");
  const [payMode, setPayMode] = useState("UPI / GPay");
  const [payNotes, setPayNotes] = useState("");

  // Receipt Modal state
  const [receiptModal, setReceiptModal] = useState({ open: false, item: null });

  const normalizeYear = (value) => {
    const year = String(value || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    const aliases = { "1": "1styear", "1st": "1styear", first: "1styear", firstyear: "1styear", i: "1styear", iyear: "1styear", "2": "2ndyear", "2nd": "2ndyear", second: "2ndyear", secondyear: "2ndyear", ii: "2ndyear", iiyear: "2ndyear", "3": "3rdyear", "3rd": "3rdyear", third: "3rdyear", thirdyear: "3rdyear", iii: "3rdyear", iiiyear: "3rdyear", "4": "4thyear", "4th": "4thyear", fourth: "4thyear", fourthyear: "4thyear", iv: "4thyear", ivyear: "4thyear" };
    return aliases[year] || year;
  };

  useEffect(() => {
    fetchFees();
    fetchRoutes();
    fetchRouteFees();
  }, []);

  const fetchFees = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/bus-fees`);
      if (res.data && res.data.success) {
        setFees(res.data.fees || []);
        if (res.data.summary) setSummary(res.data.summary);
      }
    } catch (err) {
      console.error("Error fetching fees data:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoutes = async () => {
    try {
      const res = await axios.get(`${API_URL}/getRoute`);
      if (Array.isArray(res.data)) {
        setRoutes(res.data);
      }
    } catch (err) {
      console.error("Error loading routes", err);
    }
  };

  const fetchRouteFees = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/bus-route-fees`);
      setRouteFeeRows(data.routes || []);
    } catch (err) { console.error("Error loading route bus fees", err); }
  };

  const handleSaveRouteFee = async (route) => {
    try {
      setSavingRouteFee(route.routeid);
      await axios.put(`${API_URL}/api/bus-route-fees/${encodeURIComponent(route.routeid)}`, { fee_amount: route.fee_amount });
      showToast(`Bus fee saved for ${route.routename}.`);
      fetchFees();
      fetchRouteFees();
    } catch (err) { showToast(err.response?.data?.message || "Could not save route bus fee."); }
    finally { setSavingRouteFee(""); }
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 5000);
  };

  // Filter fees based on active tab & filters
  const filteredFees = fees.filter((f) => {
    // If in "pending" tab, only show unpaid records
    if (activeTab === "pending" && !(Number(f.pending_amount) > 0)) {
      return false;
    }

    if (selectedRoute !== "All" && String(f.routeid) !== String(selectedRoute)) {
      return false;
    }

    if (activeTab === "all" && selectedStatus !== "All" && f.status !== selectedStatus) {
      return false;
    }

    if (activeTab === "pending" && selectedStatus !== "All" && f.status !== selectedStatus) {
      return false;
    }

    if (selectedYear !== "All" && normalizeYear(f.year) !== normalizeYear(selectedYear)) {
      return false;
    }

    if (selectedBranch !== "All" && f.branch !== selectedBranch) {
      return false;
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = f.student_name?.toLowerCase().includes(q);
      const matchRoll = f.rollno?.toLowerCase().includes(q);
      const matchReceipt = f.receipt_no?.toLowerCase().includes(q);
      const matchStage = f.stage_name?.toLowerCase().includes(q);
      if (!matchName && !matchRoll && !matchReceipt && !matchStage) {
        return false;
      }
    }

    return true;
  });

  const pendingByBus = Object.values(filteredFees.filter((fee) => Number(fee.pending_amount) > 0).reduce((groups, fee) => {
    const bus = fee.busno || "Bus not assigned";
    groups[bus] ||= { bus, students: 0, pending: 0 };
    groups[bus].students += 1;
    groups[bus].pending += Number(fee.pending_amount) || 0;
    return groups;
  }, {}));

  // 1. Export Bus Fees to Excel (.xlsx)
  const handleExportExcel = () => {
    const exportData = filteredFees.map((f, idx) => ({
      "S:No": idx + 1,
      "name": f.student_name,
      "rollno": f.rollno,
      "dept": f.branch,
      "Route and boarding point": [f.routename || f.routeid, f.stage_name].filter(Boolean).join(" - "),
      "bus no": f.busno || "Not allocated",
      "total fees": f.total_fee || 0
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    const sheetName = activeTab === "pending" ? "Bus_Fees_Pending_List" : "Bus_Fees_Master";
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    const fileName = activeTab === "pending"
      ? `Bus_Fees_Pending_Defaulters_${new Date().toISOString().split("T")[0]}.xlsx`
      : `Bus_Fees_Master_Report_${new Date().toISOString().split("T")[0]}.xlsx`;

    XLSX.writeFile(workbook, fileName);
    showToast(`Excel file "${fileName}" exported successfully!`);
  };

  // 2. Download Excel Format / Template (.xlsx)
  const handleDownloadTemplate = () => {
    const templateData = [{ "Roll No": "231001", "Paid Amount": "" }];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Fees_Import_Template");
    XLSX.writeFile(wb, "Paid_Students_Import_Template.xlsx");
    showToast('Paid-student import template downloaded. Enter each paid student roll number; Paid Amount is optional.');
  };

  // 3. Upload & Import Excel Format (.xlsx / .csv)
  const handleImportExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (!data || data.length === 0) {
          showToast("Uploaded Excel file is empty.");
          return;
        }

        const value = (row, aliases) => {
          const indexed = new Map(Object.entries(row).map(([key, item]) => [String(key).toLowerCase().replace(/[^a-z0-9]/g, ""), item]));
          for (const alias of aliases) { const found = indexed.get(alias.toLowerCase().replace(/[^a-z0-9]/g, "")); if (found !== undefined && String(found).trim()) return String(found).trim(); }
          return "";
        };
        const formatted = data.map((row) => ({
          rollno: value(row, ["Roll No", "RollNo", "Reg No", "REG NO", "Registration Number"]),
          paid_amount: value(row, ["Paid Amount", "Amount Paid", "Paid", "paid_amount"]),
          total_fee: value(row, ["Total Fees", "Total Fee", "Bus Fee", "total_fee"]),
          status: value(row, ["Payment Status", "Status"]),
          payment_mode: value(row, ["Payment Mode"]),
          receipt_no: value(row, ["Receipt Number", "Receipt No", "ReceiptNo"]),
          last_payment_date: value(row, ["Payment Date", "Last Payment Date"])
        })).filter((row) => row.rollno && (!row.status || ["paid", "partial"].includes(row.status.toLowerCase())));
        if (!formatted.length) { showToast("No rows with a Roll No were found in this spreadsheet."); return; }
        if (!window.confirm("Import this as the complete paid-student list? Travellers missing from the file will be marked unpaid.")) return;
        const res = await axios.post(`${API_URL}/api/bus-fees/reconcile-paid-list`, { records: formatted });
        showToast(res.data.message || `Paid list processed for ${formatted.length} students.`);
        fetchFees();
      } catch (err) {
        console.error("Excel import error", err);
        showToast(err.response?.data?.message || "Could not process this paid-student spreadsheet.");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = null; // reset file input
  };

  // 4. Send Fee Reminder Alert
  const handleSendReminder = async (feeItem) => {
    try {
      const res = await axios.post(`${API_URL}/api/bus-fees/send-reminder`, {
        id: feeItem.id
      });
      showToast(res.data.message || `Fee reminder notice sent to ${feeItem.student_name}!`);
    } catch (err) {
      console.error("Reminder dispatch error", err);
      showToast("Failed to send reminder alert.");
    }
  };

  // 5. Bulk Send Reminders for currently filtered defaulters
  const handleBulkReminders = async () => {
    const unpaidList = filteredFees.filter((f) => f.pending_amount > 0);
    if (unpaidList.length === 0) {
      showToast("No pending defaulters in current filter.");
      return;
    }

    try {
      const res = await axios.post(`${API_URL}/api/bus-fees/send-reminder`, {
        ids: unpaidList.map((f) => f.id)
      });
      showToast(res.data.message || `Bulk reminders dispatched to ${unpaidList.length} students!`);
    } catch (err) {
      console.error("Bulk reminder error", err);
      showToast("Failed to dispatch bulk reminders.");
    }
  };

  // 6. Record Fee Payment
  const handleOpenPayment = (item) => {
    setPaymentModal({ open: true, item });
    setPayAmount(String(item.pending_amount));
    setPayMode("UPI / GPay");
    setPayNotes("");
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (!paymentModal.item) return;

    try {
      const res = await axios.post(`${API_URL}/api/bus-fees/pay`, {
        id: paymentModal.item.id,
        amount: Number(payAmount),
        payment_mode: payMode,
        notes: payNotes
      });

      showToast(res.data.message || "Payment recorded successfully!");
      setPaymentModal({ open: false, item: null });
      fetchFees();
    } catch (err) {
      console.error("Payment error", err);
      showToast(err.response?.data?.message || "Failed to record payment.");
    }
  };

  return (
    <div className="fees-page-container">
      {/* Header Panel */}
      <header className="fees-header-panel">
        <div className="fees-header-info">
          <p className="fees-kicker">Financial Accounts & Transport Mobility</p>
          <h1>{activeTab === "pending" ? "Bus Fees Pending by Bus" : "Bus Fees & Excel Format"}</h1>
          <p className="fees-subtitle">
            {activeTab === "pending"
              ? "Import the paid-student list to identify every allocated traveller who still owes fees, grouped by bus."
              : "Set the fee for each route, view its allocated travellers, import paid-student details, and export the requested Excel report."}
          </p>
        </div>

        <div className="fees-header-actions">
          {/* Download Excel Template */}
          <button
            type="button"
            className="btn-secondary"
            onClick={handleDownloadTemplate}
            title="Download the paid-student import template"
          >
            <FaDownload /> Paid List Template
          </button>

          {/* Upload the paid-student list; everyone absent from it will be shown as pending. */}
          <label className="file-upload-label" title="Import paid student roll numbers">
            <FaUpload /> Import Paid Student List
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              style={{ display: "none" }}
              onChange={handleImportExcel}
            />
          </label>

          {/* Export to Excel */}
          <button
            type="button"
            className="btn-success"
            onClick={handleExportExcel}
            title="Export current view to Excel file"
          >
            <FaFileExcel /> Export to Excel (.xlsx)
          </button>
        </div>
      </header>

      {/* Toast Feedback */}
      {toastMsg && (
        <div className="feedback-toast toast-success">
          <span>{toastMsg}</span>
          <button
            type="button"
            onClick={() => setToastMsg("")}
            style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer" }}
          >
            <FaTimes />
          </button>
        </div>
      )}

      <details className="route-fee-settings">
        <summary>Set bus fee for each route</summary>
        <p>Enter the actual fee for each route. This amount is used to build the student fee roster and compare imported paid details.</p>
        {routeFeeRows.some((route) => !(Number(route.fee_amount) > 0)) && <p className="route-fee-warning">Set a fee for each route before reconciling paid students. Rows on routes without a fee are reported as skipped.</p>}
        <div className="route-fee-grid">{routeFeeRows.map((route) => <div className="route-fee-row" key={route.routeid}>
          <div><strong>{route.routename}</strong><small>{route.city} Â· {route.routeid}</small></div>
          <label>Fee (â‚¹)<input type="number" min="1" step="1" value={route.fee_amount || ""} onChange={(event) => setRouteFeeRows((current) => current.map((item) => item.routeid === route.routeid ? { ...item, fee_amount: event.target.value } : item))} placeholder="Enter amount" /></label>
          <button type="button" className="btn-primary btn-sm" disabled={savingRouteFee === route.routeid} onClick={() => handleSaveRouteFee(route)}>{savingRouteFee === route.routeid ? "Saving..." : "Save fee"}</button>
        </div>)}</div>
      </details>

      {/* KPI Stats Grid */}
      <div className="fees-stats-grid">
        <div className="fees-stat-card">
          <div className="fees-stat-icon icon-blue">
            <FaMoneyBillWave />
          </div>
          <div className="fees-stat-content">
            <h4>Total Fees Assessed</h4>
            <p className="fees-stat-value">â‚¹{summary.totalFeesAssessed.toLocaleString("en-IN")}</p>
            <p className="fees-stat-sub">Across all enrolled bus travellers</p>
          </div>
        </div>

        <div className="fees-stat-card">
          <div className="fees-stat-icon icon-green">
            <FaCheckCircle />
          </div>
          <div className="fees-stat-content">
            <h4>Total Fee Collected</h4>
            <p className="fees-stat-value">â‚¹{summary.totalPaid.toLocaleString("en-IN")}</p>
            <p className="fees-stat-sub">{summary.collectionRate}% Collection Rate</p>
          </div>
        </div>

        <div className="fees-stat-card">
          <div className="fees-stat-icon icon-amber">
            <FaClock />
          </div>
          <div className="fees-stat-content">
            <h4>Total Pending Dues</h4>
            <p className="fees-stat-value">â‚¹{summary.totalPending.toLocaleString("en-IN")}</p>
            <p className="fees-stat-sub">{summary.defaultersCount} Students with Dues</p>
          </div>
        </div>

        <div className="fees-stat-card">
          <div className="fees-stat-icon icon-red">
            <FaExclamationTriangle />
          </div>
          <div className="fees-stat-content">
            <h4>Critical Overdue</h4>
            <p className="fees-stat-value">{summary.criticalOverdueCount} Students</p>
            <p className="fees-stat-sub">Payment past grace due date</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="fees-nav-tabs">
        <button
          type="button"
          className={`fees-tab-btn ${activeTab === "all" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("all");
            setSelectedStatus("All");
          }}
        >
          <FaMoneyBillWave /> All Bus Fees & Master List ({fees.length})
        </button>

        <button
          type="button"
          className={`fees-tab-btn ${activeTab === "pending" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("pending");
            setSelectedStatus("All");
          }}
        >
          <FaExclamationCircle /> Bus Fees Pending List
          <span className="tab-badge">{summary.defaultersCount} Defaulters</span>
        </button>
      </div>

      {/* Toolbar & Filters */}
      <div className="fees-toolbar">
        <div className="fees-toolbar-row">
          {/* Search Box */}
          <div className="fees-search-box">
            <FaSearch color="#94a3b8" />
            <input
              type="text"
              placeholder="Search by student name, roll number, stage, receipt..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="fees-filter-groups">
            <select
              className="fees-select-input"
              value={selectedRoute}
              onChange={(e) => setSelectedRoute(e.target.value)}
            >
              <option value="All">All Routes</option>
              {routes.map((r) => (
                <option key={r.routeid} value={r.routeid}>
                  {r.routeid} - {r.routename}
                </option>
              ))}
            </select>

            <select
              className="fees-select-input"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="All">All Statuses</option>
              {activeTab === "all" && <option value="Paid">Paid</option>}
              <option value="Partial">Partial</option>
              <option value="Pending">Pending</option>
              <option value="Overdue">Overdue</option>
            </select>

            <select
              className="fees-select-input"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              <option value="All">All Years</option>
              <option value="1st Year">1st Year</option>
              <option value="2nd Year">2nd Year</option>
              <option value="3rd Year">3rd Year</option>
              <option value="4th Year">4th Year</option>
            </select>

            <select
              className="fees-select-input"
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
            >
              <option value="All">All Departments</option>
              <option value="CSE">CSE</option>
              <option value="ECE">ECE</option>
              <option value="EEE">EEE</option>
              <option value="MECH">MECH</option>
              <option value="CIVIL">CIVIL</option>
              <option value="IT">IT</option>
              <option value="AIDS">AIDS</option>
            </select>
          </div>
        </div>

        {/* Action Row for Pending Defaulters */}
        {activeTab === "pending" && (
          <div className="fees-toolbar-row" style={{ paddingTop: "8px", borderTop: "1px dashed #e2e8f0" }}>
            <span style={{ fontSize: "13px", fontWeight: "700", color: "#dc2626" }}>
              <FaExclamationTriangle /> Showing {filteredFees.length} students with outstanding bus fees.
            </span>
            <div className="fees-actions-bar">
              <button
                type="button"
                className="btn-danger"
                onClick={handleBulkReminders}
                title="Send SMS & Email fee due reminders to all filtered students"
              >
                <FaBell /> Bulk Send Fee Reminders ({filteredFees.length})
              </button>
            </div>
          </div>
        )}
      </div>

      {activeTab === "pending" && pendingByBus.length > 0 && <section className="pending-bus-summary" aria-label="Pending fees by bus">
        {pendingByBus.map((group) => <article key={group.bus}><span>{group.bus}</span><strong>{group.students} unpaid</strong><small>â‚¹{group.pending.toLocaleString("en-IN")} due</small></article>)}
      </section>}

      {/* Fees Table */}
      <div className="fees-table-card">
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
            Loading bus fees records...
          </div>
        ) : (
          <div className="table-responsive">
            <table className="fees-table">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Name</th>
                  <th>Roll No</th>
                  <th>Dept</th>
                  <th>Route and Boarding Point</th>
                  <th>Bus No</th>
                  <th>Total Fee</th>
                </tr>
              </thead>
              <tbody>
                {filteredFees.length > 0 ? (
                  filteredFees.map((f, idx) => (
                    <tr
                      key={f.id}
                      className={f.status === "Overdue" ? "overdue-row" : ""}
                    >
                      <td>{idx + 1}</td>
                      <td><strong>{f.student_name}</strong></td>
                      <td><code>{f.rollno}</code></td>
                      <td>{f.branch || "N/A"}</td>
                      <td>
                        <strong>{f.routename || f.routeid}</strong>
                        <div style={{ fontSize: "11px", color: "#64748b" }}>{f.routeid}</div>
                        <div style={{ fontSize: "11px", color: "#0d9488" }}>
                          {f.stage_name || "Boarding point not set"}
                        </div>
                      </td>
                      <td>{f.busno || "Not allocated"}</td>
                      <td>
                        <strong>â‚¹{f.total_fee.toLocaleString("en-IN")}</strong>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
                      No bus fees records match your selected filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      {paymentModal.open && paymentModal.item && (
        <div className="modal-overlay" onClick={() => setPaymentModal({ open: false, item: null })}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Record Bus Fee Payment</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setPaymentModal({ open: false, item: null })}
              >
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handleSubmitPayment}>
              <div className="modal-body">
                <div style={{ background: "#f1f5f9", padding: "14px", borderRadius: "10px", marginBottom: "16px" }}>
                  <p style={{ margin: "0 0 4px 0", fontWeight: "800", fontSize: "15px", color: "#0f172a" }}>
                    {paymentModal.item.student_name} ({paymentModal.item.rollno})
                  </p>
                  <p style={{ margin: 0, fontSize: "12px", color: "#475569" }}>
                    {paymentModal.item.branch} - {paymentModal.item.year} | Route: {paymentModal.item.routeid} (Stop: {paymentModal.item.stage_name})
                  </p>
                  <div style={{ marginTop: "8px", display: "flex", gap: "16px", fontSize: "13px" }}>
                    <span>Total Fee: <strong>â‚¹{paymentModal.item.total_fee}</strong></span>
                    <span>Already Paid: <strong style={{ color: "#059669" }}>â‚¹{paymentModal.item.paid_amount}</strong></span>
                    <span>Balance Due: <strong style={{ color: "#dc2626" }}>â‚¹{paymentModal.item.pending_amount}</strong></span>
                  </div>
                </div>

                <div className="form-group">
                  <label>Payment Amount (â‚¹)*</label>
                  <input
                    type="number"
                    className="form-control"
                    required
                    min="1"
                    max={paymentModal.item.pending_amount}
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    placeholder="Enter amount to pay"
                  />
                </div>

                <div className="form-group">
                  <label>Payment Mode*</label>
                  <select
                    className="form-control"
                    value={payMode}
                    onChange={(e) => setPayMode(e.target.value)}
                  >
                    <option value="UPI / GPay">UPI / GPay</option>
                    <option value="Net Banking">Net Banking (NEFT/RTGS)</option>
                    <option value="Cash">Cash at Transport Counter</option>
                    <option value="Demand Draft">Demand Draft / Cheque</option>
                    <option value="Credit / Debit Card">Credit / Debit Card</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Transaction Notes / Bank Reference</label>
                  <input
                    type="text"
                    className="form-control"
                    value={payNotes}
                    onChange={(e) => setPayNotes(e.target.value)}
                    placeholder="e.g. UTR # 4281903429 or Counter Slip #12"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setPaymentModal({ open: false, item: null })}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-success">
                  <FaCheckCircle /> Confirm & Generate Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View & Print Receipt Modal */}
      {receiptModal.open && receiptModal.item && (
        <div className="modal-overlay" onClick={() => setReceiptModal({ open: false, item: null })}>
          <div className="modal-card" style={{ maxWidth: "560px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Transport Fee Payment Receipt</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setReceiptModal({ open: false, item: null })}
              >
                <FaTimes />
              </button>
            </div>
            <div className="modal-body" id="printable-receipt">
              <div style={{ textAlign: "center", borderBottom: "2px dashed #cbd5e1", paddingBottom: "14px", marginBottom: "16px" }}>
                <h4 style={{ margin: "0 0 4px 0", fontSize: "16px", color: "#1e3a8a" }}>National Engineering College</h4>
                <p style={{ margin: 0, fontSize: "11px", color: "#64748b" }}>
                  K.R. Nagar, Kovilpatti - 628503 | Transport Department Fee Receipt
                </p>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "14px", fontSize: "13px" }}>
                <div>
                  <strong>Receipt No:</strong> <span style={{ color: "#2563eb" }}>{receiptModal.item.receipt_no}</span>
                </div>
                <div>
                  <strong>Date:</strong> {receiptModal.item.last_payment_date || new Date().toISOString().split("T")[0]}
                </div>
              </div>

              <table style={{ width: "100%", fontSize: "13px", borderCollapse: "collapse", marginBottom: "16px" }}>
                <tbody>
                  <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "8px 0", color: "#64748b" }}>Student Name:</td>
                    <td style={{ padding: "8px 0", fontWeight: "700" }}>{receiptModal.item.student_name}</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "8px 0", color: "#64748b" }}>Roll Number:</td>
                    <td style={{ padding: "8px 0", fontWeight: "700" }}>{receiptModal.item.rollno}</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "8px 0", color: "#64748b" }}>Department & Year:</td>
                    <td style={{ padding: "8px 0" }}>{receiptModal.item.branch} ({receiptModal.item.year})</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "8px 0", color: "#64748b" }}>Route & Boarding Stop:</td>
                    <td style={{ padding: "8px 0" }}>Route {receiptModal.item.routeid} - {receiptModal.item.stage_name}</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "8px 0", color: "#64748b" }}>Total Bus Fee:</td>
                    <td style={{ padding: "8px 0" }}>â‚¹{receiptModal.item.total_fee.toLocaleString("en-IN")}</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "8px 0", color: "#64748b" }}>Amount Paid:</td>
                    <td style={{ padding: "8px 0", color: "#059669", fontWeight: "800", fontSize: "15px" }}>
                      â‚¹{receiptModal.item.paid_amount.toLocaleString("en-IN")}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "8px 0", color: "#64748b" }}>Balance Due:</td>
                    <td style={{ padding: "8px 0", color: receiptModal.item.pending_amount > 0 ? "#dc2626" : "#059669", fontWeight: "700" }}>
                      â‚¹{receiptModal.item.pending_amount.toLocaleString("en-IN")}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 0", color: "#64748b" }}>Payment Mode:</td>
                    <td style={{ padding: "8px 0" }}>{receiptModal.item.payment_mode || "UPI"}</td>
                  </tr>
                </tbody>
              </table>

              <div style={{ textAlign: "right", marginTop: "24px", fontSize: "12px", color: "#64748b" }}>
                <p style={{ margin: "0 0 25px 0" }}>Authorized Signatory</p>
                <strong>Transport Officer / Accounts Admin</strong>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => window.print()}
              >
                <FaPrint /> Print Receipt
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => setReceiptModal({ open: false, item: null })}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusFeesManagement;
