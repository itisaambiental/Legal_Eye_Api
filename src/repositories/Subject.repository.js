import { pool } from '../config/db.config.js'
import ErrorUtils from '../utils/Error.js'
import Subject from '../models/Subject.model.js'

/**
 * Repository class for handling database operations related to Subjects.
 */
class SubjectsRepository {
  /**
   * Inserts a new subject into the database.
   * @param {string} subjectName - The name of the subject to insert.
   * @returns {Promise<id>} - Returns the id of the created Subject.
   * @throws {ErrorUtils} - If an error occurs during insertion.
   */
  static async createSubject (subjectName) {
    const query = `
      INSERT INTO subjects (subject_name)
      VALUES (?)
    `
    try {
      const [result] = await pool.query(query, [subjectName])
      return result.insertId
    } catch (error) {
      console.error('Error creating subject:', error.message)
      throw new ErrorUtils(500, 'Error inserting subject into the database')
    }
  }

  /**
   * Fetches all subjects from the database.
   * @returns {Promise<Array<Subject|null>>} - Returns a list of Subject instances.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async findAll () {
    try {
      const [rows] = await pool.query(`
        SELECT id, subject_name
        FROM subjects
      `)
      if (rows.length === 0) return null
      return rows.map(subject => new Subject(
        subject.id,
        subject.subject_name
      ))
    } catch (error) {
      console.error('Error fetching subjects:', error.message)
      throw new ErrorUtils(500, 'Error fetching subjects from the database')
    }
  }

  /**
   * Fetches a subject by its ID from the database.
   * @param {number} id - The ID of the subject to retrieve.
   * @returns {Promise<Subject|null>} - Returns the Subject instance or null if not found.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async findById (id) {
    try {
      const [rows] = await pool.query(`
        SELECT id, subject_name
        FROM subjects
        WHERE id = ?
      `, [id])

      if (rows.length === 0) return null

      const subject = rows[0]
      return new Subject(subject.id, subject.subject_name)
    } catch (error) {
      console.error('Error fetching subject by ID:', error.message)
      throw new ErrorUtils(500, 'Error fetching subject from the database')
    }
  }

  /**
   * Finds subjects in the database using an array of IDs.
   * @param {Array<number>} subjectIds - Array of subject IDs to find.
   * @returns {Promise<Array<number>>} - Array of found subject IDs.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async findByIds (subjectIds) {
    const query = `
    SELECT id FROM subjects WHERE id IN (?)
  `
    try {
      const [rows] = await pool.query(query, [subjectIds])
      return rows.map(row => row.id)
    } catch (error) {
      console.error('Error finding subjects by IDs:', error.message)
      throw new ErrorUtils(500, 'Error finding subjects by IDs from the database')
    }
  }

  /**
   * Fetches a subject by its name from the database.
   * @param {string} subjectName - The name of the subject to retrieve.
   * @returns {Promise<Subject|null>} - Returns the Subject instance or null if not found.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async findByName (subjectName) {
    try {
      const [rows] = await pool.query(`
        SELECT id, subject_name
        FROM subjects
        WHERE subject_name = ?
      `, [subjectName])

      if (rows.length === 0) return null

      const subject = rows[0]
      return new Subject(subject.id, subject.subject_name)
    } catch (error) {
      console.error('Error fetching subject by name:', error.message)
      throw new ErrorUtils(500, 'Error fetching subject from the database')
    }
  }

  /**
   * Updates a subject by its ID using IFNULL to preserve existing values.
   * @param {number} id - The ID of the subject to update.
   * @param {string|null} subjectName - The new name of the subject, or null to keep the current name.
   * @returns {Promise<boolean>} - Returns true if the update is successful, false otherwise.
   * @throws {ErrorUtils} - If an error occurs during update.
   */
  static async updateById (id, subjectName) {
    const query = `
      UPDATE subjects
      SET subject_name = IFNULL(?, subject_name)
      WHERE id = ?
    `

    try {
      const [rows] = await pool.query(query, [subjectName, id])
      if (rows.affectedRows === 0) {
        return false
      }
      return true
    } catch (error) {
      console.error('Error updating subject:', error.message)
      throw new ErrorUtils(500, 'Error updating subject in the database')
    }
  }

  /**
   * Deletes a subject by its ID.
   * @param {number} id - The ID of the subject to delete.
   * @returns {Promise<boolean>} - Returns true if the deletion is successful, false otherwise.
   * @throws {ErrorUtils} - If an error occurs during deletion.
   */
  static async deleteById (id) {
    try {
      const [rows] = await pool.query(`
        DELETE FROM subjects
        WHERE id = ?
      `, [id])

      if (rows.affectedRows === 0) {
        return false
      }
      return true
    } catch (error) {
      console.error('Error deleting subject:', error.message)
      throw new ErrorUtils(500, 'Error deleting subject from the database')
    }
  }

  /**
 * Deletes multiple subjects from the database using an array of IDs.
 * @param {Array<number>} subjectIds - Array of subject IDs to delete.
 * @returns {Promise<boolean>} - True if subjects were deleted, otherwise false.
 * @throws {ErrorUtils} - If an error occurs during the deletion.
 */
  static async deleteBatch (subjectIds) {
    const query = `
    DELETE FROM subjects WHERE id IN (?)
  `
    try {
      const [result] = await pool.query(query, [subjectIds])
      if (result.affectedRows === 0) {
        return false
      }
      return true
    } catch (error) {
      console.error('Error deleting subjects:', error.message)
      throw new ErrorUtils(500, 'Error deleting subjects from the database')
    }
  }

  /**
   * Deletes all subjects from the database.
   * @returns {Promise<void>}
   * @throws {ErrorUtils} - If an error occurs during deletion.
   */
  static async deleteAll () {
    try {
      await pool.query('DELETE FROM subjects')
    } catch (error) {
      console.error('Error deleting all subjects:', error.message)
      throw new ErrorUtils(500, 'Error deleting all subjects from the database')
    }
  }
}

export default SubjectsRepository
