import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FaBus,
  FaMapMarkerAlt,
  FaRoute,
  FaSearch,
  FaUserTie,
  FaUsers,
  FaShower,
  FaCalendarAlt,
  FaArrowRight,
  FaSyncAlt
} from "react-icons/fa";
import { API_URL } from "../config";
import "../styles/Dashboard.css";

const Dashboard = ({ counts }) => {
  const navigate = useNavigate();
  const [overviewData, setOverviewData] = useState({
    vehicles: [],
    routes: [],
    stages: [],
    drivers: [],
    travellers: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState("routes");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchText, setSearchText] = useState("");

  // Upcoming Bus Washing Schedule
  const [washSchedules, setWashSchedules] = useState([]);
  const [washToday, setWashToday] = useState(getLocalDateString(new Date()));
  const [washingLoading, setWashingLoading] = useState(true);

  const fetchWashSchedules = async () => {
    try {
      setWashingLoading(true);
      const res = await axios.get(`${API_URL}/api/bus-washing`);
      if (res.data && res.data.success) {
        setWashSchedules(res.data.schedules || []);
        if (res.data.todayDate) setWashToday(res.data.todayDate);
      }
    } catch (error) {
      console.error("Error fetching upcoming bus washing schedule:", error);
    } finally {
      setWashingLoading(false);
    }
  };

  useEffect(() => {
    fetchWashSchedules();
  }, []);

  const upcomingWashes = useMemo(() => {
    const endDate = getDateAfter(washToday, 7);
    return washSchedules
      .filter((schedule) => schedule.scheduled_date >= washToday && schedule.scheduled_date <= endDate)
      .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date) || String(a.vehicleid).localeCompare(String(b.vehicleid)));
  }, [washSchedules, washToday]);

  useEffect(() => {
    const fetchOverviewData = async () => {
      try {
        setLoading(true);
        const [vehicleRes, routeRes, stageRes, driverRes, travellerRes] = await Promise.all([
          axios.get(`${API_URL}/getVehicle`),
          axios.get(`${API_URL}/getRoute`),
          axios.get(`${API_URL}/getStage`),
          axios.get(`${API_URL}/getdrivers`),
          axios.get(`${API_URL}/getTraveller`)
        ]);

        setOverviewData({
          vehicles: Array.isArray(vehicleRes.data) ? vehicleRes.data : [],
          routes: Array.isArray(routeRes.data) ? routeRes.data : [],
          stages: Array.isArray(stageRes.data) ? stageRes.data : [],
          drivers: Array.isArray(driverRes.data) ? driverRes.data : [],
          travellers: Array.isArray(travellerRes.data) ? travellerRes.data : []
        });
        setError("");
      } catch (fetchError) {
        console.error("Failed to fetch overview data", fetchError);
        setOverviewData({
          vehicles: [],
          routes: [],
          stages: [],
          drivers: [],
          travellers: []
        });
        setError("");
      } finally {
        setLoading(false);
      }
    };

    fetchOverviewData();
  }, []);

  const summaryCards = [
    {
      key: "routes",
      label: "Routes",
      value: counts?.route ?? overviewData.routes.length,
      icon: FaRoute,
      description: "Browse route cities and open city-wise route details."
    },
    {
      key: "stages",
      label: "Stages",
      value: counts?.stage ?? overviewData.stages.length,
      icon: FaMapMarkerAlt,
      description: "Open cities first, then inspect the stages for that city."
    },
    {
      key: "vehicles",
      label: "Vehicles",
      value: counts?.vehicle ?? overviewData.vehicles.length,
      icon: FaBus,
      description: "See buses horizontally and open each bus profile."
    },
    {
      key: "travellers",
      label: "Travellers",
      value: counts?.traveller ?? overviewData.travellers.length,
      icon: FaUsers,
      description: "Search travellers and click any record to view details."
    },
    {
      key: "drivers",
      label: "Drivers",
      value: counts?.driver ?? overviewData.drivers.length,
      icon: FaUserTie,
      description: "Search drivers and open each driver detail card."
    },
    {
      key: "washing",
      label: "Upcoming Washes",
      value: upcomingWashes.length,
      icon: FaShower,
      description: "Buses scheduled for washing over the next seven days."
    }
  ];

  const cityOptions = useMemo(() => {
    if (activeSection === "routes") {
      return buildCityGroups(overviewData.routes, (item) => item.city);
    }

    if (activeSection === "stages") {
      return buildCityGroups(overviewData.stages, (item) => item.city);
    }

    return [];
  }, [activeSection, overviewData.routes, overviewData.stages]);

  const routeAssignments = useMemo(() => {
    const driversByVehicle = new Map(
      overviewData.drivers.map((driver) => [driver.vehicleid, driver])
    );

    const assignments = new Map();

    overviewData.vehicles.forEach((vehicle) => {
      const routeId = vehicle.routeid;
      if (!routeId) {
        return;
      }

      const existingAssignments = assignments.get(routeId) || [];
      const assignedDriver = driversByVehicle.get(vehicle.vehicleid);

      existingAssignments.push({
        busNo: vehicle.vehicleid || "N/A",
        busRegNo: vehicle.registrationno || "N/A",
        driverName: assignedDriver?.staffname || "Driver not assigned",
        driverCode: assignedDriver?.staffcode || "N/A"
      });

      assignments.set(routeId, existingAssignments);
    });

    return assignments;
  }, [overviewData.drivers, overviewData.vehicles]);

  const itemsBySection = useMemo(() => {
    switch (activeSection) {
      case "routes":
        return overviewData.routes
          .filter((item) => !selectedCity || item.city === selectedCity)
          .sort((a, b) => String(a.routename || "").localeCompare(String(b.routename || "")));
      case "stages":
        return overviewData.stages
          .filter((item) => !selectedCity || item.city === selectedCity)
          .sort((a, b) => String(a.stagename || "").localeCompare(String(b.stagename || "")));
      case "vehicles":
        return [...overviewData.vehicles].sort((a, b) => String(a.vehicleid || "").localeCompare(String(b.vehicleid || "")));
      case "travellers":
        return filterBySearch(overviewData.travellers, searchText, ["name", "rollno", "branch", "city", "routeid", "stage"]);
      case "drivers":
        return filterBySearch(overviewData.drivers, searchText, ["staffname", "staffcode", "vehicleid", "routename", "city"]);
      default:
        return [];
    }
  }, [activeSection, overviewData, searchText, selectedCity]);

  useEffect(() => {
    const nextItem = itemsBySection[0] || null;

    if (!selectedItem) {
      setSelectedItem(nextItem);
      return;
    }

    const stillExists = itemsBySection.some((item) => getItemKey(activeSection, item) === getItemKey(activeSection, selectedItem));
    if (!stillExists) {
      setSelectedItem(nextItem);
    }
  }, [activeSection, itemsBySection, selectedItem]);

  const activeSummary = summaryCards.find((card) => card.key === activeSection);

  const handleSummaryCardClick = (key) => {
    if (key === "washing") {
      document.getElementById("upcoming-washing-section")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    setActiveSection(key);
    setSelectedCity("");
    setSelectedItem(null);
    setSearchText("");
  };

  const handleCityClick = (city) => {
    setSelectedCity(city);
    setSelectedItem(null);
  };

  return (
    <div className="dashboard-page">
      <section className="dashboard-hero">
        <div>
          <p className="dashboard-kicker">Admin Workspace</p>
          <h3>Interactive Dashboard</h3>
          <p>
            Click any section below to move through cities, routes, stages, buses, travellers, drivers, and daily washing schedules without leaving the dashboard.
          </p>
        </div>
        <div className="dashboard-active-pill">
          <span>Now Viewing</span>
          <strong>{activeSummary?.label || "Routes"}</strong>
        </div>
      </section>

      <section className="dashboard-summary-grid">
        {summaryCards.map(({ key, label, value, icon: Icon, description }) => (
          <button
            key={key}
            type="button"
            className={`dashboard-summary-card ${activeSection === key ? "active" : ""}`}
            onClick={() => handleSummaryCardClick(key)}
          >
            <span className="dashboard-summary-icon">
              <Icon />
            </span>
            <div>
              <p className="dashboard-summary-label">{label}</p>
              <strong className="dashboard-summary-value">{value}</strong>
              <p className="dashboard-summary-description">{description}</p>
            </div>
          </button>
        ))}
      </section>

      {loading ? <p className="dashboard-state-message">Loading overview details...</p> : null}
      {error ? <p className="dashboard-state-message error">{error}</p> : null}

      {!loading && !error ? (
        <section className="dashboard-workspace">
          {(activeSection === "routes" || activeSection === "stages") && (
            <div className="dashboard-explorer-card">
              <div className="dashboard-detail-header">
                <h4>Select City</h4>
                <span>{cityOptions.length} cities</span>
              </div>
              <div className="dashboard-chip-grid">
                {cityOptions.map((cityItem) => (
                  <button
                    key={cityItem.label}
                    type="button"
                    className={`dashboard-chip-card ${selectedCity === cityItem.label ? "active" : ""}`}
                    onClick={() => handleCityClick(cityItem.label)}
                  >
                    <strong>{cityItem.label}</strong>
                    <span>{cityItem.count} {activeSection}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {(activeSection === "travellers" || activeSection === "drivers") && (
            <div className="dashboard-search-bar">
              <FaSearch />
              <input
                type="text"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder={`Search ${activeSection} by name, code, city, route...`}
              />
            </div>
          )}

          <div className="dashboard-browser-layout">
            <div className="dashboard-explorer-card">
              <div className="dashboard-detail-header">
                <h4>{getExplorerTitle(activeSection, selectedCity)}</h4>
                <span>{itemsBySection.length} records</span>
              </div>

              {activeSection === "vehicles" ? (
                <div className="dashboard-vehicle-strip">
                  {itemsBySection.map((item) => (
                    <button
                      key={getItemKey(activeSection, item)}
                      type="button"
                      className={`dashboard-vehicle-card ${isSelected(activeSection, selectedItem, item) ? "active" : ""}`}
                      onClick={() => setSelectedItem(item)}
                    >
                      <FaBus />
                      <strong>{item.vehicleid}</strong>
                      <span>{item.registrationno || "No reg no"}</span>
                      <small>{item.routeid || "No route"}</small>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="dashboard-list-shell">
                  {itemsBySection.map((item) => (
                    <button
                      key={getItemKey(activeSection, item)}
                      type="button"
                      className={`dashboard-list-item ${isSelected(activeSection, selectedItem, item) ? "active" : ""}`}
                      onClick={() => setSelectedItem(item)}
                    >
                      <strong>{getPrimaryLabel(activeSection, item)}</strong>
                      <span>{getSecondaryLabel(activeSection, item)}</span>
                    </button>
                  ))}
                  {itemsBySection.length === 0 ? (
                    <p className="dashboard-empty-message">No records available for this selection.</p>
                  ) : null}
                </div>
              )}
            </div>

            <div className="dashboard-explorer-card dashboard-details-panel">
              <div className="dashboard-detail-header">
                <h4>{getDetailTitle(activeSection)}</h4>
                <span>{selectedItem ? "Selected" : "Choose an item"}</span>
              </div>

              {selectedItem ? (
                <div className="dashboard-detail-stack">
                  {getDetailRows(activeSection, selectedItem, routeAssignments).map((row) => (
                    <div className="dashboard-detail-row" key={row.label}>
                      <span>{row.label}</span>
                      <strong>{row.value}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="dashboard-empty-message">Choose an item from the left side to see full details here.</p>
              )}
            </div>
          </div>
        </section>
      ) : null}

      <section id="upcoming-washing-section" className="dashboard-upcoming-washing">
        <div className="dashboard-upcoming-header">
          <div>
            <span className="dashboard-upcoming-kicker"><FaShower /> Fleet Schedule</span>
            <h4>Upcoming Bus Washing</h4>
            <p>Bus washes due today and over the next seven days.</p>
          </div>
          <div className="dashboard-upcoming-actions">
            <button type="button" className="dashboard-mini-btn" onClick={fetchWashSchedules} disabled={washingLoading}>
              <FaSyncAlt /> {washingLoading ? "Loading..." : "Refresh"}
            </button>
            <button type="button" className="dashboard-view-all-washing-btn" onClick={() => navigate("/home/bus-washing")}>
              <span>View Full Schedule</span><FaArrowRight />
            </button>
          </div>
        </div>

        {washingLoading ? (
          <p className="dashboard-upcoming-empty">Loading upcoming bus washes...</p>
        ) : upcomingWashes.length ? (
          <div className="dashboard-upcoming-days">
            {upcomingWashes.map((wash) => (
              <article className="dashboard-upcoming-wash-item" key={wash.id || wash.vehicleid}>
                <div className="dashboard-upcoming-date">
                  <FaCalendarAlt />
                  <strong>{wash.scheduled_date === washToday ? "Today" : formatScheduleDate(wash.scheduled_date)}</strong>
                </div>
                <div className="dashboard-upcoming-bus">
                  <strong>Bus {wash.vehicleid}</strong>
                  <span>{wash.registrationno || "Registration not set"}</span>
                </div>
                <div className="dashboard-upcoming-route">{wash.routename || "Route not assigned"}</div>
              </article>
            ))}
          </div>
        ) : (
          <p className="dashboard-upcoming-empty">No bus washes are scheduled for the next seven days.</p>
        )}
      </section>
    </div>
  );
};

const getLocalDateString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getDateAfter = (dateString, days) => {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const formatScheduleDate = (dateString) => new Date(`${dateString}T00:00:00`).toLocaleDateString("en-IN", {
  weekday: "short", day: "numeric", month: "short"
});

const buildCityGroups = (items, getCity) => {
  const cityMap = new Map();

  items.forEach((item) => {
    const city = getCity(item) || "Unknown City";
    cityMap.set(city, (cityMap.get(city) || 0) + 1);
  });

  return Array.from(cityMap.entries())
    .map(([city, count]) => ({
      label: city,
      count
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
};

const filterBySearch = (items, searchText, keys) => {
  const normalizedSearch = searchText.trim().toLowerCase();

  if (!normalizedSearch) {
    return items;
  }

  return items.filter((item) =>
    keys.some((key) => String(item[key] || "").toLowerCase().includes(normalizedSearch))
  );
};

const getItemKey = (section, item) => {
  switch (section) {
    case "routes":
      return item.routeid;
    case "stages":
      return item.stageid || `${item.routeid}-${item.stagename}`;
    case "vehicles":
      return item.vehicleid;
    case "travellers":
      return item.rollno;
    case "drivers":
      return item.staffcode;
    default:
      return JSON.stringify(item);
  }
};

const getExplorerTitle = (section, selectedCity) => {
  if (section === "routes") {
    return selectedCity ? `${selectedCity} Routes` : "Route Cities";
  }

  if (section === "stages") {
    return selectedCity ? `${selectedCity} Stages` : "Stage Cities";
  }

  if (section === "vehicles") {
    return "Buses";
  }

  if (section === "travellers") {
    return "Traveller Records";
  }

  return "Driver Records";
};

const getDetailTitle = (section) => {
  switch (section) {
    case "routes":
      return "Route Detail";
    case "stages":
      return "Stage Detail";
    case "vehicles":
      return "Bus Detail";
    case "travellers":
      return "Traveller Detail";
    case "drivers":
      return "Driver Detail";
    default:
      return "Detail";
  }
};

const getPrimaryLabel = (section, item) => {
  switch (section) {
    case "routes":
      return item.routename || item.routeid;
    case "stages":
      return item.stagename || "Unnamed Stage";
    case "travellers":
      return item.name || item.rollno;
    case "drivers":
      return item.staffname || item.staffcode;
    default:
      return "Item";
  }
};

const getSecondaryLabel = (section, item) => {
  switch (section) {
    case "routes":
      return `${item.routeid} | ${item.totaldistance || "N/A"} km`;
    case "stages":
      return `${item.routeid || "No route"} | ${item.city || "No city"}`;
    case "travellers":
      return `${item.rollno} | ${item.branch || "No branch"}`;
    case "drivers":
      return `${item.staffcode} | ${item.vehicleid || "No vehicle"}`;
    default:
      return "";
  }
};

const formatAssignments = (assignments, key) => {
  if (!assignments || assignments.length === 0) {
    return "N/A";
  }

  return assignments.map((assignment) => assignment[key]).join(", ");
};

const getDetailRows = (section, item, routeAssignments = new Map()) => {
  const assignments = routeAssignments.get(item.routeid) || [];

  switch (section) {
    case "routes":
      return [
        { label: "Route ID", value: item.routeid || "N/A" },
        { label: "Route Name", value: item.routename || "N/A" },
        { label: "City", value: item.city || "N/A" },
        { label: "Total Stages", value: item.totalstages || "N/A" },
        { label: "Distance", value: item.totaldistance ? `${item.totaldistance} km` : "N/A" },
        { label: "Bus No", value: formatAssignments(assignments, "busNo") },
        { label: "Bus Reg No", value: formatAssignments(assignments, "busRegNo") },
        { label: "Driver", value: formatAssignments(assignments, "driverName") }
      ];
    case "stages":
      return [
        { label: "Stage ID", value: item.stageid || "N/A" },
        { label: "Stage Name", value: item.stagename || "N/A" },
        { label: "City", value: item.city || "N/A" },
        { label: "Route ID", value: item.routeid || "N/A" },
        { label: "Arrival", value: formatTime(item.arrivaltime) },
        { label: "Departure", value: formatTime(item.departureTime || item.departuretime) },
        { label: "Fee", value: item.fee ?? "N/A" },
        { label: "Bus No", value: formatAssignments(assignments, "busNo") },
        { label: "Bus Reg No", value: formatAssignments(assignments, "busRegNo") },
        { label: "Driver", value: formatAssignments(assignments, "driverName") }
      ];
    case "vehicles":
      return [
        { label: "Vehicle ID", value: item.vehicleid || "N/A" },
        { label: "Registration No", value: item.registrationno || "N/A" },
        { label: "Vehicle Type", value: item.vehicletype || "N/A" },
        { label: "Route ID", value: item.routeid || "N/A" },
        { label: "Seat Capacity", value: item.seatcapacity || "N/A" },
        { label: "Available Seats", value: item.available_seats ?? "N/A" },
        { label: "RC No", value: item.rcno || "N/A" },
        { label: "Registration Place", value: item.registrationplace || "N/A" }
      ];
    case "travellers":
      return [
        { label: "Name", value: item.name || "N/A" },
        { label: "Roll Number", value: item.rollno || "N/A" },
        { label: "Role", value: item.role || "N/A" },
        { label: "Year / Staff Type", value: item.role === "Staff" ? item.stafftype || "N/A" : item.year || "N/A" },
        { label: "Branch", value: item.branch || "N/A" },
        { label: "Phone", value: item.phoneno || "N/A" },
        { label: "City", value: item.city || item.place || "N/A" },
        { label: "Route", value: item.routename || item.routeid || "N/A" },
        { label: "Bus No", value: item.busno || "N/A" },
        { label: "Stage", value: item.stage || item.point || "N/A" }
      ];
    case "drivers":
      return [
        { label: "Staff Code", value: item.staffcode || "N/A" },
        { label: "Staff Name", value: item.staffname || "N/A" },
        { label: "Vehicle ID", value: item.vehicleid || "N/A" },
        { label: "Route Name", value: item.routename || "N/A" },
        { label: "City", value: item.city || "N/A" },
        { label: "Mobile", value: item.mobileno || "N/A" },
        { label: "Email", value: item.email || "N/A" }
      ];
    default:
      return [];
  }
};

const isSelected = (section, selectedItem, item) => {
  if (!selectedItem) {
    return false;
  }

  return getItemKey(section, selectedItem) === getItemKey(section, item);
};

const formatTime = (value) => {
  if (!value) {
    return "N/A";
  }

  const timeString = value.toString();
  if (timeString.includes(":")) {
    const parts = timeString.split(":");
    return `${parts[0]}:${parts[1]}`;
  }

  return timeString;
};

export default Dashboard;
