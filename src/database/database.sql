-- Create Database
CREATE DATABASE LegalEye_Dev;

-- Use Database
USE LegalEye_Dev;

-- Table to store roles
CREATE TABLE roles (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name ENUM('Admin', 'Analyst') NOT NULL UNIQUE
);

-- Table to store users
CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    gmail VARCHAR(255) NOT NULL UNIQUE,
    role_id BIGINT NOT NULL,
    profile_picture VARCHAR(255) DEFAULT NULL, 
    FOREIGN KEY (role_id) REFERENCES roles(id)
);
