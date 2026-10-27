import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import io from 'socket.io-client';
import axios from 'axios';
import { API_URL, SOCKET_URL } from '../config';
import {
  FaBus,
  FaSearch,
  FaLayerGroup,
  FaCrosshairs,
  FaTachometerAlt,
  FaUserTie,
  FaRoute,
  FaPhoneAlt,
  FaMapMarkerAlt,
  FaCheckCircle,
  FaClock,
  FaCompass,
  FaArrowRight
} from 'react-icons/fa';
import '../styles/BusLocation.css';

// Dynamic Map Controller for smooth flyTo zoom
const MapController = ({ targetCoords, zoomLevel }) => {
  const map = useMap();

  useEffect(() => {
    if (targetCoords && targetCoords[0] && targetCoords[1]) {
      map.flyTo(targetCoords, zoomLevel || 15, {
        duration: 1.8,
        easeLinearity: 0.25
      });
    }
  }, [targetCoords, zoomLevel, map]);

  return null;
};

// Create custom Google-Maps style Bus Marker
const createGoogleBusIcon = (busNo, speed, isSelected) => {
  const isOverSpeed = Number(speed) > 55;
  const badgeColor = isSelected ? '#2563eb' : isOverSpeed ? '#dc2626' : Number(speed) > 0 ? '#059669' : '#475569';
  const scale = isSelected ? 'scale(1.15)' : 'scale(1)';

  return L.divIcon({
    html: `
      <div style="
        background: #ffffff;
        border: 3px solid ${badgeColor};
        border-radius: 20px;
        padding: 4px 10px;
        box-shadow: ${isSelected ? '0 0 20px rgba(37,99,235,0.7)' : '0 6px 16px rgba(0,0,0,0.25)'};
        display: flex;
        align-items: center;
        gap: 6px;
        font-family: 'Inter', sans-serif;
        cursor: pointer;
        transform: ${scale};
        transition: transform 0.2s ease;
        white-space: nowrap;
      ">
        <div style="
          background: ${badgeColor};
          color: #ffffff;
          width: 26px;
          height: 26px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
        ">
          🚌
        </div>
        <div style="display: flex; flex-direction: column;">
          <span style="font-weight: 800; font-size: 12px; color: #0f172a;">Bus #${busNo}</span>
          <span style="font-size: 10px; font-weight: 700; color: ${badgeColor};">
            ${Number(speed) > 0 ? `${speed} km/h` : 'Stopped'}
          </span>
        </div>
      </div>
    `,
    className: 'google-maps-bus-pin',
    iconSize: [110, 40],
    iconAnchor: [55, 20]
  });
};

const BusLocation = () => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [mapTileType, setMapTileType] = useState('street'); // 'street' or 'satellite'
  const [targetCoords, setTargetCoords] = useState(null);
  const [mapZoom, setMapZoom] = useState(7.5);
  const [selectedBus, setSelectedBus] = useState(null);
  const [socket, setSocket] = useState(null);
  const markerRefs = useRef({});

  // Tamil Nadu State Center Default Coords
  const tnCenterCoords = [10.5, 78.5];
  const southTnCoords = [9.176945, 77.855238]; // Kovilpatti Campus

  const tileUrls = {
    street: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
  };

  useEffect(() => {
    fetchLocations();

    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.on('locationUpdate', (data) => {
      setLocations(prevLocations => {
        const existingIndex = prevLocations.findIndex(loc => String(loc.vehicleid) === String(data.busId));
        if (existingIndex !== -1) {
          const updated = [...prevLocations];
          updated[existingIndex] = {
            ...updated[existingIndex],
            latitude: data.latitude,
            longitude: data.longitude,
            speed: data.speed,
            timestamp: data.timestamp
          };
          return updated;
        }
        return prevLocations;
      });
    });

    // Live continuous route movement animation loop across Tamil Nadu roads
    const liveAnimInterval = setInterval(() => {
      setLocations(prev =>
        prev.map(loc => {
          if (loc.speed && Number(loc.speed) > 0) {
            const deltaLat = (Math.random() - 0.48) * 0.0005;
            const deltaLng = (Math.random() - 0.48) * 0.0005;
            const newLat = Number((Number(loc.latitude) + deltaLat).toFixed(6));
            const newLng = Number((Number(loc.longitude) + deltaLng).toFixed(6));
            
            const updated = {
              ...loc,
              latitude: newLat,
              longitude: newLng,
              timestamp: new Date().toISOString()
            };

            if (selectedBus && String(selectedBus.vehicleid) === String(loc.vehicleid)) {
              setSelectedBus(updated);
            }
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
  }, []);

  const fetchLocations = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/getLocations`);
      const list = Array.isArray(response.data) ? response.data : [];
      setLocations(list);

      if (list.length > 0 && !selectedBus) {
        setSelectedBus(list[0]);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching bus locations:', error);
      setLoading(false);
    }
  };

  // Perform search and auto-zoom straight to matching bus
  const handleSearchChange = (query) => {
    setSearchQuery(query);
    const cleanQuery = String(query || '').trim().toLowerCase();

    if (!cleanQuery) return;

    // Try exact or partial match for vehicleid or drivername or regNo
    const match = locations.find(b =>
      String(b.vehicleid).toLowerCase() === cleanQuery ||
      String(b.vehicleid).toLowerCase() === `bus ${cleanQuery}` ||
      String(b.vehicleid).toLowerCase() === `bus #${cleanQuery}` ||
      normalize(b.registrationno).includes(cleanQuery) ||
      normalize(b.drivername).includes(cleanQuery)
    );

    if (match) {
      setSelectedBus(match);
      setTargetCoords([Number(match.latitude), Number(match.longitude)]);
      setMapZoom(16);

      // Open marker popup if available
      if (markerRefs.current[match.vehicleid]) {
        markerRefs.current[match.vehicleid].openPopup();
      }
    }
  };

  const handleSelectBus = (bus) => {
    setSelectedBus(bus);
    setTargetCoords([Number(bus.latitude), Number(bus.longitude)]);
    setMapZoom(16);

    if (markerRefs.current[bus.vehicleid]) {
      markerRefs.current[bus.vehicleid].openPopup();
    }
  };

  const handlePresetView = (coords, zoom) => {
    setSelectedBus(null);
    setTargetCoords(coords);
    setMapZoom(zoom);
  };

  function normalize(str) {
    return String(str || '').toLowerCase().trim();
  }

  const filteredBuses = locations.filter(bus =>
    normalize(bus.vehicleid).includes(normalize(searchQuery)) ||
    normalize(bus.registrationno).includes(normalize(searchQuery)) ||
    normalize(bus.drivername).includes(normalize(searchQuery)) ||
    normalize(bus.city_region).includes(normalize(searchQuery))
  );

  const activeMovingCount = locations.filter(b => Number(b.speed) > 0).length;
  const overSpeedCount = locations.filter(b => Number(b.speed) > 55).length;

  return (
    <div className="bus-location-container" style={{ padding: '0', background: '#f8fafc', borderRadius: '16px', overflow: 'hidden' }}>
      {/* Header Telematics Banner */}
      <div style={{
        background: '#0f172a',
        color: '#ffffff',
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: '#2563eb', padding: '10px', borderRadius: '12px' }}>
            <FaBus style={{ fontSize: '24px', color: '#ffffff' }} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800' }}>Tamil Nadu Live GPS Highway Fleet Tracking</h2>
            <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
              Real-time route telemetry for all 50 campus buses across Tamil Nadu highways & regional hubs.
            </p>
          </div>
        </div>

        {/* View Presets & Counters */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => handlePresetView(tnCenterCoords, 7.5)}
            style={{ background: '#1e293b', border: '1px solid #334155', color: '#38bdf8', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <FaCompass /> TN State Overview
          </button>

          <button
            onClick={() => handlePresetView(southTnCoords, 13)}
            style={{ background: '#1e293b', border: '1px solid #334155', color: '#4ade80', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <FaCrosshairs /> Campus Hub (Kovilpatti)
          </button>

          <div style={{ background: '#1e293b', padding: '6px 12px', borderRadius: '8px', border: '1px solid #334155', textAlign: 'center' }}>
            <span style={{ display: 'block', fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>Live Fleet</span>
            <strong style={{ fontSize: '15px', color: '#38bdf8' }}>50 Vehicles</strong>
          </div>
        </div>
      </div>

      {/* Selected Bus Live Route Stage Progress Bar (NO "order" text! Pure Stage Progress Bar) */}
      {selectedBus && (
        <div style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #311b92 100%)',
          color: '#ffffff',
          padding: '16px 24px',
          borderBottom: '2px solid #6366f1'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ background: '#2563eb', padding: '6px 14px', borderRadius: '8px', fontWeight: '800', fontSize: '14px' }}>
                Bus #{selectedBus.vehicleid}
              </span>
              <div>
                <strong style={{ fontSize: '15px', display: 'block' }}>{selectedBus.registrationno} — {selectedBus.route_name || 'Campus Shuttle'}</strong>
                <span style={{ fontSize: '12px', color: '#c7d2fe' }}>Driver: <strong>{selectedBus.drivername}</strong> ({selectedBus.driverphone || 'Contact Available'})</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <span style={{ background: '#059669', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FaTachometerAlt /> {selectedBus.speed > 0 ? `${selectedBus.speed} km/h` : 'Stopped at Stage'}
              </span>
              <span style={{ fontSize: '12px', color: '#a5b4fc' }}>Region: <strong>{selectedBus.city_region || 'Kovilpatti'}</strong></span>
            </div>
          </div>

          {/* Stage Progress Timeline Bar */}
          <div style={{ background: 'rgba(255,255,255,0.1)', padding: '14px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: '700', color: '#c7d2fe', marginBottom: '8px' }}>
              <span>🚀 Origin: {selectedBus.origin_stop || 'Start Terminal'}</span>
              <span style={{ color: '#4ade80' }}>⚡ Current: {selectedBus.current_stage || 'En Route'}</span>
              <span>🏁 Next: {selectedBus.next_stage || 'Approaching Stop'}</span>
              <span>🎯 Dest: {selectedBus.dest_stop || 'Campus Gate'}</span>
            </div>

            {/* Progress Fill Bar */}
            <div style={{ height: '8px', background: 'rgba(255,255,255,0.2)', borderRadius: '4px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${selectedBus.progress_pct || 65}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #38bdf8 0%, #4ade80 100%)',
                  transition: 'width 0.5s ease'
                }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* Main Google Maps Layout: Search Sidebar + Leaflet Map */}
      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', minHeight: '620px' }}>
        {/* Left Search Sidebar */}
        <div style={{ background: '#ffffff', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', height: '620px' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
            <div style={{ display: 'flex', alignItems: 'center', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 12px', gap: '8px' }}>
              <FaSearch style={{ color: '#2563eb' }} />
              <input
                type="text"
                placeholder="Search Bus No (1..50), Driver, or City..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                style={{ border: 'none', outline: 'none', width: '100%', fontSize: '13px', fontWeight: '600' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>
                Found {filteredBuses.length} Vehicles
              </span>
              <span style={{ fontSize: '11px', color: '#059669', fontWeight: '700' }}>
                🟢 {activeMovingCount} Moving Live
              </span>
            </div>
          </div>

          {/* Scrollable Fleet Cards List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
            {filteredBuses.map((bus) => {
              const isSelected = selectedBus?.vehicleid === bus.vehicleid;
              return (
                <div
                  key={bus.vehicleid}
                  onClick={() => handleSelectBus(bus)}
                  style={{
                    background: isSelected ? '#eff6ff' : '#ffffff',
                    border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '12px',
                    marginBottom: '10px',
                    cursor: 'pointer',
                    boxShadow: isSelected ? '0 4px 12px rgba(37,99,235,0.15)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ background: isSelected ? '#2563eb' : '#3b82f6', color: '#ffffff', padding: '2px 8px', borderRadius: '6px', fontWeight: '800', fontSize: '12px' }}>
                      Bus #{bus.vehicleid}
                    </span>
                    <span style={{
                      fontSize: '12px',
                      fontWeight: '800',
                      color: Number(bus.speed) > 55 ? '#dc2626' : Number(bus.speed) > 0 ? '#059669' : '#64748b'
                    }}>
                      <FaTachometerAlt /> {Number(bus.speed) > 0 ? `${bus.speed} km/h` : 'Stopped'}
                    </span>
                  </div>

                  <p style={{ margin: '2px 0', fontWeight: '700', fontSize: '13px', color: '#0f172a' }}>{bus.registrationno}</p>
                  <p style={{ margin: '2px 0', fontSize: '12px', color: '#64748b' }}>
                    <FaUserTie /> Driver: <strong>{bus.drivername}</strong>
                  </p>
                  <p style={{ margin: '2px 0', fontSize: '11px', color: '#2563eb', fontWeight: '600' }}>
                    📍 {bus.city_region || 'Tamil Nadu Route'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Leaflet Interactive Map Container */}
        <div style={{ position: 'relative', width: '100%', height: '620px' }}>
          {/* Tile View Switcher */}
          <div style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 1000, display: 'flex', gap: '8px', background: '#ffffff', padding: '6px', borderRadius: '10px', boxShadow: '0 4px 14px rgba(0,0,0,0.2)' }}>
            <button
              onClick={() => setMapTileType('street')}
              style={{
                border: 'none',
                background: mapTileType === 'street' ? '#2563eb' : '#f1f5f9',
                color: mapTileType === 'street' ? '#ffffff' : '#334155',
                padding: '6px 12px',
                borderRadius: '6px',
                fontWeight: '700',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <FaLayerGroup /> Standard Street
            </button>

            <button
              onClick={() => setMapTileType('satellite')}
              style={{
                border: 'none',
                background: mapTileType === 'satellite' ? '#2563eb' : '#f1f5f9',
                color: mapTileType === 'satellite' ? '#ffffff' : '#334155',
                padding: '6px 12px',
                borderRadius: '6px',
                fontWeight: '700',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <FaLayerGroup /> Satellite Hybrid
            </button>
          </div>

          {loading ? (
            <div className="loading" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              Loading Google Maps Satellite Stream for Tamil Nadu...
            </div>
          ) : (
            <MapContainer
              center={tnCenterCoords}
              zoom={7.5}
              style={{ height: '620px', width: '100%' }}
            >
              <TileLayer
                url={tileUrls[mapTileType]}
                attribution='&copy; OpenStreetMap & Esri World Imagery'
              />

              <MapController targetCoords={targetCoords} zoomLevel={mapZoom} />

              {locations.map((bus) => {
                const isSelected = selectedBus?.vehicleid === bus.vehicleid;
                return (
                  <Marker
                    key={bus.vehicleid}
                    position={[Number(bus.latitude), Number(bus.longitude)]}
                    icon={createGoogleBusIcon(bus.vehicleid, bus.speed, isSelected)}
                    ref={(el) => (markerRefs.current[bus.vehicleid] = el)}
                    eventHandlers={{
                      click: () => handleSelectBus(bus)
                    }}
                  >
                    <Popup>
                      <div style={{ padding: '8px', minWidth: '200px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <h4 style={{ margin: 0, color: '#2563eb', fontSize: '15px' }}>
                            Bus #{bus.vehicleid}
                          </h4>
                          <span style={{ background: '#059669', color: '#fff', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '800' }}>
                            {bus.speed} km/h
                          </span>
                        </div>
                        <p style={{ margin: '3px 0', fontSize: '12px' }}><strong>Reg No:</strong> {bus.registrationno}</p>
                        <p style={{ margin: '3px 0', fontSize: '12px' }}><strong>Driver:</strong> {bus.drivername}</p>
                        <p style={{ margin: '3px 0', fontSize: '12px' }}><strong>Region:</strong> {bus.city_region || 'Tamil Nadu'}</p>
                        <p style={{ margin: '3px 0', fontSize: '12px' }}><strong>Current Stage:</strong> {bus.current_stage || 'En Route'}</p>
                        <p style={{ margin: '3px 0', fontSize: '11px', color: '#64748b' }}>
                          GPS Coords: {Number(bus.latitude).toFixed(5)}, {Number(bus.longitude).toFixed(5)}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          )}
        </div>
      </div>
    </div>
  );
};

export default BusLocation;
