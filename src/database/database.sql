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


CREATE TABLE legal_basis (
    id INT AUTO_INCREMENT PRIMARY KEY,
    legal_name VARCHAR(255) NOT NULL,
    abbreviation VARCHAR(20),
    classification ENUM(
        'Ley', 
        'Reglamento', 
        'Norma', 
        'Acuerdos', 
        'Código', 
        'Decreto', 
        'Lineamiento', 
        'Orden Jurídico', 
        'Aviso', 
        'Convocatoria', 
        'Plan', 
        'Programa',
        'Recomendaciones'
    ) NOT NULL,
    jurisdiction ENUM('Estatal', 'Federal', 'Local') NOT NULL,
    state VARCHAR(255),
    municipality VARCHAR(255),
    url VARCHAR(255),
    last_reform DATE
);



CREATE TABLE article (
    id INT AUTO_INCREMENT PRIMARY KEY,
    legal_basis_id INT NOT NULL,
    article_name VARCHAR(255) NOT NULL,
    description TEXT,
    article_order INT,
    FOREIGN KEY (legal_basis_id) REFERENCES legal_basis(id) ON DELETE CASCADE
);
