import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../../config";
import "../../styles/AddDriver.css";

const AddDriver = () => {
  const location = useLocation();
  const { driver, isEdit } = location.state || {};

  const [driverType, setDriverType] = useState("permanent");
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

  useEffect(() => {
    const fetchVehicleIds = async () => {
      try {
        const response = await axios.get(`${API_URL}/getVehicle`);
        const vehicleIds = Array.isArray(response.data) ? response.data.map(vehicle => vehicle.vehicleid) : [];
        setVehicleIds(vehicleIds);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching vehicle IDs:", error);
        setError("Failed to fetch vehicle IDs. Please try again.");
        setLoading(false);
      }
    };
    fetchVehicleIds();

    // If editing, populate form with driver data
    if (isEdit && driver) {
      setDriverType(String(driver.driver_type || "permanent").toLowerCase());
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
        photo: null, // Keep null for file input
      });
    }
  }, [isEdit, driver]);

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

    // Creating FormData for file upload
    const data = new FormData();
    data.append("driver_type", driverType);
    data.append("staffcode", formData.staffcode);
    data.append("staffname", formData.staffname);
    data.append("mobileno", formData.mobileno);
    data.append("email", formData.email);
    data.append("streetname", formData.streetname); // Address
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
      // For temporary, we might send empty strings for required DB fields if not handled by backend defaults, 
      // but our backend logic handles missing fields for temporary.
      // However, to be safe with FormData which sends strings:
      data.append("vehicleid", "");
      data.append("doorno", "");
      data.append("pincode", "");
      data.append("state", "");
    }

    try {
      const url = isEdit ? `${API_URL}/updateDriver/${driver.staffcode}` : `${API_URL}/addDriver`;
      const response = isEdit ? await axios.put(url, data) : await axios.post(url, data);

      if (response.status === 200) {
        alert(isEdit ? "Driver updated successfully!" : response.data.message);
        if (!isEdit) {
          setFormData({
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
          setDriverType("permanent");
        }
      }
    } catch (error) {
      console.error("Error saving driver:", error);
      setError(error.response?.data?.message || "Failed to save driver. Please check the details and try again.");
    }
  };

  const handleTypeChange = (e) => {
    setDriverType(e.target.value);
  };

  return (
    <>
      <div className="driver-form-container">
        <form className="driver-form" onSubmit={handleSubmit}>
          <div className="driver-title">Driver Allotment Form</div>
          {error && <p className="driver-edit-error" role="alert">{error}</p>}

          <div className="driver-type-selector" style={{ marginBottom: "20px", display: "flex", gap: "20px", justifyContent: "center" }}>
            <label>
              <input
                type="radio"
                value="permanent"
                checked={driverType === "permanent"}
                onChange={handleTypeChange}
                disabled={isEdit} // Disable changing type during edit if complex
              />
              Permanent Driver
            </label>
            <label>
              <input
                type="radio"
                value="temporary"
                checked={driverType === "temporary"}
                onChange={handleTypeChange}
                disabled={isEdit}
              />
              Temporary Driver
            </label>
          </div>

          <div className="driver-form-row">
            <div className="driver-form-group">
              <label htmlFor="staffcode">Staff Code</label>
              <input type="text" id="staffcode" name="staffcode" placeholder="Enter Staff Code" value={formData.staffcode} onChange={handleChange} required disabled={isEdit} />
            </div>
            <div className="driver-form-group">
              <label htmlFor="staffname">Staff Name</label>
              <input type="text" id="staffname" name="staffname" placeholder="Enter Staff Name" value={formData.staffname} onChange={handleChange} required />
            </div>
          </div>

          {driverType === "permanent" && (
            <div className="driver-form-group">
              <label>Vehicle Id</label>
              <select name="vehicleid" value={formData.vehicleid} onChange={handleChange} required>
                <option value="">Select vehicleId</option>
                {vehicleIds.map((route, index) => (
                  <option key={index} value={route}>{route}</option>
                ))}
              </select>
            </div>
          )}

          <div className="driver-form-row">
            {driverType === "permanent" && (
              <div className="driver-form-group">
                <label htmlFor="doorno">Door No</label>
                <input type="text" id="doorno" name="doorno" placeholder="Enter Door No" value={formData.doorno} onChange={handleChange} required />
              </div>
            )}
            <div className="driver-form-group">
              <label htmlFor="streetname">{driverType === "temporary" ? "Address" : "Street Name"}</label>
              <input type="text" id="streetname" name="streetname" placeholder={driverType === "temporary" ? "Enter Address" : "Enter Street Name"} value={formData.streetname} onChange={handleChange} required />
            </div>
          </div>

          <div className="driver-form-row">
            <div className="driver-form-group">
              <label htmlFor="city">City</label>
              <input type="text" id="city" name="city" placeholder="Enter City" value={formData.city} onChange={handleChange} required />
            </div>
            <div className="driver-form-group">
              <label htmlFor="email">Email ID</label>
              <input type="email" id="email" name="email" placeholder="Enter Email Address" value={formData.email} onChange={handleChange} />
            </div>
          </div>

          <div className="driver-form-row">
            {driverType === "permanent" && (
              <div className="driver-form-group">
                <label htmlFor="pincode">Pincode</label>
                <input type="text" id="pincode" name="pincode" placeholder="Enter Pincode" value={formData.pincode} onChange={handleChange} required />
              </div>
            )}
          </div>

          <div className="driver-form-row">
            {driverType === "permanent" && (
              <div className="driver-form-group">
                <label htmlFor="state">State</label>
                <input type="text" id="state" name="state" placeholder="Enter State" value={formData.state} onChange={handleChange} required />
              </div>
            )}
            {driverType === "permanent" && (
              <div className="driver-form-group">
                <label htmlFor="mobileno">Mobile No</label>
                <input type="text" id="mobileno" name="mobileno" placeholder="Enter Mobile No" value={formData.mobileno} onChange={handleChange} required />
              </div>
            )}
          </div>

          {driverType === "permanent" && (
            <div className="driver-form-group">
              <label htmlFor="photo">Upload Photo</label>
              <input type="file" id="photo" name="photo" accept="image/*" onChange={handleFileChange} required={!isEdit} />
            </div>
          )}

          <button type="submit" className="driver-submit-button">{isEdit ? "Update Driver" : "Add Driver"}</button>
        </form>
      </div>

    </>
  );
};

export default AddDriver;
