import { pool } from '../config/db.config.js'
import ErrorUtils from '../utils/Error.js'
import Requirement from '../models/Requirement.model.js'

/**
 * Repository class for handling database operations related to Requirements.
 */
class RequirementRepository {
  /**
 * Inserts a new requirement into the database and associates it with aspects.
 * @param {Object} requirement - The requirement object to insert.
 * @param {number} requirement.subjectId - The main subject ID of the requirement.
 * @param {Array<number>} requirement.aspectsIds - The aspect IDs to associate.
 * @param {string} requirement.requirementNumber
 * @param {string} requirement.requirementName
 * @param {string} requirement.mandatoryDescription
 * @param {string} requirement.complementaryDescription
 * @param {string} requirement.mandatorySentences
 * @param {string} requirement.complementarySentences
 * @param {string} requirement.mandatoryKeywords
 * @param {string} requirement.complementaryKeywords
 * @param {string} requirement.condition - 'Crítica', 'Operativa', etc.
 * @param {string} requirement.evidence - 'Trámite', etc.
 * @param {string} requirement.periodicity - 'Anual', etc.
 * @param {string} requirement.requirementType
 * @param {string} requirement.jurisdiction
 * @param {string} [requirement.state]
 * @param {string} [requirement.municipality]
 * @returns {Promise<Requirement>}
 * @throws {ErrorUtils}
 */
  static async create (requirement) {
    const {
      subjectId,
      aspectsIds,
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
      subject_id, requirement_number, requirement_name, 
      mandatory_description, complementary_description, 
      mandatory_sentences, complementary_sentences, 
      mandatory_keywords, complementary_keywords, 
      requirement_condition, evidence, periodicity, 
      requirement_type, jurisdiction, state, municipality
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `

    try {
      const [result] = await pool.query(insertRequirementQuery, [
        subjectId,
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
      if (aspectsIds && aspectsIds.length > 0) {
        const insertAspectsQuery = `
        INSERT INTO requirement_subject_aspect (requirement_id, subject_id, aspect_id)
        VALUES ${aspectsIds.map(() => '(?, ?, ?)').join(', ')}
      `
        const values = aspectsIds.flatMap((aspectId) => [
          requirementId,
          subjectId,
          aspectId
        ])
        await pool.query(insertAspectsQuery, values)
      }
      const createdRequirement = await this.findById(requirementId)
      return createdRequirement
    } catch (error) {
      console.error('Error creating requirement:', error.message)
      throw new ErrorUtils(500, 'Error creating requirement in the database')
    }
  }

  /**
 * Retrieves all requirements from the database along with their subjects and associated aspects.
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
    LEFT JOIN requirement_subject_aspect rsa ON r.id = rsa.requirement_id
    LEFT JOIN aspects a ON rsa.aspect_id = a.id
  `

    try {
      const [rows] = await pool.query(query)
      if (rows.length === 0) return null

      const requirementsMap = new Map()

      rows.forEach((row) => {
        if (!requirementsMap.has(row.id)) {
          requirementsMap.set(row.id, {
            id: row.id,
            requirement_number: row.requirement_number,
            requirement_name: row.requirement_name,
            mandatory_description: row.mandatory_description,
            complementary_description: row.complementary_description,
            mandatory_sentences: row.mandatory_sentences,
            complementary_sentences: row.complementary_sentences,
            mandatory_keywords: row.mandatory_keywords,
            complementary_keywords: row.complementary_keywords,
            requirement_condition: row.requirement_condition,
            evidence: row.evidence,
            periodicity: row.periodicity,
            requirement_type: row.requirement_type,
            jurisdiction: row.jurisdiction,
            state: row.state,
            municipality: row.municipality,
            subject: {
              subject_id: row.subject_id,
              subject_name: row.subject_name
            },
            aspects: []
          })
        }

        if (row.aspect_id !== null) {
          requirementsMap.get(row.id).aspects.push({
            aspect_id: row.aspect_id,
            aspect_name: row.aspect_name
          })
        }
      })

      return Array.from(requirementsMap.values()).map((req) => {
        return new Requirement(
          req.id,
          req.subject,
          req.aspects,
          req.requirement_number,
          req.requirement_name,
          req.mandatory_description,
          req.complementary_description,
          req.mandatory_sentences,
          req.complementary_sentences,
          req.mandatory_keywords,
          req.complementary_keywords,
          req.requirement_condition,
          req.evidence,
          req.periodicity,
          req.requirement_type,
          req.jurisdiction,
          req.state,
          req.municipality
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
 * Retrieves a requirement record by its ID, including its subject and all associated aspects.
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
    LEFT JOIN requirement_subject_aspect rsa ON r.id = rsa.requirement_id
    LEFT JOIN aspects a ON rsa.aspect_id = a.id
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

      const aspects = rows
        .map((row) => ({
          aspect_id: row.aspect_id,
          aspect_name: row.aspect_name
        }))
        .filter((aspect) => aspect.aspect_id !== null)

      return new Requirement(
        requirement.id,
        subject,
        aspects,
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
    if (requirementIds.length === 0) return []

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
    LEFT JOIN requirement_subject_aspect rsa ON r.id = rsa.requirement_id
    LEFT JOIN aspects a ON rsa.aspect_id = a.id
    WHERE r.id IN (?)
  `

    try {
      const [rows] = await pool.query(query, [requirementIds])
      if (rows.length === 0) return []

      const requirementsMap = new Map()

      rows.forEach((row) => {
        if (!requirementsMap.has(row.id)) {
          requirementsMap.set(row.id, {
            id: row.id,
            requirement_number: row.requirement_number,
            requirement_name: row.requirement_name,
            mandatory_description: row.mandatory_description,
            complementary_description: row.complementary_description,
            mandatory_sentences: row.mandatory_sentences,
            complementary_sentences: row.complementary_sentences,
            mandatory_keywords: row.mandatory_keywords,
            complementary_keywords: row.complementary_keywords,
            requirement_condition: row.requirement_condition,
            evidence: row.evidence,
            periodicity: row.periodicity,
            requirement_type: row.requirement_type,
            jurisdiction: row.jurisdiction,
            state: row.state,
            municipality: row.municipality,
            subject: {
              subject_id: row.subject_id,
              subject_name: row.subject_name
            },
            aspects: []
          })
        }

        if (row.aspect_id !== null) {
          requirementsMap.get(row.id).aspects.push({
            aspect_id: row.aspect_id,
            aspect_name: row.aspect_name
          })
        }
      })

      return Array.from(requirementsMap.values()).map((req) => {
        return new Requirement(
          req.id,
          req.subject,
          req.aspects,
          req.requirement_number,
          req.requirement_name,
          req.mandatory_description,
          req.complementary_description,
          req.mandatory_sentences,
          req.complementary_sentences,
          req.mandatory_keywords,
          req.complementary_keywords,
          req.requirement_condition,
          req.evidence,
          req.periodicity,
          req.requirement_type,
          req.jurisdiction,
          req.state,
          req.municipality
        )
      })
    } catch (error) {
      console.error('Error finding requirements by IDs:', error.message)
      throw new ErrorUtils(500, 'Error retrieving requirements by IDs from the database')
    }
  }

  /**
 * Retrieves all requirements that match the given requirement number,
 * including their subjects and associated aspects.
 * @param {string} requirementNumber - The number or part of the number of the requirement to retrieve.
 * @returns {Promise<Array<Requirement|null>>} - A list of matching requirements.
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
    LEFT JOIN requirement_subject_aspect rsa ON r.id = rsa.requirement_id
    LEFT JOIN aspects a ON rsa.aspect_id = a.id
    WHERE r.requirement_number LIKE ?
  `

    try {
      const [rows] = await pool.query(query, [`%${requirementNumber}%`])
      if (rows.length === 0) return null

      const requirementsMap = new Map()

      rows.forEach((row) => {
        if (!requirementsMap.has(row.id)) {
          requirementsMap.set(row.id, {
            id: row.id,
            requirement_number: row.requirement_number,
            requirement_name: row.requirement_name,
            mandatory_description: row.mandatory_description,
            complementary_description: row.complementary_description,
            mandatory_sentences: row.mandatory_sentences,
            complementary_sentences: row.complementary_sentences,
            mandatory_keywords: row.mandatory_keywords,
            complementary_keywords: row.complementary_keywords,
            requirement_condition: row.requirement_condition,
            evidence: row.evidence,
            periodicity: row.periodicity,
            requirement_type: row.requirement_type,
            jurisdiction: row.jurisdiction,
            state: row.state,
            municipality: row.municipality,
            subject: {
              subject_id: row.subject_id,
              subject_name: row.subject_name
            },
            aspects: []
          })
        }

        if (row.aspect_id !== null) {
          requirementsMap.get(row.id).aspects.push({
            aspect_id: row.aspect_id,
            aspect_name: row.aspect_name
          })
        }
      })

      return Array.from(requirementsMap.values()).map((req) => {
        return new Requirement(
          req.id,
          req.subject,
          req.aspects,
          req.requirement_number,
          req.requirement_name,
          req.mandatory_description,
          req.complementary_description,
          req.mandatory_sentences,
          req.complementary_sentences,
          req.mandatory_keywords,
          req.complementary_keywords,
          req.requirement_condition,
          req.evidence,
          req.periodicity,
          req.requirement_type,
          req.jurisdiction,
          req.state,
          req.municipality
        )
      })
    } catch (error) {
      console.error('Error retrieving requirements by number:', error.message)
      throw new ErrorUtils(500, 'Error retrieving requirements by number')
    }
  }

  /**
 * Retrieves all requirements that match the given name, including their subjects and associated aspects.
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
    LEFT JOIN requirement_subject_aspect rsa ON r.id = rsa.requirement_id
    LEFT JOIN aspects a ON rsa.aspect_id = a.id
    WHERE r.requirement_name LIKE ?
  `

    try {
      const [rows] = await pool.query(query, [`%${requirementName}%`])
      if (rows.length === 0) return null

      const requirementsMap = new Map()

      rows.forEach((row) => {
        if (!requirementsMap.has(row.id)) {
          requirementsMap.set(row.id, {
            id: row.id,
            requirement_number: row.requirement_number,
            requirement_name: row.requirement_name,
            mandatory_description: row.mandatory_description,
            complementary_description: row.complementary_description,
            mandatory_sentences: row.mandatory_sentences,
            complementary_sentences: row.complementary_sentences,
            mandatory_keywords: row.mandatory_keywords,
            complementary_keywords: row.complementary_keywords,
            requirement_condition: row.requirement_condition,
            evidence: row.evidence,
            periodicity: row.periodicity,
            requirement_type: row.requirement_type,
            jurisdiction: row.jurisdiction,
            state: row.state,
            municipality: row.municipality,
            subject: {
              subject_id: row.subject_id,
              subject_name: row.subject_name
            },
            aspects: []
          })
        }

        if (row.aspect_id !== null) {
          requirementsMap.get(row.id).aspects.push({
            aspect_id: row.aspect_id,
            aspect_name: row.aspect_name
          })
        }
      })

      return Array.from(requirementsMap.values()).map((req) => {
        return new Requirement(
          req.id,
          req.subject,
          req.aspects,
          req.requirement_number,
          req.requirement_name,
          req.mandatory_description,
          req.complementary_description,
          req.mandatory_sentences,
          req.complementary_sentences,
          req.mandatory_keywords,
          req.complementary_keywords,
          req.requirement_condition,
          req.evidence,
          req.periodicity,
          req.requirement_type,
          req.jurisdiction,
          req.state,
          req.municipality
        )
      })
    } catch (error) {
      console.error('Error retrieving requirements by name:', error.message)
      throw new ErrorUtils(500, 'Error retrieving requirements by name')
    }
  }

  /**
 * Retrieves all requirements filtered by a specific subject, including their aspects.
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
    LEFT JOIN requirement_subject_aspect rsa ON r.id = rsa.requirement_id
    LEFT JOIN aspects a ON rsa.aspect_id = a.id
    WHERE r.subject_id = ?
  `

    try {
      const [rows] = await pool.query(query, [subjectId])
      if (rows.length === 0) return null

      const requirementsMap = new Map()
      rows.forEach((row) => {
        if (!requirementsMap.has(row.id)) {
          requirementsMap.set(row.id, {
            id: row.id,
            requirement_number: row.requirement_number,
            requirement_name: row.requirement_name,
            mandatory_description: row.mandatory_description,
            complementary_description: row.complementary_description,
            mandatory_sentences: row.mandatory_sentences,
            complementary_sentences: row.complementary_sentences,
            mandatory_keywords: row.mandatory_keywords,
            complementary_keywords: row.complementary_keywords,
            requirement_condition: row.requirement_condition,
            evidence: row.evidence,
            periodicity: row.periodicity,
            requirement_type: row.requirement_type,
            jurisdiction: row.jurisdiction,
            state: row.state,
            municipality: row.municipality,
            subject: {
              subject_id: row.subject_id,
              subject_name: row.subject_name
            },
            aspects: []
          })
        }

        if (row.aspect_id !== null) {
          requirementsMap.get(row.id).aspects.push({
            aspect_id: row.aspect_id,
            aspect_name: row.aspect_name
          })
        }
      })

      return Array.from(requirementsMap.values()).map(req =>
        new Requirement(
          req.id,
          req.subject,
          req.aspects,
          req.requirement_number,
          req.requirement_name,
          req.mandatory_description,
          req.complementary_description,
          req.mandatory_sentences,
          req.complementary_sentences,
          req.mandatory_keywords,
          req.complementary_keywords,
          req.requirement_condition,
          req.evidence,
          req.periodicity,
          req.requirement_type,
          req.jurisdiction,
          req.state,
          req.municipality
        )
      )
    } catch (error) {
      console.error('Error retrieving requirements by subject:', error.message)
      throw new ErrorUtils(500, 'Error retrieving requirements by subject')
    }
  }

  /**
 * Retrieves all requirements filtered by subject and optionally by aspects.
 * Includes associated subject and aspects.
 * @param {number} subjectId - The subject ID to filter by.
 * @param {Array<number>} [aspectIds] - Optional array of aspect IDs to further filter by.
 * @returns {Promise<Array<Requirement>|null>} - A list of requirements matching the filters, or null if none found.
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
    LEFT JOIN requirement_subject_aspect rsa ON r.id = rsa.requirement_id
    LEFT JOIN aspects a ON rsa.aspect_id = a.id
    WHERE r.subject_id = ?
  `

    const values = [subjectId]

    if (aspectIds.length > 0) {
      const placeholders = aspectIds.map(() => '?').join(', ')
      query += ` AND a.id IN (${placeholders})`
      values.push(...aspectIds)
    }

    try {
      const [rows] = await pool.query(query, values)
      if (rows.length === 0) return null

      const requirementsMap = new Map()
      rows.forEach((row) => {
        if (!requirementsMap.has(row.id)) {
          requirementsMap.set(row.id, {
            id: row.id,
            requirement_number: row.requirement_number,
            requirement_name: row.requirement_name,
            mandatory_description: row.mandatory_description,
            complementary_description: row.complementary_description,
            mandatory_sentences: row.mandatory_sentences,
            complementary_sentences: row.complementary_sentences,
            mandatory_keywords: row.mandatory_keywords,
            complementary_keywords: row.complementary_keywords,
            requirement_condition: row.requirement_condition,
            evidence: row.evidence,
            periodicity: row.periodicity,
            requirement_type: row.requirement_type,
            jurisdiction: row.jurisdiction,
            state: row.state,
            municipality: row.municipality,
            subject: {
              subject_id: row.subject_id,
              subject_name: row.subject_name
            },
            aspects: []
          })
        }

        if (row.aspect_id !== null) {
          requirementsMap.get(row.id).aspects.push({
            aspect_id: row.aspect_id,
            aspect_name: row.aspect_name
          })
        }
      })

      return Array.from(requirementsMap.values()).map(req =>
        new Requirement(
          req.id,
          req.subject,
          req.aspects,
          req.requirement_number,
          req.requirement_name,
          req.mandatory_description,
          req.complementary_description,
          req.mandatory_sentences,
          req.complementary_sentences,
          req.mandatory_keywords,
          req.complementary_keywords,
          req.requirement_condition,
          req.evidence,
          req.periodicity,
          req.requirement_type,
          req.jurisdiction,
          req.state,
          req.municipality
        )
      )
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
    LEFT JOIN requirement_subject_aspect rsa ON r.id = rsa.requirement_id
    LEFT JOIN aspects a ON rsa.aspect_id = a.id
    WHERE MATCH(r.mandatory_description) AGAINST(? IN BOOLEAN MODE)
  `
    try {
      const [rows] = await pool.query(query, [description])
      if (rows.length === 0) return null

      const requirementsMap = new Map()

      rows.forEach((row) => {
        if (!requirementsMap.has(row.id)) {
          requirementsMap.set(row.id, {
            id: row.id,
            requirement_number: row.requirement_number,
            requirement_name: row.requirement_name,
            mandatory_description: row.mandatory_description,
            complementary_description: row.complementary_description,
            mandatory_sentences: row.mandatory_sentences,
            complementary_sentences: row.complementary_sentences,
            mandatory_keywords: row.mandatory_keywords,
            complementary_keywords: row.complementary_keywords,
            requirement_condition: row.requirement_condition,
            evidence: row.evidence,
            periodicity: row.periodicity,
            requirement_type: row.requirement_type,
            jurisdiction: row.jurisdiction,
            state: row.state,
            municipality: row.municipality,
            subject: {
              subject_id: row.subject_id,
              subject_name: row.subject_name
            },
            aspects: []
          })
        }

        if (row.aspect_id !== null) {
          requirementsMap.get(row.id).aspects.push({
            aspect_id: row.aspect_id,
            aspect_name: row.aspect_name
          })
        }
      })

      return Array.from(requirementsMap.values()).map(req =>
        new Requirement(
          req.id,
          req.subject,
          req.aspects,
          req.requirement_number,
          req.requirement_name,
          req.mandatory_description,
          req.complementary_description,
          req.mandatory_sentences,
          req.complementary_sentences,
          req.mandatory_keywords,
          req.complementary_keywords,
          req.requirement_condition,
          req.evidence,
          req.periodicity,
          req.requirement_type,
          req.jurisdiction,
          req.state,
          req.municipality
        )
      )
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
    LEFT JOIN requirement_subject_aspect rsa ON r.id = rsa.requirement_id
    LEFT JOIN aspects a ON rsa.aspect_id = a.id
    WHERE MATCH(r.complementary_description) AGAINST(? IN BOOLEAN MODE)
  `
    try {
      const [rows] = await pool.query(query, [description])
      if (rows.length === 0) return null

      const requirementsMap = new Map()

      rows.forEach((row) => {
        if (!requirementsMap.has(row.id)) {
          requirementsMap.set(row.id, {
            id: row.id,
            requirement_number: row.requirement_number,
            requirement_name: row.requirement_name,
            mandatory_description: row.mandatory_description,
            complementary_description: row.complementary_description,
            mandatory_sentences: row.mandatory_sentences,
            complementary_sentences: row.complementary_sentences,
            mandatory_keywords: row.mandatory_keywords,
            complementary_keywords: row.complementary_keywords,
            requirement_condition: row.requirement_condition,
            evidence: row.evidence,
            periodicity: row.periodicity,
            requirement_type: row.requirement_type,
            jurisdiction: row.jurisdiction,
            state: row.state,
            municipality: row.municipality,
            subject: {
              subject_id: row.subject_id,
              subject_name: row.subject_name
            },
            aspects: []
          })
        }

        if (row.aspect_id !== null) {
          requirementsMap.get(row.id).aspects.push({
            aspect_id: row.aspect_id,
            aspect_name: row.aspect_name
          })
        }
      })

      return Array.from(requirementsMap.values()).map(req =>
        new Requirement(
          req.id,
          req.subject,
          req.aspects,
          req.requirement_number,
          req.requirement_name,
          req.mandatory_description,
          req.complementary_description,
          req.mandatory_sentences,
          req.complementary_sentences,
          req.mandatory_keywords,
          req.complementary_keywords,
          req.requirement_condition,
          req.evidence,
          req.periodicity,
          req.requirement_type,
          req.jurisdiction,
          req.state,
          req.municipality
        )
      )
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
    LEFT JOIN requirement_subject_aspect rsa ON r.id = rsa.requirement_id
    LEFT JOIN aspects a ON rsa.aspect_id = a.id
    WHERE MATCH(r.mandatory_sentences) AGAINST(? IN BOOLEAN MODE)
  `
    try {
      const [rows] = await pool.query(query, [sentence])
      if (rows.length === 0) return null

      const requirementsMap = new Map()
      rows.forEach((row) => {
        if (!requirementsMap.has(row.id)) {
          requirementsMap.set(row.id, {
            id: row.id,
            requirement_number: row.requirement_number,
            requirement_name: row.requirement_name,
            mandatory_description: row.mandatory_description,
            complementary_description: row.complementary_description,
            mandatory_sentences: row.mandatory_sentences,
            complementary_sentences: row.complementary_sentences,
            mandatory_keywords: row.mandatory_keywords,
            complementary_keywords: row.complementary_keywords,
            requirement_condition: row.requirement_condition,
            evidence: row.evidence,
            periodicity: row.periodicity,
            requirement_type: row.requirement_type,
            jurisdiction: row.jurisdiction,
            state: row.state,
            municipality: row.municipality,
            subject: {
              subject_id: row.subject_id,
              subject_name: row.subject_name
            },
            aspects: []
          })
        }

        if (row.aspect_id !== null) {
          requirementsMap.get(row.id).aspects.push({
            aspect_id: row.aspect_id,
            aspect_name: row.aspect_name
          })
        }
      })

      return Array.from(requirementsMap.values()).map(req =>
        new Requirement(
          req.id,
          req.subject,
          req.aspects,
          req.requirement_number,
          req.requirement_name,
          req.mandatory_description,
          req.complementary_description,
          req.mandatory_sentences,
          req.complementary_sentences,
          req.mandatory_keywords,
          req.complementary_keywords,
          req.requirement_condition,
          req.evidence,
          req.periodicity,
          req.requirement_type,
          req.jurisdiction,
          req.state,
          req.municipality
        )
      )
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
    LEFT JOIN requirement_subject_aspect rsa ON r.id = rsa.requirement_id
    LEFT JOIN aspects a ON rsa.aspect_id = a.id
    WHERE MATCH(r.complementary_sentences) AGAINST(? IN BOOLEAN MODE)
  `
    try {
      const [rows] = await pool.query(query, [sentence])
      if (rows.length === 0) return null

      const requirementsMap = new Map()
      rows.forEach((row) => {
        if (!requirementsMap.has(row.id)) {
          requirementsMap.set(row.id, {
            id: row.id,
            requirement_number: row.requirement_number,
            requirement_name: row.requirement_name,
            mandatory_description: row.mandatory_description,
            complementary_description: row.complementary_description,
            mandatory_sentences: row.mandatory_sentences,
            complementary_sentences: row.complementary_sentences,
            mandatory_keywords: row.mandatory_keywords,
            complementary_keywords: row.complementary_keywords,
            requirement_condition: row.requirement_condition,
            evidence: row.evidence,
            periodicity: row.periodicity,
            requirement_type: row.requirement_type,
            jurisdiction: row.jurisdiction,
            state: row.state,
            municipality: row.municipality,
            subject: {
              subject_id: row.subject_id,
              subject_name: row.subject_name
            },
            aspects: []
          })
        }

        if (row.aspect_id !== null) {
          requirementsMap.get(row.id).aspects.push({
            aspect_id: row.aspect_id,
            aspect_name: row.aspect_name
          })
        }
      })

      return Array.from(requirementsMap.values()).map(req =>
        new Requirement(
          req.id,
          req.subject,
          req.aspects,
          req.requirement_number,
          req.requirement_name,
          req.mandatory_description,
          req.complementary_description,
          req.mandatory_sentences,
          req.complementary_sentences,
          req.mandatory_keywords,
          req.complementary_keywords,
          req.requirement_condition,
          req.evidence,
          req.periodicity,
          req.requirement_type,
          req.jurisdiction,
          req.state,
          req.municipality
        )
      )
    } catch (error) {
      console.error('Error retrieving requirements by complementary sentences:', error.message)
      throw new ErrorUtils(500, 'Error retrieving requirements by complementary sentences')
    }
  }

  /**
 * Retrieves requirements by a flexible full-text match in their mandatory keywords.
 * @param {string} keyword - The keyword or part of it to search for.
 * @returns {Promise<Array<Requirement>|null>} - A list of Requirement instances matching the keyword.
 * @throws {ErrorUtils} - If an error occurs during retrieval.
 */
  static async findByMandatoryKeywords (keyword) {
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
    LEFT JOIN requirement_subject_aspect rsa ON r.id = rsa.requirement_id
    LEFT JOIN aspects a ON rsa.aspect_id = a.id
    WHERE MATCH(r.mandatory_keywords) AGAINST(? IN BOOLEAN MODE)
  `

    try {
      const [rows] = await pool.query(query, [keyword])
      if (rows.length === 0) return null

      const requirementsMap = new Map()
      rows.forEach((row) => {
        if (!requirementsMap.has(row.id)) {
          requirementsMap.set(row.id, {
            id: row.id,
            requirement_number: row.requirement_number,
            requirement_name: row.requirement_name,
            mandatory_description: row.mandatory_description,
            complementary_description: row.complementary_description,
            mandatory_sentences: row.mandatory_sentences,
            complementary_sentences: row.complementary_sentences,
            mandatory_keywords: row.mandatory_keywords,
            complementary_keywords: row.complementary_keywords,
            requirement_condition: row.requirement_condition,
            evidence: row.evidence,
            periodicity: row.periodicity,
            requirement_type: row.requirement_type,
            jurisdiction: row.jurisdiction,
            state: row.state,
            municipality: row.municipality,
            subject: {
              subject_id: row.subject_id,
              subject_name: row.subject_name
            },
            aspects: []
          })
        }

        if (row.aspect_id !== null) {
          requirementsMap.get(row.id).aspects.push({
            aspect_id: row.aspect_id,
            aspect_name: row.aspect_name
          })
        }
      })

      return Array.from(requirementsMap.values()).map(req =>
        new Requirement(
          req.id,
          req.subject,
          req.aspects,
          req.requirement_number,
          req.requirement_name,
          req.mandatory_description,
          req.complementary_description,
          req.mandatory_sentences,
          req.complementary_sentences,
          req.mandatory_keywords,
          req.complementary_keywords,
          req.requirement_condition,
          req.evidence,
          req.periodicity,
          req.requirement_type,
          req.jurisdiction,
          req.state,
          req.municipality
        )
      )
    } catch (error) {
      console.error('Error retrieving requirements by mandatory keywords:', error.message)
      throw new ErrorUtils(500, 'Error retrieving requirements by mandatory keywords')
    }
  }

  /**
 * Retrieves requirements by a flexible full-text match in their complementary keywords.
 * @param {string} keyword - The keyword or part of it to search for.
 * @returns {Promise<Array<Requirement>|null>} - A list of Requirement instances matching the keyword.
 * @throws {ErrorUtils} - If an error occurs during retrieval.
 */
  static async findByComplementaryKeywords (keyword) {
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
    LEFT JOIN requirement_subject_aspect rsa ON r.id = rsa.requirement_id
    LEFT JOIN aspects a ON rsa.aspect_id = a.id
    WHERE MATCH(r.complementary_keywords) AGAINST(? IN BOOLEAN MODE)
  `

    try {
      const [rows] = await pool.query(query, [keyword])
      if (rows.length === 0) return null

      const requirementsMap = new Map()
      rows.forEach((row) => {
        if (!requirementsMap.has(row.id)) {
          requirementsMap.set(row.id, {
            id: row.id,
            requirement_number: row.requirement_number,
            requirement_name: row.requirement_name,
            mandatory_description: row.mandatory_description,
            complementary_description: row.complementary_description,
            mandatory_sentences: row.mandatory_sentences,
            complementary_sentences: row.complementary_sentences,
            mandatory_keywords: row.mandatory_keywords,
            complementary_keywords: row.complementary_keywords,
            requirement_condition: row.requirement_condition,
            evidence: row.evidence,
            periodicity: row.periodicity,
            requirement_type: row.requirement_type,
            jurisdiction: row.jurisdiction,
            state: row.state,
            municipality: row.municipality,
            subject: {
              subject_id: row.subject_id,
              subject_name: row.subject_name
            },
            aspects: []
          })
        }

        if (row.aspect_id !== null) {
          requirementsMap.get(row.id).aspects.push({
            aspect_id: row.aspect_id,
            aspect_name: row.aspect_name
          })
        }
      })

      return Array.from(requirementsMap.values()).map(req =>
        new Requirement(
          req.id,
          req.subject,
          req.aspects,
          req.requirement_number,
          req.requirement_name,
          req.mandatory_description,
          req.complementary_description,
          req.mandatory_sentences,
          req.complementary_sentences,
          req.mandatory_keywords,
          req.complementary_keywords,
          req.requirement_condition,
          req.evidence,
          req.periodicity,
          req.requirement_type,
          req.jurisdiction,
          req.state,
          req.municipality
        )
      )
    } catch (error) {
      console.error('Error retrieving requirements by complementary keywords:', error.message)
      throw new ErrorUtils(500, 'Error retrieving requirements by complementary keywords')
    }
  }

  /**
 * Retrieves requirements filtered by a specific condition.
 * @param {string} condition - The condition type to filter by.
 * @returns {Promise<Array<Requirement>|null>} - A list of Requirement instances matching the condition.
 * @throws {ErrorUtils} - If an error occurs during retrieval.
 */
  static async findByCondition (condition) {
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
    LEFT JOIN requirement_subject_aspect rsa ON r.id = rsa.requirement_id
    LEFT JOIN aspects a ON rsa.aspect_id = a.id
    WHERE r.requirement_condition = ?
  `

    try {
      const [rows] = await pool.query(query, [condition])
      if (rows.length === 0) return null

      const requirementsMap = new Map()

      rows.forEach((row) => {
        if (!requirementsMap.has(row.id)) {
          requirementsMap.set(row.id, {
            id: row.id,
            requirement_number: row.requirement_number,
            requirement_name: row.requirement_name,
            mandatory_description: row.mandatory_description,
            complementary_description: row.complementary_description,
            mandatory_sentences: row.mandatory_sentences,
            complementary_sentences: row.complementary_sentences,
            mandatory_keywords: row.mandatory_keywords,
            complementary_keywords: row.complementary_keywords,
            requirement_condition: row.requirement_condition,
            evidence: row.evidence,
            periodicity: row.periodicity,
            requirement_type: row.requirement_type,
            jurisdiction: row.jurisdiction,
            state: row.state,
            municipality: row.municipality,
            subject: {
              subject_id: row.subject_id,
              subject_name: row.subject_name
            },
            aspects: []
          })
        }

        if (row.aspect_id !== null) {
          requirementsMap.get(row.id).aspects.push({
            aspect_id: row.aspect_id,
            aspect_name: row.aspect_name
          })
        }
      })

      return Array.from(requirementsMap.values()).map(req =>
        new Requirement(
          req.id,
          req.subject,
          req.aspects,
          req.requirement_number,
          req.requirement_name,
          req.mandatory_description,
          req.complementary_description,
          req.mandatory_sentences,
          req.complementary_sentences,
          req.mandatory_keywords,
          req.complementary_keywords,
          req.requirement_condition,
          req.evidence,
          req.periodicity,
          req.requirement_type,
          req.jurisdiction,
          req.state,
          req.municipality
        )
      )
    } catch (error) {
      console.error('Error retrieving requirements by condition:', error.message)
      throw new ErrorUtils(500, 'Error retrieving requirements by condition')
    }
  }

  /**
 * Retrieves requirements filtered by a specific evidence type.
 * @param {string} evidence - The evidence type to filter by.
 * @returns {Promise<Array<Requirement>|null>} - A list of Requirement instances matching the evidence type.
 * @throws {ErrorUtils} - If an error occurs during retrieval.
 */
  static async findByEvidence (evidence) {
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
    LEFT JOIN requirement_subject_aspect rsa ON r.id = rsa.requirement_id
    LEFT JOIN aspects a ON rsa.aspect_id = a.id
    WHERE r.evidence = ?
  `

    try {
      const [rows] = await pool.query(query, [evidence])
      if (rows.length === 0) return null

      const requirementsMap = new Map()

      rows.forEach((row) => {
        if (!requirementsMap.has(row.id)) {
          requirementsMap.set(row.id, {
            id: row.id,
            requirement_number: row.requirement_number,
            requirement_name: row.requirement_name,
            mandatory_description: row.mandatory_description,
            complementary_description: row.complementary_description,
            mandatory_sentences: row.mandatory_sentences,
            complementary_sentences: row.complementary_sentences,
            mandatory_keywords: row.mandatory_keywords,
            complementary_keywords: row.complementary_keywords,
            requirement_condition: row.requirement_condition,
            evidence: row.evidence,
            periodicity: row.periodicity,
            requirement_type: row.requirement_type,
            jurisdiction: row.jurisdiction,
            state: row.state,
            municipality: row.municipality,
            subject: {
              subject_id: row.subject_id,
              subject_name: row.subject_name
            },
            aspects: []
          })
        }

        if (row.aspect_id !== null) {
          requirementsMap.get(row.id).aspects.push({
            aspect_id: row.aspect_id,
            aspect_name: row.aspect_name
          })
        }
      })

      return Array.from(requirementsMap.values()).map(req =>
        new Requirement(
          req.id,
          req.subject,
          req.aspects,
          req.requirement_number,
          req.requirement_name,
          req.mandatory_description,
          req.complementary_description,
          req.mandatory_sentences,
          req.complementary_sentences,
          req.mandatory_keywords,
          req.complementary_keywords,
          req.requirement_condition,
          req.evidence,
          req.periodicity,
          req.requirement_type,
          req.jurisdiction,
          req.state,
          req.municipality
        )
      )
    } catch (error) {
      console.error('Error retrieving requirements by evidence:', error.message)
      throw new ErrorUtils(500, 'Error retrieving requirements by evidence')
    }
  }

  /**
 * Retrieves requirements filtered by a specific periodicity.
 * @param {string} periodicity - The periodicity to filter by.
 * @returns {Promise<Array<Requirement>|null>} - A list of Requirement instances matching the periodicity.
 * @throws {ErrorUtils} - If an error occurs during retrieval.
 */
  static async findByPeriodicity (periodicity) {
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
    LEFT JOIN requirement_subject_aspect rsa ON r.id = rsa.requirement_id
    LEFT JOIN aspects a ON rsa.aspect_id = a.id
    WHERE r.periodicity = ?
  `

    try {
      const [rows] = await pool.query(query, [periodicity])
      if (rows.length === 0) return null

      const requirementsMap = new Map()

      rows.forEach((row) => {
        if (!requirementsMap.has(row.id)) {
          requirementsMap.set(row.id, {
            id: row.id,
            requirement_number: row.requirement_number,
            requirement_name: row.requirement_name,
            mandatory_description: row.mandatory_description,
            complementary_description: row.complementary_description,
            mandatory_sentences: row.mandatory_sentences,
            complementary_sentences: row.complementary_sentences,
            mandatory_keywords: row.mandatory_keywords,
            complementary_keywords: row.complementary_keywords,
            requirement_condition: row.requirement_condition,
            evidence: row.evidence,
            periodicity: row.periodicity,
            requirement_type: row.requirement_type,
            jurisdiction: row.jurisdiction,
            state: row.state,
            municipality: row.municipality,
            subject: {
              subject_id: row.subject_id,
              subject_name: row.subject_name
            },
            aspects: []
          })
        }

        if (row.aspect_id !== null) {
          requirementsMap.get(row.id).aspects.push({
            aspect_id: row.aspect_id,
            aspect_name: row.aspect_name
          })
        }
      })

      return Array.from(requirementsMap.values()).map(req =>
        new Requirement(
          req.id,
          req.subject,
          req.aspects,
          req.requirement_number,
          req.requirement_name,
          req.mandatory_description,
          req.complementary_description,
          req.mandatory_sentences,
          req.complementary_sentences,
          req.mandatory_keywords,
          req.complementary_keywords,
          req.requirement_condition,
          req.evidence,
          req.periodicity,
          req.requirement_type,
          req.jurisdiction,
          req.state,
          req.municipality
        )
      )
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
    LEFT JOIN requirement_subject_aspect rsa ON r.id = rsa.requirement_id
    LEFT JOIN aspects a ON rsa.aspect_id = a.id
    WHERE r.requirement_type = ?
  `

    try {
      const [rows] = await pool.query(query, [requirementType])
      if (rows.length === 0) return null

      const requirementsMap = new Map()

      rows.forEach((row) => {
        if (!requirementsMap.has(row.id)) {
          requirementsMap.set(row.id, {
            id: row.id,
            requirement_number: row.requirement_number,
            requirement_name: row.requirement_name,
            mandatory_description: row.mandatory_description,
            complementary_description: row.complementary_description,
            mandatory_sentences: row.mandatory_sentences,
            complementary_sentences: row.complementary_sentences,
            mandatory_keywords: row.mandatory_keywords,
            complementary_keywords: row.complementary_keywords,
            requirement_condition: row.requirement_condition,
            evidence: row.evidence,
            periodicity: row.periodicity,
            requirement_type: row.requirement_type,
            jurisdiction: row.jurisdiction,
            state: row.state,
            municipality: row.municipality,
            subject: {
              subject_id: row.subject_id,
              subject_name: row.subject_name
            },
            aspects: []
          })
        }

        if (row.aspect_id !== null) {
          requirementsMap.get(row.id).aspects.push({
            aspect_id: row.aspect_id,
            aspect_name: row.aspect_name
          })
        }
      })

      return Array.from(requirementsMap.values()).map(req =>
        new Requirement(
          req.id,
          req.subject,
          req.aspects,
          req.requirement_number,
          req.requirement_name,
          req.mandatory_description,
          req.complementary_description,
          req.mandatory_sentences,
          req.complementary_sentences,
          req.mandatory_keywords,
          req.complementary_keywords,
          req.requirement_condition,
          req.evidence,
          req.periodicity,
          req.requirement_type,
          req.jurisdiction,
          req.state,
          req.municipality
        )
      )
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
    LEFT JOIN requirement_subject_aspect rsa ON r.id = rsa.requirement_id
    LEFT JOIN aspects a ON rsa.aspect_id = a.id
    WHERE r.jurisdiction = ?
  `

    try {
      const [rows] = await pool.query(query, [jurisdiction])
      if (rows.length === 0) return null

      const requirementsMap = new Map()

      rows.forEach((row) => {
        if (!requirementsMap.has(row.id)) {
          requirementsMap.set(row.id, {
            id: row.id,
            requirement_number: row.requirement_number,
            requirement_name: row.requirement_name,
            mandatory_description: row.mandatory_description,
            complementary_description: row.complementary_description,
            mandatory_sentences: row.mandatory_sentences,
            complementary_sentences: row.complementary_sentences,
            mandatory_keywords: row.mandatory_keywords,
            complementary_keywords: row.complementary_keywords,
            requirement_condition: row.requirement_condition,
            evidence: row.evidence,
            periodicity: row.periodicity,
            requirement_type: row.requirement_type,
            jurisdiction: row.jurisdiction,
            state: row.state,
            municipality: row.municipality,
            subject: {
              subject_id: row.subject_id,
              subject_name: row.subject_name
            },
            aspects: []
          })
        }

        if (row.aspect_id !== null) {
          requirementsMap.get(row.id).aspects.push({
            aspect_id: row.aspect_id,
            aspect_name: row.aspect_name
          })
        }
      })

      return Array.from(requirementsMap.values()).map(req =>
        new Requirement(
          req.id,
          req.subject,
          req.aspects,
          req.requirement_number,
          req.requirement_name,
          req.mandatory_description,
          req.complementary_description,
          req.mandatory_sentences,
          req.complementary_sentences,
          req.mandatory_keywords,
          req.complementary_keywords,
          req.requirement_condition,
          req.evidence,
          req.periodicity,
          req.requirement_type,
          req.jurisdiction,
          req.state,
          req.municipality
        )
      )
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
    LEFT JOIN requirement_subject_aspect rsa ON r.id = rsa.requirement_id
    LEFT JOIN aspects a ON rsa.aspect_id = a.id
    WHERE r.state = ?
  `

    try {
      const [rows] = await pool.query(query, [state])
      if (rows.length === 0) return null

      const requirementsMap = new Map()
      rows.forEach((row) => {
        if (!requirementsMap.has(row.id)) {
          requirementsMap.set(row.id, {
            id: row.id,
            requirement_number: row.requirement_number,
            requirement_name: row.requirement_name,
            mandatory_description: row.mandatory_description,
            complementary_description: row.complementary_description,
            mandatory_sentences: row.mandatory_sentences,
            complementary_sentences: row.complementary_sentences,
            mandatory_keywords: row.mandatory_keywords,
            complementary_keywords: row.complementary_keywords,
            requirement_condition: row.requirement_condition,
            evidence: row.evidence,
            periodicity: row.periodicity,
            requirement_type: row.requirement_type,
            jurisdiction: row.jurisdiction,
            state: row.state,
            municipality: row.municipality,
            subject: {
              subject_id: row.subject_id,
              subject_name: row.subject_name
            },
            aspects: []
          })
        }

        if (row.aspect_id !== null) {
          requirementsMap.get(row.id).aspects.push({
            aspect_id: row.aspect_id,
            aspect_name: row.aspect_name
          })
        }
      })

      return Array.from(requirementsMap.values()).map(req =>
        new Requirement(
          req.id,
          req.subject,
          req.aspects,
          req.requirement_number,
          req.requirement_name,
          req.mandatory_description,
          req.complementary_description,
          req.mandatory_sentences,
          req.complementary_sentences,
          req.mandatory_keywords,
          req.complementary_keywords,
          req.requirement_condition,
          req.evidence,
          req.periodicity,
          req.requirement_type,
          req.jurisdiction,
          req.state,
          req.municipality
        )
      )
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
    LEFT JOIN requirement_subject_aspect rsa ON r.id = rsa.requirement_id
    LEFT JOIN aspects a ON rsa.aspect_id = a.id
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

      const requirementsMap = new Map()
      rows.forEach((row) => {
        if (!requirementsMap.has(row.id)) {
          requirementsMap.set(row.id, {
            id: row.id,
            requirement_number: row.requirement_number,
            requirement_name: row.requirement_name,
            mandatory_description: row.mandatory_description,
            complementary_description: row.complementary_description,
            mandatory_sentences: row.mandatory_sentences,
            complementary_sentences: row.complementary_sentences,
            mandatory_keywords: row.mandatory_keywords,
            complementary_keywords: row.complementary_keywords,
            requirement_condition: row.requirement_condition,
            evidence: row.evidence,
            periodicity: row.periodicity,
            requirement_type: row.requirement_type,
            jurisdiction: row.jurisdiction,
            state: row.state,
            municipality: row.municipality,
            subject: {
              subject_id: row.subject_id,
              subject_name: row.subject_name
            },
            aspects: []
          })
        }

        if (row.aspect_id !== null) {
          requirementsMap.get(row.id).aspects.push({
            aspect_id: row.aspect_id,
            aspect_name: row.aspect_name
          })
        }
      })

      return Array.from(requirementsMap.values()).map(req =>
        new Requirement(
          req.id,
          req.subject,
          req.aspects,
          req.requirement_number,
          req.requirement_name,
          req.mandatory_description,
          req.complementary_description,
          req.mandatory_sentences,
          req.complementary_sentences,
          req.mandatory_keywords,
          req.complementary_keywords,
          req.requirement_condition,
          req.evidence,
          req.periodicity,
          req.requirement_type,
          req.jurisdiction,
          req.state,
          req.municipality
        )
      )
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
 * Updates a requirement by its ID using IFNULL to preserve existing values
 * and updates the associated aspects via the requirement_subject_aspect table.
 * @param {number} requirementId - The ID of the requirement to update.
 * @param {Object} requirement - The updated data for the requirement.
 * @param {number} [requirement.subjectId] - The updated subject ID (optional).
 * @param {Array<number>} [requirement.aspectsIds] - The updated aspect IDs to associate (optional).
 * @param {string} [requirement.requirementNumber]
 * @param {string} [requirement.requirementName]
 * @param {string} [requirement.mandatoryDescription]
 * @param {string} [requirement.complementaryDescription]
 * @param {string} [requirement.mandatorySentences]
 * @param {string} [requirement.complementarySentences]
 * @param {string} [requirement.mandatoryKeywords]
 * @param {string} [requirement.complementaryKeywords]
 * @param {string} [requirement.condition]
 * @param {string} [requirement.evidence]
 * @param {string} [requirement.periodicity]
 * @param {string} [requirement.requirementType]
 * @param {string} [requirement.jurisdiction]
 * @param {string} [requirement.state]
 * @param {string} [requirement.municipality]
 * @returns {Promise<Requirement|null>} - The updated Requirement instance or null.
 * @throws {ErrorUtils} - If an error occurs during update.
 */
  static async update (requirementId, requirement) {
    const {
      subjectId,
      aspectsIds,
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

    const checkAspectsQuery = `
    SELECT COUNT(*) AS aspectCount
    FROM requirement_subject_aspect
    WHERE requirement_id = ?
  `

    const deleteAspectsQuery = `
    DELETE FROM requirement_subject_aspect
    WHERE requirement_id = ?
  `

    const insertAspectsQuery = (aspectIds) => `
    INSERT INTO requirement_subject_aspect (requirement_id, subject_id, aspect_id)
    VALUES ${aspectIds.map(() => '(?, ?, ?)').join(', ')}
  `

    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()
      const [updateResult] = await connection.query(updateRequirementQuery, [
        subjectId,
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

      if (updateResult.affectedRows === 0) {
        await connection.rollback()
        return null
      }

      if (aspectsIds && aspectsIds.length > 0) {
        const [checkResult] = await connection.query(checkAspectsQuery, [requirementId])
        const { aspectCount } = checkResult[0]

        if (aspectCount > 0) {
          await connection.query(deleteAspectsQuery, [requirementId])
        }

        const values = aspectsIds.flatMap((aspectId) => [
          requirementId,
          subjectId || null,
          aspectId
        ])

        const [insertResult] = await connection.query(
          insertAspectsQuery(aspectsIds),
          values
        )

        if (insertResult.affectedRows !== aspectsIds.length) {
          await connection.rollback()
          throw new ErrorUtils(500, 'Failed to insert aspects')
        }
      }

      await connection.commit()
      const updatedRequirement = await this.findById(requirementId)
      return updatedRequirement
    } catch (error) {
      await connection.rollback()
      console.error('Error updating requirement:', error.message)
      throw new ErrorUtils(500, 'Error updating requirement in the database')
    } finally {
      connection.release()
    }
  }

  /**
 * Deletes a requirement by its ID, including related aspects in the intermediate table.
 * @param {number} requirementId - The ID of the requirement to delete.
 * @returns {Promise<boolean>} - Returns true if the deletion is successful, false otherwise.
 * @throws {ErrorUtils} - If an error occurs during deletion.
 */
  static async delete (requirementId) {
    const checkAspectsQuery = `
    SELECT COUNT(*) AS aspectCount
    FROM requirement_subject_aspect
    WHERE requirement_id = ?
  `

    const deleteAspectsQuery = `
    DELETE FROM requirement_subject_aspect
    WHERE requirement_id = ?
  `

    const deleteRequirementQuery = `
    DELETE FROM requirements
    WHERE id = ?
  `

    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()
      const [aspectCheckResult] = await connection.query(checkAspectsQuery, [
        requirementId
      ])
      const { aspectCount } = aspectCheckResult[0]
      if (aspectCount > 0) {
        const [deletedAspects] = await connection.query(deleteAspectsQuery, [
          requirementId
        ])
        if (deletedAspects.affectedRows === 0) {
          await connection.rollback()
          throw new ErrorUtils(500, 'Failed to delete associated aspects.')
        }
      }
      const [deletedRequirement] = await connection.query(deleteRequirementQuery, [
        requirementId
      ])
      if (deletedRequirement.affectedRows === 0) {
        await connection.rollback()
        return false
      }
      await connection.commit()
      return true
    } catch (error) {
      await connection.rollback()
      console.error('Error deleting requirement:', error.message)
      throw new ErrorUtils(500, 'Error deleting requirement from the database')
    } finally {
      connection.release()
    }
  }

  /**
 * Deletes multiple requirements by their IDs, including associated aspects from the intermediate table.
 * @param {number[]} requirementIds - An array of requirement IDs to delete.
 * @returns {Promise<boolean>} - Returns true if all deletions are successful, false otherwise.
 * @throws {ErrorUtils} - If an error occurs during deletion.
 */
  static async deleteBatch (requirementIds) {
    const checkAspectsQuery = `
    SELECT requirement_id, COUNT(*) AS aspectCount
    FROM requirement_subject_aspect
    WHERE requirement_id IN (?)
    GROUP BY requirement_id
  `
    const deleteAspectsQuery = `
    DELETE FROM requirement_subject_aspect
    WHERE requirement_id IN (?)
  `
    const deleteRequirementsQuery = `
    DELETE FROM requirements
    WHERE id IN (?)
  `
    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()
      const [aspectCheckResults] = await connection.query(checkAspectsQuery, [requirementIds])
      const requirementIdsWithAspects = aspectCheckResults.map((row) => row.requirement_id)
      if (requirementIdsWithAspects.length > 0) {
        const [deletedAspectsResult] = await connection.query(deleteAspectsQuery, [requirementIdsWithAspects])
        if (deletedAspectsResult.affectedRows < requirementIdsWithAspects.length) {
          await connection.rollback()
          throw new ErrorUtils(500, 'Failed to delete aspects for some requirement IDs')
        }
      }
      const [deletedRequirementsResult] = await connection.query(deleteRequirementsQuery, [requirementIds])
      if (deletedRequirementsResult.affectedRows !== requirementIds.length) {
        await connection.rollback()
        return false
      }
      await connection.commit()
      return true
    } catch (error) {
      await connection.rollback()
      console.error('Error deleting requirements in batch:', error.message)
      throw new ErrorUtils(500, 'Error deleting requirement records in batch')
    } finally {
      connection.release()
    }
  }

  /**
 * Deletes all requirements and their relationships from the database.
 * @returns {Promise<void>}
 * @throws {ErrorUtils} - If an error occurs during deletion.
 */
  static async deleteAll () {
    const deleteAspectsQuery = `
    DELETE FROM requirement_subject_aspect
  `
    const deleteRequirementsQuery = `
    DELETE FROM requirements
  `

    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()
      await connection.query(deleteAspectsQuery)
      await connection.query(deleteRequirementsQuery)
      await connection.commit()
    } catch (error) {
      await connection.rollback()
      console.error('Error deleting all requirements:', error.message)
      throw new ErrorUtils(500, 'Error deleting all requirements from the database')
    } finally {
      connection.release()
    }
  }
}

export default RequirementRepository
