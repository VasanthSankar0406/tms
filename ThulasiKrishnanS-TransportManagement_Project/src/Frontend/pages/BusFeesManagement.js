import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import * as XLSX from "xlsx";
import {
  Receipt,
  CreditCard,
  Clock,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  FileSpreadsheet,
  Download,
  UploadCloud,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Bell,
  FileText,
  Users,
  Printer,
  Route as RouteIcon
} from "lucide-react";
import { API_URL } from "../config";
import "../styles/BusFeesManagement.css";

const BusFeesManagement = ({ initialTab = "all" }) => {
  const navigate = useNavigate();

  // Core States
  const [activeTab, setActiveTab] = useState(initialTab); // "all" or "pending"
  const [fees, setFees] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [routeFeeRows, setRouteFeeRows] = useState([]);
  const [isRouteFeeExpanded, setIsRouteFeeExpanded] = useState(false);
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSendingReminders, setIsSendingReminders] = useState(false);

  // Flash Notification State
  const [flashCard, setFlashCard] = useState(null);
  const flashTimerRef = useRef(null);

  // Filters State
  const [search, setSearch] = useState("");
  const [selectedRoute, setSelectedRoute] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedYear, setSelectedYear] = useState("All");
  const [selectedBranch, setSelectedBranch] = useState("All");

  // Pagination State (Fixed 5 records per page)
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;

  // Modals State
  const [paymentModal, setPaymentModal] = useState({ open: false, item: null });
  const [payAmount, setPayAmount] = useState("");
  const [payMode, setPayMode] = useState("UPI / GPay");
  const [payNotes, setPayNotes] = useState("");
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  const [receiptModal, setReceiptModal] = useState({ open: false, item: null });

  // Currency Formatter with Indian Rupee symbol and Indian number notation
  const formatCurrency = (amount, decimals = 2) => {
    const num = Number(amount) || 0;
    return `₹${num.toLocaleString("en-IN", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    })}`;
  };

  const normalizeYear = (value) => {
    const year = String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
    const aliases = {
      "1": "1styear",
      "1st": "1styear",
      first: "1styear",
      firstyear: "1styear",
      i: "1styear",
      iyear: "1styear",
      "2": "2ndyear",
      "2nd": "2ndyear",
      second: "2ndyear",
      secondyear: "2ndyear",
      ii: "2ndyear",
      iiyear: "2ndyear",
      "3": "3rdyear",
      "3rd": "3rdyear",
      third: "3rdyear",
      thirdyear: "3rdyear",
      iii: "3rdyear",
      iiiyear: "3rdyear",
      "4": "4thyear",
      "4th": "4thyear",
      fourth: "4thyear",
      fourthyear: "4thyear",
      iv: "4thyear",
      ivyear: "4thyear"
    };
    return aliases[year] || year;
  };

  const showFlash = (message, type = "success", title = "") => {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    const defaultTitle =
      type === "danger" ? "Error Occurred" : type === "warning" ? "Notice" : "Success";
    setFlashCard({
      type,
      message,
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

  // Fetch initial data
  useEffect(() => {
    fetchFees();
    fetchRoutes();
    fetchRouteFees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset pagination to page 1 whenever activeTab, search, or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, search, selectedRoute, selectedStatus, selectedYear, selectedBranch]);

  const fetchFees = async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    else setLoading(true);

    try {
      const res = await axios.get(`${API_URL}/api/bus-fees`);
      if (res.data && res.data.success) {
        setFees(res.data.fees || []);
        if (res.data.summary) setSummary(res.data.summary);
        if (isManualRefresh) {
          showFlash("Bus fees and student roster refreshed successfully.", "success", "Refreshed");
        }
      } else {
        showFlash(res.data?.message || "Failed to load fee records.", "danger");
      }
    } catch (err) {
      console.error("Error fetching fees data:", err);
      showFlash("Failed to fetch bus fees records from server.", "danger");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
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
    } catch (err) {
      console.error("Error loading route bus fees", err);
    }
  };

  const handleSaveRouteFee = async (route) => {
    try {
      setSavingRouteFee(route.routeid);
      await axios.put(`${API_URL}/api/bus-route-fees/${encodeURIComponent(route.routeid)}`, {
        fee_amount: route.fee_amount
      });
      showFlash(
        `Bus fee of ${formatCurrency(route.fee_amount)} saved for ${route.routename}.`,
        "success",
        "Route Fee Saved"
      );
      fetchFees();
      fetchRouteFees();
    } catch (err) {
      showFlash(err.response?.data?.message || "Could not save route bus fee.", "danger");
    } finally {
      setSavingRouteFee("");
    }
  };

  // 1. Export Bus Fees to Excel (.xlsx)
  const handleExportExcel = () => {
    if (filteredFees.length === 0) {
      showFlash("No fee records available to export.", "warning");
      return;
    }

    const exportData = filteredFees.map((f, idx) => ({
      "S.No": idx + 1,
      "Student Name": f.student_name,
      "Roll No": f.rollno,
      Department: f.branch || "—",
      Year: f.year || "—",
      "Route and Boarding Point": [f.routename || f.routeid, f.stage_name].filter(Boolean).join(" - "),
      "Bus No": f.busno || "Not allocated",
      "Total Fees (INR)": f.total_fee || 0,
      "Paid Amount (INR)": f.paid_amount || 0,
      "Pending Amount (INR)": f.pending_amount || 0,
      "Payment Status": f.status || "Pending",
      "Payment Mode": f.payment_mode || "—",
      "Receipt No": f.receipt_no || "—",
      "Last Payment Date": f.last_payment_date || "—"
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    const sheetName = activeTab === "pending" ? "Bus_Fees_Pending_List" : "Bus_Fees_Master";
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    const dateStamp = new Date().toISOString().split("T")[0];
    const fileName =
      activeTab === "pending"
        ? `Bus_Fees_Pending_Defaulters_${dateStamp}.xlsx`
        : `Bus_Fees_Master_Report_${dateStamp}.xlsx`;

    XLSX.writeFile(workbook, fileName);
    showFlash(`Excel report "${fileName}" exported successfully!`, "success", "Export Completed");
  };

  // 2. Download Excel Format / Template (.xlsx)
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        "Roll No": "2312078",
        "Paid Amount": 20000,
        "Total Fee": 20000,
        "Payment Status": "Paid",
        "Payment Mode": "UPI / GPay",
        "Receipt No": "REC-101",
        "Payment Date": new Date().toISOString().split("T")[0]
      },
      {
        "Roll No": "2312056",
        "Paid Amount": 10000,
        "Total Fee": 20000,
        "Payment Status": "Partial",
        "Payment Mode": "Cash",
        "Receipt No": "REC-102",
        "Payment Date": new Date().toISOString().split("T")[0]
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Paid_Students_Template");
    XLSX.writeFile(wb, "Paid_Students_Import_Template.xlsx");
    showFlash(
      "Paid-student import template downloaded. Enter each student's Roll No and Paid Amount.",
      "success",
      "Template Downloaded"
    );
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
          showFlash("Uploaded Excel spreadsheet is empty.", "warning");
          return;
        }

        const value = (row, aliases) => {
          const indexed = new Map(
            Object.entries(row).map(([key, item]) => [
              String(key).toLowerCase().replace(/[^a-z0-9]/g, ""),
              item
            ])
          );
          for (const alias of aliases) {
            const found = indexed.get(alias.toLowerCase().replace(/[^a-z0-9]/g, ""));
            if (found !== undefined && String(found).trim()) return String(found).trim();
          }
          return "";
        };

        const formatted = data
          .map((row) => ({
            rollno: value(row, ["Roll No", "RollNo", "Reg No", "REG NO", "Registration Number"]),
            paid_amount: value(row, ["Paid Amount", "Amount Paid", "Paid", "paid_amount"]),
            total_fee: value(row, ["Total Fees", "Total Fee", "Bus Fee", "total_fee"]),
            status: value(row, ["Payment Status", "Status"]),
            payment_mode: value(row, ["Payment Mode"]),
            receipt_no: value(row, ["Receipt Number", "Receipt No", "ReceiptNo"]),
            last_payment_date: value(row, ["Payment Date", "Last Payment Date"])
          }))
          .filter(
            (row) =>
              row.rollno && (!row.status || ["paid", "partial"].includes(row.status.toLowerCase()))
          );

        if (!formatted.length) {
          showFlash("No rows with a valid Roll No were found in this spreadsheet.", "danger");
          return;
        }

        if (
          !window.confirm(
            `Import this spreadsheet with ${formatted.length} student records? Travellers missing from the file will be updated accordingly.`
          )
        ) {
          return;
        }

        const res = await axios.post(`${API_URL}/api/bus-fees/reconcile-paid-list`, {
          records: formatted
        });
        showFlash(
          res.data.message || `Paid list processed for ${formatted.length} students.`,
          "success",
          "Import Successful"
        );
        fetchFees();
      } catch (err) {
        console.error("Excel import error", err);
        showFlash(
          err.response?.data?.message || "Could not process this paid-student spreadsheet.",
          "danger"
        );
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
      showFlash(
        res.data.message || `Fee reminder notice sent to ${feeItem.student_name}!`,
        "success",
        "Reminder Dispatched"
      );
    } catch (err) {
      console.error("Reminder dispatch error", err);
      showFlash("Failed to send reminder alert.", "danger");
    }
  };

  // 5. Bulk Send Reminders for currently filtered defaulters
  const handleBulkReminders = async () => {
    const unpaidList = filteredFees.filter((f) => Number(f.pending_amount) > 0);
    if (unpaidList.length === 0) {
      showFlash("No pending defaulters in current filtered list.", "warning");
      return;
    }

    setIsSendingReminders(true);
    try {
      const res = await axios.post(`${API_URL}/api/bus-fees/send-reminder`, {
        ids: unpaidList.map((f) => f.id)
      });
      showFlash(
        res.data.message || `Bulk reminders dispatched to ${unpaidList.length} students!`,
        "success",
        "Bulk Reminders Dispatched"
      );
    } catch (err) {
      console.error("Bulk reminder error", err);
      showFlash("Failed to dispatch bulk reminders.", "danger");
    } finally {
      setIsSendingReminders(false);
    }
  };

  // 6. Record Fee Payment
  const handleOpenPayment = (item) => {
    setPaymentModal({ open: true, item });
    setPayAmount(
      String(
        Number(item.pending_amount) > 0
          ? item.pending_amount
          : Number(item.total_fee) > 0
          ? item.total_fee
          : "20000"
      )
    );
    setPayMode("UPI / GPay");
    setPayNotes("");
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (!paymentModal.item) return;

    setIsSubmittingPayment(true);
    try {
      const res = await axios.post(`${API_URL}/api/bus-fees/pay`, {
        id: paymentModal.item.id,
        amount: Number(payAmount),
        payment_mode: payMode,
        notes: payNotes
      });

      showFlash(
        res.data.message || `Payment of ${formatCurrency(payAmount)} recorded successfully!`,
        "success",
        "Payment Recorded"
      );
      setPaymentModal({ open: false, item: null });
      fetchFees();
    } catch (err) {
      console.error("Payment error", err);
      showFlash(err.response?.data?.message || "Failed to record payment.", "danger");
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleResetFilters = () => {
    setSearch("");
    setSelectedRoute("All");
    setSelectedStatus("All");
    setSelectedYear("All");
    setSelectedBranch("All");
  };

  const hasActiveFilters = Boolean(
    search ||
      selectedRoute !== "All" ||
      selectedStatus !== "All" ||
      selectedYear !== "All" ||
      selectedBranch !== "All"
  );

  // Filter fees based on active tab & filters
  const filteredFees = useMemo(() => {
    return fees.filter((f) => {
      // If in "pending" tab, only show unpaid records
      if (activeTab === "pending" && !(Number(f.pending_amount) > 0)) {
        return false;
      }

      if (selectedRoute !== "All" && String(f.routeid) !== String(selectedRoute)) {
        return false;
      }

      if (selectedStatus !== "All" && f.status !== selectedStatus) {
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
        const matchName = String(f.student_name || "").toLowerCase().includes(q);
        const matchRoll = String(f.rollno || "").toLowerCase().includes(q);
        const matchReceipt = String(f.receipt_no || "").toLowerCase().includes(q);
        const matchStage = String(f.stage_name || "").toLowerCase().includes(q);

        if (!matchName && !matchRoll && !matchReceipt && !matchStage) {
          return false;
        }
      }

      return true;
    });
  }, [fees, activeTab, selectedRoute, selectedStatus, selectedYear, selectedBranch, search]);

  // Group pending dues by bus
  const pendingByBus = useMemo(() => {
    return Object.values(
      filteredFees
        .filter((fee) => Number(fee.pending_amount) > 0)
        .reduce((groups, fee) => {
          const bus = fee.busno ? `Bus #${fee.busno}` : "Bus not assigned";
          groups[bus] ||= { bus, students: 0, pending: 0 };
          groups[bus].students += 1;
          groups[bus].pending += Number(fee.pending_amount) || 0;
          return groups;
        }, {})
    );
  }, [filteredFees]);

  // Pagination Calculations (Strictly 5 records per page)
  const totalPages = Math.max(1, Math.ceil(filteredFees.length / rowsPerPage));
  const startIndex = filteredFees.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const endIndex = Math.min(currentPage * rowsPerPage, filteredFees.length);
  const paginatedFees = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredFees.slice(start, start + rowsPerPage);
  }, [filteredFees, currentPage, rowsPerPage]);

  return (
    <div className="fees-master-container">
      <div className="fees-box-wrapper">
        {/* 3-Second Flash Notification */}
        {flashCard && (
          <aside className={`m-flash-card ${flashCard.type}`} role="alert">
            <div className="m-flash-indicator" />
            <div className="m-flash-content">
              <div className="m-flash-header">
                <span className="m-flash-title">{flashCard.title}</span>
                <button
                  type="button"
                  className="m-flash-dismiss"
                  onClick={() => setFlashCard(null)}
                  aria-label="Close notification"
                >
                  <X size={14} />
                </button>
              </div>
              <p className="m-flash-message">{flashCard.message}</p>
            </div>
          </aside>
        )}

        {/* 1. Breadcrumb Navigation & Compact Page Header */}
        <nav className="vm-breadcrumb-nav" aria-label="Breadcrumb">
          <span className="link" onClick={() => navigate("/home")}>
            Dashboard
          </span>
          <span className="sep">/</span>
          <span className="link" onClick={() => navigate("/home")}>
            Fee Collections
          </span>
          <span className="sep">/</span>
          <span className="current">Bus Fees & Excel Format</span>
        </nav>

        <header className="vm-page-header">
          <div className="vm-header-left">
            <div className="vm-title-row">
              <div className="vm-title-icon-badge" title="Bus Fees Management">
                <Receipt size={18} />
              </div>
              <h1 className="vm-page-title">Bus Fees & Excel Format</h1>
              <span className="vm-total-count-badge">
                {fees.length} {fees.length === 1 ? "Student Enrolled" : "Students Enrolled"}
              </span>
            </div>
            <p className="vm-page-subtitle">
              Manage route-wise bus fees, student payments, pending dues, and fee reports.
            </p>
          </div>

          <div className="vm-header-actions">
            <button
              type="button"
              className="vm-btn-secondary"
              onClick={() => fetchFees(true)}
              disabled={isRefreshing}
              title="Refresh fee records"
            >
              <RotateCcw size={15} className={isRefreshing ? "spin-icon" : ""} />
              <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
            </button>

            {/* Paid List Template Download */}
            <button
              type="button"
              className="vm-btn-secondary"
              onClick={handleDownloadTemplate}
              title="Download Excel spreadsheet template for paid student import"
            >
              <Download size={15} />
              <span>Paid List Template</span>
            </button>

            {/* Import Paid Student List */}
            <label className="vm-file-upload-btn" title="Import paid students from Excel file">
              <UploadCloud size={15} />
              <span>Import Paid Student List</span>
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
              className="vm-btn-secondary vm-btn-excel"
              onClick={handleExportExcel}
              disabled={filteredFees.length === 0}
              title="Export current fee roster to Excel (.xlsx)"
            >
              <FileSpreadsheet size={15} />
              <span>Export to Excel (.xlsx)</span>
            </button>
          </div>
        </header>

        {/* 2. Route-Wise Fee Configuration (Expandable Card) */}
        <section className="route-fee-settings-card" aria-label="Route Bus Fee Configuration">
          <div
            className="route-fee-summary-header"
            onClick={() => setIsRouteFeeExpanded(!isRouteFeeExpanded)}
          >
            <div className="route-fee-header-left">
              <RouteIcon size={16} color="#1e3a8a" />
              <h3>Set Bus Fee for Each Route</h3>
              <span className="badge-routes-count">{routeFeeRows.length} Routes Configured</span>
            </div>
            <div className="route-fee-expand-icon">
              {isRouteFeeExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>
          </div>

          {isRouteFeeExpanded && (
            <div className="route-fee-body">
              <p className="route-fee-desc">
                Enter the actual fee for each route. This amount is used to build the student fee
                roster and compare imported paid details.
              </p>

              {routeFeeRows.some((route) => !(Number(route.fee_amount) > 0)) && (
                <div className="route-fee-warning-banner">
                  <AlertTriangle size={15} />
                  <span>
                    Set a fee for each route before reconciling paid students. Rows on routes without
                    a fee are reported as skipped.
                  </span>
                </div>
              )}

              <div className="route-fee-grid">
                {routeFeeRows.map((route) => (
                  <div className="route-fee-row" key={route.routeid}>
                    <div className="route-fee-info">
                      <span className="route-fee-name">{route.routename}</span>
                      <span className="route-fee-meta">
                        {route.city} • {route.routeid}
                      </span>
                    </div>

                    <div className="route-fee-input-wrap">
                      <div className="route-fee-input-box">
                        <span className="route-fee-currency-symbol">₹</span>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={route.fee_amount || ""}
                          onChange={(e) =>
                            setRouteFeeRows((current) =>
                              current.map((item) =>
                                item.routeid === route.routeid
                                  ? { ...item, fee_amount: e.target.value }
                                  : item
                              )
                            )
                          }
                          placeholder="Amount"
                          aria-label={`Fee for ${route.routename}`}
                        />
                      </div>

                      <button
                        type="button"
                        className="route-fee-save-btn"
                        disabled={savingRouteFee === route.routeid}
                        onClick={() => handleSaveRouteFee(route)}
                      >
                        {savingRouteFee === route.routeid ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* 3. Four Compact Summary Cards in One Row */}
        <section className="fees-summary-grid" aria-label="Bus Fees Overview Metrics">
          {/* Card 1: Total Fees Assessed */}
          <div className="fees-summary-card">
            <div className="summary-icon-box summary-icon-blue">
              <CreditCard size={20} />
            </div>
            <div className="summary-card-content">
              <span className="summary-card-label">Total Fees Assessed</span>
              <span className="summary-card-val">
                {formatCurrency(summary.totalFeesAssessed)}
              </span>
              <span className="summary-card-sub">Across all enrolled bus travellers</span>
            </div>
          </div>

          {/* Card 2: Total Fee Collected */}
          <div className="fees-summary-card">
            <div className="summary-icon-box summary-icon-green">
              <CheckCircle2 size={20} />
            </div>
            <div className="summary-card-content">
              <span className="summary-card-label">Total Fee Collected</span>
              <span className="summary-card-val">{formatCurrency(summary.totalPaid)}</span>
              <span className="summary-card-sub">{summary.collectionRate}% Collection Rate</span>
            </div>
          </div>

          {/* Card 3: Total Pending Dues */}
          <div className="fees-summary-card">
            <div className="summary-icon-box summary-icon-amber">
              <Clock size={20} />
            </div>
            <div className="summary-card-content">
              <span className="summary-card-label">Total Pending Dues</span>
              <span className="summary-card-val">{formatCurrency(summary.totalPending)}</span>
              <span className="summary-card-sub">
                {summary.defaultersCount} Students with Dues
              </span>
            </div>
          </div>

          {/* Card 4: Critical Overdue */}
          <div className="fees-summary-card">
            <div className="summary-icon-box summary-icon-red">
              <AlertTriangle size={20} />
            </div>
            <div className="summary-card-content">
              <span className="summary-card-label">Critical Overdue</span>
              <span className="summary-card-val">
                {summary.criticalOverdueCount}{" "}
                {summary.criticalOverdueCount === 1 ? "Student" : "Students"}
              </span>
              <span className="summary-card-sub">Payment past grace due date</span>
            </div>
          </div>
        </section>

        {/* 4. Tabs Navigation */}
        <div className="fees-nav-tabs" role="tablist">
          <button
            type="button"
            className={`fees-tab-btn ${activeTab === "all" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("all");
              setSelectedStatus("All");
            }}
            role="tab"
            aria-selected={activeTab === "all"}
          >
            <Receipt size={16} />
            <span>All Bus Fees & Master List</span>
            <span className="tab-count-badge">{fees.length}</span>
          </button>

          <button
            type="button"
            className={`fees-tab-btn ${activeTab === "pending" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("pending");
              setSelectedStatus("All");
            }}
            role="tab"
            aria-selected={activeTab === "pending"}
          >
            <AlertCircle size={16} />
            <span>Bus Fees Pending List</span>
            <span className="tab-count-badge tab-badge-defaulters">
              {summary.defaultersCount} Defaulters
            </span>
          </button>
        </div>

        {/* 5. Compact Search and Filters Toolbar Card */}
        <section className="fees-filter-toolbar" aria-label="Search and Filter Controls">
          <div className="fees-filter-row">
            {/* Search Input */}
            <div className="fees-search-box">
              <Search size={14} color="#94a3b8" />
              <input
                type="text"
                placeholder="Search by student name, roll number, stage, receipt..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search student fees"
              />
              {search && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => setSearch("")}
                  title="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Filter Dropdowns */}
            <div className="fees-filter-groups">
              <select
                className="fees-select-input"
                value={selectedRoute}
                onChange={(e) => setSelectedRoute(e.target.value)}
                aria-label="Filter by Route"
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
                aria-label="Filter by Status"
              >
                <option value="All">All Statuses</option>
                {activeTab === "all" && <option value="Paid">Paid</option>}
                <option value="Partial">Partial</option>
                <option value="Pending">Pending</option>
                <option value="Overdue">Overdue</option>
                {activeTab === "all" && <option value="Fee Not Set">Fee Not Set</option>}
              </select>

              <select
                className="fees-select-input"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                aria-label="Filter by Academic Year"
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
                aria-label="Filter by Department"
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

              <button
                type="button"
                className="fees-btn-reset-filters"
                onClick={handleResetFilters}
                disabled={!hasActiveFilters}
                title="Reset all filters"
              >
                <RotateCcw size={13} />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Action Row for Pending Defaulters */}
          {activeTab === "pending" && (
            <div className="fees-defaulters-alert-banner">
              <div className="defaulters-alert-text">
                <AlertTriangle size={15} />
                <span>
                  Showing {filteredFees.length} students with outstanding bus fees.
                </span>
              </div>
              <button
                type="button"
                className="vm-btn-danger"
                onClick={handleBulkReminders}
                disabled={filteredFees.length === 0 || isSendingReminders}
                title="Send SMS & Email fee due reminders to all filtered students"
              >
                <Bell size={14} />
                <span>
                  {isSendingReminders
                    ? "Dispatching..."
                    : `Bulk Send Fee Reminders (${filteredFees.length})`}
                </span>
              </button>
            </div>
          )}
        </section>

        {/* Pending fees aggregated by bus */}
        {activeTab === "pending" && pendingByBus.length > 0 && (
          <section className="pending-bus-summary" aria-label="Pending fees by bus">
            {pendingByBus.map((group) => (
              <article key={group.bus} className="pending-bus-card">
                <span className="pending-bus-name">{group.bus}</span>
                <span className="pending-bus-students">{group.students} unpaid travellers</span>
                <span className="pending-bus-amount">{formatCurrency(group.pending)} due</span>
              </article>
            ))}
          </section>
        )}

        {/* 6. Student Fees Table Card with Fixed 5-Row Pagination */}
        <section className="fees-table-card" aria-label="Student Fee Roster Table">
          {loading ? (
            <div style={{ padding: "48px", textAlign: "center", color: "#64748b" }}>
              Loading bus fees records...
            </div>
          ) : (
            <div className="fees-table-responsive">
              <table className="fees-table">
                <thead>
                  <tr>
                    <th style={{ width: "55px" }}>S.No</th>
                    <th>Student Name</th>
                    <th>Roll No</th>
                    <th>Dept & Year</th>
                    <th>Route and Boarding Point</th>
                    <th>Bus No</th>
                    <th>Total Fee</th>
                    <th>Paid Amount</th>
                    <th>Pending Dues</th>
                    <th>Status</th>
                    <th style={{ textAlign: "center", width: "230px" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedFees.length > 0 ? (
                    paginatedFees.map((f, idx) => (
                      <tr key={f.id} className={f.status === "Overdue" ? "overdue-row" : ""}>
                        <td>{startIndex + idx}</td>
                        <td>
                          <strong>{f.student_name}</strong>
                        </td>
                        <td>
                          <span className="student-roll-code">{f.rollno}</span>
                        </td>
                        <td>
                          {f.branch || "—"} {f.year ? `(${f.year})` : ""}
                        </td>
                        <td>
                          <strong>{f.routename || f.routeid}</strong>
                          <div style={{ fontSize: "11px", color: "#64748b" }}>
                            Route {f.routeid}
                          </div>
                          <div style={{ fontSize: "11px", color: "#0d9488" }}>
                            {f.stage_name || "Boarding point not set"}
                          </div>
                        </td>
                        <td>
                          {f.busno ? (
                            <span style={{ fontWeight: "700", color: "#0f2744" }}>
                              Bus #{f.busno}
                            </span>
                          ) : (
                            <span style={{ color: "#94a3b8" }}>Not allocated</span>
                          )}
                        </td>
                        <td>
                          <strong>{formatCurrency(f.total_fee)}</strong>
                        </td>
                        <td>
                          <span style={{ color: "#166534", fontWeight: "700" }}>
                            {formatCurrency(f.paid_amount)}
                          </span>
                        </td>
                        <td>
                          <span
                            style={{
                              color: Number(f.pending_amount) > 0 ? "#dc2626" : "#166534",
                              fontWeight: "700"
                            }}
                          >
                            {formatCurrency(f.pending_amount)}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`fee-badge ${
                              f.status === "Paid"
                                ? "badge-paid"
                                : f.status === "Partial"
                                ? "badge-partial"
                                : f.status === "Pending"
                                ? "badge-pending"
                                : f.status === "Overdue"
                                ? "badge-overdue"
                                : "badge-not-set"
                            }`}
                          >
                            {f.status || "Pending"}
                          </span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <div className="fee-actions-cell">
                            <button
                              type="button"
                              className="fee-btn-action-pay"
                              onClick={() => handleOpenPayment(f)}
                              title="Record or collect fee payment"
                            >
                              <CreditCard size={12} />
                              <span>Pay Fee</span>
                            </button>

                            <button
                              type="button"
                              className="fee-btn-action-remind"
                              onClick={() => handleSendReminder(f)}
                              title="Send fee due reminder notification"
                            >
                              <Bell size={12} />
                              <span>Remind</span>
                            </button>

                            <button
                              type="button"
                              className="fee-btn-action-receipt"
                              onClick={() => setReceiptModal({ open: true, item: f })}
                              title="View & print payment receipt"
                            >
                              <FileText size={12} />
                              <span>Receipt</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="11">
                        <div className="table-empty-box">
                          <Users size={36} strokeWidth={1.5} color="#94a3b8" />
                          <h4>No Bus Fee Records Found</h4>
                          <p>
                            {hasActiveFilters
                              ? "No student fee records match your search or filter criteria. Try resetting your filters."
                              : activeTab === "pending"
                              ? "Great news! There are no students with pending bus fee dues."
                              : "No bus fee records found. Use the route fee configuration above to set fees and import paid student records."}
                          </p>
                          {hasActiveFilters && (
                            <button
                              type="button"
                              className="vm-btn-secondary"
                              onClick={handleResetFilters}
                              style={{ marginTop: "8px" }}
                            >
                              Reset Filters
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* 7. Strict 5-Row Pagination Footer (No rows-per-page dropdown) */}
          <div className="fees-pagination-bar">
            <div className="pagination-left">
              <span className="pagination-records-info">
                Showing {startIndex}–{endIndex} of {filteredFees.length}{" "}
                {filteredFees.length === 1 ? "student" : "students"}
              </span>
            </div>

            <div className="pagination-controls-wrap">
              <button
                type="button"
                className="pg-nav-btn"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                aria-label="Previous Page"
              >
                <ChevronLeft size={14} />
                <span>Prev</span>
              </button>

              <div className="pg-num-list">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => {
                  if (
                    totalPages <= 7 ||
                    pg === 1 ||
                    pg === totalPages ||
                    Math.abs(pg - currentPage) <= 1
                  ) {
                    return (
                      <button
                        key={pg}
                        type="button"
                        className={`pg-num-btn ${currentPage === pg ? "active" : ""}`}
                        onClick={() => setCurrentPage(pg)}
                        aria-current={currentPage === pg ? "page" : undefined}
                      >
                        {pg}
                      </button>
                    );
                  }
                  if (
                    (pg === 2 && currentPage > 3) ||
                    (pg === totalPages - 1 && currentPage < totalPages - 2)
                  ) {
                    return (
                      <span
                        key={pg}
                        style={{ padding: "0 4px", color: "#94a3b8", fontSize: "0.8rem" }}
                      >
                        ...
                      </span>
                    );
                  }
                  return null;
                })}
              </div>

              <button
                type="button"
                className="pg-nav-btn"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || filteredFees.length === 0}
                aria-label="Next Page"
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Modal: Record Fee Payment */}
      {paymentModal.open && paymentModal.item && (
        <div
          className="fees-modal-backdrop"
          onClick={() => setPaymentModal({ open: false, item: null })}
        >
          <div className="fees-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="fees-modal-header">
              <h3>Record Bus Fee Payment</h3>
              <button
                type="button"
                className="fees-modal-close"
                onClick={() => setPaymentModal({ open: false, item: null })}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitPayment}>
              <div className="fees-modal-body">
                <div className="fees-student-callout">
                  <p className="fees-student-callout-title">
                    {paymentModal.item.student_name} ({paymentModal.item.rollno})
                  </p>
                  <p className="fees-student-callout-sub">
                    {paymentModal.item.branch} - {paymentModal.item.year} | Route:{" "}
                    {paymentModal.item.routeid} (Stop: {paymentModal.item.stage_name})
                  </p>
                  <div className="fees-student-callout-dues">
                    <span>
                      Total Fee: <strong>{formatCurrency(paymentModal.item.total_fee)}</strong>
                    </span>
                    <span>
                      Already Paid:{" "}
                      <strong style={{ color: "#166534" }}>
                        {formatCurrency(paymentModal.item.paid_amount)}
                      </strong>
                    </span>
                    <span>
                      Balance Due:{" "}
                      <strong style={{ color: "#dc2626" }}>
                        {formatCurrency(paymentModal.item.pending_amount)}
                      </strong>
                    </span>
                  </div>
                </div>

                <div className="fees-form-group">
                  <label htmlFor="pay-amount-input">Payment Amount (₹)*</label>
                  <input
                    id="pay-amount-input"
                    type="number"
                    className="fees-form-control"
                    required
                    min="1"
                    max={
                      Number(paymentModal.item.pending_amount) > 0
                        ? paymentModal.item.pending_amount
                        : undefined
                    }
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    placeholder="Enter amount to pay"
                  />
                </div>

                <div className="fees-form-group">
                  <label htmlFor="pay-mode-select">Payment Mode*</label>
                  <select
                    id="pay-mode-select"
                    className="fees-form-control"
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

                <div className="fees-form-group">
                  <label htmlFor="pay-notes-input">Transaction Notes / Bank Reference</label>
                  <input
                    id="pay-notes-input"
                    type="text"
                    className="fees-form-control"
                    value={payNotes}
                    onChange={(e) => setPayNotes(e.target.value)}
                    placeholder="e.g. UTR # 4281903429 or Counter Slip #12"
                  />
                </div>
              </div>

              <div className="fees-modal-footer">
                <button
                  type="button"
                  className="vm-btn-secondary"
                  onClick={() => setPaymentModal({ open: false, item: null })}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="vm-btn-primary"
                  disabled={!payAmount || isSubmittingPayment}
                >
                  <CheckCircle2 size={15} />
                  <span>{isSubmittingPayment ? "Recording..." : "Confirm & Record Payment"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View & Print Payment Receipt */}
      {receiptModal.open && receiptModal.item && (
        <div
          className="fees-modal-backdrop"
          onClick={() => setReceiptModal({ open: false, item: null })}
        >
          <div
            className="fees-modal-card"
            style={{ maxWidth: "560px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="fees-modal-header">
              <h3>Transport Fee Payment Receipt</h3>
              <button
                type="button"
                className="fees-modal-close"
                onClick={() => setReceiptModal({ open: false, item: null })}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="fees-modal-body">
              <div className="receipt-paper-box" id="printable-receipt">
                <div className="receipt-institution-header">
                  <h4>National Engineering College</h4>
                  <p>K.R. Nagar, Kovilpatti - 628503 | Transport Department Fee Receipt</p>
                </div>

                <div className="receipt-top-meta">
                  <div>
                    <strong>Receipt No:</strong>{" "}
                    <span style={{ color: "#1e3a8a", fontWeight: "700" }}>
                      {receiptModal.item.receipt_no || "REC-AUTOGEN"}
                    </span>
                  </div>
                  <div>
                    <strong>Date:</strong>{" "}
                    {receiptModal.item.last_payment_date || new Date().toISOString().split("T")[0]}
                  </div>
                </div>

                <table className="receipt-table">
                  <tbody>
                    <tr>
                      <td>Student Name:</td>
                      <td>{receiptModal.item.student_name}</td>
                    </tr>
                    <tr>
                      <td>Roll Number:</td>
                      <td>{receiptModal.item.rollno}</td>
                    </tr>
                    <tr>
                      <td>Department & Year:</td>
                      <td>
                        {receiptModal.item.branch} ({receiptModal.item.year})
                      </td>
                    </tr>
                    <tr>
                      <td>Route & Boarding Stop:</td>
                      <td>
                        Route {receiptModal.item.routeid} - {receiptModal.item.stage_name}
                      </td>
                    </tr>
                    <tr>
                      <td>Total Bus Fee:</td>
                      <td>{formatCurrency(receiptModal.item.total_fee)}</td>
                    </tr>
                    <tr>
                      <td>Amount Paid:</td>
                      <td style={{ color: "#166534", fontSize: "0.95rem" }}>
                        {formatCurrency(receiptModal.item.paid_amount)}
                      </td>
                    </tr>
                    <tr>
                      <td>Balance Due:</td>
                      <td
                        style={{
                          color:
                            receiptModal.item.pending_amount > 0 ? "#dc2626" : "#166534"
                        }}
                      >
                        {formatCurrency(receiptModal.item.pending_amount)}
                      </td>
                    </tr>
                    <tr>
                      <td>Payment Mode:</td>
                      <td>{receiptModal.item.payment_mode || "UPI"}</td>
                    </tr>
                  </tbody>
                </table>

                <div className="receipt-signatory-wrap">
                  <p style={{ margin: "0 0 20px 0" }}>Authorized Signatory</p>
                  <strong>Transport Officer / Accounts Admin</strong>
                </div>
              </div>
            </div>

            <div className="fees-modal-footer">
              <button
                type="button"
                className="vm-btn-secondary"
                onClick={() => window.print()}
                title="Print receipt"
              >
                <Printer size={15} />
                <span>Print Receipt</span>
              </button>
              <button
                type="button"
                className="vm-btn-primary"
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
