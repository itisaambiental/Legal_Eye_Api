// repositories/LegalBasis.repository.js

import { pool } from '../config/db.config.js'
import LegalBasis from '../models/LegalBasis.model.js'
import ErrorUtils from '../utils/Error.js'

/**
 * Repository class for handling database operations related to LegalBasis.
 */
class LegalBasisRepository {
  /**
   * Creates a new legal basis record in the database and associates it with subjects and aspects.
   * @param {Object} legalBasis - The data for the legal basis.
   * @param {string} legalBasis.legalName - The name of the legal basis.
   * @param {string} legalBasis.abbreviation - The abbreviation of the legal basis.
   * @param {number} legalBasis.subjectId - The ID of the subject associated with the legal basis.
   * @param {Array<number>} legalBasis.aspectsIds - The IDs of the aspects to associate with the legal basis.
   * @param {string} legalBasis.classification - The classification of the legal basis.
   * @param {string} legalBasis.jurisdiction - The jurisdiction of the legal basis.
   * @param {string} [legalBasis.state] - The state associated with the legal basis.
   * @param {string} [legalBasis.municipality] - The municipality associated with the legal basis.
   * @param {Date} legalBasis.lastReform - The date of the last reform.
   * @param {string} [legalBasis.url] - The URL of the legal basis document.
   * @returns {Promise<LegalBasis>} - The new LegalBasis.
   * @throws {ErrorUtils} - If an error occurs during insertion.
   */
  static async create (legalBasis) {
    const {
      legalName,
      abbreviation,
      subjectId,
      aspectsIds,
      classification,
      jurisdiction,
      state,
      municipality,
      lastReform,
      url
    } = legalBasis

    const insertLegalBasisQuery = `
      INSERT INTO legal_basis (legal_name, abbreviation, classification, jurisdiction, state, municipality, last_reform, url, subject_id) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    try {
      const [result] = await pool.query(insertLegalBasisQuery, [
        legalName,
        abbreviation,
        classification,
        jurisdiction,
        state,
        municipality,
        lastReform,
        url,
        subjectId
      ])
      const legalBasisId = result.insertId
      if (aspectsIds && aspectsIds.length > 0) {
        const insertAspectsQuery = `
          INSERT INTO legal_basis_subject_aspect (legal_basis_id, subject_id, aspect_id) 
          VALUES ${aspectsIds.map(() => '(?, ?, ?)').join(', ')}
        `
        const values = aspectsIds.flatMap((aspectId) => [
          legalBasisId,
          subjectId,
          aspectId
        ])
        await pool.query(insertAspectsQuery, values)
      }
      const legalBasis = await this.findById(legalBasisId)
      return legalBasis
    } catch (error) {
      console.error('Error creating legal basis:', error.message)
      throw new ErrorUtils(500, 'Error creating legal basis in the database')
    }
  }

  /**
   * Retrieves all legal basis records from the database.
   * @returns {Promise<Array<LegalBasis|null>>} - A list of all legal basis records.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async findAll () {
    const query = `
      SELECT 
        legal_basis.id, 
        legal_basis.legal_name, 
        legal_basis.abbreviation, 
        legal_basis.classification, 
        legal_basis.jurisdiction, 
        legal_basis.state, 
        legal_basis.municipality, 
        legal_basis.last_reform, 
        legal_basis.url, 
        subjects.id AS subject_id, 
        subjects.subject_name AS subject_name,
        aspects.id AS aspect_id, 
        aspects.aspect_name AS aspect_name
      FROM legal_basis
      JOIN subjects ON legal_basis.subject_id = subjects.id
      LEFT JOIN legal_basis_subject_aspect ON legal_basis.id = legal_basis_subject_aspect.legal_basis_id
      LEFT JOIN aspects ON legal_basis_subject_aspect.aspect_id = aspects.id
    `
    try {
      const [rows] = await pool.query(query)
      if (rows.length === 0) return null
      const legalBasisMap = new Map()
      rows.forEach((row) => {
        if (!legalBasisMap.has(row.id)) {
          legalBasisMap.set(row.id, {
            id: row.id,
            legal_name: row.legal_name,
            abbreviation: row.abbreviation,
            classification: row.classification,
            jurisdiction: row.jurisdiction,
            state: row.state,
            municipality: row.municipality,
            lastReform: row.last_reform,
            url: row.url,
            subject: {
              subject_id: row.subject_id,
              subject_name: row.subject_name
            },
            aspects: []
          })
        }
        if (row.aspect_id !== null) {
          legalBasisMap.get(row.id).aspects.push({
            aspect_id: row.aspect_id,
            aspect_name: row.aspect_name
          })
        }
      })
      return Array.from(legalBasisMap.values()).map(
        (legalBasis) =>
          new LegalBasis(
            legalBasis.id,
            legalBasis.legal_name,
            legalBasis.subject,
            legalBasis.aspects,
            legalBasis.abbreviation,
            legalBasis.classification,
            legalBasis.jurisdiction,
            legalBasis.state,
            legalBasis.municipality,
            legalBasis.lastReform,
            legalBasis.url
          )
      )
    } catch (error) {
      console.error('Error retrieving all legal basis records:', error.message)
      throw new ErrorUtils(500, 'Error retrieving all legal basis records')
    }
  }

  /**
 * Checks if a legal basis exists with the given name.
 * @param {string} legalName - The legal name to check for existence.
 * @returns {Promise<boolean>} - True if a legal basis with the same name exists, false otherwise.
 * @throws {ErrorUtils} - If an error occurs during the check.
 */
  static async existsByName (legalName) {
    const query = `
    SELECT 1 
    FROM legal_basis 
    WHERE legal_name = ?
    LIMIT 1
  `
    try {
      const [rows] = await pool.query(query, [legalName])
      return rows.length > 0
    } catch (error) {
      console.error('Error checking if legal basis exists:', error.message)
      throw new ErrorUtils(500, 'Error checking if legal basis exists')
    }
  }

  /**
 * Checks if a legal basis exists with the given abbreviation.
 * @param {string} abbreviation - The abbreviation to check for existence.
 * @returns {Promise<boolean>} - True if a legal basis with the same abbreviation exists, false otherwise.
 * @throws {ErrorUtils} - If an error occurs during the check.
 */
  static async existsByAbbreviation (abbreviation) {
    const query = `
    SELECT 1 
    FROM legal_basis 
    WHERE abbreviation = ?
    LIMIT 1
  `
    try {
      const [rows] = await pool.query(query, [abbreviation])
      return rows.length > 0
    } catch (error) {
      console.error('Error checking if abbreviation exists:', error.message)
      throw new ErrorUtils(500, 'Error checking if abbreviation exists')
    }
  }

  /**
   * Retrieves a legal basis record by its ID.
   * @param {number} legalBasisId - The ID of the legal basis to retrieve.
   * @returns {Promise<LegalBasis|null>} - The legal basis record or null if not found.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async findById (legalBasisId) {
    const query = `
      SELECT 
        legal_basis.id, 
        legal_basis.legal_name, 
        legal_basis.abbreviation, 
        legal_basis.classification, 
        legal_basis.jurisdiction, 
        legal_basis.state, 
        legal_basis.municipality, 
        legal_basis.last_reform, 
        legal_basis.url, 
        subjects.id AS subject_id, 
        subjects.subject_name AS subject_name,
        aspects.id AS aspect_id, 
        aspects.aspect_name AS aspect_name
      FROM legal_basis
      JOIN subjects ON legal_basis.subject_id = subjects.id
      LEFT JOIN legal_basis_subject_aspect ON legal_basis.id = legal_basis_subject_aspect.legal_basis_id
      LEFT JOIN aspects ON legal_basis_subject_aspect.aspect_id = aspects.id
      WHERE legal_basis.id = ?
    `

    try {
      const [rows] = await pool.query(query, [legalBasisId])
      if (rows.length === 0) return null
      const legalBasis = rows[0]
      const subject = {
        subject_id: legalBasis.subject_id,
        subject_name: legalBasis.subject_name
      }

      const aspects = rows
        .map((row) => ({
          aspect_id: row.aspect_id,
          aspect_name: row.aspect_name
        }))
        .filter((aspect) => aspect.aspect_id !== null)

      return new LegalBasis(
        legalBasis.id,
        legalBasis.legal_name,
        subject,
        aspects,
        legalBasis.abbreviation,
        legalBasis.classification,
        legalBasis.jurisdiction,
        legalBasis.state,
        legalBasis.municipality,
        legalBasis.last_reform,
        legalBasis.url
      )
    } catch (error) {
      console.error('Error retrieving legal basis by ID:', error.message)
      throw new ErrorUtils(500, 'Error retrieving legal basis by ID')
    }
  }

  /**
   * Retrieves multiple legal basis records by their IDs.
   * @param {Array<number>} legalBasisIds - An array of IDs of the legal bases to retrieve.
   * @returns {Promise<LegalBasis[]>} - An array of legal basis records.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async findByIds (legalBasisIds) {
    if (legalBasisIds.length === 0) {
      return []
    }
    const query = `
    SELECT 
      legal_basis.id, 
      legal_basis.legal_name, 
      legal_basis.abbreviation, 
      legal_basis.classification, 
      legal_basis.jurisdiction, 
      legal_basis.state, 
      legal_basis.municipality, 
      legal_basis.last_reform, 
      legal_basis.url, 
      subjects.id AS subject_id, 
      subjects.subject_name AS subject_name,
      aspects.id AS aspect_id, 
      aspects.aspect_name AS aspect_name
    FROM legal_basis
    JOIN subjects ON legal_basis.subject_id = subjects.id
    LEFT JOIN legal_basis_subject_aspect ON legal_basis.id = legal_basis_subject_aspect.legal_basis_id
    LEFT JOIN aspects ON legal_basis_subject_aspect.aspect_id = aspects.id
    WHERE legal_basis.id IN (?)
  `
    try {
      const [rows] = await pool.query(query, [legalBasisIds])
      if (rows.length === 0) return []
      const legalBasisMap = new Map()
      rows.forEach((row) => {
        if (!legalBasisMap.has(row.id)) {
          legalBasisMap.set(row.id, {
            id: row.id,
            legal_name: row.legal_name,
            abbreviation: row.abbreviation,
            classification: row.classification,
            jurisdiction: row.jurisdiction,
            state: row.state,
            municipality: row.municipality,
            last_reform: row.last_reform,
            url: row.url,
            subject: {
              subject_id: row.subject_id,
              subject_name: row.subject_name
            },
            aspects: []
          })
        }
        if (row.aspect_id) {
          legalBasisMap.get(row.id).aspects.push({
            aspect_id: row.aspect_id,
            aspect_name: row.aspect_name
          })
        }
      })
      return Array.from(legalBasisMap.values()).map((legalBasis) => {
        return new LegalBasis(
          legalBasis.id,
          legalBasis.legal_name,
          legalBasis.subject,
          legalBasis.aspects,
          legalBasis.abbreviation,
          legalBasis.classification,
          legalBasis.jurisdiction,
          legalBasis.state,
          legalBasis.municipality,
          legalBasis.last_reform,
          legalBasis.url
        )
      })
    } catch (error) {
      console.error('Error retrieving legal bases by IDs:', error.message)
      throw new ErrorUtils(500, 'Error retrieving legal bases by IDs')
    }
  }

  /**
   * Retrieves all legal basis records by name from the database.
   * @param {string} legalName - The name or part of the name of the legal basis to retrieve.
   * @returns {Promise<Array<LegalBasis|null>>} - A list of legal basis records matching the name.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async findByName (legalName) {
    const query = `
  SELECT 
    legal_basis.id, 
    legal_basis.legal_name, 
    legal_basis.abbreviation, 
    legal_basis.classification, 
    legal_basis.jurisdiction, 
    legal_basis.state, 
    legal_basis.municipality, 
    legal_basis.last_reform, 
    legal_basis.url, 
    subjects.id AS subject_id, 
    subjects.subject_name AS subject_name,
    aspects.id AS aspect_id, 
    aspects.aspect_name AS aspect_name
  FROM legal_basis
  JOIN subjects ON legal_basis.subject_id = subjects.id
  LEFT JOIN legal_basis_subject_aspect ON legal_basis.id = legal_basis_subject_aspect.legal_basis_id
  LEFT JOIN aspects ON legal_basis_subject_aspect.aspect_id = aspects.id
  WHERE legal_basis.legal_name LIKE ?
`
    try {
      const [rows] = await pool.query(query, [`%${legalName}%`])
      if (rows.length === 0) return null

      const legalBasisMap = new Map()
      rows.forEach((row) => {
        if (!legalBasisMap.has(row.id)) {
          legalBasisMap.set(row.id, {
            id: row.id,
            legal_name: row.legal_name,
            abbreviation: row.abbreviation,
            classification: row.classification,
            jurisdiction: row.jurisdiction,
            state: row.state,
            municipality: row.municipality,
            lastReform: row.last_reform,
            url: row.url,
            subject: {
              subject_id: row.subject_id,
              subject_name: row.subject_name
            },
            aspects: []
          })
        }
        if (row.aspect_id !== null) {
          legalBasisMap.get(row.id).aspects.push({
            aspect_id: row.aspect_id,
            aspect_name: row.aspect_name
          })
        }
      })

      return Array.from(legalBasisMap.values()).map(
        (legalBasis) =>
          new LegalBasis(
            legalBasis.id,
            legalBasis.legal_name,
            legalBasis.subject,
            legalBasis.aspects,
            legalBasis.abbreviation,
            legalBasis.classification,
            legalBasis.jurisdiction,
            legalBasis.state,
            legalBasis.municipality,
            legalBasis.lastReform,
            legalBasis.url
          )
      )
    } catch (error) {
      console.error('Error retrieving legal basis by name:', error.message)
      throw new ErrorUtils(500, 'Error retrieving legal basis by name')
    }
  }

  /**
   * Retrieves all legal basis records by their abbreviation from the database.
   * @param {string} abbreviation - The abbreviation or part of the abbreviation of the legal basis to retrieve.
   * @returns {Promise<Array<LegalBasis|null>>} - A list of legal basis records matching the abbreviation.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async findByAbbreviation (abbreviation) {
    const query = `
  SELECT 
    legal_basis.id, 
    legal_basis.legal_name, 
    legal_basis.abbreviation, 
    legal_basis.classification, 
    legal_basis.jurisdiction, 
    legal_basis.state, 
    legal_basis.municipality, 
    legal_basis.last_reform, 
    legal_basis.url, 
    subjects.id AS subject_id, 
    subjects.subject_name AS subject_name,
    aspects.id AS aspect_id, 
    aspects.aspect_name AS aspect_name
  FROM legal_basis
  JOIN subjects ON legal_basis.subject_id = subjects.id
  LEFT JOIN legal_basis_subject_aspect ON legal_basis.id = legal_basis_subject_aspect.legal_basis_id
  LEFT JOIN aspects ON legal_basis_subject_aspect.aspect_id = aspects.id
  WHERE legal_basis.abbreviation LIKE ?
`
    try {
      const [rows] = await pool.query(query, [`%${abbreviation}%`])
      if (rows.length === 0) return null

      const legalBasisMap = new Map()
      rows.forEach((row) => {
        if (!legalBasisMap.has(row.id)) {
          legalBasisMap.set(row.id, {
            id: row.id,
            legal_name: row.legal_name,
            abbreviation: row.abbreviation,
            classification: row.classification,
            jurisdiction: row.jurisdiction,
            state: row.state,
            municipality: row.municipality,
            lastReform: row.last_reform,
            url: row.url,
            subject: {
              subject_id: row.subject_id,
              subject_name: row.subject_name
            },
            aspects: []
          })
        }
        if (row.aspect_id !== null) {
          legalBasisMap.get(row.id).aspects.push({
            aspect_id: row.aspect_id,
            aspect_name: row.aspect_name
          })
        }
      })
      return Array.from(legalBasisMap.values()).map(
        (legalBasis) =>
          new LegalBasis(
            legalBasis.id,
            legalBasis.legal_name,
            legalBasis.subject,
            legalBasis.aspects,
            legalBasis.abbreviation,
            legalBasis.classification,
            legalBasis.jurisdiction,
            legalBasis.state,
            legalBasis.municipality,
            legalBasis.lastReform,
            legalBasis.url
          )
      )
    } catch (error) {
      console.error(
        'Error retrieving legal basis by abbreviation:',
        error.message
      )
      throw new ErrorUtils(500, 'Error retrieving legal basis by abbreviation')
    }
  }

  /**
   * Retrieves all legal basis records by their classification, including related aspects.
   * @param {string} classification - The classification of the legal basis to retrieve.
   * @returns {Promise<Array<LegalBasis|null>} - A list of legal basis records.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async findByClassification (classification) {
    const query = `
    SELECT 
      legal_basis.id, 
      legal_basis.legal_name, 
      legal_basis.abbreviation, 
      legal_basis.classification, 
      legal_basis.jurisdiction, 
      legal_basis.state, 
      legal_basis.municipality, 
      legal_basis.last_reform, 
      legal_basis.url, 
      subjects.id AS subject_id, 
      subjects.subject_name AS subject_name,
      aspects.id AS aspect_id, 
      aspects.aspect_name AS aspect_name
    FROM legal_basis
    JOIN subjects ON legal_basis.subject_id = subjects.id
    LEFT JOIN legal_basis_subject_aspect ON legal_basis.id = legal_basis_subject_aspect.legal_basis_id
    LEFT JOIN aspects ON legal_basis_subject_aspect.aspect_id = aspects.id
    WHERE legal_basis.classification = ?
  `
    try {
      const [rows] = await pool.query(query, [classification])
      if (rows.length === 0) return null
      const legalBasisMap = new Map()
      rows.forEach((row) => {
        if (!legalBasisMap.has(row.id)) {
          legalBasisMap.set(row.id, {
            id: row.id,
            legal_name: row.legal_name,
            abbreviation: row.abbreviation,
            classification: row.classification,
            jurisdiction: row.jurisdiction,
            state: row.state,
            municipality: row.municipality,
            lastReform: row.last_reform,
            url: row.url,
            subject: {
              subject_id: row.subject_id,
              subject_name: row.subject_name
            },
            aspects: []
          })
        }
        if (row.aspect_id !== null) {
          legalBasisMap.get(row.id).aspects.push({
            aspect_id: row.aspect_id,
            aspect_name: row.aspect_name
          })
        }
      })
      const legalBasisArray = Array.from(legalBasisMap.values())
      return legalBasisArray.map(
        (legalBasis) =>
          new LegalBasis(
            legalBasis.id,
            legalBasis.legal_name,
            legalBasis.subject,
            legalBasis.aspects,
            legalBasis.abbreviation,
            legalBasis.classification,
            legalBasis.jurisdiction,
            legalBasis.state,
            legalBasis.municipality,
            legalBasis.lastReform,
            legalBasis.url
          )
      )
    } catch (error) {
      console.error(
        'Error retrieving legal basis by classification:',
        error.message
      )
      throw new ErrorUtils(
        500,
        'Error retrieving legal basis by classification'
      )
    }
  }

  /**
   * Retrieves legal basis records filtered by jurisdiction, including related aspects.
   * @param {string} jurisdiction - The jurisdiction to filter by.
   * @returns {Promise<Array<LegalBasis|null>} - A list of legal basis records.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async findByJurisdiction (jurisdiction) {
    const query = `
    SELECT 
      legal_basis.id, 
      legal_basis.legal_name, 
      legal_basis.abbreviation, 
      legal_basis.classification, 
      legal_basis.jurisdiction, 
      legal_basis.state, 
      legal_basis.municipality, 
      legal_basis.last_reform, 
      legal_basis.url, 
      subjects.id AS subject_id, 
      subjects.subject_name AS subject_name,
      aspects.id AS aspect_id, 
      aspects.aspect_name AS aspect_name
    FROM legal_basis
    JOIN subjects ON legal_basis.subject_id = subjects.id
    LEFT JOIN legal_basis_subject_aspect ON legal_basis.id = legal_basis_subject_aspect.legal_basis_id
    LEFT JOIN aspects ON legal_basis_subject_aspect.aspect_id = aspects.id
    WHERE legal_basis.jurisdiction = ?
  `
    try {
      const [rows] = await pool.query(query, [jurisdiction])

      if (rows.length === 0) return null

      const legalBasisMap = new Map()
      rows.forEach((row) => {
        if (!legalBasisMap.has(row.id)) {
          legalBasisMap.set(row.id, {
            id: row.id,
            legal_name: row.legal_name,
            abbreviation: row.abbreviation,
            classification: row.classification,
            jurisdiction: row.jurisdiction,
            state: row.state,
            municipality: row.municipality,
            lastReform: row.last_reform,
            url: row.url,
            subject: {
              subject_id: row.subject_id,
              subject_name: row.subject_name
            },
            aspects: []
          })
        }
        if (row.aspect_id !== null) {
          legalBasisMap.get(row.id).aspects.push({
            aspect_id: row.aspect_id,
            aspect_name: row.aspect_name
          })
        }
      })

      const legalBasisArray = Array.from(legalBasisMap.values())
      return legalBasisArray.map(
        (legalBasis) =>
          new LegalBasis(
            legalBasis.id,
            legalBasis.legal_name,
            legalBasis.subject,
            legalBasis.aspects,
            legalBasis.abbreviation,
            legalBasis.classification,
            legalBasis.jurisdiction,
            legalBasis.state,
            legalBasis.municipality,
            legalBasis.lastReform,
            legalBasis.url
          )
      )
    } catch (error) {
      console.error(
        'Error retrieving legal basis by jurisdiction:',
        error.message
      )
      throw new ErrorUtils(500, 'Error retrieving legal basis by jurisdiction')
    }
  }

  /**
   * Retrieves legal basis records filtered by state,
   * @param {string} state - The state to filter by.
   * @returns {Promise<Array<LegalBasis|null>} - A list of legal basis records.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async findByState (state) {
    const query = `
  SELECT 
    legal_basis.id, 
    legal_basis.legal_name, 
    legal_basis.abbreviation, 
    legal_basis.classification, 
    legal_basis.jurisdiction, 
    legal_basis.state, 
    legal_basis.municipality, 
    legal_basis.last_reform, 
    legal_basis.url, 
    subjects.id AS subject_id, 
    subjects.subject_name AS subject_name,
    aspects.id AS aspect_id, 
    aspects.aspect_name AS aspect_name
  FROM legal_basis
  JOIN subjects ON legal_basis.subject_id = subjects.id
  LEFT JOIN legal_basis_subject_aspect ON legal_basis.id = legal_basis_subject_aspect.legal_basis_id
  LEFT JOIN aspects ON legal_basis_subject_aspect.aspect_id = aspects.id
  WHERE legal_basis.state = ?
`

    try {
      const [rows] = await pool.query(query, [state])

      if (rows.length === 0) return null

      const legalBasisMap = new Map()
      rows.forEach((row) => {
        if (!legalBasisMap.has(row.id)) {
          legalBasisMap.set(row.id, {
            id: row.id,
            legal_name: row.legal_name,
            abbreviation: row.abbreviation,
            classification: row.classification,
            jurisdiction: row.jurisdiction,
            state: row.state,
            municipality: row.municipality,
            lastReform: row.last_reform,
            url: row.url,
            subject: {
              subject_id: row.subject_id,
              subject_name: row.subject_name
            },
            aspects: []
          })
        }
        if (row.aspect_id !== null) {
          legalBasisMap.get(row.id).aspects.push({
            aspect_id: row.aspect_id,
            aspect_name: row.aspect_name
          })
        }
      })

      const legalBasisArray = Array.from(legalBasisMap.values())
      return legalBasisArray.map(
        (legalBasis) =>
          new LegalBasis(
            legalBasis.id,
            legalBasis.legal_name,
            legalBasis.subject,
            legalBasis.aspects,
            legalBasis.abbreviation,
            legalBasis.classification,
            legalBasis.jurisdiction,
            legalBasis.state,
            legalBasis.municipality,
            legalBasis.lastReform,
            legalBasis.url
          )
      )
    } catch (error) {
      console.error('Error retrieving legal basis by state:', error.message)
      throw new ErrorUtils(500, 'Error retrieving legal basis by state')
    }
  }

  /**
   * Retrieves legal basis records filtered by state and optionally by municipalities,
   * including related subjects and aspects.
   * @param {string} state - The state to filter by.
   * @param {Array<string>} [municipalities] - An array of municipalities to filter by (optional).
   * @returns {Promise<Array<LegalBasis|null>>} - A list of legal basis records.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async findByStateAndMunicipalities (state, municipalities = []) {
    let query = `
  SELECT 
    legal_basis.id, 
    legal_basis.legal_name, 
    legal_basis.abbreviation, 
    legal_basis.classification, 
    legal_basis.jurisdiction, 
    legal_basis.state, 
    legal_basis.municipality, 
    legal_basis.last_reform, 
    legal_basis.url, 
    subjects.id AS subject_id, 
    subjects.subject_name AS subject_name,
    aspects.id AS aspect_id, 
    aspects.aspect_name AS aspect_name
  FROM legal_basis
  JOIN subjects ON legal_basis.subject_id = subjects.id
  LEFT JOIN legal_basis_subject_aspect ON legal_basis.id = legal_basis_subject_aspect.legal_basis_id
  LEFT JOIN aspects ON legal_basis_subject_aspect.aspect_id = aspects.id
  WHERE legal_basis.state = ?
`
    const values = [state]
    if (municipalities.length > 0) {
      const placeholders = municipalities.map(() => '?').join(', ')
      query += ` AND legal_basis.municipality IN (${placeholders})`
      values.push(...municipalities)
    }
    try {
      const [rows] = await pool.query(query, values)

      if (rows.length === 0) return null

      const legalBasisMap = new Map()
      rows.forEach((row) => {
        if (!legalBasisMap.has(row.id)) {
          legalBasisMap.set(row.id, {
            id: row.id,
            legal_name: row.legal_name,
            abbreviation: row.abbreviation,
            classification: row.classification,
            jurisdiction: row.jurisdiction,
            state: row.state,
            municipality: row.municipality,
            lastReform: row.last_reform,
            url: row.url,
            subject: {
              subject_id: row.subject_id,
              subject_name: row.subject_name
            },
            aspects: []
          })
        }
        if (row.aspect_id !== null) {
          legalBasisMap.get(row.id).aspects.push({
            aspect_id: row.aspect_id,
            aspect_name: row.aspect_name
          })
        }
      })

      const legalBasisArray = Array.from(legalBasisMap.values())
      return legalBasisArray.map(
        (legalBasis) =>
          new LegalBasis(
            legalBasis.id,
            legalBasis.legal_name,
            legalBasis.subject,
            legalBasis.aspects,
            legalBasis.abbreviation,
            legalBasis.classification,
            legalBasis.jurisdiction,
            legalBasis.state,
            legalBasis.municipality,
            legalBasis.lastReform,
            legalBasis.url
          )
      )
    } catch (error) {
      console.error(
        'Error retrieving legal basis by state and municipalities:',
        error.message
      )
      throw new ErrorUtils(
        500,
        'Error retrieving legal basis by state and municipalities'
      )
    }
  }

  /**
   * Retrieves legal basis records filtered by a specific subject.
   * @param {number} subjectId - The subject ID to filter by.
   * @returns {Promise<Array<LegalBasis|null>>} - A list of legal basis records filtered by the subject.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async findBySubject (subjectId) {
    const query = `
    SELECT 
      legal_basis.id, 
      legal_basis.legal_name, 
      legal_basis.abbreviation, 
      legal_basis.classification, 
      legal_basis.jurisdiction, 
      legal_basis.state, 
      legal_basis.municipality, 
      legal_basis.last_reform, 
      legal_basis.url, 
      subjects.id AS subject_id, 
      subjects.subject_name AS subject_name,
      aspects.id AS aspect_id, 
      aspects.aspect_name AS aspect_name
    FROM legal_basis
    JOIN subjects ON legal_basis.subject_id = subjects.id
    LEFT JOIN legal_basis_subject_aspect ON legal_basis.id = legal_basis_subject_aspect.legal_basis_id
    LEFT JOIN aspects ON legal_basis_subject_aspect.aspect_id = aspects.id
    WHERE legal_basis.subject_id = ?
  `
    try {
      const [rows] = await pool.query(query, [subjectId])
      if (rows.length === 0) return null
      const legalBasisMap = new Map()
      rows.forEach((row) => {
        if (!legalBasisMap.has(row.id)) {
          legalBasisMap.set(row.id, {
            id: row.id,
            legal_name: row.legal_name,
            abbreviation: row.abbreviation,
            classification: row.classification,
            jurisdiction: row.jurisdiction,
            state: row.state,
            municipality: row.municipality,
            lastReform: row.last_reform,
            url: row.url,
            subject: {
              subject_id: row.subject_id,
              subject_name: row.subject_name
            },
            aspects: []
          })
        }
        if (row.aspect_id !== null) {
          legalBasisMap.get(row.id).aspects.push({
            aspect_id: row.aspect_id,
            aspect_name: row.aspect_name
          })
        }
      })

      const legalBasisArray = Array.from(legalBasisMap.values())
      return legalBasisArray.map(
        (legalBasis) =>
          new LegalBasis(
            legalBasis.id,
            legalBasis.legal_name,
            legalBasis.subject,
            legalBasis.aspects,
            legalBasis.abbreviation,
            legalBasis.classification,
            legalBasis.jurisdiction,
            legalBasis.state,
            legalBasis.municipality,
            legalBasis.lastReform,
            legalBasis.url
          )
      )
    } catch (error) {
      console.error('Error retrieving legal basis by subject:', error.message)
      throw new ErrorUtils(500, 'Error retrieving legal basis by subject')
    }
  }

  /**
   * Retrieves legal basis records filtered by subject (materia) and optionally by one or more aspects.
   * @param {number} subjectId - The subject ID to filter by.
   * @param {Array<number>} [aspectIds] - Optional array of aspect IDs to further filter by.
   * @returns {Promise<Array<LegalBasis|null>>} - A list of legal basis records.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async findBySubjectAndAspects (subjectId, aspectIds = []) {
    let query = `
    SELECT 
      legal_basis.id, 
      legal_basis.legal_name, 
      legal_basis.abbreviation, 
      legal_basis.classification, 
      legal_basis.jurisdiction, 
      legal_basis.state, 
      legal_basis.municipality, 
      legal_basis.last_reform, 
      legal_basis.url, 
      subjects.id AS subject_id, 
      subjects.subject_name AS subject_name,
      aspects.id AS aspect_id, 
      aspects.aspect_name AS aspect_name
    FROM legal_basis
    JOIN subjects ON legal_basis.subject_id = subjects.id
    LEFT JOIN legal_basis_subject_aspect ON legal_basis.id = legal_basis_subject_aspect.legal_basis_id
    LEFT JOIN aspects ON legal_basis_subject_aspect.aspect_id = aspects.id
    WHERE legal_basis.subject_id = ?
  `

    const values = [subjectId]

    if (aspectIds.length > 0) {
      const placeholders = aspectIds.map(() => '?').join(', ')
      query += ` AND aspects.id IN (${placeholders})`
      values.push(...aspectIds)
    }

    try {
      const [rows] = await pool.query(query, values)

      if (rows.length === 0) return null

      const legalBasisMap = new Map()
      rows.forEach((row) => {
        if (!legalBasisMap.has(row.id)) {
          legalBasisMap.set(row.id, {
            id: row.id,
            legal_name: row.legal_name,
            abbreviation: row.abbreviation,
            classification: row.classification,
            jurisdiction: row.jurisdiction,
            state: row.state,
            municipality: row.municipality,
            lastReform: row.last_reform,
            url: row.url,
            subject: {
              subject_id: row.subject_id,
              subject_name: row.subject_name
            },
            aspects: []
          })
        }
        if (row.aspect_id !== null) {
          legalBasisMap.get(row.id).aspects.push({
            aspect_id: row.aspect_id,
            aspect_name: row.aspect_name
          })
        }
      })
      const legalBasisArray = Array.from(legalBasisMap.values())
      return legalBasisArray.map(
        (legalBasis) =>
          new LegalBasis(
            legalBasis.id,
            legalBasis.legal_name,
            legalBasis.subject,
            legalBasis.aspects,
            legalBasis.abbreviation,
            legalBasis.classification,
            legalBasis.jurisdiction,
            legalBasis.state,
            legalBasis.municipality,
            legalBasis.lastReform,
            legalBasis.url
          )
      )
    } catch (error) {
      console.error(
        'Error retrieving legal basis by subject and aspects:',
        error.message
      )
      throw new ErrorUtils(
        500,
        'Error retrieving legal basis by subject and aspects'
      )
    }
  }

  /**
   * Retrieves legal basis entries filtered by a date range.
   * @param {Date|null} from - Start date as a Date object (optional).
   * @param {Date|null} to - End date as a Date object (optional).
   * @returns {Promise<Array<LegalBasis>|null>} - An array of LegalBasis.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async findByLastReform (from, to) {
    let query = `
    SELECT 
      legal_basis.id,
      legal_basis.legal_name,
      legal_basis.abbreviation,
      legal_basis.classification,
      legal_basis.jurisdiction,
      legal_basis.state,
      legal_basis.municipality,
      legal_basis.last_reform,
      legal_basis.url,
      subjects.id AS subject_id,
      subjects.subject_name AS subject_name,
      aspects.id AS aspect_id,
      aspects.aspect_name AS aspect_name
    FROM legal_basis
    JOIN subjects ON legal_basis.subject_id = subjects.id
    LEFT JOIN legal_basis_subject_aspect ON legal_basis.id = legal_basis_subject_aspect.legal_basis_id
    LEFT JOIN aspects ON legal_basis_subject_aspect.aspect_id = aspects.id
  `
    const values = []
    const conditions = []
    if (from && to) {
      conditions.push('legal_basis.last_reform BETWEEN ? AND ?')
      values.push(from, to)
    } else if (from) {
      conditions.push('legal_basis.last_reform >= ?')
      values.push(from)
    } else if (to) {
      conditions.push('legal_basis.last_reform <= ?')
      values.push(to)
    }
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ')
    }
    try {
      const [rows] = await pool.query(query, values)
      if (rows.length === 0) return null
      const legalBasisMap = new Map()
      rows.forEach((row) => {
        if (!legalBasisMap.has(row.id)) {
          legalBasisMap.set(row.id, {
            id: row.id,
            legal_name: row.legal_name,
            abbreviation: row.abbreviation,
            classification: row.classification,
            jurisdiction: row.jurisdiction,
            state: row.state,
            municipality: row.municipality,
            lastReform: row.last_reform,
            url: row.url,
            subject: {
              subject_id: row.subject_id,
              subject_name: row.subject_name
            },
            aspects: []
          })
        }
        if (row.aspect_id !== null) {
          legalBasisMap.get(row.id).aspects.push({
            aspect_id: row.aspect_id,
            aspect_name: row.aspect_name
          })
        }
      })
      const legalBasisArray = Array.from(legalBasisMap.values())
      return legalBasisArray.map(
        (legalBasis) =>
          new LegalBasis(
            legalBasis.id,
            legalBasis.legal_name,
            legalBasis.subject,
            legalBasis.aspects,
            legalBasis.abbreviation,
            legalBasis.classification,
            legalBasis.jurisdiction,
            legalBasis.state,
            legalBasis.municipality,
            legalBasis.lastReform,
            legalBasis.url
          )
      )
    } catch (error) {
      console.error(
        'Error retrieving legal basis by last reform range:',
        error.message
      )
      throw new ErrorUtils(
        500,
        'Error retrieving legal basis by last reform range'
      )
    }
  }

  /**
   * Finds a legal basis by legalName, excluding the given legalBasisId.
   * @param {string} legalName - The legal name to check for uniqueness.
   * @param {number} legalBasisId - The legal Basis ID to exclude from the check.
   * @returns {Promise<boolean>} - True if a legal basis with the same legal name (excluding the given ID) exists, false otherwise.
   */
  static async existsByNameExcludingId (legalName, legalBasisId) {
    const query = `
    SELECT 1 
    FROM legal_basis 
    WHERE legal_name = ? AND id != ?
    LIMIT 1
  `
    try {
      const [rows] = await pool.query(query, [legalName, legalBasisId])
      return rows.length > 0
    } catch (error) {
      console.error('Error checking if legal basis exists:', error.message)
      throw new ErrorUtils(500, 'Error checking if legal basis exists')
    }
  }

  /**
 * Finds a legal basis by abbreviation, excluding the given legalBasisId.
 * @param {string} abbreviation - The abbreviation to check for uniqueness.
 * @param {number} legalBasisId - The legal basis ID to exclude from the check.
 * @returns {Promise<boolean>} - True if a legal basis with the same abbreviation (excluding the given ID) exists, false otherwise.
 */
  static async existsByAbbreviationExcludingId (abbreviation, legalBasisId) {
    const query = `
    SELECT 1 
    FROM legal_basis 
    WHERE abbreviation = ? AND id != ?
    LIMIT 1
  `
    try {
      const [rows] = await pool.query(query, [abbreviation, legalBasisId])
      return rows.length > 0
    } catch (error) {
      console.error('Error checking if legal basis abbreviation exists:', error.message)
      throw new ErrorUtils(500, 'Error checking if legal basis abbreviation exists')
    }
  }

  /**
   * Updates a legal basis record in the database
   * @param {number} legalBasisId - The ID of the legal basis to update.
     * @param {Object} legalBasis - The data for the legal basis.
   * @param {string} legalBasis.legalName - The name of the legal basis.
   * @param {string} legalBasis.abbreviation - The abbreviation of the legal basis.
   * @param {number} legalBasis.subjectId - The ID of the subject associated with the legal basis.
   * @param {Array<number>} legalBasis.aspectsIds - The IDs of the aspects to associate with the legal basis.
   * @param {string} legalBasis.classification - The classification of the legal basis.
   * @param {string} legalBasis.jurisdiction - The jurisdiction of the legal basis.
   * @param {string} [legalBasis.state] - The state associated with the legal basis.
   * @param {string} [legalBasis.municipality] - The municipality associated with the legal basis.
   * @param {Date} legalBasis.lastReform - The date of the last reform.
   * @param {string} [legalBasis.url] - The URL of the legal basis document.
   * @returns {Promise<LegalBasis|null>} - The updated LegalBasis.
   * @throws {ErrorUtils} - If an error occurs during update.
   */
  static async update (legalBasisId, legalBasis) {
    const {
      legalName,
      abbreviation,
      subjectId,
      aspectsIds,
      classification,
      jurisdiction,
      state,
      municipality,
      lastReform,
      url
    } = legalBasis
    const updateLegalBasisQuery = `
    UPDATE legal_basis
    SET 
      legal_name = IFNULL(?, legal_name),
      abbreviation = IFNULL(?, abbreviation),
      classification = IFNULL(?, classification),
      jurisdiction = IFNULL(?, jurisdiction),
      state = IFNULL(?, state),
      municipality = IFNULL(?, municipality),
      last_reform = IFNULL(?, last_reform),
      url = ?,
      subject_id = IFNULL(?, subject_id)
    WHERE id = ?
  `
    const checkAspectsQuery = `
  SELECT COUNT(*) AS aspectCount
  FROM legal_basis_subject_aspect
  WHERE legal_basis_id = ?
`

    const deleteAspectsQuery = `
  DELETE FROM legal_basis_subject_aspect
  WHERE legal_basis_id = ?
`
    const insertAspectsQuery = (aspectsIds) => `
INSERT INTO legal_basis_subject_aspect (legal_basis_id, subject_id, aspect_id) 
VALUES ${aspectsIds.map(() => '(?, ?, ?)').join(', ')}
`
    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()
      const [updatedResult] = await connection.query(updateLegalBasisQuery, [
        legalName,
        abbreviation,
        classification,
        jurisdiction,
        state,
        municipality,
        lastReform,
        url,
        subjectId,
        legalBasisId
      ])
      if (updatedResult.affectedRows === 0) {
        await connection.rollback()
        return null
      }
      if (aspectsIds && aspectsIds.length > 0) {
        const [aspectCheckResult] = await connection.query(checkAspectsQuery, [
          legalBasisId
        ])
        const { aspectCount } = aspectCheckResult[0]
        if (aspectCount > 0) {
          const [deletedResult] = await connection.query(deleteAspectsQuery, [
            legalBasisId
          ])
          if (deletedResult.affectedRows === 0) {
            await connection.rollback()
            throw new ErrorUtils(500, 'Failed to delete existing aspects')
          }
        }
        const values = aspectsIds.flatMap((aspectId) => [
          legalBasisId,
          subjectId || null,
          aspectId
        ])
        const [insertedResult] = await connection.query(
          insertAspectsQuery(aspectsIds),
          values
        )

        if (insertedResult.affectedRows !== aspectsIds.length) {
          await connection.rollback()
          throw new ErrorUtils(500, 'Failed to insert aspects.')
        }
      }

      await connection.commit()
      const updatedLegalBasis = await this.findById(legalBasisId)
      return updatedLegalBasis
    } catch (error) {
      await connection.rollback()
      console.error('Error updating legal basis:', error.message)
      throw new ErrorUtils(500, 'Error updating legal basis in the database')
    } finally {
      connection.release()
    }
  }

  /**
   * Deletes a legal basis record.
   * @param {number} legalBasisId - The ID of the legal basis to delete.
   * @returns {Promise<boolean>} - Returns true if the deletion is successful, false otherwise.
   * @throws {ErrorUtils} - If an error occurs during deletion.
   */
  static async delete (legalBasisId) {
    const checkAspectsQuery = `
    SELECT COUNT(*) AS aspectCount
    FROM legal_basis_subject_aspect
    WHERE legal_basis_id = ? `
    const deleteAspectsQuery = `
    DELETE FROM legal_basis_subject_aspect
    WHERE legal_basis_id = ? `
    const deleteLegalBasisQuery = `
    DELETE FROM legal_basis
    WHERE id = ? `
    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()
      const [aspectCheckResult] = await connection.query(checkAspectsQuery, [
        legalBasisId
      ])
      const { aspectCount } = aspectCheckResult[0]
      if (aspectCount > 0) {
        const [deletedResult] = await connection.query(deleteAspectsQuery, [
          legalBasisId
        ])
        if (deletedResult.affectedRows === 0) {
          await connection.rollback()
          throw new ErrorUtils(500, 'Failed to delete existing aspects')
        }
      }
      const [result] = await connection.query(deleteLegalBasisQuery, [
        legalBasisId
      ])
      if (result.affectedRows === 0) {
        await connection.rollback()
        return false
      }
      await connection.commit()
      return true
    } catch (error) {
      await connection.rollback()
      console.error('Error deleting legal basis:', error.message)
      throw new ErrorUtils(500, 'Error deleting legal basis from the database')
    } finally {
      connection.release()
    }
  }

  /**
   * Deletes multiple legal basis records.
   * @param {Array<number>} legalBasisIds - An array of IDs of the legal bases to delete.
   * @returns {Promise<boolean>} - Returns true if all deletions are successful, false otherwise.
   * @throws {ErrorUtils} - If an error occurs during deletion.
   */
  static async deleteBatch (legalBasisIds) {
    const checkAspectsQuery = `
      SELECT legal_basis_id, COUNT(*) AS aspectCount
      FROM legal_basis_subject_aspect
      WHERE legal_basis_id IN (?)
      GROUP BY legal_basis_id
    `
    const deleteAspectsQuery = `
      DELETE FROM legal_basis_subject_aspect
      WHERE legal_basis_id IN (?)
    `
    const deleteLegalBasisQuery = `
      DELETE FROM legal_basis
      WHERE id IN (?)
    `
    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()
      const [aspectCheckResults] = await connection.query(checkAspectsQuery, [
        legalBasisIds
      ])
      const aspectIdsToDelete = aspectCheckResults.map(
        (row) => row.legal_basis_id
      )
      if (aspectIdsToDelete.length > 0) {
        const [deletedAspectsResult] = await connection.query(
          deleteAspectsQuery,
          [aspectIdsToDelete]
        )
        if (deletedAspectsResult.affectedRows < aspectIdsToDelete.length) {
          await connection.rollback()
          throw new ErrorUtils(
            500,
            'Failed to delete aspects for some legal basis IDs'
          )
        }
      }
      const [deletedBasisResult] = await connection.query(
        deleteLegalBasisQuery,
        [legalBasisIds]
      )
      if (deletedBasisResult.affectedRows !== legalBasisIds.length) {
        await connection.rollback()
        return false
      }
      await connection.commit()
      return true
    } catch (error) {
      await connection.rollback()
      console.error('Error deleting legal bases:', error.message)
      throw new ErrorUtils(500, 'Error deleting legal basis records in batch')
    } finally {
      connection.release()
    }
  }

  /**
   * Deletes all legal basis records and their relationships.
   * @returns {Promise<boolean>} - Returns true if all deletions are successful.
   * @throws {ErrorUtils} - If an error occurs during deletion.
   */
  static async deleteAll () {
    const deleteAspectsQuery = `
    DELETE FROM legal_basis_subject_aspect
  `
    const deleteLegalBasisQuery = `
    DELETE FROM legal_basis
  `
    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()
      await connection.query(deleteAspectsQuery)
      await connection.query(deleteLegalBasisQuery)
      await connection.commit()
      return true
    } catch (error) {
      await connection.rollback()
      console.error('Error deleting legal bases:', error.message)
      throw new ErrorUtils(500, 'Error deleting all legal basis records')
    } finally {
      connection.release()
    }
  }

  /**
   * Retrieves all the unique classification values.
   *
   * @async
   * @function findClassifications
   * @returns {Promise<string[]|null>} - A promise that resolves to an array of unique classification strings.
   * @throws {ErrorUtils} - If an error occurs while fetching the classifications.
   */
  static async findClassifications () {
    const query = `
    SELECT DISTINCT classification
    FROM legal_basis
  `
    try {
      const [rows] = await pool.query(query)
      if (rows.length === 0) return null
      const classifications = rows.map((row) => row.classification)
      return classifications
    } catch (error) {
      console.error('Error fetching distinct classifications:', error.message)
      throw new ErrorUtils(500, 'Error fetching distinct classifications')
    }
  }

  /**
   * Retrieves all the unique jurisdiction values.
   *
   * @async
   * @function findJurisdictions
   * @returns {Promise<string[]|null>} - A promise that resolves to an array of unique jurisdiction strings.
   * @throws {ErrorUtils} - If an error occurs while fetching the jurisdictions.
   */
  static async findJurisdictions () {
    const query = `
    SELECT DISTINCT jurisdiction
    FROM legal_basis
  `
    try {
      const [rows] = await pool.query(query)
      if (rows.length === 0) return null
      const jurisdictions = rows.map((row) => row.jurisdiction)
      return jurisdictions
    } catch (error) {
      console.error('Error fetching distinct jurisdictions:', error.message)
      throw new ErrorUtils(500, 'Error fetching distinct jurisdictions')
    }
  }
}

export default LegalBasisRepository
