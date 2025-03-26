import { pool } from '../config/db.config.js'
import ErrorUtils from '../utils/Error.js'
import Requirement from '../models/Requirement.model.js'

/**
 * Repository class for handling database operations related to Requirements.
 */
class RequirementRepository {
  /**
   * Inserts a new requirement into the database.
   * @param {Object} requirement - The requirement object to insert.
   * @param {number} requirement.subjectId - The ID of the subject associated with the requirement.
   * @param {number} requirement.aspectId - The ID of the aspect associated with the requirement.
   * @param {string} requirement.requirementNumber - The unique number identifying the requirement.
   * @param {string} requirement.requirementName - The name of the requirement.
   * @param {string} requirement.mandatoryDescription - The mandatory description of the requirement.
   * @param {string} requirement.complementaryDescription - The complementary description of the requirement.
   * @param {string} requirement.mandatorySentences - The mandatory legal sentences related to the requirement.
   * @param {string} requirement.complementarySentences - The complementary legal sentences related to the requirement.
   * @param {string} requirement.mandatoryKeywords - Keywords related to the mandatory aspect of the requirement.
   * @param {string} requirement.complementaryKeywords - Keywords related to the complementary aspect of the requirement.
   * @param {string} requirement.condition - The condition type ('Crítica', 'Operativa', 'Recomendación', 'Pendiente').
   * @param {string} requirement.evidence - The type of evidence ('Trámite', 'Registro', 'Específico', 'Documento').
   * @param {string} requirement.periodicity - The periodicity of the requirement ('Anual', '2 años', 'Por evento', 'Única vez').
   * @param {string} requirement.requirementType - The type of requirement (e.g., 'Identificación Estatal', 'Requerimiento Local').
   * @param {string} requirement.jurisdiction - The jurisdiction of the requirement ('Estatal', 'Federal', 'Local').
   * @param {string} [requirement.state] - The state associated with the requirement, if applicable.
   * @param {string} [requirement.municipality] - The municipality associated with the requirement, if applicable.
   * @returns {Promise<Requirement>} - Returns the created Requirement.
   * @throws {ErrorUtils} - If an error occurs during insertion.
   */
  static async create (requirement) {
    const {
      subjectId,
      aspectId,
      requirementNumber,
      requirementName,
      mandatoryDescription,
      complementaryDescription,
      mandatorySentences,
      complementarySentences,
      mandatoryKeywords,
      complementaryKeywords,
      condition,
      evidence,
      periodicity,
      requirementType,
      jurisdiction,
      state,
      municipality
    } = requirement

    const insertRequirementQuery = `
      INSERT INTO requirements (
        subject_id, aspect_id, requirement_number, requirement_name, 
        mandatory_description, complementary_description, 
        mandatory_sentences, complementary_sentences, 
        mandatory_keywords, complementary_keywords, 
        requirement_condition, evidence, periodicity, 
        requirement_type, jurisdiction, state, municipality
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `

    try {
      const [result] = await pool.query(insertRequirementQuery, [
        subjectId,
        aspectId,
        requirementNumber,
        requirementName,
        mandatoryDescription,
        complementaryDescription,
        mandatorySentences,
        complementarySentences,
        mandatoryKeywords,
        complementaryKeywords,
        condition,
        evidence,
        periodicity,
        requirementType,
        jurisdiction,
        state,
        municipality
      ])

      const requirementId = result.insertId
      const requirement = await this.findById(requirementId)
      return requirement
    } catch (error) {
      console.error('Error creating requirement:', error.message)
      throw new ErrorUtils(500, 'Error creating requirement in the database')
    }
  }

  /**
   * Retrieves all requirements from the database.
   * @returns {Promise<Array<Requirement|null>>} - A list of all requirements.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async findAll () {
    const query = `
      SELECT 
        r.id, 
        r.requirement_number, 
        r.requirement_name, 
        r.mandatory_description, 
        r.complementary_description, 
        r.mandatory_sentences, 
        r.complementary_sentences, 
        r.mandatory_keywords, 
        r.complementary_keywords, 
        r.requirement_condition, 
        r.evidence, 
        r.periodicity, 
        r.requirement_type, 
        r.jurisdiction, 
        r.state, 
        r.municipality, 
        s.id AS subject_id, 
        s.subject_name AS subject_name, 
        a.id AS aspect_id, 
        a.aspect_name AS aspect_name
      FROM requirements r
      JOIN subjects s ON r.subject_id = s.id
      JOIN aspects a ON r.aspect_id = a.id
    `
    try {
      const [rows] = await pool.query(query)
      if (rows.length === 0) return null
      return rows.map((row) => {
        const subject = {
          subject_id: row.subject_id,
          subject_name: row.subject_name
        }
        const aspect = {
          aspect_id: row.aspect_id,
          aspect_name: row.aspect_name
        }
        return new Requirement(
          row.id,
          subject,
          aspect,
          row.requirement_number,
          row.requirement_name,
          row.mandatory_description,
          row.complementary_description,
          row.mandatory_sentences,
          row.complementary_sentences,
          row.mandatory_keywords,
          row.complementary_keywords,
          row.requirement_condition,
          row.evidence,
          row.periodicity,
          row.requirement_type,
          row.jurisdiction,
          row.state,
          row.municipality
        )
      })
    } catch (error) {
      console.error('Error retrieving all requirements:', error.message)
      throw new ErrorUtils(500, 'Error retrieving all requirements from the database')
    }
  }

  /**
 * Checks if a requirement exists with the given requirement number.
 * @param {string} requirementNumber - The requirement number to check for existence.
 * @returns {Promise<boolean>} - True if a requirement with the same requirement number exists, false otherwise.
 * @throws {ErrorUtils} - If an error occurs during the check.
 */
  static async existsByRequirementNumber (requirementNumber) {
    const query = `
        SELECT 1 
        FROM requirements 
        WHERE requirement_number = ?
        LIMIT 1
      `
    try {
      const [rows] = await pool.query(query, [requirementNumber])
      return rows.length > 0
    } catch (error) {
      console.error('Error checking if requirement number exists:', error.message)
      throw new ErrorUtils(500, 'Error checking if requirement number exists')
    }
  }

  /**
   * Checks if a requirement exists with the given name.
   * @param {string} requirementName - The requirement name to check for existence.
   * @returns {Promise<boolean>} - True if a requirement with the same name exists, false otherwise.
   * @throws {ErrorUtils} - If an error occurs during the check.
   */
  static async existsByRequirementName (requirementName) {
    const query = `
          SELECT 1 
          FROM requirements 
          WHERE requirement_name = ?
          LIMIT 1
        `
    try {
      const [rows] = await pool.query(query, [requirementName])
      return rows.length > 0
    } catch (error) {
      console.error('Error checking if requirement exists:', error.message)
      throw new ErrorUtils(500, 'Error checking if requirement exists')
    }
  }

  /**
   * Retrieves a requirement record by its ID.
   * @param {number} requirementId - The ID of the requirement to retrieve.
   * @returns {Promise<Requirement|null>} - The requirement record or null if not found.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async findById (requirementId) {
    const query = `
      SELECT 
        r.id, 
        r.requirement_number, 
        r.requirement_name, 
        r.mandatory_description, 
        r.complementary_description, 
        r.mandatory_sentences, 
        r.complementary_sentences, 
        r.mandatory_keywords, 
        r.complementary_keywords, 
        r.requirement_condition, 
        r.evidence, 
        r.periodicity, 
        r.requirement_type, 
        r.jurisdiction, 
        r.state, 
        r.municipality, 
        s.id AS subject_id, 
        s.subject_name AS subject_name, 
        a.id AS aspect_id, 
        a.aspect_name AS aspect_name
      FROM requirements r
      JOIN subjects s ON r.subject_id = s.id
      JOIN aspects a ON r.aspect_id = a.id
      WHERE r.id = ?
    `
    try {
      const [rows] = await pool.query(query, [requirementId])
      if (rows.length === 0) return null
      const requirement = rows[0]
      const subject = {
        subject_id: requirement.subject_id,
        subject_name: requirement.subject_name
      }
      const aspect = {
        aspect_id: requirement.aspect_id,
        aspect_name: requirement.aspect_name
      }
      return new Requirement(
        requirement.id,
        subject,
        aspect,
        requirement.requirement_number,
        requirement.requirement_name,
        requirement.mandatory_description,
        requirement.complementary_description,
        requirement.mandatory_sentences,
        requirement.complementary_sentences,
        requirement.mandatory_keywords,
        requirement.complementary_keywords,
        requirement.requirement_condition,
        requirement.evidence,
        requirement.periodicity,
        requirement.requirement_type,
        requirement.jurisdiction,
        requirement.state,
        requirement.municipality
      )
    } catch (error) {
      console.error('Error retrieving requirement by ID:', error.message)
      throw new ErrorUtils(500, 'Error retrieving requirement by ID')
    }
  }

  /**
   * Finds multiple requirements by their IDs.
   * @param {Array<number>} requirementIds - Array of requirement IDs to find.
   * @returns {Promise<Requirement[]>} - Array of found requirement objects.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async findByIds (requirementIds) {
    if (requirementIds.length === 0) {
      return []
    }
    const query = `
      SELECT 
        r.id, 
        r.requirement_number, 
        r.requirement_name, 
        r.mandatory_description, 
        r.complementary_description, 
        r.mandatory_sentences, 
        r.complementary_sentences, 
        r.mandatory_keywords, 
        r.complementary_keywords, 
        r.requirement_condition, 
        r.evidence, 
        r.periodicity, 
        r.requirement_type, 
        r.jurisdiction, 
        r.state, 
        r.municipality, 
        s.id AS subject_id, 
        s.subject_name AS subject_name, 
        a.id AS aspect_id, 
        a.aspect_name AS aspect_name
      FROM requirements r
      JOIN subjects s ON r.subject_id = s.id
      JOIN aspects a ON r.aspect_id = a.id
      WHERE r.id IN (?)
    `
    try {
      const [rows] = await pool.query(query, [requirementIds])
      if (rows.length === 0) return []
      return rows.map((row) => {
        const subject = {
          subject_id: row.subject_id,
          subject_name: row.subject_name
        }

        const aspect = {
          aspect_id: row.aspect_id,
          aspect_name: row.aspect_name
        }
        return new Requirement(
          row.id,
          subject,
          aspect,
          row.requirement_number,
          row.requirement_name,
          row.mandatory_description,
          row.complementary_description,
          row.mandatory_sentences,
          row.complementary_sentences,
          row.mandatory_keywords,
          row.complementary_keywords,
          row.requirement_condition,
          row.evidence,
          row.periodicity,
          row.requirement_type,
          row.jurisdiction,
          row.state,
          row.municipality
        )
      })
    } catch (error) {
      console.error('Error finding requirements by IDs:', error.message)
      throw new ErrorUtils(500, 'Error finding requirements by IDs from the database')
    }
  }

  /**
   * Retrieves all requirements that match the given requirement number.
   * @param {string} requirementNumber - The number or part of the number of the requirement to retrieve.
   * @returns {Promise<Array<Requirement|null>>} - A list of requirements matching the requirement number.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async findByNumber (requirementNumber) {
    const query = `
          SELECT 
            r.id, 
            r.requirement_number, 
            r.requirement_name, 
            r.mandatory_description, 
            r.complementary_description, 
            r.mandatory_sentences, 
            r.complementary_sentences, 
            r.mandatory_keywords, 
            r.complementary_keywords, 
            r.requirement_condition, 
            r.evidence, 
            r.periodicity, 
            r.requirement_type, 
            r.jurisdiction, 
            r.state, 
            r.municipality, 
            s.id AS subject_id, 
            s.subject_name AS subject_name, 
            a.id AS aspect_id, 
            a.aspect_name AS aspect_name
          FROM requirements r
          JOIN subjects s ON r.subject_id = s.id
          JOIN aspects a ON r.aspect_id = a.id
          WHERE r.requirement_number LIKE ?
        `
    try {
      const [rows] = await pool.query(query, [`%${requirementNumber}%`])
      if (rows.length === 0) return null
      return rows.map((row) => {
        const subject = {
          subject_id: row.subject_id,
          subject_name: row.subject_name
        }
        const aspect = {
          aspect_id: row.aspect_id,
          aspect_name: row.aspect_name
        }
        return new Requirement(
          row.id,
          subject,
          aspect,
          row.requirement_number,
          row.requirement_name,
          row.mandatory_description,
          row.complementary_description,
          row.mandatory_sentences,
          row.complementary_sentences,
          row.mandatory_keywords,
          row.complementary_keywords,
          row.requirement_condition,
          row.evidence,
          row.periodicity,
          row.requirement_type,
          row.jurisdiction,
          row.state,
          row.municipality
        )
      })
    } catch (error) {
      console.error('Error retrieving requirements by number:', error.message)
      throw new ErrorUtils(500, 'Error retrieving requirements by number')
    }
  }

  /**
   * Retrieves all requirements that match the given name.
   * @param {string} requirementName - The name or part of the name of the requirement to retrieve.
   * @returns {Promise<Array<Requirement|null>>} - A list of requirements matching the name.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async findByName (requirementName) {
    const query = `
          SELECT 
            r.id, 
            r.requirement_number, 
            r.requirement_name, 
            r.mandatory_description, 
            r.complementary_description, 
            r.mandatory_sentences, 
            r.complementary_sentences, 
            r.mandatory_keywords, 
            r.complementary_keywords, 
            r.requirement_condition, 
            r.evidence, 
            r.periodicity, 
            r.requirement_type, 
            r.jurisdiction, 
            r.state, 
            r.municipality, 
            s.id AS subject_id, 
            s.subject_name AS subject_name, 
            a.id AS aspect_id, 
            a.aspect_name AS aspect_name
          FROM requirements r
          JOIN subjects s ON r.subject_id = s.id
          JOIN aspects a ON r.aspect_id = a.id
          WHERE r.requirement_name LIKE ?
        `
    try {
      const [rows] = await pool.query(query, [`%${requirementName}%`])
      if (rows.length === 0) return null
      return rows.map((row) => {
        const subject = {
          subject_id: row.subject_id,
          subject_name: row.subject_name
        }
        const aspect = {
          aspect_id: row.aspect_id,
          aspect_name: row.aspect_name
        }
        return new Requirement(
          row.id,
          subject,
          aspect,
          row.requirement_number,
          row.requirement_name,
          row.mandatory_description,
          row.complementary_description,
          row.mandatory_sentences,
          row.complementary_sentences,
          row.mandatory_keywords,
          row.complementary_keywords,
          row.requirement_condition,
          row.evidence,
          row.periodicity,
          row.requirement_type,
          row.jurisdiction,
          row.state,
          row.municipality
        )
      })
    } catch (error) {
      console.error('Error retrieving requirements by name:', error.message)
      throw new ErrorUtils(500, 'Error retrieving requirements by name')
    }
  }

  /**
   * Retrieves all requirements filtered by a specific subject.
   * @param {number} subjectId - The subject ID to filter by.
   * @returns {Promise<Array<Requirement>|null>} - A list of requirements filtered by the subject, or null if no records are found.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async findBySubject (subjectId) {
    const query = `
          SELECT 
            r.id, 
            r.requirement_number, 
            r.requirement_name, 
            r.mandatory_description, 
            r.complementary_description, 
            r.mandatory_sentences, 
            r.complementary_sentences, 
            r.mandatory_keywords, 
            r.complementary_keywords, 
            r.requirement_condition, 
            r.evidence, 
            r.periodicity, 
            r.requirement_type, 
            r.jurisdiction, 
            r.state, 
            r.municipality, 
            s.id AS subject_id, 
            s.subject_name AS subject_name, 
            a.id AS aspect_id, 
            a.aspect_name AS aspect_name
          FROM requirements r
          JOIN subjects s ON r.subject_id = s.id
          JOIN aspects a ON r.aspect_id = a.id
          WHERE r.subject_id = ?
        `

    try {
      const [rows] = await pool.query(query, [subjectId])
      if (rows.length === 0) return null
      return rows.map((row) => {
        const subject = {
          subject_id: row.subject_id,
          subject_name: row.subject_name
        }
        const aspect = {
          aspect_id: row.aspect_id,
          aspect_name: row.aspect_name
        }
        return new Requirement(
          row.id,
          subject,
          aspect,
          row.requirement_number,
          row.requirement_name,
          row.mandatory_description,
          row.complementary_description,
          row.mandatory_sentences,
          row.complementary_sentences,
          row.mandatory_keywords,
          row.complementary_keywords,
          row.requirement_condition,
          row.evidence,
          row.periodicity,
          row.requirement_type,
          row.jurisdiction,
          row.state,
          row.municipality
        )
      })
    } catch (error) {
      console.error('Error retrieving requirements by subject:', error.message)
      throw new ErrorUtils(500, 'Error retrieving requirements by subject')
    }
  }

  /**
   * Retrieves all requirements filtered by subject and optionally by aspects.
   * @param {number} subjectId - The subject ID to filter by.
   * @param {Array<number>} [aspectIds] - Optional array of aspect IDs to further filter by.
   * @returns {Promise<Array<Requirement>|null>} - A list of requirements matching the filters, or null if no records are found.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async findBySubjectAndAspects (subjectId, aspectIds = []) {
    let query = `
          SELECT 
            r.id, 
            r.requirement_number, 
            r.requirement_name, 
            r.mandatory_description, 
            r.complementary_description, 
            r.mandatory_sentences, 
            r.complementary_sentences, 
            r.mandatory_keywords, 
            r.complementary_keywords, 
            r.requirement_condition, 
            r.evidence, 
            r.periodicity, 
            r.requirement_type, 
            r.jurisdiction, 
            r.state, 
            r.municipality, 
            s.id AS subject_id, 
            s.subject_name AS subject_name, 
            a.id AS aspect_id, 
            a.aspect_name AS aspect_name
          FROM requirements r
          JOIN subjects s ON r.subject_id = s.id
          JOIN aspects a ON r.aspect_id = a.id
          WHERE r.subject_id = ?
        `
    const values = [subjectId]
    if (aspectIds.length > 0) {
      const placeholders = aspectIds.map(() => '?').join(', ')
      query += ` AND r.aspect_id IN (${placeholders})`
      values.push(...aspectIds)
    }
    try {
      const [rows] = await pool.query(query, values)
      if (rows.length === 0) return null
      return rows.map((row) => {
        const subject = {
          subject_id: row.subject_id,
          subject_name: row.subject_name
        }
        const aspect = {
          aspect_id: row.aspect_id,
          aspect_name: row.aspect_name
        }

        return new Requirement(
          row.id,
          subject,
          aspect,
          row.requirement_number,
          row.requirement_name,
          row.mandatory_description,
          row.complementary_description,
          row.mandatory_sentences,
          row.complementary_sentences,
          row.mandatory_keywords,
          row.complementary_keywords,
          row.requirement_condition,
          row.evidence,
          row.periodicity,
          row.requirement_type,
          row.jurisdiction,
          row.state,
          row.municipality
        )
      })
    } catch (error) {
      console.error('Error retrieving requirements by subject and aspects:', error.message)
      throw new ErrorUtils(500, 'Error retrieving requirements by subject and aspects')
    }
  }

  /**
 * Retrieves requirements by a flexible full-text match in their mandatory description.
 * @param {string} description - The description or part of the description to search for.
 * @returns {Promise<Array<Requirement>|null>} - A list of Requirement instances matching the description.
 * @throws {ErrorUtils} - If an error occurs during retrieval.
 */
  static async findByMandatoryDescription (description) {
    try {
      const query = `
        SELECT 
          r.id, 
          r.requirement_number, 
          r.requirement_name, 
          r.mandatory_description, 
          r.complementary_description, 
          r.mandatory_sentences, 
          r.complementary_sentences, 
          r.mandatory_keywords, 
          r.complementary_keywords, 
          r.requirement_condition, 
          r.evidence, 
          r.periodicity, 
          r.requirement_type, 
          r.jurisdiction, 
          r.state, 
          r.municipality, 
          s.id AS subject_id, 
          s.subject_name AS subject_name, 
          a.id AS aspect_id, 
          a.aspect_name AS aspect_name
        FROM requirements r
        JOIN subjects s ON r.subject_id = s.id
        JOIN aspects a ON r.aspect_id = a.id
        WHERE MATCH(r.mandatory_description) AGAINST(? IN BOOLEAN MODE)
      `
      const [rows] = await pool.query(query, [description])
      if (rows.length === 0) return null
      return rows.map((row) => {
        const subject = {
          subject_id: row.subject_id,
          subject_name: row.subject_name
        }
        const aspect = {
          aspect_id: row.aspect_id,
          aspect_name: row.aspect_name
        }
        return new Requirement(
          row.id,
          subject,
          aspect,
          row.requirement_number,
          row.requirement_name,
          row.mandatory_description,
          row.complementary_description,
          row.mandatory_sentences,
          row.complementary_sentences,
          row.mandatory_keywords,
          row.complementary_keywords,
          row.requirement_condition,
          row.evidence,
          row.periodicity,
          row.requirement_type,
          row.jurisdiction,
          row.state,
          row.municipality
        )
      })
    } catch (error) {
      console.error('Error retrieving requirements by mandatory description:', error.message)
      throw new ErrorUtils(500, 'Error retrieving requirements by mandatory description')
    }
  }

  /**
 * Retrieves requirements by a flexible full-text match in their complementary description.
 * @param {string} description - The description or part of the description to search for.
 * @returns {Promise<Array<Requirement>|null>} - A list of Requirement instances matching the description.
 * @throws {ErrorUtils} - If an error occurs during retrieval.
 */
  static async findByComplementaryDescription (description) {
    try {
      const query = `
        SELECT 
          r.id, 
          r.requirement_number, 
          r.requirement_name, 
          r.mandatory_description, 
          r.complementary_description, 
          r.mandatory_sentences, 
          r.complementary_sentences, 
          r.mandatory_keywords, 
          r.complementary_keywords, 
          r.requirement_condition, 
          r.evidence, 
          r.periodicity, 
          r.requirement_type, 
          r.jurisdiction, 
          r.state, 
          r.municipality, 
          s.id AS subject_id, 
          s.subject_name AS subject_name, 
          a.id AS aspect_id, 
          a.aspect_name AS aspect_name
        FROM requirements r
        JOIN subjects s ON r.subject_id = s.id
        JOIN aspects a ON r.aspect_id = a.id
        WHERE MATCH(r.complementary_description) AGAINST(? IN BOOLEAN MODE)
      `
      const [rows] = await pool.query(query, [description])
      if (rows.length === 0) return null
      return rows.map((row) => {
        const subject = {
          subject_id: row.subject_id,
          subject_name: row.subject_name
        }
        const aspect = {
          aspect_id: row.aspect_id,
          aspect_name: row.aspect_name
        }
        return new Requirement(
          row.id,
          subject,
          aspect,
          row.requirement_number,
          row.requirement_name,
          row.mandatory_description,
          row.complementary_description,
          row.mandatory_sentences,
          row.complementary_sentences,
          row.mandatory_keywords,
          row.complementary_keywords,
          row.requirement_condition,
          row.evidence,
          row.periodicity,
          row.requirement_type,
          row.jurisdiction,
          row.state,
          row.municipality
        )
      })
    } catch (error) {
      console.error('Error retrieving requirements by complementary description:', error.message)
      throw new ErrorUtils(500, 'Error retrieving requirements by complementary description')
    }
  }

  /**
 * Retrieves requirements by a flexible full-text match in their mandatory sentences.
 * @param {string} sentence - The sentence or part of the sentence to search for.
 * @returns {Promise<Array<Requirement>|null>} - A list of Requirement instances matching the sentence.
 * @throws {ErrorUtils} - If an error occurs during retrieval.
 */
  static async findByMandatorySentences (sentence) {
    try {
      const query = `
        SELECT 
          r.id, 
          r.requirement_number, 
          r.requirement_name, 
          r.mandatory_description, 
          r.complementary_description, 
          r.mandatory_sentences, 
          r.complementary_sentences, 
          r.mandatory_keywords, 
          r.complementary_keywords, 
          r.requirement_condition, 
          r.evidence, 
          r.periodicity, 
          r.requirement_type, 
          r.jurisdiction, 
          r.state, 
          r.municipality, 
          s.id AS subject_id, 
          s.subject_name AS subject_name, 
          a.id AS aspect_id, 
          a.aspect_name AS aspect_name
        FROM requirements r
        JOIN subjects s ON r.subject_id = s.id
        JOIN aspects a ON r.aspect_id = a.id
        WHERE MATCH(r.mandatory_sentences) AGAINST(? IN BOOLEAN MODE)
      `

      const [rows] = await pool.query(query, [sentence])

      if (rows.length === 0) return null

      return rows.map((row) => {
        const subject = {
          subject_id: row.subject_id,
          subject_name: row.subject_name
        }
        const aspect = {
          aspect_id: row.aspect_id,
          aspect_name: row.aspect_name
        }
        return new Requirement(
          row.id,
          subject,
          aspect,
          row.requirement_number,
          row.requirement_name,
          row.mandatory_description,
          row.complementary_description,
          row.mandatory_sentences,
          row.complementary_sentences,
          row.mandatory_keywords,
          row.complementary_keywords,
          row.requirement_condition,
          row.evidence,
          row.periodicity,
          row.requirement_type,
          row.jurisdiction,
          row.state,
          row.municipality
        )
      })
    } catch (error) {
      console.error('Error retrieving requirements by mandatory sentences:', error.message)
      throw new ErrorUtils(500, 'Error retrieving requirements by mandatory sentences')
    }
  }

  /**
 * Retrieves requirements by a flexible full-text match in their complementary sentences.
 * @param {string} sentence - The sentence or part of the sentence to search for.
 * @returns {Promise<Array<Requirement>|null>} - A list of Requirement instances matching the sentence.
 * @throws {ErrorUtils} - If an error occurs during retrieval.
 */
  static async findByComplementarySentences (sentence) {
    try {
      const query = `
        SELECT 
          r.id, 
          r.requirement_number, 
          r.requirement_name, 
          r.mandatory_description, 
          r.complementary_description, 
          r.mandatory_sentences, 
          r.complementary_sentences, 
          r.mandatory_keywords, 
          r.complementary_keywords, 
          r.requirement_condition, 
          r.evidence, 
          r.periodicity, 
          r.requirement_type, 
          r.jurisdiction, 
          r.state, 
          r.municipality, 
          s.id AS subject_id, 
          s.subject_name AS subject_name, 
          a.id AS aspect_id, 
          a.aspect_name AS aspect_name
        FROM requirements r
        JOIN subjects s ON r.subject_id = s.id
        JOIN aspects a ON r.aspect_id = a.id
        WHERE MATCH(r.complementary_sentences) AGAINST(? IN BOOLEAN MODE)
      `

      const [rows] = await pool.query(query, [sentence])

      if (rows.length === 0) return null

      return rows.map((row) => {
        const subject = {
          subject_id: row.subject_id,
          subject_name: row.subject_name
        }
        const aspect = {
          aspect_id: row.aspect_id,
          aspect_name: row.aspect_name
        }
        return new Requirement(
          row.id,
          subject,
          aspect,
          row.requirement_number,
          row.requirement_name,
          row.mandatory_description,
          row.complementary_description,
          row.mandatory_sentences,
          row.complementary_sentences,
          row.mandatory_keywords,
          row.complementary_keywords,
          row.requirement_condition,
          row.evidence,
          row.periodicity,
          row.requirement_type,
          row.jurisdiction,
          row.state,
          row.municipality
        )
      })
    } catch (error) {
      console.error('Error retrieving requirements by complementary sentences:', error.message)
      throw new ErrorUtils(500, 'Error retrieving requirements by complementary sentences')
    }
  }

  /**
 * Retrieves requirements by a flexible full-text match in their mandatory keywords.
 * @param {string} keyword - The keyword or part of the keyword to search for.
 * @returns {Promise<Array<Requirement>|null>} - A list of Requirement instances matching the keyword.
 * @throws {ErrorUtils} - If an error occurs during retrieval.
 */
  static async findByMandatoryKeywords (keyword) {
    try {
      const query = `
      SELECT 
        r.id, 
        r.requirement_number, 
        r.requirement_name, 
        r.mandatory_description, 
        r.complementary_description, 
        r.mandatory_sentences, 
        r.complementary_sentences, 
        r.mandatory_keywords, 
        r.complementary_keywords, 
        r.requirement_condition, 
        r.evidence, 
        r.periodicity, 
        r.requirement_type, 
        r.jurisdiction, 
        r.state, 
        r.municipality, 
        s.id AS subject_id, 
        s.subject_name AS subject_name, 
        a.id AS aspect_id, 
        a.aspect_name AS aspect_name
      FROM requirements r
      JOIN subjects s ON r.subject_id = s.id
      JOIN aspects a ON r.aspect_id = a.id
      WHERE MATCH(r.mandatory_keywords) AGAINST(? IN BOOLEAN MODE)
    `
      const [rows] = await pool.query(query, [`${keyword}*`])
      if (rows.length === 0) return null
      return rows.map((row) => {
        const subject = {
          subject_id: row.subject_id,
          subject_name: row.subject_name
        }
        const aspect = {
          aspect_id: row.aspect_id,
          aspect_name: row.aspect_name
        }
        return new Requirement(
          row.id,
          subject,
          aspect,
          row.requirement_number,
          row.requirement_name,
          row.mandatory_description,
          row.complementary_description,
          row.mandatory_sentences,
          row.complementary_sentences,
          row.mandatory_keywords,
          row.complementary_keywords,
          row.requirement_condition,
          row.evidence,
          row.periodicity,
          row.requirement_type,
          row.jurisdiction,
          row.state,
          row.municipality
        )
      })
    } catch (error) {
      console.error('Error retrieving requirements by mandatory keywords:', error.message)
      throw new ErrorUtils(500, 'Error retrieving requirements by mandatory keywords')
    }
  }

  /**
 * Retrieves requirements by a flexible full-text match in their complementary keywords.
 * @param {string} keyword - The keyword or part of the keyword to search for.
 * @returns {Promise<Array<Requirement>|null>} - A list of Requirement instances matching the keyword.
 * @throws {ErrorUtils} - If an error occurs during retrieval.
 */
  static async findByComplementaryKeywords (keyword) {
    try {
      const query = `
      SELECT 
        r.id, 
        r.requirement_number, 
        r.requirement_name, 
        r.mandatory_description, 
        r.complementary_description, 
        r.mandatory_sentences, 
        r.complementary_sentences, 
        r.mandatory_keywords, 
        r.complementary_keywords, 
        r.requirement_condition, 
        r.evidence, 
        r.periodicity, 
        r.requirement_type, 
        r.jurisdiction, 
        r.state, 
        r.municipality, 
        s.id AS subject_id, 
        s.subject_name AS subject_name, 
        a.id AS aspect_id, 
        a.aspect_name AS aspect_name
      FROM requirements r
      JOIN subjects s ON r.subject_id = s.id
      JOIN aspects a ON r.aspect_id = a.id
      WHERE MATCH(r.complementary_keywords) AGAINST(? IN BOOLEAN MODE)
    `
      const [rows] = await pool.query(query, [`${keyword}*`])
      if (rows.length === 0) return null
      return rows.map((row) => {
        const subject = {
          subject_id: row.subject_id,
          subject_name: row.subject_name
        }
        const aspect = {
          aspect_id: row.aspect_id,
          aspect_name: row.aspect_name
        }
        return new Requirement(
          row.id,
          subject,
          aspect,
          row.requirement_number,
          row.requirement_name,
          row.mandatory_description,
          row.complementary_description,
          row.mandatory_sentences,
          row.complementary_sentences,
          row.mandatory_keywords,
          row.complementary_keywords,
          row.requirement_condition,
          row.evidence,
          row.periodicity,
          row.requirement_type,
          row.jurisdiction,
          row.state,
          row.municipality
        )
      })
    } catch (error) {
      console.error('Error retrieving requirements by complementary keywords:', error.message)
      throw new ErrorUtils(500, 'Error retrieving requirements by complementary keywords')
    }
  }

  /**
 * Retrieves requirements filtered by a specific condition.
 * @param {string} condition - The condition type ('Crítica', 'Operativa', 'Recomendación', 'Pendiente') to filter by.
 * @returns {Promise<Array<Requirement>|null>} - A list of Requirement instances matching the condition.
 * @throws {ErrorUtils} - If an error occurs during retrieval.
 */
  static async findByCondition (condition) {
    try {
      const query = `
        SELECT 
          r.id, 
          r.requirement_number, 
          r.requirement_name, 
          r.mandatory_description, 
          r.complementary_description, 
          r.mandatory_sentences, 
          r.complementary_sentences, 
          r.mandatory_keywords, 
          r.complementary_keywords, 
          r.requirement_condition, 
          r.evidence, 
          r.periodicity, 
          r.requirement_type, 
          r.jurisdiction, 
          r.state, 
          r.municipality, 
          s.id AS subject_id, 
          s.subject_name AS subject_name, 
          a.id AS aspect_id, 
          a.aspect_name AS aspect_name
        FROM requirements r
        JOIN subjects s ON r.subject_id = s.id
        JOIN aspects a ON r.aspect_id = a.id
        WHERE r.requirement_condition = ?
      `
      const [rows] = await pool.query(query, [condition])
      if (rows.length === 0) return null
      return rows.map((row) => {
        const subject = {
          subject_id: row.subject_id,
          subject_name: row.subject_name
        }
        const aspect = {
          aspect_id: row.aspect_id,
          aspect_name: row.aspect_name
        }
        return new Requirement(
          row.id,
          subject,
          aspect,
          row.requirement_number,
          row.requirement_name,
          row.mandatory_description,
          row.complementary_description,
          row.mandatory_sentences,
          row.complementary_sentences,
          row.mandatory_keywords,
          row.complementary_keywords,
          row.requirement_condition,
          row.evidence,
          row.periodicity,
          row.requirement_type,
          row.jurisdiction,
          row.state,
          row.municipality
        )
      })
    } catch (error) {
      console.error('Error retrieving requirements by condition:', error.message)
      throw new ErrorUtils(500, 'Error retrieving requirements by condition')
    }
  }

  /**
 * Retrieves requirements filtered by a specific evidence type.
 * @param {string} evidence - The evidence type ('Trámite', 'Registro', 'Específico', 'Documento') to filter by.
 * @returns {Promise<Array<Requirement>|null>} - A list of Requirement instances matching the evidence type.
 * @throws {ErrorUtils} - If an error occurs during retrieval.
 */
  static async findByEvidence (evidence) {
    try {
      const query = `
        SELECT 
          r.id, 
          r.requirement_number, 
          r.requirement_name, 
          r.mandatory_description, 
          r.complementary_description, 
          r.mandatory_sentences, 
          r.complementary_sentences, 
          r.mandatory_keywords, 
          r.complementary_keywords, 
          r.requirement_condition, 
          r.evidence, 
          r.periodicity, 
          r.requirement_type, 
          r.jurisdiction, 
          r.state, 
          r.municipality, 
          s.id AS subject_id, 
          s.subject_name AS subject_name, 
          a.id AS aspect_id, 
          a.aspect_name AS aspect_name
        FROM requirements r
        JOIN subjects s ON r.subject_id = s.id
        JOIN aspects a ON r.aspect_id = a.id
        WHERE r.evidence = ?
      `
      const [rows] = await pool.query(query, [evidence])
      if (rows.length === 0) return null
      return rows.map((row) => {
        const subject = {
          subject_id: row.subject_id,
          subject_name: row.subject_name
        }
        const aspect = {
          aspect_id: row.aspect_id,
          aspect_name: row.aspect_name
        }
        return new Requirement(
          row.id,
          subject,
          aspect,
          row.requirement_number,
          row.requirement_name,
          row.mandatory_description,
          row.complementary_description,
          row.mandatory_sentences,
          row.complementary_sentences,
          row.mandatory_keywords,
          row.complementary_keywords,
          row.requirement_condition,
          row.evidence,
          row.periodicity,
          row.requirement_type,
          row.jurisdiction,
          row.state,
          row.municipality
        )
      })
    } catch (error) {
      console.error('Error retrieving requirements by evidence:', error.message)
      throw new ErrorUtils(500, 'Error retrieving requirements by evidence')
    }
  }

  /**
 * Retrieves requirements filtered by a specific periodicity.
 * @param {string} periodicity - The periodicity ('Anual', '2 años', 'Por evento', 'Única vez') to filter by.
 * @returns {Promise<Array<Requirement>|null>} - A list of Requirement instances matching the periodicity.
 * @throws {ErrorUtils} - If an error occurs during retrieval.
 */
  static async findByPeriodicity (periodicity) {
    try {
      const query = `
        SELECT 
          r.id, 
          r.requirement_number, 
          r.requirement_name, 
          r.mandatory_description, 
          r.complementary_description, 
          r.mandatory_sentences, 
          r.complementary_sentences, 
          r.mandatory_keywords, 
          r.complementary_keywords, 
          r.requirement_condition, 
          r.evidence, 
          r.periodicity, 
          r.requirement_type, 
          r.jurisdiction, 
          r.state, 
          r.municipality, 
          s.id AS subject_id, 
          s.subject_name AS subject_name, 
          a.id AS aspect_id, 
          a.aspect_name AS aspect_name
        FROM requirements r
        JOIN subjects s ON r.subject_id = s.id
        JOIN aspects a ON r.aspect_id = a.id
        WHERE r.periodicity = ?
      `

      const [rows] = await pool.query(query, [periodicity])

      if (rows.length === 0) return null

      return rows.map((row) => {
        const subject = {
          subject_id: row.subject_id,
          subject_name: row.subject_name
        }
        const aspect = {
          aspect_id: row.aspect_id,
          aspect_name: row.aspect_name
        }
        return new Requirement(
          row.id,
          subject,
          aspect,
          row.requirement_number,
          row.requirement_name,
          row.mandatory_description,
          row.complementary_description,
          row.mandatory_sentences,
          row.complementary_sentences,
          row.mandatory_keywords,
          row.complementary_keywords,
          row.requirement_condition,
          row.evidence,
          row.periodicity,
          row.requirement_type,
          row.jurisdiction,
          row.state,
          row.municipality
        )
      })
    } catch (error) {
      console.error('Error retrieving requirements by periodicity:', error.message)
      throw new ErrorUtils(500, 'Error retrieving requirements by periodicity')
    }
  }

  /**
 * Retrieves requirements filtered by a specific requirement type.
 * @param {string} requirementType - The requirement type to filter by.
 * @returns {Promise<Array<Requirement>|null>} - A list of Requirement instances matching the requirement type.
 * @throws {ErrorUtils} - If an error occurs during retrieval.
 */
  static async findByRequirementType (requirementType) {
    try {
      const query = `
        SELECT 
          r.id, 
          r.requirement_number, 
          r.requirement_name, 
          r.mandatory_description, 
          r.complementary_description, 
          r.mandatory_sentences, 
          r.complementary_sentences, 
          r.mandatory_keywords, 
          r.complementary_keywords, 
          r.requirement_condition, 
          r.evidence, 
          r.periodicity,  
          r.requirement_type, 
          r.jurisdiction, 
          r.state, 
          r.municipality, 
          s.id AS subject_id, 
          s.subject_name AS subject_name, 
          a.id AS aspect_id, 
          a.aspect_name AS aspect_name
        FROM requirements r
        JOIN subjects s ON r.subject_id = s.id
        JOIN aspects a ON r.aspect_id = a.id
        WHERE r.requirement_type = ?
      `
      const [rows] = await pool.query(query, [requirementType])
      if (rows.length === 0) return null
      return rows.map((row) => {
        const subject = {
          subject_id: row.subject_id,
          subject_name: row.subject_name
        }
        const aspect = {
          aspect_id: row.aspect_id,
          aspect_name: row.aspect_name
        }
        return new Requirement(
          row.id,
          subject,
          aspect,
          row.requirement_number,
          row.requirement_name,
          row.mandatory_description,
          row.complementary_description,
          row.mandatory_sentences,
          row.complementary_sentences,
          row.mandatory_keywords,
          row.complementary_keywords,
          row.requirement_condition,
          row.evidence,
          row.periodicity,
          row.requirement_type,
          row.jurisdiction,
          row.state,
          row.municipality
        )
      })
    } catch (error) {
      console.error('Error retrieving requirements by requirement type:', error.message)
      throw new ErrorUtils(500, 'Error retrieving requirements by requirement type')
    }
  }

  /**
 * Retrieves requirements filtered by a specific jurisdiction.
 * @param {string} jurisdiction - The jurisdiction to filter by.
 * @returns {Promise<Array<Requirement>|null>} - A list of Requirement instances matching the jurisdiction.
 * @throws {ErrorUtils} - If an error occurs during retrieval.
 */
  static async findByJurisdiction (jurisdiction) {
    try {
      const query = `
        SELECT 
          r.id, 
          r.requirement_number, 
          r.requirement_name, 
          r.mandatory_description, 
          r.complementary_description, 
          r.mandatory_sentences, 
          r.complementary_sentences, 
          r.mandatory_keywords, 
          r.complementary_keywords, 
          r.requirement_condition, 
          r.evidence, 
          r.periodicity, 
          r.requirement_type, 
          r.jurisdiction, 
          r.state, 
          r.municipality, 
          s.id AS subject_id, 
          s.subject_name AS subject_name, 
          a.id AS aspect_id, 
          a.aspect_name AS aspect_name
        FROM requirements r
        JOIN subjects s ON r.subject_id = s.id
        JOIN aspects a ON r.aspect_id = a.id
        WHERE r.jurisdiction = ?
      `

      const [rows] = await pool.query(query, [jurisdiction])

      if (rows.length === 0) return null

      return rows.map((row) => {
        const subject = {
          subject_id: row.subject_id,
          subject_name: row.subject_name
        }
        const aspect = {
          aspect_id: row.aspect_id,
          aspect_name: row.aspect_name
        }
        return new Requirement(
          row.id,
          subject,
          aspect,
          row.requirement_number,
          row.requirement_name,
          row.mandatory_description,
          row.complementary_description,
          row.mandatory_sentences,
          row.complementary_sentences,
          row.mandatory_keywords,
          row.complementary_keywords,
          row.requirement_condition,
          row.evidence,
          row.periodicity,
          row.requirement_type,
          row.jurisdiction,
          row.state,
          row.municipality
        )
      })
    } catch (error) {
      console.error('Error retrieving requirements by jurisdiction:', error.message)
      throw new ErrorUtils(500, 'Error retrieving requirements by jurisdiction')
    }
  }

  /**
 * Retrieves requirements filtered by a specific state.
 * @param {string} state - The state to filter by.
 * @returns {Promise<Array<Requirement>|null>} - A list of Requirement instances matching the state.
 * @throws {ErrorUtils} - If an error occurs during retrieval.
 */
  static async findByState (state) {
    try {
      const query = `
        SELECT 
          r.id, 
          r.requirement_number, 
          r.requirement_name, 
          r.mandatory_description, 
          r.complementary_description, 
          r.mandatory_sentences, 
          r.complementary_sentences, 
          r.mandatory_keywords, 
          r.complementary_keywords, 
          r.requirement_condition, 
          r.evidence, 
          r.periodicity, 
          r.requirement_type, 
          r.jurisdiction, 
          r.state, 
          r.municipality, 
          s.id AS subject_id, 
          s.subject_name AS subject_name, 
          a.id AS aspect_id, 
          a.aspect_name AS aspect_name
        FROM requirements r
        JOIN subjects s ON r.subject_id = s.id
        JOIN aspects a ON r.aspect_id = a.id
        WHERE r.state = ?
      `

      const [rows] = await pool.query(query, [state])

      if (rows.length === 0) return null

      return rows.map((row) => {
        const subject = {
          subject_id: row.subject_id,
          subject_name: row.subject_name
        }
        const aspect = {
          aspect_id: row.aspect_id,
          aspect_name: row.aspect_name
        }
        return new Requirement(
          row.id,
          subject,
          aspect,
          row.requirement_number,
          row.requirement_name,
          row.mandatory_description,
          row.complementary_description,
          row.mandatory_sentences,
          row.complementary_sentences,
          row.mandatory_keywords,
          row.complementary_keywords,
          row.requirement_condition,
          row.evidence,
          row.periodicity,
          row.requirement_type,
          row.jurisdiction,
          row.state,
          row.municipality
        )
      })
    } catch (error) {
      console.error('Error retrieving requirements by state:', error.message)
      throw new ErrorUtils(500, 'Error retrieving requirements by state')
    }
  }

  /**
 * Retrieves requirements filtered by state and optionally by municipalities.
 * @param {string} state - The state to filter by.
 * @param {Array<string>} [municipalities] - An array of municipalities to filter by (optional).
 * @returns {Promise<Array<Requirement>|null>} - A list of Requirement instances matching the filters.
 * @throws {ErrorUtils} - If an error occurs during retrieval.
 */
  static async findByStateAndMunicipalities (state, municipalities = []) {
    let query = `
      SELECT 
        r.id, 
        r.requirement_number, 
        r.requirement_name, 
        r.mandatory_description, 
        r.complementary_description, 
        r.mandatory_sentences, 
        r.complementary_sentences, 
        r.mandatory_keywords, 
        r.complementary_keywords, 
        r.requirement_condition, 
        r.evidence, 
        r.periodicity, 
        r.requirement_type, 
        r.jurisdiction, 
        r.state, 
        r.municipality, 
        s.id AS subject_id, 
        s.subject_name AS subject_name, 
        a.id AS aspect_id, 
        a.aspect_name AS aspect_name
      FROM requirements r
      JOIN subjects s ON r.subject_id = s.id
      JOIN aspects a ON r.aspect_id = a.id
      WHERE r.state = ?
    `
    const values = [state]
    if (municipalities.length > 0) {
      const placeholders = municipalities.map(() => '?').join(', ')
      query += ` AND r.municipality IN (${placeholders})`
      values.push(...municipalities)
    }
    try {
      const [rows] = await pool.query(query, values)
      if (rows.length === 0) return null
      return rows.map((row) => {
        const subject = {
          subject_id: row.subject_id,
          subject_name: row.subject_name
        }
        const aspect = {
          aspect_id: row.aspect_id,
          aspect_name: row.aspect_name
        }
        return new Requirement(
          row.id,
          subject,
          aspect,
          row.requirement_number,
          row.requirement_name,
          row.mandatory_description,
          row.complementary_description,
          row.mandatory_sentences,
          row.complementary_sentences,
          row.mandatory_keywords,
          row.complementary_keywords,
          row.requirement_condition,
          row.evidence,
          row.periodicity,
          row.requirement_type,
          row.jurisdiction,
          row.state,
          row.municipality
        )
      })
    } catch (error) {
      console.error('Error retrieving requirements by state and municipalities:', error.message)
      throw new ErrorUtils(500, 'Error retrieving requirements by state and municipalities')
    }
  }

  /**
 * Checks if a requirement with the given number exists, excluding the specified requirement ID.
 * @param {string} requirementNumber - The requirement number to check for uniqueness.
 * @param {number} requirementId - The requirement ID to exclude from the check.
 * @returns {Promise<boolean>} - True if a requirement with the same number exists (excluding the given ID), false otherwise.
 * @throws {ErrorUtils} - If an error occurs during the check.
 */
  static async existsByNumberExcludingId (requirementNumber, requirementId) {
    const query = `
      SELECT 1 
      FROM requirements 
      WHERE requirement_number = ? AND id != ?
      LIMIT 1
    `
    try {
      const [rows] = await pool.query(query, [requirementNumber, requirementId])
      return rows.length > 0
    } catch (error) {
      console.error('Error checking requirement number uniqueness:', error.message)
      throw new ErrorUtils(500, 'Error checking requirement number uniqueness')
    }
  }

  /**
   * Checks if a requirement with the given name exists, excluding the specified requirement ID.
   * @param {string} requirementName - The requirement name to check for uniqueness.
   * @param {number} requirementId - The requirement ID to exclude from the check.
   * @returns {Promise<boolean>} - True if a requirement with the same name exists (excluding the given ID), false otherwise.
   * @throws {ErrorUtils} - If an error occurs during the check.
   */
  static async existsByNameExcludingId (requirementName, requirementId) {
    const query = `
        SELECT 1 
        FROM requirements 
        WHERE requirement_name = ? AND id != ?
        LIMIT 1
      `
    try {
      const [rows] = await pool.query(query, [requirementName, requirementId])
      return rows.length > 0
    } catch (error) {
      console.error('Error checking requirement name uniqueness:', error.message)
      throw new ErrorUtils(500, 'Error checking requirement name uniqueness')
    }
  }

  /**
   * Updates a requirement by its ID using IFNULL to preserve existing values.
   * @param {number} requirementId - The ID of the requirement to update.
   * @param {Object} requirement - The requirement object containing updated values.
   * @param {number} [requirement.subjectId] - The updated subject ID (optional).
   * @param {number} [requirement.aspectId] - The updated aspect ID (optional).
   * @param {string} [requirement.requirementNumber] - The updated requirement number (optional).
   * @param {string} [requirement.requirementName] - The updated requirement name (optional).
   * @param {string} [requirement.mandatoryDescription] - The updated mandatory description (optional).
   * @param {string} [requirement.complementaryDescription] - The updated complementary description (optional).
   * @param {string} [requirement.mandatorySentences] - The updated mandatory sentences (optional).
   * @param {string} [requirement.complementarySentences] - The updated complementary sentences (optional).
   * @param {string} [requirement.mandatoryKeywords] - The updated mandatory keywords (optional).
   * @param {string} [requirement.complementaryKeywords] - The updated complementary keywords (optional).
   * @param {string} [requirement.condition] - The updated condition type (optional).
   * @param {string} [requirement.evidence] - The updated evidence type (optional).
   * @param {string} [requirement.periodicity] - The updated periodicity (optional).
   * @param {string} [requirement.requirementType] - The updated requirement type (optional).
   * @param {string} [requirement.jurisdiction] - The updated jurisdiction (optional).
   * @param {string} [requirement.state] - The updated state (optional).
   * @param {string} [requirement.municipality] - The updated municipality (optional).
   * @returns {Promise<Requirement>} - Returns the updated Requirement.
   * @throws {ErrorUtils} - If an error occurs during the update.
   */
  static async update (requirementId, requirement) {
    const {
      subjectId,
      aspectId,
      requirementNumber,
      requirementName,
      mandatoryDescription,
      complementaryDescription,
      mandatorySentences,
      complementarySentences,
      mandatoryKeywords,
      complementaryKeywords,
      condition,
      evidence,
      periodicity,
      requirementType,
      jurisdiction,
      state,
      municipality
    } = requirement

    const updateRequirementQuery = `
      UPDATE requirements SET
        subject_id = IFNULL(?, subject_id),
        aspect_id = IFNULL(?, aspect_id),
        requirement_number = IFNULL(?, requirement_number),
        requirement_name = IFNULL(?, requirement_name),
        mandatory_description = IFNULL(?, mandatory_description),
        complementary_description = IFNULL(?, complementary_description),
        mandatory_sentences = IFNULL(?, mandatory_sentences),
        complementary_sentences = IFNULL(?, complementary_sentences),
        mandatory_keywords = IFNULL(?, mandatory_keywords),
        complementary_keywords = IFNULL(?, complementary_keywords),
        requirement_condition = IFNULL(?, requirement_condition),
        evidence = IFNULL(?, evidence),
        periodicity = IFNULL(?, periodicity),
        requirement_type = IFNULL(?, requirement_type),
        jurisdiction = IFNULL(?, jurisdiction),
        state = IFNULL(?, state),
        municipality = IFNULL(?, municipality)
      WHERE id = ?
    `

    try {
      await pool.query(updateRequirementQuery, [
        subjectId,
        aspectId,
        requirementNumber,
        requirementName,
        mandatoryDescription,
        complementaryDescription,
        mandatorySentences,
        complementarySentences,
        mandatoryKeywords,
        complementaryKeywords,
        condition,
        evidence,
        periodicity,
        requirementType,
        jurisdiction,
        state,
        municipality,
        requirementId
      ])
      const requirement = await this.findById(requirementId)
      return requirement
    } catch (error) {
      console.error('Error updating requirement:', error.message)
      throw new ErrorUtils(500, 'Error updating requirement in the database')
    }
  }

  /**
   * Deletes a requirement by its ID.
    * @param {number} requirementId - The ID of the requirement to delete.
    * @returns {Promise<boolean>} - Returns true if the deletion is successful, false otherwise.
    * @throws {ErrorUtils} - If an error occurs during deletion.
    */
  static async delete (requirementId) {
    const deleteRequirementQuery = `
    DELETE FROM requirements WHERE id = ?
  `
    try {
      const [result] = await pool.query(deleteRequirementQuery, [requirementId])
      if (result.affectedRows === 0) {
        return false
      }
      return true
    } catch (error) {
      console.error('Error deleting requirement:', error.message)
      throw new ErrorUtils(500, 'Error deleting requirement from the database')
    }
  }

  /**
 * Deletes multiple requirements by their IDs.
 * @param {number[]} requirementIds - An array of requirement IDs to delete.
 * @returns {Promise<boolean>} - Returns true if at least one requirement was deleted, false otherwise.
 * @throws {ErrorUtils} - If an error occurs during deletion.
 */
  static async deleteBatch (requirementIds) {
    const deleteRequirementsQuery = `
    DELETE FROM requirements WHERE id IN (?)
  `
    try {
      const [result] = await pool.query(deleteRequirementsQuery, [requirementIds])
      if (result.affectedRows === 0) {
        return false
      }
      return true
    } catch (error) {
      console.error('Error deleting multiple requirements:', error.message)
      throw new ErrorUtils(500, 'Error deleting requirements from the database')
    }
  }

  /**
   * Deletes all requirements from the database.
   * @returns {Promise<void>}
   * @throws {ErrorUtils} - If an error occurs during deletion.
   */
  static async deleteAll () {
    const deleteAllRequirementsQuery = `
    DELETE FROM requirements
  `
    try {
      await pool.query(deleteAllRequirementsQuery)
    } catch (error) {
      console.error('Error deleting all requirements:', error.message)
      throw new ErrorUtils(500, 'Error deleting all requirements from the database')
    }
  }
}

export default RequirementRepository
