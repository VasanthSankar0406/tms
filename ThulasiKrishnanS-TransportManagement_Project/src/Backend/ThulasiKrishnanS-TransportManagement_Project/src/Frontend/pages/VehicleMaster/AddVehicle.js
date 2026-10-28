import React, { useState, useEffect } from "react";
import axios from "axios";  // Import Axios
import { API_URL } from "../../config";
import "../../styles/AddVehicle.css";
import { useNavigate } from 'react-router-dom';
import { FaSignOutAlt } from "react-icons/fa";

const AddVehicle = () => {
    const navigate = useNavigate();
    
    const handleNavigation = (path) => {
        navigate(path);
    };
    const [vehicleData, setVehicleData] = useState({
        vehicleId: "",
        vehicleType: "",
        seatCapacity: "",
        registrationNo: "",
        routeId: "",
        registrationDate: "",
        purchaseDate: "",
        vendorId: "",
        rcNo: "",
        registrationPlace: "",
    });

    const vehicleTypeOptions = ["A/C", "Non-A/C"];

    const [routeOptions, setRouteOptions] = useState([]);

    useEffect(() => {
        // Fetch route IDs when component loads
        axios.get(`${API_URL}/getRoute`)
            .then(response => {
                //console.log("Fetched routes:", response.data);
                const routeIds = response.data.map(route => route.routeid); // Extract routeId
                setRouteOptions(routeIds);
            })
            .catch(error => {
                console.error("Error fetching routes:", error);
            });
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setVehicleData((prevData) => ({
            ...prevData,
            [name]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const response = await axios.post(`${API_URL}/addVehicle`, vehicleData); // Adjust backend URL if needed
            alert(response.data.message);
            setVehicleData({ // Reset form after successful submission
                vehicleId: "",
                vehicleType: "",
                seatCapacity: "",
                registrationNo: "",
                routeId: "",
                registrationDate: "",
                purchaseDate: "",
                vendorId: "",
                rcNo: "",
                registrationPlace: "",
            });
        } catch (error) {
            console.error("Error adding vehicle:", error);
            alert("Failed to add vehicle. Please try again.");
        }
    };

    return (
        <>
            <div className="add-vehicle-page">
                <div className="add-vehicle-form-container">
                    <h2 className="add-vehicle-main-title">VEHICLE MASTER</h2>
                    <div className="add-vehicle-title">ADD</div>

                    <form className="add-vehicle-form" onSubmit={handleSubmit}>
                        <div className="add-vehicle-form-grid">

                            <div className="add-vehicle-form-group">
                                <label>Vehicle Id</label>
                                <input type="number" name="vehicleId" value={vehicleData.vehicleId} onChange={handleChange} required />
                            </div>

                            <div className="add-vehicle-form-group">
                                <label>Vehicle Type</label>
                                <select name="vehicleType" value={vehicleData.vehicleType} onChange={handleChange} required>
                                    <option value="">Select Type</option>
                                    {vehicleTypeOptions.map((type, index) => (
                                        <option key={index} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="add-vehicle-form-group">
                                <label>Seat Capacity</label>
                                <input type="number" name="seatCapacity" value={vehicleData.seatCapacity} onChange={handleChange} required />
                            </div>

                            <div className="add-vehicle-form-group">
                                <label>Registration Number</label>
                                <input type="text" name="registrationNo" value={vehicleData.registrationNo} onChange={handleChange} required />
                            </div>

                            <div className="add-vehicle-form-group">
                                <label>Route ID</label>
                                <select name="routeId" value={vehicleData.routeId} onChange={handleChange} required>
                                    <option value="">Select Route</option>
                                    {routeOptions.map((route, index) => (
                                        <option key={index} value={route}>{route}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="add-vehicle-form-group">
                                <label>Registration Date</label>
                                <input type="date" name="registrationDate" value={vehicleData.registrationDate} onChange={handleChange} required />
                            </div>

                            <div className="add-vehicle-form-group">
                                <label>Purchase Date</label>
                                <input type="date" name="purchaseDate" value={vehicleData.purchaseDate} onChange={handleChange} required />
                            </div>

                            <div className="add-vehicle-form-group">
                                <label>Vendor ID</label>
                                <input type="text" name="vendorId" value={vehicleData.vendorId} onChange={handleChange} required />
                            </div>

                            <div className="add-vehicle-form-group">
                                <label>RC Number</label>
                                <input type="text" name="rcNo" value={vehicleData.rcNo} onChange={handleChange} required />
                            </div>

                            <div className="add-vehicle-form-group">
                                <label>Registration Place</label>
                                <input type="text" name="registrationPlace" value={vehicleData.registrationPlace} onChange={handleChange} required />
                            </div>
                        </div>

                        <button type="submit" className="add-vehicle-submit-button">Add Vehicle</button>
                    </form>
                </div>
            </div>
        </>
    );
};

export default AddVehicle;
