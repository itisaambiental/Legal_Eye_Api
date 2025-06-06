import { pool } from '../config/db.config.js'
import HttpException from '../services/errors/HttpException.js'
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
   * @param {number} requirement.requirementNumber - The requirement number (integer).
   * @param {string} requirement.requirementName - The name of the requirement.
   * @param {string} requirement.mandatoryDescription - The mandatory description.
   * @param {string} requirement.complementaryDescription - The complementary description.
   * @param {string} requirement.mandatorySentences - The mandatory legal sentences.
   * @param {string} requirement.complementarySentences - The complementary legal sentences.
   * @param {string} requirement.mandatoryKeywords - Keywords for mandatory aspect.
   * @param {string} requirement.complementaryKeywords - Keywords for complementary aspect.
   * @param {string} requirement.condition - The condition type.
   * @param {string} requirement.evidence - The type of evidence.
   * @param {string} requirement.specifyEvidence - The description of specific evidence.
   * @param {string} requirement.periodicity - The periodicity of the requirement.
   * @param {string} requirement.acceptanceCriteria - The acceptance criteria for the requirement.
   * @returns {Promise<Requirement>}
   * @throws {HttpException}
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
      specifyEvidence,
      periodicity,
      acceptanceCriteria
    } = requirement

    const insertRequirementQuery = `
INSERT INTO requirements (
  subject_id,
  requirement_number,
  requirement_name,
  mandatory_description,
  complementary_description,
  mandatory_sentences,
  complementary_sentences,
  mandatory_keywords,
  complementary_keywords,
  requirement_condition,
  evidence,
  specify_evidence,
  periodicity,
  acceptance_criteria
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        specifyEvidence,
        periodicity,
        acceptanceCriteria
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
      throw new HttpException(
        500,
        'Error creating requirement in the database'
      )
    }
  }

  /**
   * Retrieves all requirements from the database along with their subjects and associated aspects.
   * @returns {Promise<Array<Requirement|null>>} - A list of all requirements.
   * @throws {HttpException} - If an error occurs during retrieval.
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
      r.specify_evidence,
      r.periodicity,
      r.acceptance_criteria,
      s.id AS subject_id,
      s.subject_name AS subject_name,
      a.id AS aspect_id,
      a.aspect_name AS aspect_name
    FROM requirements r
    JOIN subjects s ON r.subject_id = s.id
    LEFT JOIN requirement_subject_aspect rsa ON r.id = rsa.requirement_id
    LEFT JOIN aspects a ON rsa.aspect_id = a.id
    ORDER BY r.requirement_number
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
            specify_evidence: row.specify_evidence,
            periodicity: row.periodicity,
            acceptance_criteria: row.acceptance_criteria,
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
          req.specify_evidence,
          req.periodicity,
          req.acceptance_criteria
        )
      })
    } catch (error) {
      console.error('Error retrieving all requirements:', error.message)
      throw new HttpException(
        500,
        'Error retrieving all requirements from the database'
      )
    }
  }

  /**
   * Checks if a requirement exists with the given name.
   * @param {string} requirementName - The requirement name to check for existence.
   * @returns {Promise<boolean>} - True if a requirement with the same name exists, false otherwise.
   * @throws {HttpException} - If an error occurs during the check.
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
      throw new HttpException(500, 'Error checking if requirement exists')
    }
  }

  /**
   * Retrieves a requirement record by its ID, including its subject and all associated aspects.
   * @param {number} requirementId - The ID of the requirement to retrieve.
   * @returns {Promise<Requirement|null>} - The requirement record or null if not found.
   * @throws {HttpException} - If an error occurs during retrieval.
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
      r.specify_evidence,
      r.periodicity,
      r.acceptance_criteria,
      s.id    AS subject_id,
      s.subject_name AS subject_name,
      a.id    AS aspect_id,
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

      const row = rows[0]
      const subject = {
        subject_id: row.subject_id,
        subject_name: row.subject_name
      }
      const aspects = rows
        .map((r) => ({ aspect_id: r.aspect_id, aspect_name: r.aspect_name }))
        .filter((a) => a.aspect_id !== null)

      return new Requirement(
        row.id,
        subject,
        aspects,
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
        row.specify_evidence,
        row.periodicity,
        row.acceptance_criteria
      )
    } catch (error) {
      console.error('Error retrieving requirement by ID:', error.message)
      throw new HttpException(500, 'Error retrieving requirement by ID')
    }
  }

  /**
   * Finds multiple requirements by their IDs.
   * @param {Array<number>} requirementIds - Array of requirement IDs to find.
   * @returns {Promise<Requirement[]>} - Array of found requirement objects.
   * @throws {HttpException} - If an error occurs during retrieval.
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
      r.specify_evidence,
      r.periodicity,
      r.acceptance_criteria,
      s.id   AS subject_id,
      s.subject_name AS subject_name,
      a.id   AS aspect_id,
      a.aspect_name AS aspect_name
    FROM requirements r
    JOIN subjects s ON r.subject_id = s.id
    LEFT JOIN requirement_subject_aspect rsa ON r.id = rsa.requirement_id
    LEFT JOIN aspects a ON rsa.aspect_id = a.id
    WHERE r.id IN (?)
    ORDER BY r.requirement_number
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
            specify_evidence: row.specify_evidence,
            periodicity: row.periodicity,
            acceptance_criteria: row.acceptance_criteria,
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

      return Array.from(requirementsMap.values()).map(
        (req) =>
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
            req.specify_evidence,
            req.periodicity,
            req.acceptance_criteria
          )
      )
    } catch (error) {
      console.error('Error finding requirements by IDs:', error.message)
      throw new HttpException(
        500,
        'Error retrieving requirements by IDs from the database'
      )
    }
  }

  /**
   * Retrieves all requirements that match the given requirement number,
   * including their subjects and associated aspects.
   * @param {number} requirementNumber - The number of the requirement to retrieve.
   * @returns {Promise<Array<Requirement>|null>} - A list of matching requirements or null if none.
   * @throws {HttpException} - If an error occurs during retrieval.
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
      r.specify_evidence,
      r.periodicity,
      r.acceptance_criteria,
      s.id AS subject_id,
      s.subject_name AS subject_name,
      a.id AS aspect_id,
      a.aspect_name AS aspect_name
    FROM requirements r
    JOIN subjects s ON r.subject_id = s.id
    LEFT JOIN requirement_subject_aspect rsa ON r.id = rsa.requirement_id
    LEFT JOIN aspects a ON rsa.aspect_id = a.id
    WHERE r.requirement_number = ?
    ORDER BY r.requirement_number
  `

    try {
      const [rows] = await pool.query(query, [requirementNumber])
      if (rows.length === 0) return null

      const map = new Map()
      rows.forEach((row) => {
        if (!map.has(row.id)) {
          map.set(row.id, {
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
            specify_evidence: row.specify_evidence,
            periodicity: row.periodicity,
            acceptance_criteria: row.acceptance_criteria,
            subject: {
              subject_id: row.subject_id,
              subject_name: row.subject_name
            },
            aspects: []
          })
        }
        if (row.aspect_id !== null) {
          map.get(row.id).aspects.push({
            aspect_id: row.aspect_id,
            aspect_name: row.aspect_name
          })
        }
      })

      return Array.from(map.values()).map(
        (req) =>
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
            req.specify_evidence,
            req.periodicity,
            req.acceptance_criteria
          )
      )
    } catch (error) {
      console.error('Error retrieving requirements by number:', error.message)
      throw new HttpException(500, 'Error retrieving requirements by number')
    }
  }

  /**
   * Retrieves all requirements that match the given name, including their subjects and associated aspects.
   * @param {string} requirementName - The name or part of the name of the requirement to retrieve.
   * @returns {Promise<Array<Requirement>|null>} - A list of requirements matching the name, or null if none.
   * @throws {HttpException} - If an error occurs during retrieval.
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
      r.specify_evidence,
      r.periodicity,
      r.acceptance_criteria,
      s.id   AS subject_id,
      s.subject_name AS subject_name,
      a.id   AS aspect_id,
      a.aspect_name AS aspect_name
    FROM requirements r
    JOIN subjects s ON r.subject_id = s.id
    LEFT JOIN requirement_subject_aspect rsa ON r.id = rsa.requirement_id
    LEFT JOIN aspects a ON rsa.aspect_id = a.id
    WHERE r.requirement_name LIKE ?
    ORDER BY r.requirement_number
  `

    try {
      const [rows] = await pool.query(query, [`%${requirementName}%`])
      if (rows.length === 0) return null

      const map = new Map()
      for (const row of rows) {
        if (!map.has(row.id)) {
          map.set(row.id, {
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
            specify_evidence: row.specify_evidence,
            periodicity: row.periodicity,
            acceptance_criteria: row.acceptance_criteria,
            subject: {
              subject_id: row.subject_id,
              subject_name: row.subject_name
            },
            aspects: []
          })
        }
        if (row.aspect_id !== null) {
          map.get(row.id).aspects.push({
            aspect_id: row.aspect_id,
            aspect_name: row.aspect_name
          })
        }
      }

      return Array.from(map.values()).map(
        (req) =>
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
            req.specify_evidence,
            req.periodicity,
            req.acceptance_criteria
          )
      )
    } catch (error) {
      console.error('Error retrieving requirements by name:', error.message)
      throw new HttpException(500, 'Error retrieving requirements by name')
    }
  }

  /**
   * Retrieves all requirements filtered by a specific subject, including their aspects.
   * @param {number} subjectId - The subject ID to filter by.
   * @returns {Promise<Array<Requirement>|null>} - A list of requirements filtered by the subject, or null if no records are found.
   * @throws {HttpException} - If an error occurs during retrieval.
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
      r.specify_evidence,
      r.periodicity,
      r.acceptance_criteria,
      s.id   AS subject_id,
      s.subject_name AS subject_name,
      a.id   AS aspect_id,
      a.aspect_name AS aspect_name
    FROM requirements r
    JOIN subjects s ON r.subject_id = s.id
    LEFT JOIN requirement_subject_aspect rsa ON r.id = rsa.requirement_id
    LEFT JOIN aspects a ON rsa.aspect_id = a.id
    WHERE r.subject_id = ?
    ORDER BY r.requirement_number
  `

    try {
      const [rows] = await pool.query(query, [subjectId])
      if (rows.length === 0) return null

      const map = new Map()
      for (const row of rows) {
        if (!map.has(row.id)) {
          map.set(row.id, {
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
            specify_evidence: row.specify_evidence,
            periodicity: row.periodicity,
            acceptance_criteria: row.acceptance_criteria,
            subject: {
              subject_id: row.subject_id,
              subject_name: row.subject_name
            },
            aspects: []
          })
        }
        if (row.aspect_id !== null) {
          map.get(row.id).aspects.push({
            aspect_id: row.aspect_id,
            aspect_name: row.aspect_name
          })
        }
      }

      return Array.from(map.values()).map(
        (req) =>
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
            req.specify_evidence,
            req.periodicity,
            req.acceptance_criteria
          )
      )
    } catch (error) {
      console.error('Error retrieving requirements by subject:', error.message)
      throw new HttpException(500, 'Error retrieving requirements by subject')
    }
  }

  /**
   * Retrieves all requirements filtered by subject and optionally by aspects.
   * Includes associated subject and all aspects.
   * @param {number} subjectId - The subject ID to filter by.
   * @param {Array<number>} [aspectIds] - Optional array of aspect IDs to further filter by.
   * @returns {Promise<Array<Requirement>|null>} - A list of requirements matching the filters, or null if none found.
   * @throws {HttpException} - If an error occurs during retrieval.
   */
  static async findBySubjectAndAspects (subjectId, aspectIds = []) {
    try {
      const values = [subjectId]
      let requirementIds = []

      if (aspectIds.length > 0) {
        const placeholders = aspectIds.map(() => '?').join(', ')
        const filterQuery = `
        SELECT DISTINCT r.id
        FROM requirements r
        JOIN requirement_subject_aspect rsa ON r.id = rsa.requirement_id
        WHERE r.subject_id = ?
          AND rsa.aspect_id IN (${placeholders})
      `
        const [filterRows] = await pool.query(filterQuery, [
          subjectId,
          ...aspectIds
        ])
        if (filterRows.length === 0) return null
        requirementIds = filterRows.map((row) => row.id)
      }

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
        r.specify_evidence,
        r.periodicity,
        r.acceptance_criteria,
        s.id   AS subject_id,
        s.subject_name AS subject_name,
        a.id   AS aspect_id,
        a.aspect_name AS aspect_name
      FROM requirements r
      JOIN subjects s ON r.subject_id = s.id
      LEFT JOIN requirement_subject_aspect rsa ON r.id = rsa.requirement_id
      LEFT JOIN aspects a ON rsa.aspect_id = a.id
      WHERE r.subject_id = ?
    `

      if (requirementIds.length > 0) {
        const placeholders = requirementIds.map(() => '?').join(', ')
        query += ` AND r.id IN (${placeholders})`
        values.push(...requirementIds)
      }
      query += 'ORDER BY r.requirement_number'

      const [rows] = await pool.query(query, values)
      if (rows.length === 0) return null

      const map = new Map()
      for (const row of rows) {
        if (!map.has(row.id)) {
          map.set(row.id, {
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
            specify_evidence: row.specify_evidence,
            periodicity: row.periodicity,
            acceptance_criteria: row.acceptance_criteria,
            subject: {
              subject_id: row.subject_id,
              subject_name: row.subject_name
            },
            aspects: []
          })
        }
        if (row.aspect_id !== null) {
          map.get(row.id).aspects.push({
            aspect_id: row.aspect_id,
            aspect_name: row.aspect_name
          })
        }
      }

      return Array.from(map.values()).map(
        (req) =>
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
            req.specify_evidence,
            req.periodicity,
            req.acceptance_criteria
          )
      )
    } catch (error) {
      console.error(
        'Error retrieving requirements by subject and aspects:',
        error.message
      )
      throw new HttpException(
        500,
        'Error retrieving requirements by subject and aspects'
      )
    }
  }

  /**
   * Retrieves requirements by a flexible full-text match in their mandatory description.
   * @param {string} description - The description or part of the description to search for.
   * @returns {Promise<Array<Requirement>|null>} - A list of Requirement instances matching the description.
   * @throws {HttpException} - If an error occurs during retrieval.
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
      r.specify_evidence,
      r.periodicity,
      r.acceptance_criteria,
      s.id   AS subject_id,
      s.subject_name AS subject_name,
      a.id   AS aspect_id,
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

      const map = new Map()
      for (const row of rows) {
        if (!map.has(row.id)) {
          map.set(row.id, {
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
            specify_evidence: row.specify_evidence,
            periodicity: row.periodicity,
            acceptance_criteria: row.acceptance_criteria,
            subject: {
              subject_id: row.subject_id,
              subject_name: row.subject_name
            },
            aspects: []
          })
        }
        if (row.aspect_id !== null) {
          map.get(row.id).aspects.push({
            aspect_id: row.aspect_id,
            aspect_name: row.aspect_name
          })
        }
      }

      return Array.from(map.values()).map(
        (req) =>
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
            req.specify_evidence,
            req.periodicity,
            req.acceptance_criteria
          )
      )
    } catch (error) {
      console.error(
        'Error retrieving requirements by mandatory description:',
        error.message
      )
      throw new HttpException(
        500,
        'Error retrieving requirements by mandatory description'
      )
    }
  }

  /**
   * Retrieves requirements by a flexible full-text match in their complementary description.
   * @param {string} description - The description or part of the description to search for.
   * @returns {Promise<Array<Requirement>|null>} - A list of Requirement instances matching the description.
   * @throws {HttpException} - If an error occurs during retrieval.
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
      r.specify_evidence,
      r.periodicity,
      r.acceptance_criteria,
      s.id   AS subject_id,
      s.subject_name AS subject_name,
      a.id   AS aspect_id,
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

      const map = new Map()
      for (const row of rows) {
        if (!map.has(row.id)) {
          map.set(row.id, {
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
            specify_evidence: row.specify_evidence,
            periodicity: row.periodicity,
            acceptance_criteria: row.acceptance_criteria,
            subject: {
              subject_id: row.subject_id,
              subject_name: row.subject_name
            },
            aspects: []
          })
        }
        if (row.aspect_id !== null) {
          map.get(row.id).aspects.push({
            aspect_id: row.aspect_id,
            aspect_name: row.aspect_name
          })
        }
      }

      return Array.from(map.values()).map(
        (req) =>
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
            req.specify_evidence,
            req.periodicity,
            req.acceptance_criteria
          )
      )
    } catch (error) {
      console.error(
        'Error retrieving requirements by complementary description:',
        error.message
      )
      throw new HttpException(
        500,
        'Error retrieving requirements by complementary description'
      )
    }
  }

  /**
   * Retrieves requirements by a flexible full-text match in their mandatory sentences.
   * @param {string} sentence - The sentence or part of the sentence to search for.
   * @returns {Promise<Array<Requirement>|null>} - A list of Requirement instances matching the sentence.
   * @throws {HttpException} - If an error occurs during retrieval.
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
      r.specify_evidence,
      r.periodicity,
      r.acceptance_criteria,
      s.id   AS subject_id,
      s.subject_name AS subject_name,
      a.id   AS aspect_id,
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

      const map = new Map()
      for (const row of rows) {
        if (!map.has(row.id)) {
          map.set(row.id, {
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
            specify_evidence: row.specify_evidence,
            periodicity: row.periodicity,
            acceptance_criteria: row.acceptance_criteria,
            subject: {
              subject_id: row.subject_id,
              subject_name: row.subject_name
            },
            aspects: []
          })
        }
        if (row.aspect_id !== null) {
          map.get(row.id).aspects.push({
            aspect_id: row.aspect_id,
            aspect_name: row.aspect_name
          })
        }
      }

      return Array.from(map.values()).map(
        (req) =>
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
            req.specify_evidence,
            req.periodicity,
            req.acceptance_criteria
          )
      )
    } catch (error) {
      console.error(
        'Error retrieving requirements by mandatory sentences:',
        error.message
      )
      throw new HttpException(
        500,
        'Error retrieving requirements by mandatory sentences'
      )
    }
  }

  /**
   * Retrieves requirements by a flexible full-text match in their complementary sentences.
   * @param {string} sentence - The sentence or part of the sentence to search for.
   * @returns {Promise<Array<Requirement>|null>} - A list of Requirement instances matching the sentence.
   * @throws {HttpException} - If an error occurs during retrieval.
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
      r.specify_evidence,
      r.periodicity,
      r.acceptance_criteria,
      s.id   AS subject_id,
      s.subject_name AS subject_name,
      a.id   AS aspect_id,
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

      const map = new Map()
      for (const row of rows) {
        if (!map.has(row.id)) {
          map.set(row.id, {
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
            specify_evidence: row.specify_evidence,
            periodicity: row.periodicity,
            acceptance_criteria: row.acceptance_criteria,
            subject: {
              subject_id: row.subject_id,
              subject_name: row.subject_name
            },
            aspects: []
          })
        }
        if (row.aspect_id !== null) {
          map.get(row.id).aspects.push({
            aspect_id: row.aspect_id,
            aspect_name: row.aspect_name
          })
        }
      }

      return Array.from(map.values()).map(
        (req) =>
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
            req.specify_evidence,
            req.periodicity,
            req.acceptance_criteria
          )
      )
    } catch (error) {
      console.error(
        'Error retrieving requirements by complementary sentences:',
        error.message
      )
      throw new HttpException(
        500,
        'Error retrieving requirements by complementary sentences'
      )
    }
  }

  /**
   * Retrieves requirements by a flexible full-text match in their mandatory keywords.
   * @param {string} keyword - The keyword or part of it to search for.
   * @returns {Promise<Array<Requirement>|null>} - A list of Requirement instances matching the keyword.
   * @throws {HttpException} - If an error occurs during retrieval.
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
      r.specify_evidence,
      r.periodicity,
      r.acceptance_criteria,
      s.id   AS subject_id,
      s.subject_name AS subject_name,
      a.id   AS aspect_id,
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

      const map = new Map()
      for (const row of rows) {
        if (!map.has(row.id)) {
          map.set(row.id, {
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
            specify_evidence: row.specify_evidence,
            periodicity: row.periodicity,
            acceptance_criteria: row.acceptance_criteria,
            subject: {
              subject_id: row.subject_id,
              subject_name: row.subject_name
            },
            aspects: []
          })
        }
        if (row.aspect_id !== null) {
          map.get(row.id).aspects.push({
            aspect_id: row.aspect_id,
            aspect_name: row.aspect_name
          })
        }
      }

      return Array.from(map.values()).map(
        (req) =>
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
            req.specify_evidence,
            req.periodicity,
            req.acceptance_criteria
          )
      )
    } catch (error) {
      console.error(
        'Error retrieving requirements by mandatory keywords:',
        error.message
      )
      throw new HttpException(
        500,
        'Error retrieving requirements by mandatory keywords'
      )
    }
  }

  /**
   * Retrieves requirements by a flexible full-text match in their complementary keywords.
   * @param {string} keyword - The keyword or part of it to search for.
   * @returns {Promise<Array<Requirement>|null>} - A list of Requirement instances matching the keyword.
   * @throws {HttpException} - If an error occurs during retrieval.
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
      r.specify_evidence,
      r.periodicity,
      r.acceptance_criteria,
      s.id   AS subject_id,
      s.subject_name AS subject_name,
      a.id   AS aspect_id,
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

      const map = new Map()
      for (const row of rows) {
        if (!map.has(row.id)) {
          map.set(row.id, {
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
            specify_evidence: row.specify_evidence,
            periodicity: row.periodicity,
            acceptance_criteria: row.acceptance_criteria,
            subject: {
              subject_id: row.subject_id,
              subject_name: row.subject_name
            },
            aspects: []
          })
        }
        if (row.aspect_id !== null) {
          map.get(row.id).aspects.push({
            aspect_id: row.aspect_id,
            aspect_name: row.aspect_name
          })
        }
      }

      return Array.from(map.values()).map(
        (req) =>
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
            req.specify_evidence,
            req.periodicity,
            req.acceptance_criteria
          )
      )
    } catch (error) {
      console.error(
        'Error retrieving requirements by complementary keywords:',
        error.message
      )
      throw new HttpException(
        500,
        'Error retrieving requirements by complementary keywords'
      )
    }
  }

  /**
   * Retrieves requirements filtered by a specific condition.
   * @param {string} condition - The condition type to filter by.
   * @returns {Promise<Array<Requirement>|null>} - A list of Requirement instances matching the condition.
   * @throws {HttpException} - If an error occurs during retrieval.
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
      r.specify_evidence,
      r.periodicity,
      r.acceptance_criteria,
      s.id   AS subject_id,
      s.subject_name AS subject_name,
      a.id   AS aspect_id,
      a.aspect_name AS aspect_name
    FROM requirements r
    JOIN subjects s ON r.subject_id = s.id
    LEFT JOIN requirement_subject_aspect rsa ON r.id = rsa.requirement_id
    LEFT JOIN aspects a ON rsa.aspect_id = a.id
    WHERE r.requirement_condition = ?
    ORDER BY r.requirement_number
  `

    try {
      const [rows] = await pool.query(query, [condition])
      if (rows.length === 0) return null

      const map = new Map()
      for (const row of rows) {
        if (!map.has(row.id)) {
          map.set(row.id, {
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
            specify_evidence: row.specify_evidence,
            periodicity: row.periodicity,
            acceptance_criteria: row.acceptance_criteria,
            subject: {
              subject_id: row.subject_id,
              subject_name: row.subject_name
            },
            aspects: []
          })
        }
        if (row.aspect_id !== null) {
          map.get(row.id).aspects.push({
            aspect_id: row.aspect_id,
            aspect_name: row.aspect_name
          })
        }
      }

      return Array.from(map.values()).map(
        (req) =>
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
            req.specify_evidence,
            req.periodicity,
            req.acceptance_criteria
          )
      )
    } catch (error) {
      console.error(
        'Error retrieving requirements by condition:',
        error.message
      )
      throw new HttpException(
        500,
        'Error retrieving requirements by condition'
      )
    }
  }

  /**
   * Retrieves requirements filtered by a specific evidence type.
   * @param {string} evidence - The evidence type to filter by.
   * @returns {Promise<Array<Requirement>|null>} - A list of Requirement instances matching the evidence type.
   * @throws {HttpException} - If an error occurs during retrieval.
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
      r.specify_evidence,
      r.periodicity,
      r.acceptance_criteria,
      s.id   AS subject_id,
      s.subject_name AS subject_name,
      a.id   AS aspect_id,
      a.aspect_name AS aspect_name
    FROM requirements r
    JOIN subjects s ON r.subject_id = s.id
    LEFT JOIN requirement_subject_aspect rsa ON r.id = rsa.requirement_id
    LEFT JOIN aspects a ON rsa.aspect_id = a.id
    WHERE r.evidence = ?
    ORDER BY r.requirement_number
  `

    try {
      const [rows] = await pool.query(query, [evidence])
      if (rows.length === 0) return null

      const map = new Map()
      for (const row of rows) {
        if (!map.has(row.id)) {
          map.set(row.id, {
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
            specify_evidence: row.specify_evidence,
            periodicity: row.periodicity,
            acceptance_criteria: row.acceptance_criteria,
            subject: {
              subject_id: row.subject_id,
              subject_name: row.subject_name
            },
            aspects: []
          })
        }
        if (row.aspect_id !== null) {
          map.get(row.id).aspects.push({
            aspect_id: row.aspect_id,
            aspect_name: row.aspect_name
          })
        }
      }

      return Array.from(map.values()).map(
        (req) =>
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
            req.specify_evidence,
            req.periodicity,
            req.acceptance_criteria
          )
      )
    } catch (error) {
      console.error(
        'Error retrieving requirements by evidence:',
        error.message
      )
      throw new HttpException(500, 'Error retrieving requirements by evidence')
    }
  }

  /**
   * Retrieves requirements filtered by a specific periodicity.
   * @param {string} periodicity - The periodicity to filter by.
   * @returns {Promise<Array<Requirement>|null>} - A list of Requirement instances matching the periodicity.
   * @throws {HttpException} - If an error occurs during retrieval.
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
      r.specify_evidence,
      r.periodicity,
      r.acceptance_criteria,
      s.id   AS subject_id,
      s.subject_name AS subject_name,
      a.id   AS aspect_id,
      a.aspect_name AS aspect_name
    FROM requirements r
    JOIN subjects s ON r.subject_id = s.id
    LEFT JOIN requirement_subject_aspect rsa ON r.id = rsa.requirement_id
    LEFT JOIN aspects a ON rsa.aspect_id = a.id
    WHERE r.periodicity = ?
    ORDER BY r.requirement_number
  `

    try {
      const [rows] = await pool.query(query, [periodicity])
      if (rows.length === 0) return null

      const map = new Map()
      for (const row of rows) {
        if (!map.has(row.id)) {
          map.set(row.id, {
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
            specify_evidence: row.specify_evidence,
            periodicity: row.periodicity,
            acceptance_criteria: row.acceptance_criteria,
            subject: {
              subject_id: row.subject_id,
              subject_name: row.subject_name
            },
            aspects: []
          })
        }
        if (row.aspect_id !== null) {
          map.get(row.id).aspects.push({
            aspect_id: row.aspect_id,
            aspect_name: row.aspect_name
          })
        }
      }

      return Array.from(map.values()).map(
        (req) =>
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
            req.specify_evidence,
            req.periodicity,
            req.acceptance_criteria
          )
      )
    } catch (error) {
      console.error(
        'Error retrieving requirements by periodicity:',
        error.message
      )
      throw new HttpException(
        500,
        'Error retrieving requirements by periodicity'
      )
    }
  }

  /**
   * Retrieves requirements filtered by acceptance criteria.
   * @param {string} acceptanceCriteria - The acceptance criteria text to filter by.
   * @returns {Promise<Array<Requirement>|null>} - A list of Requirement instances matching the acceptance criteria.
   * @throws {HttpException} - If an error occurs during retrieval.
   */
  static async findByAcceptanceCriteria (acceptanceCriteria) {
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
      r.specify_evidence,
      r.periodicity,
      r.acceptance_criteria,
      s.id   AS subject_id,
      s.subject_name AS subject_name,
      a.id   AS aspect_id,
      a.aspect_name AS aspect_name
    FROM requirements r
    JOIN subjects s ON r.subject_id = s.id
    LEFT JOIN requirement_subject_aspect rsa ON r.id = rsa.requirement_id
    LEFT JOIN aspects a ON rsa.aspect_id = a.id
    WHERE r.acceptance_criteria LIKE ?
    ORDER BY r.requirement_number
  `

    try {
      const [rows] = await pool.query(query, [`%${acceptanceCriteria}%`])
      if (rows.length === 0) return null

      const map = new Map()
      for (const row of rows) {
        if (!map.has(row.id)) {
          map.set(row.id, {
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
            specify_evidence: row.specify_evidence,
            periodicity: row.periodicity,
            acceptance_criteria: row.acceptance_criteria,
            subject: {
              subject_id: row.subject_id,
              subject_name: row.subject_name
            },
            aspects: []
          })
        }
        if (row.aspect_id !== null) {
          map.get(row.id).aspects.push({
            aspect_id: row.aspect_id,
            aspect_name: row.aspect_name
          })
        }
      }

      return Array.from(map.values()).map(
        (req) =>
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
            req.specify_evidence,
            req.periodicity,
            req.acceptance_criteria
          )
      )
    } catch (error) {
      console.error(
        'Error retrieving requirements by acceptance criteria:',
        error.message
      )
      throw new HttpException(
        500,
        'Error retrieving requirements by acceptance criteria'
      )
    }
  }

  /**
   * Checks if a requirement with the given name exists, excluding the specified requirement ID.
   * @param {string} requirementName - The requirement name to check for uniqueness.
   * @param {number} requirementId - The requirement ID to exclude from the check.
   * @returns {Promise<boolean>} - True if a requirement with the same name exists (excluding the given ID), false otherwise.
   * @throws {HttpException} - If an error occurs during the check.
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
      console.error(
        'Error checking requirement name uniqueness:',
        error.message
      )
      throw new HttpException(
        500,
        'Error checking requirement name uniqueness'
      )
    }
  }

  /**
   * Updates a requirement by its ID using IFNULL to preserve existing values
   * and updates the associated aspects via the requirement_subject_aspect table.
   * @param {number} requirementId - The ID of the requirement to update.
   * @param {Object} requirement - The updated data for the requirement.
   * @param {number} [requirement.subjectId] - The updated subject ID (optional).
   * @param {Array<number>} [requirement.aspectsIds] - The updated aspect IDs to associate (optional).
   * @param {number} [requirement.requirementNumber] - The requirement number (integer).
   * @param {string} [requirement.requirementName]
   * @param {string} [requirement.mandatoryDescription]
   * @param {string} [requirement.complementaryDescription]
   * @param {string} [requirement.mandatorySentences]
   * @param {string} [requirement.complementarySentences]
   * @param {string} [requirement.mandatoryKeywords]
   * @param {string} [requirement.complementaryKeywords]
   * @param {string} [requirement.condition]
   * @param {string} [requirement.evidence]
   * @param {string} [requirement.specifyEvidence]
   * @param {string} [requirement.periodicity]
   * @param {string} [requirement.acceptanceCriteria] - The acceptance criteria (TEXT, required).
   * @returns {Promise<Requirement|null>} - The updated Requirement instance or null.
   * @throws {HttpException} - If an error occurs during update.
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
      specifyEvidence,
      periodicity,
      acceptanceCriteria
    } = requirement

    const updateRequirementQuery = `
    UPDATE requirements SET
      subject_id               = IFNULL(?, subject_id),
      requirement_number       = IFNULL(?, requirement_number),
      requirement_name         = IFNULL(?, requirement_name),
      mandatory_description    = IFNULL(?, mandatory_description),
      complementary_description = IFNULL(?, complementary_description),
      mandatory_sentences      = IFNULL(?, mandatory_sentences),
      complementary_sentences  = IFNULL(?, complementary_sentences),
      mandatory_keywords       = IFNULL(?, mandatory_keywords),
      complementary_keywords   = IFNULL(?, complementary_keywords),
      requirement_condition    = IFNULL(?, requirement_condition),
      evidence                 = IFNULL(?, evidence),
      specify_evidence         = IFNULL(?, specify_evidence),
      periodicity              = IFNULL(?, periodicity),
      acceptance_criteria      = IFNULL(?, acceptance_criteria)
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
        specifyEvidence,
        periodicity,
        acceptanceCriteria,
        requirementId
      ])
      if (updateResult.affectedRows === 0) {
        await connection.rollback()
        return null
      }
      if (aspectsIds && aspectsIds.length > 0) {
        const [checkResult] = await connection.query(checkAspectsQuery, [
          requirementId
        ])
        const { aspectCount } = checkResult[0]
        if (aspectCount > 0) {
          const [deletedResult] = await connection.query(deleteAspectsQuery, [
            requirementId
          ])
          if (deletedResult.affectedRows === 0) {
            await connection.rollback()
            throw new HttpException(500, 'Failed to delete existing aspects')
          }
        }
        const values = aspectsIds.flatMap((aspectId) => [
          requirementId,
          subjectId,
          aspectId
        ])
        const [insertResult] = await connection.query(
          insertAspectsQuery(aspectsIds),
          values
        )
        if (insertResult.affectedRows !== aspectsIds.length) {
          await connection.rollback()
          throw new HttpException(500, 'Failed to insert aspects')
        }
      }
      await connection.commit()
      return await this.findById(requirementId)
    } catch (error) {
      await connection.rollback()
      console.error('Error updating requirement:', error.message)
      throw new HttpException(
        500,
        'Error updating requirement in the database'
      )
    } finally {
      connection.release()
    }
  }

  /**
   * Deletes a requirement by its ID, including related aspects in the intermediate table.
   * @param {number} requirementId - The ID of the requirement to delete.
   * @returns {Promise<boolean>} - Returns true if the deletion is successful, false otherwise.
   * @throws {HttpException} - If an error occurs during deletion.
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
          throw new HttpException(500, 'Failed to delete associated aspects.')
        }
      }
      const [deletedRequirement] = await connection.query(
        deleteRequirementQuery,
        [requirementId]
      )
      if (deletedRequirement.affectedRows === 0) {
        await connection.rollback()
        return false
      }
      await connection.commit()
      return true
    } catch (error) {
      await connection.rollback()
      console.error('Error deleting requirement:', error.message)
      throw new HttpException(
        500,
        'Error deleting requirement from the database'
      )
    } finally {
      connection.release()
    }
  }

  /**
   * Deletes multiple requirements by their IDs, including associated aspects from the intermediate table.
   * @param {number[]} requirementIds - An array of requirement IDs to delete.
   * @returns {Promise<boolean>} - Returns true if all deletions are successful, false otherwise.
   * @throws {HttpException} - If an error occurs during deletion.
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
      const [aspectCheckResults] = await connection.query(checkAspectsQuery, [
        requirementIds
      ])
      const requirementIdsWithAspects = aspectCheckResults.map(
        (row) => row.requirement_id
      )
      if (requirementIdsWithAspects.length > 0) {
        const [deletedAspectsResult] = await connection.query(
          deleteAspectsQuery,
          [requirementIdsWithAspects]
        )
        if (
          deletedAspectsResult.affectedRows < requirementIdsWithAspects.length
        ) {
          await connection.rollback()
          throw new HttpException(
            500,
            'Failed to delete aspects for some requirement IDs'
          )
        }
      }
      const [deletedRequirementsResult] = await connection.query(
        deleteRequirementsQuery,
        [requirementIds]
      )
      if (deletedRequirementsResult.affectedRows !== requirementIds.length) {
        await connection.rollback()
        return false
      }
      await connection.commit()
      return true
    } catch (error) {
      await connection.rollback()
      console.error('Error deleting requirements in batch:', error.message)
      throw new HttpException(
        500,
        'Error deleting requirement records in batch'
      )
    } finally {
      connection.release()
    }
  }

  /**
   * Deletes all requirements and their relationships from the database.
   * @returns {Promise<void>}
   * @throws {HttpException} - If an error occurs during deletion.
   */
  static async deleteAll () {
    const deleteAspectsQuery = 'DELETE FROM requirement_subject_aspect'
    const deleteRequirementsQuery = 'DELETE FROM requirements'
    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()
      await connection.query(deleteAspectsQuery)
      await connection.query(deleteRequirementsQuery)
      await connection.commit()
    } catch (error) {
      await connection.rollback()
      console.error('Error deleting all requirements:', error.message)
      throw new HttpException(
        500,
        'Error deleting all requirements from the database'
      )
    } finally {
      connection.release()
    }
  }

  /**
   * Checks if a requirement is associated with any requirement identification.
   * @param {number} requirementId - The ID of the requirement to check.
   * @returns {Promise<{ isAssociatedToReqIdentifications: boolean }>}
   * @throws {HttpException} - If an error occurs while querying the database.
   */
  static async checkReqIdentificationAssociations (requirementId) {
    try {
      const [rows] = await pool.query(
        `
      SELECT COUNT(*) AS identificationCount
      FROM req_identifications_requirements
      WHERE requirement_id = ?
      `,
        [requirementId]
      )

      return {
        isAssociatedToReqIdentifications: rows[0].identificationCount > 0
      }
    } catch (error) {
      console.error(
        'Error checking requirement-identification associations:',
        error.message
      )
      throw new HttpException(
        500,
        'Error checking requirement associations with identifications'
      )
    }
  }

  /**
   * Checks if any of the given requirements are associated with any requirement identifications.
   * @param {Array<number>} requirementIds - Array of requirement IDs to check.
   * @returns {Promise<Array<{ id: number, name: string, isAssociatedToReqIdentifications: boolean }>>}
   * @throws {HttpException}
   */
  static async checkReqIdentificationAssociationsBatch (requirementIds) {
    try {
      const [rows] = await pool.query(
        `
      SELECT 
        r.id AS requirementId,
        r.requirement_name AS requirementName,
        COUNT(rir.req_identification_id) AS identificationCount
      FROM requirements r
      LEFT JOIN req_identifications_requirements rir 
        ON r.id = rir.requirement_id
      WHERE r.id IN (?)
      GROUP BY r.id
      `,
        [requirementIds]
      )

      return rows.map((row) => ({
        id: row.requirementId,
        name: row.requirementName,
        isAssociatedToReqIdentifications: row.identificationCount > 0
      }))
    } catch (error) {
      console.error(
        'Error checking requirement-identification batch associations:',
        error.message
      )
      throw new HttpException(
        500,
        'Error checking batch requirement associations with identifications'
      )
    }
  }
}

export default RequirementRepository
