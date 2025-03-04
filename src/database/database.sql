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

-- Table: subjects
-- This table stores the main subjects or categories that legal documents can belong to.
-- Columns:
-- - id: Unique identifier for each subject, auto-incremented.
-- - subject_name: Name of the subject, such as 'Environmental', 'Security', etc.
CREATE TABLE subjects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subject_name VARCHAR(255) NOT NULL
);

-- Table: aspects
-- Stores specific aspects linked to subjects. Each subject can have multiple aspects.
-- Columns:
-- - id: Unique identifier for each aspect, auto-incremented.
-- - subject_id: Foreign key referencing the 'subjects' table.
-- - aspect_name: Name of the aspect related to the subject.
CREATE TABLE aspects (
    id INT AUTO_INCREMENT,
    subject_id INT NOT NULL,
    aspect_name VARCHAR(255) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY (subject_id, id), 
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
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
-- - subject_id: Id of the associated subject.
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
    last_reform DATE,
    subject_id INT NOT NULL, 
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE RESTRICT
);

-- Table: article
-- This table stores articles related to legal documents.
-- Columns:
-- - id: Unique identifier for each article, auto-incremented.
-- - legal_basis_id: Foreign key referencing the 'legal_basis' table.
-- - article_name: Name of the article.
-- - description: Detailed description of the article, optional.
-- - plain_description: Simplified, searchable plain-text version of the article's description.
-- - article_order: Order of the article within the legal document.
-- Indices:
-- - FULLTEXT(plain_description): 
--   This index enables advanced text searches on the 'plain_description' column. 
--   It allows the use of the `MATCH ... AGAINST` clause in queries to:
--     - Perform full-text searches on the 'plain_description' column.
--     - Retrieve rows based on their textual relevance to the search terms.
--     - Support flexible searches with natural language or boolean query modes.
--   The `FULLTEXT` index significantly improves the performance of text searches
--   compared to using operators like `LIKE`.
-- Constraints:
-- - FOREIGN KEY (legal_basis_id): Ensures referential integrity by linking each article to a corresponding entry in the 'legal_basis' table. Deletes are cascaded.
CREATE TABLE article (
    id INT AUTO_INCREMENT PRIMARY KEY,
    legal_basis_id INT NOT NULL,
    article_name LONGTEXT,
    description LONGTEXT,
    plain_description LONGTEXT,
    article_order INT,
    FOREIGN KEY (legal_basis_id) REFERENCES legal_basis(id) ON DELETE CASCADE,
    FULLTEXT(plain_description)
);

-- Table: legal_basis_subject_aspect
-- This table establishes a many-to-many relationship between 'legal_basis', 'subjects', and 'aspects'.
-- Columns:
-- - legal_basis_id: Foreign key referencing the 'legal_basis' table.
-- - subject_id: Foreign key referencing the 'subjects' table.
-- - aspect_id: Foreign key referencing the 'aspects' table.
CREATE TABLE legal_basis_subject_aspect (
    legal_basis_id INT NOT NULL,
    subject_id INT NOT NULL,
    aspect_id INT NOT NULL,
    PRIMARY KEY (legal_basis_id, subject_id, aspect_id),
    FOREIGN KEY (legal_basis_id) REFERENCES legal_basis(id) ON DELETE CASCADE, 
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE RESTRICT,  
    FOREIGN KEY (aspect_id) REFERENCES aspects(id) ON DELETE RESTRICT
);

-- Table: requirements
-- Description: This table stores the requirements associated with a subject and an aspect,
-- along with detailed descriptions, conditions, evidence types, periodicity, and jurisdiction.
CREATE TABLE requirements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subject_id INT NOT NULL,
    aspect_id INT NOT NULL,
    requirement_number VARCHAR(255) NOT NULL,
    requirement_name VARCHAR(255) NOT NULL,
    mandatory_description LONGTEXT NOT NULL,
    complementary_description LONGTEXT NOT NULL,
    mandatory_sentences LONGTEXT NOT NULL,
    complementary_sentences LONGTEXT NOT NULL,
    mandatory_keywords LONGTEXT NOT NULL,
    complementary_keywords LONGTEXT NOT NULL,
    requirement_condition ENUM('Crítica', 'Operativa', 'Recomendación', 'Pendiente') NOT NULL,
    evidence ENUM('Tramite', 'Registro', 'Específico', 'Documento') NOT NULL,
    periodicity ENUM('Anual', '2 años', 'Por evento', 'Única vez') NOT NULL,
    requirement_type ENUM(
        'Identificación Estatal',
        'Identificación Federal',
        'Identificación Local',
        'Requerimiento Compuesto',
        'Requerimiento Compuesto e Identificación',
        'Requerimiento Estatal',
        'Requerimiento Local'
    ) NOT NULL,
    jurisdiction ENUM('Estatal', 'Federal', 'Local') NOT NULL,
    state VARCHAR(255),
    municipality VARCHAR(255),
    UNIQUE (subject_id, aspect_id, requirement_name),
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE RESTRICT, 
    FOREIGN KEY (aspect_id) REFERENCES aspects(id) ON DELETE RESTRICT, 
    FULLTEXT(mandatory_description),
    FULLTEXT(complementary_description),
    FULLTEXT(mandatory_sentences),
    FULLTEXT(complementary_sentences)
);

-- Table: requirements_identification
-- Description: This master table records the analysis (identification) that groups the evaluated requirements,
-- including the analysis name, description, status, and the associated user.
CREATE TABLE requirements_identification (
    id INT AUTO_INCREMENT PRIMARY KEY,
    identification_name VARCHAR(255) NOT NULL,
    identification_description TEXT,
    status ENUM('Active', 'Completed', 'Failed') NOT NULL DEFAULT 'Active',
    user_id BIGINT NULL,  
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Table: identification_requirements
-- Description: This table creates a relationship between an analysis (from requirements_identification)
-- and the requirements used in that analysis.
-- Note: The subject and aspect are derived from the requirements table.
CREATE TABLE identification_requirements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    requirements_identification_id INT NOT NULL,
    requirement_id INT NOT NULL,
    FOREIGN KEY (requirements_identification_id) REFERENCES requirements_identification(id) ON DELETE CASCADE,
    FOREIGN KEY (requirement_id) REFERENCES requirements(id) ON DELETE RESTRICT
);

-- Table: identification_legal_basis
-- Description: This table links each requirement (within an analysis) to one or more legal bases,
-- establishing a many-to-many relationship between the analyzed requirement and legal documents.
CREATE TABLE identification_legal_basis (
    identification_requirement_id INT NOT NULL,
    legal_basis_id INT NOT NULL,
    PRIMARY KEY (identification_requirement_id, legal_basis_id),
    FOREIGN KEY (identification_requirement_id) REFERENCES identification_requirements(id) ON DELETE CASCADE,
    FOREIGN KEY (legal_basis_id) REFERENCES legal_basis(id) ON DELETE RESTRICT
);

-- Table: identification_legal_basis_articles
-- Description: This table associates legal articles with a given legal basis linked to a requirement
-- within an analysis, classifying each article as either 'Obligatory' or 'Complementary'.
CREATE TABLE identification_legal_basis_articles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    identification_requirement_id INT NOT NULL,
    legal_basis_id INT NOT NULL,
    article_id INT NOT NULL,
    classification ENUM('Obligatory', 'Complementary') NOT NULL,
    FOREIGN KEY (identification_requirement_id) REFERENCES identification_requirements(id) ON DELETE CASCADE,
    FOREIGN KEY (legal_basis_id) REFERENCES legal_basis(id) ON DELETE RESTRICT,
    FOREIGN KEY (article_id) REFERENCES article(id) ON DELETE RESTRICT
);