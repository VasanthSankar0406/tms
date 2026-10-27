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
import AddVehicle from "./VehicleMaster/AddVehicle";
import ViewPermit from "./VehicleMaster/PermitDetails/ViewPermit";
import AddPermit from "./VehicleMaster/PermitDetails/AddPermit";
import ViewInsurance from "./VehicleMaster/InsuranceDetails/ViewInsurance";
import AddInsurance from "./VehicleMaster/InsuranceDetails/AddInsurance";
import ViewFC from "./VehicleMaster/FCDetails/ViewFC";
import AddFC from "./VehicleMaster/FCDetails/AddFC";
import ViewStage from "./StageMaster/ViewStage";
import AddStage from "./StageMaster/AddStage";
import ViewRoute from "./RouteMaster/ViewRoute";
import AddRoute from "./RouteMaster/AddRoute";
import ViewDriver from "./DriverAllotment/ViewDriver";
import AddDriver from "./DriverAllotment/AddDriver";
import ViewTraveller from "./TravellerAllotment/ViewTraveller";
import AddTraveller from "./TravellerAllotment/AddTraveller";
import ViewCost from "./CostMaster/ViewCost";
import Dashboard from "./Dashboard";
import LeaveRequest from "./LeaveRequest";
import BusLocation from "./BusLocation";
import StudentAttendance from "./StudentAttendance";
import BusStudentLookup from "./BusStudentLookup";
import MaintenanceManagement from "./MaintenanceManagement";
import CapacityManagement from "./CapacityManagement";
import BreakdownReplacement from "./BreakdownReplacement";
import ComplaintManagement from "./ComplaintManagement";
import CentralizedDashboard from "./CentralizedDashboard";
import BusFeesManagement from "./BusFeesManagement";
import BusPendingFeesList from "./BusPendingFeesList";
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
        openView("Vehicle Records", <ViewVehicle />, "vehiclemaster/viewvehicle");
        break;
      case "routes":
        setActiveSection("route");
        setIsSidebarOpen(true);
        openView("Route Records", <ViewRoute />, "viewroute");
        break;
      case "travellers":
        setActiveSection("traveller");
        setIsSidebarOpen(true);
        openView("Traveller Records", <ViewTraveller />, "viewtraveller");
        break;
      case "drivers":
        setActiveSection("driver");
        setIsSidebarOpen(true);
        openView("Driver Records", <ViewDriver />, "viewdriver");
        break;
      case "stages":
        setActiveSection("route");
        setIsSidebarOpen(true);
        openView("Stage Records", <ViewStage />, "viewstage");
        break;
      default:
        break;
    }
  };

  const handleOpenTracking = () => {
    setActiveSection("tracking");
    setIsSidebarOpen(true);
    openView("Live Bus Tracking", <BusLocation />, "buslocation");
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
                label: "View Vehicles",
                action: () => openView("Vehicle Records", <ViewVehicle />, "vehiclemaster/viewvehicle"),
                type: "view",
                path: "vehiclemaster/viewvehicle"
              },
              {
                label: "Add Vehicle",
                action: () => openView("Add Vehicle", <AddVehicle />, "vehiclemaster/addvehicle"),
                type: "add",
                path: "vehiclemaster/addvehicle"
              }
            ]
          },
          {
            groupTitle: "Permits",
            items: [
              {
                label: "View Permit",
                action: () => openView("Permit Records", <ViewPermit />, "vehiclemaster/viewpermit"),
                type: "view",
                path: "vehiclemaster/viewpermit"
              },
              {
                label: "Add Permit",
                action: () => openView("Add Permit", <AddPermit />, "vehiclemaster/addpermit"),
                type: "add",
                path: "vehiclemaster/addpermit"
              }
            ]
          },
          {
            groupTitle: "Insurance",
            items: [
              {
                label: "View Insurance",
                action: () => openView("Insurance Records", <ViewInsurance />, "vehiclemaster/viewinsurance"),
                type: "view",
                path: "vehiclemaster/viewinsurance"
              },
              {
                label: "Add Insurance",
                action: () => openView("Add Insurance", <AddInsurance />, "vehiclemaster/addinsurance"),
                type: "add",
                path: "vehiclemaster/addinsurance"
              }
            ]
          },
          {
            groupTitle: "Fitness Certificate",
            items: [
              {
                label: "View FC",
                action: () => openView("Fitness Certificate Records", <ViewFC />, "vehiclemaster/viewfc"),
                type: "view",
                path: "vehiclemaster/viewfc"
              },
              {
                label: "Add FC",
                action: () => openView("Add Fitness Certificate", <AddFC />, "vehiclemaster/addfc"),
                type: "add",
                path: "vehiclemaster/addfc"
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
                label: "View Routes",
                action: () => openView("Route Records", <ViewRoute />, "viewroute"),
                type: "view",
                path: "viewroute"
              },
              {
                label: "Add Route",
                action: () => openView("Add Route", <AddRoute />, "addroute"),
                type: "add",
                path: "addroute"
              }
            ]
          },
          {
            groupTitle: "Stages",
            items: [
              {
                label: "View Stages",
                action: () => openView("Stage Records", <ViewStage />, "viewstage"),
                type: "view",
                path: "viewstage"
              },
              {
                label: "Add Stage",
                action: () => openView("Add Stage", <AddStage />, "addstage"),
                type: "add",
                path: "addstage"
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
                action: () => openView("Traveller Records", <ViewTraveller />, "viewtraveller"),
                type: "view",
                path: "viewtraveller"
              },
              {
                label: "Add Traveller",
                action: () => openView("Add Traveller", <AddTraveller />, "addtraveller"),
                type: "add",
                path: "addtraveller"
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
                    "Smart Transport Intelligence & Passenger Portal",
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
                action: () => openView("Driver Records", <ViewDriver />, "viewdriver"),
                type: "view",
                path: "viewdriver"
              },
              {
                label: "Add Driver",
                action: () => openView("Add Driver", <AddDriver />, "adddriver"),
                type: "add",
                path: "adddriver"
              },
              {
                label: "Leave Requests",
                action: () => openView("Leave Requests", <LeaveRequest />, "leave-request"),
                type: "view",
                path: "leave-request"
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
                  openView("Bus Maintenance & Service Management", <MaintenanceManagement />, "maintenance"),
                type: "view",
                path: "maintenance"
              },
              {
                label: "Auto Replacement & Dispatches",
                action: () =>
                  openView(
                    "Bus Breakdown – Automatic Replacement Engine",
                    <BreakdownReplacement />,
                    "breakdown"
                  ),
                type: "view",
                path: "breakdown"
              },
              {
                label: "Bus Washing & Cleaning Schedule",
                action: () =>
                  openView("Bus Washing Schedule & Bay Management", <BusWashingSchedule />, "bus-washing"),
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
              },
              {
                label: "Bus Fees Pending List",
                action: () =>
                  openView("Bus Fees Pending Defaulters List", <BusPendingFeesList />, "bus-pending-fees"),
                type: "view",
                path: "bus-pending-fees"
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
                    "Bus Capacity & Route Utilization Portal",
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
                    "Complaint & Feedback Management Portal",
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

  // Sync activeSection with route if route matches
  useEffect(() => {
    for (const sec of navigationSections) {
      for (const group of sec.groups) {
        for (const item of group.items) {
          if (item.path && location.pathname.includes(item.path)) {
            setActiveSection(sec.id);
            return;
          }
        }
      }
    }
  }, [location.pathname, navigationSections]);

  const handleActivityIconClick = (sectionId) => {
    if (activeSection === sectionId) {
      // Toggle secondary panel if clicking the currently open section
      setIsSidebarOpen((prev) => !prev);
    } else {
      setActiveSection(sectionId);
      setIsSidebarOpen(true);
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
                    className={`activity-icon-btn ${isSectionActive && isSidebarOpen ? "active" : ""}`}
                    onClick={() => handleActivityIconClick(section.id)}
                    aria-label={section.tooltip}
                    aria-pressed={isSectionActive && isSidebarOpen}
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
        <main className={`content-area ${!isSidebarOpen ? "expanded-view" : ""}`}>
          <div className="content-topbar">
            <div>
              {(isSubRoute || selectedComponent || activeView !== "Dashboard") && <h2>{activeView}</h2>}
            </div>
            {isSubRoute || selectedComponent ? (
              <button type="button" className="secondary-action" onClick={showDashboard}>
                Back to Dashboard
              </button>
            ) : null}
          </div>

          <section className="content-panel">
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
          </section>
        </main>
      </div>
    </div>
  );
};

export default Home;
