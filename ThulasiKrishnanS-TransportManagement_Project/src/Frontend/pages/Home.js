import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
// Lucide React VS Code Sidebar Icons
import {
  LayoutDashboard,
  BusFront,
  Route as RouteIcon,
  Users,
  UserRound,
  Wrench,
  CalendarDays,
  CreditCard,
  ChartNoAxesCombined,
  MapPin,
  Bell,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  ChevronRight,
  Search,
  LogOut,
  FileText,
  PlusCircle,
  X
} from "lucide-react";
import axios from "axios";
import { API_URL } from "../config";
import "../styles/Home.css";

import ViewVehicle from "./VehicleMaster/ViewVehicle";
import ViewPermit from "./VehicleMaster/PermitDetails/ViewPermit";
import ViewInsurance from "./VehicleMaster/InsuranceDetails/ViewInsurance";
import ViewFC from "./VehicleMaster/FCDetails/ViewFC";
import ViewStage from "./StageMaster/ViewStage";
import ViewRoute from "./RouteMaster/ViewRoute";
import ViewDriver from "./DriverAllotment/ViewDriver";
import ViewTraveller from "./TravellerAllotment/ViewTraveller";
import ViewCost from "./CostMaster/ViewCost";
import Dashboard from "./Dashboard";
import LeaveRequest from "./LeaveRequest";
import DriverQuery from "./DriverAllotment/DriverQuery";
import BusLocation from "./BusLocation";
import StudentAttendance from "./StudentAttendance";
import BusStudentLookup from "./BusStudentLookup";
import MaintenanceManagement from "./MaintenanceManagement";
import CapacityManagement from "./CapacityManagement";
import BreakdownReplacement from "./BreakdownReplacement";
import ComplaintManagement from "./ComplaintManagement";
import CentralizedDashboard from "./CentralizedDashboard";
import BusFeesManagement from "./BusFeesManagement";
import BusSeatingAllocation from "./BusSeatingAllocation";
import BusWashingSchedule from "./BusWashingSchedule";

const Home = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [time, setTime] = useState(new Date());
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [activeView, setActiveView] = useState("Dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState("overview");
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [searchFilter, setSearchFilter] = useState("");
  const [counts, setCounts] = useState({
    vehicle: 0,
    route: 0,
    traveller: 0,
    driver: 0,
    stage: 0
  });

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [vehicleRes, routeRes, travellerRes, driverRes, stageRes] =
          await Promise.all([
            axios.get(`${API_URL}/count/vehicle`),
            axios.get(`${API_URL}/count/route`),
            axios.get(`${API_URL}/count/traveller`),
            axios.get(`${API_URL}/count/driver`),
            axios.get(`${API_URL}/count/stage`)
          ]);

        setCounts({
          vehicle: vehicleRes.data.count,
          route: routeRes.data.count,
          traveller: travellerRes.data.count,
          driver: driverRes.data.count,
          stage: stageRes.data.count
        });
      } catch (error) {
        console.error("Failed to fetch dashboard counts", error);
      }
    };

    fetchCounts();
  }, []);

  // Keyboard shortcut Ctrl+B or Cmd+B to toggle side panel
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setIsSidebarOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const openView = (label, component, path) => {
    setActiveView(label);
    setSelectedComponent(component);
    if (path) {
      navigate(`/home/${path}`);
    }
  };

  const showDashboard = () => {
    setActiveView("Dashboard");
    setSelectedComponent(null);
    navigate("/home");
  };

  const handleDashboardCardClick = (type) => {
    switch (type) {
      case "vehicles":
        setActiveSection("vehicle");
        setIsSidebarOpen(true);
        openView("Vehicle Master", <ViewVehicle />, "vehiclemaster");
        break;
      case "routes":
        setActiveSection("route");
        setIsSidebarOpen(true);
        openView("Route Master", <ViewRoute />, "viewroute");
        break;
      case "travellers":
        setActiveSection("traveller");
        setIsSidebarOpen(true);
        openView("View Travellers", <ViewTraveller />, "viewtraveller");
        break;
      case "drivers":
        setActiveSection("driver");
        setIsSidebarOpen(true);
        openView("Driver Records", <ViewDriver />, "viewdriver");
        break;
      case "stages":
        setActiveSection("route");
        setIsSidebarOpen(true);
        openView("Stage Master", <ViewStage />, "viewstage");
        break;
      default:
        break;
    }
  };

  const handleOpenTracking = () => {
    setActiveSection("tracking");
    setIsSidebarOpen(true);
    openView("Live Bus Location", <BusLocation />, "buslocation");
  };

  const formattedDate = time.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  const formattedTime = time.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });

  const isSubRoute = location.pathname !== "/home" && location.pathname !== "/home/";
  const isUnifiedMasterPage =
    location.pathname.includes("vehiclemaster") ||
    location.pathname.includes("routemaster") ||
    location.pathname.includes("viewroute") ||
    location.pathname.includes("stagemaster") ||
    location.pathname.includes("viewstage") ||
    location.pathname.includes("cost") ||
    location.pathname.includes("viewtraveller") ||
    location.pathname.includes("addtraveller") ||
    location.pathname.includes("bus-lookup") ||
    location.pathname.includes("student-attendance") ||
    location.pathname.includes("viewdriver") ||
    location.pathname.includes("adddriver") ||
    location.pathname.includes("leave-request") ||
    location.pathname.includes("driver-query") ||
    location.pathname.includes("maintenance") ||
    location.pathname.includes("breakdown") ||
    location.pathname.includes("bus-washing") ||
    location.pathname.includes("bus-seating") ||
    location.pathname.includes("bus-fees") ||
    location.pathname.includes("bus-pending-fees") ||
    location.pathname.includes("capacity") ||
    location.pathname.includes("buslocation") ||
    location.pathname.includes("complaints") ||
    activeView === "Vehicle Master" ||
    activeView === "Permit Master" ||
    activeView === "Insurance Master" ||
    activeView === "Fitness Certificate Master" ||
    activeView === "Route Master" ||
    activeView === "Stage Master" ||
    activeView === "Cost Details" ||
    activeView === "Traveller Records" ||
    activeView === "View Travellers" ||
    activeView === "Add Traveller" ||
    activeView === "Student & Staff Lookup" ||
    activeView === "Student Attendance" ||
    activeView === "Driver Records" ||
    activeView === "View Drivers" ||
    activeView === "Driver Management" ||
    activeView === "Leave Requests" ||
    activeView === "Driver Queries" ||
    activeView === "Service History & Schedule" ||
    activeView === "Bus Maintenance & Service Management" ||
    activeView === "Auto Replacement & Dispatches" ||
    activeView === "Bus Breakdown – Automatic Replacement Engine" ||
    activeView === "Bus Washing & Cleaning Schedule" ||
    activeView === "Bus Washing Schedule & Bay Management" ||
    activeView === "Bus Seating Chart & Layout" ||
    activeView === "Bus Seating Allocation & Digital Chart" ||
    activeView === "Bus Fees & Excel Format" ||
    activeView === "Bus Fees Management & Excel Format" ||
    activeView === "Bus Fees Pending Defaulters List" ||
    activeView === "Bus Seating & Route Load" ||
    activeView === "Bus Capacity & Route Utilization Portal" ||
    activeView === "Capacity Management" ||
    activeView === "Live Bus Location" ||
    activeView === "Live Bus Tracking" ||
    activeView === "Passenger Feedback Portal" ||
    activeView === "Complaint & Feedback Management Portal" ||
    activeView === "Complaint Management";

  const navigationSections = useMemo(
    () => [
      {
        id: "overview",
        title: "Overview",
        tooltip: "Dashboard & Overview",
        icon: LayoutDashboard,
        groups: [
          {
            groupTitle: "Dashboards",
            items: [
              { label: "Dashboard", action: showDashboard, type: "view", path: "" },
              {
                label: "Centralized Transport Command",
                action: () =>
                  openView(
                    "Centralized Transport Command Dashboard",
                    <CentralizedDashboard />,
                    "centralized-dashboard"
                  ),
                type: "view",
                path: "centralized-dashboard"
              }
            ]
          }
        ]
      },
      {
        id: "vehicle",
        title: "Bus & Fleet Master",
        tooltip: "Bus Management",
        icon: BusFront,
        groups: [
          {
            groupTitle: "Vehicles",
            items: [
              {
                label: "Vehicle Master",
                action: () => openView("Vehicle Master", <ViewVehicle />, "vehiclemaster"),
                type: "view",
                path: "vehiclemaster"
              }
            ]
          },
          {
            groupTitle: "Permits",
            items: [
              {
                label: "Permit Master",
                action: () => openView("Permit Master", <ViewPermit />, "vehiclemaster/viewpermit"),
                type: "view",
                path: "vehiclemaster/viewpermit"
              }
            ]
          },
          {
            groupTitle: "Insurance",
            items: [
              {
                label: "Insurance Master",
                action: () => openView("Insurance Master", <ViewInsurance />, "vehiclemaster/viewinsurance"),
                type: "view",
                path: "vehiclemaster/viewinsurance"
              }
            ]
          },
          {
            groupTitle: "Fitness Certificate",
            items: [
              {
                label: "Fitness Certificate Master",
                action: () => openView("Fitness Certificate Master", <ViewFC />, "vehiclemaster/viewfc"),
                type: "view",
                path: "vehiclemaster/viewfc"
              }
            ]
          }
        ]
      },
      {
        id: "route",
        title: "Route & Stage Management",
        tooltip: "Route Management",
        icon: RouteIcon,
        groups: [
          {
            groupTitle: "Routes",
            items: [
              {
                label: "Route Master",
                action: () => openView("Route Master", <ViewRoute />, "viewroute"),
                type: "view",
                path: "viewroute"
              }
            ]
          },
          {
            groupTitle: "Stages",
            items: [
              {
                label: "Stage Master",
                action: () => openView("Stage Master", <ViewStage />, "viewstage"),
                type: "view",
                path: "viewstage"
              }
            ]
          },
          {
            groupTitle: "Route Costing",
            items: [
              {
                label: "Cost Details",
                action: () => openView("Cost Details", <ViewCost />, "cost"),
                type: "view",
                path: "cost"
              }
            ]
          }
        ]
      },
      {
        id: "traveller",
        title: "Traveller & Passenger",
        tooltip: "Traveller / Passenger Management",
        icon: Users,
        groups: [
          {
            groupTitle: "Travellers",
            items: [
              {
                label: "View Travellers",
                action: () => openView("View Travellers", <ViewTraveller />, "viewtraveller"),
                type: "view",
                path: "viewtraveller"
              }
            ]
          },
          {
            groupTitle: "Intelligence & Attendance",
            items: [
              {
                label: "Student & Staff Lookup",
                action: () =>
                  openView(
                    "Student & Staff Lookup",
                    <BusStudentLookup />,
                    "bus-lookup"
                  ),
                type: "view",
                path: "bus-lookup"
              },
              {
                label: "Student Attendance",
                action: () => openView("Student Attendance", <StudentAttendance />, "student-attendance"),
                type: "view",
                path: "student-attendance"
              }
            ]
          }
        ]
      },
      {
        id: "driver",
        title: "Driver Administration",
        tooltip: "Driver Management",
        icon: UserRound,
        groups: [
          {
            groupTitle: "Driver Records",
            items: [
              {
                label: "View Drivers",
                action: () => openView("Driver Management", <ViewDriver />, "viewdriver"),
                type: "view",
                path: "viewdriver"
              },
              {
                label: "Leave Requests",
                action: () => openView("Leave Requests", <LeaveRequest />, "leave-request"),
                type: "view",
                path: "leave-request"
              },
              {
                label: "Driver Queries",
                action: () => openView("Driver Queries", <DriverQuery />, "driver-query"),
                type: "view",
                path: "driver-query"
              }
            ]
          }
        ]
      },
      {
        id: "maintenance",
        title: "Vehicle Maintenance",
        tooltip: "Vehicle Maintenance",
        icon: Wrench,
        groups: [
          {
            groupTitle: "Service & Maintenance",
            items: [
              {
                label: "Service History & Schedule",
                action: () =>
                  openView("Service History & Schedule", <MaintenanceManagement />, "maintenance"),
                type: "view",
                path: "maintenance"
              },
              {
                label: "Auto Replacement & Dispatches",
                action: () =>
                  openView(
                    "Auto Replacement & Dispatches",
                    <BreakdownReplacement />,
                    "breakdown"
                  ),
                type: "view",
                path: "breakdown"
              },
              {
                label: "Bus Washing & Cleaning Schedule",
                action: () =>
                  openView("Bus Washing & Cleaning Schedule", <BusWashingSchedule />, "bus-washing"),
                type: "view",
                path: "bus-washing"
              }
            ]
          }
        ]
      },
      {
        id: "seating",
        title: "Scheduling & Seating",
        tooltip: "Scheduling",
        icon: CalendarDays,
        groups: [
          {
            groupTitle: "Seating Allocation",
            items: [
              {
                label: "Bus Seating Chart & Layout",
                action: () =>
                  openView(
                    "Bus Seating Allocation & Digital Chart",
                    <BusSeatingAllocation />,
                    "bus-seating"
                  ),
                type: "view",
                path: "bus-seating"
              }
            ]
          }
        ]
      },
      {
        id: "fees",
        title: "Bus Fees Management",
        tooltip: "Fees & Accounts",
        icon: CreditCard,
        groups: [
          {
            groupTitle: "Fee Collections",
            items: [
              {
                label: "Bus Fees & Excel Format",
                action: () =>
                  openView("Bus Fees Management & Excel Format", <BusFeesManagement />, "bus-fees"),
                type: "view",
                path: "bus-fees"
              }
            ]
          }
        ]
      },
      {
        id: "analytics",
        title: "Capacity & Analytics",
        tooltip: "Reports and Analytics",
        icon: ChartNoAxesCombined,
        groups: [
          {
            groupTitle: "Route Utilization",
            items: [
              {
                label: "Bus Seating & Route Load",
                action: () =>
                  openView(
                    "Bus Seating & Route Load",
                    <CapacityManagement />,
                    "capacity"
                  ),
                type: "view",
                path: "capacity"
              }
            ]
          }
        ]
      },
      {
        id: "tracking",
        title: "Live Tracking",
        tooltip: "Live Tracking",
        icon: MapPin,
        groups: [
          {
            groupTitle: "Fleet GPS",
            items: [
              {
                label: "Live Bus Location",
                action: handleOpenTracking,
                type: "view",
                path: "buslocation"
              }
            ]
          }
        ]
      },
      {
        id: "complaints",
        title: "Feedback & Complaints",
        tooltip: "Notifications & Feedback",
        icon: Bell,
        groups: [
          {
            groupTitle: "Passenger Portal",
            items: [
              {
                label: "Passenger Feedback Portal",
                action: () =>
                  openView(
                    "Passenger Feedback Portal",
                    <ComplaintManagement />,
                    "complaints"
                  ),
                type: "view",
                path: "complaints"
              }
            ]
          }
        ]
      }
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Sync activeSection and activeView with current route
  useEffect(() => {
    const rawPath = location.pathname.replace(/^\/home\/?/, "");

    if (!rawPath) {
      setActiveSection("overview");
      setActiveView("Dashboard");
      setSelectedComponent(null);
      return;
    }

    // 1. Prioritize exact route match
    for (const sec of navigationSections) {
      for (const group of sec.groups) {
        for (const item of group.items) {
          if (item.path && rawPath === item.path) {
            setActiveSection(sec.id);
            setActiveView(item.label);
            return;
          }
        }
      }
    }

    // 2. Fallback to prefix matching for sub-routes
    for (const sec of navigationSections) {
      for (const group of sec.groups) {
        for (const item of group.items) {
          if (item.path && rawPath.startsWith(item.path + "/")) {
            setActiveSection(sec.id);
            setActiveView(item.label);
            return;
          }
        }
      }
    }
  }, [location.pathname, navigationSections]);

  const handleActivityIconClick = (sectionId) => {
    const targetSection = navigationSections.find((s) => s.id === sectionId);
    if (!targetSection) return;

    setActiveSection(sectionId);
    setIsSidebarOpen(true);
    setSearchFilter("");

    // Trigger the section's primary view action to navigate directly to that tab
    const firstItem = targetSection.groups?.[0]?.items?.[0];
    if (firstItem && typeof firstItem.action === "function") {
      firstItem.action();
    }

    if (window.innerWidth <= 840) {
      setIsSidebarOpen(false);
    }
  };

  const toggleGroup = (groupTitle) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupTitle]: !prev[groupTitle]
    }));
  };

  const currentSection =
    navigationSections.find((s) => s.id === activeSection) || navigationSections[0];

  return (
    <div className="home-layout">
      {/* Modern Top Header */}
      <header className="home-header">
        <div className="home-header-left">
          <button
            type="button"
            className="sidebar-toggle-btn header-toggle"
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            aria-label={isSidebarOpen ? "Collapse navigation panel" : "Expand navigation panel"}
            title={isSidebarOpen ? "Collapse navigation (Ctrl+B)" : "Expand navigation (Ctrl+B)"}
          >
            {isSidebarOpen ? (
              <PanelLeftClose size={20} strokeWidth={1.8} />
            ) : (
              <PanelLeftOpen size={20} strokeWidth={1.8} />
            )}
          </button>
          <div className="home-header-copy">
            <p className="home-header-kicker">National Engineering College</p>
            <h1 className="home-header-title">Transport Management Portal</h1>
            <p className="home-header-subtitle">
              Academic mobility operations, fleet records, and daily administration
            </p>
          </div>
        </div>

        <div className="home-header-meta">
          <div className="live-clock">
            <span className="clock-label">Campus Time</span>
            <strong>{formattedTime}</strong>
            <span>{formattedDate}</span>
          </div>
          <button
            type="button"
            className="logout-btn"
            onClick={() => {
              localStorage.removeItem("vehicleId");
              navigate("/");
            }}
          >
            <LogOut size={16} strokeWidth={2} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      <div className="home-container">
        {/* Mobile Backdrop */}
        {isSidebarOpen && (
          <div
            className="vscode-backdrop"
            onClick={() => setIsSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* VS Code Style Sidebar */}
        <aside className="vscode-sidebar" aria-label="Main Navigation">
          {/* Narrow Activity Bar (Icon-only) */}
          <nav className="vscode-activity-bar" aria-label="Activity Bar">
            <div className="activity-bar-top">
              {navigationSections.map((section) => {
                const IconComponent = section.icon;
                const isSectionActive = activeSection === section.id;

                return (
                  <button
                    key={section.id}
                    type="button"
                    className={`activity-icon-btn ${isSectionActive ? "active" : ""}`}
                    onClick={() => handleActivityIconClick(section.id)}
                    aria-label={section.tooltip}
                    aria-pressed={isSectionActive}
                  >
                    <IconComponent size={20} strokeWidth={1.8} className="activity-icon" />
                    <span className="activity-tooltip" role="tooltip">
                      {section.tooltip}
                    </span>
                  </button>
                );
              })}

              <div className="activity-bar-separator" />

              <button
                type="button"
                className="activity-icon-btn logout-activity-btn"
                onClick={() => {
                  localStorage.removeItem("vehicleId");
                  navigate("/");
                }}
                aria-label="Sign Out"
              >
                <LogOut size={20} strokeWidth={1.8} className="activity-icon" />
                <span className="activity-tooltip" role="tooltip">
                  Sign Out
                </span>
              </button>
            </div>
          </nav>

          {/* Secondary Submenu Panel */}
          <section
            className={`vscode-secondary-panel ${isSidebarOpen ? "open" : "collapsed"}`}
            aria-label={`${currentSection.title} submenu`}
            aria-hidden={!isSidebarOpen}
          >
            {/* Panel Header */}
            <div className="secondary-panel-header">
              <div className="panel-title-block">
                <span className="panel-title-kicker">Section</span>
                <h2 className="panel-title">{currentSection.title}</h2>
              </div>
              <button
                type="button"
                className="panel-close-btn"
                onClick={() => setIsSidebarOpen(false)}
                aria-label="Close section panel"
                title="Close panel"
              >
                <PanelLeftClose size={16} strokeWidth={2} />
              </button>
            </div>

            {/* Quick Filter Search */}
            <div className="submenu-search-container">
              <div className="submenu-search-box">
                <Search size={14} strokeWidth={2} className="search-icon" />
                <input
                  type="text"
                  placeholder="Filter actions & records..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="submenu-search-input"
                  aria-label="Filter submenu items"
                />
                {searchFilter && (
                  <button
                    type="button"
                    className="search-clear-btn"
                    onClick={() => setSearchFilter("")}
                    aria-label="Clear filter"
                  >
                    <X size={12} strokeWidth={2} />
                  </button>
                )}
              </div>
            </div>

            {/* Submenu Groups & Links */}
            <div className="secondary-panel-content">
              {currentSection.groups.map((group) => {
                const isCollapsed = Boolean(collapsedGroups[group.groupTitle]);
                const filteredItems = group.items.filter((item) =>
                  item.label.toLowerCase().includes(searchFilter.toLowerCase())
                );

                if (searchFilter && filteredItems.length === 0) {
                  return null;
                }

                return (
                  <div key={group.groupTitle} className="submenu-group">
                    <button
                      type="button"
                      className="submenu-group-header"
                      onClick={() => toggleGroup(group.groupTitle)}
                      aria-expanded={!isCollapsed}
                    >
                      <span className="submenu-chevron">
                        {isCollapsed ? (
                          <ChevronRight size={13} strokeWidth={2.2} />
                        ) : (
                          <ChevronDown size={13} strokeWidth={2.2} />
                        )}
                      </span>
                      <span className="submenu-group-title">{group.groupTitle}</span>
                      <span className="submenu-group-count">{filteredItems.length}</span>
                    </button>

                    {!isCollapsed && (
                      <div className="submenu-items-list">
                        {filteredItems.map((item) => {
                          const isActive = activeView === item.label;

                          return (
                            <button
                              key={item.label}
                              type="button"
                              className={`submenu-item-btn ${isActive ? "active" : ""}`}
                              onClick={() => {
                                item.action();
                                if (window.innerWidth <= 840) {
                                  setIsSidebarOpen(false);
                                }
                              }}
                            >
                              <span className="submenu-item-icon">
                                {item.type === "add" ? (
                                  <PlusCircle size={14} strokeWidth={2} />
                                ) : (
                                  <FileText size={14} strokeWidth={2} />
                                )}
                              </span>
                              <span className="submenu-item-label">{item.label}</span>
                              {isActive && <span className="active-indicator" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </aside>

        {/* Main Workspace Content Area */}
        <main
          className={`content-area ${!isSidebarOpen ? "expanded-view" : ""} ${
            location.pathname.includes("buslocation") || activeView === "Live Bus Location"
              ? "live-tracking-mode"
              : ""
          }`}
        >
          {!isUnifiedMasterPage && (
            <div className="content-topbar">
              <div className="topbar-title-block">
                <div className="topbar-breadcrumb">
                  <span className="breadcrumb-link" onClick={showDashboard}>Dashboard</span>
                  {isSubRoute || selectedComponent ? (
                    <>
                      <span className="breadcrumb-separator">/</span>
                      <span className="breadcrumb-section">
                        {navigationSections.find((s) => s.id === activeSection)?.title || "Vehicle Master"}
                      </span>
                      <span className="breadcrumb-separator">/</span>
                      <span className="breadcrumb-current">{activeView}</span>
                    </>
                  ) : (
                    <>
                      <span className="breadcrumb-separator">/</span>
                      <span className="breadcrumb-current">Operational Overview</span>
                    </>
                  )}
                </div>
                <h2 className="topbar-heading">
                  {isSubRoute || selectedComponent ? activeView : "Operations Dashboard"}
                </h2>
              </div>
              <div className="topbar-actions">
                {isSubRoute || selectedComponent ? (
                  <button type="button" className="secondary-action" onClick={showDashboard}>
                    <LayoutDashboard size={15} style={{ marginRight: '6px' }} />
                    <span>Back to Dashboard</span>
                  </button>
                ) : (
                  <span className="topbar-badge-live">
                    <span className="badge-pulse-dot" />
                    Live Fleet Active
                  </span>
                )}
              </div>
            </div>
          )}

          <section className="content-panel">
            <div className="portal-view-transition" key={location.pathname + (selectedComponent ? `-${activeView}` : '')}>
              {isSubRoute ? (
                <div className="form-container">
                  <Outlet />
                </div>
              ) : selectedComponent ? (
                <div className="form-container">{selectedComponent}</div>
              ) : (
                <Dashboard
                  counts={counts}
                  onCardClick={handleDashboardCardClick}
                  onOpenTracking={handleOpenTracking}
                />
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default Home;
