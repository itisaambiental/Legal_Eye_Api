-- Create Database
CREATE DATABASE LegalEye;

-- Use Database
USE LegalEye;

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


CREATE TABLE verification_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    gmail VARCHAR(255) NOT NULL,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL
);

INSERT INTO roles (name) 
VALUES ('Admin'), ('Analyst');