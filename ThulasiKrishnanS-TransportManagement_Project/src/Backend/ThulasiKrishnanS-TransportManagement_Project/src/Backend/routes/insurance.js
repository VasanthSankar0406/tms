const express = require('express');
const router = express.Router();

router.post('/addInsurance', (req, res) => {
    const { vehicleId, policyNo, companyName, issueDate, expiryDate, premiumAmount } = req.body;

    // Input validation
    if (!vehicleId || !policyNo || !companyName || !issueDate || !expiryDate || !premiumAmount) {
        return res.status(400).json({
            success: false,
            message: 'All fields are required'
        });
    }

    const connection = req.app.locals.connection;
    const query = 'INSERT INTO insurance (vehicleid, policyno, companyname, issuedate, expirydate, premiumamount) VALUES (?, ?, ?, ?, ?, ?)';

    connection.query(query, [vehicleId, policyNo, companyName, issueDate, expiryDate, premiumAmount], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({
                    success: false,
                    message: 'Insurance policy already exists'
                });
            }
            return res.status(500).json({
                success: false,
                message: 'Database error'
            });
        }

        return res.json({
            success: true,
            message: 'Insurance added successfully'
        });
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

router.put('/updateInsurance/:id', (req, res) => {
    const { id } = req.params;
    const { vehicleId, policyNo, companyName, issueDate, expiryDate, premiumAmount } = req.body;

    // Input validation
    if (!vehicleId || !policyNo || !companyName || !issueDate || !expiryDate || !premiumAmount) {
        return res.status(400).json({
            success: false,
            message: 'All fields are required'
        });
    }

    const connection = req.app.locals.connection;
    const query = 'UPDATE insurance SET vehicleid = ?, policyno = ?, companyname = ?, issuedate = ?, expirydate = ?, premiumamount = ? WHERE insuranceid = ?';

    connection.query(query, [vehicleId, policyNo, companyName, issueDate, expiryDate, premiumAmount, id], (err, results) => {
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
                message: 'Insurance record not found'
            });
        }

        return res.json({
            success: true,
            message: 'Insurance updated successfully'
        });
    });
});

router.delete('/deleteInsurance/:id', (req, res) => {
    const { id } = req.params;

    const connection = req.app.locals.connection;
    const query = 'DELETE FROM insurance WHERE insuranceid = ?';

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
                message: 'Insurance record not found'
            });
        }

        return res.json({
            success: true,
            message: 'Insurance deleted successfully'
        });
    });
});

module.exports = router;
