import AspectsRepository from '../../repositories/Aspects.repository.js'
import SubjectsRepository from '../../repositories/Subject.repository.js'
import ErrorUtils from '../../utils/Error.js'
import aspectSchema from '../../schemas/aspect.schema.js'
import { z } from 'zod'

/**
 * Service class for handling Aspect operations.
 */
class AspectsService {
  /**
   * Creates a new Aspect entry.
   * @param {Object} params - Parameters for creating an aspect.
   * @param {number} params.subjectId - The ID of the associated subject.
   * @param {string} params.aspectName - The name of the aspect.
   * @returns {Promise<Aspect>} - The created aspect data.
   * @throws {ErrorUtils} - If an error occurs during creation.
   */
  static async create ({ subjectId, aspectName }) {
    try {
      const parsedAspect = aspectSchema.parse({ aspectName })
      const subjectExists = await SubjectsRepository.findById(
        subjectId
      )
      if (!subjectExists) {
        throw new ErrorUtils(404, 'Subject not found')
      }
      const aspectExists = await AspectsRepository.existsByNameAndSubjectId(
        parsedAspect.aspectName,
        subjectId
      )
      if (aspectExists) {
        throw new ErrorUtils(409, 'Aspect already exists')
      }
      const createdAspect = await AspectsRepository.create(
        subjectId,
        parsedAspect.aspectName
      )
      return createdAspect
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
      throw new ErrorUtils(500, 'Failed to create aspect')
    }
  }

  /**
   * Fetches all aspects associated with a specific subject.
   * @param {number} subjectId - The ID of the subject to retrieve aspects for.
   * @returns {Promise<Array<Aspect>>} - List of aspects associated with the subject.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async getBySubjectId (subjectId) {
    try {
      const subjectExists = await SubjectsRepository.findById(subjectId)
      if (!subjectExists) {
        throw new ErrorUtils(404, 'Subject not found')
      }
      const aspects = await AspectsRepository.findBySubjectId(subjectId)
      if (!aspects) {
        return []
      }
      return aspects
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to fetch aspects')
    }
  }

  /**
   * Fetches an aspect by ID.
   * @param {number} id - The ID of the aspect to retrieve.
   * @returns {Promise<Aspect>} - The aspect data or null if not found.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async getById (id) {
    try {
      const aspect = await AspectsRepository.findById(id)
      if (!aspect) {
        throw new ErrorUtils(404, 'Aspect not found')
      }
      return aspect
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to fetch aspect')
    }
  }

  /**
   * Fetches aspects by name.
   * @param {number} aspectName - The name of the aspect to retrieve.
   * @param {number} subjectId - The ID of the subject to retrieve aspects for.
   * @returns {Promise<Array<Aspect>>} - The aspects data.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async getByName (aspectName, subjectId) {
    try {
      const subjectExists = await SubjectsRepository.findById(subjectId)
      if (!subjectExists) {
        throw new ErrorUtils(404, 'Subject not found')
      }
      const aspects = await AspectsRepository.findByNameAndSubjectId(aspectName, subjectId)
      if (!aspects) {
        return []
      }
      return aspects
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to fetch aspect')
    }
  }

  /**
   * Updates an aspect by ID.
   * @param {number} id - The ID of the aspect to update.
   * @param {string} aspectName - The new name of the aspect.
   * @returns {Promise<Aspect>} - The updated aspect data.
   * @throws {ErrorUtils} - If an error occurs during update.
   */
  static async updateById (id, aspectName) {
    try {
      const parsedAspect = aspectSchema.parse({ aspectName })
      const currentAspect = await AspectsRepository.findById(id)
      if (!currentAspect) {
        throw new ErrorUtils(404, 'Aspect not found')
      }
      const aspectExists = await AspectsRepository.existsByNameExcludingId(
        parsedAspect.aspectName,
        currentAspect.subject_id,
        id
      )
      if (aspectExists) {
        throw new ErrorUtils(409, 'Aspect already exists')
      }
      const updatedAspect = await AspectsRepository.updateById(
        id,
        parsedAspect.aspectName
      )
      if (!updatedAspect) {
        throw new ErrorUtils(404, 'Aspect not found')
      }
      return updatedAspect
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
      throw new ErrorUtils(500, 'Failed to update aspect')
    }
  }

  /**
   * Deletes an aspect by ID.
   * @param {number} id - The ID of the aspect to delete.
   * @returns {Promise<{ success: boolean }>} - An object indicating the deletion was successful.
   * @throws {ErrorUtils} - If an error occurs during deletion.
   */
  static async deleteById (id) {
    try {
      const aspect = await AspectsRepository.findById(id)
      if (!aspect) {
        throw new ErrorUtils(404, 'Aspect not found')
      }
      const { isAspectAssociatedToLegalBasis } =
        await AspectsRepository.checkAspectLegalBasisAssociations(id)
      if (isAspectAssociatedToLegalBasis) {
        throw new ErrorUtils(
          409,
          'The aspect is associated with one or more legal bases'
        )
      }
      const aspectDeleted = await AspectsRepository.deleteById(id)
      if (!aspectDeleted) {
        throw new ErrorUtils(404, 'Aspect not found')
      }
      return { success: true }
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to delete aspect')
    }
  }

  /**
   * Deletes multiple aspects by their IDs.
   * @param {Array<number>} aspectIds - Array of aspect IDs to delete.
   * @returns {Promise<{ success: boolean }>} - An object indicating the deletion was successful.
   * @throws {ErrorUtils} - If aspects not found, have associations preventing deletion, or deletion fails.
   */
  static async deleteAspectsBatch (aspectIds) {
    try {
      const existingAspects = await AspectsRepository.findByIds(aspectIds)
      if (existingAspects.length !== aspectIds.length) {
        const notFoundIds = aspectIds.filter(
          (id) => !existingAspects.some((aspect) => aspect.id === id)
        )
        throw new ErrorUtils(404, 'Aspects not found for IDs', { notFoundIds })
      }
      const associations =
        await AspectsRepository.checkAspectsLegalBasisAssociationsBatch(
          aspectIds
        )
      const aspectsWithLegalBasisAssociations = associations.filter(
        (aspect) => aspect.isAspectAssociatedToLegalBasis
      )
      if (aspectsWithLegalBasisAssociations.length > 0) {
        throw new ErrorUtils(409, 'Aspects are associated with legal bases', {
          associatedAspects: aspectsWithLegalBasisAssociations.map(
            (aspect) => ({
              id: aspect.id,
              name: aspect.name
            })
          )
        })
      }
      const aspectsDeleted = await AspectsRepository.deleteBatch(aspectIds)
      if (!aspectsDeleted) {
        throw new ErrorUtils(404, 'Aspects not found')
      }
      return { success: true }
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to delete aspects')
    }
  }
}

export default AspectsService
