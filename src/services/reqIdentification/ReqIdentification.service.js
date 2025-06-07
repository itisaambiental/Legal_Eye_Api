import { z } from 'zod'
import UserRepository from '../../repositories/User.repository.js'
import SubjectsRepository from '../../repositories/Subject.repository.js'
import AspectsRepository from '../../repositories/Aspects.repository.js'
import LegalBasisRepository from '../../repositories/LegalBasis.repository.js'
import RequirementRepository from '../../repositories/Requirements.repository.js'
import ReqIdentificationRepository from '../../repositories/ReqIdentification.repository.js'
import {
  reqIdentificationSchema,
  reqIdentificationUpdateSchema
} from '../../schemas/reqIdentification.schema.js'
import reqIdentificationQueue from '../../workers/reqIdentificationWorker.js'
import ReqIdentifyService from '../reqIdentification/reqIdentify/ReqIdentify.service.js'
import HttpException from '../../services/errors/HttpException.js'
import FileService from '../files/File.service.js'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

/**
 * Service class for handling requirement identifications operations.
 */
class ReqIdentificationService {
  /**
   * @typedef {Object} Aspect
   * @property {number} aspect_id - The ID of the aspect.
   * @property {string} aspect_name - The name of the aspect.
   * @property {string} [abbreviation] - Optional abbreviation for the aspect.
   * @property {number} [order_index] - Optional order index for the aspect.
   */

  /**
   * @typedef {Object} Subject
   * @property {number} subject_id - The ID of the subject.
   * @property {string} subject_name - The name of the subject.
   * @property {string} [abbreviation] - Optional abbreviation for the subject.
   * @property {number} [order_index] - Optional order index for the subject.
   */

  /** @typedef {import('./../../models/User.model.js').default} User */

  /**
   * @typedef {Object} ReqIdentification
   * @property {number} id - The unique identifier of the requirement identification.
   * @property {string} name - The name of the identification.
   * @property {string|null} description - A description of the identification.
   * @property {string} createdAt - Formatted creation date (dd-MM-yyyy).
   * @property {'Active'|'Failed'|'Completed'} status - The current status of the identification.
   * @property {User} user - The user who created the identification.
   * @property {Subject} subject - The subject associated with the identification.
   * @property {Aspect[]} aspects - List of associated aspects.
   * @property {string} jurisdiction - The jurisdiction of the legal basis.
   * @property {string} [state] - The state name, if applicable.
   * @property {string} [municipality] - The municipality name, if applicable.
   */

  /**
   * Creates a new requirements identification.
   *
   * @param {number} userId - ID of the user creating the requirement identification.
   * @param {Object} reqIdentification - Parameters for creating a requirement identification.
   * @param {string} reqIdentification.reqIdentificationName - Name of the requirement identification.
   * @param {string|null} [reqIdentification.reqIdentificationDescription] - Optional description of the requirement identification.
   * @param {number[]} reqIdentification.legalBasisIds - Array of Legal Basis IDs to associate with the requirement identification.
   * @param {string} reqIdentification.intelligenceLevel - Level of intelligence to identify requirements.
   * @returns {Promise<{ reqIdentificationId: number, jobId: number|string }>} - The ID of the created requirement identification and the associated job ID.
   * @throws {HttpException} - If an error occurs during validation or creation.
   */
  static async create (userId, reqIdentification) {
    try {
      const parsedReqIdentification =
        reqIdentificationSchema.parse(reqIdentification)
      const legalBases = await LegalBasisRepository.findByIds(
        parsedReqIdentification.legalBasisIds
      )
      if (legalBases.length !== parsedReqIdentification.legalBasisIds.length) {
        const notFoundIds = parsedReqIdentification.legalBasisIds.filter(
          (id) => !legalBases.some((lb) => lb.id === id)
        )
        throw new HttpException(400, 'LegalBasis not found for IDs', {
          notFoundIds
        })
      }
      const reqIdentificationExistsByName =
        await ReqIdentificationRepository.existsByName(
          parsedReqIdentification.reqIdentificationName
        )
      if (reqIdentificationExistsByName) {
        throw new HttpException(
          409,
          'Requirement Identification name already exists'
        )
      }
      const subjectIds = new Set(legalBases.map((lb) => lb.subject.subject_id))
      if (subjectIds.size !== 1) {
        throw new HttpException(
          400,
          'All selected legal bases must have the same subject'
        )
      }
      const [subjectId] = subjectIds
      const jurisdictions = new Set(legalBases.map((lb) => lb.jurisdiction))
      if (jurisdictions.size !== 1) {
        throw new HttpException(
          400,
          'All selected legal bases must have the same jurisdiction'
        )
      }
      const [jurisdiction] = jurisdictions
      if (jurisdiction === 'Estatal' || jurisdiction === 'Local') {
        const states = new Set(legalBases.map((lb) => lb.state))
        if (states.size !== 1) {
          throw new HttpException(
            400,
            'All selected legal bases must have the same state'
          )
        }
        if (jurisdiction === 'Local') {
          const municipalities = new Set(
            legalBases.map((lb) => lb.municipality)
          )
          if (municipalities.size !== 1) {
            throw new HttpException(
              400,
              'All selected legal bases must have the same municipality'
            )
          }
        }
      }
      const aspectIds = [
        ...new Set(
          legalBases.flatMap((lb) => lb.aspects.map((a) => a.aspect_id))
        )
      ]
      const requirements = await RequirementRepository.findBySubjectAndAspects(
        subjectId,
        aspectIds
      )
      if (!requirements) {
        throw new HttpException(400, 'Requirements not found')
      }
      const { id } = await ReqIdentificationRepository.create({
        identificationName: parsedReqIdentification.reqIdentificationName,
        identificationDescription:
          parsedReqIdentification.reqIdentificationDescription,
        userId
      })
      const job = await reqIdentificationQueue.add({
        reqIdentificationId: id,
        legalBases,
        requirements,
        intelligenceLevel: parsedReqIdentification.intelligenceLevel
      })
      return { reqIdentificationId: id, jobId: job.id }
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
      throw new HttpException(
        500,
        'Unexpected error during requirement identification creation'
      )
    }
  }

  /**
   * Retrieves all requirement identifications.
   *
   * @returns {Promise<ReqIdentification[]>} - List of all requirement identifications.
   * @throws {HttpException}
   */
  static async getAll () {
    try {
      const reqIdentifications = await ReqIdentificationRepository.findAll()
      if (!reqIdentifications) {
        return []
      }
      const reqIdentificationsList = await Promise.all(
        reqIdentifications.map(async (reqIdentification) => {
          let user = null

          if (reqIdentification.user) {
            const profilePictureUrl = reqIdentification.user.profile_picture
              ? await FileService.getFile(
                reqIdentification.user.profile_picture
              )
              : null

            user = {
              ...reqIdentification.user,
              profile_picture: profilePictureUrl
            }
          }

          let formattedCreatedAt = null
          if (reqIdentification.createdAt) {
            formattedCreatedAt = format(
              new Date(reqIdentification.createdAt),
              'dd-MM-yyyy hh:mm a',
              { locale: es }
            )
          }

          return {
            ...reqIdentification,
            user,
            createdAt: formattedCreatedAt
          }
        })
      )

      return reqIdentificationsList
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      throw new HttpException(
        500,
        'Failed to retrieve requirement identifications'
      )
    }
  }

  /**
   * Retrieves a requirement identification by its ID.
   *
   * @param {number} id - The ID of the requirement identification to fetch.
   * @returns {Promise<ReqIdentification>} - The requirement identification
   * @throws {HttpException}
   */
  static async getById (id) {
    try {
      const reqIdentification = await ReqIdentificationRepository.findById(id)
      if (!reqIdentification) {
        throw new HttpException(404, 'Requirement identification not found')
      }

      let user = null
      if (reqIdentification.user) {
        const profilePictureUrl = reqIdentification.user.profile_picture
          ? await FileService.getFile(reqIdentification.user.profile_picture)
          : null
        user = {
          ...reqIdentification.user,
          profile_picture: profilePictureUrl
        }
      }
      let formattedCreatedAt = null
      if (reqIdentification.createdAt) {
        formattedCreatedAt = format(
          new Date(reqIdentification.createdAt),
          'dd-MM-yyyy hh:mm a',
          { locale: es }
        )
      }
      return {
        ...reqIdentification,
        user,
        createdAt: formattedCreatedAt
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      throw new HttpException(
        500,
        'Failed to retrieve requirement identification by ID'
      )
    }
  }

  /**
   * Retrieves requirement identifications by name.
   *
   * @param {string} name - The name to search for.
   * @returns {Promise<ReqIdentification[]>} - List of requirement identifications.
   * @throws {HttpException}
   */
  static async getByName (name) {
    try {
      const reqIdentifications = await ReqIdentificationRepository.findByName(
        name
      )
      if (!reqIdentifications) {
        return []
      }

      const reqIdentificationsList = await Promise.all(
        reqIdentifications.map(async (reqIdentification) => {
          let user = null
          if (reqIdentification.user) {
            const profilePictureUrl = reqIdentification.user.profile_picture
              ? await FileService.getFile(
                reqIdentification.user.profile_picture
              )
              : null
            user = {
              ...reqIdentification.user,
              profile_picture: profilePictureUrl
            }
          }

          let formattedCreatedAt = null
          if (reqIdentification.createdAt) {
            formattedCreatedAt = format(
              new Date(reqIdentification.createdAt),
              'dd-MM-yyyy hh:mm a',
              { locale: es }
            )
          }

          return {
            ...reqIdentification,
            user,
            createdAt: formattedCreatedAt
          }
        })
      )

      return reqIdentificationsList
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      throw new HttpException(
        500,
        'Failed to retrieve requirement identifications by name'
      )
    }
  }

  /**
   * Retrieves requirement identifications by description.
   *
   * @param {string} description - The description to search for.
   * @returns {Promise<ReqIdentification[]>} - List of requirement identifications.
   * @throws {HttpException}
   */
  static async getByDescription (description) {
    try {
      const reqIdentifications =
        await ReqIdentificationRepository.findByDescription(description)
      if (!reqIdentifications) {
        return []
      }

      const reqIdentificationsList = await Promise.all(
        reqIdentifications.map(async (reqIdentification) => {
          let user = null
          if (reqIdentification.user) {
            const profilePictureUrl = reqIdentification.user.profile_picture
              ? await FileService.getFile(
                reqIdentification.user.profile_picture
              )
              : null
            user = {
              ...reqIdentification.user,
              profile_picture: profilePictureUrl
            }
          }

          let formattedCreatedAt = null
          if (reqIdentification.createdAt) {
            formattedCreatedAt = format(
              new Date(reqIdentification.createdAt),
              'dd-MM-yyyy hh:mm a',
              { locale: es }
            )
          }

          return {
            ...reqIdentification,
            user,
            createdAt: formattedCreatedAt
          }
        })
      )

      return reqIdentificationsList
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      throw new HttpException(
        500,
        'Failed to retrieve requirement identifications by description'
      )
    }
  }

  /**
   * Retrieves requirement identifications by user ID.
   *
   * @param {number} userId - The ID of the user to search for.
   * @returns {Promise<ReqIdentification[]>} - List of requirement identifications.
   * @throws {HttpException}
   */
  static async getByUserId (userId) {
    try {
      const user = await UserRepository.findById(userId)
      if (!user) {
        throw new HttpException(404, 'User not found')
      }
      const reqIdentifications = await ReqIdentificationRepository.findByUserId(
        userId
      )
      if (!reqIdentifications) {
        return []
      }

      const reqIdentificationsList = await Promise.all(
        reqIdentifications.map(async (reqIdentification) => {
          let user = null
          if (reqIdentification.user) {
            const profilePictureUrl = reqIdentification.user.profile_picture
              ? await FileService.getFile(
                reqIdentification.user.profile_picture
              )
              : null
            user = {
              ...reqIdentification.user,
              profile_picture: profilePictureUrl
            }
          }

          let formattedCreatedAt = null
          if (reqIdentification.createdAt) {
            formattedCreatedAt = format(
              new Date(reqIdentification.createdAt),
              'dd-MM-yyyy hh:mm a',
              { locale: es }
            )
          }

          return {
            ...reqIdentification,
            user,
            createdAt: formattedCreatedAt
          }
        })
      )

      return reqIdentificationsList
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      throw new HttpException(
        500,
        'Failed to retrieve requirement identifications by user name'
      )
    }
  }

  /**
   * Retrieves requirement identifications filtered by a creation date range.
   * Both 'from' and 'to' are optional. If provided, they should be in 'YYYY-MM-DD' or valid date format.
   *
   * @function getByCreatedAt
   * @param {string} [from] - Start date.
   * @param {string} [to] - End date.
   * @returns {Promise<ReqIdentification[]>} - List of requirement identifications.
   * @throws {HttpException}
   */
  static async getByCreatedAt (from, to) {
    try {
      const reqIdentifications =
        await ReqIdentificationRepository.findByCreatedAt(from, to)
      if (!reqIdentifications) {
        return []
      }

      const reqIdentificationsList = await Promise.all(
        reqIdentifications.map(async (reqIdentification) => {
          let user = null
          if (reqIdentification.user) {
            const profilePictureUrl = reqIdentification.user.profile_picture
              ? await FileService.getFile(
                reqIdentification.user.profile_picture
              )
              : null
            user = {
              ...reqIdentification.user,
              profile_picture: profilePictureUrl
            }
          }

          let formattedCreatedAt = null
          if (reqIdentification.createdAt) {
            formattedCreatedAt = format(
              new Date(reqIdentification.createdAt),
              'dd-MM-yyyy hh:mm a',
              { locale: es }
            )
          }

          return {
            ...reqIdentification,
            user,
            createdAt: formattedCreatedAt
          }
        })
      )

      return reqIdentificationsList
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      throw new HttpException(
        500,
        'Failed to retrieve requirement identifications by creation date range'
      )
    }
  }

  /**
   * Retrieves requirement identifications by status.
   *
   * @param {string} status - The status to filter by ('Activo' | 'Fallido' | 'Completado').
   * @returns {Promise<ReqIdentification[]>} - List of requirement identifications.
   * @throws {HttpException}
   */
  static async getByStatus (status) {
    try {
      const reqIdentifications = await ReqIdentificationRepository.findByStatus(
        status
      )
      if (!reqIdentifications) {
        return []
      }

      const reqIdentificationsList = await Promise.all(
        reqIdentifications.map(async (reqIdentification) => {
          let user = null
          if (reqIdentification.user) {
            const profilePictureUrl = reqIdentification.user.profile_picture
              ? await FileService.getFile(
                reqIdentification.user.profile_picture
              )
              : null
            user = {
              ...reqIdentification.user,
              profile_picture: profilePictureUrl
            }
          }

          let formattedCreatedAt = null
          if (reqIdentification.createdAt) {
            formattedCreatedAt = format(
              new Date(reqIdentification.createdAt),
              'dd-MM-yyyy hh:mm a',
              { locale: es }
            )
          }

          return {
            ...reqIdentification,
            user,
            createdAt: formattedCreatedAt
          }
        })
      )

      return reqIdentificationsList
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      throw new HttpException(
        500,
        'Failed to retrieve requirement identifications by status'
      )
    }
  }

  /**
   * Retrieves requirement identifications by subject ID.
   *
   * @param {number} subjectId - The subject ID to filter by.
   * @returns {Promise<ReqIdentification[]>} - List of requirement identifications.
   * @throws {HttpException}
   */
  static async getBySubjectId (subjectId) {
    try {
      const subject = await SubjectsRepository.findById(subjectId)
      if (!subject) {
        throw new HttpException(404, 'Subject not found')
      }
      const reqIdentifications =
        await ReqIdentificationRepository.findBySubjectId(subjectId)
      if (!reqIdentifications) {
        return []
      }

      const reqIdentificationsList = await Promise.all(
        reqIdentifications.map(async (reqIdentification) => {
          let user = null
          if (reqIdentification.user) {
            const profilePictureUrl = reqIdentification.user.profile_picture
              ? await FileService.getFile(
                reqIdentification.user.profile_picture
              )
              : null
            user = {
              ...reqIdentification.user,
              profile_picture: profilePictureUrl
            }
          }

          let formattedCreatedAt = null
          if (reqIdentification.createdAt) {
            formattedCreatedAt = format(
              new Date(reqIdentification.createdAt),
              'dd-MM-yyyy hh:mm a',
              { locale: es }
            )
          }

          return {
            ...reqIdentification,
            user,
            createdAt: formattedCreatedAt
          }
        })
      )

      return reqIdentificationsList
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      throw new HttpException(
        500,
        'Failed to retrieve requirement identifications by subject ID'
      )
    }
  }

  /**
   * Retrieves requirement identifications by subject ID and aspect IDs.
   *
   * @param {number} subjectId - The subject ID to filter by.
   * @param {number[]} aspectIds - Array of aspect IDs to filter by.
   * @returns {Promise<ReqIdentification[]>} - List of requirement identifications.
   * @throws {HttpException}
   */
  static async getBySubjectAndAspects (subjectId, aspectIds) {
    try {
      const subject = await SubjectsRepository.findById(subjectId)
      if (!subject) {
        throw new HttpException(404, 'Subject not found')
      }
      const existingAspects = await AspectsRepository.findByIds(aspectIds)
      if (existingAspects.length !== aspectIds.length) {
        const notFoundIds = aspectIds.filter(
          (id) => !existingAspects.some((aspect) => aspect.id === id)
        )
        throw new HttpException(404, 'Aspects not found for IDs', {
          notFoundIds
        })
      }
      const reqIdentifications =
        await ReqIdentificationRepository.findBySubjectAndAspects(
          subjectId,
          aspectIds
        )
      if (!reqIdentifications) {
        return []
      }

      const reqIdentificationsList = await Promise.all(
        reqIdentifications.map(async (reqIdentification) => {
          let user = null
          if (reqIdentification.user) {
            const profilePictureUrl = reqIdentification.user.profile_picture
              ? await FileService.getFile(
                reqIdentification.user.profile_picture
              )
              : null
            user = {
              ...reqIdentification.user,
              profile_picture: profilePictureUrl
            }
          }

          let formattedCreatedAt = null
          if (reqIdentification.createdAt) {
            formattedCreatedAt = format(
              new Date(reqIdentification.createdAt),
              'dd-MM-yyyy hh:mm a',
              { locale: es }
            )
          }

          return {
            ...reqIdentification,
            user,
            createdAt: formattedCreatedAt
          }
        })
      )

      return reqIdentificationsList
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      throw new HttpException(
        500,
        'Failed to retrieve requirement identifications by subject and aspects'
      )
    }
  }

  /**
   * Retrieves requirement identifications by jurisdiction.
   *
   * @param {string} jurisdiction - The jurisdiction to filter by.
   * @returns {Promise<ReqIdentification[]>} - List of requirement identifications.
   * @throws {HttpException}
   */
  static async getByJurisdiction (jurisdiction) {
    try {
      const reqIdentifications =
        await ReqIdentificationRepository.findByJurisdiction(jurisdiction)
      if (!reqIdentifications) {
        return []
      }

      const reqIdentificationsList = await Promise.all(
        reqIdentifications.map(async (reqIdentification) => {
          let user = null
          if (reqIdentification.user) {
            const profilePictureUrl = reqIdentification.user.profile_picture
              ? await FileService.getFile(
                reqIdentification.user.profile_picture
              )
              : null
            user = {
              ...reqIdentification.user,
              profile_picture: profilePictureUrl
            }
          }

          let formattedCreatedAt = null
          if (reqIdentification.createdAt) {
            formattedCreatedAt = format(
              new Date(reqIdentification.createdAt),
              'dd-MM-yyyy hh:mm a',
              { locale: es }
            )
          }

          return {
            ...reqIdentification,
            user,
            createdAt: formattedCreatedAt
          }
        })
      )

      return reqIdentificationsList
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      throw new HttpException(
        500,
        'Failed to retrieve requirement identifications by jurisdiction'
      )
    }
  }

  /**
   * Retrieves requirement identifications by state.
   *
   * @param {string} state - The state to filter by.
   * @returns {Promise<ReqIdentification[]>} - List of requirement identifications.
   * @throws {HttpException}
   */
  static async getByState (state) {
    try {
      const reqIdentifications = await ReqIdentificationRepository.findByState(
        state
      )
      if (!reqIdentifications) {
        return []
      }

      const reqIdentificationsList = await Promise.all(
        reqIdentifications.map(async (reqIdentification) => {
          let user = null
          if (reqIdentification.user) {
            const profilePictureUrl = reqIdentification.user.profile_picture
              ? await FileService.getFile(
                reqIdentification.user.profile_picture
              )
              : null
            user = {
              ...reqIdentification.user,
              profile_picture: profilePictureUrl
            }
          }

          let formattedCreatedAt = null
          if (reqIdentification.createdAt) {
            formattedCreatedAt = format(
              new Date(reqIdentification.createdAt),
              'dd-MM-yyyy hh:mm a',
              { locale: es }
            )
          }

          return {
            ...reqIdentification,
            user,
            createdAt: formattedCreatedAt
          }
        })
      )

      return reqIdentificationsList
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      throw new HttpException(
        500,
        'Failed to retrieve requirement identifications by state'
      )
    }
  }

  /**
   * Retrieves requirement identifications by state and municipalities.
   *
   * @param {string} state - The state to filter by.
   * @param {string[]} [municipalities] - An array of municipality to filter by.
   * @returns {Promise<ReqIdentification[]>} - List of requirement identifications.
   * @throws {HttpException}
   */
  static async getByStateAndMunicipalities (state, municipalities = []) {
    try {
      const reqIdentifications =
        await ReqIdentificationRepository.findByStateAndMunicipalities(
          state,
          municipalities
        )
      if (!reqIdentifications) {
        return []
      }

      const reqIdentificationsList = await Promise.all(
        reqIdentifications.map(async (reqIdentification) => {
          let user = null
          if (reqIdentification.user) {
            const profilePictureUrl = reqIdentification.user.profile_picture
              ? await FileService.getFile(
                reqIdentification.user.profile_picture
              )
              : null
            user = {
              ...reqIdentification.user,
              profile_picture: profilePictureUrl
            }
          }

          let formattedCreatedAt = null
          if (reqIdentification.createdAt) {
            formattedCreatedAt = format(
              new Date(reqIdentification.createdAt),
              'dd-MM-yyyy hh:mm a',
              { locale: es }
            )
          }

          return {
            ...reqIdentification,
            user,
            createdAt: formattedCreatedAt
          }
        })
      )

      return reqIdentificationsList
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      throw new HttpException(
        500,
        'Failed to retrieve requirement identifications by state and municipalities'
      )
    }
  }

  /**
   * Updates a requirement identification.
   *
   * @param {number} id - The ID of the requirement identification to update.
   * @param {Object} reqIdentification - Parameters for updating a requirement identification.
   * @param {string} reqIdentification.reqIdentificationName - Name of the requirement identification.
   * @param {string|null} [reqIdentification.reqIdentificationDescription] - Optional description of the requirement identification.
   * @param {number} [reqIdentification.newUserId] - ID of the user assigned to the requirement identification.
   * @returns {Promise<ReqIdentification>} - The updated requirement identification.
   * @throws {HttpException}
   */
  static async update (id, reqIdentification) {
    try {
      const parsedReqIdentification =
        reqIdentificationUpdateSchema.parse(reqIdentification)
      const reqIdentificationExists =
        await ReqIdentificationRepository.findById(id)
      if (!reqIdentificationExists) {
        throw new HttpException(404, 'Requirement identification not found')
      }
      if (parsedReqIdentification.newUserId) {
        const user = await UserRepository.findById(
          parsedReqIdentification.newUserId
        )
        if (!user) {
          throw new HttpException(404, 'User not found')
        }
      }
      if (parsedReqIdentification.reqIdentificationName) {
        const reqIdentificationExistsByName =
          await ReqIdentificationRepository.existsByNameExcludingId(
            parsedReqIdentification.reqIdentificationName,
            id
          )
        if (reqIdentificationExistsByName) {
          throw new HttpException(
            409,
            'Requirement Identification name already exists'
          )
        }
      }
      const updatedReqIdentification = await ReqIdentificationRepository.update(
        id,
        {
          reqIdentificationName: parsedReqIdentification.reqIdentificationName,
          reqIdentificationDescription:
            parsedReqIdentification.reqIdentificationDescription,
          newUserId: parsedReqIdentification.newUserId
        }
      )
      if (!updatedReqIdentification) {
        throw new HttpException(404, 'Requirement identification not found')
      }
      return updatedReqIdentification
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
      throw new HttpException(
        500,
        'Failed to update requirement identification'
      )
    }
  }

  /**
   * Deletes a requirement identification by ID.
   * @param {number} id - The ID of the requirement identification to delete.
   * @returns {Promise<{ success: boolean }>} - An object indicating whether the deletion was successful.
   * @throws {HttpException} - If the requirement identification is not found or an error occurs during deletion.
   */
  static async deleteById (id) {
    try {
      const reqIdentification = await ReqIdentificationRepository.findById(id)
      if (!reqIdentification) {
        throw new HttpException(404, 'Requirement identification not found')
      }
      const reqIdentificationJobs =
        await ReqIdentifyService.hasPendingReqIdentificationJobs(id)
      if (reqIdentificationJobs.hasPendingJobs) {
        throw new HttpException(
          409,
          'Cannot delete Requirement Identification with pending Requirement Identification jobs'
        )
      }
      const reqIdentificationDeleted =
        await ReqIdentificationRepository.deleteById(id)
      if (!reqIdentificationDeleted) {
        throw new HttpException(404, 'Requirement identification not found')
      }
      return { success: true }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      throw new HttpException(
        500,
        'Failed to delete requirement identification'
      )
    }
  }

  /**
   * Deletes multiple requirement identifications by their IDs.
   * @param {number[]} reqIdentificationIds - Array of requirement identification IDs to delete.
   * @returns {Promise<{ success: boolean }>} - An object indicating the deletion was successful.
   * @throws {HttpException} - If IDs not found or deletion fails.
   */
  static async deleteBatch (reqIdentificationIds) {
    try {
      const reqIdentifications = await ReqIdentificationRepository.findByIds(
        reqIdentificationIds
      )
      if (reqIdentifications.length !== reqIdentificationIds.length) {
        const notFoundIds = reqIdentificationIds.filter(
          (id) =>
            !reqIdentifications.some(
              (reqIdentification) => reqIdentification.id === id
            )
        )
        throw new HttpException(
          404,
          'Requirement identifications not found for IDs',
          {
            notFoundIds
          }
        )
      }
      const pendingReqIdentificationJobs = []
      await Promise.all(
        reqIdentifications.map(async (reqIdentification) => {
          const reqIdentificationJobs =
            await ReqIdentifyService.hasPendingReqIdentificationJobs(
              reqIdentification.id
            )
          if (reqIdentificationJobs.hasPendingJobs) {
            pendingReqIdentificationJobs.push({
              id: reqIdentification.id,
              name: reqIdentification.name
            })
          }
        })
      )
      if (pendingReqIdentificationJobs.length > 0) {
        throw new HttpException(
          409,
          'Cannot delete Requirement Identifications with pending Requirement Identification jobs',
          { reqIdentifications: pendingReqIdentificationJobs }
        )
      }
      const reqIdentificationsDeleted =
        await ReqIdentificationRepository.deleteBatch(reqIdentificationIds)
      if (!reqIdentificationsDeleted) {
        throw new HttpException(404, 'Requirement identifications not found')
      }
      return { success: true }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      throw new HttpException(
        500,
        'Failed to delete requirement identifications'
      )
    }
  }
}

export default ReqIdentificationService
