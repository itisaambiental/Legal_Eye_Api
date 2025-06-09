import HttpException from '../../errors/HttpException.js'
import reqIdentificationQueue from '../../../workers/reqIdentificationWorker.js'
import QueueService from '../../queue/Queue.service.js'
import ReqIdentificationRepository from '../../../repositories/ReqIdentification.repository.js'
import LegalBasisRepository from '../../../repositories/LegalBasis.repository.js'
import RequirementRepository from '../../../repositories/Requirements.repository.js'

/**
 * Service class for managing requirement identification queue jobs.
 */
class ReqIdentifyService {
  /**
   * Retrieves the status of a requirement iddentification job from the queue.
   * @param {number|string} jobId - The job ID.
   * @returns {Promise<import('../../queue/Queue.service.js').JobStateResponse>} - The job state and relevant data.
   */
  static async getReqIdentificationJobStatus (jobId) {
    try {
      const job = await reqIdentificationQueue.getJob(jobId)
      if (!job) {
        return {
          status: 404,
          data: { message: 'Job not found' }
        }
      }
      const result = await QueueService.getJobState(job)
      return result
    } catch (error) {
      if (error instanceof HttpException) throw error
      throw new HttpException(
        500,
        'Failed to retrieve requirement identification job status',
        [{ jobId }]
      )
    }
  }

  /**
   * Checks if there are pending jobs for a specific requirement identification.
   * @param {number} reqIdentificationId - The ID of the requirement identification to check.
   * @returns {Promise<{ hasPendingJobs: boolean, jobId: string | number | null }>}
   */
  static async hasPendingReqIdentificationJobs (reqIdentificationId) {
    try {
      const identification = await ReqIdentificationRepository.findById(
        reqIdentificationId
      )
      if (!identification) {
        throw new HttpException(404, 'Requirement identification not found')
      }

      const statesToCheck = ['waiting', 'paused', 'active', 'delayed']
      const jobs = await QueueService.getJobsByStates(
        reqIdentificationQueue,
        statesToCheck
      )
      const job = jobs.find(
        (job) =>
          Number(job.data.reqIdentificationId) === Number(reqIdentificationId)
      )

      if (job) {
        return { hasPendingJobs: true, jobId: job.id }
      }

      return { hasPendingJobs: false, jobId: null }
    } catch (error) {
      if (error instanceof HttpException) throw error
      throw new HttpException(
        500,
        'Failed to check pending requirement identification jobs',
        [{ reqIdentificationId }]
      )
    }
  }

  /**
   * Checks if there are pending jobs for a specific legal basis.
   * @param {number} legalBasisId
   * @returns {Promise<{ hasPendingJobs: boolean, jobId: string | number | null }>}
   */
  static async hasPendingLegalBasisJobs (legalBasisId) {
    try {
      const legalBase = await LegalBasisRepository.findById(legalBasisId)
      if (!legalBase) {
        throw new HttpException(404, 'LegalBasis not found')
      }
      const statesToCheck = ['waiting', 'paused', 'active', 'delayed']
      const jobs = await QueueService.getJobsByStates(
        reqIdentificationQueue,
        statesToCheck
      )
      const job = jobs.find(
        (job) =>
          Array.isArray(job.data.legalBases) &&
          job.data.legalBases.some(
            (lb) => Number(lb.id) === Number(legalBasisId)
          )
      )

      if (job) {
        return { hasPendingJobs: true, jobId: job.id }
      }

      return { hasPendingJobs: false, jobId: null }
    } catch (error) {
      if (error instanceof HttpException) throw error
      throw new HttpException(
        500,
        'Failed to check pending jobs by legal basis',
        [{ legalBasisId }]
      )
    }
  }

  /**
   * Checks if there are pending jobs for a specific requirement.
   * @param {number} requirementId - ID of the requirement to check.
   * @returns {Promise<{ hasPendingJobs: boolean, jobId: string | number | null }>}
   */
  static async hasPendingRequirementJobs (requirementId) {
    try {
      const requirement = await RequirementRepository.findById(requirementId)
      if (!requirement) {
        throw new HttpException(404, 'Requirement not found')
      }
      const statesToCheck = ['waiting', 'paused', 'active', 'delayed']
      const jobs = await QueueService.getJobsByStates(
        reqIdentificationQueue,
        statesToCheck
      )

      const job = jobs.find(
        (job) =>
          Array.isArray(job.data.requirements) &&
          job.data.requirements.some(
            (r) => Number(r.id) === Number(requirementId)
          )
      )

      if (job) {
        return { hasPendingJobs: true, jobId: job.id }
      }

      return { hasPendingJobs: false, jobId: null }
    } catch (error) {
      if (error instanceof HttpException) throw error
      throw new HttpException(
        500,
        'Failed to check pending jobs by requirement',
        [{ requirementId }]
      )
    }
  }
}

export default ReqIdentifyService
