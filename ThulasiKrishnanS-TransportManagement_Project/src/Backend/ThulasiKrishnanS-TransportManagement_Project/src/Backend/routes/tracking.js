const express = require('express');
const router = express.Router();

// This route returns live bus locations from the bus_location table joined with vehicle and driver info
router.get('/api/getLocations', (req, res) => {
  const connection = req.app.locals.connection;
  const query = `
    SELECT bl.vehicleid, v.registrationno, d.staffname AS drivername, bl.latitude, bl.longitude, bl.speed, bl.timestamp
    FROM bus_location bl
    LEFT JOIN vehicle v ON bl.vehicleid = v.vehicleid
    LEFT JOIN driver d ON v.vehicleid = d.vehicleid
    ORDER BY bl.timestamp DESC
  `;

  connection.query(query, (error, results) => {
    if (error) {
      console.error('Error fetching bus locations:', error);
      return res.status(500).json({ error: 'Failed to fetch bus locations' });
    }
    res.json(results);
  });
});

module.exports = router;
