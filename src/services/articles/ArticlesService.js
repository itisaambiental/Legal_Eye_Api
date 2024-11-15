import ArticlesRepository from '../../repositories/Articles.repository.js'
import articlesSchema from '../../validations/articlesValidation.js'
import ErrorUtils from '../../utils/Error.js'
import articlesQueue from '../../queues/articlesQueue.js'
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
      const validatedArticles = articlesSchema.parse(articles)
      const insertionSuccess = await ArticlesRepository.insertArticles(legalBasisId, validatedArticles)
      if (!insertionSuccess) {
        throw new ErrorUtils(500, 'Failed to insert articles into the database.')
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
 * Fetch the job from the queue and return the job state.
 * @param {string} jobId - The job ID.
 * @returns {Object} - The job state and relevant data.
 */
  static async getStatusArticlesJobs (jobId) {
    try {
      const job = await articlesQueue.getJob(jobId)
      if (!job) {
        return {
          status: 404,
          data: { message: 'Job not found' }
        }
      }
      const state = await job.getState()
      switch (state) {
        case 'waiting':
        case 'active': {
          const progress = job.progress()
          return {
            status: 200,
            data: {
              message: 'Job is still processing',
              jobProgress: progress
            }
          }
        }
        case 'completed': {
          return {
            status: 201,
            data: {
              message: 'Job completed successfully'
            }
          }
        }
        case 'failed': {
          const failedReason = job.failedReason || 'Unknown error'
          return {
            status: 500,
            data: {
              message: 'Job failed',
              error: failedReason
            }
          }
        }
        case 'delayed': {
          return {
            status: 200,
            data: {
              message: 'Job is delayed and will be processed later'
            }
          }
        }
        case 'paused': {
          return {
            status: 200,
            data: {
              message: 'Job is paused and will be resumed once unpaused'
            }
          }
        }
        case 'stuck': {
          return {
            status: 500,
            data: {
              message: 'Job is stuck and cannot proceed'
            }
          }
        }
        default:
          return {
            status: 500,
            data: { message: 'Job is in an unknown state' }
          }
      }
    } catch (error) {
      throw new ErrorUtils(500, 'Failed to retrieve status records for job', [
        { jobId }
      ])
    }
  }
}

export default ArticlesService
