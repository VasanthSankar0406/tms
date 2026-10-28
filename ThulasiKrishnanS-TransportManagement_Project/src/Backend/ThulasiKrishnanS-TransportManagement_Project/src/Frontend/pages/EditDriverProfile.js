import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaUser, FaPhone, FaHome, FaMapMarkerAlt, FaCity, FaMap, FaMapPin, FaCamera, FaArrowLeft } from 'react-icons/fa';
import DriverPageHeader from '../components/DriverPageHeader';
import { API_URL } from '../../Frontend/config';
import '../styles/EditDriverProfile.css';

const EditDriverProfile = () => {
  const [driverData, setDriverData] = useState({
    staffname: '',
    doorno: '',
    streetname: '',
    city: '',
    state: '',
    pincode: '',
    mobileno: '',
    photo: null,
  });
  const [photoPreview, setPhotoPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const vehicleId = localStorage.getItem('vehicleId');

  useEffect(() => {
    if (!vehicleId) {
      navigate('/login');
      return;
    }

    const fetchDriverData = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/driver/${vehicleId}`);
        const data = res.data;
        setDriverData({
          staffname: data.staffname || '',
          doorno: data.doorno || '',
          streetname: data.streetname || '',
          city: data.city || '',
          state: data.state || '',
          pincode: data.pincode || '',
          mobileno: data.mobileno || '',
          photo: null,
        });
        if (data.photo) {
          setPhotoPreview(`data:image/jpeg;base64,${data.photo}`);
        }
        setLoading(false);
      } catch (err) {
        setError('Failed to load driver data');
        setLoading(false);
      }
    };

    fetchDriverData();
  }, [vehicleId, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setDriverData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setDriverData((prev) => ({
        ...prev,
        photo: file,
      }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!driverData.staffname || !driverData.mobileno) {
      alert('Please fill in required fields');
      return;
    }

    const formData = new FormData();
    formData.append('staffname', driverData.staffname);
    formData.append('doorno', driverData.doorno);
    formData.append('streetname', driverData.streetname);
    formData.append('city', driverData.city);
    formData.append('state', driverData.state);
    formData.append('pincode', driverData.pincode);
    formData.append('mobileno', driverData.mobileno);
    if (driverData.photo) {
      formData.append('photo', driverData.photo);
    }

    try {
      const res = await axios.put(`${API_URL}/api/driver/${vehicleId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      if (res.data.success) {
        alert('Profile updated successfully');
        navigate('/driver-profile');
      } else {
        alert('Failed to update profile');
      }
    } catch (err) {
      alert('Error updating profile');
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="edit-driver-container">
      <button className="back-btn" onClick={() => navigate(-1)}>
        <FaArrowLeft />
      </button>
      <div className="edit-form-card">
        <h1>Edit Driver Profile</h1>
        <DriverPageHeader />
        <form onSubmit={handleSubmit} className="edit-driver-form">

          <div className="form-group">
            <label><FaUser /> Staff Name *</label>
            <input
              type="text"
              name="staffname"
              value={driverData.staffname}
              onChange={handleChange}
              required
              placeholder="Enter your full name"
            />
          </div>

          <div className="form-group">
            <label><FaPhone /> Mobile Number *</label>
            <input
              type="text"
              name="mobileno"
              value={driverData.mobileno}
              onChange={handleChange}
              required
              placeholder="Enter mobile number"
            />
          </div>

          <div className="form-group">
            <label><FaHome /> Door No</label>
            <input
              type="text"
              name="doorno"
              value={driverData.doorno}
              onChange={handleChange}
              placeholder="e.g. 12/A"
            />
          </div>

          <div className="form-group">
            <label><FaMapMarkerAlt /> Street Name</label>
            <input
              type="text"
              name="streetname"
              value={driverData.streetname}
              onChange={handleChange}
              placeholder="Street name"
            />
          </div>

          <div className="form-group">
            <label><FaCity /> City</label>
            <input
              type="text"
              name="city"
              value={driverData.city}
              onChange={handleChange}
              placeholder="City"
            />
          </div>

          <div className="form-group">
            <label><FaMap /> State</label>
            <input
              type="text"
              name="state"
              value={driverData.state}
              onChange={handleChange}
              placeholder="State"
            />
          </div>

          <div className="form-group">
            <label><FaMapPin /> Pincode</label>
            <input
              type="text"
              name="pincode"
              value={driverData.pincode}
              onChange={handleChange}
              placeholder="Pincode"
            />
          </div>

          <div className="form-group">
            <label><FaCamera /> Driver Photo</label>
            <input type="file" accept="image/*" onChange={handlePhotoChange} />
            {photoPreview && (
              <img src={photoPreview} alt="Driver Preview" className="photo-preview" />
            )}
          </div>

          <button type="submit" className="btn-submit">Save Changes</button>
        </form>
      </div>
    </div>
  );
};

export default EditDriverProfile;
