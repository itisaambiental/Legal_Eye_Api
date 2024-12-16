import ArticlesRepository from '../../repositories/Articles.repository.js'
import LegalBasisRepository from '../../repositories/LegalBasis.repository.js'
import articlesSchema from '../../validations/articlesValidation.js'
import ErrorUtils from '../../utils/Error.js'
import { z } from 'zod'

/**
 * Service class for handling Article operations.
 */
class ArticlesService {
  /**
   * Inserts articles associated with a legal basis into the database.
   * Validates the articles array using the defined schema before inserting.
   * @param {number} legalBasisId - The ID of the legal basis to associate the articles with.
   * @param {Array<Object>} articles - The list of articles to insert.
   * @param {string} articles[].title - The title of the article.
   * @param {string} articles[].article - The content of the article.
   * @param {number} articles[].order - The order of the article.
   * @returns {Promise<boolean>} - Returns true if insertion is successful, false otherwise.
   * @throws {ErrorUtils} - If an error occurs during validation or insertion.
   */
  static async insertArticles (legalBasisId, articles) {
    try {
      const parsedArticles = articlesSchema.parse(articles)
      const legalBase = await LegalBasisRepository.findById(legalBasisId)
      if (!legalBase) {
        throw new ErrorUtils(404, 'Legal basis not found')
      }
      const insertionSuccess = await ArticlesRepository.insertArticles(legalBasisId, parsedArticles)
      if (!insertionSuccess) {
        return false
      }
      return true
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors = error.errors.map((e) => ({
          field: e.path[0],
          message: e.message
        }))
        throw new ErrorUtils(400, 'Validation failed for articles', validationErrors)
      }
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Unexpected error during article insertion')
    }
  }

  /**
 * Replaces existing articles associated with a legal basis in the database with new ones.
 * Validates the articles array using the defined schema before updating.
 * @param {number} legalBasisId - The ID of the legal basis to associate the articles with.
 * @param {Array<Object>} articles - The list of articles to replace existing ones.
 * @param {string} articles[].title - The title of the article.
 * @param {string} articles[].article - The content of the article.
 * @param {number} articles[].order - The order of the article.
 * @returns {Promise<boolean>} - Returns true if the update is successful, false otherwise.
 * @throws {ErrorUtils} - If an error occurs during validation or the update.
 */
  static async replaceArticles (legalBasisId, articles) {
    try {
      const parsedArticles = articlesSchema.parse(articles)
      const legalBase = await LegalBasisRepository.findById(legalBasisId)
      if (!legalBase) {
        throw new ErrorUtils(404, 'Legal basis not found')
      }
      const updateSuccess = await ArticlesRepository.updateArticles(legalBasisId, parsedArticles)
      if (!updateSuccess) {
        return false
      }
      return true
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors = error.errors.map((e) => ({
          field: e.path[0],
          message: e.message
        }))
        throw new ErrorUtils(400, 'Validation failed for articles', validationErrors)
      }
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Unexpected error during article replacement')
    }
  }

  /**
 * Fetches articles associated with a specific legal basis.
 * @param {number} legalBasisId - The ID of the legal basis.
 * @returns {Promise<Array<Object>>} - A list of articles associated with the legal basis.
 * @throws {ErrorUtils} - If an error occurs during retrieval.
 */
  static async getArticlesByLegalBasisId (legalBasisId) {
    try {
      const legalBase = await LegalBasisRepository.findById(legalBasisId)
      if (!legalBase) {
        throw new ErrorUtils(404, 'Legal basis not found')
      }
      const articles = await ArticlesRepository.getArticlesByLegalBasisId(legalBasisId)
      if (!articles) {
        return []
      }
      return articles
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Error fetching articles from the database')
    }
  }
}

export default ArticlesService
