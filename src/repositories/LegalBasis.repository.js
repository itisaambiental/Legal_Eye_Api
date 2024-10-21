// repositories/LegalBasis.repository.js

import { pool } from '../config/db.config.js'
import LegalBasis from '../models/LegalBasis.model.js'
import ErrorUtils from '../utils/Error.js'

class LegalBasisRepository {
  // Method to create a new legal basis record in the database
  static async create (data) {
    const { legalName, abbreviation, classification, jurisdiction, state, municipality, lastReform, url } = data
    const query = `
      INSERT INTO legal_basis (legal_name, abbreviation, classification, jurisdiction, state, municipality, last_reform, url) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
    try {
      const [result] = await pool.query(query, [legalName, abbreviation, classification, jurisdiction, state, municipality, lastReform, url])
      return result.insertId
    } catch (error) {
      console.error('Error creating legal basis:', error)
      throw new ErrorUtils(500, 'Error creating legal basis in the database')
    }
  }

  // Method to update a legal basis record by its ID
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
      console.error('Error updating legal basis:', error)
      throw new ErrorUtils(500, 'Error updating legal basis in the database')
    }
  }

  // Method to delete a legal basis record by its ID
  static async delete (id) {
    const query = 'DELETE FROM legal_basis WHERE id = ?'
    try {
      const [result] = await pool.query(query, [id])
      return result.affectedRows > 0
    } catch (error) {
      console.error('Error deleting legal basis:', error)
      throw new ErrorUtils(500, 'Error deleting legal basis from the database')
    }
  }

  // Method to delete multiple legal basis records by their IDs
  static async deleteBatch (ids) {
    const query = `
          DELETE FROM legal_basis WHERE id IN (?)
        `
    try {
      const [result] = await pool.query(query, [ids])
      return result.affectedRows > 0
    } catch (error) {
      console.error('Error deleting legal basis records:', error)
      throw new ErrorUtils(500, 'Error deleting legal basis records from the database')
    }
  }

  // Method to retrieve a legal basis record by its ID
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
        legalBasis.url
      )
    } catch (error) {
      console.error('Error retrieving legal basis by ID:', error)
      throw new ErrorUtils(500, 'Error retrieving legal basis by ID')
    }
  }

  // Method to retrieve all legal basis records from the database
  static async findAll () {
    const query = 'SELECT * FROM legal_basis'
    try {
      const [rows] = await pool.query(query)
      return rows.map(legalBasis =>
        new LegalBasis(
          legalBasis.id,
          legalBasis.legal_name,
          legalBasis.abbreviation,
          legalBasis.classification,
          legalBasis.jurisdiction,
          legalBasis.url
        )
      )
    } catch (error) {
      console.error('Error retrieving all legal basis records:', error)
      throw new ErrorUtils(500, 'Error retrieving all legal basis records')
    }
  }

  // Method to check if a legal basis exists in the database
  static async exists (legalName) {
    const query = 'SELECT * FROM legal_basis WHERE legal_name = ?'
    try {
      const [rows] = await pool.query(query, [legalName])
      return rows.length > 0
    } catch (error) {
      console.error('Error checking legal basis by name:', error)
      throw new ErrorUtils(500, 'Error checking legal basis by name')
    }
  }
}

export default LegalBasisRepository
