import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaCalendarAlt, FaUsers, FaArrowLeft } from 'react-icons/fa';
import DriverPageHeader from '../components/DriverPageHeader';
import { API_URL } from '../../Frontend/config';
import '../styles/DriverAttendance.css';

const DriverAttendance = () => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [studentCount, setStudentCount] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [routeId, setRouteId] = useState('');
  const [staffcode, setStaffcode] = useState('');

  useEffect(() => {
    const vid = localStorage.getItem('vehicleId');
    const scode = localStorage.getItem('staffcode');

    if (vid) setVehicleId(vid);
    if (scode) setStaffcode(scode);

    // Fetch route ID for the vehicle
    if (vid) {
      fetchRouteId(vid);
    }
  }, []);

  const fetchRouteId = async (vid) => {
    try {
      const response = await axios.get(`${API_URL}/api/vehicle/${vid}`);
      const vehicleData = response.data;
      if (vehicleData.routeid) {
        setRouteId(vehicleData.routeid);
      }
    } catch (error) {
      console.error('Failed to fetch route ID:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!studentCount || studentCount < 0) {
      setMessage('Please enter a valid student count');
      return;
    }

    if (!vehicleId || !routeId || !staffcode) {
      setMessage('Missing required information. Please login again.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await axios.post(`${API_URL}/submitStudentCount`, {
        vehicleid: vehicleId,
        routeid: routeId,
        attendance_date: selectedDate,
        student_count: parseInt(studentCount),
        marked_by: staffcode
      });

      if (response.data.success) {
        setMessage('Student count submitted successfully!');
        setStudentCount('');
      } else {
        setMessage('Failed to submit student count');
      }
    } catch (error) {
      console.error('Error submitting student count:', error);
      setMessage('Error submitting student count. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="attendance-container">
      <button className="back-btn" onClick={() => navigate(-1)}>
        <FaArrowLeft />
      </button>
      <DriverPageHeader />
      <div className="attendance-shell">
        <div className="attendance-page-header">
          <p className="attendance-eyebrow">Driver Workspace</p>
          <h1>Student Attendance Count</h1>
          <p>Record the number of students travelling on the assigned route for the selected date.</p>
        </div>

      <div className="attendance-card">
        <form onSubmit={handleSubmit} className="attendance-form">
          <div className="form-group">
            <label htmlFor="date"><FaCalendarAlt /> Date:</label>
            <input
              type="date"
              id="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="count"><FaUsers /> Number of Students:</label>
            <input
              type="number"
              id="count"
              value={studentCount}
              onChange={(e) => setStudentCount(e.target.value)}
              min="0"
              placeholder="Enter student count"
              required
            />
          </div>

          <button
            type="submit"
            className="submit-btn"
            disabled={loading}
          >
            {loading ? 'Submitting...' : 'Submit Count'}
          </button>
        </form>

        {message && (
          <div className={`message ${message.includes('successfully') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}

        <div className="info-section">
          <p><strong>Vehicle ID:</strong> <span>{vehicleId}</span></p>
          <p><strong>Route ID:</strong> <span>{routeId}</span></p>
          <p><strong>Staff Code:</strong> <span>{staffcode}</span></p>
        </div>
      </div>
      </div>
    </div>
  );
};

export default DriverAttendance;
