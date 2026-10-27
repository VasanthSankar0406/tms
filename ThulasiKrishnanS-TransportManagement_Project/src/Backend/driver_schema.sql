-- Create the driver database
CREATE DATABASE IF NOT EXISTS driver_db;

-- Use the driver database
USE driver_db;

-- Create the driver table
CREATE TABLE IF NOT EXISTS driver (
    vehicleid VARCHAR(50) PRIMARY KEY,
    password VARCHAR(255) NOT NULL DEFAULT 'driver123'
);
