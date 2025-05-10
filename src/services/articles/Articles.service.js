import ArticlesRepository from '../../repositories/Articles.repository.js'
import LegalBasisRepository from '../../repositories/LegalBasis.repository.js'
import {
  singleArticleSchema,
  articlesSchema
} from '../../schemas/article.schema.js'
import SendLegalBasisService from '../legalBasis/sendLegalBasis/sendLegalBasis.service.js'
import HttpException from '../../utils/HttpException.js'
import { z } from 'zod'
import { convert } from 'html-to-text'

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
   * @throws {HttpException} - If an error occurs during validation or insertion.
   */
  static async create (legalBasisId, article) {
    try {
      const parsedArticle = singleArticleSchema.parse(article)
      const legalBase = await LegalBasisRepository.findById(legalBasisId)
      if (!legalBase) {
        throw new HttpException(404, 'LegalBasis not found')
      }
      const plainArticle = parsedArticle.article
        ? convert(parsedArticle.article)
        : null
      const createdArticle = await ArticlesRepository.create(legalBasisId, {
        ...parsedArticle,
        plainArticle
      })
      return createdArticle
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors = error.errors.map((e) => ({
          field: e.path[0],
          message: e.message
        }))
        throw new HttpException(400, 'Validation failed', validationErrors)
      }
      if (error instanceof HttpException) {
        throw error
      }
      throw new HttpException(500, 'Unexpected error during article insertion')
    }
  }

  /**
   * Inserts articles associated with a legal basis into the database.
   * Validates the articles array using the defined schema before inserting.
   * @param {number} legalBasisId - The ID of the legal basis to associate the articles with.
   * @param {Array<Object>} articles - The list of articles to insert.
   * @param {string} articles[].title - The title of the article.
   * @param {string} articles[].article - The content of the article.
   * @param {string} articles[].plainArticle - The plain text equivalent of the article content.
   * @param {number} articles[].order - The order of the article.
   * @returns {Promise<boolean>} - Returns true if insertion is successful, false otherwise.
   * @throws {HttpException} - If an error occurs during validation or insertion.
   */
  static async createMany (legalBasisId, articles) {
    try {
      const parsedArticles = articlesSchema.parse(articles)
      const legalBase = await LegalBasisRepository.findById(legalBasisId)
      if (!legalBase) {
        throw new HttpException(404, 'LegalBasis not found')
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
        throw new HttpException(400, 'Validation failed', validationErrors)
      }
      if (error instanceof HttpException) {
        throw error
      }
      throw new HttpException(500, 'Unexpected error during article insertion')
    }
  }

  /**
   * Fetches articles associated with a specific legal basis.
   * @param {number} legalBasisId - The ID of the legal basis.
   * @returns {Promise<Array<Article>>} - A list of articles associated with the legal basis.
   * @throws {HttpException} - If an error occurs during retrieval.
   */
  static async getByLegalBasisId (legalBasisId) {
    try {
      const legalBase = await LegalBasisRepository.findById(legalBasisId)
      if (!legalBase) {
        throw new HttpException(404, 'LegalBasis not found')
      }
      const articles = await ArticlesRepository.findByLegalBasisId(
        legalBasisId
      )
      if (!articles) {
        return []
      }
      return articles
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      throw new HttpException(500, 'Error fetching articles from the database')
    }
  }

  /**
   * Filters articles by their name for a specific legal basis.
   * @param {number} legalBasisId - The ID of the legal basis to filter articles by.
   * @param {string} name - The name or part of the name to filter by.
   * @returns {Promise<Array<Article>>} - A list of articles matching the name for the given legal basis.
   * @throws {HttpException} - If an error occurs during retrieval.
   */
  static async getByName (legalBasisId, name) {
    try {
      const legalBase = await LegalBasisRepository.findById(legalBasisId)
      if (!legalBase) {
        throw new HttpException(404, 'LegalBasis not found')
      }
      const articles = await ArticlesRepository.findByName(legalBasisId, name)
      if (!articles) {
        return []
      }
      return articles
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      throw new HttpException(500, 'Error fetching articles by name')
    }
  }

  /**
   * Filters articles by their description for a specific legal basis.
   * @param {number} legalBasisId - The ID of the legal basis to filter articles by.
   * @param {string} description - The description or part of the description to filter by.
   * @returns {Promise<Array<Article>>} - A list of articles matching the description for the given legal basis.
   * @throws {HttpException} - If an error occurs during retrieval.
   */
  static async getByDescription (legalBasisId, description) {
    try {
      const legalBase = await LegalBasisRepository.findById(legalBasisId)
      if (!legalBase) {
        throw new HttpException(404, 'LegalBasis not found')
      }
      const articles = await ArticlesRepository.findByDescription(
        legalBasisId,
        description
      )
      if (!articles) {
        return []
      }
      return articles
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      throw new HttpException(500, 'Error fetching articles by description')
    }
  }

  /**
   * Fetch an article by its ID.
   * @param {number} id - The ID of the article to filter by.
   * @returns {Promise<Article>} - Returns the Article instance if successful.
   * @throws {HttpException} - If an error occurs during retrieval.
   */
  static async getById (id) {
    try {
      const articles = await ArticlesRepository.findById(id)
      if (!articles) {
        throw new HttpException(404, 'Article not found')
      }
      return articles
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      throw new HttpException(500, 'Error fetching articles by description')
    }
  }

  /**
   * Updates an article by its ID.
   * @param {number} id - The ID of the article to update.
   * @param {Object} article - The updated article data.
   * @param {string|null} article.title - The new title of the article, or null to keep the current title.
   * @param {string|null} article.article - The new content of the article, or null to keep the current content.
   * @param {number|null} article.order - The new order of the article, or null to keep the current order.
   * @returns {Promise<Article>} - Returns the updated Article instance if successful.
   * @throws {HttpException} - If an error occurs during validation or update.
   */
  static async updateById (id, article) {
    try {
      const parsedArticle = singleArticleSchema.parse(article)
      const existingArticle = await ArticlesRepository.findById(id)
      if (!existingArticle) {
        throw new HttpException(404, 'Article not found')
      }
      const plainArticle = parsedArticle.article
        ? convert(parsedArticle.article)
        : null
      const updatedArticle = await ArticlesRepository.updateById(id, {
        ...parsedArticle,
        plainArticle
      })
      if (!updatedArticle) {
        throw new HttpException(500, 'Article not found')
      }
      return updatedArticle
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors = error.errors.map((e) => ({
          field: e.path[0],
          message: e.message
        }))
        throw new HttpException(400, 'Validation failed', validationErrors)
      }
      if (error instanceof HttpException) {
        throw error
      }
      throw new HttpException(500, 'Unexpected error during article update')
    }
  }

  /**
   * Deletes an article by its ID.
   * @param {number} id - The ID of the article to delete.
   * @returns {Promise<{ success: boolean }>} - An object indicating the deletion was successful.
   * @throws {HttpException} - If an error occurs during deletion.
   */
  static async deleteById (id) {
    try {
      const existingArticle = await ArticlesRepository.findById(id)
      if (!existingArticle) {
        throw new HttpException(404, 'Article not found')
      }
      const { hasPendingJobs: hasPendingSendLegalBasisJobs } =
        await SendLegalBasisService.hasPendingSendJobs(
          existingArticle.legal_basis_id
        )
      if (hasPendingSendLegalBasisJobs) {
        throw new HttpException(
          409,
          'Cannot delete Article with pending Send Legal Basis jobs'
        )
      }
      const articleDeleted = await ArticlesRepository.deleteById(id)
      if (!articleDeleted) {
        throw new HttpException(500, 'Article not found')
      }
      return { success: true }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      throw new HttpException(500, 'Unexpected error during article deletion')
    }
  }

  /**
   * Deletes multiple articles by their IDs.
   * @param {Array<number>} articleIds - Array of article IDs to delete.
   * @returns {Promise<{ success: boolean }>} - An object indicating the deletion was successful.
   * @throws {HttpException} - If articles not found or deletion fails.
   */
  static async deleteArticlesBatch (articleIds) {
    try {
      const existingArticles = await ArticlesRepository.findByIds(articleIds)
      if (existingArticles.length !== articleIds.length) {
        const notFoundIds = articleIds.filter(
          (id) => !existingArticles.some((article) => article.id === id)
        )
        throw new HttpException(404, 'Articles not found for IDs', {
          notFoundIds
        })
      }
      const pendingSendLegalBasisJobs = []
      await Promise.all(
        existingArticles.map(async (article) => {
          const { hasPendingJobs: hasPendingSendLegalBasisJobsForArticle } =
            await SendLegalBasisService.hasPendingSendJobs(
              article.legal_basis_id
            )
          if (hasPendingSendLegalBasisJobsForArticle) {
            pendingSendLegalBasisJobs.push({
              id: article.id,
              name: article.article_name
            })
          }
        })
      )
      if (pendingSendLegalBasisJobs.length > 0) {
        throw new HttpException(
          409,
          'Cannot delete Articles with pending Send Legal Basis jobs',
          { articles: pendingSendLegalBasisJobs }
        )
      }
      const articlesDeleted = await ArticlesRepository.deleteBatch(articleIds)
      if (!articlesDeleted) {
        throw new HttpException(404, 'Articles not found')
      }
      return { success: true }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      throw new HttpException(500, 'Failed to delete articles')
    }
  }
}

export default ArticlesService
