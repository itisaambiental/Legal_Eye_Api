import ErrorUtils from '../../../utils/Error.js'
import articlesQueue from '../../../workers/articlesWorker.js'
import QueueService from '../../queue/Queue.service.js'
import LegalBasisRepository from '../../../repositories/LegalBasis.repository.js'

/**
 * Service class for handling extract Articles Jobs operations.
 */
class ExtractArticlesService {
  /**
   * Retrieves the status of an article extraction job from the queue.
   * @param {string} jobId - The job ID.
   * @returns {Promise<import('../../queue/Queue.service.js').JobStateResponse>} - The job state and relevant data.
   * @throws {ErrorUtils} - If an error occurs while retrieving the job state.
   */
  static async getExtractionJobStatus (jobId) {
    try {
      const job = await articlesQueue.getJob(jobId)
      if (!job) {
        return {
          status: 404,
          data: { message: 'Job not found' }
        }
      }
      const result = await QueueService.getJobState(job)
      return result
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to retrieve extraction job status', [
        { jobId }
      ])
    }
  }

  /**
   * Checks if there are pending extraction jobs for a given legal basis ID.
   * If jobs exist, returns the jobId; otherwise, returns null.
   *
   * @param {number} legalBasisId - The ID of the legal basis to check.
   * @returns {Promise<{ hasPendingJobs: boolean, jobId: string | null }>}
   * @throws {ErrorUtils} - If an error occurs while checking the extraction queue.
   */
  static async hasPendingExtractionJobs (legalBasisId) {
    try {
      const legalBase = await LegalBasisRepository.findById(legalBasisId)
      if (!legalBase) {
        throw new ErrorUtils(404, 'LegalBasis not found')
      }
      const statesToCheck = ['waiting', 'paused', 'active', 'delayed']
      const jobs = await QueueService.getJobsByStates(articlesQueue, statesToCheck)
      const job = jobs.find((job) => Number(job.data.legalBasisId) === Number(legalBasisId))
      if (job) {
        return { hasPendingJobs: true, jobId: job.id }
      }
      return { hasPendingJobs: false, jobId: null }
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to check pending extraction jobs', [{ legalBasisId }])
    }
  }

  /**
   * Cancels an article extraction job by its ID.
   * @param {string} jobId - The ID of the job to cancel.
   * @returns {Promise<boolean>} - True if the job was successfully canceled.
   * @throws {ErrorUtils} - If the job cannot be canceled.
   */
  static async cancelExtractionJob (jobId) {
    try {
      const job = await articlesQueue.getJob(jobId)
      if (!job) {
        throw new ErrorUtils(404, 'Job not found')
      }
      return await QueueService.cancelJob(job)
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to cancel extraction job')
    }
  }
}

export default ExtractArticlesService
