const express = require('express');
const router = express.Router();
const { listRecords, getRecord, saveRecord, updateRecord, deleteRecord, saveNotification } = require('../dbRecords');

const normalize = (value) => String(value || '').trim().toLowerCase();
const like = (value) => `%${String(value || '').trim()}%`;
const fail = (res, error) => {
    console.error('Bus lookup database error:', error.message);
    return res.status(500).json({ success: false, message: 'Database request failed' });
};

const lookupSql = `
    SELECT t.id AS traveller_id, t.name, t.rollno, t.role, t.branch, t.year,
           t.stafftype, t.city, t.phoneno, t.stage_name, t.point, t.routeid,
           r.routename, r.city AS destination_city,
           v.vehicleid, v.registrationno, v.vehicletype, v.seatcapacity,
           d.staffname AS driver_name, d.mobileno AS driver_phone, d.staffcode AS driver_code
    FROM traveller t
    LEFT JOIN route r ON r.routeid = t.routeid
    LEFT JOIN vehicle v ON v.routeid = t.routeid
    LEFT JOIN driver d ON d.vehicleid = v.vehicleid
`;

router.get('/api/lookup/student-to-bus', async (req, res) => {
    const term = String(req.query.query || '').trim();
    if (!term) return res.status(400).json({ success: false, message: 'Please provide student name or roll number' });
    try {
        const [rows] = await req.app.locals.connection.promise().query(
            `${lookupSql} WHERE LOWER(COALESCE(t.role, 'Student')) = 'student' AND (LOWER(t.name) LIKE LOWER(?) OR LOWER(t.rollno) LIKE LOWER(?)) ORDER BY t.name`,
            [like(term), like(term)]
        );
        const results = rows.map(row => ({
            ...row,
            student_name: row.name,
            boarding_stop: row.stage_name || row.point || 'Campus Gate',
            dropoff_stop: row.city ? `${row.city} Main Stop` : 'College Campus',
            email: `${String(row.rollno || '').toLowerCase()}@nec.edu.in`,
            routename: row.routename || `Route ${row.routeid || 'N/A'}`,
            vehicleid: row.vehicleid || 'N/A',
            registrationno: row.registrationno || 'Pending Allocation',
            vehicletype: row.vehicletype || 'Bus',
            driver_name: row.driver_name || 'Assigned Driver',
            driver_phone: row.driver_phone || 'N/A',
            driver_code: row.driver_code || 'N/A'
        }));
        res.json({ success: true, count: results.length, results });
    } catch (error) { fail(res, error); }
});

router.get('/api/lookup/staff-to-bus', async (req, res) => {
    const term = String(req.query.query || '').trim();
    if (!term) return res.status(400).json({ success: false, message: 'Please provide staff name or ID' });
    try {
        const [rows] = await req.app.locals.connection.promise().query(
            `${lookupSql} WHERE LOWER(t.role) = 'staff' AND (LOWER(t.name) LIKE LOWER(?) OR LOWER(t.rollno) LIKE LOWER(?)) ORDER BY t.name LIMIT 100`,
            [like(term), like(term)]
        );
        const results = rows.map(row => ({
            traveller_id: row.traveller_id, staff_name: row.name, rollno: row.rollno,
            role: 'Staff', branch: row.branch, stafftype: row.stafftype || 'Faculty', city: row.city,
            boarding_stop: row.stage_name || row.point || 'Campus Gate',
            dropoff_stop: row.city ? `${row.city} Main Stop` : 'College Campus',
            phone: row.phoneno, email: `${String(row.rollno || '').toLowerCase()}@nec.edu.in`,
            routeid: row.routeid, routename: row.routename || `Route ${row.routeid || 'N/A'}`,
            destination_city: row.destination_city || row.city, vehicleid: row.vehicleid || 'N/A',
            registrationno: row.registrationno || 'Pending Allocation', vehicletype: row.vehicletype || 'Bus',
            driver_name: row.driver_name || 'Assigned Driver', driver_phone: row.driver_phone || 'N/A'
        }));
        res.json({ success: true, count: results.length, results });
    } catch (error) { fail(res, error); }
});

router.get('/api/lookup/bus-to-students', async (req, res) => {
    const vehicleid = String(req.query.vehicleid || '').trim();
    if (!vehicleid) return res.status(400).json({ success: false, message: 'Please provide vehicleid' });
    try {
        const [vehicles] = await req.app.locals.connection.promise().query(
            `SELECT v.*, r.routename, r.city AS destination, d.staffname AS driver_name, d.mobileno AS driver_phone
             FROM vehicle v LEFT JOIN route r ON r.routeid = v.routeid LEFT JOIN driver d ON d.vehicleid = v.vehicleid
             WHERE v.vehicleid = ? OR LOWER(v.registrationno) = LOWER(?) LIMIT 1`, [vehicleid, vehicleid]
        );
        if (!vehicles.length) return res.json({ success: true, busInfo: null, totalPassengers: 0, students: [], staff: [] });
        const bus = vehicles[0];
        const [travellers] = await req.app.locals.connection.promise().query(
            'SELECT id, name, rollno, role, branch, year, city, stage_name, point, phoneno FROM traveller WHERE routeid = ? ORDER BY name',
            [bus.routeid]
        );
        const passengers = travellers.map(t => ({
            traveller_id: t.id, student_name: t.name, rollno: t.rollno, role: t.role,
            branch: t.branch, year: t.year, student_city: t.city,
            stage_name: t.stage_name || t.point, phoneno: t.phoneno,
            email: `${String(t.rollno || '').toLowerCase()}@nec.edu.in`
        }));
        const students = passengers.filter(p => normalize(p.role || 'Student') === 'student');
        const staff = passengers.filter(p => normalize(p.role) === 'staff');
        res.json({
            success: true,
            busInfo: {
                vehicleid: bus.vehicleid, registrationno: bus.registrationno, vehicletype: bus.vehicletype,
                seatcapacity: bus.seatcapacity, routeid: bus.routeid,
                routename: bus.routename || `Route ${bus.routeid || ''}`,
                destination: bus.destination || 'Campus', driver_name: bus.driver_name || 'Assigned Driver',
                driver_phone: bus.driver_phone || 'N/A'
            },
            totalPassengers: passengers.length, totalStudents: students.length,
            totalStaff: staff.length, students, staff, passengers
        });
    } catch (error) { fail(res, error); }
});

router.get('/api/lookup/stop-passengers', async (req, res) => {
    const stageName = String(req.query.stage_name || '').trim();
    try {
        const connection = req.app.locals.connection.promise();
        if (!stageName) {
            const [stages] = await connection.query('SELECT DISTINCT stagename FROM stage WHERE stagename IS NOT NULL ORDER BY stagename');
            return res.json({ success: true, availableStops: stages.map(s => s.stagename) });
        }
        const [rows] = await connection.query(
            `SELECT t.id, t.name, t.rollno, t.role, t.branch, t.year, t.city, t.stage_name, t.point,
                    t.phoneno, t.routeid, r.routename, v.vehicleid AS bus_id, v.registrationno AS bus_reg
             FROM traveller t LEFT JOIN route r ON r.routeid = t.routeid
             LEFT JOIN vehicle v ON v.routeid = t.routeid
             WHERE LOWER(COALESCE(t.stage_name, t.point, '')) LIKE LOWER(?) ORDER BY t.name`, [like(stageName)]
        );
        const passengers = rows.map(t => ({
            id: t.id, name: t.name, rollno: t.rollno, role: t.role, branch: t.branch, year: t.year,
            city: t.city, stage_name: t.stage_name || t.point, phone: t.phoneno,
            bus_id: t.bus_id || 'N/A', bus_reg: t.bus_reg || 'Unassigned', route_id: t.routeid,
            route_name: t.routename || `Route ${t.routeid || 'N/A'}`
        }));
        res.json({ success: true, stopName: stageName, totalBoardingPassengers: passengers.length, passengers });
    } catch (error) { fail(res, error); }
});

router.get('/api/maintenance', async (req, res) => {
    try {
        const records = await listRecords(req.app.locals.connection, 'maintenance');
        res.json({ success: true, count: records.length, maintenanceRecords: records });
    } catch (error) { fail(res, error); }
});

router.post('/api/maintenance', async (req, res) => {
    const body = req.body || {};
    if (!body.vehicleid || !body.service_type || !body.service_date) {
        return res.status(400).json({ success: false, message: 'Vehicle, service type, and service date are required' });
    }
    try {
        const record = await saveRecord(req.app.locals.connection, 'maintenance', `maintenance-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, {
            vehicleid: String(body.vehicleid), service_type: body.service_type, service_date: body.service_date,
            next_due_date: body.next_due_date || null, cost: Number(body.cost || 0),
            vendor: body.vendor || 'Authorized Service Station', status: body.status || 'Scheduled',
            remarks: body.remarks || 'Routine maintenance entry'
        });
        res.json({ success: true, message: 'Maintenance record added successfully!', record });
    } catch (error) { fail(res, error); }
});

router.put('/api/maintenance/:id', async (req, res) => {
    try {
        const connection = req.app.locals.connection.promise();
        const [rows] = await connection.query('SELECT id, record_key, payload FROM app_records WHERE id = ? AND record_type = ?', [req.params.id, 'maintenance']);
        if (!rows.length) return res.status(404).json({ success: false, message: 'Maintenance record not found' });
        const payload = typeof rows[0].payload === 'string' ? JSON.parse(rows[0].payload) : rows[0].payload;
        const updated = { ...payload, ...req.body };
        await updateRecord(req.app.locals.connection, 'maintenance', req.params.id, updated);
        res.json({ success: true, message: 'Maintenance record updated successfully!', record: { ...updated, id: Number(req.params.id) } });
    } catch (error) { fail(res, error); }
});

router.delete('/api/maintenance/:id', async (req, res) => {
    try {
        const deleted = await deleteRecord(req.app.locals.connection, 'maintenance', req.params.id);
        if (!deleted) return res.status(404).json({ success: false, message: 'Maintenance record not found' });
        res.json({ success: true, message: 'Maintenance record deleted successfully!' });
    } catch (error) { fail(res, error); }
});

router.get('/api/capacity-management', async (req, res) => {
    try {
        const [rows] = await req.app.locals.connection.promise().query(
            `SELECT v.vehicleid, v.registrationno, v.vehicletype, v.routeid, v.seatcapacity,
                    r.routename, r.city, (SELECT COUNT(*) FROM traveller t WHERE t.routeid = v.routeid) AS assignedPassengers
             FROM vehicle v LEFT JOIN route r ON r.routeid = v.routeid ORDER BY v.vehicleid`
        );
        const statuses = await listRecords(req.app.locals.connection, 'vehicle_status');
        const statusByVehicle = new Map(statuses.map(item => [String(item.vehicleid), item.status]));
        const capacities = rows.map(v => {
            const capacity = Number(v.seatcapacity) || 40;
            const assignedPassengers = Number(v.assignedPassengers) || 0;
            return {
                ...v, routeid: v.routeid || 'Unassigned', routename: v.routename || 'Unassigned', city: v.city || 'Depot',
                seatcapacity: capacity, assignedPassengers,
                occupancyRate: capacity ? Math.round(assignedPassengers / capacity * 100) : 0,
                availableSeats: Math.max(0, capacity - assignedPassengers),
                status: statusByVehicle.get(String(v.vehicleid)) || 'Active', overAllocated: assignedPassengers > capacity
            };
        });
        res.json({ success: true, capacities });
    } catch (error) { fail(res, error); }
});

router.post('/api/breakdown-replacement', async (req, res) => {
    const { broken_vehicleid, reason } = req.body || {};
    if (!broken_vehicleid) return res.status(400).json({ success: false, message: 'Please provide broken_vehicleid' });
    const connection = req.app.locals.connection;
    try {
        const [buses] = await connection.promise().query('SELECT * FROM vehicle WHERE vehicleid = ? LIMIT 1', [broken_vehicleid]);
        if (!buses.length) return res.status(404).json({ success: false, message: 'Vehicle not found' });
        const brokenBus = buses[0];
        const statuses = await listRecords(connection, 'vehicle_status');
        const [allVehicles] = await connection.promise().query('SELECT * FROM vehicle ORDER BY vehicleid');
        const busy = new Set(statuses.filter(x => ['Broken Down', 'In Service (Replacement)'].includes(x.status)).map(x => String(x.vehicleid)));
        const spare = allVehicles.find(v => String(v.vehicleid) !== String(brokenBus.vehicleid) && !busy.has(String(v.vehicleid)) && !v.routeid);
        if (!spare) return res.status(409).json({ success: false, message: 'No unassigned spare vehicle is available' });
        const [routes] = await connection.promise().query('SELECT routename FROM route WHERE routeid = ? LIMIT 1', [brokenBus.routeid]);
        const [travellers] = await connection.promise().query('SELECT name, rollno, phoneno FROM traveller WHERE routeid = ?', [brokenBus.routeid]);
        await connection.promise().beginTransaction();
        try {
            await connection.promise().query('UPDATE vehicle SET routeid = ? WHERE vehicleid = ?', [brokenBus.routeid, spare.vehicleid]);
            await saveRecord(connection, 'vehicle_status', brokenBus.vehicleid, { vehicleid: brokenBus.vehicleid, status: 'Broken Down' });
            await saveRecord(connection, 'vehicle_status', spare.vehicleid, { vehicleid: spare.vehicleid, status: 'In Service (Replacement)' });
            const message = `Bus ${brokenBus.vehicleid} (${brokenBus.registrationno}) on route ${brokenBus.routeid || 'N/A'} reported a breakdown (${reason || 'Technical issue'}). Replacement bus ${spare.vehicleid} (${spare.registrationno}) is assigned.`;
            const notification = await saveRecord(connection, 'bus_change_notification', `change-${Date.now()}`, {
                broken_vehicleid: String(brokenBus.vehicleid),
                broken_reg: brokenBus.registrationno,
                routeid: brokenBus.routeid,
                routename: routes[0]?.routename || `Route ${brokenBus.routeid || 'N/A'}`,
                old_vehicleid: `${brokenBus.vehicleid} (${brokenBus.registrationno})`,
                replacement_vehicleid: String(spare.vehicleid),
                replacement_reg: spare.registrationno,
                new_vehicleid: `${spare.vehicleid} (${spare.registrationno})`,
                reason: reason || 'Vehicle Breakdown',
                message,
                effective_date: new Date().toISOString().slice(0, 10),
                created_at: new Date().toISOString(),
                status: 'Active Breakdown',
                dispatch_status: 'Dispatched',
                notification_status: 'Sent (SMS & Email)',
                affectedPassengersCount: travellers.length
            });
            for (const passenger of travellers) {
                await saveNotification(connection, {
                    recipient: `${passenger.name} (${passenger.phoneno || passenger.rollno})`,
                    channel: 'Email & SMS',
                    subject: `Bus replacement notice - route ${brokenBus.routeid || 'N/A'}`,
                    message,
                    status: 'Queued',
                    sent_at: new Date().toISOString(),
                    vehicle_ref: `Bus #${brokenBus.vehicleid} ➔ #${spare.vehicleid}`,
                    routeid: brokenBus.routeid
                });
            }
            await connection.promise().commit();
            res.json({ success: true, message: `Bus ${brokenBus.vehicleid} marked broken down; replacement bus ${spare.vehicleid} assigned.`, replacementBus: spare, affectedPassengersCount: travellers.length, notification: { ...notification, routename: routes[0]?.routename } });
        } catch (error) {
            await connection.promise().rollback();
            throw error;
        }
    } catch (error) { fail(res, error); }
});

router.get('/api/notifications/bus-change', async (req, res) => {
    try {
        const changes = await listRecords(req.app.locals.connection, 'bus_change_notification');
        res.json({ success: true, count: changes.length, notifications: changes });
    } catch (error) { fail(res, error); }
});

router.get('/api/breakdown-history', async (req, res) => {
    try {
        const changes = await listRecords(req.app.locals.connection, 'bus_change_notification');
        res.json({ success: true, count: changes.length, breakdowns: changes });
    } catch (error) { fail(res, error); }
});

router.put('/api/breakdown-history/:id', async (req, res) => {
    try {
        const connection = req.app.locals.connection.promise();
        const [rows] = await connection.query('SELECT payload FROM app_records WHERE id = ? AND record_type = ?', [req.params.id, 'bus_change_notification']);
        if (!rows.length) return res.status(404).json({ success: false, message: 'Breakdown record not found' });
        const payload = typeof rows[0].payload === 'string' ? JSON.parse(rows[0].payload) : rows[0].payload;
        const updated = { ...payload, ...req.body };
        await updateRecord(req.app.locals.connection, 'bus_change_notification', req.params.id, updated);
        if (req.body.status === 'Resolved' && payload.broken_vehicleid) {
            await saveRecord(req.app.locals.connection, 'vehicle_status', payload.broken_vehicleid, { vehicleid: payload.broken_vehicleid, status: 'Active' });
        }
        res.json({ success: true, message: 'Breakdown record updated successfully!', record: { ...updated, id: Number(req.params.id) } });
    } catch (error) { fail(res, error); }
});

router.delete('/api/breakdown-history/:id', async (req, res) => {
    try {
        const deleted = await deleteRecord(req.app.locals.connection, 'bus_change_notification', req.params.id);
        if (!deleted) return res.status(404).json({ success: false, message: 'Breakdown record not found' });
        res.json({ success: true, message: 'Breakdown record deleted successfully!' });
    } catch (error) { fail(res, error); }
});

router.get('/api/dispatch-logs', async (req, res) => {
    try {
        const notices = await listRecords(req.app.locals.connection, 'notification');
        res.json({ success: true, count: notices.length, logs: notices });
    } catch (error) { fail(res, error); }
});

router.post('/api/dispatch-notifications', async (req, res) => {
    const { routeid, message } = req.body || {};
    if (!routeid) return res.status(400).json({ success: false, message: 'Please provide routeid' });
    try {
        const [passengers] = await req.app.locals.connection.promise().query('SELECT name, rollno, phoneno FROM traveller WHERE routeid = ?', [routeid]);
        for (const passenger of passengers) {
            await saveNotification(req.app.locals.connection, {
                recipient: `${passenger.name} (SMS: ${passenger.phoneno || 'N/A'})`, channel: 'Email & SMS',
                subject: `Transport notice - route ${routeid}`, message: message || 'Important transport notice for your assigned route.',
                status: 'Queued', sent_at: new Date().toISOString()
            });
        }
        res.json({ success: true, message: `Notification records saved for ${passengers.length} passengers on route ${routeid}.`, dispatchedCount: passengers.length });
    } catch (error) { fail(res, error); }
});

router.get('/api/complaints', async (req, res) => {
    try {
        let complaints = await listRecords(req.app.locals.connection, 'complaint');
        if (!complaints.length) {
            const seedComplaints = [
                {
                    user_name: 'Kani',
                    rollno: '2312043',
                    role: 'Student',
                    category: 'AC & Ventilation',
                    subject: 'AC cooling sluggish during afternoon return',
                    description: 'The air conditioning unit in Bus #1 requires cooling coil inspection. Airflow was weak during the 4:30 PM return trip.',
                    status: 'Pending',
                    admin_response: '',
                    submitted_at: '2026-10-24T16:45:00.000Z'
                },
                {
                    user_name: 'Dr. S. Sundararajan',
                    rollno: 'EMP-1042',
                    role: 'Staff',
                    category: 'Schedule & Delay',
                    subject: 'Morning pickup delay at Kovilpatti Old Bus Stand',
                    description: 'Bus #3 arrived 15 minutes late at Kovilpatti Old Bus Stand stop due to unexpected traffic near railway gate.',
                    status: 'In Progress',
                    admin_response: 'Driver advised to start 10 minutes earlier from the depot to bypass railway crossing congestion.',
                    submitted_at: '2026-10-25T08:30:00.000Z'
                },
                {
                    user_name: 'Ram',
                    rollno: '2312063',
                    role: 'Student',
                    category: 'Seat & Upholstery',
                    subject: 'Damaged armrest on Seat 14',
                    description: 'Seat 14 right-side armrest is loose and requires screw tightening.',
                    status: 'Resolved',
                    admin_response: 'Work order assigned to maintenance depot. Armrest repaired and inspected.',
                    submitted_at: '2026-10-23T11:20:00.000Z'
                },
                {
                    user_name: 'Krish',
                    rollno: '2313010',
                    role: 'Student',
                    category: 'Driver Behavior',
                    subject: 'Appreciation for punctual departure and smooth driving',
                    description: 'Driver Mr. Samy was very patient and ensured all students boarded safely during heavy rain.',
                    status: 'Resolved',
                    admin_response: 'Commendation noted in driver service record. Thank you for the positive feedback.',
                    submitted_at: '2026-10-22T17:15:00.000Z'
                },
                {
                    user_name: 'Vasanth',
                    rollno: '2312044',
                    role: 'Student',
                    category: 'Safety & Speeding',
                    subject: 'Speed sensor warning on NH44 stretch',
                    description: 'Bus exceeded 60 km/h briefly near Sattur toll gate. Kindly review GPS telemetry speed limits.',
                    status: 'In Progress',
                    admin_response: 'Speed governor telemetry reviewed with fleet manager. Driver cautioned.',
                    submitted_at: '2026-10-26T09:10:00.000Z'
                },
                {
                    user_name: 'Prof. M. Meenakshi',
                    rollno: 'EMP-2105',
                    role: 'Staff',
                    category: 'General Suggestion',
                    subject: 'Request for additional evening departure at 6:15 PM',
                    description: 'Many lab and project students remain on campus till 6:00 PM. A late evening shuttle to Kovilpatti would be helpful.',
                    status: 'Pending',
                    admin_response: '',
                    submitted_at: '2026-10-27T10:05:00.000Z'
                }
            ];
            for (const item of seedComplaints) {
                await saveRecord(req.app.locals.connection, 'complaint', `complaint-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, item);
            }
            complaints = await listRecords(req.app.locals.connection, 'complaint');
        }
        res.json({ success: true, count: complaints.length, complaints });
    } catch (error) { fail(res, error); }
});

router.post('/api/complaints', async (req, res) => {
    const body = req.body || {};
    if (!String(body.description || '').trim()) return res.status(400).json({ success: false, message: 'Complaint description is required' });
    try {
        const complaint = await saveRecord(req.app.locals.connection, 'complaint', `complaint-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, {
            user_name: body.user_name || 'Anonymous Student/Staff', rollno: body.rollno || null,
            role: body.role || 'Student', category: body.category || 'General',
            subject: body.subject || 'Transport Feedback', description: body.description,
            status: 'Pending', admin_response: '', submitted_at: new Date().toISOString()
        });
        res.json({ success: true, message: 'Complaint submitted successfully!', complaint });
    } catch (error) { fail(res, error); }
});

router.put('/api/complaints/:id', async (req, res) => {
    try {
        const connection = req.app.locals.connection.promise();
        const [rows] = await connection.query('SELECT payload FROM app_records WHERE id = ? AND record_type = ?', [req.params.id, 'complaint']);
        if (!rows.length) return res.status(404).json({ success: false, message: 'Complaint not found' });
        const payload = typeof rows[0].payload === 'string' ? JSON.parse(rows[0].payload) : rows[0].payload;
        const updated = { ...payload, ...(req.body.status !== undefined ? { status: req.body.status } : {}), ...(req.body.admin_response !== undefined ? { admin_response: req.body.admin_response } : {}) };
        await updateRecord(req.app.locals.connection, 'complaint', req.params.id, updated);
        res.json({ success: true, message: 'Complaint status updated successfully!', complaint: { ...updated, id: Number(req.params.id) } });
    } catch (error) { fail(res, error); }
});

router.delete('/api/complaints/:id', async (req, res) => {
    try {
        const deleted = await deleteRecord(req.app.locals.connection, 'complaint', req.params.id);
        if (!deleted) return res.status(404).json({ success: false, message: 'Complaint record not found' });
        res.json({ success: true, message: 'Complaint record deleted successfully!' });
    } catch (error) { fail(res, error); }
});

router.get('/api/centralized-dashboard-stats', async (req, res) => {
    try {
        const connection = req.app.locals.connection.promise();
        const [counts] = await connection.query(`
            SELECT
              (SELECT COUNT(*) FROM vehicle) AS totalBuses,
              (SELECT COUNT(*) FROM route) AS activeRoutes,
              (SELECT COUNT(*) FROM driver) AS totalDrivers,
              (SELECT COUNT(*) FROM traveller) AS totalPassengers,
              (SELECT COUNT(*) FROM stage) AS totalStages
        `);
        const [maintenance, complaints, changes, statuses] = await Promise.all([
            listRecords(req.app.locals.connection, 'maintenance'),
            listRecords(req.app.locals.connection, 'complaint'),
            listRecords(req.app.locals.connection, 'bus_change_notification'),
            listRecords(req.app.locals.connection, 'vehicle_status')
        ]);
        res.json({
            success: true,
            stats: {
                ...counts[0], totalBuses: Number(counts[0].totalBuses), activeRoutes: Number(counts[0].activeRoutes),
                totalDrivers: Number(counts[0].totalDrivers), totalPassengers: Number(counts[0].totalPassengers),
                totalStages: Number(counts[0].totalStages),
                activeMaintenances: maintenance.filter(m => m.status !== 'Completed').length,
                pendingComplaints: complaints.filter(c => c.status === 'Pending').length,
                brokenBusesCount: statuses.filter(s => s.status === 'Broken Down').length
            },
            recentComplaints: complaints.slice(0, 5), recentMaintenances: maintenance.slice(0, 5),
            recentNotifications: changes.slice(0, 5)
        });
    } catch (error) { fail(res, error); }
});

module.exports = router;
