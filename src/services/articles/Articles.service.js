import ArticlesRepository from '../../repositories/Articles.repository.js'
import LegalBasisRepository from '../../repositories/LegalBasis.repository.js'
import { singleArticleSchema, articlesSchema } from '../../schemas/articlesValidation.js'
import ErrorUtils from '../../utils/Error.js'
import { z } from 'zod'

/**
 * Service class for handling Article operations.
 */
class ArticlesService {
  /**
   * Inserts a single article associated with a legal basis into the database.
   * Validates the article using the defined schema before inserting.
   * @param {number} legalBasisId - The ID of the legal basis to associate the article with.
   * @param {Object} article - The article to insert.
   * @param {string} article.title - The title of the article.
   * @param {string} article.article - The content of the article.
   * @param {number} article.order - The order of the article.
   * @returns {Promise<Article>} - The created article instance.
   * @throws {ErrorUtils} - If an error occurs during validation or insertion.
   */
  static async create (legalBasisId, article) {
    try {
      const parsedArticle = singleArticleSchema.parse(article)
      const legalBase = await LegalBasisRepository.findById(legalBasisId)
      if (!legalBase) {
        throw new ErrorUtils(404, 'LegalBasis not found')
      }
      const createdArticle = await ArticlesRepository.create(
        legalBasisId,
        parsedArticle
      )
      return createdArticle
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors = error.errors.map((e) => ({
          field: e.path[0],
          message: e.message
        }))
        throw new ErrorUtils(
          400,
          'Validation failed',
          validationErrors
        )
      }
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Unexpected error during article insertion')
    }
  }

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
  static async createMany (legalBasisId, articles) {
    try {
      const parsedArticles = articlesSchema.parse(articles)
      const legalBase = await LegalBasisRepository.findById(legalBasisId)
      if (!legalBase) {
        throw new ErrorUtils(404, 'LegalBasis not found')
      }
      const insertionSuccess = await ArticlesRepository.createMany(
        legalBasisId,
        parsedArticles
      )
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
        throw new ErrorUtils(
          400,
          'Validation failed',
          validationErrors
        )
      }
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Unexpected error during article insertion')
    }
  }

  /**
   * Fetches articles associated with a specific legal basis.
   * @param {number} legalBasisId - The ID of the legal basis.
   * @returns {Promise<Array<Article>>} - A list of articles associated with the legal basis.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async getByLegalBasisId (legalBasisId) {
    try {
      const legalBase = await LegalBasisRepository.findById(legalBasisId)
      if (!legalBase) {
        throw new ErrorUtils(404, 'LegalBasis not found')
      }
      const articles = await ArticlesRepository.findByLegalBasisId(
        legalBasisId
      )
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

  /**
   * Filters articles by their name.
   * @param {string} name - The name or part of the name to filter by.
   * @returns {Promise<Array<Article>>} - A list of articles matching the name.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async getByName (name) {
    try {
      const articles = await ArticlesRepository.findByName(name)
      if (!articles) {
        return []
      }
      return articles
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Error fetching articles by name')
    }
  }

  /**
   * Filters articles by their description.
   * @param {string} description - The description or part of the description to filter by.
   * @returns {Promise<Array<Article>>} - A list of articles matching the description.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async getByDescription (description) {
    try {
      const articles = await ArticlesRepository.findByDescription(description)
      if (!articles) {
        return []
      }
      return articles
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Error fetching articles by description')
    }
  }
}

export default ArticlesService
