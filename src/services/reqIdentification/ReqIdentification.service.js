// src/services/ReqIdentification.service.js
import { z } from 'zod'
import LegalBasisRepository from '../../repositories/LegalBasis.repository.js'
import RequirementRepository from '../../repositories/Requirements.repository.js'
import ReqIdentificationRepository from '../../repositories/ReqIdentification.repository.js'
import {
  reqIdentificationCreateSchema,
  reqIdentificationLinkSchema,
  reqIdentificationUpdateSchema
} from '../../schemas/reqIdentification.schema.js'

import HttpException from '../../services/errors/HttpException.js'

/**
 * Service class for handling business logic around req_identifications
 * and all their linked entities.
 */
class ReqIdentificationService {
  /**
   * Validates that the selected legal basis IDs:
   *  1) Exist
   *  2) All belong to the same subject
   *  3) All share the same jurisdiction
   *  4) If “State” jurisdiction, all share the same state
   *  5) If “Local” jurisdiction, all share the same state and municipality
   *
   * @param {number[]} legalBasisIds
   * @returns {Promise<import('../../models/LegalBasis.model.js').default[]>} – Loaded legal basis records
   * @throws {HttpException} – With English error messages
   */
  static async validateLegalBasisSelection (legalBasisIds) {
    // 1) Load all
    const bases = await LegalBasisRepository.findByIds(legalBasisIds)
    if (bases.length !== legalBasisIds.length) {
      const notFoundIds = legalBasisIds.filter(
        (id) => !bases.some((b) => b.id === id)
      )
      throw new HttpException(
        404,
        'Some legal basis were not found',
        { notFoundIds }
      )
    }
    const subjectSet = new Set(bases.map((b) => b.subject_id))
    if (subjectSet.size > 1) {
      throw new HttpException(
        400,
        'All selected legal basis must belong to the same subject'
      )
    }
    const jurisSet = new Set(bases.map((b) => b.jurisdiction))
    if (jurisSet.size > 1) {
      throw new HttpException(
        400,
        'All selected legal basis must have the same jurisdiction'
      )
    }
    const jurisdiction = bases[0].jurisdiction

    if (jurisdiction === 'Estatal') {
      const stateSet = new Set(bases.map((b) => b.state))
      if (stateSet.size > 1) {
        throw new HttpException(
          400,
          'For State jurisdiction, all legal basis must belong to the same state'
        )
      }
    }
    if (jurisdiction === 'Local') {
      const stateSet = new Set(bases.map((b) => b.state))
      const muniSet = new Set(bases.map((b) => b.municipality))
      if (stateSet.size > 1) {
        throw new HttpException(
          400,
          'For Local jurisdiction, all legal basis must belong to the same state'
        )
      }
      if (muniSet.size > 1) {
        throw new HttpException(
          400,
          'For Local jurisdiction, all legal basis must belong to the same municipality'
        )
      }
    }

    return bases
  }

  /**
   * Detects all applicable requirements for a given identification
   * based on subject and shared aspects, and los almacena en
   * `req_identifications_requirements`.
   *
   * @param {Object} data
   * @param {number} data.identificationId - ID de la identificación.
   * @param {number} data.subjectId        - ID de la materia.
   * @param {number[]} data.aspectIds      - Array de IDs de aspectos.
   * @returns {Promise<{ linkedCount: number }>}
   * @throws {HttpException}
   */
  static async detectAndLinkRequirements ({ identificationId, subjectId, aspectIds }) {
    // 1) Validar que la identificación exista
    const identification = await ReqIdentificationRepository.findById({ id: identificationId })
    if (!identification) {
      throw new HttpException(404, 'Identification not found')
    }

    // 2) Recuperar requisitos que coincidan:
    //    mismo subject y al menos un aspecto compartido
    const requirements = await RequirementRepository.findBySubjectAndAspects(
      subjectId,
      aspectIds
    )

    // 3) Si no hay ninguno, devolvemos 0
    if (!requirements.length) {
      return { linkedCount: 0 }
    }

    // 4) Enlazar en batch todos los requirements encontrados
    const linkPromises = requirements.map((req) =>
      ReqIdentificationRepository.linkRequirement({
        identificationId,
        requirementId: req.id
      })
    )

    const results = await Promise.all(linkPromises)
    const linkedCount = results.filter((ok) => ok).length

    return { linkedCount }
  }

  /**
   * Graba únicamente la cabecera en `req_identifications`
   * y devuelve { id }.
   *
   * @param {Object} data
   * @param {string} data.identificationName
   * @param {string|null} data.identificationDescription
   * @param {number|null} data.userId
   * @returns {Promise<{ id: number }>}
   * @throws {HttpException}
   */
  static async createHeader (data) {
    try {
      // valida sólo nombre, descripción y userId
      const payload = reqIdentificationCreateSchema.parse(data)
      // posible validación de unicidad
      if (await ReqIdentificationRepository.existsByName(payload.identificationName)) {
        throw new HttpException(409, 'Identification name already exists')
      }
      // inserta y recibe el modelo completo
      const created = await ReqIdentificationRepository.create({
        identificationName: payload.identificationName,
        identificationDescription: payload.identificationDescription,
        userId: payload.userId
      })
      // devuelve sólo el id
      return { id: created.id }
    } catch (err) {
      if (err instanceof z.ZodError) {
        const errors = err.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
        throw new HttpException(400, 'Validation failed', errors)
      }
      if (err instanceof HttpException) throw err
      throw new HttpException(500, 'Unexpected error during header creation')
    }
  }

  /**
   * Creates a new identification.
   *
   * @param {Object} ReqIdentification
   * @param {string} ReqIdentification.identificationName - The name of the identification.
   * @param {string|null} [ReqIdentification.identificationDescription] - Optional description.
   * @param {number|null} [ReqIdentification.userId] - Optional user ID who created it.
   * @returns {Promise<import('../models/ReqIdentification.model.js').default>}
   * @throws {HttpException}
   */
  static async create (ReqIdentification) {
    try {
      const payload = reqIdentificationCreateSchema.parse(ReqIdentification)
      if (await ReqIdentificationRepository.existsByName(payload.identificationName)) {
        throw new HttpException(409, 'Identification name already exists')
      }
      return await ReqIdentificationRepository.create({
        identificationName: payload.identificationName,
        identificationDescription: payload.identificationDescription,
        userId: payload.userId
      })
    } catch (err) {
      if (err instanceof z.ZodError) {
        const errors = err.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
        throw new HttpException(400, 'Validation failed', errors)
      }
      if (err instanceof HttpException) throw err
      throw new HttpException(500, 'Unexpected error during creation')
    }
  }

  /**
   * Retrieves all identifications.
   *
   * @returns {Promise<import('../models/ReqIdentification.model.js').default[]>}
   * @throws {HttpException}
   */
  static async getAll () {
    try {
      return await ReqIdentificationRepository.findAll()
    } catch (err) {
      if (err instanceof HttpException) throw err
      throw new HttpException(500, 'Failed to retrieve identifications')
    }
  }

  /**
   * Retrieves a single identification by ID.
   *
   * @param {number} id - The identification ID.
   * @returns {Promise<import('../models/ReqIdentification.model.js').default>}
   * @throws {HttpException}
   */
  static async getById (id) {
    try {
      const entity = await ReqIdentificationRepository.findById({ id })
      if (!entity) throw new HttpException(404, 'Identification not found')
      return entity
    } catch (err) {
      if (err instanceof HttpException) throw err
      throw new HttpException(500, 'Failed to retrieve identification')
    }
  }

  /**
   * Finds multiple identifications by their IDs.
   *
   * @param {Array<number>} identificationIds - Array of identification IDs.
   * @returns {Promise<import('../models/ReqIdentification.model.js').default[]>}
   * @throws {HttpException}
   */
  static async findByIds (identificationIds) {
    try {
      return await ReqIdentificationRepository.findByIds(identificationIds)
    } catch (err) {
      if (err instanceof HttpException) throw err
      throw new HttpException(500, 'Failed to retrieve identifications by IDs')
    }
  }

  /**
   * Checks if an identification name already exists.
   *
   * @param {string} identificationName - Name to check.
   * @returns {Promise<boolean>}
   * @throws {HttpException}
   */
  static async existsByName (identificationName) {
    try {
      return await ReqIdentificationRepository.existsByName(identificationName)
    } catch (err) {
      if (err instanceof HttpException) throw err
      throw new HttpException(500, 'Failed to check identification name existence')
    }
  }

  /**
   * Checks if an identification name already exists excluding a given ID.
   *
   * @param {Object} ReqIdentification - The identification data.
   * @param {string} ReqIdentification.identificationName - The name to check.
   * @param {number} ReqIdentification.identificationId - The ID to exclude.
   * @returns {Promise<boolean>}
   * @throws {HttpException}
   */
  static async existsByNameExcludingId (ReqIdentification) {
    try {
      return await ReqIdentificationRepository.existsByNameExcludingId(
        ReqIdentification.identificationName,
        ReqIdentification.identificationId
      )
    } catch (err) {
      if (err instanceof HttpException) throw err
      throw new HttpException(500, 'Failed to check identification name existence excluding ID')
    }
  }

  /**
   * Updates name and description by ID.
   *
   * @param {Object} ReqIdentification
   * @param {number} ReqIdentification.id - The identification ID.
   * @param {string} ReqIdentification.identificationName - Updated name.
   * @param {string|null} [ReqIdentification.identificationDescription] - Updated description.
   * @returns {Promise<import('../models/ReqIdentification.model.js').default>}
   * @throws {HttpException}
   */
  static async updateById (ReqIdentification) {
    try {
      const payload = reqIdentificationUpdateSchema.parse(ReqIdentification)
      if (await ReqIdentificationRepository.existsByNameExcludingId(
        payload.identificationName,
        ReqIdentification.id
      )) {
        throw new HttpException(409, 'Identification name already exists')
      }
      const updated = await ReqIdentificationRepository.updateById({
        id: ReqIdentification.id,
        name: payload.identificationName,
        description: payload.identificationDescription
      })
      if (!updated) throw new HttpException(404, 'Identification not found')
      return updated
    } catch (err) {
      if (err instanceof z.ZodError) {
        const errors = err.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
        throw new HttpException(400, 'Validation failed', errors)
      }
      if (err instanceof HttpException) throw err
      throw new HttpException(500, 'Unexpected error during update')
    }
  }

  /**
   * Deletes an identification by ID.
   *
   * @param {number} id - The identification ID.
   * @returns {Promise<{ success: boolean }>}
   * @throws {HttpException}
   */
  static async deleteById (id) {
    try {
      const ok = await ReqIdentificationRepository.deleteById({ id })
      if (!ok) throw new HttpException(404, 'Identification not found')
      return { success: true }
    } catch (err) {
      if (err instanceof HttpException) throw err
      throw new HttpException(500, 'Unexpected error during deletion')
    }
  }

  /**
   * Deletes all identifications.
   *
   * @returns {Promise<void>}
   * @throws {HttpException}
   */
  static async deleteAll () {
    try {
      await ReqIdentificationRepository.deleteAll()
    } catch (err) {
      if (err instanceof HttpException) throw err
      throw new HttpException(500, 'Failed to delete all identifications')
    }
  }

  /**
   * Marks an identification as 'Failed'.
   *
   * @param {number} id - The identification ID.
   * @returns {Promise<{ success: boolean }>}
   * @throws {HttpException}
   */ /**
   * Updates the status of an identification.
   *
   * @param {Object} ReqIdentification - The identification data.
   * @param {number} ReqIdentification.id - The identification ID.
   * @param {'Active'|'Failed'|'Completed'} ReqIdentification.status - The new status.
   * @returns {Promise<{ success: boolean }>} - Returns success flag.
   * @throws {HttpException}
   */
  static async updateStatus (ReqIdentification) {
    try {
      const ok = await ReqIdentificationRepository.updateStatus({
        id: ReqIdentification.id,
        status: ReqIdentification.status
      })
      return { success: ok }
    } catch (err) {
      if (err instanceof HttpException) throw err
      throw new HttpException(500, 'Unexpected error during status update')
    }
  }

  /**
   * Marks an identification as 'Completed'.
   *
   * @param {number} id - The identification ID.
   * @returns {Promise<{ success: boolean }>}
   * @throws {HttpException}
   */
  static async markAsCompleted (id) {
    try {
      const ok = await ReqIdentificationRepository.markAsCompleted(id)
      return { success: ok }
    } catch (err) {
      if (err instanceof HttpException) throw err
      throw new HttpException(500, 'Failed to mark as completed')
    }
  }

  /**
   * Marks an identification as 'Failed'.
   *
   * @param {number} id - The identification ID.
   * @returns {Promise<{ success: boolean }>}
   * @throws {HttpException}
   */
  static async markAsFailed (id) {
    try {
      const ok = await ReqIdentificationRepository.markAsFailed(id)
      return { success: ok }
    } catch (err) {
      if (err instanceof HttpException) throw err
      throw new HttpException(500, 'Failed to mark as failed')
    }
  }

  /**
 * Links a requirement to an identification.
 *
 * @param {Object} ReqIdentification
 * @param {number} ReqIdentification.identificationId - The identification ID.
 * @param {number} ReqIdentification.requirementId - The requirement ID.
 * @returns {Promise<{ success: boolean }>}
 * @throws {HttpException}
 */
  static async linkRequirement (ReqIdentification) {
  // Validación y parsing con el schema de enlace
    const payload = reqIdentificationLinkSchema.parse(ReqIdentification)

    try {
    // Usamos los valores ya parseados en lugar de reenviar el objeto sin validar
      const ok = await ReqIdentificationRepository.linkRequirement({
        identificationId: payload.identificationId,
        requirementId: payload.requirementId
      })
      return { success: ok }
    } catch (err) {
      if (err instanceof HttpException) throw err
      throw new HttpException(500, 'Failed to link requirement')
    }
  }

  /**
   * Unlinks a requirement from an identification.
   *
   * @param {Object} ReqIdentification
   * @param {number} ReqIdentification.identificationId - The identification ID.
   * @param {number} ReqIdentification.requirementId - The requirement ID.
   * @returns {Promise<{ success: boolean }>}
   * @throws {HttpException}
   */
  static async unlinkRequirement (ReqIdentification) {
    try {
      const ok = await ReqIdentificationRepository.unlinkRequirement(ReqIdentification)
      return { success: ok }
    } catch (err) {
      if (err instanceof HttpException) throw err
      throw new HttpException(500, 'Failed to unlink requirement')
    }
  }

  /**
   * Retrieves all requirements linked to an identification.
   *
   * @param {number} identificationId - The identification ID.
   * @returns {Promise<import('../models/Requirement.model.js').default[]>}
   * @throws {HttpException}
   */
  static async getLinkedRequirements (identificationId) {
    try {
      return await ReqIdentificationRepository.getLinkedRequirements({ identificationId })
    } catch (err) {
      if (err instanceof HttpException) throw err
      throw new HttpException(500, 'Failed to fetch linked requirements')
    }
  }

  /**
   * Links metadata for a requirement.
   *
   * @param {Object} ReqIdentification
   * @param {number} ReqIdentification.identificationId
   * @param {number} ReqIdentification.requirementId
   * @param {string} ReqIdentification.requirementNumber
   * @param {number|null} ReqIdentification.requirementTypeId
   * @returns {Promise<{ success: boolean }>}
   * @throws {HttpException}
   */
  static async linkMetadata (ReqIdentification) {
    try {
      const ok = await ReqIdentificationRepository.linkMetadata(ReqIdentification)
      return { success: ok }
    } catch (err) {
      if (err instanceof HttpException) throw err
      throw new HttpException(500, 'Failed to link metadata')
    }
  }

  /**
   * Unlinks metadata for a requirement.
   *
   * @param {Object} ReqIdentification
   * @param {number} ReqIdentification.identificationId
   * @param {number} ReqIdentification.requirementId
   * @returns {Promise<{ success: boolean }>}
   * @throws {HttpException}
   */
  static async unlinkMetadata (ReqIdentification) {
    try {
      const ok = await ReqIdentificationRepository.unlinkMetadata(ReqIdentification)
      return { success: ok }
    } catch (err) {
      if (err instanceof HttpException) throw err
      throw new HttpException(500, 'Failed to unlink metadata')
    }
  }

  /**
   * Retrieves metadata linked to a requirement.
   *
   * @param {Object} ReqIdentification
   * @param {number} ReqIdentification.identificationId
   * @param {number} ReqIdentification.requirementId
   * @returns {Promise<{ requirementNumber: string, requirementType: import('../models/RequirementType.model.js').default }|null>}
   * @throws {HttpException}
   */
  static async getLinkedMetadata (ReqIdentification) {
    try {
      return await ReqIdentificationRepository.getLinkedMetadata(ReqIdentification)
    } catch (err) {
      if (err instanceof HttpException) throw err
      throw new HttpException(500, 'Failed to fetch linked metadata')
    }
  }

  /**
 * Links one or more legal basis to a requirement under an identification,
 * aplicando antes las reglas de negocio.
 *
 * @param {Object} ReqIdentification
 * @param {number} ReqIdentification.identificationId - El ID de la identificación.
 * @param {number} ReqIdentification.requirementId    - El ID del requerimiento.
 * @param {number[]} ReqIdentification.legalBasisIds  - Array de IDs de legal basis a enlazar.
 * @returns {Promise<{ success: boolean }>}
 * @throws {HttpException}
 */
  static async linkLegalBasis (ReqIdentification) {
    try {
      // Validaciones de negocio previas
      await this.validateLegalBasisSelection(ReqIdentification.legalBasisIds)

      // Grabo el enlace
      const ok = await ReqIdentificationRepository.linkLegalBasis(ReqIdentification)
      return { success: ok }
    } catch (err) {
      if (err instanceof HttpException) throw err
      throw new HttpException(500, 'Failed to link legal basis')
    }
  }

  /**
   * Unlinks a legal basis from a requirement.
   *
   * @param {Object} ReqIdentification
   * @param {number} ReqIdentification.identificationId
   * @param {number} ReqIdentification.requirementId
   * @param {number} ReqIdentification.legalBasisId
   * @returns {Promise<{ success: boolean }>}
   * @throws {HttpException}
   */
  static async unlinkLegalBasis (ReqIdentification) {
    try {
      const ok = await ReqIdentificationRepository.unlinkLegalBasis(ReqIdentification)
      return { success: ok }
    } catch (err) {
      if (err instanceof HttpException) throw err
      throw new HttpException(500, 'Failed to unlink legal basis')
    }
  }

  /**
   * Retrieves legal bases linked to a requirement.
   *
   * @param {Object} ReqIdentification
   * @param {number} ReqIdentification.identificationId
   * @param {number} ReqIdentification.requirementId
   * @returns {Promise<import('../models/LegalBasis.model.js').default[]>}
   * @throws {HttpException}
   */
  static async getLinkedLegalBases (ReqIdentification) {
    try {
      return await ReqIdentificationRepository.getLinkedLegalBases(ReqIdentification)
    } catch (err) {
      if (err instanceof HttpException) throw err
      throw new HttpException(500, 'Failed to fetch linked legal bases')
    }
  }

  /**
   * Links an article under a legal basis.
   *
   * @param {Object} ReqIdentification
   * @param {number} ReqIdentification.identificationId
   * @param {number} ReqIdentification.requirementId
   * @param {number} ReqIdentification.legalBasisId
   * @param {number} ReqIdentification.articleId
   * @param {string} ReqIdentification.articleType
   * @returns {Promise<{ success: boolean }>}
   * @throws {HttpException}
   */
  static async linkArticle (ReqIdentification) {
    try {
      const ok = await ReqIdentificationRepository.linkArticle(ReqIdentification)
      return { success: ok }
    } catch (err) {
      if (err instanceof HttpException) throw err
      throw new HttpException(500, 'Failed to link article')
    }
  }

  /**
 * Retrieves articles linked to a requirement.
 *
 * @param {Object} ReqIdentification - The query data.
 * @param {number} ReqIdentification.identificationId - The identification ID.
 * @param {number} ReqIdentification.requirementId - The requirement ID.
 * @returns {Promise<import('../models/Article.model.js').default[]>}
 * @throws {HttpException}
 */
  static async getLinkedArticles (ReqIdentification) {
    try {
      return await ReqIdentificationRepository.getLinkedArticles({
        identificationId: ReqIdentification.identificationId,
        requirementId: ReqIdentification.requirementId
      })
    } catch (err) {
      if (err instanceof HttpException) throw err
      throw new HttpException(500, 'Failed to fetch linked articles')
    }
  }

  /**
 * Unlinks an article under a legal basis.
 *
 * @param {Object} ReqIdentification - The unlink data.
 * @param {number} ReqIdentification.identificationId - The identification ID.
 * @param {number} ReqIdentification.requirementId - The requirement ID.
 * @param {number} ReqIdentification.legalBasisId - The legal basis ID.
 * @param {number} ReqIdentification.articleId - The article ID to unlink.
 * @returns {Promise<{ success: boolean }>} - True if the link was deleted, false otherwise.
 * @throws {HttpException}
 */
  static async unlinkArticle (ReqIdentification) {
    try {
      const ok = await ReqIdentificationRepository.unlinkArticle({
        identificationId: ReqIdentification.identificationId,
        requirementId: ReqIdentification.requirementId,
        legalBasisId: ReqIdentification.legalBasisId,
        articleId: ReqIdentification.articleId
      })
      return { success: ok }
    } catch (err) {
      if (err instanceof HttpException) throw err
      throw new HttpException(500, 'Failed to unlink article')
    }
  }

  /**
 * Links a legal verb translation.
 *
 * @param {Object} ReqIdentification - The link data.
 * @param {number} ReqIdentification.identificationId - The identification ID.
 * @param {number} ReqIdentification.requirementId - The requirement ID.
 * @param {number} ReqIdentification.legalVerbId - The legal verb ID.
 * @param {string} ReqIdentification.translation - The translated text.
 * @returns {Promise<{ success: boolean }>}
 * @throws {HttpException}
 */
  static async linkLegalVerb (ReqIdentification) {
    try {
      const ok = await ReqIdentificationRepository.linkLegalVerb({
        identificationId: ReqIdentification.identificationId,
        requirementId: ReqIdentification.requirementId,
        legalVerbId: ReqIdentification.legalVerbId,
        translation: ReqIdentification.translation
      })
      return { success: ok }
    } catch (err) {
      if (err instanceof HttpException) throw err
      throw new HttpException(500, 'Failed to link legal verb')
    }
  }

  /**
 * Retrieves legal verbs linked to a requirement.
 *
 * @param {Object} ReqIdentification - The query data.
 * @param {number} ReqIdentification.identificationId - The identification ID.
 * @param {number} ReqIdentification.requirementId - The requirement ID.
 * @returns {Promise<import('../models/LegalVerb.model.js').default[]>}
 * @throws {HttpException}
 */
  static async getLinkedLegalVerbs (ReqIdentification) {
    try {
      return await ReqIdentificationRepository.getLinkedLegalVerbs({
        identificationId: ReqIdentification.identificationId,
        requirementId: ReqIdentification.requirementId
      })
    } catch (err) {
      if (err instanceof HttpException) throw err
      throw new HttpException(500, 'Failed to fetch linked legal verbs')
    }
  }

  /**
   * Unlinks a legal verb translation from a requirement in an identification.
   *
   * @param {Object} ReqIdentification - The unlink data.
   * @param {number} ReqIdentification.identificationId - The ID of the identification.
   * @param {number} ReqIdentification.requirementId - The ID of the requirement.
   * @param {number} ReqIdentification.legalVerbId - The ID of the legal verb.
   * @returns {Promise<{ success: boolean }>} - True if the link was deleted, false otherwise.
   * @throws {HttpException}
   */
  static async unlinkLegalVerb (ReqIdentification) {
    try {
      const ok = await ReqIdentificationRepository.unlinkLegalVerb({
        identificationId: ReqIdentification.identificationId,
        requirementId: ReqIdentification.requirementId,
        legalVerbId: ReqIdentification.legalVerbId
      })
      return { success: ok }
    } catch (err) {
      if (err instanceof HttpException) throw err
      throw new HttpException(500, 'Failed to unlink legal verb')
    }
  }
}

export default ReqIdentificationService
