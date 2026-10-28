import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  X,
  User,
  Users,
  Upload,
  AlertCircle,
  Loader2,
  Image as ImageIcon
} from "lucide-react";
import { API_URL } from "../../config";

const emptyFormData = {
  staffcode: "",
  staffname: "",
  vehicleid: "",
  doorno: "",
  streetname: "",
  city: "",
  state: "",
  pincode: "",
  mobileno: "",
  email: "",
  photo: null
};

const AddEditDriverModal = ({
  isOpen,
  onClose,
  onSuccess,
  driverToEdit = null,
  vehicleIds = []
}) => {
  const isEditMode = Boolean(driverToEdit);
  const [driverType, setDriverType] = useState("permanent");
  const [formData, setFormData] = useState(emptyFormData);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [isDirty, setIsDirty] = useState(false);
  const fileInputRef = useRef(null);

  // Initialize or reset form when modal opens or driverToEdit changes
  useEffect(() => {
    if (isOpen) {
      setErrorMessage("");
      setFieldErrors({});
      setIsDirty(false);

      if (driverToEdit) {
        const type = String(driverToEdit.driver_type || "permanent").toLowerCase();
        setDriverType(type);
        setFormData({
          staffcode: driverToEdit.staffcode || "",
          staffname: driverToEdit.staffname || driverToEdit.name || "",
          vehicleid: driverToEdit.vehicleid || "",
          doorno: driverToEdit.doorno || "",
          streetname: driverToEdit.streetname || "",
          city: driverToEdit.city || "",
          state: driverToEdit.state || "",
          pincode: driverToEdit.pincode || "",
          mobileno: driverToEdit.mobileno || "",
          email: driverToEdit.email || "",
          photo: null
        });
        setPhotoPreview(driverToEdit.imageUrl || null);
      } else {
        setDriverType("permanent");
        setFormData(emptyFormData);
        setPhotoPreview(null);
      }
    }
  }, [isOpen, driverToEdit]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen && !isSubmitting) {
        handleAttemptClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isSubmitting, isDirty]);

  if (!isOpen) return null;

  const handleAttemptClose = () => {
    if (isDirty && !window.confirm("You have unsaved changes. Are you sure you want to close?")) {
      return;
    }
    onClose();
  };

  const handleTypeChange = (newType) => {
    if (isEditMode) return; // Prevent changing type in edit mode
    setDriverType(newType);
    setFieldErrors({});
    setErrorMessage("");
    setIsDirty(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setIsDirty(true);
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setFieldErrors((prev) => ({ ...prev, photo: "Please upload an image file (PNG, JPG, JPEG)" }));
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setFieldErrors((prev) => ({ ...prev, photo: "Image file size must be less than 5MB" }));
        return;
      }
      setFormData((prev) => ({ ...prev, photo: file }));
      setIsDirty(true);
      setFieldErrors((prev) => ({ ...prev, photo: "" }));

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.staffcode.trim()) errors.staffcode = "Staff Code is required";
    if (!formData.staffname.trim()) errors.staffname = "Staff Name is required";

    if (driverType === "permanent") {
      if (!formData.vehicleid) errors.vehicleid = "Vehicle ID is required";
      if (!formData.doorno.trim()) errors.doorno = "Door No is required";
      if (!formData.streetname.trim()) errors.streetname = "Street Name is required";
      if (!formData.city.trim()) errors.city = "City is required";
      if (!formData.state.trim()) errors.state = "State is required";
      if (!formData.pincode.trim()) errors.pincode = "Pincode is required";
      if (!formData.mobileno.trim()) errors.mobileno = "Mobile No is required";
      if (!isEditMode && !formData.photo) {
        errors.photo = "Driver photo is required for permanent drivers";
      }
    } else {
      // Temporary driver
      if (!formData.streetname.trim()) errors.streetname = "Address is required";
      if (!formData.city.trim()) errors.city = "City is required";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!validateForm()) {
      setErrorMessage("Please fill in all required fields correctly.");
      return;
    }

    setIsSubmitting(true);

    try {
      const data = new FormData();
      data.append("driver_type", driverType);
      data.append("staffcode", formData.staffcode.trim());
      data.append("staffname", formData.staffname.trim());
      data.append("streetname", formData.streetname.trim());
      data.append("city", formData.city.trim());
      data.append("mobileno", formData.mobileno.trim());
      data.append("email", formData.email.trim());

      if (driverType === "permanent") {
        data.append("vehicleid", formData.vehicleid);
        data.append("doorno", formData.doorno.trim());
        data.append("pincode", formData.pincode.trim());
        data.append("state", formData.state.trim());
        if (formData.photo) {
          data.append("photo", formData.photo);
        }
      } else {
        data.append("vehicleid", "");
        data.append("doorno", "");
        data.append("pincode", "");
        data.append("state", "");
      }

      if (isEditMode) {
        const url = `${API_URL}/updateDriver/${encodeURIComponent(driverToEdit.staffcode)}`;
        await axios.put(url, data);
        onSuccess(
          `Driver ${formData.staffname} (${formData.staffcode}) updated successfully!`,
          "success",
          "Driver Updated"
        );
      } else {
        const url = `${API_URL}/addDriver`;
        const res = await axios.post(url, data);
        onSuccess(
          res.data?.message || `Driver ${formData.staffname} added successfully!`,
          "success",
          "Driver Registered"
        );
      }
    } catch (err) {
      console.error("Error saving driver:", err);
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Failed to save driver details. Please verify your inputs.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="driver-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          handleAttemptClose();
        }
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="driver-modal-dialog">
        {/* Modal Header */}
        <div className="driver-modal-header">
          <div className="driver-modal-header-copy">
            <div className="driver-modal-badge">
              <User size={18} />
            </div>
            <div>
              <h3 className="driver-modal-title">
                {isEditMode ? "Edit Driver" : "Add New Driver"}
              </h3>
              <p className="driver-modal-subtitle">
                {isEditMode
                  ? `Update driver information and assignments for ${driverToEdit.staffname || driverToEdit.staffcode}`
                  : "Enter driver information and assign a vehicle."}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="driver-modal-close-btn"
            onClick={handleAttemptClose}
            disabled={isSubmitting}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="driver-modal-form">
          <div className="driver-modal-body">
            {/* Inline Error Alert */}
            {errorMessage && (
              <div className="driver-modal-alert alert-error" role="alert">
                <AlertCircle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Driver Type Segmented Selector */}
            <div className="driver-type-segmented-box">
              <span className="driver-type-label">Select Driver Classification:</span>
              <div className="driver-type-options">
                <button
                  type="button"
                  className={`driver-type-option ${driverType === "permanent" ? "active" : ""}`}
                  onClick={() => handleTypeChange("permanent")}
                  disabled={isEditMode}
                >
                  <User size={15} />
                  <span>Permanent Driver</span>
                </button>
                <button
                  type="button"
                  className={`driver-type-option ${driverType === "temporary" ? "active" : ""}`}
                  onClick={() => handleTypeChange("temporary")}
                  disabled={isEditMode}
                >
                  <Users size={15} />
                  <span>Temporary Driver</span>
                </button>
              </div>
            </div>

            {/* Form Fields Grid */}
            <div className="driver-form-grid">
              {/* Staff Code */}
              <div className="driver-field-group">
                <label htmlFor="driver-staffcode">
                  Staff Code <span className="req">*</span>
                </label>
                <input
                  id="driver-staffcode"
                  type="text"
                  name="staffcode"
                  placeholder="Enter Staff Code (e.g. DRV001)"
                  value={formData.staffcode}
                  onChange={handleInputChange}
                  disabled={isEditMode}
                  className={fieldErrors.staffcode ? "input-error" : ""}
                  required
                />
                {fieldErrors.staffcode && (
                  <span className="field-error-text">{fieldErrors.staffcode}</span>
                )}
              </div>

              {/* Staff Name */}
              <div className="driver-field-group">
                <label htmlFor="driver-staffname">
                  Staff Name <span className="req">*</span>
                </label>
                <input
                  id="driver-staffname"
                  type="text"
                  name="staffname"
                  placeholder="Enter Staff Name"
                  value={formData.staffname}
                  onChange={handleInputChange}
                  className={fieldErrors.staffname ? "input-error" : ""}
                  required
                />
                {fieldErrors.staffname && (
                  <span className="field-error-text">{fieldErrors.staffname}</span>
                )}
              </div>

              {/* Permanent Driver: Vehicle ID */}
              {driverType === "permanent" && (
                <div className="driver-field-group">
                  <label htmlFor="driver-vehicleid">
                    Vehicle ID <span className="req">*</span>
                  </label>
                  <select
                    id="driver-vehicleid"
                    name="vehicleid"
                    value={formData.vehicleid}
                    onChange={handleInputChange}
                    className={fieldErrors.vehicleid ? "input-error" : ""}
                    required
                  >
                    <option value="">-- Select Assigned Vehicle --</option>
                    {vehicleIds.map((vId) => (
                      <option key={vId} value={vId}>
                        Vehicle #{vId}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.vehicleid && (
                    <span className="field-error-text">{fieldErrors.vehicleid}</span>
                  )}
                </div>
              )}

              {/* Permanent Driver: Door No */}
              {driverType === "permanent" && (
                <div className="driver-field-group">
                  <label htmlFor="driver-doorno">
                    Door No <span className="req">*</span>
                  </label>
                  <input
                    id="driver-doorno"
                    type="text"
                    name="doorno"
                    placeholder="Enter Door Number"
                    value={formData.doorno}
                    onChange={handleInputChange}
                    className={fieldErrors.doorno ? "input-error" : ""}
                    required
                  />
                  {fieldErrors.doorno && (
                    <span className="field-error-text">{fieldErrors.doorno}</span>
                  )}
                </div>
              )}

              {/* Street Name / Address */}
              <div className="driver-field-group">
                <label htmlFor="driver-streetname">
                  {driverType === "temporary" ? "Address" : "Street Name"}{" "}
                  <span className="req">*</span>
                </label>
                <input
                  id="driver-streetname"
                  type="text"
                  name="streetname"
                  placeholder={
                    driverType === "temporary" ? "Enter Address" : "Enter Street Name"
                  }
                  value={formData.streetname}
                  onChange={handleInputChange}
                  className={fieldErrors.streetname ? "input-error" : ""}
                  required
                />
                {fieldErrors.streetname && (
                  <span className="field-error-text">{fieldErrors.streetname}</span>
                )}
              </div>

              {/* City */}
              <div className="driver-field-group">
                <label htmlFor="driver-city">
                  City <span className="req">*</span>
                </label>
                <input
                  id="driver-city"
                  type="text"
                  name="city"
                  placeholder="Enter City"
                  value={formData.city}
                  onChange={handleInputChange}
                  className={fieldErrors.city ? "input-error" : ""}
                  required
                />
                {fieldErrors.city && (
                  <span className="field-error-text">{fieldErrors.city}</span>
                )}
              </div>

              {/* Permanent Driver: State */}
              {driverType === "permanent" && (
                <div className="driver-field-group">
                  <label htmlFor="driver-state">
                    State <span className="req">*</span>
                  </label>
                  <input
                    id="driver-state"
                    type="text"
                    name="state"
                    placeholder="Enter State"
                    value={formData.state}
                    onChange={handleInputChange}
                    className={fieldErrors.state ? "input-error" : ""}
                    required
                  />
                  {fieldErrors.state && (
                    <span className="field-error-text">{fieldErrors.state}</span>
                  )}
                </div>
              )}

              {/* Permanent Driver: Pincode */}
              {driverType === "permanent" && (
                <div className="driver-field-group">
                  <label htmlFor="driver-pincode">
                    Pincode <span className="req">*</span>
                  </label>
                  <input
                    id="driver-pincode"
                    type="text"
                    name="pincode"
                    placeholder="Enter Pincode"
                    value={formData.pincode}
                    onChange={handleInputChange}
                    className={fieldErrors.pincode ? "input-error" : ""}
                    required
                  />
                  {fieldErrors.pincode && (
                    <span className="field-error-text">{fieldErrors.pincode}</span>
                  )}
                </div>
              )}

              {/* Mobile No */}
              <div className="driver-field-group">
                <label htmlFor="driver-mobileno">
                  Mobile No {driverType === "permanent" && <span className="req">*</span>}
                </label>
                <input
                  id="driver-mobileno"
                  type="tel"
                  name="mobileno"
                  placeholder="Enter Mobile Number"
                  value={formData.mobileno}
                  onChange={handleInputChange}
                  className={fieldErrors.mobileno ? "input-error" : ""}
                  required={driverType === "permanent"}
                />
                {fieldErrors.mobileno && (
                  <span className="field-error-text">{fieldErrors.mobileno}</span>
                )}
              </div>

              {/* Email ID */}
              <div className="driver-field-group">
                <label htmlFor="driver-email">Email ID</label>
                <input
                  id="driver-email"
                  type="email"
                  name="email"
                  placeholder="Enter Email Address"
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </div>

              {/* Permanent Driver: Photo Upload */}
              {driverType === "permanent" && (
                <div className="driver-field-group full-width">
                  <label htmlFor="driver-photo">
                    Driver Photo {!isEditMode && <span className="req">*</span>}
                  </label>
                  <div className="driver-photo-upload-container">
                    {photoPreview ? (
                      <div className="photo-preview-box">
                        <img src={photoPreview} alt="Preview" className="photo-preview-img" />
                        <div className="photo-preview-details">
                          <span className="photo-preview-name">
                            {formData.photo ? formData.photo.name : "Current Photo"}
                          </span>
                          <button
                            type="button"
                            className="btn-change-photo"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <Upload size={13} />
                            <span>Change Photo</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className={`photo-drop-zone ${fieldErrors.photo ? "has-error" : ""}`}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <div className="photo-drop-icon">
                          <ImageIcon size={24} />
                        </div>
                        <div className="photo-drop-text">
                          <strong>Click to upload driver photo</strong>
                          <span>PNG, JPG, or JPEG up to 5MB</span>
                        </div>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      id="driver-photo"
                      type="file"
                      name="photo"
                      accept="image/*"
                      onChange={handleFileChange}
                      style={{ display: "none" }}
                    />
                  </div>
                  {fieldErrors.photo && (
                    <span className="field-error-text">{fieldErrors.photo}</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="driver-modal-footer">
            <button
              type="button"
              className="driver-btn-cancel"
              onClick={handleAttemptClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="driver-btn-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={15} className="spin-icon" />
                  <span>{isEditMode ? "Updating..." : "Saving..."}</span>
                </>
              ) : (
                <span>{isEditMode ? "Update Driver" : "Save Driver"}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEditDriverModal;
