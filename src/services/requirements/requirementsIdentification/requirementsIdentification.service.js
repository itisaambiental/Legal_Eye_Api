import RequirementsIdentificationRepository from '../../../repositories/RequirementsIdentification.repository.js'
import requirementsIdentificationSchema from '../../../schemas/requirementsIdentification.schema.js'
import RequirementsRepository from '../../../repositories/Requirements.repository.js'
import LegalBasisRepository from '../../../repositories/LegalBasis.repository.js'
import SubjectsRepository from '../../../repositories/Subject.repository.js'
import AspectsRepository from '../../../repositories/Aspects.repository.js'
import ArticlesRepository from '../../../repositories/Articles.repository.js'
import RequirementsIdentificationQueue from '../../../queues/requirementsIdentificationQueue.js'
import QueueService from '../../../services/queue/Queue.service.js'
import ErrorUtils from '../../../utils/Error.js'
import { z } from 'zod'

/**
 * Service class for handling the of Requirements Identification.
 */
class RequirementsIdentificationService {
  /**
   * Starts the requirements identification process.
   *
   * @param {Object} data - The input data for initiating the requirements identification.
   * @param {string} data.identificationName - The name of the identification process.
   * @param {string} [data.identificationDescription] - A brief description of the identification process (optional).
   * @param {Array<number>} data.legalBasisIds - An array of legal basis IDs to be analyzed.
   * @param {number} data.subjectId - The ID of the subject (materia) to which the identification belongs.
   * @param {Array<number>} data.aspectIds - An array of aspect IDs related to the selected subject.
   * @param {string} data.intelligenceLevel - The intelligence level to be used for the identification
   * @param {number} userId - The ID of the user initiating the identification.
   * @returns {Promise<{jobId: number|string, requirementsIdentificationId: number }>} jobId - The ID of the requirement identification job.
   * @throws {ErrorUtils} - If validation fails or an error occurs during processing.
   */
  static async startIdentification (data, userId) {
    try {
      const parsedData = requirementsIdentificationSchema.parse(data)
      const existingLegalBases = await LegalBasisRepository.findByIds(parsedData.legalBasisIds)
      if (existingLegalBases.length !== parsedData.legalBasisIds.length) {
        const missingLegalBases = parsedData.legalBasisIds.filter(id => !existingLegalBases.some(lb => lb.id === id))
        throw new ErrorUtils(404, 'LegalBasis not found for IDs', {
          notFoundIds: missingLegalBases
        })
      }
      for (const legalBasisId of parsedData.legalBasisIds) {
        const articles = await ArticlesRepository.findByLegalBasisId(legalBasisId)
        if (!articles) {
          throw new ErrorUtils(400, 'Some LegalBasis not have associated articles')
        }
      }
      const subjectExists = await SubjectsRepository.findById(parsedData.subjectId)
      if (!subjectExists) {
        throw new ErrorUtils(404, 'Subject not found')
      }
      const existingAspects = await AspectsRepository.findByIds(parsedData.aspectIds)
      if (existingAspects.length !== parsedData.aspectIds.length) {
        const missingAspects = parsedData.aspectIds.filter(id => !existingAspects.some(aspect => aspect.id === id))
        throw new ErrorUtils(404, 'Aspects not found for IDs', {
          notFoundIds: missingAspects
        })
      }
      const existingRequirements = await RequirementsRepository.findBySubjectAndAspects(parsedData.subjectId, parsedData.aspectIds)
      if (!existingRequirements) {
        throw new ErrorUtils(404, 'No requirements found for the selected subject and aspects')
      }
      const requirementsIdentification = await RequirementsIdentificationRepository.create({
        identificationName: parsedData.identificationName,
        identificationDescription: parsedData.identificationDescription,
        userId
      })
      const job = await RequirementsIdentificationQueue.add({
        requirementsIdentificationId: requirementsIdentification.id,
        legalBasis: existingLegalBases,
        requirements: existingRequirements,
        intelligenceLevel: parsedData.intelligenceLevel
      })
      return { jobId: job.id, requirementsIdentificationId: requirementsIdentification.id }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors = error.errors.map((e) => ({
          field: e.path[0],
          message: e.message
        }))
        throw new ErrorUtils(400, 'Validation failed', validationErrors)
      }
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Unexpected error staring requirements identification')
    }
  }

  /**
   * Retrieves the status of a requirements identification job from the queue.
   *
   * @param {string} jobId - The job ID.
   * @returns {Promise<import('../../queue/Queue.service.js').JobStateResponse>} - The job state and relevant data.
   * @throws {ErrorUtils} - If an error occurs while retrieving the job state.
   */
  static async getIdentificationJobStatus (jobId) {
    try {
      const job = await RequirementsIdentificationQueue.getJob(jobId)
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
      throw new ErrorUtils(500, 'Failed to retrieve requirements identification job status', [
        { jobId }
      ])
    }
  }

  /**
   * Checks if there are pending identification jobs for a given legal basis ID.
   * If jobs exist, returns the jobId; otherwise, returns null.
   *
   * @param {number} legalBasisId - The ID of the legal basis to check.
   * @returns {Promise<{ hasPendingJobs: boolean, jobId: string | null }>}
   * @throws {ErrorUtils} - If an error occurs while checking the queue.
   */
  static async hasPendingLegalBasisJobs (legalBasisId) {
    try {
      const legalBasis = await LegalBasisRepository.findById(legalBasisId)
      if (!legalBasis) {
        throw new ErrorUtils(404, 'LegalBasis not found')
      }
      const statesToCheck = ['waiting', 'paused', 'active', 'delayed']
      const jobs = await QueueService.getJobsByStates(RequirementsIdentificationQueue, statesToCheck)
      const job = jobs.find((job) =>
        Array.isArray(job.data.legalBasis) && job.data.legalBasis.some((lb) => Number(lb.id) === Number(legalBasisId))
      )
      if (job) {
        return { hasPendingJobs: true, jobId: job.id }
      }
      return { hasPendingJobs: false, jobId: null }
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to check pending identification jobs for LegalBasis', [{ legalBasisId }])
    }
  }

  /**
 * Checks if there are pending identification jobs for a given article ID.
 * If its associated legal basis has a pending job, the article is also considered as having a pending job.
 *
 * @param {number} articleId - The ID of the article to check.
 * @returns {Promise<{ hasPendingJobs: boolean, jobId: string | null }>}
 * @throws {ErrorUtils} - If an error occurs while checking the queue.
 */
  static async hasPendingArticleJobs (articleId) {
    try {
      const article = await ArticlesRepository.findById(articleId)
      if (!article) {
        throw new ErrorUtils(404, 'Article not found')
      }
      const legalBasisId = article.legal_basis_id
      const result = await this.hasPendingLegalBasisJobs(legalBasisId)
      return result
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to check pending identification jobs for Article', [{ articleId }])
    }
  }

  /**
     * Checks if there are pending processing jobs for a given requirement ID.
     * If jobs exist, returns the jobId; otherwise, returns null.
     *
     * @param {number} requirementId - The ID of the requirement to check.
     * @returns {Promise<{ hasPendingJobs: boolean, jobId: string | null }>}
     * @throws {ErrorUtils} - If an error occurs while checking the queue.
     */
  static async hasPendingRequirementJobs (requirementId) {
    try {
      const requirement = await RequirementsRepository.findById(requirementId)
      if (!requirement) {
        throw new ErrorUtils(404, 'Requirement not found')
      }
      const statesToCheck = ['waiting', 'paused', 'active', 'delayed']
      const jobs = await QueueService.getJobsByStates(RequirementsIdentificationQueue, statesToCheck)
      const job = jobs.find((job) =>
        Array.isArray(job.data.requirements) && job.data.requirements.some((req) => Number(req.id) === Number(requirementId))
      )
      if (job) {
        return { hasPendingJobs: true, jobId: job.id }
      }
      return { hasPendingJobs: false, jobId: null }
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to check pending processing jobs for Requirement', [{ requirementId }])
    }
  }

  /**
   * Cancels a requirements identification job by its ID.
   * @param {string} jobId - The ID of the job to cancel.
   * @returns {Promise<boolean>} - True if the job was successfully canceled.
   * @throws {ErrorUtils} - If the job cannot be canceled.
   */
  static async cancelIdentificationJob (jobId) {
    try {
      const job = await RequirementsIdentificationQueue.getJob(jobId)
      if (!job) {
        throw new ErrorUtils(404, 'Job not found')
      }
      return await QueueService.cancelJob(job)
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to cancel requirements identification job', [{ jobId }])
    }
  }
}

export default RequirementsIdentificationService
