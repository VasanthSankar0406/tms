const express = require('express');
const router = express.Router();
const { sendEmail } = require('../utils/emailService');

// Get all leave requests with driver details
router.get('/getLeaveRequests', (req, res) => {
  const connection = req.app.locals.connection;

  const query = `
    SELECT lr.id, lr.staffcode, d.staffname, lr.reason, lr.leave_date, lr.status, lr.submitted_at, d.vehicleid
    FROM leave_requests lr
    JOIN driver d ON lr.staffcode = d.staffcode
    ORDER BY lr.submitted_at DESC
  `;

  connection.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching leave requests:', err);
      return res.status(500).json({ error: 'Failed to fetch leave requests' });
    }
    res.json(results);
  });
});

router.get('/getAvailableTempDrivers/:leaveDate', (req, res) => {
  const connection = req.app.locals.connection;
  const { leaveDate } = req.params;

  if (!leaveDate) {
    return res.status(400).json({ error: 'Leave date is required' });
  }

  const query = `
    SELECT d.staffcode, d.staffname, d.email, d.mobileno, d.city
    FROM driver d
    WHERE d.driver_type = 'temporary'
      AND d.staffcode NOT IN (
        SELECT tda.temp_driver_staffcode
        FROM temp_driver_assignments tda
        WHERE tda.assignment_date = ?
          AND tda.status = 'active'
      )
    ORDER BY d.staffname ASC
  `;

  connection.query(query, [leaveDate], (err, results) => {
    if (err) {
      console.error('Error fetching available temporary drivers:', err);
      return res.status(500).json({ error: 'Failed to fetch available temporary drivers' });
    }

    res.json(results);
  });
});

// Submit a new leave request
router.post('/submitLeaveRequest', (req, res) => {
  const connection = req.app.locals.connection;
  const { staffcode, reason, leaveDate, leave_type, num_days } = req.body;

  if (!staffcode || !reason || !leaveDate || !leave_type) {
    return res.status(400).json({ error: 'All fields are required: staffcode, reason, leaveDate, leave_type' });
  }

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const leaveDateObj = new Date(leaveDate + 'T00:00:00');
  const leaveDateStr = leaveDateObj.toISOString().split('T')[0];
  const currentHour = now.getHours();

  let status = 'pending';

  // Backend validation
  if (leaveDateStr === todayStr) { // Same day
    if (leave_type === 'full' || leave_type === 'half_morning') {
      if (currentHour >= 7) {
        status = 'rejected';
      }
    } else if (leave_type === 'half_afternoon') {
      if (currentHour >= 16) {
        status = 'rejected';
      }
    }
  } // >24hrs OK (pending)

  const query = 'INSERT INTO leave_requests (staffcode, reason, leave_date, status) VALUES (?, ?, ?, ?)';
  const values = [staffcode, reason, leaveDate, status];

  connection.query(query, values, (err, result) => {
    if (err) {
      console.error('Error submitting leave request:', err);
      return res.status(500).json({ error: 'Failed to submit leave request' });
    }

    // Send email to the driver about leave submission
    const driverQuery = 'SELECT email, staffname FROM driver WHERE staffcode = ?';
    connection.query(driverQuery, [staffcode], (driverErr, driverResult) => {
      if (!driverErr && driverResult.length > 0) {
        const driver = driverResult[0];
        if (driver.email) {
          const subject = 'Leave Request Submitted';
          const leaveDateFormatted = new Date(leaveDate).toLocaleDateString();
          const text = `Hello ${driver.staffname},\n\nYour leave request for ${leaveDateFormatted} has been submitted successfully.\n\nReason: ${reason}\nStatus: ${status.charAt(0).toUpperCase() + status.slice(1)}\n\nRegards,\nTransport Management Team`;
          const html = `<p>Hello <strong>${driver.staffname}</strong>,</p><p>Your leave request for <strong>${leaveDateFormatted}</strong> has been submitted successfully.</p><p>Reason: ${reason}</p><p>Status: <strong>${status.charAt(0).toUpperCase() + status.slice(1)}</strong></p><p>Regards,<br>Transport Management Team</p>`;

          sendEmail(driver.email, subject, text, html);
        }
      }

      const message = status === 'rejected' ? 'Leave request rejected due to time limit.' : 'Leave request submitted successfully';
      res.json({ success: true, message, id: result.insertId, status });
    });
  });
});

// Approve or reject a leave request
router.put('/approveLeaveRequest/:id', (req, res) => {
  const connection = req.app.locals.connection;
  const { id } = req.params;
  const { status, tempDriverStaffCode, vehicleId, leaveDate, permanentDriverStaffCode, tempDriverEmail } = req.body;

  if (!status || !['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Must be approved or rejected' });
  }

  if (status === 'approved' && (!tempDriverStaffCode || !vehicleId || !leaveDate || !permanentDriverStaffCode)) {
    return res.status(400).json({ error: 'Temporary driver, vehicle, leave date, and permanent driver are required for approval' });
  }

  connection.beginTransaction(err => {
    if (err) {
      console.error('Transaction Error:', err);
      return res.status(500).json({ error: 'Transaction Error' });
    }

    const query = 'UPDATE leave_requests SET status = ? WHERE id = ?';
    const values = [status, id];

    connection.query(query, values, (err, result) => {
      if (err) {
        return connection.rollback(() => {
          console.error('Error updating leave request:', err);
          res.status(500).json({ error: 'Failed to update leave request' });
        });
      }

      if (result.affectedRows === 0) {
        return connection.rollback(() => {
          res.status(404).json({ error: 'Leave request not found' });
        });
      }

      const leaveQuery = 'SELECT lr.staffcode, lr.leave_date, lr.reason, d.staffname, d.email FROM leave_requests lr JOIN driver d ON lr.staffcode = d.staffcode WHERE lr.id = ?';
      connection.query(leaveQuery, [id], (leaveErr, leaveResult) => {
        if (leaveErr) {
          return connection.rollback(() => {
            console.error('Error fetching leave details:', leaveErr);
            res.status(500).json({ error: 'Failed to fetch leave details' });
          });
        }

        if (leaveResult.length === 0) {
          return connection.rollback(() => {
            res.status(404).json({ error: 'Leave request not found' });
          });
        }

        const leaveDetails = leaveResult[0];
        const driverEmail = leaveDetails.email;
        const driverName = leaveDetails.staffname;
        const leaveDateFormatted = new Date(leaveDetails.leave_date).toLocaleDateString();

        if (driverEmail) {
          const subject = `Leave Request ${status.charAt(0).toUpperCase() + status.slice(1)}`;
          const text = `Hello ${driverName},\n\nYour leave request for ${leaveDateFormatted} has been ${status}.\n\nReason: ${leaveDetails.reason || 'N/A'}\n\nRegards,\nTransport Management Team`;
          const html = `<p>Hello <strong>${driverName}</strong>,</p><p>Your leave request for <strong>${leaveDateFormatted}</strong> has been <strong>${status}</strong>.</p><p>Reason: ${leaveDetails.reason || 'N/A'}</p><p>Regards,<br>Transport Management Team</p>`;

          sendEmail(driverEmail, subject, text, html);
        } else {
          console.warn('No email available for the driver.');
        }

        const finalizeResponse = (message) => {
          connection.commit(commitErr => {
            if (commitErr) {
              return connection.rollback(() => {
                console.error('Commit Error:', commitErr);
                res.status(500).json({ error: 'Commit Error' });
              });
            }
            res.json({ success: true, message });
          });
        };

        if (status === 'approved' && tempDriverStaffCode) {
          const checkAssignmentQuery = `
            SELECT id
            FROM temp_driver_assignments
            WHERE temp_driver_staffcode = ?
              AND assignment_date = ?
              AND status = 'active'
            LIMIT 1
          `;

          connection.query(checkAssignmentQuery, [tempDriverStaffCode, leaveDate], (checkErr, checkResult) => {
            if (checkErr) {
              return connection.rollback(() => {
                console.error('Error checking temporary driver availability:', checkErr);
                res.status(500).json({ error: 'Failed to validate temporary driver availability' });
              });
            }

            if (checkResult.length > 0) {
              return connection.rollback(() => {
                res.status(409).json({ error: 'Selected temporary driver is already assigned for this leave date' });
              });
            }

            const assignQuery = 'INSERT INTO temp_driver_assignments (leave_request_id, permanent_driver_staffcode, temp_driver_staffcode, vehicle_id, assignment_date) VALUES (?, ?, ?, ?, ?)';
            connection.query(assignQuery, [id, permanentDriverStaffCode, tempDriverStaffCode, vehicleId, leaveDate], (assignErr) => {
              if (assignErr) {
                return connection.rollback(() => {
                  console.error('Error assigning temp driver:', assignErr);
                  res.status(500).json({ error: 'Failed to assign temporary driver' });
                });
              }

              const driverQuery = 'SELECT email, staffname FROM driver WHERE staffcode = ?';
              connection.query(driverQuery, [tempDriverStaffCode], (driverErr, driverResult) => {
                if (driverErr || driverResult.length === 0) {
                  console.error('Error fetching temp driver details:', driverErr);
                } else {
                  const tempDriver = driverResult[0];
                  const emailToSendTo = tempDriverEmail || tempDriver.email;

                  if (emailToSendTo) {
                    const subject = `Vehicle Assignment Notification - Vehicle ${vehicleId}`;
                    const text = `Hello ${tempDriver.staffname},\n\nYou have been assigned to Vehicle ${vehicleId} on ${new Date(leaveDate).toLocaleDateString()} as a replacement driver.`;
                    const html = `<p>Hello <strong>${tempDriver.staffname}</strong>,</p><p>You have been assigned to <strong>Vehicle ${vehicleId}</strong> on <strong>${new Date(leaveDate).toLocaleDateString()}</strong> as a replacement driver.</p>`;

                    sendEmail(emailToSendTo, subject, text, html);

                    if (tempDriverEmail && tempDriverEmail !== tempDriver.email) {
                      const updateEmailQuery = 'UPDATE driver SET email = ? WHERE staffcode = ?';
                      connection.query(updateEmailQuery, [tempDriverEmail, tempDriverStaffCode], (updateErr) => {
                        if (updateErr) console.error("Error updating temporary driver's email inline:", updateErr);
                      });
                    }
                  } else {
                    console.warn('No email available to send notification to temporary driver.');
                  }
                }

                finalizeResponse(`Leave request approved and temp driver assigned successfully`);
              });
            });
          });
        } else {
          finalizeResponse(`Leave request ${status} successfully`);
        }
      });
    });
  });
});

router.get('/getDriverLeaveRequests/:staffcode', (req, res) => {
  const connection = req.app.locals.connection;
  const { staffcode } = req.params;

  const query = `
    SELECT lr.id, lr.staffcode, d.staffname, lr.reason, lr.leave_date, lr.status, lr.submitted_at, d.vehicleid
    FROM leave_requests lr
    JOIN driver d ON lr.staffcode = d.staffcode
    WHERE lr.staffcode = ?
    ORDER BY lr.submitted_at DESC
  `;

  connection.query(query, [staffcode], (err, results) => {
    if (err) {
      console.error('Error fetching driver leave requests:', err);
      return res.status(500).json({ error: 'Failed to fetch leave requests' });
    }
    res.json(results);
  });
});

// Get all driver queries with driver details
router.get('/getDriverQueries', (req, res) => {
  const connection = req.app.locals.connection;

  const query = `
    SELECT dq.id, dq.staffcode, d.staffname, dq.query_text, dq.status, dq.submitted_at, d.vehicleid
    FROM driver_queries dq
    JOIN driver d ON dq.staffcode = d.staffcode
    ORDER BY dq.submitted_at DESC
  `;

  connection.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching driver queries:', err);
      return res.status(500).json({ error: 'Failed to fetch driver queries' });
    }
    res.json(results);
  });
});

// Submit a new driver query
router.post('/submitDriverQuery', (req, res) => {
  const connection = req.app.locals.connection;
  const { staffcode, queryText } = req.body;

  if (!staffcode || !queryText) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const query = 'INSERT INTO driver_queries (staffcode, query_text) VALUES (?, ?)';
  const values = [staffcode, queryText];

  connection.query(query, values, (err, result) => {
    if (err) {
      console.error('Error submitting driver query:', err);
      return res.status(500).json({ error: 'Failed to submit driver query' });
    }
    res.json({ success: true, message: 'Driver query submitted successfully', id: result.insertId });
  });
});

// Update driver query status
router.put('/updateDriverQueryStatus/:id', (req, res) => {
  const connection = req.app.locals.connection;
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !['resolved', 'pending'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Must be resolved or pending' });
  }

  const query = 'UPDATE driver_queries SET status = ? WHERE id = ?';
  const values = [status, id];

  connection.query(query, values, (err, result) => {
    if (err) {
      console.error('Error updating driver query:', err);
      return res.status(500).json({ error: 'Failed to update driver query' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Driver query not found' });
    }

    res.json({ success: true, message: `Driver query ${status} successfully` });
  });
});

router.get('/getDriverQueriesByStaffcode/:staffcode', (req, res) => {
  const connection = req.app.locals.connection;
  const { staffcode } = req.params;

  const query = `
    SELECT dq.id, dq.staffcode, d.staffname, dq.query_text, dq.status, dq.submitted_at, d.vehicleid
    FROM driver_queries dq
    JOIN driver d ON dq.staffcode = d.staffcode
    WHERE dq.staffcode = ?
    ORDER BY dq.submitted_at DESC
  `;

  connection.query(query, [staffcode], (err, results) => {
    if (err) {
      console.error('Error fetching driver queries:', err);
      console.error('Detailed error:', err.sqlMessage || err.message || err);
      return res.status(500).json({ error: 'Failed to fetch driver queries' });
    }
    res.json(results);
  });
});

module.exports = router;
