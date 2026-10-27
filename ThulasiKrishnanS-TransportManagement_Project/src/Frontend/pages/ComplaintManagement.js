import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaCommentAlt, FaPaperPlane, FaCheckCircle, FaExclamationCircle, FaUserCheck, FaFilter } from 'react-icons/fa';
import { API_URL } from '../config';
import '../styles/BusStudentLookup.css';

const ComplaintManagement = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState('All');
  
  const [newComplaint, setNewComplaint] = useState({
    user_name: 'Kani',
    rollno: '2312043',
    role: 'Student',
    category: 'AC & Ventilation',
    subject: 'AC cooling sluggish during afternoon return',
    description: 'The air conditioning unit in Bus #2 requires cooling coil inspection.'
  });

  const [responseInput, setResponseInput] = useState({});
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/complaints`);
      if (res.data && res.data.complaints) {
        setComplaints(res.data.complaints);
      }
    } catch (err) {
      console.error('Error fetching complaints:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComplaint = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const res = await axios.post(`${API_URL}/api/complaints`, newComplaint);
      if (res.data && res.data.success) {
        setMessage('Complaint/Feedback submitted successfully! Transport staff will review it.');
        setShowSubmitForm(false);
        fetchComplaints();
      }
    } catch (err) {
      console.error('Error submitting complaint:', err);
    }
  };

  const handleResolveComplaint = async (id, status) => {
    try {
      await axios.put(`${API_URL}/api/complaints/${id}`, {
        status,
        admin_response: responseInput[id] || 'Inspected and resolved by transport coordinator.'
      });
      fetchComplaints();
    } catch (err) {
      console.error('Error updating complaint:', err);
    }
  };

  const filteredComplaints = complaints.filter(c => filterStatus === 'All' || c.status === filterStatus);

  return (
    <div className="bus-lookup-page">
      <header className="bus-lookup-header">
        <div className="bus-lookup-header-copy">
          <p className="bus-lookup-kicker">Passenger Voice & Service Resolution</p>
          <h1>Complaint & Feedback Management Portal</h1>
          <p className="bus-lookup-sub">
            Students and staff members can submit transport-related feedback, AC queries, timing concerns, or driver suggestions for transport admin resolution.
          </p>
        </div>
        <button className="btn-search" style={{ marginTop: '16px' }} onClick={() => setShowSubmitForm(!showSubmitForm)}>
          <FaPaperPlane /> {showSubmitForm ? 'Close Form' : 'Submit New Complaint / Feedback'}
        </button>
      </header>

      {message && <div className="lookup-alert alert-success"><FaCheckCircle /> {message}</div>}

      {showSubmitForm && (
        <div className="bus-lookup-card" style={{ marginBottom: '24px' }}>
          <h3><FaCommentAlt /> Submit Transport Complaint or Feedback</h3>
          <form onSubmit={handleSubmitComplaint} className="intimation-form" style={{ marginTop: '16px' }}>
            <div className="form-row">
              <div className="form-group">
                <label>Passenger Name:</label>
                <input type="text" value={newComplaint.user_name} onChange={(e) => setNewComplaint({ ...newComplaint, user_name: e.target.value })} required />
              </div>

              <div className="form-group">
                <label>Roll Number / Staff ID:</label>
                <input type="text" value={newComplaint.rollno} onChange={(e) => setNewComplaint({ ...newComplaint, rollno: e.target.value })} required />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Category:</label>
                <select value={newComplaint.category} onChange={(e) => setNewComplaint({ ...newComplaint, category: e.target.value })}>
                  <option value="AC & Ventilation">AC & Ventilation</option>
                  <option value="Schedule & Delay">Schedule & Delay</option>
                  <option value="Driver Behavior">Driver Behavior</option>
                  <option value="Seat & Upholstery">Seat & Upholstery</option>
                  <option value="Safety & Speeding">Safety & Speeding</option>
                  <option value="General Suggestion">General Suggestion</option>
                </select>
              </div>

              <div className="form-group">
                <label>Subject Title:</label>
                <input type="text" value={newComplaint.subject} onChange={(e) => setNewComplaint({ ...newComplaint, subject: e.target.value })} required />
              </div>
            </div>

            <div className="form-group">
              <label>Detailed Complaint Description:</label>
              <textarea rows="3" value={newComplaint.description} onChange={(e) => setNewComplaint({ ...newComplaint, description: e.target.value })} required></textarea>
            </div>

            <button type="submit" className="btn-search" style={{ width: '100%', marginTop: '10px' }}>
              <FaPaperPlane /> Submit Complaint to Transport Cell
            </button>
          </form>
        </div>
      )}

      <div className="bus-lookup-card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2>Transport Complaints & Resolution Dashboard</h2>
            <p>Monitor pending passenger feedback and record admin resolutions.</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <FaFilter /> Filter Status:
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ padding: '6px 12px', borderRadius: '6px' }}>
              <option value="All">All Complaints</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">Loading complaints...</div>
        ) : (
          <div className="student-results-grid">
            {filteredComplaints.map((c) => (
              <div key={c.id} className="result-card">
                <div className="result-header">
                  <h3>{c.subject}</h3>
                  <span className={`role-pill ${c.status.toLowerCase().replace(' ', '-')}`}>{c.status}</span>
                </div>
                <p className="city-sub">Submitted by <strong>{c.user_name}</strong> ({c.role} - ID: {c.rollno}) | Category: <strong>{c.category}</strong></p>
                <p style={{ fontSize: '13px', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', margin: '10px 0' }}>
                  "{c.description}"
                </p>

                {c.admin_response ? (
                  <div style={{ fontSize: '12px', background: '#f0fdf4', padding: '10px', borderRadius: '8px', border: '1px solid #86efac' }}>
                    <strong style={{ color: '#16a34a' }}><FaUserCheck /> Admin Resolution Note:</strong>
                    <p style={{ margin: '4px 0 0 0' }}>{c.admin_response}</p>
                  </div>
                ) : (
                  <div style={{ marginTop: '12px' }}>
                    <input
                      type="text"
                      placeholder="Add resolution note..."
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', marginBottom: '6px' }}
                      value={responseInput[c.id] || ''}
                      onChange={(e) => setResponseInput({ ...responseInput, [c.id]: e.target.value })}
                    />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn-search" style={{ padding: '6px 12px', fontSize: '12px', flex: 1 }} onClick={() => handleResolveComplaint(c.id, 'In Progress')}>
                        Mark In-Progress
                      </button>
                      <button className="btn-search" style={{ padding: '6px 12px', fontSize: '12px', flex: 1, background: '#059669' }} onClick={() => handleResolveComplaint(c.id, 'Resolved')}>
                        Resolve & Close
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ComplaintManagement;
