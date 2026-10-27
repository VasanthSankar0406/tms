-- Create the route table if it doesn't exist
CREATE TABLE IF NOT EXISTS route (
    routeid VARCHAR(50) PRIMARY KEY,
    routename VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    totalstages INT NOT NULL,
    totaldistance DECIMAL(10,2) NOT NULL
);

-- Create the stage table if it doesn't exist
CREATE TABLE IF NOT EXISTS stage (
    stageid VARCHAR(50) PRIMARY KEY,
    stagename VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    routeid VARCHAR(50) NOT NULL,
    arrivaltime TIME,
    departureTime TIME,
    fee DECIMAL(10,2),
    FOREIGN KEY (routeid) REFERENCES route(routeid)
);

-- Create the vehicle table if it doesn't exist
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
    FOREIGN KEY (routeid) REFERENCES route(routeid)
);

-- Create the driver table if it doesn't exist
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
    FOREIGN KEY (vehicleid) REFERENCES vehicle(vehicleid)
);

-- Create the traveller table if it doesn't exist
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
    FOREIGN KEY (routeid) REFERENCES route(routeid)
);

-- Create the fc table if it doesn't exist
CREATE TABLE IF NOT EXISTS fc (
    fcid INT AUTO_INCREMENT PRIMARY KEY,
    vehicleid VARCHAR(50) NOT NULL,
    fcno VARCHAR(50) NOT NULL,
    issuedate DATE,
    expirydate DATE,
    status VARCHAR(50),
    FOREIGN KEY (vehicleid) REFERENCES vehicle(vehicleid)
);

-- Create the insurance table if it doesn't exist
CREATE TABLE IF NOT EXISTS insurance (
    insuranceid INT AUTO_INCREMENT PRIMARY KEY,
    vehicleid VARCHAR(50) NOT NULL,
    policyno VARCHAR(50) NOT NULL,
    companyname VARCHAR(255),
    issuedate DATE,
    expirydate DATE,
    premiumamount DECIMAL(10,2),
    FOREIGN KEY (vehicleid) REFERENCES vehicle(vehicleid)
);

-- Create the permit table if it doesn't exist
CREATE TABLE IF NOT EXISTS permit (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vehicleid VARCHAR(50) NOT NULL,
    permitno VARCHAR(50) NOT NULL,
    permittype VARCHAR(100),
    issuedate DATE,
    expirydate DATE,
    status VARCHAR(50),
    FOREIGN KEY (vehicleid) REFERENCES vehicle(vehicleid)
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
