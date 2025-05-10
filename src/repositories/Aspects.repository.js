import { pool } from '../config/db.config.js'
import HttpException from '../utils/HttpException.js'
import Aspect from '../models/Aspect.model.js'

/**
 * Repository class for handling database operations related to Aspects.
 */
class AspectsRepository {
  /**
   * Inserts a new aspect linked to a specific subject into the database.
   * @param {number} subjectId - The ID of the subject to link this aspect to.
   * @param {string} aspectName - The name of the aspect to insert.
   * @param {string} abbreviation - The abbreviation for the aspect.
   * @param {number} orderIndex - The display order for the aspect.
   * @returns {Promise<Aspect>} - Returns the created aspect.
   * @throws {HttpException} - If an error occurs during insertion.
   */
  static async create (subjectId, aspectName, abbreviation, orderIndex) {
    const query = `
      INSERT INTO aspects (subject_id, aspect_name, abbreviation, order_index)
      VALUES (?, ?, ?, ?)
    `
    try {
      const [result] = await pool.query(query, [subjectId, aspectName, abbreviation, orderIndex])
      const aspect = await this.findById(result.insertId)
      return aspect
    } catch (error) {
      console.error('Error creating aspect:', error.message)
      throw new HttpException(500, 'Error inserting aspect into the database')
    }
  }

  /**
   * Fetches an aspect by its ID from the database.
   * @param {number} id - The ID of the aspect to retrieve.
   * @returns {Promise<Aspect|null>} - Returns the Aspect instance or null if not found.
   * @throws {HttpException} - If an error occurs during retrieval.
   */
  static async findById (id) {
    const query = `
    SELECT aspects.id, aspects.subject_id, aspects.aspect_name,
           aspects.abbreviation, aspects.order_index,
           subjects.subject_name
    FROM aspects
    JOIN subjects ON aspects.subject_id = subjects.id
    WHERE aspects.id = ?
  `
    try {
      const [rows] = await pool.query(query, [id])
      if (rows.length === 0) return null
      const row = rows[0]
      return new Aspect(
        row.id,
        row.aspect_name,
        row.subject_id,
        row.subject_name,
        row.abbreviation,
        row.order_index
      )
    } catch (error) {
      console.error('Error fetching aspect by ID:', error.message)
      throw new HttpException(500, 'Error fetching aspect from the database')
    }
  }

  /**
 * Finds aspects in the database using an array of IDs.
 * @param {Array<number>} aspectIds - Array of aspect IDs to find.
 * @returns {Promise<Array<Aspect>>} - Array of Aspect instances matching the provided IDs.
 * @throws {HttpException} - If an error occurs during retrieval.
 */
  static async findByIds (aspectIds) {
    if (aspectIds.length === 0) {
      return []
    }

    const query = `
    SELECT aspects.id, aspects.subject_id, aspects.aspect_name,
           aspects.abbreviation, aspects.order_index,
           subjects.subject_name
    FROM aspects
    JOIN subjects ON aspects.subject_id = subjects.id
    WHERE aspects.id IN (?)
  `
    try {
      const [rows] = await pool.query(query, [aspectIds])
      return rows.map(
        (row) =>
          new Aspect(
            row.id,
            row.aspect_name,
            row.subject_id,
            row.subject_name,
            row.abbreviation,
            row.order_index
          )
      )
    } catch (error) {
      console.error('Error finding aspects by IDs:', error.message)
      throw new HttpException(500, 'Error finding aspects by IDs from the database')
    }
  }

  /**
   * Fetches all aspects associated with a specific subject from the database.
   * @param {number} subjectId - The ID of the subject to retrieve aspects for.
   * @returns {Promise<Array<Aspect|null>>} - Returns a list of Aspect instances.
   * @throws {HttpException} - If an error occurs during retrieval.
   */
  static async findBySubjectId (subjectId) {
    const query = `
    SELECT aspects.id, aspects.subject_id, aspects.aspect_name,
           aspects.abbreviation, aspects.order_index,
           subjects.subject_name
    FROM aspects
    JOIN subjects ON aspects.subject_id = subjects.id
    WHERE aspects.subject_id = ?
    ORDER BY aspects.order_index ASC
  `
    try {
      const [rows] = await pool.query(query, [subjectId])
      if (rows.length === 0) return null

      return rows.map(
        (row) =>
          new Aspect(
            row.id,
            row.aspect_name,
            row.subject_id,
            row.subject_name,
            row.abbreviation,
            row.order_index
          )
      )
    } catch (error) {
      console.error('Error fetching aspects by subject ID:', error.message)
      throw new HttpException(500, 'Error fetching aspects from the database')
    }
  }

  /**
   * Checks if an aspect with the given name exists for the specified subject.
   * @param {string} aspectName - The aspect name to check for existence.
   * @param {number} subjectId - The subject ID to check within.
   * @returns {Promise<boolean>} - True if an aspect with the same name exists for the given subject, false otherwise.
   * @throws {HttpException} - If an error occurs during retrieval.
   */
  static async existsByNameAndSubjectId (aspectName, subjectId) {
    const query = `
    SELECT 1 
    FROM aspects 
    WHERE aspect_name = ? AND subject_id = ?
    LIMIT 1
  `
    try {
      const [rows] = await pool.query(query, [aspectName, subjectId])
      return rows.length > 0
    } catch (error) {
      console.error('Error checking if aspect exists:', error.message)
      throw new HttpException(500, 'Error checking if aspect exists')
    }
  }

  /**
   * Fetches aspects by a partial match of its name and subject ID from the database.
   * @param {string} aspectName - A partial or full name of the aspect to search for.
   * @param {number} subjectId - The ID of the subject to filter by.
   * @returns {Promise<Array<Aspect|null>>} - Returns an array of Aspect instances matching the criteria.
   * @throws {HttpException} - If an error occurs during retrieval.
   */
  static async findByNameAndSubjectId (aspectName, subjectId) {
    const searchValue = `%${aspectName}%`
    const query = `
    SELECT aspects.id, aspects.subject_id, aspects.aspect_name,
           aspects.abbreviation, aspects.order_index,
           subjects.subject_name
    FROM aspects
    JOIN subjects ON aspects.subject_id = subjects.id
    WHERE aspects.aspect_name LIKE ? AND aspects.subject_id = ?
    ORDER BY aspects.order_index ASC
  `
    try {
      const [rows] = await pool.query(query, [searchValue, subjectId])
      if (rows.length === 0) return null

      return rows.map(
        (row) =>
          new Aspect(
            row.id,
            row.aspect_name,
            row.subject_id,
            row.subject_name,
            row.abbreviation,
            row.order_index
          )
      )
    } catch (error) {
      console.error(
        'Error fetching aspect by partial name and subject ID:',
        error.message
      )
      throw new HttpException(500, 'Error fetching aspect from the database')
    }
  }

  /**
   * Checks if an aspect with the given name exists for the specified subject, excluding the given aspect ID.
   * @param {string} aspectName - The aspect name to check for uniqueness.
   * @param {number} subjectId - The subject ID to check within.
   * @param {number} aspectId - The aspect ID to exclude from the check.
   * @returns {Promise<boolean>} - True if an aspect with the same name exists (excluding the given ID), false otherwise.
   * @throws {HttpException} - If an error occurs during retrieval.
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
      throw new HttpException(500, 'Error checking if aspect exists')
    }
  }

  /**
   * Updates an aspect by its ID, associated with a specific subject.
   * @param {number} id - The ID of the aspect to update.
   * @param {string|null} aspectName - The new name of the aspect, or null to keep the current name.
   * @param {string|null} abbreviation - The new abbreviation, or null to keep the current abbreviation.
   * @param {number|null} orderIndex - The new order index, or null to keep the current order.
   * @returns {Promise<boolean|Aspect>} - Returns Aspect if the update is successful, false otherwise.
   * @throws {HttpException} - If an error occurs during update.
   */
  static async updateById (id, aspectName, abbreviation, orderIndex) {
    const query = `
    UPDATE aspects
    SET
      aspect_name = IFNULL(?, aspect_name),
      abbreviation = IFNULL(?, abbreviation),
      order_index = IFNULL(?, order_index)
    WHERE id = ?
  `
    try {
      const [rows] = await pool.query(query, [aspectName, abbreviation, orderIndex, id])
      if (rows.affectedRows === 0) {
        return false
      }
      const aspect = await this.findById(id)
      return aspect
    } catch (error) {
      console.error('Error updating aspect:', error.message)
      throw new HttpException(500, 'Error updating aspect in the database')
    }
  }

  /**
   * Deletes an aspect by its ID.
   * @param {number} id - The ID of the aspect to delete.
   * @returns {Promise<boolean>} - Returns true if the deletion is successful, false otherwise.
   * @throws {HttpException} - If an error occurs during deletion.
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
      throw new HttpException(500, 'Error deleting aspect from the database')
    }
  }

  /**
   * Deletes multiple aspects from the database using an array of IDs.
   * @param {Array<number>} aspectIds - Array of aspect IDs to delete.
   * @returns {Promise<boolean>} - True if aspects were deleted, otherwise false.
   * @throws {HttpException} - If an error occurs during the deletion.
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
      throw new HttpException(500, 'Error deleting aspects from the database')
    }
  }

  /**
   * Deletes all aspects from the database.
   * @returns {Promise<void>}
   * @throws {HttpException} - If an error occurs during deletion.
   */
  static async deleteAll () {
    try {
      await pool.query('DELETE FROM aspects')
    } catch (error) {
      console.error('Error deleting all aspects:', error.message)
      throw new HttpException(500, 'Error deleting all aspects from the database')
    }
  }

  /**
 * Checks if an aspect is associated with any legal basis.
 * @param {number} aspectId - The ID of the aspect to check.
 * @returns {Promise<{ isAspectAssociatedToLegalBasis: boolean }>}
 * - Returns an object containing:
 *    - `isAspectAssociatedToLegalBasis` (boolean): True if the aspect is linked to at least one legal basis.
 * @throws {HttpException} - If an error occurs while querying the database.
 */
  static async checkAspectLegalBasisAssociations (aspectId) {
    try {
      const [rows] = await pool.query(
      `
      SELECT 
          COUNT(DISTINCT lbsa.legal_basis_id) AS legalBasisAssociationCount
      FROM legal_basis_subject_aspect lbsa
      WHERE lbsa.aspect_id = ?
    `,
      [aspectId]
      )
      return {
        isAspectAssociatedToLegalBasis: rows[0].legalBasisAssociationCount > 0
      }
    } catch (error) {
      console.error('Error checking aspect associations with legal basis:', error.message)
      throw new HttpException(500, 'Error checking aspect associations with legal basis')
    }
  }

  /**
 * Checks if any of the given aspects are associated with any legal basis.
 * @param {Array<number>} aspectIds - Array of aspect IDs to check.
 * @returns {Promise<Array<{ id: number, name: string, isAspectAssociatedToLegalBasis: boolean }>>}
 * - Returns an array of objects where each object contains:
 *    - `id` (number): The aspect ID.
 *    - `name` (string): The name of the aspect.
 *    - `isAspectAssociatedToLegalBasis` (boolean): True if the aspect is linked to at least one legal basis.
 * @throws {HttpException} - If an error occurs while querying the database.
 */
  static async checkAspectsLegalBasisAssociationsBatch (aspectIds) {
    try {
      const [rows] = await pool.query(
      `
      SELECT 
          a.id AS aspectId,
          a.aspect_name AS aspectName,
          COUNT(DISTINCT lbsa.legal_basis_id) AS legalBasisAssociationCount
      FROM aspects a
      LEFT JOIN legal_basis_subject_aspect lbsa ON lbsa.aspect_id = a.id
      WHERE a.id IN (?) 
      GROUP BY a.id
    `,
      [aspectIds]
      )
      return rows.map(row => ({
        id: row.aspectId,
        name: row.aspectName,
        isAspectAssociatedToLegalBasis: row.legalBasisAssociationCount > 0
      }))
    } catch (error) {
      console.error('Error checking batch associations for aspects:', error.message)
      throw new HttpException(500, 'Error checking batch associations for aspects')
    }
  }

  /**
 * Checks if an aspect is associated with any requirements.
 * @param {number} aspectId - The ID of the aspect to check.
 * @returns {Promise<{ isAspectAssociatedToRequirements: boolean }>}
 * - Returns an object containing:
 *    - `isAspectAssociatedToRequirements` (boolean): True if the aspect is linked to at least one requirement.
 * @throws {HttpException} - If an error occurs while querying the database.
 */
  static async checkAspectRequirementAssociations (aspectId) {
    try {
      const [rows] = await pool.query(
      `
      SELECT 
        COUNT(DISTINCT rsa.requirement_id) AS requirementAssociationCount
      FROM requirement_subject_aspect rsa
      WHERE rsa.aspect_id = ?
      `,
      [aspectId]
      )
      return {
        isAspectAssociatedToRequirements: rows[0].requirementAssociationCount > 0
      }
    } catch (error) {
      console.error('Error checking aspect associations with requirements:', error.message)
      throw new HttpException(500, 'Error checking aspect associations with requirements')
    }
  }

  /**
 * Checks if any of the given aspects are associated with any requirements.
 * @param {Array<number>} aspectIds - Array of aspect IDs to check.
 * @returns {Promise<Array<{ id: number, name: string, isAspectAssociatedToRequirements: boolean }>>}
 * - Returns an array of objects where each object contains:
 *    - `id` (number): The aspect ID.
 *    - `name` (string): The name of the aspect.
 *    - `isAspectAssociatedToRequirements` (boolean): True if the aspect is linked to at least one requirement.
 * @throws {HttpException} - If an error occurs while querying the database.
 */
  static async checkAspectsRequirementAssociationsBatch (aspectIds) {
    try {
      const [rows] = await pool.query(
      `
      SELECT 
        a.id AS aspectId,
        a.aspect_name AS aspectName,
        COUNT(DISTINCT rsa.requirement_id) AS requirementAssociationCount
      FROM aspects a
      LEFT JOIN requirement_subject_aspect rsa ON rsa.aspect_id = a.id
      WHERE a.id IN (?)
      GROUP BY a.id
      `,
      [aspectIds]
      )

      return rows.map(row => ({
        id: row.aspectId,
        name: row.aspectName,
        isAspectAssociatedToRequirements: row.requirementAssociationCount > 0
      }))
    } catch (error) {
      console.error('Error checking batch associations for aspects:', error.message)
      throw new HttpException(500, 'Error checking batch associations for aspects')
    }
  }
}

export default AspectsRepository
