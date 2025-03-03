import { pool } from '../config/db.config.js'
import ErrorUtils from '../utils/Error.js'

/**
 * Repository class for handling database operations related to Requirements Identification.
 */
class RequirementsIdentificationRepository {
  /**
   * Inserts a new requirement identification record into the database.
   *
   * @param {number} requirementId - The ID of the requirement being identified.
   * @param {number} userId - The ID of the user performing the analysis.
   * @returns {Promise<number>} - Returns the ID of the created requirements_identification record.
   * @throws {ErrorUtils} - If an error occurs during insertion.
   */
  static async createRequirementIdentification (requirementId, userId) {
    const query = `
      INSERT INTO requirements_identification (requirement_id, user_id)
      VALUES (?, ?)
    `
    const values = [requirementId, userId]
    try {
      const [result] = await pool.query(query, values)
      return result.insertId
    } catch (error) {
      console.error('Error creating requirements identification:', error.message)
      throw new ErrorUtils(500, 'Error creating requirements identification in the database')
    }
  }

  /**
   * Links a requirement identification record to a legal basis in the database.
   *
   * @param {number} requirementIdentificationId - The ID of the requirements identification.
   * @param {number} legalBasisId - The ID of the legal basis.
   * @returns {Promise<boolean>} - Returns `true` if successful, `false` otherwise.
   * @throws {ErrorUtils} - If an error occurs during insertion.
   */
  static async linkLegalBasis (requirementIdentificationId, legalBasisId) {
    const query = `
      INSERT INTO requirements_identification_legal_basis (requirements_identification_id, legal_basis_id)
      VALUES (?, ?)
    `
    const values = [requirementIdentificationId, legalBasisId]
    try {
      const [result] = await pool.query(query, values)
      return result.affectedRows > 0
    } catch (error) {
      console.error('Error linking requirements identification to legal basis:', error.message)
      throw new ErrorUtils(500, 'Error linking requirements identification to legal basis in the database')
    }
  }

  /**
   * Links a requirement identification to an **obligatory** article under a specific legal basis.
   *
   * @param {number} requirementIdentificationId - The ID of the requirements identification.
   * @param {number} legalBasisId - The ID of the legal basis.
   * @param {number} articleId - The ID of the article.
   * @returns {Promise<boolean>} - Returns `true` if successful, `false` otherwise.
   * @throws {ErrorUtils} - If an error occurs during insertion.
   */
  static async linkObligatoryArticle (requirementIdentificationId, legalBasisId, articleId) {
    return this._linkArticle(requirementIdentificationId, legalBasisId, articleId, 'Obligatory')
  }

  /**
   * Links a requirement identification to a **complementary** article under a specific legal basis.
   *
   * @param {number} requirementIdentificationId - The ID of the requirements identification.
   * @param {number} legalBasisId - The ID of the legal basis.
   * @param {number} articleId - The ID of the article.
   * @returns {Promise<boolean>} - Returns `true` if successful, `false` otherwise.
   * @throws {ErrorUtils} - If an error occurs during insertion.
   */
  static async linkComplementaryArticle (requirementIdentificationId, legalBasisId, articleId) {
    return this._linkArticle(requirementIdentificationId, legalBasisId, articleId, 'Complementary')
  }

  /**
   * Private method to insert a link between a requirements identification and an article.
   *
   * @param {number} requirementIdentificationId - The ID of the requirements identification.
   * @param {number} legalBasisId - The ID of the legal basis.
   * @param {number} articleId - The ID of the article.
   * @param {'Obligatory' | 'Complementary'} classification - The classification type.
   * @returns {Promise<boolean>} - Returns `true` if successful, `false` otherwise.
   * @throws {ErrorUtils} - If an error occurs during insertion.
   */
  static async _linkArticle (requirementIdentificationId, legalBasisId, articleId, classification) {
    const query = `
    INSERT INTO requirements_identification_articles (requirements_identification_id, legal_basis_id, article_id, classification)
    VALUES (?, ?, ?, ?)
  `
    const values = [requirementIdentificationId, legalBasisId, articleId, classification]
    try {
      const [result] = await pool.query(query, values)
      return result.affectedRows > 0
    } catch (error) {
      console.error(`Error linking requirements identification to ${classification} article:`, error.message)
      throw new ErrorUtils(500, `Error linking requirements identification to ${classification} article in the database`)
    }
  }
}

export default RequirementsIdentificationRepository
