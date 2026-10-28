import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { FaBroadcastTower, FaBus, FaMapMarkerAlt, FaSignal } from 'react-icons/fa';
import DriverPageHeader from '../components/DriverPageHeader';
import '../styles/DriverApp.css';

const DriverApp = () => {
  const [isSharing, setIsSharing] = useState(false);
  const [location, setLocation] = useState(null);
  const [busId, setBusId] = useState('');
  const [socket, setSocket] = useState(null);
  const [watchId, setWatchId] = useState(null);
  const [driverInfo, setDriverInfo] = useState(null);

  useEffect(() => {
    // Check if driver is logged in
    const storedDriver = localStorage.getItem('driverInfo');
    if (storedDriver) {
      setDriverInfo(JSON.parse(storedDriver));
      setBusId(JSON.parse(storedDriver).vehicleId);
    }

    // Initialize socket connection - use dynamic IP for mobile access
    const serverIP = window.location.hostname;
    const newSocket = io(`http://${serverIP}:5000`);
    setSocket(newSocket);

    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startLocationSharing = () => {
    // Check if running on HTTPS (required for mobile geolocation)
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      alert('Location sharing requires a secure connection (HTTPS).\n\nFor mobile devices:\n1. Access the app using https:// instead of http://\n2. Or use a local development server with HTTPS enabled\n\nIf you\'re on mobile, try accessing the app through your computer\'s IP address with https://');
      return;
    }

    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.');
      return;
    }

    // First, try to get current position to trigger permission prompt
    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Permission granted, now start watching
        const { latitude, longitude, speed } = position.coords;
        setLocation({ latitude, longitude, speed });

        // Send initial location
        if (socket && busId) {
          socket.emit('locationUpdate', {
            busId,
            latitude,
            longitude,
            speed: speed || 0
          });
        }

        // Now start watching for continuous updates
        const id = navigator.geolocation.watchPosition(
          (watchPosition) => {
            const { latitude, longitude, speed } = watchPosition.coords;
            setLocation({ latitude, longitude, speed });

            // Send location to server via Socket.IO
            if (socket && busId) {
              socket.emit('locationUpdate', {
                busId,
                latitude,
                longitude,
                speed: speed || 0
              });
            }
          },
          (error) => {
            console.error('Error watching location:', error);
            let errorMessage = 'Error getting location updates. ';
            switch(error.code) {
              case error.PERMISSION_DENIED:
                errorMessage += 'Location permission denied. Please enable location access in your browser settings and refresh the page.';
                break;
              case error.POSITION_UNAVAILABLE:
                errorMessage += 'Location information is unavailable.';
                break;
              case error.TIMEOUT:
                errorMessage += 'Location request timed out.';
                break;
              default:
                errorMessage += 'Please check your permissions and try again.';
                break;
            }
            alert(errorMessage);
            setIsSharing(false);
          },
          {
            enableHighAccuracy: true,
            timeout: 30000, // Increased timeout for mobile devices
            maximumAge: 60000 // Allow cached positions for 1 minute
          }
        );

        setWatchId(id);
        setIsSharing(true);
      },
      (error) => {
        console.error('Error getting initial location:', error);
        let errorMessage = 'Cannot access location. ';
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += 'Location permission denied. Please:\n\n';
            errorMessage += '1. Tap the address bar lock icon (🔒)\n';
            errorMessage += '2. Set Location to "Allow"\n';
            errorMessage += '3. Refresh the page\n\n';
            errorMessage += 'Or go to browser settings and enable location for this site.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += 'Location information is unavailable. Check GPS settings.';
            break;
          case error.TIMEOUT:
            errorMessage += 'Location request timed out. Try again.';
            break;
          default:
            errorMessage += 'Please enable location services and try again.';
            break;
        }
        alert(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 30000, // Increased timeout for mobile devices
        maximumAge: 30000 // Allow cached positions for 30 seconds
      }
    );
  };

  const stopLocationSharing = () => {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setIsSharing(false);
    setLocation(null);
  };

  return (
<div className="driver-app-container">
      <DriverPageHeader />
      <div className="driver-app-shell">
      <div className="driver-app-header">
        <p className="driver-app-eyebrow">Driver Workspace</p>
        <h2>Driver Location Sharing</h2>
        <p>Enable live location only during active trips so the institution can monitor bus movement accurately.</p>
      </div>

      {!driverInfo && (
        <div className="app-login-section">
          <div className="app-section-head">
            <FaBus />
            <span>Vehicle Access</span>
          </div>
          <p>Enter your Vehicle ID to start sharing location:</p>
          <input
            type="text"
            placeholder="Vehicle ID (e.g., V001)"
            value={busId}
            onChange={(e) => setBusId(e.target.value)}
            className="app-bus-input"
          />
        </div>
      )}

{driverInfo && (
        <div className="app-driver-info">
          <div className="app-section-head">
            <FaBroadcastTower />
            <span>Assigned Vehicle</span>
          </div>
          <p><strong>Staff Code:</strong> {driverInfo.staffcode}</p>
          <p><strong>Vehicle ID:</strong> {busId}</p>
        </div>
      )}

      <div className="app-location-controls">
        {!isSharing ? (
          <button 
            onClick={startLocationSharing} 
            className="start-btn"
            disabled={!busId.trim()}
          >
            Start Sharing Location
          </button>
        ) : (
          <button onClick={stopLocationSharing} className="stop-btn">
            Stop Sharing Location
          </button>
        )}
      </div>

      {location && (
        <div className="location-display">
          <div className="app-section-head">
            <FaMapMarkerAlt />
            <span>Current Location</span>
          </div>
          <h3>Current Location</h3>
          <p><strong>Latitude:</strong> {location.latitude.toFixed(6)}</p>
          <p><strong>Longitude:</strong> {location.longitude.toFixed(6)}</p>
          <p><strong>Speed:</strong> {location.speed ? `${location.speed.toFixed(2)} m/s` : 'N/A'}</p>
        </div>
      )}

      <div className="status">
        <div className="app-section-head">
          <FaSignal />
          <span>Sharing Status</span>
        </div>
        <p><strong>Status:</strong> {isSharing ? 'Sharing Location' : 'Not Sharing'}</p>
        {!busId.trim() && <p style={{color: 'red'}}>Please enter Vehicle ID</p>}
      </div>
      </div>
    </div>
  );
};

export default DriverApp;
