import RequirementTypesRepository from '../../repositories/RequirementTypes.repository.js'
import HttpException from '../errors/HttpException.js'
import requirementTypesSchema from '../../schemas/requirementTypes.schema.js'
import { z } from 'zod'

/**
 * Service class for handling Requirement Type operations.
 */
class RequirementTypesService {
  /**
   * Creates a new RequirementType entry.
   * @param {Object} params - Parameters for creating a requirement type.
   * @param {string} params.name - The name of the requirement type.
   * @param {string} params.description - The description of the requirement type.
   * @param {string} params.classification - The classification of the requirement type.
   * @returns {Promise<RequirementType>} - The created requirement type data.
   * @throws {HttpException} - If an error occurs during creation.
   */
  static async create ({ name, description, classification }) {
    try {
      const parsedRequirementType = requirementTypesSchema.parse({
        name,
        description,
        classification
      })
      const requirementTypeNameExists =
        await RequirementTypesRepository.existsByRequirementTypesName(
          parsedRequirementType.name
        )
      if (requirementTypeNameExists) {
        throw new HttpException(409, 'Requirement type name already exists')
      }
      const createdRequirementType = await RequirementTypesRepository.create(
        parsedRequirementType.name,
        parsedRequirementType.description,
        parsedRequirementType.classification
      )
      return createdRequirementType
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
      throw new HttpException(500, 'Failed to create requirement type')
    }
  }

  /**
   * Fetches all requirement types.
   * @returns {Promise<Array<RequirementType>>} - List of all requirement types.
   * @throws {HttpException} - If an error occurs during retrieval.
   */
  static async getAll () {
    try {
      const requirementTypes = await RequirementTypesRepository.findAll()
      if (!requirementTypes) {
        return []
      }
      return requirementTypes
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      throw new HttpException(500, 'Failed to fetch requirement types')
    }
  }

  /**
   * Fetches a requirement type by ID.
   * @param {number} id - The ID of the requirement type to retrieve.
   * @returns {Promise<RequirementType>} - The requirement type data or throws if not found.
   * @throws {HttpException} - If an error occurs during retrieval or not found.
   */
  static async getById (id) {
    try {
      const requirementType = await RequirementTypesRepository.findById(id)
      if (!requirementType) {
        throw new HttpException(404, 'Requirement type not found')
      }
      return requirementType
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      throw new HttpException(500, 'Failed to fetch requirement type')
    }
  }

  /**
   * Fetches requirement types by partial or full name match.
   * @param {string} name - The name or partial name to search.
   * @returns {Promise<Array<RequirementType>>} - List of matching requirement types.
   * @throws {HttpException} - If an error occurs during retrieval.
   */
  static async getByName (name) {
    try {
      const requirementTypes = await RequirementTypesRepository.findByName(
        name
      )
      if (!requirementTypes) {
        return []
      }
      return requirementTypes
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      throw new HttpException(500, 'Failed to fetch requirement types by name')
    }
  }

  /**
   * Fetches requirement types by partial or full description match.
   * @param {string} description - The description or partial description to search.
   * @returns {Promise<Array<RequirementType>>} - List of matching requirement types.
   * @throws {HttpException} - If an error occurs during retrieval.
   */
  static async getByDescription (description) {
    try {
      const requirementTypes =
        await RequirementTypesRepository.findByDescription(description)
      if (!requirementTypes) {
        return []
      }
      return requirementTypes
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      throw new HttpException(
        500,
        'Failed to fetch requirement types by description'
      )
    }
  }

  /**
   * Fetches requirement types by partial or full classification match.
   * @param {string} classification - The classification or partial classification to search.
   * @returns {Promise<Array<RequirementType>>} - List of matching requirement types.
   * @throws {HttpException} - If an error occurs during retrieval.
   */
  static async getByClassification (classification) {
    try {
      const requirementTypes =
        await RequirementTypesRepository.findByClassification(classification)
      if (!requirementTypes) {
        return []
      }
      return requirementTypes
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      throw new HttpException(
        500,
        'Failed to fetch requirement types by classification'
      )
    }
  }

  /**
   * Updates a requirement type by ID.
   * @param {number} id - The ID of the requirement type to update.
   * @param {Object} params - The new requirement type data.
   * @param {string} params.name - The new name of the requirement type.
   * @param {string} params.description - The new description.
   * @param {string} params.classification - The new classification.
   * @returns {Promise<RequirementType>} - Returns the updated requirement type data.
   * @throws {HttpException} - If not found, name already exists, validation fails, or any unexpected error occurs.
   */
  static async updateById (id, { name, description, classification }) {
    try {
      const parsedRequirementType = requirementTypesSchema.parse({
        name,
        description,
        classification
      })
      const requirementType = await RequirementTypesRepository.findById(id)
      if (!requirementType) {
        throw new HttpException(404, 'Requirement type not found')
      }
      const requirementTypeNameExists =
        await RequirementTypesRepository.existsByNameExcludingId(
          parsedRequirementType.name,
          id
        )
      if (requirementTypeNameExists) {
        throw new HttpException(409, 'Requirement type name already exists')
      }

      const updatedRequirementType = await RequirementTypesRepository.update(
        id,
        parsedRequirementType.name,
        parsedRequirementType.description,
        parsedRequirementType.classification
      )
      if (!updatedRequirementType) {
        throw new HttpException(404, 'Requirement type not found')
      }
      return updatedRequirementType
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

      throw new HttpException(500, 'Failed to update requirement type')
    }
  }

  /**
   * Deletes a requirement type by ID.
   * @param {number} id - The ID of the requirement type to delete.
   * @returns {Promise<{ success: boolean }>} - An object indicating whether the deletion was successful.
   * @throws {HttpException} - If the requirement type is not found or an error occurs during deletion.
   */
  static async deleteById (id) {
    try {
      const requirementType = await RequirementTypesRepository.findById(id)
      if (!requirementType) {
        throw new HttpException(404, 'Requirement type not found')
      }
      const { isAssociatedToReqIdentifications } =
        await RequirementTypesRepository.checkReqIdentificationAssociations(id)
      if (isAssociatedToReqIdentifications) {
        throw new HttpException(
          409,
          'Requirement Type is associated with one or more requirement identifications'
        )
      }
      const requirementTypeDeleted =
        await RequirementTypesRepository.deleteById(id)
      if (!requirementTypeDeleted) {
        throw new HttpException(404, 'Requirement type not found')
      }
      return { success: true }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      throw new HttpException(500, 'Failed to delete requirement type')
    }
  }

  /**
   * Deletes multiple requirement types by their IDs.
   * @param {Array<number>} requirementTypeIds - Array of requirement type IDs to delete.
   * @returns {Promise<{ success: boolean }>} - An object indicating the deletion was successful.
   * @throws {HttpException} - If IDs not found or deletion fails.
   */
  static async deleteBatch (requirementTypeIds) {
    try {
      const existingRequirementTypes =
        await RequirementTypesRepository.findByIds(requirementTypeIds)
      if (existingRequirementTypes.length !== requirementTypeIds.length) {
        const notFoundIds = requirementTypeIds.filter(
          (id) => !existingRequirementTypes.some((rt) => rt.id === id)
        )
        throw new HttpException(404, 'Requirement types not found for IDs', {
          notFoundIds
        })
      }

      const reqIdentificationAssociations =
        await RequirementTypesRepository.checkReqIdentificationAssociationsBatch(
          requirementTypeIds
        )

      const requirementsTypesWithAssociations =
        reqIdentificationAssociations.filter(
          (requirementType) => requirementType.isAssociatedToReqIdentifications
        )

      if (requirementsTypesWithAssociations.length > 0) {
        throw new HttpException(
          409,
          'Some Requirement Types are associated with requirement identifications',
          {
            requirementTypes: requirementsTypesWithAssociations.map(
              (requirementType) => ({
                id: requirementType.id,
                name: requirementType.name
              })
            )
          }
        )
      }
      const requirementTypesDeleted =
        await RequirementTypesRepository.deleteBatch(requirementTypeIds)
      if (!requirementTypesDeleted) {
        throw new HttpException(404, 'Requirement types not found')
      }
      return { success: true }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      throw new HttpException(500, 'Failed to delete requirement types')
    }
  }
}

export default RequirementTypesService
