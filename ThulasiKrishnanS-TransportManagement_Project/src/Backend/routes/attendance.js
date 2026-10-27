const express = require('express');
const router = express.Router();

// Get students for a specific route (driver's route)
router.get('/getStudentsByRoute/:routeid', (req, res) => {
    const { routeid } = req.params;

    if (!routeid) {
        return res.status(400).json({
            success: false,
            message: 'Route ID is required'
        });
    }

    const connection = req.app.locals.connection;
    const query = 'SELECT rollno, name, role, branch FROM traveller WHERE routeid = ? ORDER BY rollno';

    connection.query(query, [routeid], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
                success: false,
                message: 'Database error'
            });
        }

        return res.json(results);
    });
});

// Get attendance for a specific date and route
router.get('/getAttendance/:routeid/:date', (req, res) => {
    const { routeid, date } = req.params;

    if (!routeid || !date) {
        return res.status(400).json({
            success: false,
            message: 'Route ID and date are required'
        });
    }

    const connection = req.app.locals.connection;
    const query = `
        SELECT t.rollno, t.name, t.role, t.branch, a.status, a.timestamp
        FROM traveller t
        LEFT JOIN attendance a ON t.rollno = a.rollno AND a.attendance_date = ?
        WHERE t.routeid = ?
        ORDER BY t.rollno
    `;

    connection.query(query, [date, routeid], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
                success: false,
                message: 'Database error'
            });
        }

        return res.json(results);
    });
});

// Mark attendance for students
router.post('/markAttendance', (req, res) => {
    const { attendanceData, markedBy } = req.body;

    if (!attendanceData || !Array.isArray(attendanceData) || !markedBy) {
        return res.status(400).json({
            success: false,
            message: 'Attendance data and marker are required'
        });
    }

    const connection = req.app.locals.connection;
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    // Use transaction to ensure atomicity
    connection.beginTransaction((err) => {
        if (err) {
            console.error('Transaction error:', err);
            return res.status(500).json({
                success: false,
                message: 'Database error'
            });
        }

        let completed = 0;
        const total = attendanceData.length;

        if (total === 0) {
            connection.rollback(() => {
                return res.status(400).json({
                    success: false,
                    message: 'No attendance data provided'
                });
            });
            return;
        }

        attendanceData.forEach(({ rollno, status }) => {
            const query = `
                INSERT INTO attendance (rollno, attendance_date, status, marked_by)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE status = VALUES(status), marked_by = VALUES(marked_by), timestamp = CURRENT_TIMESTAMP
            `;

            connection.query(query, [rollno, today, status, markedBy], (err, results) => {
                if (err) {
                    console.error('Database error:', err);
                    return connection.rollback(() => {
                        return res.status(500).json({
                            success: false,
                            message: 'Database error'
                        });
                    });
                }

                completed++;
                if (completed === total) {
                    connection.commit((err) => {
                        if (err) {
                            console.error('Commit error:', err);
                            return connection.rollback(() => {
                                return res.status(500).json({
                                    success: false,
                                    message: 'Database error'
                                });
                            });
                        }

                        return res.json({
                            success: true,
                            message: 'Attendance marked successfully'
                        });
                    });
                }
            });
        });
    });
});

// Get attendance summary for a route and date range
router.get('/getAttendanceSummary/:routeid', (req, res) => {
    const { routeid } = req.params;
    const { startDate, endDate } = req.query;

    if (!routeid) {
        return res.status(400).json({
            success: false,
            message: 'Route ID is required'
        });
    }

    const connection = req.app.locals.connection;
    let query = `
        SELECT
            t.rollno,
            t.name,
            COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_days,
            COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_days,
            COUNT(a.id) as total_days
        FROM traveller t
        LEFT JOIN attendance a ON t.rollno = a.rollno
    `;

    const params = [routeid];

    if (startDate && endDate) {
        query += ' AND a.attendance_date BETWEEN ? AND ?';
        params.push(startDate, endDate);
    }

    query += ' WHERE t.routeid = ? GROUP BY t.rollno, t.name ORDER BY t.rollno';

    connection.query(query, params, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
                success: false,
                message: 'Database error'
            });
        }

        return res.json(results);
    });
});

// Submit student attendance count by driver
router.post('/submitStudentCount', (req, res) => {
    const { vehicleid, routeid, attendance_date, student_count, marked_by } = req.body;

    if (!vehicleid || !attendance_date || student_count === undefined || !marked_by) {
        return res.status(400).json({
            success: false,
            message: 'Vehicle ID, attendance date, student count, and marker are required'
        });
    }

    const connection = req.app.locals.connection;
    const query = `
        INSERT INTO student_attendance_count (vehicleid, routeid, attendance_date, student_count, marked_by)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE student_count = VALUES(student_count), marked_by = VALUES(marked_by), timestamp = CURRENT_TIMESTAMP
    `;

    connection.query(query, [vehicleid, routeid, attendance_date, student_count, marked_by], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
                success: false,
                message: 'Database error'
            });
        }

        return res.json({
            success: true,
            message: 'Student count submitted successfully'
        });
    });
});

// Get student attendance counts for admin view
router.get('/getStudentCounts', (req, res) => {
    const { startDate, endDate } = req.query;

    const connection = req.app.locals.connection;
    let query = `
        SELECT
            sac.id,
            sac.vehicleid,
            v.registrationno,
            sac.routeid,
            r.routename,
            sac.attendance_date,
            sac.student_count,
            sac.marked_by,
            d.staffname as driver_name,
            sac.timestamp
        FROM student_attendance_count sac
        LEFT JOIN vehicle v ON sac.vehicleid = v.vehicleid
        LEFT JOIN route r ON sac.routeid = r.routeid
        LEFT JOIN driver d ON sac.marked_by = d.staffcode
    `;

    const params = [];

    if (startDate && endDate) {
        query += ' WHERE sac.attendance_date BETWEEN ? AND ?';
        params.push(startDate, endDate);
    }

    query += ' ORDER BY sac.attendance_date DESC, sac.vehicleid';

    connection.query(query, params, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
                success: false,
                message: 'Database error'
            });
        }

        return res.json(results);
    });
});

// Update student attendance count
router.put('/updateStudentCount/:id', (req, res) => {
    const { id } = req.params;
    const { vehicleid, routeid, attendance_date, student_count, marked_by } = req.body;

    if (!vehicleid || !attendance_date || student_count === undefined || !marked_by) {
        return res.status(400).json({
            success: false,
            message: 'Vehicle ID, attendance date, student count, and marker are required'
        });
    }

    const connection = req.app.locals.connection;
    const query = `
        UPDATE student_attendance_count
        SET vehicleid = ?, routeid = ?, attendance_date = ?, student_count = ?, marked_by = ?, timestamp = CURRENT_TIMESTAMP
        WHERE id = ?
    `;

    connection.query(query, [vehicleid, routeid, attendance_date, student_count, marked_by, id], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
                success: false,
                message: 'Database error'
            });
        }

        if (results.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Student attendance record not found'
            });
        }

        return res.json({
            success: true,
            message: 'Student count updated successfully'
        });
    });
});

// Delete student attendance count
router.delete('/deleteStudentCount/:id', (req, res) => {
    const { id } = req.params;

    const connection = req.app.locals.connection;
    const query = 'DELETE FROM student_attendance_count WHERE id = ?';

    connection.query(query, [id], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
                success: false,
                message: 'Database error'
            });
        }

        if (results.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Student attendance record not found'
            });
        }

        return res.json({
            success: true,
            message: 'Student count deleted successfully'
        });
    });
});

module.exports = router;
