-- Table: roles
-- Description: table stores user roles within the system.
CREATE TABLE IF NOT EXISTS roles (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name ENUM('Admin', 'Analyst') NOT NULL UNIQUE
);

-- Table: users
-- Description: This table stores user information including credentials and profile.
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
-- Description: This table stores verification codes for user account recovery and validation.
CREATE TABLE IF NOT EXISTS verification_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    gmail VARCHAR(255) NOT NULL,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL
);

-- Table: subjects
-- Description: This table stores the main subjects or categories that legal documents can belong to.
CREATE TABLE IF NOT EXISTS subjects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subject_name VARCHAR(255) NOT NULL,
    abbreviation VARCHAR(10),
    order_index INT DEFAULT 0
);

-- Table: aspects
-- Description: Stores specific aspects linked to subjects. Each subject can have multiple aspects.
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
-- Description: This table stores legal documents and their classifications.
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
-- Description: This table stores articles related to legal documents.
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
-- Description: This table establishes a many-to-many relationship between 'legal_basis', 'subjects', and 'aspects'.
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
-- along with detailed descriptions, conditions, evidence types, periodicity, acceptance criteria, and jurisdiction.
CREATE TABLE IF NOT EXISTS requirements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subject_id INT NOT NULL,
    requirement_number INT NOT NULL,
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
    evidence ENUM(
        'Trámite',
        'Registro',
        'Específica',
        'Documento'
    ) NOT NULL,
    specify_evidence VARCHAR(255),
    periodicity ENUM(
        'Anual',
        '2 años',
        'Por evento',
        'Única vez',
        'Específica'
    ) NOT NULL,
    acceptance_criteria TEXT NOT NULL,
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
-- Description: This table stores legal verbs along with their description and translation.
CREATE TABLE IF NOT EXISTS legal_verbs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description LONGTEXT NOT NULL,
  translation LONGTEXT NOT NULL,
  FULLTEXT (description),
  FULLTEXT (translation)
);

-- Table: req_identifications
-- Description: Metadata of a legal requirements identification analysis.
CREATE TABLE IF NOT EXISTS req_identifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,          
    description TEXT,                    
    user_id BIGINT,                      
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status ENUM('Active', 'Failed', 'Completed') DEFAULT 'Active',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Table: req_identifications_requirements
-- Description: All requirements included in a given identification.
CREATE TABLE IF NOT EXISTS req_identifications_requirements (
    req_identification_id INT NOT NULL,  
    requirement_id INT NOT NULL,
    requirement_name VARCHAR(255) NOT NULL,
    requirement_type_id INT,
    PRIMARY KEY (req_identification_id, requirement_id),
    FOREIGN KEY (req_identification_id) REFERENCES req_identifications(id) ON DELETE CASCADE,
    FOREIGN KEY (requirement_id) REFERENCES requirements(id) ON DELETE RESTRICT,
    FOREIGN KEY (requirement_type_id) REFERENCES requirement_types(id) ON DELETE RESTRICT
);

-- Table: req_identifications_requirement_legal_verbs
-- Description: Translated legal verb outputs for each requirement in an identification.
CREATE TABLE IF NOT EXISTS req_identifications_requirement_legal_verbs (
    req_identification_id INT NOT NULL,
    requirement_id INT NOT NULL,
    legal_verb_id INT NOT NULL,
    translation LONGTEXT NOT NULL,  
    PRIMARY KEY (req_identification_id, requirement_id, legal_verb_id),
    FOREIGN KEY (req_identification_id, requirement_id)
        REFERENCES req_identifications_requirements(req_identification_id, requirement_id)
        ON DELETE CASCADE,
    FOREIGN KEY (legal_verb_id) REFERENCES legal_verbs(id) ON DELETE CASCADE
);


-- Table: req_identifications_requirement_legal_basis
-- Description: Legal basis that justifies each requirement.
CREATE TABLE IF NOT EXISTS req_identifications_requirement_legal_basis (
    req_identification_id INT NOT NULL,  
    requirement_id INT NOT NULL,                 
    legal_basis_id INT NOT NULL,                 
    PRIMARY KEY (req_identification_id, requirement_id, legal_basis_id),
    FOREIGN KEY (req_identification_id, requirement_id)
        REFERENCES req_identifications_requirements(req_identification_id, requirement_id)
        ON DELETE CASCADE,
    FOREIGN KEY (legal_basis_id) REFERENCES legal_basis(id) ON DELETE RESTRICT
);

-- Table: req_identifications_requirement_legal_basis_articles
-- Description: Articles related to a requirement under a legal basis.
CREATE TABLE IF NOT EXISTS req_identifications_requirement_legal_basis_articles (
    req_identification_id INT NOT NULL,  
    requirement_id INT NOT NULL,                 
    legal_basis_id INT NOT NULL,                 
    article_id INT NOT NULL,                     
    article_type ENUM('mandatory', 'complementary', 'general') NOT NULL DEFAULT 'general',
    PRIMARY KEY (req_identification_id, requirement_id, legal_basis_id, article_id),
    FOREIGN KEY (req_identification_id, requirement_id)
        REFERENCES req_identifications_requirements(req_identification_id, requirement_id)
        ON DELETE CASCADE,
    FOREIGN KEY (legal_basis_id) REFERENCES legal_basis(id) ON DELETE RESTRICT,
    FOREIGN KEY (article_id) REFERENCES article(id) ON DELETE CASCADE
);
