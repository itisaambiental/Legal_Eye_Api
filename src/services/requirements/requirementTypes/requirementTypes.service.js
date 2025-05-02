import RequirementTypesRepository from '../../../repositories/RequirementTypes.repository.js'
import ErrorUtils from '../../../utils/Error.js'
import requirementTypesSchema from '../../../schemas/requirementTypes.schema.js'
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
   * @throws {ErrorUtils} - If an error occurs during creation.
   */
  static async create ({ name, description, classification }) {
    try {
      const parsedType = requirementTypesSchema.parse({ name, description, classification })

      const typeExists = await RequirementTypesRepository.existsByRequirementTypesName(parsedType.name)
      if (typeExists) {
        throw new ErrorUtils(409, 'Requirement type already exists')
      }

      const createdType = await RequirementTypesRepository.create(
        parsedType.name,
        parsedType.description,
        parsedType.classification
      )

      return createdType
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

      throw new ErrorUtils(500, 'Failed to create requirement type')
    }
  }

  /**
   * Fetches all requirement types.
   * @returns {Promise<Array<RequirementType>>} - List of all requirement types.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async getAll () {
    try {
      const requirementTypes = await RequirementTypesRepository.findAll()
      if (!requirementTypes) {
        return []
      }
      return requirementTypes
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to fetch requirement types')
    }
  }

  /**
   * Fetches a requirement type by ID.
   * @param {number} id - The ID of the requirement type to retrieve.
   * @returns {Promise<RequirementType>} - The requirement type data or throws if not found.
   * @throws {ErrorUtils} - If an error occurs during retrieval or not found.
   */
  static async getById (id) {
    try {
      const requirementType = await RequirementTypesRepository.findById(id)
      if (!requirementType) {
        throw new ErrorUtils(404, 'Requirement type not found')
      }
      return requirementType
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to fetch requirement type')
    }
  }

  /**
   * Fetches requirement types by partial or full name match.
   * @param {string} name - The name or partial name to search.
   * @returns {Promise<Array<RequirementType>>} - List of matching requirement types.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async getByName (name) {
    try {
      const types = await RequirementTypesRepository.findByName(name)
      if (!types) {
        return []
      }
      return types
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to fetch requirement types by name')
    }
  }

  /**
   * Fetches requirement types by partial or full description match.
   * @param {string} description - The description or partial description to search.
   * @returns {Promise<Array<RequirementType>>} - List of matching requirement types.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async getByDescription (description) {
    try {
      const types = await RequirementTypesRepository.findByDescription(description)
      if (!types) {
        return []
      }
      return types
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to fetch requirement types by description')
    }
  }

  /**
       * Fetches requirement types by partial or full classification match.
       * @param {string} classification - The classification or partial classification to search.
       * @returns {Promise<Array<RequirementType>>} - List of matching requirement types.
       * @throws {ErrorUtils} - If an error occurs during retrieval.
       */
  static async getByClassification (classification) {
    try {
      const types = await RequirementTypesRepository.findByClassification(classification)
      if (!types) {
        return []
      }
      return types
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to fetch requirement types by classification')
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
   * @throws {ErrorUtils} - If not found, name already exists, validation fails, or any unexpected error occurs.
   */
  static async updateById (id, { name, description, classification }) {
    try {
      const parsed = requirementTypesSchema.parse({ name, description, classification })

      const currentType = await RequirementTypesRepository.findById(id)
      if (!currentType) {
        throw new ErrorUtils(404, 'Requirement type not found')
      }

      const nameExists = await RequirementTypesRepository.existsByNameExcludingId(parsed.name, id)
      if (nameExists) {
        throw new ErrorUtils(409, 'Requirement type with this name already exists')
      }

      const updatedType = await RequirementTypesRepository.update(
        id,
        parsed.name,
        parsed.description,
        parsed.classification
      )

      if (!updatedType) {
        throw new ErrorUtils(404, 'Requirement type not found after update')
      }

      return updatedType
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

      throw new ErrorUtils(500, 'Failed to update requirement type')
    }
  }

  /**
   * Deletes a requirement type by ID.
   * @param {number} id - The ID of the requirement type to delete.
   * @returns {Promise<{ success: boolean }>} - An object indicating whether the deletion was successful.
   * @throws {ErrorUtils} - If the requirement type is not found or an error occurs during deletion.
   */
  static async deleteById (id) {
    try {
      const deleted = await RequirementTypesRepository.deleteById(id)
      if (!deleted) {
        throw new ErrorUtils(404, 'Requirement type not found')
      }

      return { success: true }
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to delete requirement type')
    }
  }

  /**
   * Deletes multiple requirement types by their IDs.
   * @param {Array<number>} requirementTypeIds - Array of requirement type IDs to delete.
   * @returns {Promise<{ success: boolean }>} - An object indicating the deletion was successful.
   * @throws {ErrorUtils} - If IDs not found or deletion fails.
   */
  static async deleteBatch (requirementTypeIds) {
    try {
      const existingTypes = await RequirementTypesRepository.findByIds(requirementTypeIds)
      if (existingTypes.length !== requirementTypeIds.length) {
        const notFoundIds = requirementTypeIds.filter(
          (id) => !existingTypes.some((type) => type.id === id)
        )
        throw new ErrorUtils(404, 'Requirement types not found for IDs', { notFoundIds })
      }
      const deleted = await RequirementTypesRepository.deleteBatch(requirementTypeIds)
      if (!deleted) {
        throw new ErrorUtils(404, 'Requirement types not found')
      }
      return { success: true }
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to delete requirement types')
    }
  }
}

export default RequirementTypesService
