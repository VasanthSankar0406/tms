import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import DriverPageHeader from '../../components/DriverPageHeader';
import "../../styles/DriverQuery.css";
import { FaArrowLeft } from "react-icons/fa";

const DriverQuery = () => {
  const navigate = useNavigate();
  const [isDriver, setIsDriver] = useState(false);
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    queryText: ''
  });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const initialize = async () => {
      // Check if user is driver (has vehicleId in localStorage)
      const vehicleId = localStorage.getItem('vehicleId');
      setIsDriver(!!vehicleId);

      if (!vehicleId) {
        // Admin view - fetch all queries
        fetchQueries();
      } else {
        // Driver view - fetch driver's queries
        try {
          const driverResponse = await axios.get(`http://localhost:5000/api/driver/${vehicleId}`);
          const staffcode = driverResponse.data.staffcode;
          const queryResponse = await axios.get(`http://localhost:5000/getDriverQueriesByStaffcode/${staffcode}`);
          setQueries(queryResponse.data);
          setLoading(false);
        } catch (err) {
          setError('Failed to load queries');
          setLoading(false);
        }
      }
    };

    initialize();
  }, []);

  const fetchQueries = async () => {
    try {
      const response = await axios.get('http://localhost:5000/getDriverQueries');
      setQueries(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load queries');
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setMessage('');

    try {
      const vehicleId = localStorage.getItem('vehicleId');
      // Get driver details to find staffcode
      const driverResponse = await axios.get(`http://localhost:5000/api/driver/${vehicleId}`);
      const staffcode = driverResponse.data.staffcode;

      const response = await axios.post('http://localhost:5000/submitDriverQuery', {
        staffcode,
        queryText: formData.queryText
      });

      if (response.data.success) {
        setMessage('Query submitted successfully!');
        setFormData({ queryText: '' });
      }
    } catch (err) {
      setMessage('Failed to submit query. Please try again.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleResolve = async (id, status) => {
    try {
      const response = await axios.put(`http://localhost:5000/updateDriverQueryStatus/${id}`, { status });
      if (response.data.success) {
        // Update the local state
        setQueries(prev =>
          prev.map(q =>
            q.id === id ? { ...q, status } : q
          )
        );
      }
    } catch (err) {
      alert('Failed to update query status');
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="driver-query-container">
      <button className="back-btn" onClick={() => navigate(-1)}>
        <FaArrowLeft />
      </button>
      <h1>{isDriver ? 'Submit Query' : 'Driver Queries Management'}</h1>
      <DriverPageHeader />

      {isDriver ? (
        // Driver View - Form to submit query
        <div className="query-form-container">
          <div className="query-form-card">
            <form onSubmit={handleSubmit} className="query-form">
              <div className="form-group">
                <label htmlFor="queryText">Query:</label>
                <textarea
                  id="queryText"
                  name="queryText"
                  value={formData.queryText}
                  onChange={handleInputChange}
                  required
                  placeholder="Please provide your query"
                  rows="4"
                />
              </div>

              <button
                type="submit"
                className="submit-btn"
                disabled={submitLoading}
              >
                {submitLoading ? 'Submitting...' : 'Submit Query'}
              </button>
            </form>
          </div>

          {message && (
            <div className={`message ${message.includes('success') ? 'success' : 'error'}`}>
              {message}
            </div>
          )}

          {queries.length > 0 && (
            <div className="query-history">
              <h3>Your Queries</h3>
              {queries.map(query => (
                <div key={query.id} className="query-card">
                  <div className="request-header">
                    <span className={`status status-${query.status}`}>
                      {query.status.charAt(0).toUpperCase() + query.status.slice(1)}
                    </span>
                  </div>
                  <div className="request-details">
                    <p><strong>Query:</strong> {query.query_text}</p>
                    <p><strong>Submitted:</strong> {new Date(query.submitted_at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        // Admin View - List of queries with resolve button
        <div className="leave-requests-list">
          {queries.length === 0 ? (
            <p className="no-requests">No queries found.</p>
          ) : (
            queries.map(query => (
              <div key={query.id} className="query-card">
                <div className="request-header">
                  <h3>{query.staffname} ({query.staffcode})</h3>
                  <span className={`status status-${query.status}`}>
                    {query.status.charAt(0).toUpperCase() + query.status.slice(1)}
                  </span>
                </div>

                <div className="request-details">
                  <p><strong>Query:</strong> {query.query_text}</p>
                  <p><strong>Submitted:</strong> {new Date(query.submitted_at).toLocaleString()}</p>
                  <p><strong>Vehicle:</strong> {query.vehicleid}</p>
                </div>

                {query.status === 'pending' && (
                  <div className="request-actions">
                    <button
                      className="approve-btn"
                      onClick={() => handleResolve(query.id, 'resolved')}
                    >
                      Resolve
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default DriverQuery;
