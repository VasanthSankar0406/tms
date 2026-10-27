import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../../styles/ViewDriver.css'; // Reusing ViewDriver styles, will add Modal specific styles there

import { API_URL } from '../../config';

const EditDriverModal = ({ driver, onClose, onUpdateSuccess }) => {
    const [formData, setFormData] = useState({
        vehicleid: "",
        staffcode: "",
        staffname: "",
        doorno: "",
        streetname: "",
        city: "",
        pincode: "",
        state: "",
        mobileno: "",
        email: "",
        photo: null,
    });
    const [vehicleIds, setVehicleIds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const driverType = String((driver && driver.driver_type) || "permanent").toLowerCase();

    useEffect(() => {
        setError("");
        // Populate form data
        if (driver) {
            setFormData({
                vehicleid: driver.vehicleid || "",
                staffcode: driver.staffcode || "",
                staffname: driver.staffname || "",
                doorno: driver.doorno || "",
                streetname: driver.streetname || "",
                city: driver.city || "",
                pincode: driver.pincode || "",
                state: driver.state || "",
                mobileno: driver.mobileno || "",
                email: driver.email || "",
                photo: null,
            });
        }

        // Fetch vehicle IDs if permanent driver
        const fetchVehicleIds = async () => {
            if (driverType !== 'permanent') {
                setLoading(false);
                return;
            }
            try {
                const response = await axios.get(`${API_URL}/getVehicle`);
                const vIds = Array.isArray(response.data) ? response.data.map(vehicle => vehicle.vehicleid) : [];
                setVehicleIds(vIds);
                setLoading(false);
            } catch (error) {
                console.error("Error fetching vehicle IDs:", error);
                setLoading(false);
            }
        };
        fetchVehicleIds();
    }, [driver, driverType]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleFileChange = (e) => {
        setFormData({ ...formData, photo: e.target.files[0] });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        const data = new FormData();
        data.append("driver_type", driverType);
        data.append("staffcode", formData.staffcode);
        data.append("staffname", formData.staffname);
        data.append("mobileno", formData.mobileno);
        data.append("email", formData.email);
        data.append("streetname", formData.streetname);
        data.append("city", formData.city);

        if (driverType === "permanent") {
            data.append("vehicleid", formData.vehicleid);
            data.append("doorno", formData.doorno);
            data.append("pincode", formData.pincode);
            data.append("state", formData.state);
            if (formData.photo) {
                data.append("photo", formData.photo);
            }
        } else {
            // Safe defaults for temporary driver if backend expects them
            data.append("vehicleid", "");
            data.append("doorno", "");
            data.append("pincode", "");
            data.append("state", "");
        }

        try {
            const url = `${API_URL}/updateDriver/${encodeURIComponent(driver.staffcode)}`;
            const response = await axios.put(url, data);

            if (response.status === 200) {
                alert("Driver updated successfully!");
                onUpdateSuccess();
            }
        } catch (error) {
            console.error("Error updating driver:", error);
            setError(error.response?.data?.message || "Failed to update driver. Please check the details and try again.");
        }
    };

    if (!driver) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <button className="modal-close-btn" onClick={onClose}>&times;</button>
                <h2>Edit Driver: {driver.staffname}</h2>
                {error && <p className="driver-edit-error" role="alert">{error}</p>}

                {loading ? <p>Loading...</p> : (
                    <form className="driver-form" onSubmit={handleSubmit} style={{ boxShadow: 'none', padding: '0' }}>
                        <div className="driver-form-row">
                            <div className="driver-form-group">
                                <label>Staff Code</label>
                                <input type="text" value={formData.staffcode} disabled className="disabled-input" />
                            </div>
                            <div className="driver-form-group">
                                <label>Staff Name</label>
                                <input type="text" name="staffname" value={formData.staffname} onChange={handleChange} required />
                            </div>
                        </div>

                        <div className="driver-form-group">
                            <label>Email</label>
                            <input type="email" name="email" value={formData.email} onChange={handleChange} />
                        </div>

                        {driverType === "permanent" && (
                            <div className="driver-form-group">
                                <label>Vehicle Id</label>
                                <select name="vehicleid" value={formData.vehicleid} onChange={handleChange} required>
                                    <option value="">Select vehicleId</option>
                                    {vehicleIds.map((vId, index) => (
                                        <option key={index} value={vId}>{vId}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="driver-form-row">
                            {driverType === "permanent" && (
                                <div className="driver-form-group">
                                    <label>Door No</label>
                                    <input type="text" name="doorno" value={formData.doorno} onChange={handleChange} required />
                                </div>
                            )}
                            <div className="driver-form-group">
                                <label>{driverType === "temporary" ? "Address" : "Street Name"}</label>
                                <input type="text" name="streetname" value={formData.streetname} onChange={handleChange} required />
                            </div>
                        </div>

                        <div className="driver-form-row">
                            <div className="driver-form-group">
                                <label>City</label>
                                <input type="text" name="city" value={formData.city} onChange={handleChange} required />
                            </div>
                            {driverType === "permanent" && (
                                <div className="driver-form-group">
                                    <label>Pincode</label>
                                    <input type="text" name="pincode" value={formData.pincode} onChange={handleChange} required />
                                </div>
                            )}
                        </div>

                        <div className="driver-form-row">
                            {driverType === "permanent" && (
                                <div className="driver-form-group">
                                    <label>State</label>
                                    <input type="text" name="state" value={formData.state} onChange={handleChange} required />
                                </div>
                            )}
                            <div className="driver-form-group">
                                <label>Mobile No</label>
                                <input type="text" name="mobileno" value={formData.mobileno} onChange={handleChange} required={driverType === "permanent"} />
                            </div>
                        </div>

                        {driverType === "permanent" && (
                            <div className="driver-form-group">
                                <label>Upload New Photo (Optional)</label>
                                <input type="file" name="photo" accept="image/*" onChange={handleFileChange} />
                            </div>
                        )}

                        <div className="modal-actions">
                            <button type="submit" className="save-btn">Save Changes</button>
                            <button type="button" className="cancel-btn" onClick={onClose}>Cancel</button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default EditDriverModal;
