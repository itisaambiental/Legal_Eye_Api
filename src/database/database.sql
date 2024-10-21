-- Create Database
-- The 'LegalEye' database is used to manage legal information, users, and roles.
CREATE DATABASE LegalEye;

-- Use Database
USE LegalEye;

-- Table: roles
-- This table stores user roles within the system.
-- Columns:
-- - id: Unique identifier for each role, auto-incremented.
-- - name: Defines the name of the role, restricted to 'Admin' or 'Analyst'.
CREATE TABLE roles (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name ENUM('Admin', 'Analyst') NOT NULL UNIQUE
);

-- Table: users
-- This table stores user information including credentials and profile.
-- Columns:
-- - id: Unique identifier for each user, auto-incremented.
-- - name: Full name of the user.
-- - password: Hashed password of the user.
-- - gmail: User's email address, must be unique.
-- - role_id: Foreign key referencing the 'roles' table.
-- - profile_picture: URL of the user's profile picture, optional.
CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    gmail VARCHAR(255) NOT NULL UNIQUE,
    role_id BIGINT NOT NULL,
    profile_picture VARCHAR(255) DEFAULT NULL, 
    FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- Table: verification_codes
-- This table stores verification codes for user account recovery and validation.
-- Columns:
-- - id: Unique identifier for each verification code, auto-incremented.
-- - gmail: Email address associated with the verification code.
-- - code: Verification code used for password reset or validation.
-- - expires_at: Expiration timestamp of the verification code.
CREATE TABLE verification_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    gmail VARCHAR(255) NOT NULL,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL
);

-- Table: legal_basis
-- This table stores legal documents and their classifications.
-- Columns:
-- - id: Unique identifier for each legal basis, auto-incremented.
-- - legal_name: Name of the legal document.
-- - abbreviation: Abbreviation of the legal document, optional.
-- - classification: Type of legal document, defined by specific categories.
-- - jurisdiction: Defines the jurisdiction (State, Federal, Local).
-- - state: State associated with the legal document, if applicable.
-- - municipality: Municipality associated with the legal document, if applicable.
-- - url: URL of the legal document.
-- - last_reform: Date of the last reform to the legal document.
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

-- Table: article
-- This table stores articles related to legal documents.
-- Columns:
-- - id: Unique identifier for each article, auto-incremented.
-- - legal_basis_id: Foreign key referencing the 'legal_basis' table.
-- - article_name: Name of the article.
-- - description: Description of the article, optional.
-- - article_order: Order of the article within the legal document.
CREATE TABLE article (
    id INT AUTO_INCREMENT PRIMARY KEY,
    legal_basis_id INT NOT NULL,
    article_name VARCHAR(255) NOT NULL,
    description TEXT,
    article_order INT,
    FOREIGN KEY (legal_basis_id) REFERENCES legal_basis(id) ON DELETE CASCADE
);
