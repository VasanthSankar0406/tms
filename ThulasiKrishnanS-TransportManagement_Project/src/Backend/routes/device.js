const express = require('express');
const router = express.Router();

// Register a new device
router.post('/api/registerDevice', (req, res) => {
  const connection = req.app.locals.connection;
  const { imei, device_model } = req.body;

  if (!imei) {
    return res.status(400).json({ error: 'IMEI is required' });
  }

  const query = 'INSERT INTO device_location (imei, device_model, latitude, longitude) VALUES (?, ?, 0, 0) ON DUPLICATE KEY UPDATE device_model = VALUES(device_model)';
  connection.query(query, [imei, device_model || 'Unknown'], (error, results) => {
    if (error) {
      console.error('Error registering device:', error);
      return res.status(500).json({ error: 'Failed to register device' });
    }
    res.json({ message: 'Device registered successfully', id: results.insertId });
  });
});

// Update device location
router.post('/api/updateDeviceLocation', (req, res) => {
  const connection = req.app.locals.connection;
  const { imei, latitude, longitude, speed } = req.body;

  if (!imei || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: 'IMEI, latitude, and longitude are required' });
  }

  const query = 'INSERT INTO device_location (imei, latitude, longitude, speed) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE latitude = VALUES(latitude), longitude = VALUES(longitude), speed = VALUES(speed), timestamp = CURRENT_TIMESTAMP';
  connection.query(query, [imei, latitude, longitude, speed || null], (error, results) => {
    if (error) {
      console.error('Error updating device location:', error);
      return res.status(500).json({ error: 'Failed to update device location' });
    }
    res.json({ message: 'Device location updated successfully' });
  });
});

// Get device location by IMEI
router.get('/api/getDeviceLocation/:imei', (req, res) => {
  const connection = req.app.locals.connection;
  const { imei } = req.params;

  const query = 'SELECT * FROM device_location WHERE imei = ? ORDER BY timestamp DESC LIMIT 1';
  connection.query(query, [imei], (error, results) => {
    if (error) {
      console.error('Error fetching device location:', error);
      return res.status(500).json({ error: 'Failed to fetch device location' });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }
    res.json(results[0]);
  });
});

module.exports = router;
