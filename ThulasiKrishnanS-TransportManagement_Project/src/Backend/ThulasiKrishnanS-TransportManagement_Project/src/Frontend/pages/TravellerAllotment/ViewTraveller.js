import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "../../styles/ViewTraveller.css";
import { exportToExcel, exportTravellersToPDF } from "../ReportGenerator";
import EditTraveller from "./EditTraveller";
import { API_URL } from "../../config";
import { FaEdit, FaTrash, FaUserFriends, FaFileExcel, FaFilePdf, FaIdCard, FaRoute, FaMapMarkerAlt, FaBus } from "react-icons/fa";

const yearCategories = [
  { value: "all", label: "All Passengers" },
  { value: "1styear", label: "1st Year" },
  { value: "2ndyear", label: "2nd Year" },
  { value: "3rdyear", label: "3rd Year" },
  { value: "4thyear", label: "4th Year" },
  { value: "staff", label: "Staff Members" }
];

const ViewTraveller = () => {
  const [travellers, setTravellers] = useState([]);
  const [stageList, setStageList] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [rollNumber, setRollNumber] = useState("");
  const [routeId, setRouteId] = useState("");
  const [city, setCity] = useState("");
  const [stage, setStage] = useState("");
  const [editingTraveller, setEditingTraveller] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedRollNumbers, setSelectedRollNumbers] = useState(() => new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  const fetchTravellers = async () => {
    try {
      setIsRefreshing(true);
      const response = await axios.get(`${API_URL}/getTraveller`);
      setTravellers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error fetching traveller data:", error);
      alert(error.response?.data?.message || "Could not load traveller records. Check the server connection and try again.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const fetchStages = async () => {
    try {
      const response = await axios.get(`${API_URL}/getStage`);
      if (Array.isArray(response.data)) {
        setStageList(response.data);
      }
    } catch (error) {
      console.error("Error fetching stages:", error);
    }
  };

  useEffect(() => {
    fetchTravellers();
    fetchStages();
  }, []);

  // Helper to normalize strings for robust comparison
  const normalize = (str) => String(str || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const yearLevel = (value) => {
    const normalized = normalize(value);
    const aliases = {
      "1": "1styear", "1st": "1styear", "1styear": "1styear", first: "1styear", firstyear: "1styear", i: "1styear", iyear: "1styear",
      "2": "2ndyear", "2nd": "2ndyear", "2ndyear": "2ndyear", second: "2ndyear", secondyear: "2ndyear", ii: "2ndyear", iiyear: "2ndyear",
      "3": "3rdyear", "3rd": "3rdyear", "3rdyear": "3rdyear", third: "3rdyear", thirdyear: "3rdyear", iii: "3rdyear", iiiyear: "3rdyear",
      "4": "4thyear", "4th": "4thyear", "4thyear": "4thyear", fourth: "4thyear", fourthyear: "4thyear", iv: "4thyear", ivyear: "4thyear"
    };
    if (aliases[normalized]) return aliases[normalized];
    const embedded = normalized.match(/(?:^|year)(1st|2nd|3rd|4th|first|second|third|fourth|i{1,3}|iv|[1-4])(?:year)?$/);
    if (!embedded) return "";
    return aliases[embedded[1]] || "";
  };

  const filteredData = useMemo(() => {
    return travellers.filter((traveller) => {
      const roleNorm = normalize(traveller.role);
      const yearNorm = yearLevel(traveller.year);

      // Category Pill Filter
      if (selectedCategory === "staff") {
        if (roleNorm !== "staff" && yearNorm !== "staff") return false;
      } else if (selectedCategory !== "all") {
        if (roleNorm === "staff") return false;
        if (yearNorm !== selectedCategory) return false;
      }

      // Roll Number / Staff ID Filter
      if (rollNumber && String(traveller.rollno) !== String(rollNumber)) {
        return false;
      }

      // Route ID Filter
      if (routeId && String(traveller.routeid) !== String(routeId)) {
        return false;
      }

      // City Filter
      if (city && (traveller.city || traveller.place) !== city) {
        return false;
      }

      // Boarding Stage Filter
      const travellerStage = traveller.stage_name || traveller.stage || traveller.point || "";
      if (stage && travellerStage !== stage) {
        return false;
      }

      return true;
    });
  }, [city, rollNumber, routeId, selectedCategory, stage, travellers]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, rollNumber, routeId, city, stage, itemsPerPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const paginatedData = useMemo(() => {
    if (itemsPerPage === 'all') return filteredData;
    const start = (currentPage - 1) * Number(itemsPerPage);
    return filteredData.slice(start, start + Number(itemsPerPage));
  }, [filteredData, currentPage, itemsPerPage]);

  const routeOptions = useMemo(
    () =>
      Array.from(
        new Map(
          travellers
            .filter((traveller) => traveller.routeid)
            .map((traveller) => [
              traveller.routeid,
              {
                routeid: traveller.routeid,
                routename: traveller.routename || 'Route ' + traveller.routeid
              }
            ])
        ).values()
      ),
    [travellers]
  );

  const rollNumberOptions = [...new Set(travellers.map((traveller) => traveller.rollno).filter(Boolean))];
  const cityOptions = [...new Set(travellers.map((traveller) => traveller.city || traveller.place).filter(Boolean))];
  
  const stageOptions = useMemo(() => {
    const fromTravellers = travellers.map((t) => t.stage_name || t.stage || t.point).filter(Boolean);
    const fromStageMaster = stageList.map((s) => s.stagename).filter(Boolean);
    return [...new Set([...fromTravellers, ...fromStageMaster])];
  }, [travellers, stageList]);

  const handleDelete = async (rollno) => {
    if (!window.confirm("Are you sure you want to delete this traveller record?")) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/deleteTraveller/${rollno}`);
      setSelectedRollNumbers((selected) => {
        const next = new Set(selected);
        next.delete(String(rollno));
        return next;
      });
      alert("Traveller record deleted successfully!");
      fetchTravellers();
    } catch (error) {
      console.error("Error deleting traveller:", error);
      alert("Failed to delete traveller record.");
    }
  };

  const filteredRollNumbers = filteredData.map((traveller) => String(traveller.rollno));
  const allFilteredSelected = filteredRollNumbers.length > 0 && filteredRollNumbers.every((rollno) => selectedRollNumbers.has(rollno));

  const toggleSelectAll = () => {
    setSelectedRollNumbers((selected) => {
      const next = new Set(selected);
      if (allFilteredSelected) filteredRollNumbers.forEach((rollno) => next.delete(rollno));
      else filteredRollNumbers.forEach((rollno) => next.add(rollno));
      return next;
    });
  };

  const handleBulkDelete = async () => {
    const rollNumbers = [...selectedRollNumbers];
    if (!rollNumbers.length || !window.confirm(`Delete ${rollNumbers.length} selected traveller record(s)? This cannot be undone.`)) return;

    setIsBulkDeleting(true);
    const deleted = [];
    const failed = [];
    for (const rollno of rollNumbers) {
      try {
        await axios.delete(`${API_URL}/deleteTraveller/${encodeURIComponent(rollno)}`);
        deleted.push(rollno);
      } catch (error) {
        failed.push(rollno);
      }
    }

    setSelectedRollNumbers((selected) => {
      const next = new Set(selected);
      deleted.forEach((rollno) => next.delete(rollno));
      return next;
    });
    await fetchTravellers();
    setIsBulkDeleting(false);
    alert(failed.length
      ? `Deleted ${deleted.length} record(s). Could not delete ${failed.length}: ${failed.join(", ")}`
      : `Deleted ${deleted.length} traveller record(s) successfully.`);
  };

  const handleEdit = (traveller) => {
    setEditingTraveller(traveller);
  };

  const handleSaveEdit = async (updatedData) => {
    try {
      await axios.put(`${API_URL}/updateTraveller/${updatedData.rollno}`, updatedData);
      alert("Traveller details updated successfully!");
      setEditingTraveller(null);
      fetchTravellers();
    } catch (error) {
      console.error("Error updating traveller:", error);
      alert("Failed to update traveller record.");
    }
  };

  return (
    <div className="view-traveller-page-container">
      <div className="view-traveller-card-wrapper">
        {/* Top Header Banner */}
        <div className="view-traveller-header">
          <div className="header-icon-box">
            <FaUserFriends style={{ fontSize: "24px", color: "#ffffff" }} />
          </div>
          <div>
            <h2 className="header-title">Traveller Management & Allocations</h2>
            <p className="header-subtitle">
              View saved travellers and their assigned routes, buses, and boarding stops.
            </p>
          </div>
        </div>
        <button type="button" className="traveller-refresh-button" onClick={fetchTravellers} disabled={isRefreshing}>
          {isRefreshing ? "Refreshing..." : "Refresh records"}
        </button>

        {/* Category Pills Navigation */}
        <div className="category-pills-bar">
          {yearCategories.map((cat) => (
            <button
              key={cat.value}
              type="button"
              className={`category-pill-item ${selectedCategory === cat.value ? "active" : ""}`}
              onClick={() => setSelectedCategory(cat.value)}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Filter Controls Grid */}
        <div className="filter-controls-grid">
          <div className="filter-control-item">
            <label><FaIdCard style={{ color: "#2563eb" }} /> Roll No / Staff ID</label>
            <select value={rollNumber} onChange={(e) => setRollNumber(e.target.value)}>
              <option value="">All ({rollNumberOptions.length} IDs)</option>
              {rollNumberOptions.map((rn) => (
                <option key={rn} value={rn}>
                  {rn}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-control-item">
            <label><FaRoute style={{ color: "#2563eb" }} /> Route</label>
            <select value={routeId} onChange={(e) => setRouteId(e.target.value)}>
              <option value="">All Routes</option>
              {routeOptions.map((r) => (
                <option key={r.routeid} value={r.routeid}>
                  {r.routeid} - {r.routename}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-control-item">
            <label><FaMapMarkerAlt style={{ color: "#2563eb" }} /> City ({cityOptions.length} Cities)</label>
            <select value={city} onChange={(e) => setCity(e.target.value)}>
              <option value="">All Cities</option>
              {cityOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-control-item">
            <label><FaBus style={{ color: "#2563eb" }} /> Boarding Stage</label>
            <select value={stage} onChange={(e) => setStage(e.target.value)}>
              <option value="">All Stages</option>
              {stageOptions.map((stg) => (
                <option key={stg} value={stg}>
                  {stg}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Bar: Matching Records + Rows Per Page + Export Buttons */}
        <div className="table-actions-topbar">
          <div className="records-count-badge">
            Showing <strong>{filteredData.length}</strong> matching records
            {selectedRollNumbers.size > 0 && <span> · {selectedRollNumbers.size} selected</span>}
          </div>

          <div className="right-actions-group">
            <button type="button" className="bulk-delete-travellers-btn" onClick={handleBulkDelete} disabled={selectedRollNumbers.size === 0 || isBulkDeleting}>
              <FaTrash /> {isBulkDeleting ? "Deleting..." : `Delete Selected (${selectedRollNumbers.size})`}
            </button>
            <div className="rows-per-page-selector">
              <label>Rows Per Page:</label>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              >
                <option value={10}>10 per page</option>
                <option value={15}>15 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
                <option value="all">Show All</option>
              </select>
            </div>

            <button
              type="button"
              className="export-report-btn excel-btn"
              onClick={() => exportToExcel(filteredData, "Travellers_List_Report")}
            >
              <FaFileExcel /> Excel Report
            </button>
            <button
              type="button"
              className="export-report-btn pdf-btn"
              onClick={() => exportTravellersToPDF(filteredData, "Travellers_List_Report")}
            >
              <FaFilePdf /> PDF Report
            </button>
          </div>
        </div>

        {/* Modern Traveller Table */}
        <div className="table-responsive-container">
          <table className="modern-traveller-table">
            <thead>
              <tr>
                <th className="traveller-select-column"><input type="checkbox" aria-label="Select all filtered travellers" checked={allFilteredSelected} onChange={toggleSelectAll} disabled={!filteredRollNumbers.length} /></th>
                <th>#</th>
                <th>Name</th>
                <th>Roll No / Staff ID</th>
                <th>Role</th>
                <th>Branch</th>
                <th>Year / Type</th>
                <th>City</th>
                <th>Boarding Stage</th>
                <th>Route ID</th>
                <th>Assigned Bus</th>
                <th style={{ textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan="12" style={{ textAlign: "center", padding: "32px", color: "#64748b", fontWeight: "600" }}>
                    No traveller records found matching the selected filters.
                  </td>
                </tr>
              ) : (
                paginatedData.map((t, idx) => (
                  <tr key={t.id || t.rollno || idx}>
                    <td className="traveller-select-column"><input type="checkbox" aria-label={`Select ${t.name || t.rollno}`} checked={selectedRollNumbers.has(String(t.rollno))} onChange={() => setSelectedRollNumbers((selected) => { const next = new Set(selected); const rollno = String(t.rollno); if (next.has(rollno)) next.delete(rollno); else next.add(rollno); return next; })} /></td>
                    <td>{(currentPage - 1) * (itemsPerPage === 'all' ? filteredData.length : Number(itemsPerPage)) + idx + 1}</td>
                    <td><strong style={{ color: "#0f172a" }}>{t.name}</strong></td>
                    <td><code className="rollno-code">{t.rollno}</code></td>
                    <td>
                      <span className={`role-pill ${(t.role || 'Student').toLowerCase()}`}>
                        {t.role || 'Student'}
                      </span>
                    </td>
                    <td>{t.branch}</td>
                    <td>
                      <span className="year-pill">{t.year || t.stafftype || 'N/A'}</span>
                    </td>
                    <td><strong>{t.city || t.place}</strong></td>
                    <td>{t.stage_name || t.stage || t.point}</td>
                    <td><span className="route-badge">{t.routeid}</span></td>
                    <td>{t.busno ? <span className="route-badge">{t.busno}</span> : <span className="unallocated-bus">Not allocated</span>}</td>
                    <td>
                      <div className="action-buttons-cell">
                        <button
                          type="button"
                          className="icon-action-btn edit-icon-btn"
                          onClick={() => handleEdit(t)}
                          title="Edit Record"
                        >
                          <FaEdit />
                        </button>
                        <button
                          type="button"
                          className="icon-action-btn delete-icon-btn"
                          onClick={() => handleDelete(t.rollno)}
                          title="Delete Record"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls Footer */}
        {itemsPerPage !== 'all' && totalPages > 1 && (
          <div className="table-pagination-footer">
            <span className="pagination-info">
              Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({filteredData.length} Total Records)
            </span>

            <div className="pagination-buttons">
              <button
                type="button"
                className="page-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              >
                Previous
              </button>

              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let pageNum = i + 1;
                if (totalPages > 7) {
                  if (currentPage > 4 && currentPage < totalPages - 3) {
                    pageNum = currentPage - 3 + i;
                  } else if (currentPage >= totalPages - 3) {
                    pageNum = totalPages - 6 + i;
                  }
                }
                return (
                  <button
                    key={pageNum}
                    type="button"
                    className={`page-btn ${currentPage === pageNum ? "active" : ""}`}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                type="button"
                className="page-btn"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Traveller Modal */}
      {editingTraveller && (
        <EditTraveller
          traveller={editingTraveller}
          onClose={() => setEditingTraveller(null)}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
};

export default ViewTraveller;
