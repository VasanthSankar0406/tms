import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaPen, FaCalendar, FaHistory, FaSortNumericDown, FaArrowLeft } from 'react-icons/fa';
import DriverPageHeader from '../components/DriverPageHeader';
import AssignTempDriverModal from './DriverAllotment/AssignTempDriverModal';
import { API_URL } from '../../Frontend/config';
import '../styles/LeaveRequest.css';

const LeaveRequest = () => {
  const navigate = useNavigate();
  const [isDriver, setIsDriver] = useState(false);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [driverLeaveRequests, setDriverLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    reason: '',
    leaveDate: '',
    numOfDays: '1'
  });
  const [leaveType, setLeaveType] = useState('full');
  const [validationError, setValidationError] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [tempDrivers, setTempDrivers] = useState([]);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedLeaveRequest, setSelectedLeaveRequest] = useState(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        // Check if user is driver (has vehicleId in localStorage)
        const vehicleId = localStorage.getItem('vehicleId');
        setIsDriver(!!vehicleId);

        if (!vehicleId) {
          // Admin view - fetch all leave requests
          await Promise.all([fetchLeaveRequests(), fetchTemporaryDrivers()]);
        } else {
          // Driver view - fetch driver's leave requests
          const driverResponse = await axios.get(`${API_URL}/api/driver/${vehicleId}`);
          const staffcode = driverResponse.data.staffcode;
          const leaveResponse = await axios.get(`${API_URL}/getDriverLeaveRequests/${staffcode}`);
          setDriverLeaveRequests(leaveResponse.data);
        }
      } catch (err) {
        if (localStorage.getItem('vehicleId')) {
          setError('Failed to load leave requests');
        }
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, []);

  const fetchLeaveRequests = async () => {
    try {
      const response = await axios.get(`${API_URL}/getLeaveRequests`);
      setLeaveRequests(response.data);
    } catch (err) {
      setError('Failed to load leave requests');
      throw err;
    }
  };

  const fetchTemporaryDrivers = async () => {
    try {
      const response = await axios.get(`${API_URL}/getdrivers`);
      setTempDrivers(response.data.filter(driver => driver.driver_type === 'temporary'));
    } catch (err) {
      setError('Failed to load temporary drivers');
      throw err;
    }
  };

const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'leaveType') {
      setLeaveType(value);
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    setValidationError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');
    setMessage('');

    const now = new Date();
    const todayStr = now.toLocaleDateString('en-CA');
    const leaveDateStr = formData.leaveDate;
    const currentHour = now.getHours();

    console.log('Leave request validation:', {
      currentTime: now.toLocaleString(),
      todayStr,
      selectedDate: formData.leaveDate,
      leaveDateStr,
      isSameDay: leaveDateStr === todayStr,
      leaveType,
      currentHour
    });

    // Check if same day - time restrictions apply only for today's leave
    if (leaveDateStr === todayStr) {
      const currentMinutes = now.getHours() * 60 + now.getMinutes(); // Convert to minutes for precise comparison
      console.log('Same day leave request:', { leaveDateStr, todayStr, currentHour: now.getHours(), currentMinutes, leaveType });

      if (leaveType === 'full' || leaveType === 'half_morning') {
        // Morning leave must be requested before 7:00 AM
        if (currentMinutes >= 7 * 60) {
          console.log('Blocking morning leave request - too late');
          setValidationError('Full day or morning half leave can only be requested before 7:00 AM on the same day. Leave request cannot be submitted.');
          return; // Explicitly prevent submission
        }
      } else if (leaveType === 'half_afternoon') {
        // Afternoon leave must be requested before 3:00 PM
        if (currentMinutes >= 15 * 60) {
          console.log('Blocking afternoon leave request - too late');
          setValidationError('Afternoon half day leave can only be requested before 3:00 PM on the same day. Leave request cannot be submitted.');
          return; // Explicitly prevent submission
        }
      }
    }
    // Future dates have no time restrictions
    console.log('Allowing leave request - either future date or within time limits');

    setSubmitLoading(true);

    try {
      const vehicleId = localStorage.getItem('vehicleId');
      const driverResponse = await axios.get(`${API_URL}/api/driver/${vehicleId}`);
      const staffcode = driverResponse.data.staffcode;

      const response = await axios.post(`${API_URL}/submitLeaveRequest`, {
        staffcode,
        leave_type: leaveType,
        num_days: parseFloat(formData.numOfDays),
        reason: formData.reason,
        leaveDate: formData.leaveDate
      });

      if (response.data.success) {
        setMessage('Leave request submitted successfully!');
        setFormData({ reason: '', leaveDate: '', numOfDays: '1' });
        setLeaveType('full');
      }
    } catch (err) {
      setMessage('Failed to submit leave request. Please try again.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleApprove = async (id, status) => {
    if (status === 'approved') {
      const request = leaveRequests.find(req => req.id === id);
      if (!request) {
        alert('Leave request details could not be loaded.');
        return;
      }

      const fallbackTempDrivers = tempDrivers.filter(driver => driver.driver_type === 'temporary' || !driver.driver_type);

      try {
        const response = await axios.get(`${API_URL}/getAvailableTempDrivers/${request.leave_date}`);
        const availableDrivers = response.data || [];

        if (availableDrivers.length === 0) {
          alert('No temporary drivers are available for this leave date.');
          return;
        }

        setTempDrivers(availableDrivers);
        setSelectedLeaveRequest(request);
        setIsAssignModalOpen(true);
      } catch (err) {
        if (fallbackTempDrivers.length === 0) {
          alert('No temporary drivers are available to assign.');
          return;
        }

        setTempDrivers(fallbackTempDrivers);
        setSelectedLeaveRequest(request);
        setIsAssignModalOpen(true);
      }
      return;
    }

    try {
      const response = await axios.put(`${API_URL}/approveLeaveRequest/${id}`, { status });
      if (response.data.success) {
        updateLeaveRequestStatus(id, status);
      }
    } catch (err) {
      alert('Failed to update leave request status');
    }
  };

  const handleAssignTempDriver = async (tempDriverStaffCode, tempDriverEmail) => {
    if (!selectedLeaveRequest) return;

    try {
      const response = await axios.put(`${API_URL}/approveLeaveRequest/${selectedLeaveRequest.id}`, {
        status: 'approved',
        tempDriverStaffCode,
        tempDriverEmail: tempDriverEmail || null,
        vehicleId: selectedLeaveRequest.vehicleid,
        leaveDate: selectedLeaveRequest.leave_date,
        permanentDriverStaffCode: selectedLeaveRequest.staffcode
      });

      if (response.data.success) {
        updateLeaveRequestStatus(selectedLeaveRequest.id, 'approved');
        setIsAssignModalOpen(false);
        setSelectedLeaveRequest(null);
        alert(response.data.message);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to approve and assign temporary driver');
    }
  };

  const updateLeaveRequestStatus = (id, status) => {
    setLeaveRequests(prev =>
      prev.map(req =>
        req.id === id ? { ...req, status } : req
      )
    );
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="leave-request-container">
      <button className="back-btn" onClick={() => navigate(-1)}>
        <FaArrowLeft />
      </button>
      <h1>{isDriver ? 'Submit Leave Request' : 'Leave Requests Management'}</h1>
      <DriverPageHeader />

      {isDriver ? (
        <div className="leave-form-container">
          <div className="leave-form-card">
            <form onSubmit={handleSubmit} className="leave-form">
              <div className="form-group">
                <label>Leave Type:</label>
                <select name="leaveType" value={leaveType} onChange={handleInputChange}>
                  <option value="full">Full Day</option>
                  <option value="half_morning">Half Day (Morning)</option>
                  <option value="half_afternoon">Half Day (Afternoon)</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="numOfDays"><FaSortNumericDown /> Number of Days:</label>
                <input
                  type="number"
                  id="numOfDays"
                  name="numOfDays"
                  value={formData.numOfDays}
                  onChange={handleInputChange}
                  required
                  min="0.5"
                  step="0.5"
                  placeholder="1 or 0.5"
                />
              </div>

              <div className="form-group">
                <label htmlFor="leaveDate"><FaCalendar /> Start Date:</label>
                <input
                  type="date"
                  id="leaveDate"
                  name="leaveDate"
                  value={formData.leaveDate}
                  onChange={handleInputChange}
                  required
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              {formData.leaveDate && formData.numOfDays > 0 && (
                <div className="leave-summary">
                  <p style={{ margin: 0, fontSize: '14px' }}>
                    <strong>Leave Duration:</strong> {formData.numOfDays} Day{formData.numOfDays > 1 ? 's' : ''}
                  </p>
                  <p style={{ margin: '5px 0 0', fontSize: '14px' }}>
                    <strong>From:</strong> {new Date(formData.leaveDate).toLocaleDateString()}
                    <strong> To:</strong> {(() => {
                      const date = new Date(formData.leaveDate);
                      date.setDate(date.getDate() + parseInt(formData.numOfDays) - 1);
                      return date.toLocaleDateString();
                    })()}
                  </p>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="reason"><FaPen /> Reason for Leave:</label>
                <textarea
                  id="reason"
                  name="reason"
                  value={formData.reason}
                  onChange={handleInputChange}
                  required
                  placeholder="Please provide a detailed reason for your leave request"
                  rows="4"
                />
              </div>

              <button
                type="submit"
                className="submit-btn"
                disabled={submitLoading || !!validationError}
              >
                {submitLoading ? 'Submitting...' : 'Submit Leave Request'}
              </button>
            </form>
          </div>

{message && (
            <div className={`message ${message.includes('success') ? 'success' : 'error'}`}>
              {message}
            </div>
          )}
          {validationError && (
            <div className="message error">
              {validationError}
            </div>
          )}

          <button 
            className="history-toggle-btn" 
            onClick={() => setShowHistory(!showHistory)}
          >
            {showHistory ? 'Hide History' : 'View Leave History'}
          </button>

          {showHistory && driverLeaveRequests.length > 0 && (
            <div className="driver-leave-history">
              <h3><FaHistory /> Your Leave Requests</h3>
<table className="history-table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Date Submitted</th>
                    <th>Leave Date</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {driverLeaveRequests.map(request => (
                    <tr key={request.id}>
                      <td><span className={`status status-${request.status}`}>
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </span></td>
                      <td>{new Date(request.submitted_at).toLocaleDateString()}</td>
                      <td>{new Date(request.leave_date).toLocaleDateString()}</td>
                      <td>{request.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        // Admin View - List of leave requests with approve/reject buttons
        <div className="leave-requests-list">
          {leaveRequests.length === 0 ? (
            <p className="no-requests">No leave requests found.</p>
          ) : (
            leaveRequests.map(request => (
              <div key={request.id} className="leave-request-card">
                <div className="request-header">
                  <h3>{request.staffname} ({request.staffcode})</h3>
                  <span className={`status status-${request.status}`}>
                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                  </span>
                </div>

                <div className="request-details">
                  <p><strong>Reason:</strong> {request.reason}</p>
                  <p><strong>Leave Date:</strong> {new Date(request.leave_date).toLocaleDateString()}</p>
                  <p><strong>Submitted:</strong> {new Date(request.submitted_at).toLocaleString()}</p>
                  <p><strong>Vehicle:</strong> {request.vehicleid}</p>
                </div>

                {request.status === 'pending' && (
                  <div className="request-actions">
                    <button
                      className="approve-btn"
                      onClick={() => handleApprove(request.id, 'approved')}
                    >
                      Approve
                    </button>
                    <button
                      className="reject-btn"
                      onClick={() => handleApprove(request.id, 'rejected')}
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      <AssignTempDriverModal
        isOpen={isAssignModalOpen}
        onClose={() => {
          setIsAssignModalOpen(false);
          setSelectedLeaveRequest(null);
          fetchTemporaryDrivers();
        }}
        onConfirm={handleAssignTempDriver}
        availableTempDrivers={tempDrivers}
        leaveRequestDetails={selectedLeaveRequest}
      />
    </div>
  );
};

export default LeaveRequest;
