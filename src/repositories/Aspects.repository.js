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
     * @returns {Promise<Aspect>} - Returns the created aspect.
     * @throws {ErrorUtils} - If an error occurs during insertion.
     */
  static async create (subjectId, aspectName) {
    const query = `
      INSERT INTO aspects (subject_id, aspect_name)
      VALUES (?, ?)
    `
    try {
      const [result] = await pool.query(query, [subjectId, aspectName])
      const aspect = await this.findById(result.insertId)
      return aspect
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
 * Finds aspects in the database using an array of IDs.
 * @param {Array<number>} aspectIds - Array of aspect IDs to find.
 * @returns {Promise<Array<number>>} - Array of found aspect IDs.
 * @throws {ErrorUtils} - If an error occurs during retrieval.
 */
  static async findByIds (aspectIds) {
    if (aspectIds.length === 0) {
      return []
    }
    const query = `
    SELECT id FROM aspects WHERE id IN (?)
  `
    try {
      const [rows] = await pool.query(query, [aspectIds])
      return rows.map(row => row.id)
    } catch (error) {
      console.error('Error finding aspects by IDs:', error.message)
      throw new ErrorUtils(500, 'Error finding aspects by IDs from the database')
    }
  }

  /**
 * Checks if an aspect with the given name exists for the specified subject, excluding the given aspect ID.
 * @param {string} aspectName - The aspect name to check for uniqueness.
 * @param {number} subjectId - The subject ID to check within.
 * @param {number} aspectId - The aspect ID to exclude from the check.
 * @returns {Promise<boolean>} - True if an aspect with the same name exists (excluding the given ID), false otherwise.
 * @throws {ErrorUtils} - If an error occurs during retrieval.
 */
  static async existsByNameExcludingId (aspectName, subjectId, aspectId) {
    const query = `
    SELECT 1 
    FROM aspects 
    WHERE aspect_name = ? AND subject_id = ? AND id != ?
    LIMIT 1
  `
    try {
      const [rows] = await pool.query(query, [aspectName, subjectId, aspectId])
      return rows.length > 0
    } catch (error) {
      console.error('Error checking if aspect exists:', error.message)
      throw new ErrorUtils(500, 'Error checking if aspect exists')
    }
  }

  /**
 * Fetches an aspect by its name and subject ID from the database.
 * @param {string} aspectName - The name of the aspect to retrieve.
 * @param {number} subjectId - The ID of the subject to filter by.
 * @returns {Promise<Aspect|null>} - Returns the Aspect instance or null if not found.
 * @throws {ErrorUtils} - If an error occurs during retrieval.
 */
  static async findByNameAndSubjectId (aspectName, subjectId) {
    const query = `
    SELECT aspects.id, aspects.subject_id, aspects.aspect_name, subjects.subject_name
    FROM aspects
    JOIN subjects ON aspects.subject_id = subjects.id
    WHERE aspects.aspect_name = ? AND aspects.subject_id = ?
  `
    try {
      const [rows] = await pool.query(query, [aspectName, subjectId])
      if (rows.length === 0) return null
      const row = rows[0]
      return new Aspect(row.id, row.aspect_name, row.subject_id, row.subject_name)
    } catch (error) {
      console.error('Error fetching aspect by name and subject ID:', error.message)
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
     * @returns {Promise<boolean|Aspect>} - Returns Aspect if the update is successful, false otherwise.
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
      const aspect = await this.findById(id)
      return aspect
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

  /**
 * Deletes multiple aspects from the database using an array of IDs.
 * @param {Array<number>} aspectIds - Array of aspect IDs to delete.
 * @returns {Promise<boolean>} - True if aspects were deleted, otherwise false.
 * @throws {ErrorUtils} - If an error occurs during the deletion.
 */
  static async deleteBatch (aspectIds) {
    const query = `
    DELETE FROM aspects WHERE id IN (?)
  `
    try {
      const [result] = await pool.query(query, [aspectIds])
      if (result.affectedRows === 0) {
        return false
      }
      return true
    } catch (error) {
      console.error('Error deleting aspects:', error.message)
      throw new ErrorUtils(500, 'Error deleting aspects from the database')
    }
  }

  /**
   * Deletes all aspects from the database.
   * @returns {Promise<void>}
   * @throws {ErrorUtils} - If an error occurs during deletion.
   */
  static async deleteAll () {
    try {
      await pool.query('DELETE FROM aspects')
    } catch (error) {
      console.error('Error deleting all aspects:', error.message)
      throw new ErrorUtils(500, 'Error deleting all aspects from the database')
    }
  }

  /**
 * Checks if an aspect is associated with any legal basis.
 * @param {number} aspectId - The ID of the aspect to check.
 * @returns {Promise<boolean>} - Returns an object with the count of legal basis associations.
 * @throws {Error} - If an error occurs while querying the database.
 */
  static async checkAspectLegalBasisAssociations (aspectId) {
    try {
      const [rows] = await pool.query(`
        SELECT 
            COUNT(DISTINCT lbsa.legal_basis_id) AS legalBasisAssociationCount
        FROM legal_basis_subject_aspect lbsa
        WHERE lbsa.aspect_id = ?
      `, [aspectId])

      const { legalBasisAssociationCount } = rows[0]

      return {
        isAspectAssociatedToLegalBasis: legalBasisAssociationCount > 0
      }
    } catch (error) {
      console.error('Error checking aspect associations with legal basis:', error.message)
      throw new ErrorUtils(500, 'Error checking aspect associations with legal basis')
    }
  }

  /**
 * Checks if any of the aspects in the given array are associated with any legal basis.
 * @param {Array<number>} aspectIds - Array of aspect IDs to check.
 * @returns {Promise<Array<Object>>} - Returns an array of objects with aspect ID, name, and their association status.
 * @throws {Error} - If an error occurs while querying the database.
 */
  static async checkAspectsLegalBasisAssociationsBatch (aspectIds) {
    try {
      const [rows] = await pool.query(`
      SELECT 
          a.id AS aspectId,
          a.aspect_name AS aspectName,
          COUNT(DISTINCT lbsa.legal_basis_id) AS legalBasisAssociationCount
      FROM aspects a
      LEFT JOIN legal_basis_subject_aspect lbsa ON lbsa.aspect_id = a.id
      WHERE a.id IN (?) 
      GROUP BY a.id
    `, [aspectIds])

      return rows.map(row => ({
        id: row.aspectId,
        name: row.aspectName,
        isAspectAssociatedToLegalBasis: row.legalBasisAssociationCount > 0
      }))
    } catch (error) {
      console.error('Error checking batch associations for aspects:', error.message)
      throw new ErrorUtils(500, 'Error checking batch associations for aspects')
    }
  }
}

export default AspectsRepository
