import React, { useEffect, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import "../../styles/AddTraveller.css";
import { API_URL } from "../../config";

const emptyForm = { name: "", rollno: "", role: "Student", year: "", stafftype: "", branch: "", phoneno: "", city: "", routeid: "", stage: "" };
const normalizeKey = (value) => String(value || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
const getCell = (row, aliases) => {
  const cells = new Map(Object.entries(row || {}).map(([key, value]) => [normalizeKey(key), value]));
  for (const alias of aliases) {
    const value = cells.get(normalizeKey(alias));
    if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
  }
  return "";
};

const AddTraveller = () => {
  const [routes, setRoutes] = useState([]);
  const [stages, setStages] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [importRole, setImportRole] = useState("Student");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [reviewRows, setReviewRows] = useState([]);
  const [reviewSelections, setReviewSelections] = useState({});
  const [reviewStages, setReviewStages] = useState({});
  const [savingRoll, setSavingRoll] = useState("");

  useEffect(() => {
    axios.get(`${API_URL}/getRoute`).then(({ data }) => setRoutes(Array.isArray(data) ? data : [])).catch((error) => console.error("Could not load routes", error));
  }, []);

  useEffect(() => {
    if (!form.routeid) { setStages([]); return; }
    axios.get(`${API_URL}/getStagesByRouteId`, { params: { routeid: form.routeid } })
      .then(({ data }) => setStages(data?.stages || [])).catch((error) => { console.error("Could not load stages", error); setStages([]); });
  }, [form.routeid]);

  const setReviewRoute = async (rollno, routeid) => {
    setReviewSelections((current) => ({ ...current, [rollno]: routeid }));
    setReviewStages((current) => ({ ...current, [`${rollno}_options`]: [] }));
    if (!routeid) return;
    try {
      const { data } = await axios.get(`${API_URL}/getStagesByRouteId`, { params: { routeid } });
      setReviewStages((current) => ({ ...current, [`${rollno}_options`]: data?.stages || [] }));
    } catch (error) { console.error("Could not load review stages", error); }
  };

  const submitManual = async (event) => {
    event.preventDefault();
    try {
      setBusy(true);
      await axios.post(`${API_URL}/addTraveller`, { ...form, year: form.role === "Student" ? form.year : "", stafftype: form.role === "Staff" ? form.stafftype : "" });
      window.alert("Traveller added successfully.");
      setForm(emptyForm);
    } catch (error) { window.alert(error.response?.data?.message || "Failed to add traveller."); }
    finally { setBusy(false); }
  };

  const importExcel = async () => {
    if (!file) { window.alert("Choose an Excel file first."); return; }
    try {
      setBusy(true);
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: "" });
      const travellers = rows.map((row) => ({
        name: getCell(row, ["Name of Students", "Name of Student", "Name", "Student Name"]),
        rollno: getCell(row, ["REG NO", "Reg No", "Registration Number", "Roll Number", "RollNo"]),
        year: importRole === "Student" ? getCell(row, ["YEAR", "Year"]) : "",
        branch: getCell(row, ["Branch", "Department"]),
        city: getCell(row, ["PLACE", "Place", "City"]),
        stage: getCell(row, ["BOARDING PLACE", "Boarding Place", "Boarding Point", "Stage"]),
        phoneno: getCell(row, ["Phone", "Phone No", "Mobile"])
      })).filter((row) => row.name && row.rollno);
      if (!travellers.length) { window.alert("No rows with both REG NO and Name of Students were found."); return; }
      const { data } = await axios.post(`${API_URL}/importTravellers`, { role: importRole, travellers });
      setReviewRows(data.unallocated || []);
      setReviewSelections({});
      setReviewStages({});
      setFile(null);
      window.alert(`${data.imported} ${importRole.toLowerCase()} records imported. ${data.allocated} allocated automatically; ${data.unallocated?.length || 0} need review.`);
    } catch (error) {
      const message = error.response?.status === 413
        ? "This Excel import is still too large for the server. Split the spreadsheet into smaller files and import them separately."
        : error.response?.data?.message || "Excel import failed.";
      window.alert(message);
    }
    finally { setBusy(false); }
  };

  const allocate = async (row) => {
    const routeid = reviewSelections[row.rollno];
    const stage = reviewStages[row.rollno];
    if (!routeid || !stage) { window.alert("Select both a route and boarding point."); return; }
    try {
      setSavingRoll(row.rollno);
      await axios.put(`${API_URL}/allocateTraveller/${encodeURIComponent(row.rollno)}`, { routeid, stage });
      setReviewRows((current) => current.filter((item) => item.rollno !== row.rollno));
    } catch (error) { window.alert(error.response?.data?.message || "Could not allocate this traveller."); }
    finally { setSavingRoll(""); }
  };

  const changeForm = ({ target: { name, value } }) => setForm((current) => ({ ...current, [name]: value, ...(name === "routeid" ? { stage: "" } : {}), ...(name === "role" ? { year: value === "Student" ? current.year : "", stafftype: value === "Staff" ? current.stafftype : "" } : {}) }));

  return <main className="traveller-form-container">
    <div className="traveller-form traveller-form-grid-layout">
      <header className="traveller-header-block"><h2 className="traveller-title">Add Traveller</h2><p className="traveller-subtitle">Enter one traveller or import your student and staff list.</p></header>

      <section className="traveller-import-card">
        <h3>Import from Excel</h3>
        <p>Use columns: <strong>SINO, REG NO, Name of Students, YEAR, Branch, PLACE, BOARDING PLACE</strong>. PLACE is matched to the route city; BOARDING PLACE is matched to a stage on that route.</p>
        <div className="traveller-import-row traveller-import-controls">
          <label className="traveller-role-picker">Import type<select value={importRole} onChange={(event) => setImportRole(event.target.value)}><option>Student</option><option>Staff</option></select></label>
          <input type="file" accept=".xlsx,.xls,.csv" onChange={(event) => setFile(event.target.files?.[0] || null)} />
          <button type="button" className="traveller-submit-button traveller-secondary-button" onClick={importExcel} disabled={!file || busy}>{busy ? "Importing..." : "Import Excel"}</button>
        </div>
      </section>

      {reviewRows.length > 0 && <section className="traveller-review-card" role="alert">
        <h3>Manual bus allocation needed ({reviewRows.length})</h3>
        <p>These travellers were saved, but the city and boarding point did not identify one route. Choose a route and stage for each person.</p>
        <div className="traveller-review-list">{reviewRows.map((row) => <article className="traveller-review-row" key={row.rollno}>
          <div><strong>{row.name}</strong><span>{row.rollno} · {row.city || "No city"} · {row.stage || "No boarding point"}</span><small>{row.reason}</small></div>
          <select aria-label={`Route for ${row.name}`} value={reviewSelections[row.rollno] || ""} onChange={(event) => setReviewRoute(row.rollno, event.target.value)}><option value="">Select route</option>{routes.map((route) => <option key={route.routeid} value={route.routeid}>{route.routeid} · {route.routename} ({route.city})</option>)}</select>
          <input aria-label={`Boarding point for ${row.name}`} list={`stages-${row.rollno}`} value={reviewStages[row.rollno] ?? row.stage ?? ""} disabled={!reviewSelections[row.rollno]} placeholder="Choose or add a boarding point" onChange={(event) => setReviewStages((current) => ({ ...current, [row.rollno]: event.target.value }))} />
          <datalist id={`stages-${row.rollno}`}>{(reviewStages[`${row.rollno}_options`] || []).map((stage) => <option key={stage} value={stage} />)}</datalist>
          <button type="button" className="traveller-allocate-button" disabled={savingRoll === row.rollno} onClick={() => allocate(row)}>{savingRoll === row.rollno ? "Saving..." : "Allocate"}</button>
        </article>)}</div>
      </section>}

      <section className="traveller-manual-card"><div className="traveller-section-heading"><h3>Add Manually</h3><p>Assign a route and boarding point while saving.</p></div>
        <form onSubmit={submitManual}>
          <div className="traveller-form-grid">
            <label className="traveller-form-group">Name<input name="name" value={form.name} onChange={changeForm} required /></label>
            <label className="traveller-form-group">Registration / Roll No<input name="rollno" value={form.rollno} onChange={changeForm} required /></label>
            <label className="traveller-form-group">Role<select name="role" value={form.role} onChange={changeForm}><option>Student</option><option>Staff</option></select></label>
            {form.role === "Student" ? <label className="traveller-form-group">Year<input name="year" value={form.year} onChange={changeForm} placeholder="e.g. 1st Year" required /></label> : <label className="traveller-form-group">Staff Type<input name="stafftype" value={form.stafftype} onChange={changeForm} placeholder="Teaching / Non Teaching" /></label>}
            <label className="traveller-form-group">Branch<input name="branch" value={form.branch} onChange={changeForm} /></label>
            <label className="traveller-form-group">Phone Number<input name="phoneno" value={form.phoneno} onChange={changeForm} /></label>
            <label className="traveller-form-group">City<input name="city" value={form.city} onChange={changeForm} required /></label>
            <label className="traveller-form-group">Route<select name="routeid" value={form.routeid} onChange={changeForm} required><option value="">Select route</option>{routes.map((route) => <option key={route.routeid} value={route.routeid}>{route.routeid} · {route.routename} ({route.city})</option>)}</select></label>
            <label className="traveller-form-group traveller-form-group-full">Boarding Point<input name="stage" value={form.stage} onChange={changeForm} list="manual-route-stages" disabled={!form.routeid} placeholder={form.routeid ? "Choose or type a boarding point" : "Select route first"} required /><datalist id="manual-route-stages">{stages.map((stage) => <option key={stage} value={stage} />)}</datalist></label>
          </div>
          <button type="submit" className="traveller-submit-button" disabled={busy}>{busy ? "Saving..." : "Save Traveller"}</button>
        </form>
      </section>
    </div>
  </main>;
};

export default AddTraveller;
