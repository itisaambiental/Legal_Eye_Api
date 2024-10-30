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
   * @returns {Promise<Subject>} - Returns the created Subject instance.
   * @throws {ErrorUtils} - If an error occurs during insertion.
   */
  static async createSubject (subjectName) {
    const query = `
      INSERT INTO subjects (subject_name)
      VALUES (?)
    `

    try {
      const [result] = await pool.query(query, [subjectName])
      return new Subject(result.insertId, subjectName)
    } catch (error) {
      console.error('Error creating subject:', error.message)
      throw new ErrorUtils(500, 'Error inserting subject into the database')
    }
  }

  /**
   * Fetches all subjects from the database.
   * @returns {Promise<Array<Subject>>} - Returns a list of Subject instances.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async getAllSubjects () {
    try {
      const [subjects] = await pool.query(`
        SELECT id, subject_name
        FROM subjects
      `)

      return subjects.map(subject => new Subject(
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
  static async getSubjectById (id) {
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
   * Fetches a subject by its name from the database.
   * @param {string} subjectName - The name of the subject to retrieve.
   * @returns {Promise<Subject|null>} - Returns the Subject instance or null if not found.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async getSubjectByName (subjectName) {
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
  static async updateSubjectById (id, subjectName) {
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
  static async deleteSubjectById (id) {
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
}

export default SubjectsRepository
