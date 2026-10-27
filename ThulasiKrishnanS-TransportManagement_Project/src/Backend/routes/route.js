const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

const normalizeStageName = (value) => String(value || '').normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g, '');
const levenshteinDistance = (left, right) => {
    const a = normalizeStageName(left);
    const b = normalizeStageName(right);
    const row = Array.from({ length: b.length + 1 }, (_, index) => index);
    for (let i = 1; i <= a.length; i++) {
        let previous = row[0];
        row[0] = i;
        for (let j = 1; j <= b.length; j++) {
            const old = row[j];
            row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
            previous = old;
        }
    }
    return row[b.length];
};

const findStageMatches = (stageName, routes, stages) => {
    const routeIds = new Set(routes.map((route) => String(route.routeid)));
    const candidates = stages.filter((stage) => routeIds.has(String(stage.routeid)));
    const requested = normalizeStageName(stageName);
    const exact = candidates.filter((stage) => normalizeStageName(stage.stagename) === requested);
    if (exact.length) return exact;
    const similar = candidates.filter((stage) => {
        const existing = normalizeStageName(stage.stagename);
        if (Math.min(existing.length, requested.length) >= 6 && (existing.includes(requested) || requested.includes(existing))) return true;
        const maxDistance = Math.max(1, Math.floor(Math.min(existing.length, requested.length) * 0.15));
        return Math.min(existing.length, requested.length) >= 8 && levenshteinDistance(existing, requested) <= maxDistance;
    });
    return similar;
};

const findRouteCandidates = (place, routes) => {
    const requested = normalizeStageName(place);
    const byCity = routes.filter((route) => normalizeStageName(route.city) === requested);
    if (byCity.length) return byCity;
    const byName = routes.filter((route) => normalizeStageName(route.routename).startsWith(requested));
    if (byName.length) return byName;
    return routes.filter((route) => {
        const city = normalizeStageName(route.city);
        const threshold = Math.max(1, Math.floor(Math.min(city.length, requested.length) * 0.2));
        return Math.min(city.length, requested.length) >= 8 && levenshteinDistance(city, requested) <= threshold;
    });
};

const createRouteStage = async (connection, route, stageName) => {
    const connectionPromise = connection.promise();
    const [existing] = await connectionPromise.query(
        'SELECT stageid FROM stage WHERE routeid = ? AND LOWER(stagename) = LOWER(?) LIMIT 1', [route.routeid, stageName]
    );
    if (existing.length) return;
    const stageid = `ST-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
    await connectionPromise.query(
        'INSERT INTO stage (stageid, stagename, city, routeid, arrivaltime, departureTime, fee) VALUES (?, ?, ?, ?, NULL, NULL, NULL)',
        [stageid, stageName, route.city || route.routename, route.routeid]
    );
    await connectionPromise.query('UPDATE route SET totalstages = COALESCE(totalstages, 0) + 1 WHERE routeid = ?', [route.routeid]);
};

const firstNonEmptyValue = (...values) => {
    for (const value of values) {
        if (value !== undefined && value !== null && String(value).trim() !== '') {
            return String(value).trim();
        }
    }
    return '';
};

const normalizeRouteLookupValue = (value) => {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/\s*-\s*/g, '-')
        .replace(/\s+/g, ' ');
};

const normalizeFieldKey = (value) => {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
};

const getPayloadValue = (payload = {}, aliases = []) => {
    const directEntries = Object.entries(payload || {});
    const normalizedPayload = new Map(directEntries.map(([key, value]) => [normalizeFieldKey(key), value]));

    for (const alias of aliases) {
        const directValue = payload[alias];
        if (directValue !== undefined && directValue !== null && String(directValue).trim() !== '') {
            return String(directValue).trim();
        }

        const normalizedValue = normalizedPayload.get(normalizeFieldKey(alias));
        if (normalizedValue !== undefined && normalizedValue !== null && String(normalizedValue).trim() !== '') {
            return String(normalizedValue).trim();
        }
    }

    return '';
};

const buildRouteLookup = (routes = []) => {
    const lookup = new Map();

    routes.forEach((route) => {
        const routeId = String(route.routeid || '').trim();
        const routeName = String(route.routename || '').trim();

        if (!routeId) {
            return;
        }

        lookup.set(normalizeRouteLookupValue(routeId), routeId);

        if (routeName) {
            lookup.set(normalizeRouteLookupValue(routeName), routeId);
            lookup.set(normalizeRouteLookupValue(`${routeId}-${routeName}`), routeId);
            lookup.set(normalizeRouteLookupValue(`${routeId} - ${routeName}`), routeId);
        }
    });

    return lookup;
};

const fetchRouteLookup = async (connection) => {
    const promiseConnection = connection.promise();
    const [routes] = await promiseConnection.query('SELECT routeid, routename FROM route');
    return buildRouteLookup(routes);
};

const resolveTravellerRouteId = (routeLookup, routeValue) => {
    const normalizedValue = normalizeRouteLookupValue(routeValue);
    if (!normalizedValue) {
        return '';
    }

    return routeLookup.get(normalizedValue) || '';
};

const normalizeTravellerPayload = (payload = {}) => {
    const role = getPayloadValue(payload, ['role', 'Role']);
    const city = getPayloadValue(payload, ['city', 'City', 'place', 'Place', 'town', 'Town', 'location', 'Location']);
    const stage = getPayloadValue(payload, ['stage', 'Stage', 'stage_name', 'stageName', 'Stage Name', 'point', 'Point', 'Pickup Point', 'pickup point', 'BOARDING PLACE', 'Boarding Place', 'Boarding Point']);

    return {
        rollno: getPayloadValue(payload, [
            'rollno',
            'RollNo',
            'roll_no',
            'Roll Number',
            'roll number',
            'RegNo',
            'Reg No',
            'reg no',
            'student reg no',
            'Student Reg No'
        ]),
        name: getPayloadValue(payload, ['name', 'Name', 'Student Name', 'student name']),
        role,
        year: getPayloadValue(payload, ['year', 'Year']),
        stafftype: role.toLowerCase() === 'staff'
            ? getPayloadValue(payload, [
                'stafftype',
                'staffType',
                'StaffType',
                'Staff Type',
                'staff type',
                'staff_category',
                'staffCategory'
            ])
            : '',
        branch: getPayloadValue(payload, ['branch', 'Branch', 'department', 'Department', 'dept', 'Dept']),
        phoneno: getPayloadValue(payload, [
            'phoneno',
            'phone',
            'Phone',
            'phoneNo',
            'PhoneNo',
            'ph_no',
            'Ph no',
            'PH No',
            'Phone No',
            'phone no',
            'mobile',
            'Mobile',
            'Mobile No',
            'mobile no'
        ]),
        city,
        place: city,
        stage_name: stage,
        point: stage,
        routeid: getPayloadValue(payload, [
            'routeid',
            'RouteID',
            'route_id',
            'route',
            'Route',
            'routeName',
            'RouteName',
            'routename',
            'Route Name',
            'route name',
            'Route No',
            'route no',
            'allocated bus no',
            'Allocated Bus No',
            'allocatedBusNo',
            'allocated_bus_no',
            'busno',
            'BusNo',
            'Bus No',
            'bus no'
        ])
    };
};

router.post('/addRoute', (req, res) => {
    const { routeId, routeName, city, totalStages, totalDistance } = req.body;

    // Input validation
    if (!routeId || !routeName || !city || !totalStages || !totalDistance) {
        return res.status(400).json({
            success: false,
            message: 'All fields are required'
        });
    }

    const connection = req.app.locals.connection;
    const query = 'INSERT INTO route (routeid, routename, city, totalstages, totaldistance) VALUES (?, ?, ?, ?, ?)';

    connection.query(query, [routeId, routeName, city, totalStages, totalDistance], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({
                    success: false,
                    message: 'Route ID already exists'
                });
            }
            return res.status(500).json({
                success: false,
                message: 'Database error'
            });
        }

        return res.json({
            success: true,
            message: 'Route added successfully'
        });
    });
});

router.post('/addVehicle', (req, res) => {
    const { vehicleId, vehicleType, seatCapacity, registrationNo, routeId, registrationDate, purchaseDate, vendorId, rcNo, registrationPlace } = req.body;

    // Input validation
    if (!vehicleId || !vehicleType || !seatCapacity || !registrationNo || !routeId || !registrationDate || !purchaseDate || !vendorId || !rcNo || !registrationPlace) {
        return res.status(400).json({
            success: false,
            message: 'All fields are required'
        });
    }

    const connection = req.app.locals.connection;
    const query = 'INSERT INTO vehicle (vehicleid, vehicletype, seatcapacity, registrationno, routeid, registrationdate, purchasedate, vendorid, rcno, registrationplace) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';

    connection.query(query, [vehicleId, vehicleType, seatCapacity, registrationNo, routeId, registrationDate, purchaseDate, vendorId, rcNo, registrationPlace], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({
                    success: false,
                    message: 'Vehicle ID already exists'
                });
            }
            return res.status(500).json({
                success: false,
                message: 'Database error'
            });
        }

        return res.json({
            success: true,
            message: 'Vehicle added successfully'
        });
    });
});

router.post('/addPermit', (req, res) => {
    const { vehicleId, permitNo, permitType, issueDate, expiryDate, status } = req.body;

    // Input validation
    if (!vehicleId || !permitNo || !permitType || !issueDate || !expiryDate || !status) {
        return res.status(400).json({
            success: false,
            message: 'All fields are required'
        });
    }

    const connection = req.app.locals.connection;
    const query = 'INSERT INTO permit (vehicleid, permitno, permittype, issuedate, expirydate, status) VALUES (?, ?, ?, ?, ?, ?)';

    connection.query(query, [vehicleId, permitNo, permitType, issueDate, expiryDate, status], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({
                    success: false,
                    message: 'Permit already exists'
                });
            }
            return res.status(500).json({
                success: false,
                message: 'Database error'
            });
        }

        return res.json({
            success: true,
            message: 'Permit added successfully'
        });
    });
});

router.post('/addFC', (req, res) => {
    const { vehicleId, fcNo, issueDate, expiryDate, status } = req.body;

    // Input validation
    if (!vehicleId || !fcNo || !issueDate || !expiryDate || !status) {
        return res.status(400).json({
            success: false,
            message: 'All fields are required'
        });
    }

    const connection = req.app.locals.connection;
    const query = 'INSERT INTO fc (vehicleid, fcno, issuedate, expirydate, status) VALUES (?, ?, ?, ?, ?)';

    connection.query(query, [vehicleId, fcNo, issueDate, expiryDate, status], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({
                    success: false,
                    message: 'FC already exists'
                });
            }
            return res.status(500).json({
                success: false,
                message: 'Database error'
            });
        }

        return res.json({
            success: true,
            message: 'FC added successfully'
        });
    });
});

router.post('/addDriver', upload.single('photo'), (req, res) => {
    const { vehicleid, staffcode, staffname, doorno, streetname, city, pincode, state, mobileno, email, driver_type } = req.body;
    const photo = req.file ? req.file.buffer : null;
    const type = String(driver_type || 'permanent').toLowerCase();

    // Input validation
    if (type === 'permanent') {
        if (!vehicleid || !staffcode || !staffname || !doorno || !streetname || !city || !pincode || !state || !mobileno || !photo) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required for permanent drivers'
            });
        }
    } else {
        // Temporary driver validation
        if (!staffcode || !staffname || !streetname || !city) {
            return res.status(400).json({
                success: false,
                message: 'Staff Code, Name, Address, and City are required for temporary drivers'
            });
        }
    }

    const connection = req.app.locals.connection;
    const query = 'INSERT INTO driver (staffcode, staffname, vehicleid, doorno, streetname, city, state, pincode, mobileno, email, photo, driver_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';

    const values = [
        staffcode,
        staffname,
        type === 'permanent' ? vehicleid : null,
        doorno || '',
        streetname, // Address for temporary
        city,
        type === 'permanent' ? state : '',
        type === 'permanent' ? pincode : '',
        mobileno,
        email || null,
        photo,
        type
    ];

    connection.query(query, values, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({
                    success: false,
                    message: 'Staff Code already exists'
                });
            }
            return res.status(500).json({
                success: false,
                message: 'Database error'
            });
        }

        return res.json({
            success: true,
            message: 'Driver added successfully'
        });
    });
});

router.post('/addTraveller', (req, res) => {
    const connection = req.app.locals.connection;

    (async () => {
        const traveller = normalizeTravellerPayload(req.body);
        const routeLookup = await fetchRouteLookup(connection);
        const resolvedRouteId = resolveTravellerRouteId(routeLookup, traveller.routeid);
        const { name, rollno, role, year, stafftype, branch, phoneno, city, place, stage_name, point } = traveller;

        if (!name || !rollno) {
            return res.status(400).json({
                success: false,
                message: 'Name and Roll Number are required'
            });
        }

        if (!role || !city || !stage_name || !resolvedRouteId) {
            return res.status(400).json({
                success: false,
                message: 'Role, City, Route, and Stage are required'
            });
        }

        if (role.toLowerCase() === 'student' && !year) {
            return res.status(400).json({
                success: false,
                message: 'Year is required for students'
            });
        }

        const promiseConnection = connection.promise();
        const [[stageMatch]] = await promiseConnection.query(
            'SELECT stageid FROM stage WHERE routeid = ? AND LOWER(TRIM(stagename)) = LOWER(TRIM(?)) LIMIT 1', [resolvedRouteId, stage_name]
        );
        if (!stageMatch) {
            const [[route]] = await promiseConnection.query('SELECT routeid, routename, city FROM route WHERE routeid = ? LIMIT 1', [resolvedRouteId]);
            await createRouteStage(connection, route, stage_name);
        }
        const [[busCapacity]] = await promiseConnection.query(
            'SELECT COALESCE(SUM(seatcapacity), 0) AS capacity FROM (SELECT vehicleid, MAX(seatcapacity) AS seatcapacity FROM vehicle WHERE routeid = ? GROUP BY vehicleid) AS unique_buses', [resolvedRouteId]
        );
        const [[occupancy]] = await promiseConnection.query(
            'SELECT COUNT(DISTINCT rollno) AS assigned FROM traveller WHERE routeid = ?', [resolvedRouteId]
        );
        if (!Number(busCapacity.capacity) || Number(occupancy.assigned) >= Number(busCapacity.capacity)) {
            return res.status(409).json({ success: false, message: 'This route bus is full. The traveller was not allocated.' });
        }

        const query = `
            INSERT INTO traveller (
                name, rollno, role, year, stafftype, branch, phoneno, city, place, stage_name, point, routeid
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        connection.query(query, [name, rollno, role, year || null, stafftype || null, branch || null, phoneno || null, city, place, stage_name, point, resolvedRouteId], (err, results) => {
            if (err) {
                console.error('Database error:', err);
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(409).json({
                        success: false,
                        message: 'Roll Number already exists'
                    });
                }
                if (err.code === 'ER_NO_REFERENCED_ROW_2') {
                    return res.status(400).json({
                        success: false,
                        message: `Invalid route: ${traveller.routeid}`
                    });
                }
                return res.status(500).json({
                    success: false,
                    message: 'Database error'
                });
            }

            return res.json({
                success: true,
                message: 'Traveller added successfully'
            });
        });
    })().catch((error) => {
        console.error('Traveller add error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to validate traveller route'
        });
    });
});

router.get('/getRoute', (req, res) => {
    const connection = req.app.locals.connection;
    const query = 'SELECT * FROM route';

    connection.query(query, (err, results) => {
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

router.get('/getRouteByCity', (req, res) => {
    const { city } = req.query;

    if (!city) {
        return res.status(400).json({
            success: false,
            message: 'City is required'
        });
    }

    const connection = req.app.locals.connection;
    const query = `
        SELECT
            r.routeid,
            r.totalstages,
            COUNT(s.stageid) AS currentstages
        FROM route r
        LEFT JOIN stage s ON r.routeid = s.routeid
        WHERE r.city = ?
        GROUP BY r.routeid, r.totalstages
        ORDER BY r.routeid
    `;

    connection.query(query, [city], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
                success: false,
                message: 'Database error'
            });
        }

        const routes = results.map(row => ({
            routeid: row.routeid,
            totalstages: Number(row.totalstages) || 0,
            currentstages: Number(row.currentstages) || 0
        }));
        return res.json({ routes });
    });
});

// Count endpoints
router.get('/count/vehicle', (req, res) => {
    const connection = req.app.locals.connection;
    const query = 'SELECT COUNT(*) as count FROM vehicle';

    connection.query(query, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
                success: false,
                message: 'Database error'
            });
        }

        return res.json({ count: results[0].count });
    });
});

router.get('/count/route', (req, res) => {
    const connection = req.app.locals.connection;
    const query = 'SELECT COUNT(*) as count FROM route';

    connection.query(query, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
                success: false,
                message: 'Database error'
            });
        }

        return res.json({ count: results[0].count });
    });
});

router.get('/count/traveller', (req, res) => {
    const connection = req.app.locals.connection;
    const query = 'SELECT COUNT(*) as count FROM traveller';

    connection.query(query, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
                success: false,
                message: 'Database error'
            });
        }

        return res.json({ count: results[0].count });
    });
});

router.get('/count/driver', (req, res) => {
    const connection = req.app.locals.connection;
    const query = 'SELECT COUNT(*) as count FROM driver';

    connection.query(query, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
                success: false,
                message: 'Database error'
            });
        }

        return res.json({ count: results[0].count });
    });
});

router.get('/count/stage', (req, res) => {
    const connection = req.app.locals.connection;
    const query = 'SELECT COUNT(*) as count FROM stage';

    connection.query(query, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
                success: false,
                message: 'Database error'
            });
        }

        return res.json({ count: results[0].count });
    });
});

// API endpoints for driver and vehicle data
router.get('/api/driver/:id', (req, res) => {
    const { id } = req.params;
    const connection = req.app.locals.connection;
    const query = 'SELECT * FROM driver WHERE vehicleid = ?';

    connection.query(query, [id], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
                success: false,
                message: 'Database error'
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Driver not found'
            });
        }

        const driver = results[0];
        // Convert photo blob to base64 if exists
        if (driver.photo) {
            try {
                // Handle different types of photo data from MySQL
                if (Buffer.isBuffer(driver.photo)) {
                    driver.photo = driver.photo.toString('base64');
                } else if (driver.photo instanceof Uint8Array) {
                    driver.photo = Buffer.from(driver.photo).toString('base64');
                } else if (typeof driver.photo === 'object' && driver.photo !== null && driver.photo.data) {
                    // Some MySQL drivers return {data: Uint8Array, ...}
                    if (Array.isArray(driver.photo.data)) {
                        driver.photo = Buffer.from(driver.photo.data).toString('base64');
                    } else if (driver.photo.data instanceof Uint8Array) {
                        driver.photo = Buffer.from(driver.photo.data).toString('base64');
                    } else {
                        driver.photo = null;
                    }
                } else {
                    // For any other case, set to null
                    console.log('Unexpected photo type:', typeof driver.photo, driver.photo);
                    driver.photo = null;
                }
            } catch (e) {
                console.error('Error converting photo to base64:', e);
                driver.photo = null;
            }
        }

        return res.json(driver);
    });
});

// Update driver profile endpoint
router.put('/api/driver/:vehicleid', upload.single('photo'), (req, res) => {
    const { vehicleid } = req.params;
    const { staffname, doorno, streetname, city, pincode, state, mobileno } = req.body;
    const photo = req.file ? req.file.buffer : null;

    // Input validation
    if (!staffname || !doorno || !streetname || !city || !pincode || !state || !mobileno) {
        return res.status(400).json({
            success: false,
            message: 'All fields except photo are required'
        });
    }

    const connection = req.app.locals.connection;
    let query, params;

    if (photo) {
        // Update with photo
        query = 'UPDATE driver SET staffname = ?, doorno = ?, streetname = ?, city = ?, state = ?, pincode = ?, mobileno = ?, photo = ? WHERE vehicleid = ?';
        params = [staffname, doorno, streetname, city, state, pincode, mobileno, photo, vehicleid];
    } else {
        // Update without photo
        query = 'UPDATE driver SET staffname = ?, doorno = ?, streetname = ?, city = ?, state = ?, pincode = ?, mobileno = ? WHERE vehicleid = ?';
        params = [staffname, doorno, streetname, city, state, pincode, mobileno, vehicleid];
    }

    connection.query(query, params, (err, results) => {
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
                message: 'Driver not found'
            });
        }

        return res.json({
            success: true,
            message: 'Driver profile updated successfully'
        });
    });
});

router.get('/api/vehicle/:id', (req, res) => {
    const { id } = req.params;
    const connection = req.app.locals.connection;
    const query = 'SELECT * FROM vehicle WHERE vehicleid = ?';

    connection.query(query, [id], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
                success: false,
                message: 'Database error'
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Vehicle not found'
            });
        }

        return res.json(results[0]);
    });
});

router.get('/getVehicle', (req, res) => {
    const connection = req.app.locals.connection;
    const query = `
        SELECT
            v.*,
            COALESCE(traveller_count.allocated_count, 0) AS allocated_count,
            GREATEST(COALESCE(v.seatcapacity, 0) - COALESCE(traveller_count.allocated_count, 0), 0) AS available_seats
        FROM vehicle v
        LEFT JOIN (
            SELECT routeid, COUNT(*) AS allocated_count
            FROM traveller
            WHERE routeid IS NOT NULL AND routeid <> ''
            GROUP BY routeid
        ) AS traveller_count ON v.routeid = traveller_count.routeid
        ORDER BY v.vehicleid
    `;

    connection.query(query, (err, results) => {
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

router.put('/updateRoute/:routeid', (req, res) => {
    const { routeid } = req.params;
    const { routeid: newRouteId, routename, city, totalstages, totaldistance } = req.body;

    // Input validation
    if (!newRouteId || !routename || !city || !totalstages || !totaldistance) {
        return res.status(400).json({
            success: false,
            message: 'All fields are required'
        });
    }

    const connection = req.app.locals.connection;
    const query = 'UPDATE route SET routeid = ?, routename = ?, city = ?, totalstages = ?, totaldistance = ? WHERE routeid = ?';

    connection.query(query, [newRouteId, routename, city, totalstages, totaldistance, routeid], (err, results) => {
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
                message: 'Route not found'
            });
        }

        return res.json({
            success: true,
            message: 'Route updated successfully'
        });
    });
});

router.delete('/deleteRoute/:routeid', (req, res) => {
    const { routeid } = req.params;

    const connection = req.app.locals.connection;
    const query = 'DELETE FROM route WHERE routeid = ?';

    connection.query(query, [routeid], (err, results) => {
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
                message: 'Route not found'
            });
        }

        return res.json({
            success: true,
            message: 'Route deleted successfully'
        });
    });
});

router.put('/updateStage/:stageid', (req, res) => {
    const { stageid } = req.params;
    const { stagename, city, routeid, arrivaltime, departuretime, fee } = req.body;

    // Input validation
    if (!stagename || !city || !routeid) {
        return res.status(400).json({
            success: false,
            message: 'Stage name, city, and route ID are required'
        });
    }

    const connection = req.app.locals.connection;
    const capacityQuery = `
        SELECT
            r.totalstages,
            COUNT(s.stageid) AS currentstages
        FROM route r
        LEFT JOIN stage s ON r.routeid = s.routeid AND s.stageid <> ?
        WHERE r.routeid = ?
        GROUP BY r.routeid, r.totalstages
    `;

    connection.query(capacityQuery, [stageid, routeid], (capacityErr, capacityResults) => {
        if (capacityErr) {
            console.error('Database error:', capacityErr);
            return res.status(500).json({
                success: false,
                message: 'Database error'
            });
        }

        if (capacityResults.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Selected route does not exist'
            });
        }

        const totalStages = Number(capacityResults[0].totalstages) || 0;
        const currentStages = Number(capacityResults[0].currentstages) || 0;

        if (totalStages > 0 && currentStages >= totalStages) {
            return res.status(400).json({
                success: false,
                message: `Cannot assign this stage. Route ${routeid} already has ${currentStages} of ${totalStages} stages.`
            });
        }

        const query = 'UPDATE stage SET stagename = ?, city = ?, routeid = ?, arrivaltime = ?, departuretime = ?, fee = ? WHERE stageid = ?';

        connection.query(query, [stagename, city, routeid, arrivaltime, departuretime, fee, stageid], (err, results) => {
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
                message: 'Stage not found'
            });
        }

        return res.json({
            success: true,
            message: 'Stage updated successfully'
        });
        });
    });
});

router.delete('/deleteStage/:stageid', (req, res) => {
    const { stageid } = req.params;

    const connection = req.app.locals.connection;
    const query = 'DELETE FROM stage WHERE stageid = ?';

    connection.query(query, [stageid], (err, results) => {
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
                message: 'Stage not found'
            });
        }

        return res.json({
            success: true,
            message: 'Stage deleted successfully'
        });
    });
});

router.put('/updateDriver/:staffcode', upload.single('photo'), (req, res) => {
    console.log('Update Driver Params:', req.params);
    console.log('Update Driver Body:', req.body);
    const { staffcode } = req.params;
    const { staffname, vehicleid, doorno, streetname, city, state, pincode, mobileno, email, driver_type } = req.body;
    const photo = req.file ? req.file.buffer : null;
    const type = String(driver_type || 'permanent').toLowerCase();

    // Input validation
    if (type === 'permanent') {
        if (!staffname || !vehicleid || !doorno || !streetname || !city || !state || !pincode || !mobileno) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required for permanent drivers'
            });
        }
    } else {
        if (!staffname || !streetname || !city) {
            return res.status(400).json({
                success: false,
                message: 'Name, Address, and City are required for temporary drivers'
            });
        }
    }

    const connection = req.app.locals.connection;
    let query, params;

    if (photo) {
        // Update with photo
        query = 'UPDATE driver SET staffname = ?, vehicleid = ?, doorno = ?, streetname = ?, city = ?, state = ?, pincode = ?, mobileno = ?, email = ?, photo = ?, driver_type = ? WHERE staffcode = ?';
        params = [
            staffname,
            type === 'permanent' ? vehicleid : null,
            doorno || '',
            streetname,
            city,
            type === 'permanent' ? state : '',
            type === 'permanent' ? pincode : '',
            mobileno,
            email || null,
            photo,
            type,
            staffcode
        ];
    } else {
        // Update without photo
        query = 'UPDATE driver SET staffname = ?, vehicleid = ?, doorno = ?, streetname = ?, city = ?, state = ?, pincode = ?, mobileno = ?, email = ?, driver_type = ? WHERE staffcode = ?';
        params = [
            staffname,
            type === 'permanent' ? vehicleid : null,
            doorno || '',
            streetname,
            city,
            type === 'permanent' ? state : '',
            type === 'permanent' ? pincode : '',
            mobileno,
            email || null,
            type,
            staffcode
        ];
    }

    connection.query(query, params, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
                success: false,
                message: 'Database error'
            });
        }

        if (results.affectedRows === 0) {
            return connection.query('SELECT staffcode FROM driver WHERE staffcode = ? LIMIT 1', [staffcode], (lookupErr, rows) => {
                if (lookupErr) {
                    console.error('Driver update verification error:', lookupErr);
                    return res.status(500).json({ success: false, message: 'Could not verify the driver update' });
                }
                if (!rows.length) return res.status(404).json({ success: false, message: 'Driver not found' });
                return res.json({ success: true, message: 'Driver details are already up to date' });
            });
        }

        return res.json({ success: true, message: 'Driver updated successfully' });
    });
});

router.delete('/deleteDriver/:staffcode', (req, res) => {
    const { staffcode } = req.params;

    const connection = req.app.locals.connection;
    const query = 'DELETE FROM driver WHERE staffcode = ?';

    connection.query(query, [staffcode], (err, results) => {
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
                message: 'Driver not found'
            });
        }

        return res.json({
            success: true,
            message: 'Driver deleted successfully'
        });
    });
});

router.put('/updateTraveller/:rollno', (req, res) => {
    const { rollno } = req.params;
    const connection = req.app.locals.connection;

    (async () => {
        const traveller = normalizeTravellerPayload(req.body);
        const routeLookup = await fetchRouteLookup(connection);
        const resolvedRouteId = resolveTravellerRouteId(routeLookup, traveller.routeid);
        const { name, role, year, stafftype, branch, phoneno, city, place, stage_name, point } = traveller;

        if (!name || !role || !branch || !phoneno || !city || !stage_name || !resolvedRouteId) {
            return res.status(400).json({
                success: false,
                message: 'Name, Role, Branch, Phone Number, City, Route, and Stage are required'
            });
        }

        if (role.toLowerCase() === 'student' && !year) {
            return res.status(400).json({
                success: false,
                message: 'Year is required for students'
            });
        }

        if (role.toLowerCase() === 'staff' && !stafftype) {
            return res.status(400).json({
                success: false,
                message: 'Staff Type is required for staff travellers'
            });
        }

        const query = `
            UPDATE traveller
            SET name = ?, role = ?, year = ?, stafftype = ?, branch = ?, phoneno = ?, city = ?, place = ?, stage_name = ?, point = ?, routeid = ?
            WHERE rollno = ?
        `;

        connection.query(query, [name, role, year || null, stafftype || null, branch, phoneno, city, place, stage_name, point, resolvedRouteId, rollno], (err, results) => {
            if (err) {
                console.error('Database error:', err);
                if (err.code === 'ER_NO_REFERENCED_ROW_2') {
                    return res.status(400).json({
                        success: false,
                        message: `Invalid route: ${traveller.routeid}`
                    });
                }
                return res.status(500).json({
                    success: false,
                    message: 'Database error'
                });
            }

            if (results.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Traveller not found'
                });
            }

            return res.json({
                success: true,
                message: 'Traveller updated successfully'
            });
        });
    })().catch((error) => {
        console.error('Traveller update error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to validate traveller route'
        });
    });
});

router.delete('/deleteTraveller/:rollno', (req, res) => {
    const { rollno } = req.params;

    const connection = req.app.locals.connection;
    const query = 'DELETE FROM traveller WHERE rollno = ?';

    connection.query(query, [rollno], (err, results) => {
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
                message: 'Traveller not found'
            });
        }

        return res.json({
            success: true,
            message: 'Traveller deleted successfully'
        });
    });
});

router.put('/updateVehicle/:vehicleid', (req, res) => {
    const { vehicleid } = req.params;
    const { vehicletype, seatcapacity, registrationno, routeid, registrationdate, purchasedate, vendorid, rcno, registrationplace } = req.body;

    // Input validation
    if (!vehicletype || !seatcapacity || !registrationno || !routeid || !registrationdate || !purchasedate || !vendorid || !rcno || !registrationplace) {
        return res.status(400).json({
            success: false,
            message: 'All fields are required'
        });
    }

    const connection = req.app.locals.connection;
    const query = 'UPDATE vehicle SET vehicletype = ?, seatcapacity = ?, registrationno = ?, routeid = ?, registrationdate = ?, purchasedate = ?, vendorid = ?, rcno = ?, registrationplace = ? WHERE vehicleid = ?';

    connection.query(query, [vehicletype, seatcapacity, registrationno, routeid, registrationdate, purchasedate, vendorid, rcno, registrationplace, vehicleid], (err, results) => {
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
                message: 'Vehicle not found'
            });
        }

        return res.json({
            success: true,
            message: 'Vehicle updated successfully'
        });
    });
});

router.delete('/deleteVehicle/:vehicleid', (req, res) => {
    const { vehicleid } = req.params;

    const connection = req.app.locals.connection;
    const query = 'DELETE FROM vehicle WHERE vehicleid = ?';

    connection.query(query, [vehicleid], (err, results) => {
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
                message: 'Vehicle not found'
            });
        }

        return res.json({
            success: true,
            message: 'Vehicle deleted successfully'
        });
    });
});

router.get('/getPermit', (req, res) => {
    const connection = req.app.locals.connection;
    const query = 'SELECT * FROM permit';

    connection.query(query, (err, results) => {
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

router.put('/updatePermit/:vehicleid/:permitno', (req, res) => {
    const { vehicleid, permitno } = req.params;
    const { permittype, issuedate, expirydate, status } = req.body;

    // Input validation
    if (!permittype || !issuedate || !expirydate || !status) {
        return res.status(400).json({
            success: false,
            message: 'All fields are required'
        });
    }

    const connection = req.app.locals.connection;
    const query = 'UPDATE permit SET permittype = ?, issuedate = ?, expirydate = ?, status = ? WHERE vehicleid = ? AND permitno = ?';

    connection.query(query, [permittype, issuedate, expirydate, status, vehicleid, permitno], (err, results) => {
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
                message: 'Permit not found'
            });
        }

        return res.json({
            success: true,
            message: 'Permit updated successfully'
        });
    });
});

router.delete('/deletePermit/:vehicleid/:permitno', (req, res) => {
    const { vehicleid, permitno } = req.params;

    const connection = req.app.locals.connection;
    const query = 'DELETE FROM permit WHERE vehicleid = ? AND permitno = ?';

    connection.query(query, [vehicleid, permitno], (err, results) => {
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
                message: 'Permit not found'
            });
        }

        return res.json({
            success: true,
            message: 'Permit deleted successfully'
        });
    });
});

router.get('/getFC', (req, res) => {
    const connection = req.app.locals.connection;
    const query = 'SELECT * FROM fc';

    connection.query(query, (err, results) => {
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

router.put('/updateFC/:id', (req, res) => {
    const { id } = req.params;
    const { vehicleId, fcNo, issueDate, expiryDate, status } = req.body;

    // Input validation
    if (!vehicleId || !fcNo || !issueDate || !expiryDate || !status) {
        return res.status(400).json({
            success: false,
            message: 'All fields are required'
        });
    }

    const connection = req.app.locals.connection;
    const query = 'UPDATE fc SET vehicleid = ?, fcno = ?, issuedate = ?, expirydate = ?, status = ? WHERE fcid = ?';

    connection.query(query, [vehicleId, fcNo, issueDate, expiryDate, status, id], (err, results) => {
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
                message: 'FC record not found'
            });
        }

        return res.json({
            success: true,
            message: 'FC updated successfully'
        });
    });
});

router.delete('/deleteFC/:id', (req, res) => {
    const { id } = req.params;

    const connection = req.app.locals.connection;
    const query = 'DELETE FROM fc WHERE fcid = ?';

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
                message: 'FC record not found'
            });
        }

        return res.json({
            success: true,
            message: 'FC deleted successfully'
        });
    });
});

router.get('/getStage', (req, res) => {
    const connection = req.app.locals.connection;
    const query = 'SELECT * FROM stage';

    connection.query(query, (err, results) => {
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

router.get('/getStagesByRouteId', (req, res) => {
    const { routeid } = req.query;

    if (!routeid) {
        return res.status(400).json({
            success: false,
            message: 'Route ID is required'
        });
    }

    const connection = req.app.locals.connection;
    const query = 'SELECT stagename FROM stage WHERE routeid = ?';

    connection.query(query, [routeid], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
                success: false,
                message: 'Database error'
            });
        }

        const stages = results.map(row => row.stagename);
        return res.json({ stages });
    });
});

router.get('/getTraveller', (req, res) => {
    const connection = req.app.locals.connection;
    const query = `
        SELECT
            t.*,
            COALESCE(NULLIF(t.city, ''), NULLIF(t.place, ''), r.city) AS city,
            COALESCE(NULLIF(t.place, ''), NULLIF(t.city, ''), r.city) AS place,
            COALESCE(NULLIF(t.stage_name, ''), NULLIF(t.point, '')) AS stage,
            COALESCE(NULLIF(t.point, ''), NULLIF(t.stage_name, '')) AS point,
            r.routename,
            vehicle_map.busno,
            vehicle_map.registrationno AS busregistrationno
        FROM traveller t
        LEFT JOIN route r ON t.routeid = r.routeid
        LEFT JOIN (
            SELECT
                v.routeid,
                MIN(v.vehicleid) AS busno,
                MIN(v.registrationno) AS registrationno
            FROM vehicle v
            WHERE v.routeid IS NOT NULL AND v.routeid <> ''
            GROUP BY v.routeid
        ) AS vehicle_map ON t.routeid = vehicle_map.routeid
        ORDER BY t.name ASC
    `;

    connection.query(query, (err, results) => {
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

router.post('/importTravellers', (req, res) => {
    const connection = req.app.locals.connection;
    const travellers = Array.isArray(req.body) ? req.body : req.body?.travellers;
    const selectedRole = Array.isArray(req.body) ? '' : String(req.body?.role || '').trim();

    if (!Array.isArray(travellers) || travellers.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Invalid data format. Expected an array of travellers.'
        });
    }

    (async () => {
        const promiseConnection = connection.promise();
        const [routes] = await promiseConnection.query('SELECT routeid, routename, city FROM route');
        const [stages] = await promiseConnection.query('SELECT routeid, stagename FROM stage');
        const normalizedTravellers = [...new Map(travellers.map((item) => normalizeTravellerPayload({ ...item, role: selectedRole || item.role }))
            .filter((traveller) => traveller.rollno && traveller.name)
            .map((traveller) => [traveller.rollno.toLowerCase(), traveller])).values()];

        if (normalizedTravellers.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid traveller rows found for import.'
            });
        }

        const [capacityRows] = await promiseConnection.query(`
            SELECT routeid, SUM(seatcapacity) AS capacity
            FROM (SELECT routeid, vehicleid, MAX(seatcapacity) AS seatcapacity FROM vehicle WHERE routeid IS NOT NULL GROUP BY routeid, vehicleid) unique_buses
            GROUP BY routeid
        `);
        const [occupancyRows] = await promiseConnection.query('SELECT routeid, COUNT(DISTINCT rollno) AS assigned FROM traveller WHERE routeid IS NOT NULL GROUP BY routeid');
        const [existingAssignments] = await promiseConnection.query('SELECT rollno, routeid FROM traveller WHERE routeid IS NOT NULL');
        const capacities = new Map(capacityRows.map((row) => [String(row.routeid), Number(row.capacity) || 0]));
        const assignedCounts = new Map(occupancyRows.map((row) => [String(row.routeid), Number(row.assigned) || 0]));
        const assignedRouteByRoll = new Map(existingAssignments.map((row) => [String(row.rollno).toLowerCase(), String(row.routeid)]));
        const preparedTravellers = [];
        for (const traveller of normalizedTravellers) {
            const rollKey = traveller.rollno.toLowerCase();
            const oldRoute = assignedRouteByRoll.get(rollKey);
            if (oldRoute) assignedCounts.set(oldRoute, Math.max(0, (assignedCounts.get(oldRoute) || 0) - 1));

            const candidates = findRouteCandidates(traveller.city, routes);
            const matches = findStageMatches(traveller.stage_name, candidates, stages);
            const matchingRouteIds = [...new Set(matches.map((stage) => String(stage.routeid)))];
            let selectedRoute = null;
            let selectedStage = null;
            let reason = '';
            if (matchingRouteIds.length === 1) {
                selectedRoute = candidates.find((route) => String(route.routeid) === matchingRouteIds[0]);
                selectedStage = matches.find((stage) => String(stage.routeid) === matchingRouteIds[0]);
            } else if (matchingRouteIds.length > 1) {
                reason = 'Boarding point matches more than one route';
            } else if (candidates.length === 1 && traveller.stage_name) {
                selectedRoute = candidates[0];
                await createRouteStage(connection, selectedRoute, traveller.stage_name);
                stages.push({ routeid: selectedRoute.routeid, stagename: traveller.stage_name });
                selectedStage = stages[stages.length - 1];
            } else if (!candidates.length) {
                reason = 'City does not match a route';
            } else {
                reason = 'Boarding point was not found on a unique route';
            }

            let routeid = selectedRoute?.routeid || '';
            if (routeid) {
                const capacity = capacities.get(String(routeid)) || 0;
                const assigned = assignedCounts.get(String(routeid)) || 0;
                if (!capacity || assigned >= capacity) {
                    reason = `Bus is full (${assigned}/${capacity || 0} seats)`;
                    routeid = '';
                } else {
                    assignedCounts.set(String(routeid), assigned + 1);
                }
            }
            preparedTravellers.push({ ...traveller, routeid, stage_name: selectedStage?.stagename || traveller.stage_name, point: selectedStage?.stagename || traveller.stage_name, allocationReason: reason || '' });
        }

        const query = `
            INSERT INTO traveller (rollno, name, role, year, stafftype, branch, phoneno, city, place, routeid, stage_name, point)
            VALUES ?
            ON DUPLICATE KEY UPDATE
            name = VALUES(name),
            role = VALUES(role),
            year = VALUES(year),
            stafftype = VALUES(stafftype),
            branch = VALUES(branch),
            phoneno = VALUES(phoneno),
            city = VALUES(city),
            place = VALUES(place),
            routeid = VALUES(routeid),
            stage_name = VALUES(stage_name),
            point = VALUES(point)
        `;

        const values = preparedTravellers.map((traveller) => [
            traveller.rollno,
            traveller.name,
            traveller.role || null,
            traveller.year || null,
            traveller.stafftype || null,
            traveller.branch || null,
            traveller.phoneno || null,
            traveller.city || null,
            traveller.place || null,
            traveller.routeid || null,
            traveller.stage_name || null,
            traveller.point || null
        ]);

        connection.query(query, [values], (err, results) => {
            if (err) {
                console.error('Database error:', err);
                if (err.code === 'ER_NO_REFERENCED_ROW_2') {
                    return res.status(400).json({
                        success: false,
                        message: 'Import failed because one or more route values do not exist in Route Master.'
                    });
                }
                return res.status(500).json({
                    success: false,
                    message: 'Database error during import'
                });
            }

            const unallocated = preparedTravellers.filter((traveller) => !traveller.routeid).map(({ rollno, name, city, stage_name, allocationReason }) => ({ rollno, name, city, stage: stage_name, reason: allocationReason }));
            return res.json({
                success: true,
                message: `Imported ${preparedTravellers.length} traveller records`,
                imported: preparedTravellers.length,
                allocated: preparedTravellers.length - unallocated.length,
                unallocated
            });
        });
    })().catch((error) => {
        console.error('Traveller import error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to validate traveller import routes'
        });
    });
});

router.put('/allocateTraveller/:rollno', (req, res) => {
    const { rollno } = req.params;
    const { routeid, stage } = req.body || {};
    if (!routeid || !String(stage || '').trim()) return res.status(400).json({ success: false, message: 'Route and boarding stage are required' });
    const connection = req.app.locals.connection;
    (async () => {
        const db = connection.promise();
        const [[route]] = await db.query('SELECT routeid, routename, city FROM route WHERE routeid = ? LIMIT 1', [routeid]);
        if (!route) return res.status(404).json({ success: false, message: 'Route was not found' });
        const [[traveller]] = await db.query('SELECT id, routeid FROM traveller WHERE rollno = ? LIMIT 1', [rollno]);
        if (!traveller) return res.status(404).json({ success: false, message: 'Traveller was not found' });
        const [routeStages] = await db.query('SELECT routeid, stagename FROM stage WHERE routeid = ?', [routeid]);
        const stageMatches = findStageMatches(stage, [route], routeStages);
        const selectedStage = stageMatches[0]?.stagename || String(stage).trim();
        if (!stageMatches.length) await createRouteStage(connection, route, selectedStage);

        const [[busCapacity]] = await db.query(
            'SELECT COALESCE(SUM(seatcapacity), 0) AS capacity FROM (SELECT vehicleid, MAX(seatcapacity) AS seatcapacity FROM vehicle WHERE routeid = ? GROUP BY vehicleid) AS unique_buses', [routeid]
        );
        const [[occupancy]] = await db.query(
            'SELECT COUNT(DISTINCT rollno) AS assigned FROM traveller WHERE routeid = ? AND rollno <> ?', [routeid, rollno]
        );
        if (!Number(busCapacity.capacity) || Number(occupancy.assigned) >= Number(busCapacity.capacity)) {
            return res.status(409).json({ success: false, message: `This bus is full (${occupancy.assigned}/${busCapacity.capacity} seats). The traveller was not allocated.` });
        }
        const [result] = await db.query(
            'UPDATE traveller SET routeid = ?, stage_name = ?, point = ? WHERE rollno = ?', [routeid, selectedStage, selectedStage, rollno]
        );
        if (!result.affectedRows) return res.status(400).json({ success: false, message: 'Traveller could not be allocated' });
        return res.json({ success: true, message: 'Traveller bus route allocated successfully', stageAdded: !stageMatches.length });
    })().catch((error) => {
        console.error('Manual traveller allocation error:', error);
        return res.status(500).json({ success: false, message: 'Database error while allocating traveller' });
    });
});

router.get('/getInsurance', (req, res) => {
    const connection = req.app.locals.connection;
    const query = 'SELECT * FROM insurance';

    connection.query(query, (err, results) => {
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

router.get('/getdrivers', (req, res) => {
    const connection = req.app.locals.connection;
    const query = `
        SELECT
            d.*,
            r.routename
        FROM driver d
        LEFT JOIN vehicle v ON d.vehicleid = v.vehicleid
        LEFT JOIN route r ON v.routeid = r.routeid
    `;

    connection.query(query, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
                success: false,
                message: 'Database error'
            });
        }

        // Convert photo blob to base64 for each driver
        results.forEach(driver => {
            if (driver.photo) {
                try {
                    if (Buffer.isBuffer(driver.photo)) {
                        driver.imageUrl = `data:image/jpeg;base64,${driver.photo.toString('base64')}`;
                    } else if (driver.photo instanceof Uint8Array) {
                        driver.imageUrl = `data:image/jpeg;base64,${Buffer.from(driver.photo).toString('base64')}`;
                    } else if (typeof driver.photo === 'object' && driver.photo !== null && driver.photo.data) {
                        if (Array.isArray(driver.photo.data)) {
                            driver.imageUrl = `data:image/jpeg;base64,${Buffer.from(driver.photo.data).toString('base64')}`;
                        } else if (driver.photo.data instanceof Uint8Array) {
                            driver.imageUrl = `data:image/jpeg;base64,${Buffer.from(driver.photo.data).toString('base64')}`;
                        } else {
                            driver.imageUrl = null;
                        }
                    } else {
                        driver.imageUrl = null;
                    }
                } catch (e) {
                    console.error('Error converting photo to base64:', e);
                    driver.imageUrl = null;
                }
            } else {
                driver.imageUrl = null;
            }
            delete driver.photo;
        });

        return res.json(results);
    });
});

// Get all route names for filter dropdown
router.get('/getRouteNames', (req, res) => {
    const connection = req.app.locals.connection;
    const query = 'SELECT DISTINCT routename FROM route ORDER BY routename';

    connection.query(query, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
                success: false,
                message: 'Database error'
            });
        }

        const routeNames = results.map(row => row.routename);
        return res.json(routeNames);
    });
});

// Bus location endpoints
router.post('/updateLocation', (req, res) => {
    const { vehicleid, latitude, longitude, speed } = req.body;

    if (!vehicleid || !latitude || !longitude) {
        return res.status(400).json({
            success: false,
            message: 'Vehicle ID, latitude, and longitude are required'
        });
    }

    const connection = req.app.locals.connection;
    const query = 'INSERT INTO bus_location (vehicleid, latitude, longitude, speed) VALUES (?, ?, ?, ?)';

    connection.query(query, [vehicleid, latitude, longitude, speed || null], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
                success: false,
                message: 'Database error'
            });
        }

        return res.json({
            success: true,
            message: 'Location updated successfully'
        });
    });
});

router.get('/getLocations', (req, res) => {
    const connection = req.app.locals.connection;
    const query = `
        SELECT bl.*, v.registrationno, d.staffname as drivername
        FROM bus_location bl
        JOIN vehicle v ON bl.vehicleid = v.vehicleid
        LEFT JOIN driver d ON v.vehicleid = d.vehicleid
        WHERE bl.timestamp >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
        ORDER BY bl.timestamp DESC
    `;

    connection.query(query, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
                success: false,
                message: 'Database error'
            });
        }

        // Group by vehicleid to get latest location for each bus
        const locations = {};
        results.forEach(row => {
            if (!locations[row.vehicleid] || new Date(row.timestamp) > new Date(locations[row.vehicleid].timestamp)) {
                locations[row.vehicleid] = row;
            }
        });

        return res.json(Object.values(locations));
    });
});

// Leave Request Routes
router.post('/submitLeaveRequest', (req, res) => {
    const { staffcode, reason, leaveDate } = req.body;

    // Input validation
    if (!staffcode || !reason || !leaveDate) {
        return res.status(400).json({
            success: false,
            message: 'All fields are required'
        });
    }

    const connection = req.app.locals.connection;
    const query = 'INSERT INTO leave_requests (staffcode, reason, leave_date) VALUES (?, ?, ?)';

    connection.query(query, [staffcode, reason, leaveDate], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
                success: false,
                message: 'Database error'
            });
        }

        return res.json({
            success: true,
            message: 'Leave request submitted successfully'
        });
    });
});

router.get('/getLeaveRequests', (req, res) => {
    const connection = req.app.locals.connection;
    const query = `
        SELECT lr.*, d.staffname, d.vehicleid
        FROM leave_requests lr
        JOIN driver d ON lr.staffcode = d.staffcode
        ORDER BY lr.submitted_at DESC
    `;

    connection.query(query, (err, results) => {
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

router.put('/approveLeaveRequest/:id', (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // 'approved' or 'rejected'

    if (!status || !['approved', 'rejected'].includes(status)) {
        return res.status(400).json({
            success: false,
            message: 'Valid status (approved or rejected) is required'
        });
    }

    const connection = req.app.locals.connection;
    const query = 'UPDATE leave_requests SET status = ? WHERE id = ?';

    connection.query(query, [status, id], (err, results) => {
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
                message: 'Leave request not found'
            });
        }

        return res.json({
            success: true,
            message: `Leave request ${status} successfully`
        });
    });
});

router.post('/addStage', (req, res) => {
    const { stageId, stageName, city, routeId, arrivalTime, departureTime, fee } = req.body;

    // Input validation
    if (!stageId || !stageName || !city || !routeId) {
        return res.status(400).json({
            success: false,
            message: 'Stage ID, Stage Name, City, and Route ID are required'
        });
    }

    const connection = req.app.locals.connection;
    const capacityQuery = `
        SELECT
            r.totalstages,
            COUNT(s.stageid) AS currentstages
        FROM route r
        LEFT JOIN stage s ON r.routeid = s.routeid
        WHERE r.routeid = ?
        GROUP BY r.routeid, r.totalstages
    `;

    connection.query(capacityQuery, [routeId], (capacityErr, capacityResults) => {
        if (capacityErr) {
            console.error('Database error:', capacityErr);
            return res.status(500).json({
                success: false,
                message: 'Database error'
            });
        }

        if (capacityResults.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Selected route does not exist'
            });
        }

        const totalStages = Number(capacityResults[0].totalstages) || 0;
        const currentStages = Number(capacityResults[0].currentstages) || 0;

        if (totalStages > 0 && currentStages >= totalStages) {
            return res.status(400).json({
                success: false,
                message: `Cannot add stage. Route ${routeId} already has ${currentStages} of ${totalStages} stages.`
            });
        }

        const query = 'INSERT INTO stage (stageid, stagename, city, routeid, arrivaltime, departuretime, fee) VALUES (?, ?, ?, ?, ?, ?, ?)';

        connection.query(query, [stageId, stageName, city, routeId, arrivalTime, departureTime, fee], (err, results) => {
            if (err) {
                console.error('Database error:', err);
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(409).json({
                        success: false,
                        message: 'Stage ID already exists'
                    });
                }
                return res.status(500).json({
                    success: false,
                    message: 'Database error'
                });
            }

            return res.json({
                success: true,
                message: 'Stage added successfully',
                stageId: stageId
            });
        });
    });
});

// Get complete route details including vehicles, drivers, and stages
router.get('/getRouteDetails/:routeid', (req, res) => {
    const { routeid } = req.params;

    if (!routeid) {
        return res.status(400).json({
            success: false,
            message: 'Route ID is required'
        });
    }

    const connection = req.app.locals.connection;

    // Query to get route details with vehicles, drivers, and stages
    const query = `
        SELECT
            r.routeid,
            r.routename,
            r.city as route_city,
            r.totalstages,
            r.totaldistance,
            v.vehicleid,
            v.vehicletype,
            v.seatcapacity,
            v.registrationno,
            v.registrationdate,
            v.purchasedate,
            v.vendorid,
            v.rcno,
            v.registrationplace,
            d.staffcode,
            d.staffname,
            d.doorno,
            d.streetname,
            d.city as driver_city,
            d.state,
            d.pincode,
            d.mobileno,
            s.stageid,
            s.stagename,
            s.city as stage_city,
            s.arrivaltime,
            s.departuretime,
            s.fee
        FROM route r
        LEFT JOIN vehicle v ON r.routeid = v.routeid
        LEFT JOIN driver d ON v.vehicleid = d.vehicleid
        LEFT JOIN stage s ON r.routeid = s.routeid
        WHERE r.routeid = ?
        ORDER BY s.stageid ASC
    `;

    connection.query(query, [routeid], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
                success: false,
                message: 'Database error'
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Route not found'
            });
        }

        // Structure the data
        const routeData = {
            routeid: results[0].routeid,
            routename: results[0].routename,
            city: results[0].route_city,
            totalstages: results[0].totalstages,
            totaldistance: results[0].totaldistance,
            vehicles: [],
            stages: []
        };

        // Group vehicles and drivers
        const vehicleMap = new Map();
        results.forEach(row => {
            if (row.vehicleid && !vehicleMap.has(row.vehicleid)) {
                vehicleMap.set(row.vehicleid, {
                    vehicleid: row.vehicleid,
                    vehicletype: row.vehicletype,
                    seatcapacity: row.seatcapacity,
                    registrationno: row.registrationno,
                    registrationdate: row.registrationdate,
                    purchasedate: row.purchasedate,
                    vendorid: row.vendorid,
                    rcno: row.rcno,
                    registrationplace: row.registrationplace,
                    driver: row.staffcode ? {
                        staffcode: row.staffcode,
                        staffname: row.staffname,
                        doorno: row.doorno,
                        streetname: row.streetname,
                        city: row.driver_city,
                        state: row.state,
                        pincode: row.pincode,
                        mobileno: row.mobileno
                    } : null
                });
            }

            // Collect stages
            if (row.stageid && !routeData.stages.some(s => s.stageid === row.stageid)) {
                routeData.stages.push({
                    stageid: row.stageid,
                    stagename: row.stagename,
                    city: row.stage_city,
                    arrivaltime: row.arrivaltime,
                    departuretime: row.departuretime,
                    fee: row.fee
                });
            }
        });

        routeData.vehicles = Array.from(vehicleMap.values());

        return res.json(routeData);
    });
});

module.exports = router;
