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
 * @returns {Promise<Array<Object>>} - Array of objects with found subject IDs and names.
 * @throws {ErrorUtils} - If an error occurs during retrieval.
 */
  static async findByIds (subjectIds) {
    const query = `
    SELECT id, subject_name FROM subjects WHERE id IN (?)
  `
    try {
      const [rows] = await pool.query(query, [subjectIds])
      return rows.map(row => ({ id: row.id, name: row.name }))
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

  /**
 * Checks if a subject or any of its aspects is associated with any legal basis.
 * @param {number} subjectId - The ID of the subject to check.
 * @returns {Promise<Object<boolean>>} - Returns an object with two boolean values:
 *      - isAssociatedToLegalBasis: true if the subject is associated with one or more legal bases.
 *      - isSubjectAspectAssociatedToLegalBasis: true if any aspect of the subject is associated with legal bases.
 * @throws {Error} - If an error occurs while querying the database.
 */
  static async checkSubjectLegalBasisAssociations (subjectId) {
    try {
      const [rows] = await pool.query(`
      SELECT 
          COUNT(DISTINCT lb.id) AS legalBasisCount, 
          COUNT(DISTINCT lbsa.aspect_id) AS aspectAssociationCount
      FROM subjects s
      LEFT JOIN legal_basis lb ON s.id = lb.subject_id
      LEFT JOIN legal_basis_subject_aspect lbsa ON lb.id = lbsa.legal_basis_id AND s.id = lbsa.subject_id
      WHERE s.id = ?
    `, [subjectId])
      const { legalBasisCount, aspectAssociationCount } = rows[0]
      return {
        isAssociatedToLegalBasis: legalBasisCount > 0,
        isSubjectAspectAssociatedToLegalBasis: aspectAssociationCount > 0
      }
    } catch (error) {
      console.error('Error checking subject associations:', error.message)
      throw new ErrorUtils(500, 'Error checking subject associations')
    }
  }

  /**
 * Checks if any of the subjects in the given array are associated with any legal basis or aspects.
 * @param {Array<number>} subjectIds - Array of subject IDs to check.
 * @returns {Promise<Array<Object>>} - Returns an array of objects with subject ID, name, and their association status.
 * @throws {Error} - If an error occurs while querying the database.
 */
  static async checkSubjectsLegalBasisAssociationsBatch (subjectIds) {
    try {
      const [rows] = await pool.query(`
      SELECT 
          s.id AS subjectId,
          s.subject_name AS subjectName,
          COUNT(DISTINCT lb.id) AS legalBasisCount, 
          COUNT(DISTINCT lbsa.aspect_id) AS aspectAssociationCount
      FROM subjects s
      LEFT JOIN legal_basis lb ON s.id = lb.subject_id
      LEFT JOIN legal_basis_subject_aspect lbsa ON lb.id = lbsa.legal_basis_id AND s.id = lbsa.subject_id
      WHERE s.id IN (?) 
      GROUP BY s.id
    `, [subjectIds])

      return rows.map(row => ({
        id: row.subjectId,
        name: row.subjectName,
        isAssociatedToLegalBasis: row.legalBasisCount > 0,
        isSubjectAspectAssociatedToLegalBasis: row.aspectAssociationCount > 0
      }))
    } catch (error) {
      console.error('Error checking batch associations:', error.message)
      throw new Error('Error checking batch associations')
    }
  }
}

export default SubjectsRepository
