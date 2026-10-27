import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaIdCard, FaPhone, FaMapMarkerAlt, FaBus, FaHashtag, FaUser, FaArrowLeft } from 'react-icons/fa';
import DriverPageHeader from '../components/DriverPageHeader';
import '../styles/DriverProfile.css';

const DriverProfile = ({ isDashboard = false }) => {
    const [driverData, setDriverData] = useState(null);
    const [vehicleData, setVehicleData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const vehicleId = localStorage.getItem('vehicleId');

    useEffect(() => {
        if (!vehicleId) {
            navigate('/login');
            return;
        }

        const fetchData = async () => {
            try {
                const [driverRes, vehicleRes] = await Promise.all([
                    axios.get(`http://localhost:5000/api/driver/${vehicleId}`),
                    axios.get(`http://localhost:5000/api/vehicle/${vehicleId}`)
                ]);

                setDriverData(driverRes.data);
                setVehicleData(vehicleRes.data);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching data:', error);
                setError('Failed to load profile data');
                setLoading(false);
            }
        };

        fetchData();
    }, [vehicleId, navigate]);

    if (loading) return <div className="loading">Loading...</div>;
    if (error) return <div className="error">{error}</div>;
    if (!driverData || !vehicleData) return <div className="error">No data available</div>;

    return (
        <div className="driver-profile-page">
            <div className="driver-profile-container">
                <button className="back-btn" onClick={() => navigate(-1)}>
                    <FaArrowLeft />
                </button>
                <h1>Driver Profile</h1>
                <DriverPageHeader />

                <div className="profile-content-grid">

                    {/* Driver Info Card */}
                    <div className="details-card">
                        <div className="card-header">
                            <FaIdCard className="card-icon" />
                            <h2>Driver Information</h2>
                        </div>

                        {driverData.photo && driverData.photo !== '[object Object]' && (
                            <div className="profile-photo-container">
                                <img
                                    src={`data:image/jpeg;base64,${driverData.photo}`}
                                    alt="Driver"
                                    className="profile-photo-large"
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                />
                            </div>
                        )}

                        <div className="info-row">
                            <span className="info-label"><FaHashtag className="label-icon" /> Staff Code</span>
                            <span className="info-value">{driverData.staffcode}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-label"><FaUser className="label-icon" /> Name</span>
                            <span className="info-value">{driverData.staffname}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-label"><FaPhone className="label-icon" /> Mobile</span>
                            <span className="info-value">{driverData.mobileno}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-label"><FaMapMarkerAlt className="label-icon" /> Address</span>
                            <span className="info-value" style={{ maxWidth: '200px', lineHeight: '1.4' }}>{`${driverData.doorno}, ${driverData.streetname}, ${driverData.city}, ${driverData.state} - ${driverData.pincode}`}</span>
                        </div>
                    </div>

                    {/* Vehicle Info Card */}
                    <div className="details-card">
                        <div className="card-header">
                            <FaBus className="card-icon" />
                            <h2>Vehicle Information</h2>
                        </div>

                        <div className="info-row">
                            <span className="info-label"><FaHashtag className="label-icon" /> Vehicle ID</span>
                            <span className="info-value">{vehicleData.vehicleid}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-label"><FaBus className="label-icon" /> Vehicle Type</span>
                            <span className="info-value">{vehicleData.vehicletype}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-label"><FaIdCard className="label-icon" /> Registration No</span>
                            <span className="info-value">{vehicleData.registrationno}</span>
                        </div>
                        {/* Add more vehicle details here if available in the API response in future */}
                    </div>

                </div>
            </div>
        </div>
    );

};

export default DriverProfile;