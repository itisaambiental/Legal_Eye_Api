import { pool } from '../config/db.config.js'
import HttpException from '../services/errors/HttpException.js'
import RequirementType from '../models/RequirementTypes.model.js'

/**
 * Repository class for handling database operations related to Requirement Types.
 */
class RequirementTypesRepository {
  /**
   * Inserts a new requirement type into the database.
   * @param {string} name - The name of the requirement type.
   * @param {string} description - A description of the requirement type.
   * @param {string} classification - The classification of the requirement type.
   * @returns {Promise<RequirementType>} - Returns the created RequirementType.
   * @throws {HttpException} - If an error occurs during insertion.
   */
  static async create (name, description, classification) {
    const query = `
      INSERT INTO requirement_types (name, description, classification)
      VALUES (?, ?, ?)
    `
    try {
      const [result] = await pool.query(query, [
        name,
        description,
        classification
      ])
      const requirementType = await this.findById(result.insertId)
      return requirementType
    } catch (error) {
      console.error('Error creating requirement type:', error.message)
      throw new HttpException(
        500,
        'Error inserting requirement type into the database'
      )
    }
  }

  /**
   * Fetches all requirement types from the database.
   * @returns {Promise<RequirementType[] | null>} - Returns a list of RequirementType instances.
   * @throws {HttpException} - If an error occurs during retrieval.
   */
  static async findAll () {
    try {
      const [rows] = await pool.query(`
            SELECT id, name, description, classification
            FROM requirement_types
            ORDER BY id DESC;
          `)
      if (rows.length === 0) return null
      return rows.map(
        (requirementType) =>
          new RequirementType(
            requirementType.id,
            requirementType.name,
            requirementType.description,
            requirementType.classification
          )
      )
    } catch (error) {
      console.error('Error fetching requirement types:', error.message)
      throw new HttpException(
        500,
        'Error fetching requirement types from the database'
      )
    }
  }

  /**
   * Fetches a requirement type by its ID from the database.
   * @param {number} id - The ID of the requirement type to retrieve.
   * @returns {Promise<RequirementType|null>} - Returns the RequirementType instance or null if not found.
   * @throws {HttpException} - If an error occurs during retrieval.
   */
  static async findById (id) {
    try {
      const [rows] = await pool.query(
        `
        SELECT id, name, description, classification
        FROM requirement_types
        WHERE id = ?
        `,
        [id]
      )
      if (rows.length === 0) return null
      const requirementType = rows[0]
      return new RequirementType(
        requirementType.id,
        requirementType.name,
        requirementType.description,
        requirementType.classification
      )
    } catch (error) {
      console.error('Error fetching requirement type by ID:', error.message)
      throw new HttpException(
        500,
        'Error fetching requirement type from the database'
      )
    }
  }

  /**
   * Finds requirement types in the database using an array of IDs.
   * @param {number[]} requirementTypesIds - Array of requirement type IDs to find.
   * @returns {Promise<RequirementType[]>} - Array of RequirementType instances.
   * @throws {HttpException} - If an error occurs during retrieval.
   */
  static async findByIds (requirementTypesIds) {
    if (requirementTypesIds.length === 0) {
      return []
    }
    const query = `
      SELECT id, name, description, classification
      FROM requirement_types
      WHERE id IN (?)
      ORDER BY id DESC;
    `
    try {
      const [rows] = await pool.query(query, [requirementTypesIds])
      return rows.map(
        (row) =>
          new RequirementType(
            row.id,
            row.name,
            row.description,
            row.classification
          )
      )
    } catch (error) {
      console.error('Error finding requirement types by IDs:', error.message)
      throw new HttpException(
        500,
        'Error finding requirement types by IDs from the database'
      )
    }
  }

  /**
   * Checks if a requirement type with the given name exists, excluding the specified ID.
   * @param {string} name - The name to check for uniqueness.
   * @param {number} idToExclude - The ID to exclude from the check.
   * @returns {Promise<boolean>} - True if a different requirement type with the same name exists.
   */
  static async existsByNameExcludingId (name, idToExclude) {
    const query = `
          SELECT 1
          FROM requirement_types
          WHERE name = ? AND id != ?
          LIMIT 1
        `
    try {
      const [rows] = await pool.query(query, [name, idToExclude])
      return rows.length > 0
    } catch (error) {
      console.error(
        'Error checking if requirement type name exists:',
        error.message
      )
      throw new HttpException(
        500,
        'Error checking if requirement type name exists'
      )
    }
  }

  /**
   * Checks if a requirement type exists with the given name.
   * @param {string} name - The name to check.
   * @returns {Promise<boolean>} - True if a requirement type with the same name exists.
   */
  static async existsByRequirementTypesName (name) {
    const query = `
          SELECT 1
          FROM requirement_types
          WHERE name = ?
          LIMIT 1
        `
    try {
      const [rows] = await pool.query(query, [name])
      return rows.length > 0
    } catch (error) {
      console.error(
        'Error checking if requirement type name exists:',
        error.message
      )
      throw new HttpException(
        500,
        'Error checking if requirement type name exists'
      )
    }
  }

  /**
   * Fetches requirement types from the database by partial name match.
   * @param {string} name - A partial or full name to search for.
   * @returns {Promise<Array<RequirementType[]|null>>} - Array of RequirementType instances.
   */
  static async findByName (name) {
    const search = `%${name}%`
    try {
      const [rows] = await pool.query(
        `
            SELECT id, name, description, classification
            FROM requirement_types
            WHERE name LIKE ?
            ORDER BY id DESC;
            `,
        [search]
      )
      if (rows.length === 0) return null
      return rows.map(
        (row) =>
          new RequirementType(
            row.id,
            row.name,
            row.description,
            row.classification
          )
      )
    } catch (error) {
      console.error('Error fetching requirement types by name:', error.message)
      throw new HttpException(500, 'Error fetching requirement types by name')
    }
  }

  /**
   * Fetches requirement types from the database by partial description match.
   * @param {string} description - A partial description to search for.
   * @returns {Promise<Array<RequirementType[]|null>>} - Array of RequirementType instances.
   */
  static async findByDescription (description) {
    try {
      const [rows] = await pool.query(
        `
       SELECT id, name, description, classification
       FROM requirement_types
       WHERE MATCH(description) AGAINST(? IN BOOLEAN MODE)
        `,
        [description]
      )
      if (rows.length === 0) return null
      return rows.map(
        (row) =>
          new RequirementType(
            row.id,
            row.name,
            row.description,
            row.classification
          )
      )
    } catch (error) {
      console.error(
        'Error fetching requirement types by description:',
        error.message
      )
      throw new HttpException(
        500,
        'Error fetching requirement types by description'
      )
    }
  }

  /**
   * Fetches requirement types from the database by partial classification match.
   * @param {string} classification - A partial classification to search for.
   * @returns {Promise<Array<RequirementType[]|null>>} - Array of RequirementType instances.
   */
  static async findByClassification (classification) {
    try {
      const [rows] = await pool.query(
        `
      SELECT id, name, description, classification
      FROM requirement_types
      WHERE MATCH(classification) AGAINST(? IN BOOLEAN MODE)
        `,
        [classification]
      )
      if (rows.length === 0) return null
      return rows.map(
        (row) =>
          new RequirementType(
            row.id,
            row.name,
            row.description,
            row.classification
          )
      )
    } catch (error) {
      console.error(
        'Error fetching requirement types by classification:',
        error.message
      )
      throw new HttpException(
        500,
        'Error fetching requirement types by classification'
      )
    }
  }

  /**
   * Updates a requirement type in the database.
   * @param {number} id - The ID of the requirement type to update.
   * @param {string} name - The updated name.
   * @param {string} description - The updated description.
   * @param {string} classification - The updated classification.
   * @returns {Promise<RequirementType|null>} - The updated RequirementType instance.
   */
  static async update (id, name, description, classification) {
    const query = `
      UPDATE requirement_types
      SET name = ?, description = ?, classification = ?
      WHERE id = ?
    `
    try {
      const [result] = await pool.query(query, [
        name,
        description,
        classification,
        id
      ])
      if (result.affectedRows === 0) return null
      const requirementType = await this.findById(id)
      return requirementType
    } catch (error) {
      console.error('Error updating requirement type:', error.message)
      throw new HttpException(
        500,
        'Error updating requirement type in the database'
      )
    }
  }

  /**
   * Deletes a requirement type by its ID.
   * @param {number} id - The ID of the requirement type to delete.
   * @returns {Promise<boolean>} - Returns true if the deletion is successful, false otherwise.
   */
  static async deleteById (id) {
    try {
      const [result] = await pool.query(
        'DELETE FROM requirement_types WHERE id = ?',
        [id]
      )
      return result.affectedRows > 0
    } catch (error) {
      console.error('Error deleting requirement type:', error.message)
      throw new HttpException(
        500,
        'Error deleting requirement type from the database'
      )
    }
  }

  /**
   * Deletes multiple requirement types from the database using an array of IDs.
   * @param {number[]} requirementTypesIds - Array of requirement type IDs to delete.
   * @returns {Promise<boolean>} - True if deletion was successful, otherwise false.
   */
  static async deleteBatch (requirementTypesIds) {
    const query = `
      DELETE FROM requirement_types
      WHERE id IN (?)
    `
    try {
      const [result] = await pool.query(query, [requirementTypesIds])
      return result.affectedRows > 0
    } catch (error) {
      console.error('Error deleting requirement types batch:', error.message)
      throw new HttpException(
        500,
        'Error deleting requirement types from the database'
      )
    }
  }

  /**
   * Deletes all requirement types from the database.
   * @returns {Promise<void>}
   * @throws {HttpException} - If an error occurs during deletion.
   */
  static async deleteAll () {
    try {
      await pool.query('DELETE FROM requirement_types')
    } catch (error) {
      console.error('Error deleting all requirement types:', error.message)
      throw new HttpException(
        500,
        'Error deleting all requirement types from the database'
      )
    }
  }

  /**
 * Checks if a requirement type is associated with any requirement identifications.
 * @param {number} requirementTypeId - The ID of the requirement type to check.
 * @returns {Promise<{ isAssociatedToReqIdentifications: boolean }>}
 * @throws {HttpException}
 */
  static async checkReqIdentificationAssociations (requirementTypeId) {
    try {
      const [rows] = await pool.query(
      `
      SELECT COUNT(*) AS identificationCount
      FROM req_identifications_requirement_types
      WHERE requirement_type_id = ?
      `,
      [requirementTypeId]
      )

      return {
        isAssociatedToReqIdentifications: rows[0].identificationCount > 0
      }
    } catch (error) {
      console.error(
        'Error checking requirement type associations with identifications:',
        error.message
      )
      throw new HttpException(
        500,
        'Error checking requirement type associations with identifications'
      )
    }
  }

  /**
 * Checks which requirement types are associated with requirement identifications.
 * @param {Array<number>} requirementTypeIds - Array of IDs to check.
 * @returns {Promise<Array<{ id: number, name: string, isAssociatedToReqIdentifications: boolean }>>}
 * @throws {HttpException}
 */
  static async checkReqIdentificationAssociationsBatch (requirementTypeIds) {
    try {
      const [rows] = await pool.query(
      `
      SELECT 
        rt.id AS requirementTypeId,
        rt.name AS requirementTypeName,
        COUNT(rit.requirement_type_id) AS identificationCount
      FROM requirement_types rt
      LEFT JOIN req_identifications_requirement_types rit
        ON rt.id = rit.requirement_type_id
      WHERE rt.id IN (?)
      GROUP BY rt.id
      `,
      [requirementTypeIds]
      )

      return rows.map((row) => ({
        id: row.requirementTypeId,
        name: row.requirementTypeName,
        isAssociatedToReqIdentifications: row.identificationCount > 0
      }))
    } catch (error) {
      console.error(
        'Error checking requirement type associations with identifications:',
        error.message
      )
      throw new HttpException(
        500,
        'Error checking batch requirement type associations'
      )
    }
  }
}

export default RequirementTypesRepository
