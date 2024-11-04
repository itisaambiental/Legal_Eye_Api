import { pool } from '../config/db.config.js'
import ErrorUtils from '../utils/Error.js'
import Aspect from '../models/Aspect.model.js'

/**
 * Repository class for handling database operations related to Aspects.
 */
class AspectsRepository {
  /**
     * Inserts a new aspect linked to a specific subject into the database.
     * @param {number} subjectId - The ID of the subject to link this aspect to.
     * @param {string} aspectName - The name of the aspect to insert.
     * @returns {Promise<id>} - Returns the ID of the created aspect.
     * @throws {ErrorUtils} - If an error occurs during insertion.
     */
  static async createSubject (subjectId, aspectName) {
    const query = `
      INSERT INTO aspects (subject_id, aspect_name)
      VALUES (?, ?)
    `
    try {
      const [result] = await pool.query(query, [subjectId, aspectName])
      return result.insertId
    } catch (error) {
      console.error('Error creating aspect:', error.message)
      throw new ErrorUtils(500, 'Error inserting aspect into the database')
    }
  }

  /**
    * Fetches an aspect by its ID from the database.
    * @param {number} id - The ID of the aspect to retrieve.
    * @returns {Promise<Aspect|null>} - Returns the Aspect instance or null if not found.
    * @throws {ErrorUtils} - If an error occurs during retrieval.
    */
  static async findById (id) {
    const query = `
      SELECT aspects.id, aspects.subject_id, aspects.aspect_name, subjects.subject_name
      FROM aspects
      JOIN subjects ON aspects.subject_id = subjects.id
      WHERE aspects.id = ?
    `
    try {
      const [rows] = await pool.query(query, [id])
      if (rows.length === 0) return null
      const row = rows[0]
      return new Aspect(row.id, row.aspect_name, row.subject_id, row.subject_name)
    } catch (error) {
      console.error('Error fetching aspect by ID:', error.message)
      throw new ErrorUtils(500, 'Error fetching aspect from the database')
    }
  }

  /**
     * Fetches an aspect by its name from the database.
     * @param {string} aspectName - The name of the aspect to retrieve.
     * @returns {Promise<Aspect|null>} - Returns the Aspect instance or null if not found.
     * @throws {ErrorUtils} - If an error occurs during retrieval.
     */
  static async findByName (aspectName) {
    const query = `
      SELECT aspects.id, aspects.subject_id, aspects.aspect_name, subjects.subject_name
      FROM aspects
      JOIN subjects ON aspects.subject_id = subjects.id
      WHERE aspects.aspect_name = ?
    `
    try {
      const [rows] = await pool.query(query, [aspectName])
      if (rows.length === 0) return null
      const row = rows[0]
      return new Aspect(row.id, row.aspect_name, row.subject_id, row.subject_name)
    } catch (error) {
      console.error('Error fetching aspect by name:', error.message)
      throw new ErrorUtils(500, 'Error fetching aspect from the database')
    }
  }

  /**
     * Fetches all aspects associated with a specific subject from the database.
     * @param {number} subjectId - The ID of the subject to retrieve aspects for.
     * @returns {Promise<Array<Aspect|null>>} - Returns a list of Aspect instances.
     * @throws {ErrorUtils} - If an error occurs during retrieval.
     */
  static async findBySubjectId (subjectId) {
    const query = `
      SELECT aspects.id, aspects.subject_id, aspects.aspect_name, subjects.subject_name
      FROM aspects
      JOIN subjects ON aspects.subject_id = subjects.id
      WHERE aspects.subject_id = ?
    `
    try {
      const [rows] = await pool.query(query, [subjectId])
      if (rows.length === 0) return null
      return rows.map(row => new Aspect(
        row.id,
        row.aspect_name,
        row.subject_id,
        row.subject_name
      ))
    } catch (error) {
      console.error('Error fetching aspects by subject ID:', error.message)
      throw new ErrorUtils(500, 'Error fetching aspects from the database')
    }
  }

  /**
     * Updates an aspect by its ID, associated with a specific subject.
     * @param {number} id - The ID of the aspect to update.
     * @param {string|null} aspectName - The new name of the aspect, or null to keep the current name.
     * @returns {Promise<boolean>} - Returns true if the update is successful, false otherwise.
     * @throws {ErrorUtils} - If an error occurs during update.
     */
  static async updateById (id, aspectName) {
    const query = `
      UPDATE aspects
      SET aspect_name = IFNULL(?, aspect_name)
      WHERE id = ?
    `
    try {
      const [rows] = await pool.query(query, [aspectName, id])
      if (rows.affectedRows === 0) {
        return false
      }
      return true
    } catch (error) {
      console.error('Error updating aspect:', error.message)
      throw new ErrorUtils(500, 'Error updating aspect in the database')
    }
  }

  /**
     * Deletes an aspect by its ID.
     * @param {number} id - The ID of the aspect to delete.
     * @returns {Promise<boolean>} - Returns true if the deletion is successful, false otherwise.
     * @throws {ErrorUtils} - If an error occurs during deletion.
     */
  static async deleteById (id) {
    const query = `
      DELETE FROM aspects
      WHERE id = ?
    `
    try {
      const [rows] = await pool.query(query, [id])
      if (rows.affectedRows === 0) {
        return false
      }
      return true
    } catch (error) {
      console.error('Error deleting aspect:', error.message)
      throw new ErrorUtils(500, 'Error deleting aspect from the database')
    }
  }
}

export default AspectsRepository
