-- Full Database Schema for Transport Management System
-- Run this script in MySQL Workbench or command line to set up the database

-- Create the database (replace 'tms_db' with your desired database name)
CREATE DATABASE IF NOT EXISTS tms_db;
USE tms_db;

-- Create the route table
CREATE TABLE IF NOT EXISTS route (
    routeid VARCHAR(50) PRIMARY KEY,
    routename VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    totalstages INT NOT NULL,
    totaldistance DECIMAL(10,2) NOT NULL
);

-- Create the stage table
CREATE TABLE IF NOT EXISTS stage (
    stageid VARCHAR(50) PRIMARY KEY,
    stagename VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    routeid VARCHAR(50) NOT NULL,
    arrivaltime TIME,
    departureTime TIME,
    fee DECIMAL(10,2),
    FOREIGN KEY (routeid) REFERENCES route(routeid) ON DELETE CASCADE
);

-- Create the vehicle table
CREATE TABLE IF NOT EXISTS vehicle (
    vehicleid VARCHAR(50) PRIMARY KEY,
    vehicletype VARCHAR(100) NOT NULL,
    seatcapacity INT NOT NULL,
    registrationno VARCHAR(50) NOT NULL,
    routeid VARCHAR(50),
    registrationdate DATE,
    purchasedate DATE,
    vendorid VARCHAR(50),
    rcno VARCHAR(50),
    registrationplace VARCHAR(100),
    FOREIGN KEY (routeid) REFERENCES route(routeid) ON DELETE SET NULL
);

-- Create the driver table
CREATE TABLE IF NOT EXISTS driver (
    staffcode VARCHAR(50) PRIMARY KEY,
    staffname VARCHAR(255) NOT NULL,
    vehicleid VARCHAR(50),
    doorno VARCHAR(50),
    streetname VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(20),
    mobileno VARCHAR(20),
    photo LONGBLOB,
    FOREIGN KEY (vehicleid) REFERENCES vehicle(vehicleid) ON DELETE SET NULL
);

-- Create the traveller table
CREATE TABLE IF NOT EXISTS traveller (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    rollno VARCHAR(50) NOT NULL UNIQUE,
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
    FOREIGN KEY (routeid) REFERENCES route(routeid) ON DELETE SET NULL
);

-- Create the fc table (Fitness Certificate)
CREATE TABLE IF NOT EXISTS fc (
    fcid INT AUTO_INCREMENT PRIMARY KEY,
    vehicleid VARCHAR(50) NOT NULL,
    fcno VARCHAR(50) NOT NULL,
    issuedate DATE,
    expirydate DATE,
    status VARCHAR(50),
    FOREIGN KEY (vehicleid) REFERENCES vehicle(vehicleid) ON DELETE CASCADE
);

-- Create the insurance table
CREATE TABLE IF NOT EXISTS insurance (
    insuranceid INT AUTO_INCREMENT PRIMARY KEY,
    vehicleid VARCHAR(50) NOT NULL,
    policyno VARCHAR(50) NOT NULL,
    companyname VARCHAR(255),
    issuedate DATE,
    expirydate DATE,
    premiumamount DECIMAL(10,2),
    FOREIGN KEY (vehicleid) REFERENCES vehicle(vehicleid) ON DELETE CASCADE
);

-- Create the permit table
CREATE TABLE IF NOT EXISTS permit (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vehicleid VARCHAR(50) NOT NULL,
    permitno VARCHAR(50) NOT NULL,
    permittype VARCHAR(100),
    issuedate DATE,
    expirydate DATE,
    status VARCHAR(50),
    FOREIGN KEY (vehicleid) REFERENCES vehicle(vehicleid) ON DELETE CASCADE
);

-- Create the bus_location table for live tracking
CREATE TABLE IF NOT EXISTS bus_location (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vehicleid VARCHAR(50) NOT NULL,
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    speed DECIMAL(5,2),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vehicleid) REFERENCES vehicle(vehicleid) ON DELETE CASCADE
);

-- Create the leave_requests table
CREATE TABLE IF NOT EXISTS leave_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    staffcode VARCHAR(50) NOT NULL,
    reason TEXT NOT NULL,
    leave_date DATE NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (staffcode) REFERENCES driver(staffcode) ON DELETE CASCADE
);

-- Create the driver_queries table
CREATE TABLE IF NOT EXISTS driver_queries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    staffcode VARCHAR(50) NOT NULL,
    query_text TEXT NOT NULL,
    status ENUM('pending', 'resolved') DEFAULT 'pending',
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (staffcode) REFERENCES driver(staffcode) ON DELETE CASCADE
);

-- Create the attendance table for individual student attendance
CREATE TABLE IF NOT EXISTS attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rollno VARCHAR(50) NOT NULL,
    attendance_date DATE NOT NULL,
    status ENUM('present', 'absent') NOT NULL,
    marked_by VARCHAR(50),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_attendance (rollno, attendance_date),
    FOREIGN KEY (rollno) REFERENCES traveller(rollno) ON DELETE CASCADE
);

-- Create the device_location table for live device tracking
CREATE TABLE IF NOT EXISTS device_location (
    id INT AUTO_INCREMENT PRIMARY KEY,
    imei VARCHAR(50) NOT NULL UNIQUE,
    device_model VARCHAR(100),
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    speed DECIMAL(5,2),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_imei (imei)
);

-- Create the student_attendance_count table for daily student count by drivers
CREATE TABLE IF NOT EXISTS student_attendance_count (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vehicleid VARCHAR(50) NOT NULL,
    routeid VARCHAR(50),
    attendance_date DATE NOT NULL,
    student_count INT NOT NULL,
    marked_by VARCHAR(50),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_count (vehicleid, attendance_date),
    FOREIGN KEY (vehicleid) REFERENCES vehicle(vehicleid) ON DELETE CASCADE,
    FOREIGN KEY (routeid) REFERENCES route(routeid) ON DELETE SET NULL
);

-- Persistent records for fees, seat assignments, maintenance, washing,
-- complaints, notifications, and vehicle status.
CREATE TABLE IF NOT EXISTS app_records (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    record_type VARCHAR(80) NOT NULL,
    record_key VARCHAR(190) NOT NULL,
    payload JSON NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_app_records_type_key (record_type, record_key),
    KEY idx_app_records_type_id (record_type, id)
);

