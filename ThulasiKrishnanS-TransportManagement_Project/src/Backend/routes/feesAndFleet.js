const express = require('express');
const router = express.Router();
const {
    listRecords, getRecord, saveRecord, updateRecord, deleteRecord, saveNotification
} = require('../dbRecords');

const normalize = (value) => String(value || '').trim().toLowerCase();
const todayString = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};
const addDaysToDate = (dateString, days) => {
    const date = new Date(`${dateString}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
};
const fail = (res, error) => {
    console.error('Fees/fleet database error:', error.message);
    return res.status(500).json({ success: false, message: 'Database request failed' });
};
const connectionOf = (req) => req.app.locals.connection;

async function recordById(connection, type, id) {
    const [rows] = await connection.promise().query(
        'SELECT id, record_key, payload FROM app_records WHERE id = ? AND record_type = ? LIMIT 1', [id, type]
    );
    if (!rows.length) return null;
    const payload = typeof rows[0].payload === 'string' ? JSON.parse(rows[0].payload) : rows[0].payload;
    return { ...payload, id: Number(rows[0].id), record_key: rows[0].record_key };
}

async function vehicleDetails(connection, vehicleid) {
    const [rows] = await connection.promise().query(
        `SELECT v.*, r.routename, r.city, d.staffname AS driver_name, d.mobileno AS driver_phone
         FROM vehicle v LEFT JOIN route r ON r.routeid = v.routeid
         LEFT JOIN driver d ON d.vehicleid = v.vehicleid WHERE v.vehicleid = ? LIMIT 1`, [vehicleid]
    );
    return rows[0] || null;
}

async function routeFeeMap(connection) {
    const routeFees = await listRecords(connection, 'bus_route_fee');
    return new Map(routeFees.map((item) => [String(item.routeid || item.record_key), Number(item.fee_amount) || 0]));
}

async function travellerFeeRoster(connection) {
    const [travellers] = await connection.promise().query(`
        SELECT t.id AS traveller_id, t.name AS student_name, t.rollno, t.role, t.branch, t.year,
               t.city, t.routeid, t.stage_name, t.point, r.routename, vm.busno, t.phoneno
        FROM traveller t
        LEFT JOIN route r ON r.routeid = t.routeid
        LEFT JOIN (
            SELECT routeid, MIN(vehicleid) AS busno
            FROM (SELECT routeid, vehicleid FROM vehicle WHERE routeid IS NOT NULL GROUP BY routeid, vehicleid) distinct_vehicles
            GROUP BY routeid
        ) vm ON vm.routeid = t.routeid
        WHERE t.routeid IS NOT NULL AND t.routeid <> '' AND LOWER(COALESCE(t.role, 'student')) <> 'staff'
        ORDER BY t.name
    `);
    return travellers;
}

async function materializeFeeRoster(connection) {
    const routeFees = await routeFeeMap(connection);
    const existingFees = await listRecords(connection, 'bus_fee');
    const feeByRoll = new Map(existingFees.map((fee) => [String(fee.rollno || fee.record_key).toLowerCase(), fee]));
    const travellers = await travellerFeeRoster(connection);
    const roster = [];
    for (const traveller of travellers) {
        const key = String(traveller.rollno || '').trim();
        if (!key) continue;
        const existing = feeByRoll.get(key.toLowerCase());
        const configuredFee = routeFees.get(String(traveller.routeid));
        const totalFee = configuredFee || Number(existing?.total_fee) || 0;
        if (totalFee > 0) {
            const paid = Math.min(totalFee, Number(existing?.paid_amount) || 0);
            const pending = Math.max(0, totalFee - paid);
            const fee = {
                ...(existing || {}), traveller_id: traveller.traveller_id,
                student_name: traveller.student_name, rollno: key, role: traveller.role || 'Student',
                branch: traveller.branch, year: traveller.year, city: traveller.city,
                routeid: traveller.routeid, routename: traveller.routename,
                stage_name: traveller.stage_name || traveller.point, busno: traveller.busno,
                phoneno: traveller.phoneno, total_fee: totalFee, paid_amount: paid,
                pending_amount: pending, status: pending === 0 ? 'Paid' : paid > 0 ? 'Partial' : 'Pending'
            };
            if (!existing || Number(existing.total_fee) !== totalFee || Number(existing.traveller_id) !== Number(traveller.traveller_id)) {
                const saved = await saveRecord(connection, 'bus_fee', key, fee);
                roster.push(saved);
            } else {
                roster.push({ ...fee, id: existing.id, record_key: existing.record_key });
            }
        } else {
            roster.push({
                ...(existing || {}), traveller_id: traveller.traveller_id, student_name: traveller.student_name,
                rollno: key, role: traveller.role || 'Student', branch: traveller.branch, year: traveller.year,
                city: traveller.city, routeid: traveller.routeid, routename: traveller.routename,
                stage_name: traveller.stage_name || traveller.point, busno: traveller.busno,
                phoneno: traveller.phoneno, total_fee: 0, paid_amount: 0, pending_amount: 0,
                status: 'Fee Not Set'
            });
        }
    }
    return roster;
}

async function saveRouteFee(connection, routeid, feeAmount) {
    const fee = Number(feeAmount);
    if (!Number.isFinite(fee) || fee <= 0) throw new Error('Enter a route fee greater than zero');
    const [[route]] = await connection.promise().query('SELECT routeid, routename, city FROM route WHERE routeid = ? LIMIT 1', [routeid]);
    if (!route) throw new Error('Route was not found');
    await saveRecord(connection, 'bus_route_fee', routeid, {
        routeid, routename: route.routename, city: route.city, fee_amount: fee
    });
}

function buildSeats(capacity) {
    const seats = [];
    const columns = ['A', 'B', 'C', 'D'];
    const frontSeatCount = Math.max(0, capacity - 5);
    for (let index = 0; index < frontSeatCount; index += 1) {
        const column = columns[index % columns.length];
        const row = Math.floor(index / columns.length) + 1;
        seats.push({
            seat_no: `${row}${column}`, row, column,
            position: column === 'A' || column === 'D' ? 'Window' : 'Aisle',
            side: column === 'A' || column === 'B' ? 'Left' : 'Right',
            is_rear_bench: false, is_occupied: false
        });
    }
    ['R1', 'R2', 'R3', 'R4', 'R5'].forEach((seat_no, index) => seats.push({
        seat_no, row: rows + 1, column: `Rear-${index + 1}`,
        position: index === 0 || index === 4 ? 'Window' : 'Middle',
        side: 'Center Back', is_rear_bench: true, is_occupied: false
    }));
    return seats;
}

async function seatingFor(connection, vehicle) {
    let seating = await getRecord(connection, 'bus_seating', vehicle.vehicleid);
    const capacity = Number(vehicle.seatcapacity) || 40;
    if (!seating) {
        seating = {
            vehicleid: String(vehicle.vehicleid), registrationno: vehicle.registrationno,
            vehicletype: vehicle.vehicletype, capacity, routeid: vehicle.routeid,
            routename: vehicle.routename || `Route ${vehicle.routeid || ''}`,
            seats: buildSeats(capacity)
        };
    } else if (Array.isArray(seating.seats) && seating.seats.length < capacity) {
        const oldSeats = new Map(seating.seats.map((seat) => [seat.seat_no, seat]));
        seating.seats = buildSeats(capacity).map((seat) => ({ ...seat, ...(oldSeats.get(seat.seat_no) || {}) }));
        seating.capacity = capacity;
    }
    return seating;
}

function putPassengerInSeat(seat, passenger) {
    Object.assign(seat, {
        is_occupied: true, traveller_id: passenger.id, passenger_name: passenger.name,
        rollno: passenger.rollno, role: passenger.role, branch: passenger.branch,
        year: passenger.year, stage_name: passenger.stage_name || passenger.point || 'Campus Gate',
        phoneno: passenger.phoneno, allocated_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
    });
}
function clearSeat(seat) {
    for (const key of ['traveller_id', 'passenger_name', 'rollno', 'role', 'branch', 'year', 'stage_name', 'phoneno', 'allocated_at']) delete seat[key];
    seat.is_occupied = false;
}

// Bus fee records
router.get('/api/bus-route-fees', async (req, res) => {
    try {
        const connection = connectionOf(req);
        const [routes] = await connection.promise().query('SELECT routeid, routename, city FROM route ORDER BY city, routename');
        const fees = await routeFeeMap(connection);
        res.json({ success: true, routes: routes.map((route) => ({ ...route, fee_amount: fees.get(String(route.routeid)) || 0 })) });
    } catch (error) { fail(res, error); }
});

router.put('/api/bus-route-fees/:routeid', async (req, res) => {
    try {
        const connection = connectionOf(req);
        await saveRouteFee(connection, req.params.routeid, req.body?.fee_amount);
        const roster = await materializeFeeRoster(connection);
        res.json({ success: true, message: 'Route bus fee saved.', count: roster.filter((fee) => String(fee.routeid) === String(req.params.routeid)).length });
    } catch (error) {
        const status = /Route was not found|greater than zero/.test(error.message) ? 400 : 500;
        res.status(status).json({ success: false, message: error.message });
    }
});

router.get('/api/bus-fees', async (req, res) => {
    try {
        const connection = connectionOf(req);
        const fees = await materializeFeeRoster(connection);
        const { routeid, status, year, branch, search } = req.query;
        const term = normalize(search);
        const filtered = fees.filter(f =>
            (!routeid || String(f.routeid) === String(routeid)) &&
            (!status || status === 'All' || normalize(f.status) === normalize(status)) &&
            (!year || year === 'All' || normalizeYear(f.year) === normalizeYear(year)) &&
            (!branch || branch === 'All' || f.branch === branch) &&
            (!term || [f.student_name, f.rollno, f.receipt_no, f.stage_name].some(value => normalize(value).includes(term)))
        );
        const totalFeesAssessed = fees.reduce((sum, f) => sum + Number(f.total_fee || 0), 0);
        const totalPaid = fees.reduce((sum, f) => sum + Number(f.paid_amount || 0), 0);
        const totalPending = fees.reduce((sum, f) => sum + Number(f.pending_amount || 0), 0);
        res.json({
            success: true, count: filtered.length,
            summary: {
                totalFeesAssessed, totalPaid, totalPending,
                collectionRate: totalFeesAssessed ? Math.round(totalPaid / totalFeesAssessed * 100) : 0,
                defaultersCount: fees.filter(f => Number(f.pending_amount) > 0).length,
                criticalOverdueCount: fees.filter(f => f.status === 'Overdue').length
            },
            fees: filtered
        });
    } catch (error) { fail(res, error); }
});

const normalizeYear = (value) => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

router.post('/api/bus-fees/reconcile-paid-list', async (req, res) => {
    const records = req.body?.records;
    if (!Array.isArray(records)) return res.status(400).json({ success: false, message: 'Paid student rows are required' });
    try {
        const connection = connectionOf(req);
        const routeFees = await routeFeeMap(connection);
        const roster = await travellerFeeRoster(connection);
        const validPaidRows = records.filter((row) => {
            const status = normalize(row.status);
            return !status || status === 'paid' || status === 'partial';
        });
        const invalidPartial = validPaidRows.find((row) => normalize(row.status) === 'partial' && (row.paid_amount === undefined || row.paid_amount === null || String(row.paid_amount).trim() === ''));
        if (invalidPartial) return res.status(400).json({ success: false, message: `Paid Amount is required for partial payment: ${invalidPartial.rollno}` });
        const paidRows = new Map(validPaidRows.map((row) => [String(row.rollno || '').trim().toLowerCase(), row]).filter(([rollno]) => rollno));
        let markedPaid = 0;
        let markedPending = 0;
        let skippedNoRouteFee = 0;
        for (const traveller of roster) {
            const rollno = String(traveller.rollno || '').trim();
            if (!rollno) continue;
            const key = rollno.toLowerCase();
            const input = paidRows.get(key);
            const existing = await getRecord(connection, 'bus_fee', rollno);
            const inputTotal = Number(input?.total_fee) || 0;
            const total = routeFees.get(String(traveller.routeid)) || inputTotal || Number(existing?.total_fee) || 0;
            if (total <= 0) { skippedNoRouteFee++; continue; }
            let paid = 0;
            if (input) {
                const statedPaid = input.paid_amount;
                paid = statedPaid === '' || statedPaid === undefined || statedPaid === null
                    ? total
                    : Math.max(0, Math.min(total, Number(statedPaid) || 0));
            }
            const pending = Math.max(0, total - paid);
            const fee = {
                ...(existing || {}), traveller_id: traveller.traveller_id, student_name: traveller.student_name,
                rollno, role: traveller.role || 'Student', branch: traveller.branch, year: traveller.year,
                city: traveller.city, routeid: traveller.routeid, routename: traveller.routename,
                stage_name: traveller.stage_name || traveller.point, busno: traveller.busno,
                phoneno: traveller.phoneno, total_fee: total, paid_amount: paid, pending_amount: pending,
                status: pending === 0 ? 'Paid' : paid > 0 ? 'Partial' : 'Pending',
                payment_mode: input?.payment_mode || (input ? 'Imported paid list' : null),
                receipt_no: input?.receipt_no || existing?.receipt_no || null,
                last_payment_date: input?.last_payment_date || (input ? todayString() : null)
            };
            await saveRecord(connection, 'bus_fee', rollno, fee);
            if (paid >= total) markedPaid++; else markedPending++;
        }
        res.json({ success: true, message: `Paid list matched: ${markedPaid} paid, ${markedPending} pending, ${skippedNoRouteFee} skipped because no route fee is configured.`, markedPaid, markedPending, skippedNoRouteFee });
    } catch (error) { fail(res, error); }
});

router.post('/api/bus-fees/pay', async (req, res) => {
    const { id, amount, payment_mode, notes } = req.body || {};
    const payAmount = Number(amount);
    if (!Number.isFinite(payAmount) || payAmount <= 0) return res.status(400).json({ success: false, message: 'Payment amount must be greater than zero' });
    try {
        const connection = connectionOf(req);
        const fee = await recordById(connection, 'bus_fee', id);
        if (!fee) return res.status(404).json({ success: false, message: 'Fee record not found' });
        const totalFee = Number(fee.total_fee || 0);
        const paidAmount = Number(fee.paid_amount || 0) + payAmount;
        const pending = Math.max(0, totalFee - paidAmount);
        const receipt = `REC-${new Date().getFullYear()}-${String(Date.now()).slice(-7)}`;
        const updated = {
            ...fee, paid_amount: paidAmount, pending_amount: pending,
            status: pending === 0 ? 'Paid' : 'Partial', payment_mode: payment_mode || 'Cash',
            receipt_no: receipt, last_payment_date: todayString(), last_payment_notes: notes || null
        };
        await updateRecord(connection, 'bus_fee', id, updated);
        await saveNotification(connection, {
            recipient: `${fee.student_name || fee.rollno} (${fee.phoneno || 'no phone'})`, channel: 'Payment receipt',
            subject: `Payment receipt ${receipt}`,
            message: `Payment of ${payAmount} recorded. Remaining balance: ${pending}. Receipt: ${receipt}.`,
            status: 'Queued', sent_at: new Date().toISOString()
        });
        res.json({ success: true, message: `Payment recorded successfully.`, receipt_no: receipt, fee: updated });
    } catch (error) { fail(res, error); }
});

router.post('/api/bus-fees/send-reminder', async (req, res) => {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(Number) : (req.body?.id ? [Number(req.body.id)] : []);
    if (!ids.length) return res.status(400).json({ success: false, message: 'No student fee IDs provided' });
    try {
        const connection = connectionOf(req);
        const fees = await listRecords(connection, 'bus_fee');
        const byId = new Map(fees.map(f => [Number(f.id), f]));
        let dispatchedCount = 0;
        for (const id of ids) {
            const fee = byId.get(id);
            if (!fee || Number(fee.pending_amount) <= 0) continue;
            await saveNotification(connection, {
                recipient: `${fee.student_name || fee.rollno} (${fee.phoneno || 'no phone'})`, channel: 'Fee reminder',
                subject: `Transport fee due: ${fee.pending_amount}`,
                message: req.body.custom_message || `Your bus transport fee balance of ${fee.pending_amount} is pending. Due date: ${fee.due_date || 'not specified'}.`,
                status: 'Queued', sent_at: new Date().toISOString()
            });
            dispatchedCount++;
        }
        res.json({ success: true, message: `Reminder records saved for ${dispatchedCount} student(s).`, dispatchedCount });
    } catch (error) { fail(res, error); }
});

router.post('/api/bus-fees/bulk-import', async (req, res) => {
    const records = req.body?.records;
    if (!Array.isArray(records) || !records.length) return res.status(400).json({ success: false, message: 'No records provided for import' });
    try {
        const connection = connectionOf(req);
        let updatedCount = 0;
        let addedCount = 0;
        for (const input of records) {
            const rollno = String(input.rollno || '').trim();
            if (!rollno && !input.student_name) continue;
            let traveller = null;
            if (rollno) {
                const [rows] = await connection.promise().query('SELECT * FROM traveller WHERE rollno = ? LIMIT 1', [rollno]);
                traveller = rows[0] || null;
            }
            const key = rollno || `import-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
            const existing = await getRecord(connection, 'bus_fee', key);
            const total = input.total_fee !== undefined ? Number(input.total_fee) : Number(existing?.total_fee || 20000);
            const paid = input.paid_amount !== undefined ? Number(input.paid_amount) : Number(existing?.paid_amount || 0);
            const pending = Math.max(0, total - paid);
            const fee = {
                ...(existing || {}), traveller_id: traveller?.id || existing?.traveller_id || null,
                student_name: traveller?.name || input.student_name || existing?.student_name || 'Imported Student',
                rollno: rollno || existing?.rollno || null, role: traveller?.role || existing?.role || 'Student',
                branch: traveller?.branch || input.branch || existing?.branch || null,
                year: traveller?.year || input.year || existing?.year || null,
                city: traveller?.city || input.city || existing?.city || null,
                routeid: traveller?.routeid || input.routeid || existing?.routeid || null,
                routename: input.routename || existing?.routename || null,
                stage_name: traveller?.stage_name || traveller?.point || input.stage_name || existing?.stage_name || null,
                total_fee: total, paid_amount: paid, pending_amount: pending,
                due_date: input.due_date || existing?.due_date || null,
                status: pending === 0 ? 'Paid' : paid > 0 ? 'Partial' : 'Pending',
                payment_mode: input.payment_mode || existing?.payment_mode || null,
                receipt_no: input.receipt_no || existing?.receipt_no || null,
                last_payment_date: input.last_payment_date || existing?.last_payment_date || null,
                phoneno: traveller?.phoneno || input.phoneno || existing?.phoneno || null,
                email: input.email || existing?.email || null,
                parent_phone: input.parent_phone || existing?.parent_phone || null
            };
            await saveRecord(connection, 'bus_fee', key, fee);
            if (existing) updatedCount++; else addedCount++;
        }
        res.json({ success: true, message: `Import processed: ${updatedCount} updated, ${addedCount} added.`, updatedCount, addedCount });
    } catch (error) { fail(res, error); }
});

// Seat plans are stored per vehicle in MySQL; passenger and vehicle details are read from relational tables.
router.get('/api/bus-seating/:vehicleid', async (req, res) => {
    try {
        const connection = connectionOf(req);
        const vehicle = await vehicleDetails(connection, req.params.vehicleid);
        if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });
        const seating = await seatingFor(connection, vehicle);
        const [travellers] = await connection.promise().query('SELECT * FROM traveller WHERE routeid = ? ORDER BY name', [vehicle.routeid]);
        const occupied = new Set(seating.seats.filter(s => s.is_occupied).map(s => Number(s.traveller_id)));
        const unassignedPassengers = travellers.filter(t => !occupied.has(Number(t.id)));
        const occupiedCount = seating.seats.filter(s => s.is_occupied).length;
        const totalSeats = seating.seats.length;
        res.json({
            success: true,
            vehicle: {
                vehicleid: vehicle.vehicleid, registrationno: vehicle.registrationno, vehicletype: vehicle.vehicletype,
                seatcapacity: seating.capacity, routeid: vehicle.routeid, routename: vehicle.routename || `Route ${vehicle.routeid || ''}`,
                city: vehicle.city || 'Campus Depot', driver_name: vehicle.driver_name || 'Assigned Driver',
                driver_phone: vehicle.driver_phone || 'N/A'
            },
            metrics: { totalSeats, occupiedCount, availableCount: totalSeats - occupiedCount, occupancyRate: totalSeats ? Math.round(occupiedCount / totalSeats * 100) : 0 },
            seats: seating.seats, unassignedPassengers
        });
    } catch (error) { fail(res, error); }
});

router.post('/api/bus-seating/allocate', async (req, res) => {
    const { vehicleid, seat_no, traveller_id } = req.body || {};
    try {
        const connection = connectionOf(req);
        const vehicle = await vehicleDetails(connection, vehicleid);
        if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });
        const seating = await seatingFor(connection, vehicle);
        const seat = seating.seats.find(item => item.seat_no === seat_no);
        if (!seat) return res.status(404).json({ success: false, message: `Seat ${seat_no} not found` });
        const [rows] = await connection.promise().query('SELECT * FROM traveller WHERE id = ? LIMIT 1', [traveller_id]);
        const passenger = rows[0];
        if (!passenger) return res.status(404).json({ success: false, message: 'Passenger not found' });
        if (String(passenger.routeid) !== String(vehicle.routeid)) return res.status(400).json({ success: false, message: 'Passenger is not assigned to this vehicle route' });
        if (seat.is_occupied && Number(seat.traveller_id) !== Number(passenger.id)) return res.status(409).json({ success: false, message: 'Seat is already occupied' });
        seating.seats.forEach(item => { if (Number(item.traveller_id) === Number(passenger.id)) clearSeat(item); });
        putPassengerInSeat(seat, passenger);
        const saved = await saveRecord(connection, 'bus_seating', vehicleid, seating);
        res.json({ success: true, message: `Seat ${seat_no} allocated to ${passenger.name} (${passenger.rollno}).`, seat, seating: saved });
    } catch (error) { fail(res, error); }
});

router.post('/api/bus-seating/deallocate', async (req, res) => {
    const { vehicleid, seat_no } = req.body || {};
    try {
        const connection = connectionOf(req);
        const vehicle = await vehicleDetails(connection, vehicleid);
        if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });
        const seating = await seatingFor(connection, vehicle);
        const seat = seating.seats.find(item => item.seat_no === seat_no);
        if (!seat) return res.status(404).json({ success: false, message: `Seat ${seat_no} not found` });
        const previousPassenger = seat.passenger_name || 'Passenger';
        clearSeat(seat);
        await saveRecord(connection, 'bus_seating', vehicleid, seating);
        res.json({ success: true, message: `Seat ${seat_no} is now available (previously assigned to ${previousPassenger}).`, seat });
    } catch (error) { fail(res, error); }
});

router.post('/api/bus-seating/auto-allocate', async (req, res) => {
    const { vehicleid } = req.body || {};
    try {
        const connection = connectionOf(req);
        const vehicle = await vehicleDetails(connection, vehicleid);
        if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });
        const seating = await seatingFor(connection, vehicle);
        const [passengers] = await connection.promise().query('SELECT * FROM traveller WHERE routeid = ? ORDER BY name', [vehicle.routeid]);
        const assigned = new Set(seating.seats.filter(s => s.is_occupied).map(s => Number(s.traveller_id)));
        const available = seating.seats.filter(s => !s.is_occupied);
        let allocatedCount = 0;
        for (const passenger of passengers) {
            if (assigned.has(Number(passenger.id)) || !available.length) continue;
            putPassengerInSeat(available.shift(), passenger);
            allocatedCount++;
        }
        await saveRecord(connection, 'bus_seating', vehicleid, seating);
        res.json({ success: true, message: `Auto-allocated ${allocatedCount} passenger(s).`, allocatedCount });
    } catch (error) { fail(res, error); }
});

// Bus washing schedule records
router.get('/api/bus-washing/today', async (req, res) => {
    try {
        const date = todayString();
        const schedules = (await listRecords(connectionOf(req), 'bus_washing')).filter(item => item.scheduled_date === date);
        res.json({ success: true, date, count: schedules.length, summary: {
            totalToday: schedules.length,
            completedToday: schedules.filter(w => w.status === 'Completed').length,
            inProgressToday: schedules.filter(w => w.status === 'In Progress').length,
            scheduledToday: schedules.filter(w => w.status === 'Scheduled').length
        }, buses: schedules });
    } catch (error) { fail(res, error); }
});

router.get('/api/bus-washing', async (req, res) => {
    try {
        const connection = connectionOf(req);
        const [vehicles] = await connection.promise().query(
            `SELECT v.vehicleid, v.registrationno, v.routeid, r.routename
             FROM vehicle v LEFT JOIN route r ON r.routeid = v.routeid
             ORDER BY v.vehicleid`
        );
        const records = await listRecords(connection, 'bus_washing');
        const list = [];
        for (const [index, vehicle] of vehicles.entries()) {
            const existing = records.find((item) => String(item.vehicleid) === String(vehicle.vehicleid));
            if (!existing) {
                const scheduledDate = addDaysToDate(todayString(), index);
                const key = `wash-cycle-${vehicle.vehicleid}`;
                list.push(await saveRecord(connection, 'bus_washing', key, {
                    vehicleid: String(vehicle.vehicleid), registrationno: vehicle.registrationno,
                    routeid: vehicle.routeid, routename: vehicle.routename || `Route ${vehicle.routeid || ''}`,
                    wash_type: 'Basic Bus Wash', scheduled_date: scheduledDate,
                    status: 'Scheduled', next_scheduled_date: scheduledDate,
                    completed_at: null, last_completed_at: null,
                    cycle_initialized: true,
                    remarks: 'Recurring wash every 30 days'
                }));
                continue;
            }

            const current = { ...existing, registrationno: vehicle.registrationno, routeid: vehicle.routeid, routename: vehicle.routename || `Route ${vehicle.routeid || ''}` };
            if (current.status === 'Completed') {
                const completedDate = String(current.completed_at || current.scheduled_date || todayString()).slice(0, 10);
                current.last_completed_at = current.completed_at || current.last_completed_at || null;
                current.scheduled_date = addDaysToDate(completedDate, 30);
                current.next_scheduled_date = current.scheduled_date;
                current.status = 'Scheduled';
                current.cycle_initialized = true;
                await updateRecord(connection, 'bus_washing', current.id, current);
            } else if (!current.cycle_initialized) {
                current.scheduled_date = addDaysToDate(todayString(), index);
                current.next_scheduled_date = current.scheduled_date;
                current.status = 'Scheduled';
                current.cycle_initialized = true;
                await updateRecord(connection, 'bus_washing', current.id, current);
            }
            list.push(current);
        }
        const date = todayString();
        const { status, vehicleid, today } = req.query;
        const filtered = list.filter(w =>
            (!(today === 'true' || today === true) || w.scheduled_date === date) &&
            (!status || status === 'All' || normalize(w.status) === normalize(status)) &&
            (!vehicleid || vehicleid === 'All' || String(w.vehicleid) === String(vehicleid))
        );
        const todayList = list.filter(w => w.scheduled_date === date);
        res.json({ success: true, count: filtered.length, todayDate: date, summary: {
            totalWashes: list.length, totalToday: todayList.length,
            totalTodayCompleted: todayList.filter(w => w.status === 'Completed').length,
            todayInProgress: todayList.filter(w => w.status === 'In Progress').length,
            todayScheduled: todayList.filter(w => w.status === 'Scheduled').length,
            inProgress: list.filter(w => w.status === 'In Progress').length,
            scheduledUpcoming: list.filter(w => w.status === 'Scheduled').length,
            totalCompleted: list.filter(w => w.status === 'Completed').length
        }, schedules: filtered });
    } catch (error) { fail(res, error); }
});

router.post('/api/bus-washing', async (req, res) => {
    const body = req.body || {};
    if (!body.vehicleid) return res.status(400).json({ success: false, message: 'Please provide vehicleid' });
    try {
        const connection = connectionOf(req);
        const vehicle = await vehicleDetails(connection, body.vehicleid);
        if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });
        const scheduledDate = body.scheduled_date || todayString();
        const nextDate = addDaysToDate(scheduledDate, 30);
        const key = `wash-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const record = await saveRecord(connection, 'bus_washing', key, {
            vehicleid: String(vehicle.vehicleid), registrationno: vehicle.registrationno,
            routeid: vehicle.routeid, routename: vehicle.routename || `Route ${vehicle.routeid || ''}`,
            wash_type: 'Basic Bus Wash', scheduled_date: scheduledDate,
            scheduled_time: body.scheduled_time || '10:00 AM',
            service_bay: body.service_bay || null, cleaner_incharge: body.cleaner_incharge || null,
            status: 'Scheduled', next_scheduled_date: nextDate,
            remarks: body.remarks || 'Recurring wash every 30 days', completed_at: null, last_completed_at: null, cycle_initialized: true
        });
        res.json({ success: true, message: `Bus ${vehicle.vehicleid} wash scheduled for ${scheduledDate}.`, record });
    } catch (error) { fail(res, error); }
});

router.put('/api/bus-washing/:id', async (req, res) => {
    try {
        const connection = connectionOf(req);
        const record = await recordById(connection, 'bus_washing', req.params.id);
        if (!record) return res.status(404).json({ success: false, message: 'Washing schedule record not found' });
        if (req.body.status === 'Completed' && record.scheduled_date > todayString()) {
            return res.status(400).json({ success: false, message: `This bus is not due for washing until ${record.scheduled_date}.` });
        }
        const updated = { ...record, ...req.body };
        if (req.body.status === 'Completed') {
            const completedDate = todayString();
            const nextDate = addDaysToDate(completedDate, 30);
            updated.last_completed_at = `${completedDate} ${new Date().toTimeString().slice(0, 8)}`;
            updated.completed_at = updated.last_completed_at;
            updated.last_washed_date = completedDate;
            updated.scheduled_date = nextDate;
            updated.next_scheduled_date = nextDate;
            updated.status = 'Scheduled';
            updated.cycle_initialized = true;
        }
        await updateRecord(connection, 'bus_washing', req.params.id, updated);
        res.json({ success: true, message: `Bus ${updated.vehicleid} washing schedule updated.`, record: updated });
    } catch (error) { fail(res, error); }
});

router.delete('/api/bus-washing/:id', async (req, res) => {
    try {
        const deleted = await deleteRecord(connectionOf(req), 'bus_washing', req.params.id);
        if (!deleted) return res.status(404).json({ success: false, message: 'Record not found' });
        res.json({ success: true, message: 'Washing schedule entry deleted successfully!' });
    } catch (error) { fail(res, error); }
});

module.exports = router;
