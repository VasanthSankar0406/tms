const mysql = require('mysql2');
require('dotenv').config({ path: '../.env' }); // Adjust path based on where you run it

const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});

connection.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err);
        process.exit(1);
    }
    console.log('Connected to database');

    const createTableQuery = `
    CREATE TABLE IF NOT EXISTS temp_driver_assignments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        leave_request_id INT NOT NULL,
        permanent_driver_staffcode VARCHAR(50) NOT NULL,
        temp_driver_staffcode VARCHAR(50) NOT NULL,
        vehicle_id VARCHAR(50) NOT NULL,
        assignment_date DATE NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (leave_request_id) REFERENCES leave_requests(id),
        FOREIGN KEY (permanent_driver_staffcode) REFERENCES driver(staffcode),
        FOREIGN KEY (temp_driver_staffcode) REFERENCES driver(staffcode),
        FOREIGN KEY (vehicle_id) REFERENCES vehicle(vehicleid)
    )`;

    connection.query(createTableQuery, (err, results) => {
        if (err) {
            console.error('Error creating table:', err);
        } else {
            console.log('Table temp_driver_assignments created or already exists.');
        }
        connection.end();
    });
});
