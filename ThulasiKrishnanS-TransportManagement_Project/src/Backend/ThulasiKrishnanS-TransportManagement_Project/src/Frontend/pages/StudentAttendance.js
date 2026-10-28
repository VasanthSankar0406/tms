import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { exportStudentAttendanceToPDF } from './ReportGenerator';
import { API_URL } from '../config';
import '../styles/StudentAttendance.css';
import EditStudentAttendance from './StudentAttendance/EditStudentAttendance';

const StudentAttendance = () => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [editingRecord, setEditingRecord] = useState(null);

  useEffect(() => {
    fetchAttendanceData();
  }, []);

  const fetchAttendanceData = async (start = '', end = '') => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (start && end) {
        params.startDate = start;
        params.endDate = end;
      }
      const response = await axios.get(`${API_URL}/getStudentCounts`, { params });
      setAttendanceData(response.data);
    } catch (err) {
      console.error('Error fetching attendance data:', err);
      setError('Failed to fetch attendance data');
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    if (startDate && endDate) {
      fetchAttendanceData(startDate, endDate);
    } else {
      fetchAttendanceData();
    }
  };

  const handleClearFilter = () => {
    setStartDate('');
    setEndDate('');
    fetchAttendanceData();
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
  };

  const handleDelete = async (recordId) => {
    if (window.confirm("Are you sure you want to delete this attendance record?")) {
      try {
        await axios.delete(`${API_URL}/deleteStudentCount/${recordId}`);
        alert("Attendance record deleted successfully");
        fetchAttendanceData(startDate, endDate);
      } catch (error) {
        console.error("Error deleting attendance record:", error);
        alert("Failed to delete attendance record");
      }
    }
  };

  const handleSaveEdit = async (updatedRecord) => {
    try {
      await axios.put(`${API_URL}/updateStudentCount/${updatedRecord.id}`, updatedRecord);
      alert("Attendance record updated successfully");
      setEditingRecord(null);
      fetchAttendanceData(startDate, endDate);
    } catch (error) {
      console.error("Error updating attendance record:", error);
      alert("Failed to update attendance record");
    }
  };

  const handleCancelEdit = () => {
    setEditingRecord(null);
  };

  if (loading) return <div className="loading">Loading attendance data...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="student-attendance-container">
      <div className="attendance-header">
        <h2>Student Attendance Counts</h2>
        <div className="filter-section">
          <div className="date-filters">
            <label>
              Start Date:
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </label>
            <label>
              End Date:
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </label>
          </div>
          <div className="filter-buttons">
            <button onClick={handleFilter} className="filter-btn">Filter</button>
            <button onClick={handleClearFilter} className="clear-btn">Clear</button>
            <button
              onClick={() => exportStudentAttendanceToPDF(attendanceData, startDate, endDate)}
              className="pdf-btn"
              disabled={attendanceData.length === 0}
            >
              Generate PDF
            </button>
          </div>
        </div>
      </div>

      <div className="attendance-table-container">
        <table className="attendance-table">
          <thead>
            <tr>
              <th>Vehicle ID</th>
              <th>Registration No</th>
              <th>Route Name</th>
              <th>Date</th>
              <th>Student Count</th>
              <th>Driver Name</th>
              <th>Submitted At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {attendanceData.length > 0 ? (
              attendanceData.map((record, index) => (
                <tr key={index}>
                  <td>{record.vehicleid}</td>
                  <td>{record.registrationno}</td>
                  <td>{record.routename}</td>
                  <td>{new Date(record.attendance_date).toLocaleDateString()}</td>
                  <td>{record.student_count}</td>
                  <td>{record.driver_name}</td>
                  <td>{new Date(record.timestamp).toLocaleString()}</td>
                  <td>
                    <button onClick={() => handleEdit(record)} style={{ marginRight: '5px' }}>Edit</button>
                    <button onClick={() => handleDelete(record.id)}>Delete</button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="no-data">No attendance data found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editingRecord && (
        <EditStudentAttendance
          record={editingRecord}
          onSave={handleSaveEdit}
          onCancel={handleCancelEdit}
        />
      )}
    </div>
  );
};

export default StudentAttendance;
