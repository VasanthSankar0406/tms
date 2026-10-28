const mysql = require('mysql2');
require('dotenv').config();

// Main database connection
const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});
connection.connect((err) => {
    if (err) {
        console.error('Main database connection failed:', err);
        return;
    }
    console.log('Connected to Main MySQL Database');
});

// Driver database connection
const driverConnection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME, // Separate database for drivers
    port: process.env.DB_PORT
});
driverConnection.connect((err) => {
    if (err) {
        console.error('Driver database connection failed:', err);
        return;
    }
    console.log('Connected to Driver MySQL Database');
});

module.exports = { connection, driverConnection };
