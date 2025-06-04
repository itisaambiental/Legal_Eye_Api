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
   */

  /**
   * @typedef {Object} Subject
   * @property {number} subject_id - The ID of the subject.
   * @property {string} subject_name - The name of the subject.
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
      const parsedReqIdentification = reqIdentificationSchema.parse(reqIdentification)
      const legalBases = await LegalBasisRepository.findByIds(parsedReqIdentification.legalBasisIds)
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
      if (error instanceof HttpException) throw error
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
              'dd-MM-yyyy',
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
      if (error instanceof HttpException) throw error
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
        return HttpException(404, 'Requirement identification not found')
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
          'dd-MM-yyyy',
          { locale: es }
        )
      }
      return {
        ...reqIdentification,
        user,
        createdAt: formattedCreatedAt
      }
    } catch (error) {
      if (error instanceof HttpException) throw error
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
              'dd-MM-yyyy',
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
      if (error instanceof HttpException) throw error
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
              'dd-MM-yyyy',
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
      if (error instanceof HttpException) throw error
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
              'dd-MM-yyyy',
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
      if (error instanceof HttpException) throw error
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
              'dd-MM-yyyy',
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
      if (error instanceof HttpException) throw error
      throw new HttpException(
        500,
        'Failed to retrieve requirement identifications by creation date range'
      )
    }
  }

  /**
   * Retrieves requirement identifications by status.
   *
   * @param {string} status - The status to filter by ('Active', 'Failed', or 'Completed').
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
              'dd-MM-yyyy',
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
      if (error instanceof HttpException) throw error
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
              'dd-MM-yyyy',
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
      if (error instanceof HttpException) throw error
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
              'dd-MM-yyyy',
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
      if (error instanceof HttpException) throw error
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
              'dd-MM-yyyy',
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
      if (error instanceof HttpException) throw error
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
              'dd-MM-yyyy',
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
      if (error instanceof HttpException) throw error
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
              'dd-MM-yyyy',
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
      if (error instanceof HttpException) throw error
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
      const parsedReqIdentification = reqIdentificationUpdateSchema.parse(reqIdentification)
      const reqIdentificationExists = await ReqIdentificationRepository.findById(id)
      if (!reqIdentificationExists) {
        throw new HttpException(404, 'Requirement identification not found')
      }
      if (parsedReqIdentification.newUserId) {
        const user = await UserRepository.findById(parsedReqIdentification.newUserId)
        if (!user) {
          throw new HttpException(404, 'User not found')
        }
      }
      if (parsedReqIdentification.reqIdentificationName) {
        const reqIdentificationExistsByName = await ReqIdentificationRepository.existsByNameExcludingId(parsedReqIdentification.reqIdentificationName, id)
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
          reqIdentificationDescription: parsedReqIdentification.reqIdentificationDescription,
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
      if (error instanceof HttpException) throw error
      throw new HttpException(
        500,
        'Failed to update requirement identification'
      )
    }
  }

  //   /**
  //    * Retrieves a single identification by ID.
  //    *
  //    * @param {number} id - The identification ID.
  //    * @returns {Promise<import('../models/ReqIdentification.model.js').default>}
  //    * @throws {HttpException}
  //    */
  //   static async getById (id) {
  //     try {
  //       const entity = await ReqIdentificationRepository.findById({ id })
  //       if (!entity) throw new HttpException(404, 'Identification not found')
  //       return entity
  //     } catch (err) {
  //       if (err instanceof HttpException) throw err
  //       throw new HttpException(500, 'Failed to retrieve identification')
  //     }
  //   }

  //   /**
  //    * Finds multiple identifications by their IDs.
  //    *
  //    * @param {Array<number>} identificationIds - Array of identification IDs.
  //    * @returns {Promise<import('../models/ReqIdentification.model.js').default[]>}
  //    * @throws {HttpException}
  //    */
  //   static async findByIds (identificationIds) {
  //     try {
  //       return await ReqIdentificationRepository.findByIds(identificationIds)
  //     } catch (err) {
  //       if (err instanceof HttpException) throw err
  //       throw new HttpException(500, 'Failed to retrieve identifications by IDs')
  //     }
  //   }

  //   /**
  //    * Checks if an identification name already exists.
  //    *
  //    * @param {string} identificationName - Name to check.
  //    * @returns {Promise<boolean>}
  //    * @throws {HttpException}
  //    */
  //   static async existsByName (identificationName) {
  //     try {
  //       return await ReqIdentificationRepository.existsByName(identificationName)
  //     } catch (err) {
  //       if (err instanceof HttpException) throw err
  //       throw new HttpException(500, 'Failed to check identification name existence')
  //     }
  //   }

  //   /**
  //    * Checks if an identification name already exists excluding a given ID.
  //    *
  //    * @param {Object} ReqIdentification - The identification data.
  //    * @param {string} ReqIdentification.identificationName - The name to check.
  //    * @param {number} ReqIdentification.identificationId - The ID to exclude.
  //    * @returns {Promise<boolean>}
  //    * @throws {HttpException}
  //    */
  //   static async existsByNameExcludingId (ReqIdentification) {
  //     try {
  //       return await ReqIdentificationRepository.existsByNameExcludingId(
  //         ReqIdentification.identificationName,
  //         ReqIdentification.identificationId
  //       )
  //     } catch (err) {
  //       if (err instanceof HttpException) throw err
  //       throw new HttpException(500, 'Failed to check identification name existence excluding ID')
  //     }
  //   }

  //   /**
  //    * Updates name and description by ID.
  //    *
  //    * @param {Object} ReqIdentification
  //    * @param {number} ReqIdentification.id - The identification ID.
  //    * @param {string} ReqIdentification.identificationName - Updated name.
  //    * @param {string|null} [ReqIdentification.identificationDescription] - Updated description.
  //    * @returns {Promise<import('../models/ReqIdentification.model.js').default>}
  //    * @throws {HttpException}
  //    */
  //   static async updateById (ReqIdentification) {
  //     try {
  //       const payload = reqIdentificationUpdateSchema.parse(ReqIdentification)
  //       if (await ReqIdentificationRepository.existsByNameExcludingId(
  //         payload.identificationName,
  //         ReqIdentification.id
  //       )) {
  //         throw new HttpException(409, 'Identification name already exists')
  //       }
  //       const updated = await ReqIdentificationRepository.updateById({
  //         id: ReqIdentification.id,
  //         name: payload.identificationName,
  //         description: payload.identificationDescription
  //       })
  //       if (!updated) throw new HttpException(404, 'Identification not found')
  //       return updated
  //     } catch (err) {
  //       if (err instanceof z.ZodError) {
  //         const errors = err.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
  //         throw new HttpException(400, 'Validation failed', errors)
  //       }
  //       if (err instanceof HttpException) throw err
  //       throw new HttpException(500, 'Unexpected error during update')
  //     }
  //   }

  //   /**
  //    * Deletes an identification by ID.
  //    *
  //    * @param {number} id - The identification ID.
  //    * @returns {Promise<{ success: boolean }>}
  //    * @throws {HttpException}
  //    */
  //   static async deleteById (id) {
  //     try {
  //       const ok = await ReqIdentificationRepository.deleteById({ id })
  //       if (!ok) throw new HttpException(404, 'Identification not found')
  //       return { success: true }
  //     } catch (err) {
  //       if (err instanceof HttpException) throw err
  //       throw new HttpException(500, 'Unexpected error during deletion')
  //     }
  //   }

  //   /**
  //    * Deletes all identifications.
  //    *
  //    * @returns {Promise<void>}
  //    * @throws {HttpException}
  //    */
  //   static async deleteAll () {
  //     try {
  //       await ReqIdentificationRepository.deleteAll()
  //     } catch (err) {
  //       if (err instanceof HttpException) throw err
  //       throw new HttpException(500, 'Failed to delete all identifications')
  //     }
  //   }

  //   /**
  //    * Marks an identification as 'Failed'.
  //    *
  //    * @param {number} id - The identification ID.
  //    * @returns {Promise<{ success: boolean }>}
  //    * @throws {HttpException}
  //    */ /**
  //    * Updates the status of an identification.
  //    *
  //    * @param {Object} ReqIdentification - The identification data.
  //    * @param {number} ReqIdentification.id - The identification ID.
  //    * @param {'Active'|'Failed'|'Completed'} ReqIdentification.status - The new status.
  //    * @returns {Promise<{ success: boolean }>} - Returns success flag.
  //    * @throws {HttpException}
  //    */
  //   static async updateStatus (ReqIdentification) {
  //     try {
  //       const ok = await ReqIdentificationRepository.updateStatus({
  //         id: ReqIdentification.id,
  //         status: ReqIdentification.status
  //       })
  //       return { success: ok }
  //     } catch (err) {
  //       if (err instanceof HttpException) throw err
  //       throw new HttpException(500, 'Unexpected error during status update')
  //     }
  //   }

  //   /**
  //    * Marks an identification as 'Completed'.
  //    *
  //    * @param {number} id - The identification ID.
  //    * @returns {Promise<{ success: boolean }>}
  //    * @throws {HttpException}
  //    */
  //   static async markAsCompleted (id) {
  //     try {
  //       const ok = await ReqIdentificationRepository.markAsCompleted(id)
  //       return { success: ok }
  //     } catch (err) {
  //       if (err instanceof HttpException) throw err
  //       throw new HttpException(500, 'Failed to mark as completed')
  //     }
  //   }

  //   /**
  //    * Marks an identification as 'Failed'.
  //    *
  //    * @param {number} id - The identification ID.
  //    * @returns {Promise<{ success: boolean }>}
  //    * @throws {HttpException}
  //    */
  //   static async markAsFailed (id) {
  //     try {
  //       const ok = await ReqIdentificationRepository.markAsFailed(id)
  //       return { success: ok }
  //     } catch (err) {
  //       if (err instanceof HttpException) throw err
  //       throw new HttpException(500, 'Failed to mark as failed')
  //     }
  //   }

  //   /**
  //  * Links a requirement to an identification.
  //  *
  //  * @param {Object} ReqIdentification
  //  * @param {number} ReqIdentification.identificationId - The identification ID.
  //  * @param {number} ReqIdentification.requirementId - The requirement ID.
  //  * @returns {Promise<{ success: boolean }>}
  //  * @throws {HttpException}
  //  */
  //   static async linkRequirement (ReqIdentification) {
  //   // Validación y parsing con el schema de enlace
  //     const payload = reqIdentificationLinkSchema.parse(ReqIdentification)

  //     try {
  //     // Usamos los valores ya parseados en lugar de reenviar el objeto sin validar
  //       const ok = await ReqIdentificationRepository.linkRequirement({
  //         identificationId: payload.identificationId,
  //         requirementId: payload.requirementId
  //       })
  //       return { success: ok }
  //     } catch (err) {
  //       if (err instanceof HttpException) throw err
  //       throw new HttpException(500, 'Failed to link requirement')
  //     }
  //   }

  //   /**
  //    * Unlinks a requirement from an identification.
  //    *
  //    * @param {Object} ReqIdentification
  //    * @param {number} ReqIdentification.identificationId - The identification ID.
  //    * @param {number} ReqIdentification.requirementId - The requirement ID.
  //    * @returns {Promise<{ success: boolean }>}
  //    * @throws {HttpException}
  //    */
  //   static async unlinkRequirement (ReqIdentification) {
  //     try {
  //       const ok = await ReqIdentificationRepository.unlinkRequirement(ReqIdentification)
  //       return { success: ok }
  //     } catch (err) {
  //       if (err instanceof HttpException) throw err
  //       throw new HttpException(500, 'Failed to unlink requirement')
  //     }
  //   }

  //   /**
  //    * Retrieves all requirements linked to an identification.
  //    *
  //    * @param {number} identificationId - The identification ID.
  //    * @returns {Promise<import('../models/Requirement.model.js').default[]>}
  //    * @throws {HttpException}
  //    */
  //   static async getLinkedRequirements (identificationId) {
  //     try {
  //       return await ReqIdentificationRepository.getLinkedRequirements({ identificationId })
  //     } catch (err) {
  //       if (err instanceof HttpException) throw err
  //       throw new HttpException(500, 'Failed to fetch linked requirements')
  //     }
  //   }

  //   /**
  //    * Links metadata for a requirement.
  //    *
  //    * @param {Object} ReqIdentification
  //    * @param {number} ReqIdentification.identificationId
  //    * @param {number} ReqIdentification.requirementId
  //    * @param {string} ReqIdentification.requirementNumber
  //    * @param {number|null} ReqIdentification.requirementTypeId
  //    * @returns {Promise<{ success: boolean }>}
  //    * @throws {HttpException}
  //    */
  //   static async linkMetadata (ReqIdentification) {
  //     try {
  //       const ok = await ReqIdentificationRepository.linkMetadata(ReqIdentification)
  //       return { success: ok }
  //     } catch (err) {
  //       if (err instanceof HttpException) throw err
  //       throw new HttpException(500, 'Failed to link metadata')
  //     }
  //   }

  //   /**
  //    * Unlinks metadata for a requirement.
  //    *
  //    * @param {Object} ReqIdentification
  //    * @param {number} ReqIdentification.identificationId
  //    * @param {number} ReqIdentification.requirementId
  //    * @returns {Promise<{ success: boolean }>}
  //    * @throws {HttpException}
  //    */
  //   static async unlinkMetadata (ReqIdentification) {
  //     try {
  //       const ok = await ReqIdentificationRepository.unlinkMetadata(ReqIdentification)
  //       return { success: ok }
  //     } catch (err) {
  //       if (err instanceof HttpException) throw err
  //       throw new HttpException(500, 'Failed to unlink metadata')
  //     }
  //   }

  //   /**
  //    * Retrieves metadata linked to a requirement.
  //    *
  //    * @param {Object} ReqIdentification
  //    * @param {number} ReqIdentification.identificationId
  //    * @param {number} ReqIdentification.requirementId
  //    * @returns {Promise<{ requirementNumber: string, requirementType: import('../models/RequirementType.model.js').default }|null>}
  //    * @throws {HttpException}
  //    */
  //   static async getLinkedMetadata (ReqIdentification) {
  //     try {
  //       return await ReqIdentificationRepository.getLinkedMetadata(ReqIdentification)
  //     } catch (err) {
  //       if (err instanceof HttpException) throw err
  //       throw new HttpException(500, 'Failed to fetch linked metadata')
  //     }
  //   }

  //   /**
  //  * Links one or more legal basis to a requirement under an identification,
  //  * aplicando antes las reglas de negocio.
  //  *
  //  * @param {Object} ReqIdentification
  //  * @param {number} ReqIdentification.identificationId - El ID de la identificación.
  //  * @param {number} ReqIdentification.requirementId    - El ID del requerimiento.
  //  * @param {number[]} ReqIdentification.legalBasisIds  - Array de IDs de legal basis a enlazar.
  //  * @returns {Promise<{ success: boolean }>}
  //  * @throws {HttpException}
  //  */
  //   static async linkLegalBasis (ReqIdentification) {
  //     try {
  //       // Validaciones de negocio previas
  //       await this.validateLegalBasisSelection(ReqIdentification.legalBasisIds)

  //       // Grabo el enlace
  //       const ok = await ReqIdentificationRepository.linkLegalBasis(ReqIdentification)
  //       return { success: ok }
  //     } catch (err) {
  //       if (err instanceof HttpException) throw err
  //       throw new HttpException(500, 'Failed to link legal basis')
  //     }
  //   }

  //   /**
  //    * Unlinks a legal basis from a requirement.
  //    *
  //    * @param {Object} ReqIdentification
  //    * @param {number} ReqIdentification.identificationId
  //    * @param {number} ReqIdentification.requirementId
  //    * @param {number} ReqIdentification.legalBasisId
  //    * @returns {Promise<{ success: boolean }>}
  //    * @throws {HttpException}
  //    */
  //   static async unlinkLegalBasis (ReqIdentification) {
  //     try {
  //       const ok = await ReqIdentificationRepository.unlinkLegalBasis(ReqIdentification)
  //       return { success: ok }
  //     } catch (err) {
  //       if (err instanceof HttpException) throw err
  //       throw new HttpException(500, 'Failed to unlink legal basis')
  //     }
  //   }

  //   /**
  //    * Retrieves legal bases linked to a requirement.
  //    *
  //    * @param {Object} ReqIdentification
  //    * @param {number} ReqIdentification.identificationId
  //    * @param {number} ReqIdentification.requirementId
  //    * @returns {Promise<import('../models/LegalBasis.model.js').default[]>}
  //    * @throws {HttpException}
  //    */
  //   static async getLinkedLegalBases (ReqIdentification) {
  //     try {
  //       return await ReqIdentificationRepository.getLinkedLegalBases(ReqIdentification)
  //     } catch (err) {
  //       if (err instanceof HttpException) throw err
  //       throw new HttpException(500, 'Failed to fetch linked legal bases')
  //     }
  //   }

  //   /**
  //    * Links an article under a legal basis.
  //    *
  //    * @param {Object} ReqIdentification
  //    * @param {number} ReqIdentification.identificationId
  //    * @param {number} ReqIdentification.requirementId
  //    * @param {number} ReqIdentification.legalBasisId
  //    * @param {number} ReqIdentification.articleId
  //    * @param {string} ReqIdentification.articleType
  //    * @returns {Promise<{ success: boolean }>}
  //    * @throws {HttpException}
  //    */
  //   static async linkArticle (ReqIdentification) {
  //     try {
  //       const ok = await ReqIdentificationRepository.linkArticle(ReqIdentification)
  //       return { success: ok }
  //     } catch (err) {
  //       if (err instanceof HttpException) throw err
  //       throw new HttpException(500, 'Failed to link article')
  //     }
  //   }

  //   /**
  //  * Retrieves articles linked to a requirement.
  //  *
  //  * @param {Object} ReqIdentification - The query data.
  //  * @param {number} ReqIdentification.identificationId - The identification ID.
  //  * @param {number} ReqIdentification.requirementId - The requirement ID.
  //  * @returns {Promise<import('../models/Article.model.js').default[]>}
  //  * @throws {HttpException}
  //  */
  //   static async getLinkedArticles (ReqIdentification) {
  //     try {
  //       return await ReqIdentificationRepository.getLinkedArticles({
  //         identificationId: ReqIdentification.identificationId,
  //         requirementId: ReqIdentification.requirementId
  //       })
  //     } catch (err) {
  //       if (err instanceof HttpException) throw err
  //       throw new HttpException(500, 'Failed to fetch linked articles')
  //     }
  //   }

  //   /**
  //  * Unlinks an article under a legal basis.
  //  *
  //  * @param {Object} ReqIdentification - The unlink data.
  //  * @param {number} ReqIdentification.identificationId - The identification ID.
  //  * @param {number} ReqIdentification.requirementId - The requirement ID.
  //  * @param {number} ReqIdentification.legalBasisId - The legal basis ID.
  //  * @param {number} ReqIdentification.articleId - The article ID to unlink.
  //  * @returns {Promise<{ success: boolean }>} - True if the link was deleted, false otherwise.
  //  * @throws {HttpException}
  //  */
  //   static async unlinkArticle (ReqIdentification) {
  //     try {
  //       const ok = await ReqIdentificationRepository.unlinkArticle({
  //         identificationId: ReqIdentification.identificationId,
  //         requirementId: ReqIdentification.requirementId,
  //         legalBasisId: ReqIdentification.legalBasisId,
  //         articleId: ReqIdentification.articleId
  //       })
  //       return { success: ok }
  //     } catch (err) {
  //       if (err instanceof HttpException) throw err
  //       throw new HttpException(500, 'Failed to unlink article')
  //     }
  //   }

  //   /**
  //  * Links a legal verb translation.
  //  *
  //  * @param {Object} ReqIdentification - The link data.
  //  * @param {number} ReqIdentification.identificationId - The identification ID.
  //  * @param {number} ReqIdentification.requirementId - The requirement ID.
  //  * @param {number} ReqIdentification.legalVerbId - The legal verb ID.
  //  * @param {string} ReqIdentification.translation - The translated text.
  //  * @returns {Promise<{ success: boolean }>}
  //  * @throws {HttpException}
  //  */
  //   static async linkLegalVerb (ReqIdentification) {
  //     try {
  //       const ok = await ReqIdentificationRepository.linkLegalVerb({
  //         identificationId: ReqIdentification.identificationId,
  //         requirementId: ReqIdentification.requirementId,
  //         legalVerbId: ReqIdentification.legalVerbId,
  //         translation: ReqIdentification.translation
  //       })
  //       return { success: ok }
  //     } catch (err) {
  //       if (err instanceof HttpException) throw err
  //       throw new HttpException(500, 'Failed to link legal verb')
  //     }
  //   }

  //   /**
  //  * Retrieves legal verbs linked to a requirement.
  //  *
  //  * @param {Object} ReqIdentification - The query data.
  //  * @param {number} ReqIdentification.identificationId - The identification ID.
  //  * @param {number} ReqIdentification.requirementId - The requirement ID.
  //  * @returns {Promise<import('../models/LegalVerb.model.js').default[]>}
  //  * @throws {HttpException}
  //  */
  //   static async getLinkedLegalVerbs (ReqIdentification) {
  //     try {
  //       return await ReqIdentificationRepository.getLinkedLegalVerbs({
  //         identificationId: ReqIdentification.identificationId,
  //         requirementId: ReqIdentification.requirementId
  //       })
  //     } catch (err) {
  //       if (err instanceof HttpException) throw err
  //       throw new HttpException(500, 'Failed to fetch linked legal verbs')
  //     }
  //   }

  //   /**
  //    * Unlinks a legal verb translation from a requirement in an identification.
  //    *
  //    * @param {Object} ReqIdentification - The unlink data.
  //    * @param {number} ReqIdentification.identificationId - The ID of the identification.
  //    * @param {number} ReqIdentification.requirementId - The ID of the requirement.
  //    * @param {number} ReqIdentification.legalVerbId - The ID of the legal verb.
  //    * @returns {Promise<{ success: boolean }>} - True if the link was deleted, false otherwise.
  //    * @throws {HttpException}
  //    */
  //   static async unlinkLegalVerb (ReqIdentification) {
  //     try {
  //       const ok = await ReqIdentificationRepository.unlinkLegalVerb({
  //         identificationId: ReqIdentification.identificationId,
  //         requirementId: ReqIdentification.requirementId,
  //         legalVerbId: ReqIdentification.legalVerbId
  //       })
  //       return { success: ok }
  //     } catch (err) {
  //       if (err instanceof HttpException) throw err
  //       throw new HttpException(500, 'Failed to unlink legal verb')
  //     }
  //   }
}

export default ReqIdentificationService
