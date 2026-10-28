import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import io from 'socket.io-client';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  Bus,
  Search,
  Layers,
  Crosshair,
  Compass,
  Gauge,
  Clock,
  MapPin,
  User,
  LayoutDashboard,
  RotateCcw,
  Navigation
} from 'lucide-react';
import { API_URL, SOCKET_URL } from '../config';
import '../styles/BusLocation.css';

// Dynamic Map Controller for smooth flyTo zoom
const MapController = ({ targetCoords, zoomLevel }) => {
  const map = useMap();

  useEffect(() => {
    if (targetCoords && targetCoords[0] && targetCoords[1]) {
      map.flyTo(targetCoords, zoomLevel || 16.5, {
        duration: 1.2,
        easeLinearity: 0.25
      });
    }
  }, [targetCoords, zoomLevel, map]);

  return null;
};

// Map Resize Handler to prevent grey tiles on viewport resize
const MapResizeHandler = () => {
  const map = useMap();

  useEffect(() => {
    const handleResize = () => {
      map.invalidateSize();
    };
    window.addEventListener('resize', handleResize);
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, [map]);

  return null;
};

// Custom Google-Maps style Bus Marker
const createGoogleBusIcon = (busNo, speed, isSelected) => {
  const isOverSpeed = Number(speed) > 55;
  const isMoving = Number(speed) > 0;
  const badgeColor = isSelected
    ? '#2563eb'
    : isOverSpeed
    ? '#dc2626'
    : isMoving
    ? '#16a34a'
    : '#64748b';
  const scale = isSelected ? 'scale(1.06)' : 'scale(1)';

  return L.divIcon({
    html: `
      <div style="
        background: #ffffff;
        border: 2px solid ${badgeColor};
        border-radius: 16px;
        padding: 2px 7px;
        box-shadow: ${isSelected ? '0 0 10px rgba(37,99,235,0.45)' : '0 2px 5px rgba(0,0,0,0.12)'};
        display: flex;
        align-items: center;
        gap: 4px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        cursor: pointer;
        transform: ${scale};
        transition: transform 0.12s ease;
        white-space: nowrap;
      ">
        <div style="
          background: ${badgeColor};
          color: #ffffff;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
        ">
          🚌
        </div>
        <div style="display: flex; flex-direction: column; line-height: 1.1;">
          <span style="font-weight: 800; font-size: 10.5px; color: #0f2744;">Bus #${busNo}</span>
          <span style="font-size: 9px; font-weight: 700; color: ${badgeColor};">
            ${isMoving ? `${speed} km/h` : 'Stopped'}
          </span>
        </div>
      </div>
    `,
    className: 'google-maps-bus-pin',
    iconSize: [95, 32],
    iconAnchor: [47, 16]
  });
};

// Calculate intelligent popup offset to prevent obscuring nearby markers
const getIntelligentPopupOffset = (bus, allBuses) => {
  const lat = Number(bus.latitude);
  const lng = Number(bus.longitude);

  // Check for other buses within ~0.003 degrees (~300m)
  const nearby = allBuses.filter(
    (b) =>
      String(b.vehicleid) !== String(bus.vehicleid) &&
      Math.abs(Number(b.latitude) - lat) < 0.003 &&
      Math.abs(Number(b.longitude) - lng) < 0.003
  );

  if (nearby.length > 0) {
    const isNearbyNorth = nearby.some((b) => Number(b.latitude) > lat);
    const isNearbyEast = nearby.some((b) => Number(b.longitude) > lng);

    if (isNearbyNorth) {
      // If a nearby bus is to the north, offset popup slightly to the south/side
      return L.point(isNearbyEast ? -30 : 30, 22);
    }
  }

  // Default: neatly positioned directly above the marker
  return L.point(0, -22);
};

const BusLocation = () => {
  const navigate = useNavigate();

  // State
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mapTileType, setMapTileType] = useState('street'); // 'street' or 'satellite'
  const [targetCoords, setTargetCoords] = useState(null);
  const [mapZoom, setMapZoom] = useState(7.5);
  const [selectedBus, setSelectedBus] = useState(null);
  const [lastUpdated, setLastUpdated] = useState('Just now');
  const markerRefs = useRef({});

  // Preset Coordinates
  const tnCenterCoords = [10.5, 78.5]; // Tamil Nadu State Center
  const southTnCoords = [9.176945, 77.855238]; // Kovilpatti Campus Hub

  const tileUrls = {
    street: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    satellite:
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
  };

  // Fetch Locations joined with Vehicles and Routes
  const fetchLocations = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    else setLoading(true);

    try {
      const [locRes, vehRes, routeRes] = await Promise.all([
        axios.get(`${API_URL}/api/getLocations`),
        axios.get(`${API_URL}/getVehicle`),
        axios.get(`${API_URL}/getRoute`)
      ]);

      const locs = Array.isArray(locRes.data) ? locRes.data : [];
      const vehicles = Array.isArray(vehRes.data.value)
        ? vehRes.data.value
        : Array.isArray(vehRes.data)
        ? vehRes.data
        : [];
      const routes = Array.isArray(routeRes.data.value)
        ? routeRes.data.value
        : Array.isArray(routeRes.data)
        ? routeRes.data
        : [];

      const routeMap = new Map(routes.map((r) => [String(r.routeid), r]));
      const latestLocByVeh = new Map();

      locs.forEach((l) => {
        const vid = String(l.vehicleid);
        if (
          !latestLocByVeh.has(vid) ||
          new Date(l.timestamp) > new Date(latestLocByVeh.get(vid).timestamp)
        ) {
          latestLocByVeh.set(vid, l);
        }
      });

      const merged = vehicles.map((v) => {
        const vid = String(v.vehicleid);
        const loc = latestLocByVeh.get(vid) || {};
        const route = routeMap.get(String(v.routeid)) || {};

        return {
          vehicleid: v.vehicleid,
          registrationno: v.registrationno,
          vehicletype: v.vehicletype || 'Standard',
          drivername: loc.drivername || 'Driver Not Assigned',
          routeid: v.routeid || 'Unassigned',
          routename: route.routename || 'Campus Route',
          city: route.city || 'Kovilpatti',
          latitude: Number(loc.latitude) || 9.176945,
          longitude: Number(loc.longitude) || 77.855238,
          speed:
            loc.speed !== null && loc.speed !== undefined
              ? Number(loc.speed)
              : 0,
          timestamp: loc.timestamp || new Date().toISOString()
        };
      });

      setLocations(merged);
      setLastUpdated(
        new Date().toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      );

      // Select first bus if none selected
      setSelectedBus((prev) => {
        if (!prev && merged.length > 0) return merged[0];
        if (prev) {
          const updated = merged.find((m) => String(m.vehicleid) === String(prev.vehicleid));
          return updated || prev;
        }
        return null;
      });
    } catch (error) {
      console.error('Error fetching bus locations:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLocations();

    const newSocket = io(SOCKET_URL);

    newSocket.on('locationUpdate', (data) => {
      setLocations((prevLocations) => {
        const existingIndex = prevLocations.findIndex(
          (loc) => String(loc.vehicleid) === String(data.busId)
        );
        if (existingIndex !== -1) {
          const updated = [...prevLocations];
          updated[existingIndex] = {
            ...updated[existingIndex],
            latitude: Number(data.latitude),
            longitude: Number(data.longitude),
            speed: Number(data.speed) || 0,
            timestamp: data.timestamp || new Date().toISOString()
          };
          return updated;
        }
        return prevLocations;
      });
      setLastUpdated(
        new Date().toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      );
    });

    // Continuous live route movement simulation for moving buses
    const liveAnimInterval = setInterval(() => {
      setLocations((prev) =>
        prev.map((loc) => {
          if (loc.speed && Number(loc.speed) > 0) {
            const deltaLat = (Math.random() - 0.48) * 0.0004;
            const deltaLng = (Math.random() - 0.48) * 0.0004;
            const newLat = Number((Number(loc.latitude) + deltaLat).toFixed(6));
            const newLng = Number((Number(loc.longitude) + deltaLng).toFixed(6));

            const updated = {
              ...loc,
              latitude: newLat,
              longitude: newLng,
              timestamp: new Date().toISOString()
            };

            setSelectedBus((curr) => {
              if (curr && String(curr.vehicleid) === String(loc.vehicleid)) {
                return updated;
              }
              return curr;
            });

            return updated;
          }
          return loc;
        })
      );
    }, 2500);

    return () => {
      clearInterval(liveAnimInterval);
      newSocket.disconnect();
    };
  }, [fetchLocations]);

  // Search input handler with auto-zoom on match
  const handleSearchChange = (query) => {
    setSearchQuery(query);
    const clean = query.trim().toLowerCase();
    if (!clean) return;

    const match = locations.find((b) => {
      const vid = String(b.vehicleid).toLowerCase();
      const reg = String(b.registrationno || '').toLowerCase();
      const driver = String(b.drivername || '').toLowerCase();
      const city = String(b.city || '').toLowerCase();
      const route = String(b.routename || '').toLowerCase();
      return (
        vid === clean ||
        vid === `bus ${clean}` ||
        vid === `bus #${clean}` ||
        reg.includes(clean) ||
        driver.includes(clean) ||
        city.includes(clean) ||
        route.includes(clean)
      );
    });

    if (match) {
      setSelectedBus(match);
      setTargetCoords([Number(match.latitude), Number(match.longitude)]);
      setMapZoom(16.5);
      if (markerRefs.current[match.vehicleid]) {
        markerRefs.current[match.vehicleid].openPopup();
      }
    }
  };

  // Bus selection from list or marker
  const handleSelectBus = (bus) => {
    setSelectedBus(bus);
    setTargetCoords([Number(bus.latitude), Number(bus.longitude)]);
    setMapZoom(16.5);

    if (markerRefs.current[bus.vehicleid]) {
      markerRefs.current[bus.vehicleid].openPopup();
    }
  };

  // Preset View Handler
  const handlePresetView = (coords, zoom) => {
    setTargetCoords(coords);
    setMapZoom(zoom);
  };

  // Filtered Bus List
  const filteredBuses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return locations;

    return locations.filter((b) => {
      return (
        String(b.vehicleid).toLowerCase().includes(q) ||
        String(b.registrationno || '').toLowerCase().includes(q) ||
        String(b.drivername || '').toLowerCase().includes(q) ||
        String(b.city || '').toLowerCase().includes(q) ||
        String(b.routename || '').toLowerCase().includes(q)
      );
    });
  }, [locations, searchQuery]);

  // Metrics
  const totalFleetCount = locations.length;
  const activeMovingCount = locations.filter((b) => Number(b.speed) > 0).length;
  const stoppedCount = totalFleetCount - activeMovingCount;
  const filteredMovingCount = filteredBuses.filter((b) => Number(b.speed) > 0).length;

  return (
    <div className="bus-location-page">
      {/* 1. Breadcrumbs Navigation */}
      <nav className="vm-breadcrumb-nav compact-nav" aria-label="Breadcrumb">
        <span className="link" onClick={() => navigate('/home')}>
          Dashboard
        </span>
        <span className="sep">/</span>
        <span className="link" onClick={() => navigate('/home')}>
          Live Tracking
        </span>
        <span className="sep">/</span>
        <span className="current">Live Bus Location</span>
      </nav>

      {/* 2. Compact Page Header */}
      <header className="vm-page-header compact-header">
        <div className="vm-header-left">
          <div className="vm-title-row">
            <div className="vm-title-icon-badge compact" title="Live Bus Location">
              <Navigation size={15} />
            </div>
            <h1 className="vm-page-title compact">Live Bus Location</h1>
            <span className="vm-total-count-badge compact">
              {totalFleetCount} {totalFleetCount === 1 ? 'Bus Monitored' : 'Buses Monitored'}
            </span>
          </div>
          <p className="vm-page-subtitle compact">
            Monitor live fleet positions, movement, and route progress.
          </p>
        </div>

        <div className="vm-header-actions compact">
          <button
            type="button"
            className="vm-btn-secondary compact-btn vm-btn-preset"
            onClick={() => handlePresetView(tnCenterCoords, 7.5)}
            title="Fit view to entire Tamil Nadu Highway Network"
          >
            <Compass size={13} />
            <span>TN Overview</span>
          </button>

          <button
            type="button"
            className="vm-btn-secondary compact-btn vm-btn-preset"
            onClick={() => handlePresetView(southTnCoords, 13.5)}
            title="Focus map on Campus Hub (Kovilpatti)"
          >
            <Crosshair size={13} />
            <span>Campus Hub</span>
          </button>

          <button
            type="button"
            className="vm-btn-secondary compact-btn"
            onClick={() => fetchLocations(true)}
            disabled={isRefreshing}
            title="Refresh GPS telemetry"
          >
            <RotateCcw size={13} className={isRefreshing ? 'spin-icon' : ''} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <button
            type="button"
            className="vm-btn-secondary compact-btn"
            onClick={() => navigate('/home')}
            title="Return to operations dashboard"
          >
            <LayoutDashboard size={13} />
            <span>Back to Dashboard</span>
          </button>
        </div>
      </header>

      {/* 3. Compact Fleet Summary Strip */}
      <section className="live-fleet-summary-strip" aria-label="Fleet Summary">
        <div className="summary-strip-left">
          <div className="summary-strip-item">
            <span className="summary-strip-badge badge-blue">
              <Bus size={11} />
              Live Fleet:
            </span>
            <strong>{totalFleetCount} Vehicles</strong>
          </div>

          <div className="summary-strip-item">
            <span className="summary-strip-badge badge-green">
              <span className="pulse-dot-green" />
              Moving:
            </span>
            <strong>{activeMovingCount} Vehicles</strong>
          </div>

          <div className="summary-strip-item">
            <span className="summary-strip-badge badge-slate">
              <span className="stop-dot-slate" />
              Stopped:
            </span>
            <strong>{stoppedCount} Vehicles</strong>
          </div>
        </div>

        <div className="summary-strip-right">
          <Clock size={11} />
          <span>Last Updated: <strong>{lastUpdated}</strong></span>
        </div>
      </section>

      {/* 4. Compact Featured Bus Information Card */}
      {selectedBus && (
        <section className="featured-bus-card" aria-label="Featured Vehicle Telematics">
          <div className="featured-bus-top-row">
            <div className="featured-bus-main-info">
              <span className="featured-bus-badge">
                Bus #{selectedBus.vehicleid}
              </span>
              <span className="featured-bus-reg">{selectedBus.registrationno}</span>
              <span className="featured-bus-sep">•</span>
              <span className="featured-bus-route">
                {selectedBus.routeid !== 'Unassigned' ? `${selectedBus.routeid} — ` : ''}
                {selectedBus.routename}
              </span>
              <span className="featured-bus-sep">•</span>
              <span className="featured-bus-driver">
                Driver: <strong>{selectedBus.drivername}</strong>
              </span>
            </div>

            <div className="featured-bus-telemetry">
              <span
                className={`telemetry-speed-badge ${
                  Number(selectedBus.speed) > 0 ? 'moving' : 'stopped'
                }`}
              >
                <Gauge size={12} />
                {Number(selectedBus.speed) > 0
                  ? `${selectedBus.speed} km/h (Moving)`
                  : 'Stopped at Stage'}
              </span>
              <span className="featured-bus-region">
                📍 {selectedBus.city}
              </span>
            </div>
          </div>

          {/* Ultra-Compact Route Progress Indicator */}
          <div className="featured-bus-progress-wrap">
            <div className="progress-stops-labels">
              <span className="progress-stop-item">
                Origin: <strong>{selectedBus.routename} Depot</strong>
              </span>
              <span className="progress-stop-item current">
                Current: <strong>
                  {Number(selectedBus.speed) > 0
                    ? `En Route via ${selectedBus.city}`
                    : `Stationary at ${selectedBus.city}`}
                </strong>
              </span>
              <span className="progress-stop-item">
                Next: <strong>
                  {Number(selectedBus.speed) > 0
                    ? 'Approaching Stop'
                    : 'Awaiting Departure'}
                </strong>
              </span>
              <span className="progress-stop-item">
                Dest: <strong>Campus Terminal</strong>
              </span>
            </div>

            <div className="progress-bar-track">
              <div
                className="progress-bar-fill"
                style={{
                  width: `${Number(selectedBus.speed) > 0 ? 68 : 10}%`
                }}
              />
            </div>
          </div>
        </section>
      )}

      {/* 5. Main Two-Column Dashboard (Left Bus List: 260px + Right Leaflet Map) */}
      <main className="live-tracking-main-layout">
        {/* Left Bus List Panel (260px wide) */}
        <aside className="fleet-sidebar-panel" aria-label="Monitored Fleet List">
          <div className="sidebar-search-header">
            <div className="sidebar-search-box">
              <Search size={13} style={{ color: '#64748b', flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Search bus, driver, city..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                aria-label="Search buses"
              />
            </div>

            <div className="sidebar-search-status-row">
              <span>Found {filteredBuses.length} Vehicles</span>
              <span className="sidebar-moving-count">
                🟢 {filteredMovingCount} Moving
              </span>
            </div>
          </div>

          {/* Internally Scrollable Vehicle Cards */}
          <div className="fleet-scrollable-list">
            {loading ? (
              <div style={{ textAlign: 'center', padding: '20px 8px', color: '#64748b', fontSize: '0.78rem' }}>
                Loading live vehicles...
              </div>
            ) : filteredBuses.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 8px', color: '#64748b', fontSize: '0.78rem' }}>
                No vehicles matching "{searchQuery}"
              </div>
            ) : (
              filteredBuses.map((bus) => {
                const isSelected = selectedBus?.vehicleid === bus.vehicleid;
                const isMoving = Number(bus.speed) > 0;

                return (
                  <div
                    key={bus.vehicleid}
                    className={`fleet-bus-card-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelectBus(bus)}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                  >
                    <div className="bus-card-row-top">
                      <span className="bus-card-num-badge">
                        <Bus size={10} />
                        Bus #{bus.vehicleid}
                      </span>
                      <span
                        className={`bus-card-speed-badge ${
                          isMoving ? 'moving' : 'stopped'
                        }`}
                      >
                        <Gauge size={10} />
                        {isMoving ? `${bus.speed} km/h` : 'Stopped'}
                      </span>
                    </div>

                    <p className="bus-card-reg-title">{bus.registrationno}</p>

                    <p className="bus-card-meta-line">
                      <User size={10} />
                      <span>Driver: <strong>{bus.drivername}</strong></span>
                    </p>

                    <p className="bus-card-route-tag">
                      <MapPin size={9} style={{ display: 'inline', marginRight: '2px' }} />
                      {bus.routename} • {bus.city}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Map Panel */}
        <section className="map-panel-container" aria-label="Live Fleet Map">
          {/* Top-Right Street / Satellite Map Switcher */}
          <div className="map-layer-switcher">
            <button
              type="button"
              className={`layer-switch-btn ${mapTileType === 'street' ? 'active' : ''}`}
              onClick={() => setMapTileType('street')}
              title="Standard street map view"
            >
              <Layers size={11} />
              <span>Standard Street</span>
            </button>

            <button
              type="button"
              className={`layer-switch-btn ${mapTileType === 'satellite' ? 'active' : ''}`}
              onClick={() => setMapTileType('satellite')}
              title="Satellite hybrid imagery view"
            >
              <Layers size={11} />
              <span>Satellite Hybrid</span>
            </button>
          </div>

          {loading ? (
            <div className="map-loading-overlay">
              Loading Tamil Nadu live telemetry map stream...
            </div>
          ) : (
            <MapContainer
              center={tnCenterCoords}
              zoom={7.5}
              style={{ height: '100%', width: '100%' }}
              zoomControl={true}
            >
              <TileLayer
                url={tileUrls[mapTileType]}
                attribution="&copy; OpenStreetMap & Esri World Imagery"
              />

              <MapController targetCoords={targetCoords} zoomLevel={mapZoom} />
              <MapResizeHandler />

              {locations.map((bus) => {
                const isSelected = selectedBus?.vehicleid === bus.vehicleid;
                return (
                  <Marker
                    key={bus.vehicleid}
                    position={[Number(bus.latitude), Number(bus.longitude)]}
                    icon={createGoogleBusIcon(
                      bus.vehicleid,
                      bus.speed,
                      isSelected
                    )}
                    zIndexOffset={isSelected ? 1000 : 1}
                    ref={(el) => (markerRefs.current[bus.vehicleid] = el)}
                    eventHandlers={{
                      click: () => handleSelectBus(bus)
                    }}
                  >
                    <Popup
                      offset={getIntelligentPopupOffset(bus, locations)}
                      autoPan={true}
                      autoPanPaddingTopLeft={L.point(25, 25)}
                      autoPanPaddingBottomRight={L.point(25, 25)}
                      closeButton={true}
                      className="compact-leaflet-popup"
                      keepInView={true}
                    >
                      <div className="popup-card-content">
                        <div className="popup-top-badge-row">
                          <span className="popup-bus-id">
                            <Bus size={12} /> Bus #{bus.vehicleid}
                          </span>
                          <span
                            className={`popup-speed-tag ${
                              Number(bus.speed) > 0 ? 'moving' : 'stopped'
                            }`}
                          >
                            {Number(bus.speed) > 0 ? `${bus.speed} km/h` : 'Stopped'}
                          </span>
                        </div>

                        <div className="popup-grid">
                          <div className="popup-grid-row">
                            <span className="popup-k">Reg:</span>
                            <span className="popup-v reg">{bus.registrationno || '—'}</span>
                          </div>
                          <div className="popup-grid-row">
                            <span className="popup-k">Driver:</span>
                            <span className="popup-v">{bus.drivername || 'Unassigned'}</span>
                          </div>
                          <div className="popup-grid-row">
                            <span className="popup-k">Route:</span>
                            <span className="popup-v">{bus.routename} ({bus.city})</span>
                          </div>
                          <div className="popup-grid-row">
                            <span className="popup-k">GPS:</span>
                            <span className="popup-v gps">
                              {Number(bus.latitude).toFixed(5)}, {Number(bus.longitude).toFixed(5)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          )}
        </section>
      </main>
    </div>
  );
};

export default BusLocation;
