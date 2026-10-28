import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  RotateCcw,
  FileSpreadsheet,
  X,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Route as RouteIcon,
  IndianRupee,
  ExternalLink,
  CreditCard
} from "lucide-react";
import { API_URL } from "../../config";
import "../../styles/ViewVehicle.css";
import "../../styles/ViewCost.css";
import { exportToExcel } from "../ReportGenerator";

const ViewCost = () => {
  const navigate = useNavigate();

  // Master Data state
  const [routes, setRoutes] = useState([]);
  const [allStages, setAllStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Live filter states (No search button)
  const [filterRoute, setFilterRoute] = useState("");
  const [filterStage, setFilterStage] = useState("");

  // Pagination state (5 records per page matching other Master pages)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // 3-Second Auto-Dismissing Flash Card Notification
  const [flashCard, setFlashCard] = useState(null);
  const flashTimerRef = useRef(null);

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

  // Fetch routes and stages
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [routesRes, stagesRes] = await Promise.all([
          axios.get(`${API_URL}/getRoute`),
          axios.get(`${API_URL}/getStage`)
        ]);
        setRoutes(Array.isArray(routesRes.data) ? routesRes.data : []);
        const stageList = Array.isArray(stagesRes.data) ? stagesRes.data : [];
        setAllStages(stageList);
        setError("");
      } catch (err) {
        console.error("Error loading cost records:", err);
        setError("Failed to load route cost details. Please verify database connectivity.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Map route ID to route name
  const getRouteName = (routeId) => {
    const found = routes.find(
      (r) => String(r.routeid || "").trim().toLowerCase() === String(routeId || "").trim().toLowerCase()
    );
    return found ? found.routename : "N/A";
  };

  // Fee formatting helper
  const formatFee = (fee) => {
    if (fee == null || fee === "") return "₹0.00";
    const num = Number(fee);
    if (isNaN(num)) return `₹${fee}`;
    return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Unique route options for dropdown
  const uniqueRouteOptions = useMemo(() => {
    const stageRouteIds = allStages.map((s) => String(s.routeid || "").trim()).filter(Boolean);
    const availableRouteIds = new Set([...stageRouteIds, ...routes.map((r) => String(r.routeid || "").trim())]);

    return Array.from(availableRouteIds)
      .sort()
      .map((id) => {
        const routeObj = routes.find((r) => String(r.routeid || "").trim() === id);
        return {
          id,
          label: routeObj ? `Route #${id} - ${routeObj.routename}` : `Route #${id}`
        };
      });
  }, [allStages, routes]);

  // Unique stage options for dropdown (derived from allStages)
  const uniqueStageOptions = useMemo(() => {
    const names = allStages.map((s) => String(s.stagename || "").trim()).filter(Boolean);
    return [...new Set(names)].sort();
  }, [allStages]);

  // Live filter computation: applies immediately on dropdown change with AND logic
  const filteredData = useMemo(() => {
    return allStages.filter((item) => {
      // 1. Route filter
      if (filterRoute) {
        if (String(item.routeid || "").trim().toLowerCase() !== filterRoute.trim().toLowerCase()) {
          return false;
        }
      }

      // 2. Stage filter
      if (filterStage) {
        if (String(item.stagename || "").trim().toLowerCase() !== filterStage.trim().toLowerCase()) {
          return false;
        }
      }

      return true;
    });
  }, [allStages, filterRoute, filterStage]);

  const hasActiveFilters = Boolean(filterRoute || filterStage);

  const handleResetFilters = () => {
    setFilterRoute("");
    setFilterStage("");
  };

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterRoute, filterStage]);

  // Pagination calculation (5 records per page)
  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const startEntryIndex = filteredData.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endEntryIndex = Math.min(currentPage * itemsPerPage, filteredData.length);

  // Generate Stage Fee Report in Excel
  const handleExportReport = () => {
    if (!filteredData.length) return;
    exportToExcel(
      filteredData.map((item, index) => ({
        "S.No": index + 1,
        "Route ID": item.routeid,
        "Route Name": getRouteName(item.routeid),
        "Stage Name": item.stagename,
        "Stage Fee (INR)": item.fee != null ? Number(item.fee) : 0
      })),
      "Stage_Fee_Cost_Report"
    );
    showFlashCard("Stage Fee Report exported to Excel successfully!", "success", "Report Generated");
  };

  return (
    <div className="view-cost-master-container">
      <div className="view-cost-box-wrapper">
        {/* ====================================================================
            1. BREADCRUMBS & PAGE HEADER (Clean design without subtitle)
            ==================================================================== */}
        <div className="vm-breadcrumb-nav">
          <span className="link" onClick={() => navigate("/home")}>Dashboard</span>
          <span className="sep">/</span>
          <span className="link" onClick={() => navigate("/home/viewroute")}>Route & Stage Management</span>
          <span className="sep">/</span>
          <span className="current">Cost Details</span>
        </div>

        <div className="vm-page-header">
          <div className="vm-header-left">
            <h2 className="vm-page-title">Cost Details</h2>
          </div>

          <div className="vm-header-actions">
            <button
              type="button"
              className="cost-btn-portal"
              onClick={() => navigate("/home/bus-fees")}
              title="Open Bus Fees Master & Excel bulk management portal"
            >
              <CreditCard size={16} />
              <span>Open Bus Fees Master & Excel Portal</span>
              <ExternalLink size={13} style={{ marginLeft: "2px", opacity: 0.7 }} />
            </button>

            <button
              type="button"
              className="vm-btn-secondary vm-btn-report"
              onClick={handleExportReport}
              disabled={!filteredData.length}
              title="Export stage fee records to Excel"
            >
              <FileSpreadsheet size={16} />
              <span>Generate Stage Fee Report</span>
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
          {/* Route Dropdown */}
          <div className="fleet-filter-field">
            <label htmlFor="filter-cost-route">Route</label>
            <select
              id="filter-cost-route"
              value={filterRoute}
              onChange={(e) => setFilterRoute(e.target.value)}
              className="fleet-filter-select"
              aria-label="Filter by route"
            >
              <option value="">All Routes</option>
              {uniqueRouteOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Stage Dropdown */}
          <div className="fleet-filter-field">
            <label htmlFor="filter-cost-stage">Stage</label>
            <select
              id="filter-cost-stage"
              value={filterStage}
              onChange={(e) => setFilterStage(e.target.value)}
              className="fleet-filter-select"
              aria-label="Filter by stage"
            >
              <option value="">All Stages</option>
              {uniqueStageOptions.map((name) => (
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
            3. COST DETAILS TABLE - Solid Navy Header, Zero Desktop Overflow
            ==================================================================== */}
        <div className="view-cost-table-container">
          <table className="view-cost-table">
            <thead>
              <tr>
                <th className="col-cost-sno">S.NO</th>
                <th className="col-cost-routeid">ROUTE ID</th>
                <th className="col-cost-routename">ROUTE NAME</th>
                <th className="col-cost-stagename">STAGE NAME</th>
                <th className="col-cost-fee">FEE</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="cost-table-loading">
                    Loading route cost details...
                  </td>
                </tr>
              ) : paginatedData.length > 0 ? (
                paginatedData.map((item, index) => {
                  const sNo = startEntryIndex + index;
                  return (
                    <tr key={`${item.stageid || item.stagename}-${index}`}>
                      <td className="col-sno-td">{sNo}</td>
                      <td>
                        <span className="cost-route-badge">
                          <RouteIcon size={11} style={{ marginRight: "3px" }} />
                          {item.routeid}
                        </span>
                      </td>
                      <td>
                        <span className="cost-route-name-text">
                          {getRouteName(item.routeid)}
                        </span>
                      </td>
                      <td>
                        <span className="cost-stage-name-text">
                          {item.stagename}
                        </span>
                      </td>
                      <td>
                        <span className="cost-fee-badge">
                          <IndianRupee size={11} />
                          {formatFee(item.fee)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="5" className="cost-table-empty">
                    {hasActiveFilters
                      ? "No route cost records match the selected filters. Click 'Reset Filters' to view all records."
                      : "No route cost data available in system."}
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
            Showing {startEntryIndex} to {endEntryIndex} of {filteredData.length} entries
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
    </div>
  );
};

export default ViewCost;
