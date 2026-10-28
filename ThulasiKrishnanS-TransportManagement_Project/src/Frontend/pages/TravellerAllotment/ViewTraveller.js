import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import * as XLSX from "xlsx";
import {
  RotateCcw,
  FileSpreadsheet,
  FileText,
  Trash2,
  Pencil,
  X,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Route as RouteIcon,
  Bus,
  Users,
  Plus,
  UploadCloud,
  Download,
  Loader2,
  Check,
  Lock
} from "lucide-react";
import "../../styles/ViewTraveller.css";
import { exportToExcel, exportTravellersToPDF } from "../ReportGenerator";
import { API_URL } from "../../config";

const yearCategories = [
  { value: "all", label: "All Passengers" },
  { value: "1styear", label: "1st Year" },
  { value: "2ndyear", label: "2nd Year" },
  { value: "3rdyear", label: "3rd Year" },
  { value: "4thyear", label: "4th Year" },
  { value: "staff", label: "Staff Members" }
];

const studentYearOptions = [
  "1st Year",
  "2nd Year",
  "3rd Year",
  "4th Year"
];

const staffTypeOptions = [
  "Teaching",
  "Non Teaching"
];

const DEFAULT_CITIES = [
  "Kovilpatti",
  "Thoothukudi",
  "Tirunelveli",
  "Sattur",
  "Virudhunagar",
  "Vilathikulam",
  "Sivakasi",
  "Kayathar",
  "Sankarankovil",
  "Kalugumalai"
];

const emptyFormData = {
  name: "",
  rollno: "",
  role: "Student",
  year: "",
  stafftype: "",
  branch: "",
  phoneno: "",
  city: "",
  routeid: "",
  stage: ""
};

const normalizeKey = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

// Normalization helper for year comparisons
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

const getCell = (row, aliases) => {
  const cells = new Map(
    Object.entries(row || {}).map(([key, value]) => [normalizeKey(key), value])
  );
  for (const alias of aliases) {
    const value = cells.get(normalizeKey(alias));
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return "";
};

const ViewTraveller = ({ initialOpenAdd = false }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Master Data
  const [travellers, setTravellers] = useState([]);
  const [stageList, setStageList] = useState([]);
  const [routeList, setRouteList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Live filter states (no search button)
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [rollNumber, setRollNumber] = useState("");
  const [routeId, setRouteId] = useState("");
  const [city, setCity] = useState("");
  const [stage, setStage] = useState("");

  // Pagination state (5 rows per page matching other master pages)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Modal State for Add & Edit
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [modalFormData, setModalFormData] = useState(emptyFormData);
  const [modalStages, setModalStages] = useState([]);
  const [loadingModalStages, setLoadingModalStages] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalErrors, setModalErrors] = useState({});

  // Delete confirmation modal
  const [travellerToDelete, setTravellerToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Excel Import Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importRole, setImportRole] = useState("Student");
  const [importFile, setImportFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [reviewRows, setReviewRows] = useState([]);
  const [reviewSelections, setReviewSelections] = useState({});
  const [reviewStages, setReviewStages] = useState({});
  const [savingRoll, setSavingRoll] = useState("");
  const fileInputRef = useRef(null);

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

  // Check if opened with initialOpenAdd or via URL param/state
  useEffect(() => {
    if (
      initialOpenAdd ||
      location.search.includes("action=add") ||
      location.pathname.includes("addtraveller")
    ) {
      handleOpenAddModal();
    }
  }, [initialOpenAdd, location.search, location.pathname]);

  // Fetch traveller records
  const fetchTravellers = async () => {
    try {
      setIsRefreshing(true);
      const response = await axios.get(`${API_URL}/getTraveller`);
      setTravellers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error fetching traveller data:", error);
      showFlashCard(
        error.response?.data?.message || "Could not load traveller records.",
        "danger",
        "Connection Error"
      );
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  };

  // Fetch routes and stages for dropdowns
  const fetchStagesAndRoutes = async () => {
    try {
      const [stageRes, routeRes] = await Promise.all([
        axios.get(`${API_URL}/getStage`).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/getRoute`).catch(() => ({ data: [] }))
      ]);
      if (Array.isArray(stageRes.data)) setStageList(stageRes.data);
      if (Array.isArray(routeRes.data)) setRouteList(routeRes.data);
    } catch (error) {
      console.error("Error loading master data:", error);
    }
  };

  useEffect(() => {
    fetchTravellers();
    fetchStagesAndRoutes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live filter computation with AND logic
  const filteredData = useMemo(() => {
    return travellers.filter((traveller) => {
      const roleNorm = normalize(traveller.role);
      const yearNorm = yearLevel(traveller.year);

      // Category Segmented Tabs
      if (selectedCategory === "staff") {
        if (roleNorm !== "staff" && yearNorm !== "staff") return false;
      } else if (selectedCategory !== "all") {
        if (roleNorm === "staff") return false;
        if (yearNorm !== selectedCategory) return false;
      }

      // Roll Number / Staff ID Filter
      if (rollNumber && String(traveller.rollno).trim().toLowerCase() !== rollNumber.trim().toLowerCase()) {
        return false;
      }

      // Route ID Filter
      if (routeId && String(traveller.routeid).trim().toLowerCase() !== routeId.trim().toLowerCase()) {
        return false;
      }

      // City Filter
      if (city) {
        const travellerCity = traveller.city || traveller.place || "";
        if (travellerCity.trim().toLowerCase() !== city.trim().toLowerCase()) {
          return false;
        }
      }

      // Boarding Stage Filter
      if (stage) {
        const travellerStage = traveller.stage_name || traveller.stage || traveller.point || "";
        if (travellerStage.trim().toLowerCase() !== stage.trim().toLowerCase()) {
          return false;
        }
      }

      return true;
    });
  }, [travellers, selectedCategory, rollNumber, routeId, city, stage]);

  // Reset to page 1 whenever any filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, rollNumber, routeId, city, stage, itemsPerPage]);

  // Distinct filter options
  const routeOptions = useMemo(() => {
    const map = new Map();
    routeList.forEach((r) => {
      if (r.routeid) {
        map.set(String(r.routeid), {
          routeid: String(r.routeid),
          routename: r.routename || `Route #${r.routeid}`
        });
      }
    });
    travellers.forEach((t) => {
      if (t.routeid && !map.has(String(t.routeid))) {
        map.set(String(t.routeid), {
          routeid: String(t.routeid),
          routename: t.routename || `Route #${t.routeid}`
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => {
      const na = Number(a.routeid);
      const nb = Number(b.routeid);
      return !isNaN(na) && !isNaN(nb) ? na - nb : a.routeid.localeCompare(b.routeid);
    });
  }, [travellers, routeList]);

  const rollNumberOptions = useMemo(() => {
    return [...new Set(travellers.map((t) => t.rollno).filter(Boolean))].sort();
  }, [travellers]);

  const cityOptions = useMemo(() => {
    const cities = travellers.map((t) => t.city || t.place).filter(Boolean);
    return [...new Set(cities)].sort();
  }, [travellers]);

  const stageOptions = useMemo(() => {
    const fromTravellers = travellers.map((t) => t.stage_name || t.stage || t.point).filter(Boolean);
    const fromStageMaster = stageList.map((s) => s.stagename).filter(Boolean);
    return [...new Set([...fromTravellers, ...fromStageMaster])].sort();
  }, [travellers, stageList]);

  const hasActiveFilters = Boolean(
    selectedCategory !== "all" || rollNumber || routeId || city || stage
  );

  const handleResetFilters = () => {
    setSelectedCategory("all");
    setRollNumber("");
    setRouteId("");
    setCity("");
    setStage("");
  };

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  const startEntryIndex =
    filteredData.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endEntryIndex = Math.min(currentPage * itemsPerPage, filteredData.length);

  // Fetch stages for the selected route in Add/Edit modal
  const fetchModalStages = async (rId) => {
    if (!rId) {
      setModalStages([]);
      return;
    }
    setLoadingModalStages(true);
    try {
      const { data } = await axios.get(`${API_URL}/getStagesByRouteId`, {
        params: { routeid: rId }
      });
      setModalStages(data?.stages || []);
    } catch (err) {
      console.error("Could not load stages for route:", err);
      setModalStages([]);
    } finally {
      setLoadingModalStages(false);
    }
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setIsEditMode(false);
    setModalFormData(emptyFormData);
    setModalStages([]);
    setModalErrors({});
    setShowModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (traveller) => {
    setIsEditMode(true);
    const initialData = {
      name: traveller.name || "",
      rollno: traveller.rollno || "",
      role: traveller.role || "Student",
      year: traveller.year || "",
      stafftype: traveller.stafftype || "",
      branch: traveller.branch || "",
      phoneno: traveller.phoneno || "",
      city: traveller.city || traveller.place || "",
      routeid: traveller.routeid || "",
      stage: traveller.stage || traveller.stage_name || traveller.point || ""
    };
    setModalFormData(initialData);
    setModalErrors({});
    if (initialData.routeid) {
      fetchModalStages(initialData.routeid);
    } else {
      setModalStages([]);
    }
    setShowModal(true);
  };

  // Handle Modal Form Change
  const handleModalFormChange = (e) => {
    const { name, value } = e.target;
    setModalFormData((current) => {
      const next = {
        ...current,
        [name]: value,
        ...(name === "routeid" ? { stage: "" } : {}),
        ...(name === "role"
          ? {
              year: value === "Student" ? current.year : "",
              stafftype: value === "Staff" ? current.stafftype : ""
            }
          : {})
      };

      if (name === "routeid") {
        fetchModalStages(value);
        if (value) {
          const foundRoute = routeList.find((r) => String(r.routeid) === String(value));
          if (foundRoute?.city && !current.city) {
            next.city = foundRoute.city;
          }
        }
      }

      return next;
    });

    if (modalErrors[name]) {
      setModalErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // Submit Modal (Add or Edit)
  const handleModalSubmit = async (e) => {
    e.preventDefault();

    const errors = {};
    if (!modalFormData.name.trim()) errors.name = "Full name is required";
    if (!modalFormData.rollno.trim()) errors.rollno = "Registration / Roll No is required";
    if (!modalFormData.role) errors.role = "Role is required";
    if (modalFormData.role === "Student" && !modalFormData.year) errors.year = "Year is required";
    if (modalFormData.role === "Staff" && !modalFormData.stafftype) errors.stafftype = "Staff type is required";
    if (!modalFormData.city.trim()) errors.city = "City is required";
    if (!modalFormData.routeid) errors.routeid = "Please select a route";
    if (!modalFormData.stage.trim()) errors.stage = "Please select or enter a boarding point";

    if (Object.keys(errors).length > 0) {
      setModalErrors(errors);
      showFlashCard("Please complete all required fields highlighted in red.", "danger", "Validation Error");
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        ...modalFormData,
        name: modalFormData.name.trim(),
        rollno: modalFormData.rollno.trim(),
        city: modalFormData.city.trim(),
        place: modalFormData.city.trim(),
        stage: modalFormData.stage.trim(),
        stage_name: modalFormData.stage.trim(),
        point: modalFormData.stage.trim(),
        year: modalFormData.role === "Student" ? modalFormData.year : "",
        stafftype: modalFormData.role === "Staff" ? modalFormData.stafftype : ""
      };

      if (isEditMode) {
        await axios.put(`${API_URL}/updateTraveller/${encodeURIComponent(payload.rollno)}`, payload);
        showFlashCard(`Traveller #${payload.rollno} updated successfully!`, "success", "Record Updated");
      } else {
        await axios.post(`${API_URL}/addTraveller`, payload);
        showFlashCard(`Traveller #${payload.rollno} (${payload.name}) added successfully!`, "success", "Traveller Registered");
      }

      setShowModal(false);
      setModalFormData(emptyFormData);
      await fetchTravellers();
    } catch (error) {
      console.error("Error saving traveller:", error);
      const msg = error.response?.data?.message || (isEditMode ? "Failed to update traveller." : "Failed to add traveller.");
      showFlashCard(msg, "danger", isEditMode ? "Update Failed" : "Registration Failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Single Delete handlers
  const handleOpenDelete = (traveller) => {
    setTravellerToDelete(traveller);
  };

  const handleConfirmSingleDelete = async () => {
    if (!travellerToDelete) return;
    setIsDeleting(true);
    try {
      await axios.delete(`${API_URL}/deleteTraveller/${encodeURIComponent(travellerToDelete.rollno)}`);
      showFlashCard(`Traveller #${travellerToDelete.rollno} deleted successfully!`, "success", "Record Deleted");
      setTravellerToDelete(null);
      await fetchTravellers();
    } catch (error) {
      console.error("Error deleting traveller:", error);
      showFlashCard(error.response?.data?.message || "Failed to delete traveller record.", "danger", "Delete Failed");
    } finally {
      setIsDeleting(false);
    }
  };

  // Excel Export Handler
  const handleExportExcel = () => {
    if (!filteredData.length) return;
    const excelRows = filteredData.map((t, idx) => ({
      "S.No": idx + 1,
      "Name": t.name || "",
      "Roll No / Staff ID": t.rollno || "",
      "Role": t.role || "Student",
      "Branch": t.branch || "",
      "Year / Type": t.year || t.stafftype || "",
      "City": t.city || t.place || "",
      "Boarding Stage": t.stage_name || t.stage || t.point || "",
      "Route ID": t.routeid || "",
      "Assigned Bus": t.busno || "Not allocated",
      "Phone": t.phoneno || ""
    }));
    exportToExcel(excelRows, "Travellers_List_Report");
  };

  // PDF Export Handler
  const handleExportPDF = () => {
    if (!filteredData.length) return;
    exportTravellersToPDF(filteredData, "Travellers_List_Report");
  };

  // Excel Import Handler
  const handleImportExcel = async () => {
    if (!importFile) {
      showFlashCard("Please choose an Excel file (.xlsx, .xls) to import.", "danger", "No File Selected");
      return;
    }

    try {
      setIsImporting(true);
      const buffer = await importFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], { defval: "" });

      const importedTravellers = rows
        .map((row) => ({
          name: getCell(row, ["Name of Students", "Name of Student", "Name", "Student Name", "Staff Name"]),
          rollno: getCell(row, ["REG NO", "Reg No", "Registration Number", "Roll Number", "RollNo", "Staff ID", "StaffID"]),
          year: importRole === "Student" ? getCell(row, ["YEAR", "Year"]) : "",
          branch: getCell(row, ["Branch", "Department", "Dept"]),
          city: getCell(row, ["PLACE", "Place", "City"]),
          stage: getCell(row, ["BOARDING PLACE", "Boarding Place", "Boarding Point", "Stage", "Stop"]),
          phoneno: getCell(row, ["Phone", "Phone No", "Mobile", "Contact"])
        }))
        .filter((row) => row.name && row.rollno);

      if (!importedTravellers.length) {
        showFlashCard(
          "No valid rows found. Ensure the Excel contains 'REG NO' and 'Name of Students' columns.",
          "danger",
          "Invalid Spreadsheet"
        );
        return;
      }

      const { data } = await axios.post(`${API_URL}/importTravellers`, {
        role: importRole,
        travellers: importedTravellers
      });

      setReviewRows(data.unallocated || []);
      setReviewSelections({});
      setReviewStages({});
      setImportFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      const unallocatedCount = data.unallocated?.length || 0;
      await fetchTravellers();

      if (unallocatedCount === 0) {
        setShowImportModal(false);
        showFlashCard(
          `Successfully imported ${data.imported} ${importRole.toLowerCase()} record(s). All auto-allocated!`,
          "success",
          "Import Complete"
        );
      } else {
        showFlashCard(
          `Imported ${data.imported} records. ${unallocatedCount} records require manual stage review below.`,
          "warning",
          "Review Needed"
        );
      }
    } catch (error) {
      console.error("Error importing travellers:", error);
      showFlashCard(
        error.response?.data?.message || "Excel import failed. Please verify spreadsheet format.",
        "danger",
        "Import Error"
      );
    } finally {
      setIsImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const headers = [
      "SINO",
      "REG NO",
      "Name of Students",
      "YEAR",
      "Branch",
      "PLACE",
      "BOARDING PLACE",
      "Phone No"
    ];
    const sampleRow =
      importRole === "Student"
        ? [1, "21CS001", "John Doe", "1st Year", "CSE", "Kovilpatti", "Old Bus Stand", "9876543210"]
        : [1, "STF101", "Dr. Jane Smith", "Teaching", "CSE", "Kovilpatti", "New Bus Stand", "9876543211"];

    const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Travellers_Template");
    XLSX.writeFile(wb, `${importRole}_Traveller_Import_Template.xlsx`);
    showFlashCard(`${importRole} Excel template downloaded. Fill in your records and upload.`, "success", "Template Downloaded");
  };

  const handleAllocateReviewRow = async (row) => {
    const rId = reviewSelections[row.rollno];
    const stg = reviewStages[row.rollno];
    if (!rId || !stg) {
      showFlashCard("Select both a route and boarding point before allocating.", "danger", "Incomplete Assignment");
      return;
    }
    try {
      setSavingRoll(row.rollno);
      await axios.put(`${API_URL}/allocateTraveller/${encodeURIComponent(row.rollno)}`, {
        routeid: rId,
        stage: stg
      });
      setReviewRows((current) => current.filter((item) => item.rollno !== row.rollno));
      await fetchTravellers();
      showFlashCard(`Traveller #${row.rollno} allocated successfully!`, "success", "Allocation Saved");
    } catch (error) {
      console.error("Could not allocate traveller:", error);
      showFlashCard(error.response?.data?.message || "Could not allocate traveller.", "danger", "Allocation Error");
    } finally {
      setSavingRoll("");
    }
  };

  return (
    <div className="view-traveller-master-container">
      <div className="view-traveller-box-wrapper">
        {/* ====================================================================
            1. BREADCRUMBS & MAIN PAGE HEADER
            ==================================================================== */}
        <div className="vm-breadcrumb-nav">
          <span className="link" onClick={() => navigate("/home")}>Dashboard</span>
          <span className="sep">/</span>
          <span className="current">Traveller & Passenger</span>
          <span className="sep">/</span>
          <span className="current">Traveller Management</span>
        </div>

        <div className="vm-page-header">
          <div className="vm-header-left">
            <div className="vm-title-row">
              <h2 className="vm-page-title">Traveller Management</h2>
              <span className="vm-total-count-badge">
                {travellers.length} Total Travellers
              </span>
            </div>
            <p className="vm-page-subtitle">
              Manage student and staff records, routes, and boarding allocations
            </p>
          </div>

          <div className="vm-header-actions">
            <button
              type="button"
              className="vm-btn-secondary vm-btn-refresh"
              onClick={fetchTravellers}
              disabled={isRefreshing}
              title="Refresh traveller records"
            >
              <RotateCcw size={15} className={isRefreshing ? "spin-icon" : ""} />
              <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
            </button>

            <button
              type="button"
              className="vm-btn-secondary vm-btn-excel"
              onClick={handleExportExcel}
              disabled={!filteredData.length}
              title="Export filtered records to Excel"
            >
              <FileSpreadsheet size={15} />
              <span>Excel Report</span>
            </button>

            <button
              type="button"
              className="vm-btn-secondary vm-btn-pdf"
              onClick={handleExportPDF}
              disabled={!filteredData.length}
              title="Export filtered records to PDF"
            >
              <FileText size={15} />
              <span>PDF Report</span>
            </button>

            <button
              type="button"
              className="vm-btn-secondary vm-btn-import"
              onClick={() => setShowImportModal(true)}
              title="Bulk import travellers from spreadsheet"
            >
              <UploadCloud size={15} />
              <span>Import Excel</span>
            </button>

            {/* Prominent Add Traveller Navy-Blue Button */}
            <button
              type="button"
              className="vm-btn-primary vm-btn-add"
              onClick={handleOpenAddModal}
              title="Register a new student or staff traveller"
            >
              <Plus size={16} strokeWidth={2.4} />
              <span>Add Traveller</span>
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
            <div className="vm-flash-card-progress">
              <div className="vm-flash-card-progress-bar" />
            </div>
          </aside>
        )}

        {/* ====================================================================
            2. CATEGORY SEGMENTED TABS (Immediately below Page Header)
            ==================================================================== */}
        <div className="traveller-category-segmented-control" role="tablist">
          {yearCategories.map((cat) => {
            const isActive = selectedCategory === cat.value;
            return (
              <button
                key={cat.value}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`category-segment-tab ${isActive ? "active" : ""}`}
                onClick={() => setSelectedCategory(cat.value)}
              >
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* ====================================================================
            3. COMPACT LIVE FILTERS IN A SINGLE HORIZONTAL ROW ON DESKTOP
            ==================================================================== */}
        <div className="fleet-filter-toolbar">
          {/* Roll No / Staff ID Dropdown */}
          <div className="fleet-filter-field">
            <label htmlFor="filter-rollno">Roll No / Staff ID</label>
            <select
              id="filter-rollno"
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value)}
              className="fleet-filter-select"
              aria-label="Filter by Roll Number or Staff ID"
            >
              <option value="">All IDs ({rollNumberOptions.length})</option>
              {rollNumberOptions.map((rn) => (
                <option key={rn} value={rn}>
                  {rn}
                </option>
              ))}
            </select>
          </div>

          {/* Route Dropdown */}
          <div className="fleet-filter-field">
            <label htmlFor="filter-route">Route</label>
            <select
              id="filter-route"
              value={routeId}
              onChange={(e) => setRouteId(e.target.value)}
              className="fleet-filter-select"
              aria-label="Filter by Route"
            >
              <option value="">All Routes ({routeOptions.length})</option>
              {routeOptions.map((r) => (
                <option key={r.routeid} value={r.routeid}>
                  Route #{r.routeid} - {r.routename}
                </option>
              ))}
            </select>
          </div>

          {/* City Dropdown */}
          <div className="fleet-filter-field">
            <label htmlFor="filter-city">City</label>
            <select
              id="filter-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="fleet-filter-select"
              aria-label="Filter by City"
            >
              <option value="">All Cities ({cityOptions.length})</option>
              {cityOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Boarding Stage Dropdown */}
          <div className="fleet-filter-field">
            <label htmlFor="filter-stage">Boarding Stage</label>
            <select
              id="filter-stage"
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              className="fleet-filter-select"
              aria-label="Filter by Boarding Stage"
            >
              <option value="">All Stages ({stageOptions.length})</option>
              {stageOptions.map((stg) => (
                <option key={stg} value={stg}>
                  {stg}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters Action */}
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
            4. TRAVELLER RECORDS TABLE (Starts directly with S.NO)
            ==================================================================== */}
        <div className="view-traveller-table-container">
          <table className="view-traveller-table">
            <thead>
              <tr>
                <th className="col-sno">S.NO</th>
                <th className="col-name">NAME</th>
                <th className="col-rollno">ROLL NO / STAFF ID</th>
                <th className="col-role">ROLE</th>
                <th className="col-branch">BRANCH</th>
                <th className="col-year">YEAR / TYPE</th>
                <th className="col-city">CITY</th>
                <th className="col-stage">BOARDING STAGE</th>
                <th className="col-route">ROUTE ID</th>
                <th className="col-bus">ASSIGNED BUS</th>
                <th className="col-actions">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="11" className="traveller-table-empty">
                    <Loader2 size={24} className="spin-icon inline-icon" />
                    <span>Loading traveller records...</span>
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan="11" className="traveller-table-empty">
                    <Users size={28} style={{ color: "#94a3b8", marginBottom: "6px" }} />
                    <p style={{ margin: 0, fontWeight: 600, color: "#475569" }}>
                      No traveller records found matching the selected filters.
                    </p>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        className="empty-state-reset-btn"
                        onClick={handleResetFilters}
                      >
                        Reset All Filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedData.map((t, idx) => {
                  const sNo = startEntryIndex + idx;
                  const isStudent = (t.role || "Student").toLowerCase() === "student";

                  return (
                    <tr key={t.id || t.rollno || idx}>
                      <td className="col-sno-td">{sNo}</td>
                      <td>
                        <strong className="traveller-name-cell">{t.name}</strong>
                      </td>
                      <td>
                        <span className="traveller-rollno-badge">{t.rollno}</span>
                      </td>
                      <td>
                        <span className={`traveller-role-badge ${isStudent ? "student" : "staff"}`}>
                          {t.role || "Student"}
                        </span>
                      </td>
                      <td>
                        <span className="traveller-branch-text">{t.branch || "—"}</span>
                      </td>
                      <td>
                        <span className="traveller-year-pill">
                          {t.year || t.stafftype || "N/A"}
                        </span>
                      </td>
                      <td>
                        <span className="traveller-city-badge">
                          <MapPin size={11} /> {t.city || t.place || "—"}
                        </span>
                      </td>
                      <td>
                        <span className="traveller-stage-text">
                          {t.stage_name || t.stage || t.point || "—"}
                        </span>
                      </td>
                      <td>
                        {t.routeid ? (
                          <span className="traveller-route-badge">
                            <RouteIcon size={11} /> Route #{t.routeid}
                          </span>
                        ) : (
                          <span className="traveller-unallocated-text">None</span>
                        )}
                      </td>
                      <td>
                        {t.busno ? (
                          <span className="traveller-bus-badge">
                            <Bus size={11} /> Bus #{t.busno}
                          </span>
                        ) : (
                          <span className="traveller-bus-unallocated">Not allocated</span>
                        )}
                      </td>
                      <td>
                        <div className="table-actions-cell">
                          <button
                            type="button"
                            className="table-action-icon-btn action-edit-btn"
                            onClick={() => handleOpenEditModal(t)}
                            title={`Edit ${t.name}`}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            className="table-action-icon-btn action-delete-btn"
                            onClick={() => handleOpenDelete(t)}
                            title={`Delete ${t.name}`}
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
            5. PAGINATION FOOTER (Accurate Showing X-Y of Z & Rows per page selector)
            ==================================================================== */}
        <div className="view-traveller-pagination-footer">
          <span className="pagination-info-text">
            {filteredData.length === 0 ? (
              "Showing 0 travellers"
            ) : (
              <>
                Showing <strong>{startEntryIndex}–{endEntryIndex}</strong> of{" "}
                <strong>{filteredData.length}</strong> travellers (Page {currentPage} of {totalPages})
              </>
            )}
          </span>

          <div className="pagination-controls-group">
            <button
              type="button"
              className="page-nav-btn"
              disabled={currentPage === 1 || filteredData.length === 0}
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            >
              <ChevronLeft size={14} />
              <span>Previous</span>
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
              disabled={currentPage === totalPages || filteredData.length === 0}
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            >
              <span>Next</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ====================================================================
          UNIFIED ADD / EDIT TRAVELLER MODAL DIALOG
          ==================================================================== */}
      {showModal && (
        <div className="traveller-modal-overlay" onClick={() => setShowModal(false)}>
          <div
            className="traveller-modal-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="traveller-modal-heading"
          >
            {/* Modal Header */}
            <div className="traveller-modal-header">
              <div className="traveller-modal-header-copy">
                <h3 id="traveller-modal-heading" className="traveller-modal-title">
                  {isEditMode ? `Edit Traveller #${modalFormData.rollno}` : "Add Traveller"}
                </h3>
                <p className="traveller-modal-subtitle">
                  {isEditMode
                    ? "Update traveller details, route allocation, and boarding point."
                    : "Register a student or staff member and assign a route and boarding point."}
                </p>
              </div>
              <button
                type="button"
                className="traveller-modal-close-btn"
                onClick={() => setShowModal(false)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body / Two-Column Responsive Form */}
            <form onSubmit={handleModalSubmit} className="traveller-modal-form">
              <div className="traveller-modal-grid">
                {/* Full Name */}
                <div className="traveller-field-group">
                  <label htmlFor="modal-traveller-name">
                    Name <span className="req">*</span>
                  </label>
                  <input
                    id="modal-traveller-name"
                    type="text"
                    name="name"
                    value={modalFormData.name}
                    onChange={handleModalFormChange}
                    placeholder="Enter full name"
                    className={modalErrors.name ? "input-error" : ""}
                    required
                  />
                  {modalErrors.name && <span className="error-text">{modalErrors.name}</span>}
                </div>

                {/* Registration / Roll No */}
                <div className="traveller-field-group">
                  <label htmlFor="modal-traveller-rollno">
                    Registration / Roll No <span className="req">*</span>
                  </label>
                  <div className="input-with-icon-wrapper">
                    <input
                      id="modal-traveller-rollno"
                      type="text"
                      name="rollno"
                      value={modalFormData.rollno}
                      onChange={handleModalFormChange}
                      placeholder="e.g. 21CS001 or STF101"
                      disabled={isEditMode}
                      className={`${isEditMode ? "input-disabled" : ""} ${
                        modalErrors.rollno ? "input-error" : ""
                      }`}
                      required
                    />
                    {isEditMode && <Lock size={14} className="input-lock-icon" />}
                  </div>
                  {modalErrors.rollno && <span className="error-text">{modalErrors.rollno}</span>}
                </div>

                {/* Role */}
                <div className="traveller-field-group">
                  <label htmlFor="modal-traveller-role">
                    Role <span className="req">*</span>
                  </label>
                  <select
                    id="modal-traveller-role"
                    name="role"
                    value={modalFormData.role}
                    onChange={handleModalFormChange}
                    required
                  >
                    <option value="Student">Student</option>
                    <option value="Staff">Staff</option>
                  </select>
                </div>

                {/* Conditional: Year (for student) or Staff Type (for staff) */}
                <div className="traveller-field-group">
                  <label htmlFor="modal-traveller-year">
                    {modalFormData.role === "Staff" ? "Staff Type" : "Year"}{" "}
                    <span className="req">*</span>
                  </label>
                  {modalFormData.role === "Staff" ? (
                    <select
                      id="modal-traveller-year"
                      name="stafftype"
                      value={modalFormData.stafftype}
                      onChange={handleModalFormChange}
                      className={modalErrors.stafftype ? "input-error" : ""}
                      required
                    >
                      <option value="">Select Staff Type</option>
                      {staffTypeOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select
                      id="modal-traveller-year"
                      name="year"
                      value={modalFormData.year}
                      onChange={handleModalFormChange}
                      className={modalErrors.year ? "input-error" : ""}
                      required
                    >
                      <option value="">Select Academic Year</option>
                      {studentYearOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  )}
                  {modalErrors.year && <span className="error-text">{modalErrors.year}</span>}
                  {modalErrors.stafftype && <span className="error-text">{modalErrors.stafftype}</span>}
                </div>

                {/* Branch / Department */}
                <div className="traveller-field-group">
                  <label htmlFor="modal-traveller-branch">Branch</label>
                  <input
                    id="modal-traveller-branch"
                    type="text"
                    name="branch"
                    value={modalFormData.branch}
                    onChange={handleModalFormChange}
                    placeholder="e.g. CSE, ECE, MECH"
                  />
                </div>

                {/* Phone Number */}
                <div className="traveller-field-group">
                  <label htmlFor="modal-traveller-phone">Phone Number</label>
                  <input
                    id="modal-traveller-phone"
                    type="tel"
                    name="phoneno"
                    value={modalFormData.phoneno}
                    onChange={handleModalFormChange}
                    placeholder="10-digit mobile number"
                  />
                </div>

                {/* City */}
                <div className="traveller-field-group">
                  <label htmlFor="modal-traveller-city">
                    City <span className="req">*</span>
                  </label>
                  <input
                    id="modal-traveller-city"
                    type="text"
                    name="city"
                    value={modalFormData.city}
                    onChange={handleModalFormChange}
                    placeholder="e.g. Kovilpatti"
                    list="modal-city-options"
                    className={modalErrors.city ? "input-error" : ""}
                    required
                  />
                  <datalist id="modal-city-options">
                    {DEFAULT_CITIES.map((c) => (
                      <option key={c} value={c} />
                    ))}
                    {cityOptions.map((c, i) => (
                      <option key={`city-opt-${i}`} value={c} />
                    ))}
                  </datalist>
                  {modalErrors.city && <span className="error-text">{modalErrors.city}</span>}
                </div>

                {/* Route */}
                <div className="traveller-field-group">
                  <label htmlFor="modal-traveller-route">
                    Route <span className="req">*</span>
                  </label>
                  <select
                    id="modal-traveller-route"
                    name="routeid"
                    value={modalFormData.routeid}
                    onChange={handleModalFormChange}
                    className={modalErrors.routeid ? "input-error" : ""}
                    required
                  >
                    <option value="">Select Route</option>
                    {routeOptions.map((route) => (
                      <option key={route.routeid} value={route.routeid}>
                        Route #{route.routeid} - {route.routename}
                      </option>
                    ))}
                  </select>
                  {modalErrors.routeid && <span className="error-text">{modalErrors.routeid}</span>}
                </div>

                {/* Boarding Point (Dependent on Route) */}
                <div className="traveller-field-group full-width">
                  <label htmlFor="modal-traveller-stage">
                    Boarding Point <span className="req">*</span>
                  </label>
                  <input
                    id="modal-traveller-stage"
                    name="stage"
                    value={modalFormData.stage}
                    onChange={handleModalFormChange}
                    list="modal-stage-options"
                    disabled={!modalFormData.routeid || loadingModalStages}
                    placeholder={
                      loadingModalStages
                        ? "Loading route stages..."
                        : modalFormData.routeid
                        ? "Choose or type a boarding point"
                        : "Select a route first"
                    }
                    className={modalErrors.stage ? "input-error" : ""}
                    required
                  />
                  <datalist id="modal-stage-options">
                    {modalStages.map((stg, i) => (
                      <option key={`modal-stg-${i}`} value={stg} />
                    ))}
                  </datalist>
                  {modalErrors.stage && <span className="error-text">{modalErrors.stage}</span>}
                </div>
              </div>

              {/* Modal Footer with Full-Width Navy Primary Action Button */}
              <div className="traveller-modal-footer">
                <button
                  type="button"
                  className="traveller-btn-cancel"
                  onClick={() => setShowModal(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="traveller-btn-primary-action"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="spin-icon" />
                      <span>{isEditMode ? "UPDATING..." : "SAVING..."}</span>
                    </>
                  ) : (
                    <>
                      <Check size={16} strokeWidth={2.4} />
                      <span>{isEditMode ? "UPDATE TRAVELLER" : "SAVE TRAVELLER"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL: EXCEL BULK IMPORT (Accessible without navigating away)
          ==================================================================== */}
      {showImportModal && (
        <div className="traveller-modal-overlay" onClick={() => setShowImportModal(false)}>
          <div
            className="traveller-modal-dialog import-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="traveller-modal-header">
              <div className="traveller-modal-header-copy">
                <h3 className="traveller-modal-title">Import Travellers from Excel</h3>
                <p className="traveller-modal-subtitle">
                  Upload .xlsx or .xls file. Columns: SINO, REG NO, Name of Students, YEAR, Branch, PLACE, BOARDING PLACE
                </p>
              </div>
              <button
                type="button"
                className="traveller-modal-close-btn"
                onClick={() => setShowImportModal(false)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className="import-modal-body">
              <div className="import-controls-grid">
                <div className="import-field-group">
                  <label>Import Type</label>
                  <select
                    value={importRole}
                    onChange={(e) => setImportRole(e.target.value)}
                    className="import-role-select"
                  >
                    <option value="Student">Student Roster</option>
                    <option value="Staff">Staff Members</option>
                  </select>
                </div>

                <div className="import-field-group file-field-group">
                  <label>Excel File (.xlsx, .xls, .csv)</label>
                  <div className="file-input-wrapper">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    />
                    <span className="file-display-name">
                      {importFile ? importFile.name : "No file chosen"}
                    </span>
                  </div>
                </div>

                <div className="import-actions-group">
                  <button
                    type="button"
                    className="btn-download-template"
                    onClick={handleDownloadTemplate}
                    title="Download Excel template"
                  >
                    <Download size={15} />
                    <span>Template</span>
                  </button>

                  <button
                    type="button"
                    className="btn-import-excel"
                    onClick={handleImportExcel}
                    disabled={!importFile || isImporting}
                  >
                    {isImporting ? (
                      <>
                        <Loader2 size={15} className="spin-icon" />
                        <span>Importing...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud size={15} />
                        <span>Import Excel</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Review unallocated records if any */}
              {reviewRows.length > 0 && (
                <div className="review-section-box">
                  <div className="review-section-header">
                    <AlertCircle size={18} className="review-warn-icon" />
                    <strong>Manual Stage Allocation Needed ({reviewRows.length})</strong>
                  </div>
                  <div className="review-table-container">
                    <table className="review-table">
                      <thead>
                        <tr>
                          <th>Traveller</th>
                          <th>Select Route</th>
                          <th>Select Stage</th>
                          <th style={{ textAlign: "center" }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reviewRows.map((row) => (
                          <tr key={row.rollno}>
                            <td>
                              <strong>{row.name}</strong>
                              <div className="review-subtext">
                                <code>{row.rollno}</code> · {row.city || "No city"} · {row.stage || "No stage"}
                              </div>
                            </td>
                            <td>
                              <select
                                className="review-select"
                                value={reviewSelections[row.rollno] || ""}
                                onChange={async (e) => {
                                  const rId = e.target.value;
                                  setReviewSelections((prev) => ({ ...prev, [row.rollno]: rId }));
                                  if (!rId) {
                                    setReviewStages((prev) => ({ ...prev, [`${row.rollno}_options`]: [] }));
                                    return;
                                  }
                                  try {
                                    const { data } = await axios.get(`${API_URL}/getStagesByRouteId`, {
                                      params: { routeid: rId }
                                    });
                                    setReviewStages((prev) => ({
                                      ...prev,
                                      [`${row.rollno}_options`]: data?.stages || []
                                    }));
                                  } catch (err) {
                                    console.error(err);
                                  }
                                }}
                              >
                                <option value="">Select Route</option>
                                {routeOptions.map((r) => (
                                  <option key={r.routeid} value={r.routeid}>
                                    Route #{r.routeid} - {r.routename}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <input
                                className="review-input"
                                list={`review-stages-${row.rollno}`}
                                value={reviewStages[row.rollno] ?? row.stage ?? ""}
                                disabled={!reviewSelections[row.rollno]}
                                placeholder="Choose boarding point"
                                onChange={(e) =>
                                  setReviewStages((prev) => ({
                                    ...prev,
                                    [row.rollno]: e.target.value
                                  }))
                                }
                              />
                              <datalist id={`review-stages-${row.rollno}`}>
                                {(reviewStages[`${row.rollno}_options`] || []).map((stg) => (
                                  <option key={stg} value={stg} />
                                ))}
                              </datalist>
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <button
                                type="button"
                                className="btn-allocate-row"
                                disabled={savingRoll === row.rollno}
                                onClick={() => handleAllocateReviewRow(row)}
                              >
                                {savingRoll === row.rollno ? "Saving..." : "Allocate"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="traveller-modal-footer">
              <button
                type="button"
                className="traveller-btn-cancel"
                onClick={() => setShowImportModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL: CONFIRM SINGLE DELETE
          ==================================================================== */}
      {travellerToDelete && (
        <div className="traveller-modal-overlay" onClick={() => setTravellerToDelete(null)}>
          <div
            className="traveller-modal-dialog delete-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="traveller-modal-header delete-header">
              <div className="traveller-modal-header-copy">
                <h3 className="traveller-modal-title">Delete Traveller</h3>
                <p className="traveller-modal-subtitle">Confirm record removal</p>
              </div>
              <button
                type="button"
                className="traveller-modal-close-btn"
                onClick={() => setTravellerToDelete(null)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className="traveller-delete-body">
              <div className="delete-icon-warning">
                <AlertCircle size={32} />
              </div>
              <p>
                Are you sure you want to delete traveller record{" "}
                <strong>#{travellerToDelete.rollno}</strong> ({travellerToDelete.name})?
              </p>
              <p className="delete-warning-sub">
                This will remove their route, boarding point, and bus seat allocation. This action
                cannot be undone.
              </p>
            </div>

            <div className="traveller-modal-footer">
              <button
                type="button"
                className="traveller-btn-cancel"
                onClick={() => setTravellerToDelete(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="traveller-btn-delete-confirm"
                onClick={handleConfirmSingleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewTraveller;
