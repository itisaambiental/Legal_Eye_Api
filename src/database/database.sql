-- Table: roles
-- This table stores user roles within the system.
-- Columns:
-- - id: Unique identifier for each role, auto-incremented.
-- - name: Defines the name of the role, restricted to 'Admin' or 'Analyst'.
CREATE TABLE IF NOT EXISTS roles (
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
CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    gmail VARCHAR(255) NOT NULL UNIQUE,
    role_id BIGINT NOT NULL,
    profile_picture TEXT DEFAULT NULL,
    FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- Table: verification_codes
-- This table stores verification codes for user account recovery and validation.
-- Columns:
-- - id: Unique identifier for each verification code, auto-incremented.
-- - gmail: Email address associated with the verification code.
-- - code: Verification code used for password reset or validation.
-- - expires_at: Expiration timestamp of the verification code.
CREATE TABLE IF NOT EXISTS verification_codes (
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
-- - abbreviation: Optional short code for the subject.
-- - order_index: Optional ordering index for display purposes.
CREATE TABLE IF NOT EXISTS subjects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subject_name VARCHAR(255) NOT NULL,
    abbreviation VARCHAR(10),
    order_index INT DEFAULT 0
);

-- Table: aspects
-- Stores specific aspects linked to subjects. Each subject can have multiple aspects.
-- Columns:
-- - id: Unique identifier for each aspect, auto-incremented.
-- - subject_id: Foreign key referencing the 'subjects' table.
-- - aspect_name: Name of the aspect related to the subject.
-- - abbreviation: Optional short code for the aspect.
-- - order_index: Optional ordering index for display purposes.
CREATE TABLE IF NOT EXISTS aspects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subject_id INT NOT NULL,
    aspect_name VARCHAR(255) NOT NULL,
    abbreviation VARCHAR(10),
    order_index INT DEFAULT 0,
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
CREATE TABLE IF NOT EXISTS legal_basis (
    id INT AUTO_INCREMENT PRIMARY KEY,
    legal_name VARCHAR(1000) NOT NULL,
    abbreviation VARCHAR(255),
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
    url TEXT,
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
CREATE TABLE IF NOT EXISTS article (
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
CREATE TABLE IF NOT EXISTS legal_basis_subject_aspect (
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
CREATE TABLE IF NOT EXISTS requirements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subject_id INT NOT NULL,
    requirement_number VARCHAR(255) NOT NULL,
    requirement_name VARCHAR(255) NOT NULL,
    mandatory_description LONGTEXT NOT NULL,
    complementary_description LONGTEXT NOT NULL,
    mandatory_sentences LONGTEXT NOT NULL,
    complementary_sentences LONGTEXT NOT NULL,
    mandatory_keywords LONGTEXT NOT NULL,
    complementary_keywords LONGTEXT NOT NULL,
    requirement_condition ENUM(
        'Crítica',
        'Operativa',
        'Recomendación',
        'Pendiente'
    ) NOT NULL,
    evidence ENUM('Trámite', 'Registro', 'Específica', 'Documento') NOT NULL,
    specify_evidence VARCHAR(255),
    periodicity ENUM(
        'Anual',
        '2 años',
        'Por evento',
        'Única vez',
        'Específica'
    ) NOT NULL,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE RESTRICT,
    FULLTEXT(mandatory_description),
    FULLTEXT(complementary_description),
    FULLTEXT(mandatory_sentences),
    FULLTEXT(complementary_sentences),
    FULLTEXT(mandatory_keywords),
    FULLTEXT(complementary_keywords)
);

-- Table: requirement_subject_aspect
-- Description:
-- This table establishes a many-to-many relationship between 'requirements',
-- a specific subject, and one or more aspects.
-- A requirement always belongs to one main subject via 'requirements.subject_id',
-- but can be associated to multiple aspects (within the same or different subjects).
CREATE TABLE IF NOT EXISTS requirement_subject_aspect (
    requirement_id INT NOT NULL,
    subject_id INT NOT NULL,
    aspect_id INT NOT NULL,
    PRIMARY KEY (requirement_id, subject_id, aspect_id),
    FOREIGN KEY (requirement_id) REFERENCES requirements(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE RESTRICT,
    FOREIGN KEY (aspect_id) REFERENCES aspects(id) ON DELETE RESTRICT
);


-- Table: requirement_types
-- Description: This table stores the types of requirements that can be associated with identificacion requirements.
-- including the type name,  description and a classification.
CREATE TABLE IF NOT EXISTS requirement_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description LONGTEXT NOT NULL,
  classification LONGTEXT NOT NULL,
  FULLTEXT(description),
  FULLTEXT(classification)
);

-- Table: legal_verbs
-- Description: Esta tabla almacena los verbos legales junto con su descripción y su traducción.
CREATE TABLE IF NOT EXISTS legal_verbs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description LONGTEXT NOT NULL,
  translation LONGTEXT NOT NULL,
  FULLTEXT (description),
  FULLTEXT (translation)
);
