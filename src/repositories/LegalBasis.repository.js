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
 * @param {Object} data - The data for the legal basis.
 * @param {string} data.legalName - The name of the legal basis.
 * @param {string} data.abbreviation - The abbreviation of the legal basis.
 * @param {number} data.subjectId - The ID of the subject associated with the legal basis.
 * @param {Array<number>} data.aspectsIds - The IDs of the aspects to associate with the legal basis.
 * @param {string} data.classification - The classification of the legal basis.
 * @param {string} data.jurisdiction - The jurisdiction of the legal basis.
 * @param {string} [data.state] - The state associated with the legal basis.
 * @param {string} [data.municipality] - The municipality associated with the legal basis.
 * @param {Date} data.lastReform - The date of the last reform.
 * @param {string} [data.url] - The URL of the legal basis document.
 * @returns {Promise<LegalBasis>} - The new LegalBasis.
 * @throws {ErrorUtils} - If an error occurs during insertion.
 */
  static async create (data) {
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
    } = data

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
        const values = aspectsIds.flatMap(aspectId => [legalBasisId, subjectId, aspectId])
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
      rows.forEach(row => {
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
      return Array.from(legalBasisMap.values()).map(legalBasis =>
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
   * Checks if a legal basis with the given name exists in the database.
   * @param {string} legalName - The name of the legal basis to check.
   * @returns {Promise<boolean>} - True if the legal basis exists, false otherwise.
   * @throws {ErrorUtils} - If an error occurs during the check.
   */
  static async exists (legalName) {
    const query = 'SELECT COUNT(*) AS count FROM legal_basis WHERE legal_name = ?'
    try {
      const [rows] = await pool.query(query, [legalName])
      return rows[0].count > 0
    } catch (error) {
      console.error('Error checking legal basis by name:', error.message)
      throw new ErrorUtils(500, 'Error checking legal basis by name')
    }
  }

  /**
   * Retrieves a legal basis record by its ID.
   * @param {number} id - The ID of the legal basis to retrieve.
   * @returns {Promise<LegalBasis|null>} - The legal basis record or null if not found.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async findById (id) {
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
      const [rows] = await pool.query(query, [id])
      if (rows.length === 0) return null
      const legalBasis = rows[0]
      const subject = {
        subject_id: legalBasis.subject_id,
        subject_name: legalBasis.subject_name
      }

      const aspects = rows
        .map(row => ({
          aspect_id: row.aspect_id,
          aspect_name: row.aspect_name
        }))
        .filter(aspect => aspect.aspect_id !== null)

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
   * Retrieves a legal basis record by its name, including related subjects and aspects.
   * @param {string} legalName - The name of the legal basis to retrieve.
   * @returns {Promise<LegalBasis|null>} - The legal basis record or null if not found.
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
    WHERE legal_basis.legal_name = ?
  `
    try {
      const [rows] = await pool.query(query, [legalName])
      if (rows.length === 0) return null
      const legalBasisMap = new Map()
      rows.forEach(row => {
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
      if (legalBasisArray.length === 0) return null
      const legalBasis = legalBasisArray[0]
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
        legalBasis.lastReform,
        legalBasis.url
      )
    } catch (error) {
      console.error('Error retrieving legal basis by name:', error.message)
      throw new ErrorUtils(500, 'Error retrieving legal basis by name')
    }
  }

  /**
 * Retrieves a legal basis record by its abbreviation, including related subjects and aspects.
 * @param {string} abbreviation - The abbreviation of the legal basis to retrieve.
 * @returns {Promise<Array<LegalBasis|null>>}  - The legal basis record or null if not found.
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
    WHERE legal_basis.abbreviation = ?
  `
    try {
      const [rows] = await pool.query(query, [abbreviation])
      if (rows.length === 0) return null

      const legalBasisMap = new Map()
      rows.forEach(row => {
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
      if (legalBasisArray.length === 0) return null
      return legalBasisArray.map(legalBasis => new LegalBasis(
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
      ))
    } catch (error) {
      console.error('Error retrieving legal basis by abbreviation:', error.message)
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
      rows.forEach(row => {
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
      return legalBasisArray.map(legalBasis => new LegalBasis(
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
      ))
    } catch (error) {
      console.error('Error retrieving legal basis by classification:', error.message)
      throw new ErrorUtils(500, 'Error retrieving legal basis by classification')
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
      rows.forEach(row => {
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
      return legalBasisArray.map(legalBasis => new LegalBasis(
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
      ))
    } catch (error) {
      console.error('Error retrieving legal basis by jurisdiction:', error.message)
      throw new ErrorUtils(500, 'Error retrieving legal basis by jurisdiction')
    }
  }

  /**
 * Retrieves legal basis records filtered by state and optionally by municipality,
 * including related subjects and aspects.
 * @param {string} state - The state to filter by.
 * @param {string} [municipality] - The municipality to filter by (optional).
 * @returns {Promise<Array<LegalBasis|null>} - A list of legal basis records.
 * @throws {ErrorUtils} - If an error occurs during retrieval.
 */
  static async findByStateAndMunicipality (state, municipality = null) {
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

    if (municipality) {
      query += ' AND legal_basis.municipality = ?'
      values.push(municipality)
    }

    try {
      const [rows] = await pool.query(query, values)

      if (rows.length === 0) return null

      const legalBasisMap = new Map()
      rows.forEach(row => {
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
      return legalBasisArray.map(legalBasis => new LegalBasis(
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
      ))
    } catch (error) {
      console.error('Error retrieving legal basis by state and municipality:', error.message)
      throw new ErrorUtils(500, 'Error retrieving legal basis by state and municipality')
    }
  }
}

export default LegalBasisRepository
