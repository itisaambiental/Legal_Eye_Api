import HttpException from '../../errors/HttpException.js'
import sendLegalBasisQueue from '../../../workers/sendLegalBasisWorker.js'
import QueueService from '../../queue/Queue.service.js'
import LegalBasisRepository from '../../../repositories/LegalBasis.repository.js'

/**
 * Service class for handling Send Legal Basis Jobs operations.
 */
class SendLegalBasisService {
  /**
   * Sends selected Legal Basis entries to ACM Suite after validating them.
   * @param {number} userId - The ID of the user sending legal basis.
   * @param {Array<number>} legalBasisIds - An array of Legal Basis IDs to send.
   * @returns {Promise<{ jobId: string|number|null }>} - The job ID created for sending legal basis.
   * @throws {HttpException} - If validation fails or no valid records are found.
   */
  static async sendLegalBasis (userId, legalBasisIds) {
    try {
      const legalBasis = await LegalBasisRepository.findByIds(legalBasisIds)
      if (legalBasis.length !== legalBasisIds.length) {
        const notFoundIds = legalBasisIds.filter(
          (id) => !legalBasis.some((legalBase) => legalBase.id === id)
        )
        throw new HttpException(404, 'LegalBasis not found for IDs', {
          notFoundIds
        })
      }
      const job = await sendLegalBasisQueue.add({
        userId,
        legalBasisIds
      })
      return { jobId: job.id }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      throw new HttpException(
        500,
        'Unexpected error during send LegalBasis operation'
      )
    }
  }

  /**
   * Retrieves the status of a send legal basis job from the queue.
   * @param {string} jobId - The job ID.
   * @returns {Promise<import('../../queue/Queue.service.js').JobStateResponse>} - The job state and relevant data.
   * @throws {HttpException} - If an error occurs while retrieving the job state.
   */
  static async getSendLegalBasisJobStatus (jobId) {
    try {
      const job = await sendLegalBasisQueue.getJob(jobId)
      if (!job) {
        return {
          status: 404,
          data: { message: 'Job not found' }
        }
      }
      const result = await QueueService.getJobState(job)
      return result
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      throw new HttpException(
        500,
        'Failed to retrieve send legal basis job status',
        [{ jobId }]
      )
    }
  }

  /**
 * Checks if there are pending send jobs for a given legal basis ID.
 * If jobs exist, returns the jobId; otherwise, returns null.
 *
 * @param {number} legalBasisId - The ID of the legal basis to check.
 * @returns {Promise<{ hasPendingJobs: boolean, jobId: string | number | null }>}
 * @throws {HttpException} - If an error occurs while checking the send queue.
 */
  static async hasPendingSendJobs (legalBasisId) {
    try {
      const legalBase = await LegalBasisRepository.findById(legalBasisId)
      if (!legalBase) {
        throw new HttpException(404, 'LegalBasis not found')
      }
      const statesToCheck = ['waiting', 'paused', 'active', 'delayed']
      const jobs = await QueueService.getJobsByStates(sendLegalBasisQueue, statesToCheck)
      const job = jobs.find((job) => Array.isArray(job.data.legalBasisIds) && job.data.legalBasisIds.includes(Number(legalBasisId)))
      if (job) {
        return { hasPendingJobs: true, jobId: job.id }
      }
      return { hasPendingJobs: false, jobId: null }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      throw new HttpException(500, 'Failed to check pending send jobs', [{ legalBasisId }])
    }
  }
}

export default SendLegalBasisService
