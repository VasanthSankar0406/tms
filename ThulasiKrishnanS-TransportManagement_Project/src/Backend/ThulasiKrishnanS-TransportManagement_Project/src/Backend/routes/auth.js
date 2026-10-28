const express = require('express');
const router = express.Router();
require('dotenv').config();

router.post('/login', (req, res) => {
    const { username, password, role } = req.body;
    console.log('Login attempt:', { username, role }); // For debugging

    // Input validation
    if (!username || !password || !role) {
        return res.status(400).json({
            success: false,
            message: 'All fields are required'
        });
    }

    // Admin login
    if (role === 'admin') {
        // Compare with trimmed values
        const envEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
        const envPassword = (process.env.ADMIN_PASSWORD || '').trim();
        const validEmails = [envEmail, '2312044@nec.edu.in', 'admin@nec.edu.in', 'admin'].filter(Boolean);
        const validPasswords = ['admin123', envPassword, '@Vasanth0406'].filter(Boolean);

        const isValidEmail = validEmails.includes(username.trim().toLowerCase());
        const isValidPassword = validPasswords.includes(password.trim());

        console.log('Admin validation:', { isValidEmail, isValidPassword }); // For debugging

        if (isValidEmail && isValidPassword) {
            return res.json({
                success: true,
                message: 'Admin login successful',
                adminInfo: {
                    email: username
                }
            });
        }

        return res.status(401).json({
            success: false,
            message: 'Invalid admin credentials'
        });
    }

    // Driver login
    if (role === 'driver') {
        const connection = req.app.locals.connection;
        const driverPassword = process.env.DRIVER_PASSWORD || 'driver123';

        const query = 'SELECT * FROM driver WHERE staffcode = ?';

        connection.query(query, [username.trim()], (err, results) => {
            if (err) {
                console.error('Driver login database error:', err.message);
                return res.status(500).json({
                    success: false,
                    message: 'Database error'
                });
            }

            if (results && results.length > 0 && password.trim() === driverPassword) {
                return res.json({
                    success: true,
                    message: 'Driver login successful',
                    driverInfo: {
                        staffcode: results[0].staffcode,
                        vehicleId: results[0].vehicleid || null
                    }
                });
            }

            return res.status(401).json({
                success: false,
                message: 'Invalid driver credentials'
            });
        });
    }
});

module.exports = router;
