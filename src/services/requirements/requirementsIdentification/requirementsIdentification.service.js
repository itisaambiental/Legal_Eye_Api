import RequirementsIdentificationRepository from '../../../repositories/RequirementsIdentification.repository.js'
import { requirementsIdentificationSchema, requirementsIdentificationUpdateSchema } from '../../../schemas/requirementsIdentification.schema.js'
import RequirementsRepository from '../../../repositories/Requirements.repository.js'
import LegalBasisRepository from '../../../repositories/LegalBasis.repository.js'
import SubjectsRepository from '../../../repositories/Subject.repository.js'
import AspectsRepository from '../../../repositories/Aspects.repository.js'
import ArticlesRepository from '../../../repositories/Articles.repository.js'
import UserRepository from '../../../repositories/User.repository.js'
import RequirementsIdentificationQueue from '../../../workers/requirementIdentificationWorker.js'
import QueueService from '../../../services/queue/Queue.service.js'
import ErrorUtils from '../../../utils/Error.js'
import { z } from 'zod'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

/**
 * Service class for handling the of Requirements Identification.
 */
class RequirementsIdentificationService {
  /**
   * @typedef {Object} RequirementsIdentification
   * @property {number} id - The unique identifier of the requirements identification (analysis).
   * @property {string} identificationName - The name of the identification or analysis.
   * @property {string} identificationDescription - A description of the identification or analysis.
   * @property {string} status - The status of the analysis ('Active', 'Completed', 'Failed').
   * @property {number|null} userId - The ID of the user who created the identification (nullable).
   * @property {Date} createdAt - The timestamp when the identification was created.
   */

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
      const identificationNameExists = await RequirementsIdentificationRepository.existsByName(parsedData.identificationName)
      if (identificationNameExists) {
        throw new ErrorUtils(409, 'Requirement Identification already exists')
      }
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
 * Checks if there are pending jobs for a given Requirements Identification ID.
 * If jobs exist, returns the jobId; otherwise, returns null.
 *
 * @param {number} requirementsIdentificationId - The ID of the requirements identification to check.
 * @returns {Promise<{ hasPendingJobs: boolean, jobId: string | null }>}
 * @throws {ErrorUtils} - If an error occurs while checking the queue.
 */
  static async hasPendingRequirementsIdentificationJobs (requirementsIdentificationId) {
    try {
      const requirementsIdentification = await RequirementsIdentificationRepository.findById(requirementsIdentificationId)
      if (!requirementsIdentification) {
        throw new ErrorUtils(404, 'Requirement Identification not found')
      }
      const statesToCheck = ['waiting', 'paused', 'active', 'delayed']
      const jobs = await QueueService.getJobsByStates(RequirementsIdentificationQueue, statesToCheck)
      const job = jobs.find(job =>
        Number(job.data.requirementsIdentificationId) === Number(requirementsIdentificationId)
      )
      if (job) {
        return { hasPendingJobs: true, jobId: job.id }
      }
      return { hasPendingJobs: false, jobId: null }
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to check pending jobs for Requirements Identification', [{ requirementsIdentificationId }])
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

  /**
  * Retrieves a single requirements identification by its ID.
  * @param {number} id - The ID of the requirements identification to retrieve.
  * @returns {Promise<RequirementsIdentification|null>} - The formatted identification or null if not found.
  * @throws {ErrorUtils} - If an error occurs during retrieval.
  */
  static async getById (id) {
    try {
      const identification = await RequirementsIdentificationRepository.findById(id)
      if (!identification) {
        throw new ErrorUtils(404, 'Requirement Identification not found')
      }
      let formattedCreatedAt = null
      if (identification.created_at) {
        formattedCreatedAt = format(
          new Date(identification.created_at),
          'dd-MM-yyyy',
          { locale: es }
        )
      }
      return {
        id: identification.id,
        identification_name: identification.identification_name,
        identification_description: identification.identification_description,
        status: identification.status,
        user_id: identification.user_id,
        created_at: formattedCreatedAt
      }
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Error retrieving requirement identification by ID')
    }
  }

  /**
 * Retrieves all requirements identifications from the database.
 *
 * @typedef {Object} RequirementsIdentification
 * @property {number} id - The ID of the identification.
 * @property {string} identificationName - The name of the identification.
 * @property {string} identificationDescription - The description of the identification.
 * @property {string} status - The status of the identification ('Active', 'Completed', 'Failed').
 * @property {number|null} userId - The ID of the user who created the identification.
 * @property {string} createdAt - The timestamp when the identification was created.
 *
 * @returns {Promise<Array<RequirementsIdentification>>} - A list of all identifications.
 * @throws {ErrorUtils} - If an error occurs during retrieval.
 */
  static async getAllIdentifications () {
    try {
      const requirementsIdentification = await RequirementsIdentificationRepository.findAll()
      if (!requirementsIdentification) {
        return []
      }
      const formattedIdentifications = await Promise.all(
        requirementsIdentification.map(async (identification) => {
          let formattedCreatedAt = null
          if (identification.created_at) {
            formattedCreatedAt = format(
              new Date(identification.created_at),
              'dd-MM-yyyy',
              { locale: es }
            )
          }
          return {
            id: identification.id,
            identification_name: identification.identification_name,
            identification_description: identification.identification_description,
            status: identification.status,
            user_id: identification.user_id,
            created_at: formattedCreatedAt
          }
        })
      )
      return formattedIdentifications
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to retrieve all requirements identifications')
    }
  }

  /**
   * Retrieves all requirements identifications filtered by identification name.
   * @param {string} identificationName - The identification name to filter by.
   * @returns {Promise<Array<RequirementsIdentification>>} - A list of identifications matching the name.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async getByName (identificationName) {
    try {
      const requirementsIdentification = await RequirementsIdentificationRepository.findByName(identificationName)
      if (!requirementsIdentification) {
        return []
      }
      const formattedIdentifications = await Promise.all(
        requirementsIdentification.map(async (identification) => {
          let formattedCreatedAt = null
          if (identification.created_at) {
            formattedCreatedAt = format(
              new Date(identification.created_at),
              'dd-MM-yyyy',
              { locale: es }
            )
          }
          return {
            id: identification.id,
            identification_name: identification.identification_name,
            identification_description: identification.identification_description,
            status: identification.status,
            user_id: identification.user_id,
            created_at: formattedCreatedAt
          }
        })
      )
      return formattedIdentifications
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Error retrieving identifications by name')
    }
  }

  /**
     * Retrieves all requirements identifications filtered by identification description.
     * @param {string} identificationDescription - The identification description to filter by.
     * @returns {Promise<Array<RequirementsIdentification>>} - A list of identifications matching the description.
     * @throws {ErrorUtils} - If an error occurs during retrieval.
     */
  static async getByDescription (identificationDescription) {
    try {
      const requirementsIdentification = await RequirementsIdentificationRepository.findByDescription(identificationDescription)
      if (!requirementsIdentification) {
        return []
      }
      const formattedIdentifications = await Promise.all(
        requirementsIdentification.map(async (identification) => {
          let formattedCreatedAt = null
          if (identification.created_at) {
            formattedCreatedAt = format(
              new Date(identification.created_at),
              'dd-MM-yyyy',
              { locale: es }
            )
          }
          return {
            id: identification.id,
            identification_name: identification.identification_name,
            identification_description: identification.identification_description,
            status: identification.status,
            user_id: identification.user_id,
            created_at: formattedCreatedAt
          }
        })
      )
      return formattedIdentifications
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Error retrieving identifications by description')
    }
  }

  /**
     * Retrieves all requirements identifications filtered by status.
     * @param {string} status - The status to filter by.
     * @returns {Promise<Array<RequirementsIdentification>>} - A list of identifications matching the status.
     * @throws {ErrorUtils} - If an error occurs during retrieval.
     */
  static async getByStatus (status) {
    try {
      const requirementsIdentification = await RequirementsIdentificationRepository.findByStatus(status)
      if (!requirementsIdentification) {
        return []
      }
      const formattedIdentifications = await Promise.all(
        requirementsIdentification.map(async (identification) => {
          let formattedCreatedAt = null
          if (identification.created_at) {
            formattedCreatedAt = format(
              new Date(identification.created_at),
              'dd-MM-yyyy',
              { locale: es }
            )
          }
          return {
            id: identification.id,
            identification_name: identification.identification_name,
            identification_description: identification.identification_description,
            status: identification.status,
            user_id: identification.user_id,
            created_at: formattedCreatedAt
          }
        })
      )
      return formattedIdentifications
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Error retrieving identifications by status')
    }
  }

  /**
 * Retrieves all requirements identifications filtered by user ID.
 * Validates if the user exists first.
 * @param {number} userId - The user ID to filter by.
 * @returns {Promise<{ userExists: boolean, identifications: Array<RequirementsIdentification> }>} - An object containing user existence and identifications list.
 * @throws {ErrorUtils} - If an error occurs during retrieval.
 */
  static async getByUserId (userId) {
    try {
      const user = await UserRepository.findById(userId)
      if (!user) {
        throw new ErrorUtils(404, 'User not found')
      }

      const requirementsIdentification = await RequirementsIdentificationRepository.findByUserId(userId)
      if (!requirementsIdentification) {
        return []
      }
      const formattedIdentifications = await Promise.all(
        requirementsIdentification.map(async (identification) => {
          let formattedCreatedAt = null
          if (identification.created_at) {
            formattedCreatedAt = format(
              new Date(identification.created_at),
              'dd-MM-yyyy',
              { locale: es }
            )
          }
          return {
            id: identification.id,
            identification_name: identification.identification_name,
            identification_description: identification.identification_description,
            status: identification.status,
            user_id: identification.user_id,
            created_at: formattedCreatedAt
          }
        })
      )
      return formattedIdentifications
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Error retrieving identifications by user ID')
    }
  }

  /**
 * Retrieves all requirements identifications filtered by a created_at date range.
 * Both 'from' and 'to' are optional. If provided, they can be in 'YYYY-MM-DD' or 'DD-MM-YYYY'.
 *
 * @param {string} [from] - Start date.
 * @param {string} [to] - End date.
 * @returns {Promise<Array<RequirementsIdentification>>} - A list of identifications filtered by created_at.
 * @throws {ErrorUtils} - If an error occurs during retrieval.
 */
  static async getByCreatedAt (from, to) {
    try {
      const identifications = await RequirementsIdentificationRepository.findByCreatedAt(from, to)
      if (!identifications) {
        return []
      }
      const formattedIdentifications = await Promise.all(
        identifications.map(async (identification) => {
          let formattedCreatedAt = null
          if (identification.created_at) {
            formattedCreatedAt = format(
              new Date(identification.created_at),
              'dd-MM-yyyy',
              { locale: es }
            )
          }
          return {
            id: identification.id,
            identification_name: identification.identification_name,
            identification_description: identification.identification_description,
            status: identification.status,
            user_id: identification.user_id,
            created_at: formattedCreatedAt
          }
        })
      )
      return formattedIdentifications
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Error retrieving identifications by created_at range')
    }
  }

  /**
   * Updates an existing requirements identification entry.
   *
   * @param {number} identificationId - The ID of the identification to update.
   * @param {Object} data - The updated identification data.
   * @param {string} data.identificationName - The name for the identification.
   * @param {string} data.identificationDescription - The description for the identification.
   * @returns {Promise<RequirementsIdentification>} - The updated identification data.
   * @throws {ErrorUtils} - If validation fails, the identification is not found, or an error occurs during update.
   */
  static async updateById (identificationId, data) {
    try {
      const parsedData = requirementsIdentificationUpdateSchema.parse(data)
      const existingIdentification = await RequirementsIdentificationRepository.findById(identificationId)
      if (!existingIdentification) {
        throw new ErrorUtils(404, 'Requirement Identification not found')
      }
      const identificationNameExists = await RequirementsIdentificationRepository.existsByNameExcludingId(parsedData.identificationName, identificationId)
      if (identificationNameExists) {
        throw new ErrorUtils(409, 'Requirement Identification already exists')
      }
      const updatedIdentification = await RequirementsIdentificationRepository.updateById(identificationId, {
        identificationName: parsedData.identificationName,
        identificationDescription: parsedData.identificationDescription
      })
      if (!updatedIdentification) {
        throw new ErrorUtils(404, 'Requirement Identification not found')
      }
      return updatedIdentification
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Unexpected error during requirements identification update')
    }
  }

  /**
 * Deletes a requirements identification by ID.
 * Validates if the identification has an active job before deletion.
 *
 * @param {number} identificationId - The ID of the identification to delete.
 * @returns {Promise<boolean>} - Returns true if deleted, otherwise throws an error.
 * @throws {ErrorUtils} - If the identification has an active job or an error occurs.
 */
  static async deleteById (identificationId) {
    try {
      const existingIdentification = await RequirementsIdentificationRepository.findById(identificationId)
      if (!existingIdentification) {
        throw new ErrorUtils(404, 'Requirement Identification not found')
      }
      const { hasPendingJobs: hasPendingRequirementIdentificationJobs } = await this.hasPendingRequirementsIdentificationJobs(identificationId)
      if (hasPendingRequirementIdentificationJobs) {
        throw new ErrorUtils(409, 'Cannot delete Requirement Identification with pending Requirement Identification jobs')
      }
      const identificationDeleted = await RequirementsIdentificationRepository.deleteById(identificationId)
      if (!identificationDeleted) {
        throw new ErrorUtils(404, 'Requirement Identification not found')
      }
      return true
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Unexpected error during requirements identification deletion')
    }
  }

  /**
 * Deletes multiple requirements identifications by their IDs.
 * @param {Array<number>} identificationIds - Array of IDs of the identifications to delete.
 * @returns {Promise<{ success: boolean }>} - An object indicating the deletion was successful.
 * @throws {ErrorUtils} - If identifications not found, have active jobs, or deletion fails.
 */
  static async deleteBatch (identificationIds) {
    try {
      const existingIdentifications = await RequirementsIdentificationRepository.findByIds(identificationIds)
      if (existingIdentifications.length !== identificationIds.length) {
        const notFoundIds = identificationIds.filter(
          (id) => !existingIdentifications.some((ident) => ident.id === id)
        )
        throw new ErrorUtils(404, 'Requirements Identifications not found for provided IDs', { notFoundIds })
      }
      const results = await Promise.all(
        existingIdentifications.map(async (identification) => {
          const { hasPendingJobs: hasPendingRequirementIdentificationJobs } = await this.hasPendingRequirementsIdentificationJobs(identification.id)
          return hasPendingRequirementIdentificationJobs
            ? { id: identification.id, name: identification.name }
            : null
        })
      )
      const pendingRequirementIdentificationJobs = results.filter(Boolean)
      if (pendingRequirementIdentificationJobs.length > 0) {
        throw new ErrorUtils(
          409,
          'Cannot delete Requirements Identifications with pending Requirement Identification jobs',
          { identifications: pendingRequirementIdentificationJobs }
        )
      }
      const identificationsDeleted = await RequirementsIdentificationRepository.deleteBatch(identificationIds)
      if (!identificationsDeleted) {
        throw new ErrorUtils(404, 'Requirements Identification not found')
      }
      return { success: true }
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Unexpected error during batch deletion of Requirements Identifications')
    }
  }
}

export default RequirementsIdentificationService
