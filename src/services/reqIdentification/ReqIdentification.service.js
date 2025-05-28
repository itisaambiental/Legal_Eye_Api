import { z } from 'zod'
import LegalBasisRepository from '../../repositories/LegalBasis.repository.js'
import RequirementRepository from '../../repositories/Requirements.repository.js'
import ReqIdentificationRepository from '../../repositories/ReqIdentification.repository.js'
import { reqIdentificationSchema } from '../../schemas/reqIdentification.schema.js'
import HttpException from '../../services/errors/HttpException.js'

/**
 * Service class for handling requirement identifications operations.
 */
class ReqIdentificationService {
  /**
   * Creates a new requirements identification.
   *
   * @param {number} userId - ID of the user creating the requirement identification.
   * @param {Object} reqIdentification - Parameters for creating a requirement identification.
   * @param {string} reqIdentification.reqIdentificationName - Name of the requirement identification.
   * @param {string|null} [reqIdentification.reqIdentificationDescription] - Optional description of the requirement identification.
   * @param {number[]} reqIdentification.legalBasisIds - Array of Legal Basis IDs to associate with the requirement identification.
   * @param {string} reqIdentification.intelligenceLevel - Level of intelligence to identify requirements.
   * @returns {Promise<{ reqIdentificationId: number }>} - The ID of the created requirement identification.
   * @throws {HttpException} - If an error occurs during validation or creation.
   */
  static async create (userId, reqIdentification) {
    try {
      const parsedReqIdentification = reqIdentificationSchema.parse(reqIdentification)
      const legalBases = await LegalBasisRepository.findByIds(
        parsedReqIdentification.legalBasisIds
      )
      if (legalBases.length !== parsedReqIdentification.legalBasisIds.length) {
        const notFoundIds = parsedReqIdentification.legalBasisIds.filter(
          (id) => !legalBases.some((lb) => lb.id === id)
        )
        throw new HttpException(400, 'LegalBasis not found for IDs', { notFoundIds })
      }
      const reqIdentificationExistsByName = await ReqIdentificationRepository.existsByReqIdentificationName(
        parsedReqIdentification.reqIdentificationName
      )
      if (reqIdentificationExistsByName) {
        throw new HttpException(409, 'Requirement Identification name already exists')
      }
      const subjectIds = new Set(legalBases.map((lb) => lb.subject.subject_id))
      if (subjectIds.size !== 1) {
        throw new HttpException(400, 'All selected legal bases must have the same subject')
      }
      const [subjectId] = subjectIds
      const jurisdictions = new Set(legalBases.map(lb => lb.jurisdiction))
      if (jurisdictions.size !== 1) {
        throw new HttpException(400, 'All selected legal bases must have the same jurisdiction')
      }
      const [jurisdiction] = jurisdictions
      if (jurisdiction === 'Estatal' || jurisdiction === 'Local') {
        const states = new Set(legalBases.map((lb) => lb.state))
        if (states.size !== 1) {
          throw new HttpException(400, 'All selected legal bases must have the same state')
        }
        if (jurisdiction === 'Local') {
          const municipalities = new Set(legalBases.map((lb) => lb.municipality))
          if (municipalities.size !== 1) {
            throw new HttpException(400, 'All selected legal bases must have the same municipality')
          }
        }
      }
      const aspectIds = [
        ...new Set(
          legalBases.flatMap((lb) => (lb.aspects || []).map((a) => Number(a.id)))
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
        identificationDescription: parsedReqIdentification.reqIdentificationDescription,
        userId
      })
      return { reqIdentificationId: id }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors = error.errors.map((e) => ({
          field: e.path[0],
          message: e.message
        }))
        throw new HttpException(400, 'Validation failed', validationErrors)
      }
      if (error instanceof HttpException) throw error
      throw new HttpException(500, 'Unexpected error during requirement identification creation')
    }
  }

  //   /**
  //    * Retrieves all identifications.
  //    *
  //    * @returns {Promise<import('../models/ReqIdentification.model.js').default[]>}
  //    * @throws {HttpException}
  //    */
  //   static async getAll () {
  //     try {
  //       return await ReqIdentificationRepository.findAll()
  //     } catch (err) {
  //       if (err instanceof HttpException) throw err
  //       throw new HttpException(500, 'Failed to retrieve identifications')
  //     }
  //   }

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
