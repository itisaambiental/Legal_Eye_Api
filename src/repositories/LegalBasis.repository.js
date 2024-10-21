// repositories/LegalBasis.repository.js

import { pool } from '../config/db.config.js'
import LegalBasis from '../models/LegalBasis.model.js'
import ErrorUtils from '../utils/Error.js'

/**
 * Repository class for handling database operations related to LegalBasis.
 */
class LegalBasisRepository {
  /**
   * Creates a new legal basis record in the database.
   * @param {Object} data - The data for the legal basis.
   * @param {string} data.legalName - The name of the legal basis.
   * @param {string} data.abbreviation - The abbreviation of the legal basis.
   * @param {string} data.classification - The classification of the legal basis.
   * @param {string} data.jurisdiction - The jurisdiction of the legal basis.
   * @param {string} [data.state] - The state associated with the legal basis.
   * @param {string} [data.municipality] - The municipality associated with the legal basis.
   * @param {Date} data.lastReform - The date of the last reform.
   * @param {string} [data.url] - The URL of the legal basis document.
   * @returns {Promise<number>} - The ID of the newly created legal basis.
   * @throws {ErrorUtils} - If an error occurs during insertion.
   */
  static async create (data) {
    const { legalName, abbreviation, classification, jurisdiction, state, municipality, lastReform, url } = data
    const query = `
      INSERT INTO legal_basis (legal_name, abbreviation, classification, jurisdiction, state, municipality, last_reform, url) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
    try {
      const [result] = await pool.query(query, [
        legalName,
        abbreviation,
        classification,
        jurisdiction,
        state,
        municipality,
        lastReform,
        url
      ])
      return result.insertId
    } catch (error) {
      console.error('Error creating legal basis:', error.message)
      throw new ErrorUtils(500, 'Error creating legal basis in the database')
    }
  }

  /**
   * Updates a legal basis record by its ID.
   * @param {number} id - The ID of the legal basis to update.
   * @param {Object} data - The data to update.
   * @param {string} [data.legalName] - The new legal name.
   * @param {string} [data.abbreviation] - The new abbreviation.
   * @param {string} [data.classification] - The new classification.
   * @param {string} [data.jurisdiction] - The new jurisdiction.
   * @param {string} [data.url] - The new URL.
   * @returns {Promise<boolean>} - True if the record was updated, false otherwise.
   * @throws {ErrorUtils} - If an error occurs during the update.
   */
  static async update (id, data) {
    const { legalName, abbreviation, classification, jurisdiction, url } = data
    const query = `
      UPDATE legal_basis 
      SET 
        legal_name = IFNULL(?, legal_name),
        abbreviation = IFNULL(?, abbreviation),
        classification = IFNULL(?, classification),
        jurisdiction = IFNULL(?, jurisdiction),
        url = IFNULL(?, url)
      WHERE id = ?
    `
    try {
      const [result] = await pool.query(query, [legalName, abbreviation, classification, jurisdiction, url, id])
      return result.affectedRows > 0
    } catch (error) {
      console.error('Error updating legal basis:', error.message)
      throw new ErrorUtils(500, 'Error updating legal basis in the database')
    }
  }

  /**
   * Deletes a legal basis record by its ID.
   * @param {number} id - The ID of the legal basis to delete.
   * @returns {Promise<boolean>} - True if the record was deleted, false otherwise.
   * @throws {ErrorUtils} - If an error occurs during deletion.
   */
  static async delete (id) {
    const query = 'DELETE FROM legal_basis WHERE id = ?'
    try {
      const [result] = await pool.query(query, [id])
      return result.affectedRows > 0
    } catch (error) {
      console.error('Error deleting legal basis:', error.message)
      throw new ErrorUtils(500, 'Error deleting legal basis from the database')
    }
  }

  /**
   * Deletes multiple legal basis records by their IDs.
   * @param {Array<number>} ids - The IDs of the legal basis records to delete.
   * @returns {Promise<boolean>} - True if records were deleted, false otherwise.
   * @throws {ErrorUtils} - If an error occurs during deletion.
   */
  static async deleteBatch (ids) {
    const query = 'DELETE FROM legal_basis WHERE id IN (?)'
    try {
      const [result] = await pool.query(query, [ids])
      return result.affectedRows > 0
    } catch (error) {
      console.error('Error deleting legal basis records:', error.message)
      throw new ErrorUtils(500, 'Error deleting legal basis records from the database')
    }
  }

  /**
   * Retrieves a legal basis record by its ID.
   * @param {number} id - The ID of the legal basis to retrieve.
   * @returns {Promise<LegalBasis|null>} - The legal basis record or null if not found.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async findById (id) {
    const query = 'SELECT * FROM legal_basis WHERE id = ?'
    try {
      const [rows] = await pool.query(query, [id])
      if (rows.length === 0) return null

      const legalBasis = rows[0]
      return new LegalBasis(
        legalBasis.id,
        legalBasis.legal_name,
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
   * Retrieves all legal basis records from the database.
   * @returns {Promise<Array<LegalBasis>>} - A list of all legal basis records.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async findAll () {
    const query = 'SELECT * FROM legal_basis'
    try {
      const [rows] = await pool.query(query)
      return rows.map((legalBasis) =>
        new LegalBasis(
          legalBasis.id,
          legalBasis.legal_name,
          legalBasis.abbreviation,
          legalBasis.classification,
          legalBasis.jurisdiction,
          legalBasis.state,
          legalBasis.municipality,
          legalBasis.last_reform,
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
}

export default LegalBasisRepository
