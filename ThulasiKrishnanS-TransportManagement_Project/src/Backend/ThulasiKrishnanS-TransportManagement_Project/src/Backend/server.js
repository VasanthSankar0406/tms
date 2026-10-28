const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const http = require('http');
const socketIo = require('socket.io');
const authRoutes = require('./routes/auth');
const routeRoutes = require('./routes/route');
const leaveRoutes = require('./routes/leave');
const trackingRoutes = require('./routes/tracking');
const deviceRoutes = require('./routes/device');
const attendanceRoutes = require('./routes/attendance');
const insuranceRoutes = require('./routes/insurance');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();

const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: ['http://localhost:3000', 'http://localhost:3001', 'https://localhost:3000', 'https://localhost:3001', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001', 'https://127.0.0.1:3000', 'https://127.0.0.1:3001', 'http://10.13.14.129:3000', 'http://10.13.14.129:5000', 'https://10.13.14.129:3000', 'https://10.13.14.129:5000', 'http://10.204.6.129:3000', 'http://10.204.6.129:5000', 'https://10.204.6.129:3000', 'https://10.204.6.129:5000'],
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// Configure CORS
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3001', 'https://localhost:3000', 'https://localhost:3001', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001', 'https://127.0.0.1:3000', 'https://127.0.0.1:3001', 'http://10.13.14.129:3000', 'http://10.13.14.129:5000', 'https://10.13.14.129:3000', 'https://10.13.14.129:5000', 'http://10.204.6.129:3000', 'http://10.204.6.129:5000', 'https://10.204.6.129:3000', 'https://10.204.6.129:5000'],
    credentials: true
}));

// Excel imports are sent as JSON rows, which can exceed Express's 100 KB default.
app.use(express.json({ limit: '10mb' }));

const ensureTravellerSchema = async (dbConnection) => {
    const promiseConnection = dbConnection.promise();
    await promiseConnection.query(`
        CREATE TABLE IF NOT EXISTS app_records (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            record_type VARCHAR(80) NOT NULL,
            record_key VARCHAR(190) NOT NULL,
            payload JSON NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uq_app_records_type_key (record_type, record_key),
            KEY idx_app_records_type_id (record_type, id)
        )
    `);
    const [tableRows] = await promiseConnection.query("SHOW TABLES LIKE 'traveller'");

    if (!Array.isArray(tableRows) || tableRows.length === 0) {
        await promiseConnection.query(`
            CREATE TABLE traveller (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                rollno VARCHAR(50) NOT NULL,
                role VARCHAR(100),
                year VARCHAR(50),
                stafftype VARCHAR(100),
                branch VARCHAR(100),
                phoneno VARCHAR(20),
                city VARCHAR(100),
                place VARCHAR(100),
                stage_name VARCHAR(100),
                point VARCHAR(100),
                routeid VARCHAR(50),
                UNIQUE KEY uk_traveller_rollno (rollno)
            )
        `);
        return;
    }

    const requiredColumns = [
        { name: 'name', definition: "ALTER TABLE traveller ADD COLUMN name VARCHAR(255) NOT NULL DEFAULT ''" },
        { name: 'rollno', definition: "ALTER TABLE traveller ADD COLUMN rollno VARCHAR(50) NOT NULL DEFAULT ''" },
        { name: 'role', definition: "ALTER TABLE traveller ADD COLUMN role VARCHAR(100) NULL" },
        { name: 'year', definition: "ALTER TABLE traveller ADD COLUMN year VARCHAR(50) NULL" },
        { name: 'stafftype', definition: "ALTER TABLE traveller ADD COLUMN stafftype VARCHAR(100) NULL" },
        { name: 'branch', definition: "ALTER TABLE traveller ADD COLUMN branch VARCHAR(100) NULL" },
        { name: 'phoneno', definition: "ALTER TABLE traveller ADD COLUMN phoneno VARCHAR(20) NULL" },
        { name: 'city', definition: "ALTER TABLE traveller ADD COLUMN city VARCHAR(100) NULL" },
        { name: 'place', definition: "ALTER TABLE traveller ADD COLUMN place VARCHAR(100) NULL" },
        { name: 'stage_name', definition: "ALTER TABLE traveller ADD COLUMN stage_name VARCHAR(100) NULL" },
        { name: 'point', definition: "ALTER TABLE traveller ADD COLUMN point VARCHAR(100) NULL" },
        { name: 'routeid', definition: "ALTER TABLE traveller ADD COLUMN routeid VARCHAR(50) NULL" }
    ];

    const [columnRows] = await promiseConnection.query("SHOW COLUMNS FROM traveller");
    const existingColumns = new Set((columnRows || []).map((column) => column.Field));

    for (const column of requiredColumns) {
        if (!existingColumns.has(column.name)) {
            await promiseConnection.query(column.definition);
            existingColumns.add(column.name);
        }
    }

    if (existingColumns.has('place') && existingColumns.has('city')) {
        await promiseConnection.query("UPDATE traveller SET city = place WHERE (city IS NULL OR city = '') AND place IS NOT NULL");
    }

    if (existingColumns.has('point') && existingColumns.has('stage_name')) {
        await promiseConnection.query("UPDATE traveller SET stage_name = point WHERE (stage_name IS NULL OR stage_name = '') AND point IS NOT NULL");
    }

    const [indexRows] = await promiseConnection.query("SHOW INDEX FROM traveller WHERE Key_name = 'uk_traveller_rollno'");
    if (existingColumns.has('rollno') && Array.isArray(indexRows) && indexRows.length === 0) {
        await promiseConnection.query("ALTER TABLE traveller ADD UNIQUE KEY uk_traveller_rollno (rollno)");
    }
};

// Simple authentication middleware for admin routes
const requireAdmin = (req, res, next) => {
    next();
};

// Database connection
const connection = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'transport',
    port: process.env.DB_PORT || 3306
});

// Test database connection
connection.connect((err) => {
    if (err) {
        console.error('MySQL connection failed; backend will not start:', err.message);
        process.exit(1);
    } else {
        console.log('Connected to MySQL database successfully');
        ensureTravellerSchema(connection)
            .then(() => {
                console.log('Traveller schema ready');
                startHttpServer();
            })
            .catch((e) => {
                console.error('Schema error; backend will not start:', e.message);
                process.exit(1);
            });
    }
});

app.locals.connection = connection;

const busLookupRoutes = require('./routes/busLookup');
const feesAndFleetRoutes = require('./routes/feesAndFleet');

app.use('/', authRoutes);
app.use('/', routeRoutes);
app.use('/', leaveRoutes);
app.use('/', trackingRoutes);
app.use('/', deviceRoutes);
app.use('/', attendanceRoutes);
app.use('/', insuranceRoutes);
app.use('/', busLookupRoutes);
app.use('/', feesAndFleetRoutes);

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Backend is running' });
});

// Driver app route - serve the HTML page
app.get('/driver-app', (req, res) => {
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Driver App - Transport Management System</title>
        <style>
            .driver-app {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              font-family: Arial, sans-serif;
            }

            .driver-app h2 {
              color: #333;
              text-align: center;
              margin-bottom: 30px;
            }

            .login-section {
              background: #fff3cd;
              padding: 15px;
              border-radius: 8px;
              margin-bottom: 20px;
              border: 1px solid #ffeaa7;
            }

            .bus-id-input {
              width: 100%;
              padding: 10px;
              font-size: 16px;
              border: 1px solid #ccc;
              border-radius: 4px;
              margin-top: 10px;
            }

            .driver-info {
              background-color: #f5f5f5;
              padding: 15px;
              border-radius: 8px;
              margin-bottom: 20px;
            }

            .driver-info p {
              margin: 5px 0;
              font-size: 16px;
            }

            .location-controls {
              text-align: center;
              margin-bottom: 30px;
            }

            .start-btn, .stop-btn {
              padding: 12px 24px;
              font-size: 16px;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              transition: background-color 0.3s;
            }

            .start-btn {
              background-color: #28a745;
              color: white;
            }

            .start-btn:hover:not(:disabled) {
              background-color: #218838;
            }

            .start-btn:disabled {
              background-color: #6c757d;
              cursor: not-allowed;
            }

            .stop-btn {
              background-color: #dc3545;
              color: white;
            }

            .stop-btn:hover {
              background-color: #c82333;
            }

            .location-display {
              background-color: #e9ecef;
              padding: 15px;
              border-radius: 8px;
              margin-bottom: 20px;
            }

            .location-display h3 {
              margin-top: 0;
              color: #495057;
            }

            .location-display p {
              margin: 8px 0;
              font-size: 14px;
            }

            .status {
              text-align: center;
              font-size: 18px;
              font-weight: bold;
              color: #007bff;
            }
        </style>
    </head>
    <body>
        <div class="driver-app">
            <h2>Driver Location Sharing</h2>

            <div class="login-section">
                <p>Enter your Vehicle ID to start sharing location:</p>
                <input
                    type="text"
                    id="busId"
                    placeholder="Vehicle ID (e.g., V001)"
                    class="bus-id-input"
                />
            </div>

            <div class="location-controls">
                <button id="startBtn" class="start-btn" disabled>
                    Start Sharing Location
                </button>
                <button id="stopBtn" class="stop-btn" style="display: none;">
                    Stop Sharing Location
                </button>
            </div>

            <div id="locationDisplay" class="location-display" style="display: none;">
                <h3>Current Location</h3>
                <p><strong>Latitude:</strong> <span id="latitude">-</span></p>
                <p><strong>Longitude:</strong> <span id="longitude">-</span></p>
                <p><strong>Speed:</strong> <span id="speed">N/A</span></p>
            </div>

            <div class="status">
                <p><strong>Status:</strong> <span id="status">Not Sharing</span></p>
                <p id="errorMsg" style="color: red; display: none;"></p>
            </div>
        </div>

        <script src="https://cdn.socket.io/4.8.1/socket.io.min.js"></script>
        <script>
            let socket;
            let watchId;
            let isSharing = false;

            // Initialize socket connection
            const serverIP = window.location.hostname;
            const protocol = window.location.protocol === 'https:' ? 'https' : 'http';
            socket = io(\`\${protocol}://\${serverIP}:5000\`);

            // DOM elements
            const busIdInput = document.getElementById('busId');
            const startBtn = document.getElementById('startBtn');
            const stopBtn = document.getElementById('stopBtn');
            const locationDisplay = document.getElementById('locationDisplay');
            const latitudeSpan = document.getElementById('latitude');
            const longitudeSpan = document.getElementById('longitude');
            const speedSpan = document.getElementById('speed');
            const statusSpan = document.getElementById('status');
            const errorMsg = document.getElementById('errorMsg');

            // Enable/disable start button based on input
            busIdInput.addEventListener('input', () => {
                startBtn.disabled = !busIdInput.value.trim();
            });

            startBtn.addEventListener('click', startLocationSharing);
            stopBtn.addEventListener('click', stopLocationSharing);

            function startLocationSharing() {
                if (!navigator.geolocation) {
                    showError('Geolocation is not supported by this browser.');
                    return;
                }

                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const { latitude, longitude, speed } = position.coords;

                        // Update display
                        latitudeSpan.textContent = latitude.toFixed(6);
                        longitudeSpan.textContent = longitude.toFixed(6);
                        speedSpan.textContent = speed ? \`\${speed.toFixed(2)} m/s\` : 'N/A';
                        locationDisplay.style.display = 'block';

                        // Send initial location
                        socket.emit('locationUpdate', {
                            busId: busIdInput.value.trim(),
                            latitude,
                            longitude,
                            speed: speed || 0
                        });

                        // Start watching for continuous updates
                        watchId = navigator.geolocation.watchPosition(
                            (watchPosition) => {
                                const { latitude, longitude, speed } = watchPosition.coords;

                                latitudeSpan.textContent = latitude.toFixed(6);
                                longitudeSpan.textContent = longitude.toFixed(6);
                                speedSpan.textContent = speed ? \`\${speed.toFixed(2)} m/s\` : 'N/A';

                                socket.emit('locationUpdate', {
                                    busId: busIdInput.value.trim(),
                                    latitude,
                                    longitude,
                                    speed: speed || 0
                                });
                            },
                            (error) => {
                                console.error('Error watching location:', error);
                                showError('Error getting location updates. Please check permissions.');
                                stopLocationSharing();
                            },
                            {
                                enableHighAccuracy: true,
                                timeout: 30000,
                                maximumAge: 60000
                            }
                        );

                        isSharing = true;
                        statusSpan.textContent = 'Sharing Location';
                        startBtn.style.display = 'none';
                        stopBtn.style.display = 'inline-block';
                        busIdInput.disabled = true;
                        errorMsg.style.display = 'none';
                    },
                    (error) => {
                        console.error('Error getting initial location:', error);
                        let errorMessage = 'Cannot access location. ';
                        switch(error.code) {
                            case error.PERMISSION_DENIED:
                                errorMessage += 'Location permission denied. Please enable location access in your browser settings and refresh the page.';
                                break;
                            case error.POSITION_UNAVAILABLE:
                                errorMessage += 'Location information is unavailable.';
                                break;
                            case error.TIMEOUT:
                                errorMessage += 'Location request timed out.';
                                break;
                            default:
                                errorMessage += 'Please enable location services and try again.';
                                break;
                        }
                        showError(errorMessage);
                    },
                    {
                        enableHighAccuracy: true,
                        timeout: 30000,
                        maximumAge: 30000
                    }
                );
            }

            function stopLocationSharing() {
                if (watchId) {
                    navigator.geolocation.clearWatch(watchId);
                    watchId = null;
                }
                isSharing = false;
                statusSpan.textContent = 'Not Sharing';
                startBtn.style.display = 'inline-block';
                stopBtn.style.display = 'none';
                busIdInput.disabled = false;
                locationDisplay.style.display = 'none';
                errorMsg.style.display = 'none';
            }

            function showError(message) {
                errorMsg.textContent = message;
                errorMsg.style.display = 'block';
            }
        </script>
    </body>
    </html>
    `;
    res.send(html);
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Handle location updates from drivers
    socket.on('locationUpdate', (data) => {
        console.log('Location update received:', data);
        // Validate data
        if (!data.busId || !data.latitude || !data.longitude) {
            socket.emit('error', { message: 'Invalid location data' });
            return;
        }

        // Save to database - first check if record exists, then update or insert
        const checkQuery = 'SELECT id FROM bus_location WHERE vehicleid = ? ORDER BY timestamp DESC LIMIT 1';
        connection.query(checkQuery, [data.busId], (checkError, checkResults) => {
          if (checkError) {
            console.error('Error checking location:', checkError);
            socket.emit('error', { message: 'Failed to check location' });
            return;
          }

          if (checkResults.length > 0) {
            // Update existing record
            const updateQuery = 'UPDATE bus_location SET latitude = ?, longitude = ?, speed = ?, timestamp = CURRENT_TIMESTAMP WHERE vehicleid = ?';
            connection.query(updateQuery, [data.latitude, data.longitude, data.speed || null, data.busId], (updateError, updateResults) => {
              if (updateError) {
                console.error('Error updating location:', updateError);
                socket.emit('error', { message: 'Failed to update location' });
                return;
              }
              console.log('Location updated for vehicle:', data.busId);
            });
          } else {
            // Insert new record
            const insertQuery = 'INSERT INTO bus_location (vehicleid, latitude, longitude, speed) VALUES (?, ?, ?, ?)';
            connection.query(insertQuery, [data.busId, data.latitude, data.longitude, data.speed || null], (insertError, insertResults) => {
              if (insertError) {
                console.error('Error inserting location:', insertError);
                socket.emit('error', { message: 'Failed to insert location' });
                return;
              }
              console.log('Location inserted for vehicle:', data.busId);
            });
          }
        });

        // Broadcast to admin clients
        io.emit('locationUpdate', {
            busId: data.busId,
            latitude: data.latitude,
            longitude: data.longitude,
            speed: data.speed,
            timestamp: new Date()
        });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 5000;

function startHttpServer() {
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on port ${PORT} and accessible at http://0.0.0.0:${PORT}`);
    });
}
