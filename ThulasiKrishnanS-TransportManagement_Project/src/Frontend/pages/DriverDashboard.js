import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  FaUser,
  FaUserEdit,
  FaClipboardList,
  FaCalendarAlt,
  FaQuestionCircle,
  FaSignOutAlt,
  FaHome,
  FaBus,
  FaIdCard,
  FaArrowRight,
  FaBroadcastTower
} from 'react-icons/fa';
import '../styles/DriverDashboard.css';

const DriverDashboard = () => {
  const [driverData, setDriverData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [time, setTime] = useState(new Date());
  const navigate = useNavigate();
  const vehicleId = localStorage.getItem('vehicleId');

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!vehicleId) {
      navigate('/login');
      return;
    }

    const fetchDrivers = async () => {
      try {
        const response = await axios.get('http://localhost:5000/getdrivers');
        const drivers = Array.isArray(response.data) ? response.data : [];
        const matchedDriver = drivers.find((driver) => String(driver.vehicleid) === String(vehicleId));

        if (matchedDriver) {
          setDriverData(matchedDriver);
        } else {
          setDriverData({
            staffname: 'Assigned Driver',
            staffcode: localStorage.getItem('staffcode') || 'D001',
            vehicleid: vehicleId || 'BUS01'
          });
        }
      } catch (err) {
        setError(err.message || 'Failed to load driver information.');
        setDriverData({
          staffname: 'Assigned Driver',
          staffcode: localStorage.getItem('staffcode') || 'D001',
          vehicleid: vehicleId || 'BUS01'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDrivers();
  }, [vehicleId, navigate]);

  const formattedDate = useMemo(
    () =>
      time.toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }),
    [time]
  );

  const formattedTime = useMemo(
    () =>
      time.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }),
    [time]
  );

  const quickActions = [
    {
      key: 'profile',
      title: 'Driver Profile',
      description: 'View your assigned personal and vehicle details.',
      icon: FaUser,
      action: () => navigate('/driver-profile')
    },
    {
      key: 'edit',
      title: 'Edit Profile',
      description: 'Update your contact details and supporting information.',
      icon: FaUserEdit,
      action: () => navigate('/edit-driver-profile')
    },
    {
      key: 'attendance',
      title: 'Student Attendance',
      description: 'Submit the student count for your assigned trip.',
      icon: FaClipboardList,
      action: () => navigate('/driver-attendance')
    },
    {
      key: 'leave',
      title: 'Leave Request',
      description: 'Send leave applications and review request history.',
      icon: FaCalendarAlt,
      action: () => navigate('/leave-request')
    },
    {
      key: 'query',
      title: 'Query',
      description: 'Raise issues and follow up on support requests.',
      icon: FaQuestionCircle,
      action: () => navigate('/driver-query')
    },
    {
      key: 'location',
      title: 'Location Sharing',
      description: 'Start or stop live location updates during active trips.',
      icon: FaBroadcastTower,
      action: () => navigate('/driver-app')
    }
  ];

  const navigationGroups = [
    {
      title: 'Overview',
      items: [{ label: 'Dashboard', icon: FaHome, active: true, action: () => navigate('/driver-dashboard') }]
    },
    {
      title: 'Driver Services',
      items: [
        { label: 'Driver Profile', icon: FaUser, action: () => navigate('/driver-profile') },
        { label: 'Edit Profile', icon: FaUserEdit, action: () => navigate('/edit-driver-profile') },
        { label: 'Student Attendance', icon: FaClipboardList, action: () => navigate('/driver-attendance') },
        { label: 'Leave Request', icon: FaCalendarAlt, action: () => navigate('/leave-request') },
        { label: 'Query', icon: FaQuestionCircle, action: () => navigate('/driver-query') },
        { label: 'Location Sharing', icon: FaBroadcastTower, action: () => navigate('/driver-app') }
      ]
    }
  ];

  if (loading) return <div className="driver-dashboard-feedback">Loading...</div>;
  if (error) return <div className="driver-dashboard-feedback">{error}</div>;

  return (
    <div className="driver-dashboard-layout">
      <header className="driver-dashboard-topbar">
        <div className="driver-dashboard-topbar-copy">
          <p className="driver-dashboard-kicker">National Engineering College</p>
          <h1>Driver Management Portal</h1>
          <p className="driver-dashboard-subtitle">
            
          </p>
        </div>

        <div className="driver-dashboard-topbar-meta">
          <div className="driver-dashboard-clock">
            <span className="driver-dashboard-clock-label">Campus Time</span>
            <strong>{formattedTime}</strong>
            <span>{formattedDate}</span>
          </div>

          <button
            className="logout-btn"
            onClick={() => {
              localStorage.removeItem('vehicleId');
              localStorage.removeItem('staffcode');
              localStorage.removeItem('isDriver');
              navigate('/login');
            }}
          >
            <FaSignOutAlt />
            <span>Logout</span>
          </button>
        </div>
      </header>

      <div className="driver-dashboard-main">
        <aside className="driver-dashboard-sidebar">
          <div className="driver-dashboard-summary">
            <p className="driver-dashboard-summary-label">Driver Overview</p>
            <h2>{driverData?.staffname || 'Assigned Driver'}</h2>
            <p></p>

            <div className="driver-dashboard-summary-list">
              <div className="driver-dashboard-summary-item">
                <span>
                  <FaIdCard />
                  Staff Code
                </span>
                <strong>{driverData?.staffcode || '-'}</strong>
              </div>
              <div className="driver-dashboard-summary-item">
                <span>
                  <FaBus />
                  Vehicle ID
                </span>
                <strong>{driverData?.vehicleid || vehicleId || '-'}</strong>
              </div>
            </div>
          </div>

          <nav className="driver-dashboard-nav">
            {navigationGroups.map((group) => (
              <section key={group.title} className="driver-nav-group">
                <p className="driver-nav-group-title">{group.title}</p>
                <div className="driver-nav-items">
                  {group.items.map(({ label, icon: Icon, action, active }) => (
                    <button
                      key={label}
                      type="button"
                      className={`driver-nav-item ${active ? 'active' : ''}`}
                      onClick={action}
                    >
                      <Icon />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </nav>
        </aside>

        <main className="driver-dashboard-content">
          <div className="driver-dashboard-content-topbar">
            <div>
              <p className="driver-dashboard-content-eyebrow">Driver Workspace</p>
              <h2>Dashboard</h2>
            </div>
            <div className="driver-dashboard-status">
              <span className="driver-dashboard-status-dot"></span>
              <span>System ready</span>
            </div>
          </div>

          <section className="driver-dashboard-panel">
            <div className="driver-dashboard-hero">
              <div className="driver-dashboard-hero-copy">
                <p className="driver-dashboard-eyebrow">Dashboard</p>
      
                <p>
              
                </p>
              </div>

              <div className="driver-dashboard-highlight">
                <span className="driver-dashboard-highlight-label">Available modules</span>
                <strong>{quickActions.length}</strong>
                <p>Core driver actions linked from this workspace</p>
              </div>
            </div>

            <div className="driver-dashboard-grid">
              {quickActions.map(({ key, title, description, icon: Icon, action }) => (
                <button
                  key={key}
                  type="button"
                  className="driver-dashboard-card"
                  onClick={action}
                >
                  <div className="driver-dashboard-card-head">
                    <span className="driver-dashboard-icon">
                      <Icon />
                    </span>
                    <span className="driver-dashboard-card-action">
                      Open
                      <FaArrowRight />
                    </span>
                  </div>

                  <div className="driver-dashboard-card-body">
                    <h3>{title}</h3>
                    <p>{description}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default DriverDashboard;
