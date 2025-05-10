import { pool } from '../config/db.config.js'
import HttpException from '../utils/HttpException.js'
import Subject from '../models/Subject.model.js'

/**
 * Repository class for handling database operations related to Subjects.
 */
class SubjectsRepository {
  /**
   * Inserts a new subject into the database.
   * @param {string} subjectName - The name of the subject to insert.
   * @param {string} abbreviation - The abbreviation of the subject.
   * @param {number} orderIndex - The order index of the subject.
   * @returns {Promise<Subject>} - Returns the the created Subject.
   * @throws {HttpException} - If an error occurs during insertion.
   */
  static async create (subjectName, abbreviation, orderIndex) {
    const query = `
      INSERT INTO subjects (subject_name, abbreviation, order_index)
      VALUES (?, ?, ?)
    `
    try {
      const [result] = await pool.query(query, [subjectName, abbreviation, orderIndex])
      const subject = await this.findById(result.insertId)
      return subject
    } catch (error) {
      console.error('Error creating subject:', error.message)
      throw new HttpException(500, 'Error inserting subject into the database')
    }
  }

  /**
   * Fetches all subjects from the database.
   * @returns {Promise<Array<Subject|null>>} - Returns a list of Subject instances.
   * @throws {HttpException} - If an error occurs during retrieval.
   */
  static async findAll () {
    try {
      const [rows] = await pool.query(`
        SELECT id, subject_name, abbreviation, order_index
        FROM subjects
        ORDER BY order_index ASC
      `)
      if (rows.length === 0) return null
      return rows.map(
        (subject) => new Subject(
          subject.id,
          subject.subject_name,
          subject.abbreviation,
          subject.order_index
        )
      )
    } catch (error) {
      console.error('Error fetching subjects:', error.message)
      throw new HttpException(500, 'Error fetching subjects from the database')
    }
  }

  /**
   * Fetches a subject by its ID from the database.
   * @param {number} id - The ID of the subject to retrieve.
   * @returns {Promise<Subject|null>} - Returns the Subject instance or null if not found.
   * @throws {HttpException} - If an error occurs during retrieval.
   */
  static async findById (id) {
    try {
      const [rows] = await pool.query(
        `
        SELECT id, subject_name, abbreviation, order_index
        FROM subjects
        WHERE id = ?
        `,
        [id]
      )
      if (rows.length === 0) return null
      const subject = rows[0]
      return new Subject(
        subject.id,
        subject.subject_name,
        subject.abbreviation,
        subject.order_index
      )
    } catch (error) {
      console.error('Error fetching subject by ID:', error.message)
      throw new HttpException(500, 'Error fetching subject from the database')
    }
  }

  /**
   * Finds subjects in the database using an array of IDs.
   * @param {Array<number>} subjectIds - Array of subject IDs to find.
   * @returns {Promise<Subject[]>>} - Array of objects with found subject IDs and names.
   * @throws {HttpException} - If an error occurs during retrieval.
   */
  static async findByIds (subjectIds) {
    if (subjectIds.length === 0) {
      return []
    }
    const query = `
    SELECT id, subject_name, abbreviation, order_index
    FROM subjects
    WHERE id IN (?)
  `
    try {
      const [rows] = await pool.query(query, [subjectIds])
      return rows.map(
        (subject) => new Subject(
          subject.id,
          subject.subject_name,
          subject.abbreviation,
          subject.order_index
        )
      )
    } catch (error) {
      console.error('Error finding subjects by IDs:', error.message)
      throw new HttpException(
        500,
        'Error finding subjects by IDs from the database'
      )
    }
  }

  /**
   * Checks if a subject with the given name exists, excluding the specified subject ID.
   * @param {string} subjectName - The subject name to check for uniqueness.
   * @param {number} subjectId - The subject ID to exclude from the check.
   * @returns {Promise<boolean>} - True if a subject with the same name exists (excluding the given ID), false otherwise.
   */
  static async existsByNameExcludingId (subjectName, subjectId) {
    const query = `
    SELECT 1 
    FROM subjects 
    WHERE subject_name = ? AND id != ?
    LIMIT 1
  `
    try {
      const [rows] = await pool.query(query, [subjectName, subjectId])
      return rows.length > 0
    } catch (error) {
      console.error('Error checking if subject exists:', error.message)
      throw new HttpException(500, 'Error checking if subject exists')
    }
  }

  /**
   * Checks if a subject exists with the given name.
   * @param {string} subjectName - The name of the subject to check for existence.
   * @returns {Promise<boolean>} - True if a subject with the same name exists, false otherwise.
   * @throws {HttpException} - If an error occurs during the check.
   */
  static async existsBySubjectName (subjectName) {
    const query = `
    SELECT 1 
    FROM subjects 
    WHERE subject_name = ?
    LIMIT 1
  `
    try {
      const [rows] = await pool.query(query, [subjectName])
      return rows.length > 0
    } catch (error) {
      console.error('Error checking if subject exists by name:', error.message)
      throw new HttpException(500, 'Error checking if subject exists by name')
    }
  }

  /**
   * Fetches subjects from the database by a partial match of their name.
   * @param {string} subjectName - A partial or full name of the subject to search for.
   * @returns {Promise<Array<Subject|null>>} - Returns an array of Subject instances matching the criteria.
   * @throws {HttpException} - If an error occurs during retrieval.
   */
  static async findByName (subjectName) {
    const searchValue = `%${subjectName}%`
    try {
      const [rows] = await pool.query(
        `
        SELECT id, subject_name, abbreviation, order_index
        FROM subjects
        WHERE subject_name LIKE ?
        `,
        [searchValue]
      )
      if (rows.length === 0) return null
      return rows.map(
        (subject) => new Subject(
          subject.id,
          subject.subject_name,
          subject.abbreviation,
          subject.order_index
        )
      )
    } catch (error) {
      console.error('Error fetching subjects by partial name:', error.message)
      throw new HttpException(500, 'Error fetching subjects from the database')
    }
  }

  /**
 * Updates a subject in the database.
 * @param {number} id - The ID of the subject to update.
 * @param {string} subjectName - The new name of the subject.
 * @param {string} abbreviation - The updated abbreviation.
 * @param {number} orderIndex - The updated display order.
 * @returns {Promise<Subject|null>} - The updated Subject instance.
 * @throws {HttpException} - If an error occurs during update.
 */
  static async update (id, subjectName, abbreviation, orderIndex) {
    const query = `
    UPDATE subjects
    SET subject_name = ?, abbreviation = ?, order_index = ?
    WHERE id = ?
  `
    try {
      const [result] = await pool.query(query, [subjectName, abbreviation, orderIndex, id])
      if (result.affectedRows === 0) return null

      return await this.findById(id)
    } catch (error) {
      console.error('Error updating subject:', error.message)
      throw new HttpException(500, 'Error updating subject in the database')
    }
  }

  /**
   * Deletes a subject by its ID.
   * @param {number} id - The ID of the subject to delete.
   * @returns {Promise<boolean>} - Returns true if the deletion is successful, false otherwise.
   * @throws {HttpException} - If an error occurs during deletion.
   */
  static async deleteById (id) {
    try {
      const [rows] = await pool.query(
        `
        DELETE FROM subjects
        WHERE id = ?
      `,
        [id]
      )
      if (rows.affectedRows === 0) {
        return false
      }
      return true
    } catch (error) {
      console.error('Error deleting subject:', error.message)
      throw new HttpException(500, 'Error deleting subject from the database')
    }
  }

  /**
   * Deletes multiple subjects from the database using an array of IDs.
   * @param {Array<number>} subjectIds - Array of subject IDs to delete.
   * @returns {Promise<boolean>} - True if subjects were deleted, otherwise false.
   * @throws {HttpException} - If an error occurs during the deletion.
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
      throw new HttpException(500, 'Error deleting subjects from the database')
    }
  }

  /**
   * Deletes all subjects from the database.
   * @returns {Promise<void>}
   * @throws {HttpException} - If an error occurs during deletion.
   */
  static async deleteAll () {
    try {
      await pool.query('DELETE FROM subjects')
    } catch (error) {
      console.error('Error deleting all subjects:', error.message)
      throw new HttpException(
        500,
        'Error deleting all subjects from the database'
      )
    }
  }

  /**
 * Checks if a subject is associated with any legal basis.
 * @param {number} subjectId - The ID of the subject to check.
 * @returns {Promise<{ isAssociatedToLegalBasis: boolean }>}
 * - Returns an object containing:
   - `isAssociatedToLegalBasis` (boolean): True if the subject is linked to at least one legal basis.
 * @throws {HttpException} - If an error occurs while querying the database.
 */
  static async checkSubjectLegalBasisAssociations (subjectId) {
    try {
      const [rows] = await pool.query(
      `
      SELECT COUNT(*) AS legalBasisCount
      FROM legal_basis
      WHERE subject_id = ?
    `,
      [subjectId]
      )

      return {
        isAssociatedToLegalBasis: rows[0].legalBasisCount > 0
      }
    } catch (error) {
      console.error('Error checking subject legal basis associations:', error.message)
      throw new HttpException(500, 'Error checking subject legal basis associations')
    }
  }

  /**
 * Checks if any of the subjects in the given array are associated with any legal basis.
 * @param {Array<number>} subjectIds - Array of subject IDs to check.
 * @returns {Promise<Array<{ id: number, name: string, isAssociatedToLegalBasis: boolean }>>}
 * - Returns an array of objects where each object contains:
 *    - `id` (number): The subject ID.
 *    - `name` (string): The name of the subject.
 *    - `isAssociatedToLegalBasis` (boolean): True if the subject is linked to at least one legal basis.
 * @throws {HttpException} - If an error occurs while querying the database.
 */
  static async checkSubjectsLegalBasisAssociationsBatch (subjectIds) {
    try {
      const [rows] = await pool.query(
      `
      SELECT 
          s.id AS subjectId,
          s.subject_name AS subjectName,
          COUNT(lb.id) AS legalBasisCount
      FROM subjects s
      LEFT JOIN legal_basis lb ON s.id = lb.subject_id
      WHERE s.id IN (?) 
      GROUP BY s.id
    `,
      [subjectIds]
      )
      return rows.map(row => ({
        id: row.subjectId,
        name: row.subjectName,
        isAssociatedToLegalBasis: row.legalBasisCount > 0
      }))
    } catch (error) {
      console.error('Error checking batch subject legal basis associations:', error.message)
      throw new HttpException(500, 'Error checking batch subject legal basis associations')
    }
  }

  /**
 * Checks if a subject is associated with any requirements.
 * @param {number} subjectId - The ID of the subject to check.
 * @returns {Promise<{ isAssociatedToRequirements: boolean }>}
 * - Returns an object containing:
   - `isAssociatedToRequirements` (boolean): True if the subject is linked to at least one requirement.
 * @throws {HttpException} - If an error occurs while querying the database.
 */
  static async checkSubjectRequirementAssociations (subjectId) {
    try {
      const [rows] = await pool.query(
      `
      SELECT COUNT(*) AS requirementCount
      FROM requirements
      WHERE subject_id = ?
    `,
      [subjectId]
      )
      return {
        isAssociatedToRequirements: rows[0].requirementCount > 0
      }
    } catch (error) {
      console.error('Error checking subject requirement associations:', error.message)
      throw new HttpException(500, 'Error checking subject requirement associations')
    }
  }

  /**
 * Checks if any of the subjects in the given array are associated with any requirements.
 * @param {Array<number>} subjectIds - Array of subject IDs to check.
 * @returns {Promise<Array<{ id: number, name: string, isAssociatedToRequirements: boolean }>>}
 * - Returns an array of objects where each object contains:
 *    - `id` (number): The subject ID.
 *    - `name` (string): The name of the subject.
 *    - `isAssociatedToRequirements` (boolean): True if the subject has at least one associated requirement.
 * @throws {HttpException} - If an error occurs while querying the database.
 */
  static async checkSubjectsRequirementAssociationsBatch (subjectIds) {
    try {
      const [rows] = await pool.query(
      `
      SELECT 
          s.id AS subjectId,
          s.subject_name AS subjectName,
          COUNT(r.id) AS requirementCount
      FROM subjects s
      LEFT JOIN requirements r ON s.id = r.subject_id
      WHERE s.id IN (?) 
      GROUP BY s.id
    `,
      [subjectIds]
      )
      return rows.map(row => ({
        id: row.subjectId,
        name: row.subjectName,
        isAssociatedToRequirements: row.requirementCount > 0
      }))
    } catch (error) {
      console.error('Error checking batch subject requirement associations:', error.message)
      throw new HttpException(500, 'Error checking batch subject requirement associations')
    }
  }
}

export default SubjectsRepository
