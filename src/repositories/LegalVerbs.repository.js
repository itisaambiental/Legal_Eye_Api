import { pool } from '../config/db.config.js'
import ErrorUtils from '../utils/Error.js'
import LegalVerb from '../models/LegalVerbs.model.js'

/**
 * Repository class for handling database operations related to Legal Verbs.
 */
class LegalVerbsRepository {
  /**
   * Inserts a new legal verb into the database.
   * @param {string} name - The name of the legal verb.
   * @param {string} description - A description of the legal verb.
   * @param {string} translation - The translation of the legal verb.
   * @returns {Promise<LegalVerb>} - Returns the created LegalVerb.
   * @throws {ErrorUtils} - If an error occurs during insertion.
   */
  static async create (name, description, translation) {
    const query = `
      INSERT INTO legal_verbs (name, description, translation)
      VALUES (?, ?, ?)
    `
    try {
      const [result] = await pool.query(query, [
        name,
        description,
        translation
      ])
      const legalVerb = await this.findById(result.insertId)
      return legalVerb
    } catch (error) {
      console.error('Error creating legal verb:', error.message)
      throw new ErrorUtils(500, 'Error inserting legal verb into the database')
    }
  }

  /**
   * Fetches all legal verbs from the database.
   * @returns {Promise<LegalVerb[] | null>} - Returns a list of LegalVerb instances.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async findAll () {
    try {
      const [rows] = await pool.query(
        'SELECT id, name, description, translation FROM legal_verbs ORDER BY id DESC;'
      )
      if (rows.length === 0) return null
      return rows.map(
        (row) =>
          new LegalVerb(row.id, row.name, row.description, row.translation)
      )
    } catch (error) {
      console.error('Error fetching legal verbs:', error.message)
      throw new ErrorUtils(500, 'Error fetching legal verbs from the database')
    }
  }

  /**
   * Fetches a legal verb by its ID from the database.
   * @param {number} id - The ID of the legal verb to retrieve.
   * @returns {Promise<LegalVerb|null>} - Returns the LegalVerb instance or null if not found.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async findById (id) {
    try {
      const [rows] = await pool.query(
        `
        SELECT id, name, description, translation
        FROM legal_verbs
        WHERE id = ?
        `,
        [id]
      )
      if (rows.length === 0) return null
      const row = rows[0]
      return new LegalVerb(row.id, row.name, row.description, row.translation)
    } catch (error) {
      console.error('Error fetching legal verb by ID:', error.message)
      throw new ErrorUtils(500, 'Error fetching legal verb from the database')
    }
  }

  /**
   * Finds legal verbs in the database using an array of IDs.
   * @param {number[]} ids - Array of legal verb IDs to find.
   * @returns {Promise<LegalVerb[]>} - Array of LegalVerb instances.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async findByIds (ids) {
    if (ids.length === 0) {
      return []
    }
    const query = `
      SELECT id, name, description, translation
      FROM legal_verbs
      WHERE id IN (?)
      ORDER BY id DESC;
    `
    try {
      const [rows] = await pool.query(query, [ids])
      return rows.map(
        (row) =>
          new LegalVerb(row.id, row.name, row.description, row.translation)
      )
    } catch (error) {
      console.error('Error finding legal verbs by IDs:', error.message)
      throw new ErrorUtils(
        500,
        'Error finding legal verbs by IDs from the database'
      )
    }
  }

  /**
   * Checks if a legal verb with the given name exists, excluding the specified ID.
   * @param {string} name - The name to check for uniqueness.
   * @param {number} idToExclude - The ID to exclude from the check.
   * @returns {Promise<boolean>} - True if a different legal verb with the same name exists.
   */
  static async existsByNameExcludingId (name, idToExclude) {
    const query = `
      SELECT 1
      FROM legal_verbs
      WHERE name = ? AND id != ?
      LIMIT 1
    `
    try {
      const [rows] = await pool.query(query, [name, idToExclude])
      return rows.length > 0
    } catch (error) {
      console.error('Error checking if legal verb name exists:', error.message)
      throw new ErrorUtils(500, 'Error checking if legal verb name exists')
    }
  }

  /**
   * Checks if a legal verb exists with the given name.
   * @param {string} name - The name to check.
   * @returns {Promise<boolean>} - True if a legal verb with the same name exists.
   */
  static async existsByName (name) {
    const query = `
      SELECT 1
      FROM legal_verbs
      WHERE name = ?
      LIMIT 1
    `
    try {
      const [rows] = await pool.query(query, [name])
      return rows.length > 0
    } catch (error) {
      console.error('Error checking if legal verb name exists:', error.message)
      throw new ErrorUtils(500, 'Error checking if legal verb name exists')
    }
  }

  /**
   * Checks if a legal verb with the given translation exists, excluding the specified ID.
   * @param {string} translation - The translation to check for uniqueness.
   * @param {number} idToExclude - The ID to exclude from the check.
   * @returns {Promise<boolean>} - True if a different legal verb with the same translation exists.
   */
  static async existsByTranslationExcludingId (translation, idToExclude) {
    const query = `
      SELECT 1
      FROM legal_verbs
      WHERE translation = ? AND id != ?
      LIMIT 1
    `
    try {
      const [rows] = await pool.query(query, [translation, idToExclude])
      return rows.length > 0
    } catch (error) {
      console.error(
        'Error checking if legal verb translation exists:',
        error.message
      )
      throw new ErrorUtils(
        500,
        'Error checking if legal verb translation exists'
      )
    }
  }

  /**
   * Checks if a legal verb exists with the given translation.
   * @param {string} translation - The translation to check.
   * @returns {Promise<boolean>} - True if a legal verb with the same translation exists.
   */
  static async existsByTranslation (translation) {
    const query = `
      SELECT 1
      FROM legal_verbs
      WHERE translation = ?
      LIMIT 1
    `
    try {
      const [rows] = await pool.query(query, [translation])
      return rows.length > 0
    } catch (error) {
      console.error(
        'Error checking if legal verb translation exists:',
        error.message
      )
      throw new ErrorUtils(
        500,
        'Error checking if legal verb translation exists'
      )
    }
  }

  /**
   * Fetches legal verbs from the database by partial name match.
   * @param {string} name - A partial or full name to search for.
   * @returns {Promise<LegalVerb[] | null>} - Array of LegalVerb instances.
   */
  static async findByName (name) {
    const search = `%${name}%`
    try {
      const [rows] = await pool.query(
        `
          SELECT id, name, description, translation
          FROM legal_verbs
          WHERE name LIKE ?
          ORDER BY id DESC;
        `,
        [search]
      )
      if (rows.length === 0) return null
      return rows.map(
        (row) =>
          new LegalVerb(row.id, row.name, row.description, row.translation)
      )
    } catch (error) {
      console.error('Error fetching legal verbs by name:', error.message)
      throw new ErrorUtils(500, 'Error fetching legal verbs by name')
    }
  }

  /**
   * Fetches legal verbs from the database by partial description match.
   * @param {string} description - A partial description to search for.
   * @returns {Promise<LegalVerb[] | null>} - Array of LegalVerb instances.
   */
  static async findByDescription (description) {
    try {
      const [rows] = await pool.query(
        `
          SELECT id, name, description, translation
          FROM legal_verbs
          WHERE MATCH(description) AGAINST(? IN BOOLEAN MODE)
        `,
        [description]
      )
      if (rows.length === 0) return null
      return rows.map(
        (row) =>
          new LegalVerb(row.id, row.name, row.description, row.translation)
      )
    } catch (error) {
      console.error(
        'Error fetching legal verbs by description:',
        error.message
      )
      throw new ErrorUtils(500, 'Error fetching legal verbs by description')
    }
  }

  /**
   * Fetches legal verbs from the database by partial translation match.
   * @param {string} translation - A partial translation to search for.
   * @returns {Promise<LegalVerb[] | null>} - Array of LegalVerb instances.
   */
  static async findByTranslation (translation) {
    try {
      const [rows] = await pool.query(
        `
          SELECT id, name, description, translation
          FROM legal_verbs
          WHERE MATCH(translation) AGAINST(? IN BOOLEAN MODE)
        `,
        [translation]
      )
      if (rows.length === 0) return null
      return rows.map(
        (row) =>
          new LegalVerb(row.id, row.name, row.description, row.translation)
      )
    } catch (error) {
      console.error(
        'Error fetching legal verbs by translation:',
        error.message
      )
      throw new ErrorUtils(500, 'Error fetching legal verbs by translation')
    }
  }

  /**
   * Updates a legal verb in the database.
   * @param {number} id - The ID of the legal verb to update.
   * @param {string} name - The updated name.
   * @param {string} description - The updated description.
   * @param {string} translation - The updated translation.
   * @returns {Promise<LegalVerb|null>} - The updated LegalVerb instance.
   */
  static async update (id, name, description, translation) {
    const query = `
      UPDATE legal_verbs
      SET name = ?, description = ?, translation = ?
      WHERE id = ?
    `
    try {
      const [result] = await pool.query(query, [
        name,
        description,
        translation,
        id
      ])
      if (result.affectedRows === 0) return null
      const legalVerb = await this.findById(result.insertId)
      return legalVerb
    } catch (error) {
      console.error('Error updating legal verb:', error.message)
      throw new ErrorUtils(500, 'Error updating legal verb in the database')
    }
  }

  /**
   * Deletes a legal verb by its ID.
   * @param {number} id - The ID of the legal verb to delete.
   * @returns {Promise<boolean>} - Returns true if deletion was successful.
   */
  static async deleteById (id) {
    try {
      const [result] = await pool.query(
        'DELETE FROM legal_verbs WHERE id = ?',
        [id]
      )
      return result.affectedRows > 0
    } catch (error) {
      console.error('Error deleting legal verb:', error.message)
      throw new ErrorUtils(500, 'Error deleting legal verb from the database')
    }
  }

  /**
   * Deletes multiple legal verbs using an array of IDs.
   * @param {number[]} ids - Array of legal verb IDs to delete.
   * @returns {Promise<boolean>} - True if deletion was successful.
   */
  static async deleteBatch (ids) {
    const query = `
      DELETE FROM legal_verbs
      WHERE id IN (?)
    `
    try {
      const [result] = await pool.query(query, [ids])
      return result.affectedRows > 0
    } catch (error) {
      console.error('Error deleting legal verbs batch:', error.message)
      throw new ErrorUtils(
        500,
        'Error deleting legal verbs batch from the database'
      )
    }
  }

  /**
   * Deletes all legal verbs from the database.
   * @returns {Promise<void>}
   */
  static async deleteAll () {
    try {
      await pool.query('DELETE FROM legal_verbs')
    } catch (error) {
      console.error('Error deleting all legal verbs:', error.message)
      throw new ErrorUtils(
        500,
        'Error deleting all legal verbs from the database'
      )
    }
  }
}

export default LegalVerbsRepository
