import React, { useEffect, useState } from "react";
import {
  X,
  UserCheck,
  AlertCircle,
  Loader2
} from "lucide-react";
import "../../styles/ViewDriver.css";

const AssignTempDriverModal = ({
  isOpen,
  onClose,
  onConfirm,
  availableTempDrivers = [],
  leaveRequestDetails = null
}) => {
  const [selectedDriver, setSelectedDriver] = useState("");
  const [email, setEmail] = useState("");
  const [driverHasEmail, setDriverHasEmail] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setSelectedDriver("");
      setEmail("");
      setDriverHasEmail(true);
      setValidationError("");
      setIsSubmitting(false);
    }
  }, [isOpen, leaveRequestDetails?.id]);

  if (!isOpen || !leaveRequestDetails) return null;

  const handleDriverSelect = (e) => {
    const staffCode = e.target.value;
    setSelectedDriver(staffCode);
    setValidationError("");
    const driver = availableTempDrivers.find((d) => d.staffcode === staffCode);
    if (driver) {
      setDriverHasEmail(Boolean(driver.email));
      setEmail(driver.email || "");
    } else {
      setDriverHasEmail(true);
      setEmail("");
    }
  };

  const handleConfirm = async () => {
    setValidationError("");
    if (!selectedDriver) {
      setValidationError("Please select an available temporary driver.");
      return;
    }
    if (!driverHasEmail && !email.trim()) {
      setValidationError(
        "Please enter an email address for the temporary driver to receive the assignment notification."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(selectedDriver, email.trim());
    } finally {
      setIsSubmitting(false);
    }
  };

  const formattedLeaveDate = leaveRequestDetails.leave_date
    ? new Date(leaveRequestDetails.leave_date).toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric"
      })
    : "Not specified";

  return (
    <div
      className="driver-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="driver-modal-dialog" style={{ maxWidth: "560px" }}>
        {/* Modal Header */}
        <div className="driver-modal-header">
          <div className="driver-modal-header-copy">
            <div className="driver-modal-badge" style={{ background: "#f0fdf4", color: "#15803d", borderColor: "#bbf7d0" }}>
              <UserCheck size={18} />
            </div>
            <div>
              <h3 className="driver-modal-title">Assign Temporary Driver</h3>
              <p className="driver-modal-subtitle">
                Assign a replacement driver before approving leave
              </p>
            </div>
          </div>
          <button
            type="button"
            className="driver-modal-close-btn"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="driver-modal-body" style={{ padding: "18px 24px" }}>
          {/* Summary Box */}
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "14px 16px",
              marginBottom: "18px",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px"
            }}
          >
            <div>
              <span style={{ fontSize: "0.72rem", color: "#64748b", textTransform: "uppercase", fontWeight: "700" }}>
                Permanent Driver
              </span>
              <p style={{ margin: "2px 0 0", fontSize: "0.86rem", fontWeight: "700", color: "#0f2744" }}>
                {leaveRequestDetails.staffname || leaveRequestDetails.staffcode}{" "}
                <span style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: "500" }}>
                  ({leaveRequestDetails.staffcode})
                </span>
              </p>
            </div>

            <div>
              <span style={{ fontSize: "0.72rem", color: "#64748b", textTransform: "uppercase", fontWeight: "700" }}>
                Vehicle Assigned
              </span>
              <p style={{ margin: "2px 0 0", fontSize: "0.86rem", fontWeight: "700", color: "#1e40af" }}>
                {leaveRequestDetails.vehicleid ? `Vehicle #${leaveRequestDetails.vehicleid}` : "No Vehicle"}
              </p>
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <span style={{ fontSize: "0.72rem", color: "#64748b", textTransform: "uppercase", fontWeight: "700" }}>
                Requested Leave Date
              </span>
              <p style={{ margin: "2px 0 0", fontSize: "0.84rem", fontWeight: "600", color: "#334155" }}>
                {formattedLeaveDate}
              </p>
            </div>
          </div>

          {validationError && (
            <div className="driver-modal-alert alert-error" style={{ marginBottom: "16px" }}>
              <AlertCircle size={16} />
              <span>{validationError}</span>
            </div>
          )}

          {/* Select Driver Field */}
          <div className="driver-field-group" style={{ marginBottom: "14px" }}>
            <label htmlFor="temp-driver-select">
              Select Available Temporary Driver <span className="req">*</span>
            </label>
            <select
              id="temp-driver-select"
              value={selectedDriver}
              onChange={handleDriverSelect}
              disabled={availableTempDrivers.length === 0 || isSubmitting}
            >
              <option value="">-- Choose Temporary Driver --</option>
              {availableTempDrivers.map((driver) => (
                <option key={driver.staffcode} value={driver.staffcode}>
                  {driver.staffname} ({driver.staffcode})
                  {driver.city ? ` — ${driver.city}` : ""}
                </option>
              ))}
            </select>
          </div>

          {availableTempDrivers.length === 0 && (
            <div
              style={{
                padding: "10px 14px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "8px",
                color: "#dc2626",
                fontSize: "0.8rem",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "14px"
              }}
            >
              <AlertCircle size={16} />
              <span>No temporary drivers are available for this leave date.</span>
            </div>
          )}

          {/* Driver Email if not saved */}
          {!driverHasEmail && selectedDriver && (
            <div className="driver-field-group">
              <label htmlFor="temp-driver-email">
                Temporary Driver Notification Email <span className="req">*</span>
              </label>
              <input
                id="temp-driver-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email to send assignment alert"
              />
              <span style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "2px" }}>
                This driver has no email on record. Enter an email address to notify them.
              </span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="driver-modal-footer">
          <button
            type="button"
            className="driver-btn-cancel"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="driver-btn-submit"
            onClick={handleConfirm}
            disabled={availableTempDrivers.length === 0 || !selectedDriver || isSubmitting}
            style={{ background: "#15803d", borderColor: "#15803d" }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={15} className="spin-icon" />
                <span>Assigning...</span>
              </>
            ) : (
              <span>Assign & Approve</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssignTempDriverModal;
