import { pool } from '../config/db.config.js'
import ErrorUtils from '../utils/Error.js'

/**
 * Repository class for handling database operations related to Identify Requirements.
 */
class IdentifyRequirementRepository {
  /**
   * Inserts a new identified requirement into the database.
   *
   * This function registers an identified requirement based on a legal analysis.
   *
   * @param {number} requirementId - The ID of the requirement being identified.
   * @param {number} userId - The ID of the user performing the analysis.
   * @returns {Promise<number>} - Returns the ID of the created identify_requirements record.
   * @throws {ErrorUtils} - If an error occurs during insertion.
   */
  static async createIdentifyRequirement (requirementId, userId) {
    const query = `
      INSERT INTO identify_requirements (requirement_id, user_id)
      VALUES (?, ?)
    `
    const values = [requirementId, userId]
    try {
      const [result] = await pool.query(query, values)
      return result.insertId
    } catch (error) {
      console.error('Error creating identified requirement:', error.message)
      throw new ErrorUtils(500, 'Error creating identified requirement in the database')
    }
  }

  /**
 * Links an identified requirement to a legal basis in the database.
 *
 * This function creates a relationship between an identified requirement and a legal basis.
 *
 * @param {number} identifyRequirementId - The ID of the identified requirement.
 * @param {number} legalBasisId - The ID of the legal basis.
 * @returns {Promise<boolean>} - Returns `true` if successful, `false` otherwise.
 * @throws {ErrorUtils} - If an error occurs during insertion.
 */
  static async linkToLegalBasis (identifyRequirementId, legalBasisId) {
    const query = `
      INSERT INTO identify_requirements_legal_basis (identify_requirement_id, legal_basis_id)
      VALUES (?, ?)
    `
    const values = [identifyRequirementId, legalBasisId]
    try {
      const [result] = await pool.query(query, values)
      return result.affectedRows > 0
    } catch (error) {
      console.error('Error linking identified requirement to legal basis:', error.message)
      throw new ErrorUtils(500, 'Error linking identified requirement to legal basis in the database')
    }
  }

  /**
 * Links an identified requirement to an **obligatory** article under a specific legal basis.
 *
 * @param {number} identifyRequirementId - The ID of the identified requirement.
 * @param {number} legalBasisId - The ID of the legal basis.
 * @param {number} articleId - The ID of the article.
 * @returns {Promise<boolean>} - Returns `true` if successful, `false` otherwise.
 * @throws {ErrorUtils} - If an error occurs during insertion.
 */
  static async linkObligatoryArticle (identifyRequirementId, legalBasisId, articleId) {
    return this._linkToArticle(identifyRequirementId, legalBasisId, articleId, 'Obligatory')
  }

  /**
 * Links an identified requirement to a **complementary** article under a specific legal basis.
 *
 * @param {number} identifyRequirementId - The ID of the identified requirement.
 * @param {number} legalBasisId - The ID of the legal basis.
 * @param {number} articleId - The ID of the article.
 * @returns {Promise<boolean>} - Returns `true` if successful, `false` otherwise.
 * @throws {ErrorUtils} - If an error occurs during insertion.
 */
  static async linkComplementaryArticle (identifyRequirementId, legalBasisId, articleId) {
    return this._linkToArticle(identifyRequirementId, legalBasisId, articleId, 'Complementary')
  }

  /**
 * Private method to insert a link between an identified requirement and an article.
 *
 * @param {number} identifyRequirementId - The ID of the identified requirement.
 * @param {number} legalBasisId - The ID of the legal basis.
 * @param {number} articleId - The ID of the article.
 * @param {'Obligatory' | 'Complementary'} classification - The classification type.
 * @returns {Promise<boolean>} - Returns `true` if successful, `false` otherwise.
 * @throws {ErrorUtils} - If an error occurs during insertion.
 */
  static async _linkToArticle (identifyRequirementId, legalBasisId, articleId, classification) {
    const query = `
    INSERT INTO identify_requirements_articles (identify_requirement_id, legal_basis_id, article_id, classification)
    VALUES (?, ?, ?, ?)
  `
    const values = [identifyRequirementId, legalBasisId, articleId, classification]
    try {
      const [result] = await pool.query(query, values)
      return result.affectedRows > 0
    } catch (error) {
      console.error(`Error linking identified requirement to ${classification} article:`, error.message)
      throw new ErrorUtils(500, `Error linking identified requirement to ${classification} article in the database`)
    }
  }
}

export default IdentifyRequirementRepository
