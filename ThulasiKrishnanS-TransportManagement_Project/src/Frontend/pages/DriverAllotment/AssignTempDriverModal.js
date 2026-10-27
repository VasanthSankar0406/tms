
import React, { useEffect, useState } from 'react';
import '../../styles/ViewDriver.css'; // Reuse modal styles


const AssignTempDriverModal = ({ isOpen, onClose, onConfirm, availableTempDrivers, leaveRequestDetails }) => {
    const [selectedDriver, setSelectedDriver] = useState('');
    const [email, setEmail] = useState('');
    const [driverHasEmail, setDriverHasEmail] = useState(true);

    useEffect(() => {
        if (isOpen) {
            setSelectedDriver('');
            setEmail('');
            setDriverHasEmail(true);
        }
    }, [isOpen, leaveRequestDetails?.id]);

    if (!isOpen || !leaveRequestDetails) return null;

    const handleDriverSelect = (e) => {
        const staffCode = e.target.value;
        setSelectedDriver(staffCode);
        const driver = availableTempDrivers.find(d => d.staffcode === staffCode);
        if (driver) {
            setDriverHasEmail(!!driver.email);
            setEmail(driver.email || '');
        } else {
            setDriverHasEmail(true);
            setEmail('');
        }
    };

    const handleConfirm = () => {
        if (!selectedDriver) {
            alert('Please select a temporary driver.');
            return;
        }
        if (!driverHasEmail && !email) {
            alert('Please enter an email address for the temporary driver to send the notification.');
            return;
        }
        onConfirm(selectedDriver, email);
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <button className="modal-close-btn" onClick={onClose}>&times;</button>
                <h2>Assign Temporary Driver</h2>
                <p><strong>Permanent Driver:</strong> {leaveRequestDetails.staffname} ({leaveRequestDetails.staffcode})</p>
                <p><strong>Vehicle:</strong> {leaveRequestDetails.vehicleid}</p>
                <p><strong>Leave Date:</strong> {new Date(leaveRequestDetails.leave_date).toLocaleDateString()}</p>

                <div style={{ marginTop: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>Select Temporary Driver:</label>
                    <select
                        value={selectedDriver}
                        onChange={handleDriverSelect}
                        style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc', marginBottom: '15px' }}
                    >
                        <option value="">-- Select Driver --</option>
                        {availableTempDrivers.map(driver => (
                            <option key={driver.staffcode} value={driver.staffcode}>
                                {driver.staffname} ({driver.staffcode}){driver.city ? ` - ${driver.city}` : ''}
                            </option>
                        ))}
                    </select>

                    {availableTempDrivers.length === 0 && (
                        <small style={{ color: '#c0392b', display: 'block', marginBottom: '15px' }}>
                            No temporary drivers are available for this leave date.
                        </small>
                    )}

                    {!driverHasEmail && selectedDriver && (
                        <div style={{ marginTop: '10px', marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Temporary Driver Email (for Notification):</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter email address"
                                style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
                            />
                            <small style={{ color: '#666', display: 'block', marginTop: '5px' }}>
                                This driver does not have an email saved. Please enter it here to send the assignment alert.
                            </small>
                        </div>
                    )}
                </div>

                <div className="modal-actions">
                    <button className="save-btn" onClick={handleConfirm} disabled={availableTempDrivers.length === 0}>Assign & Approve</button>
                    <button className="cancel-btn" onClick={onClose}>Cancel</button>
                </div>
            </div>
        </div>
    );
};

export default AssignTempDriverModal;
