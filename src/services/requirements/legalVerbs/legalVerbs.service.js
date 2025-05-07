import LegalVerbsRepository from '../../../repositories/LegalVerbs.repository.js'
import ErrorUtils from '../../../utils/Error.js'
import legalVerbsSchema from '../../../schemas/legalVerbs.schema.js'
import { z } from 'zod'

/**
 * Service class for handling Legal Verb operations.
 */
class LegalVerbsService {
  /**
   * Creates a new LegalVerb entry.
   * @param {Object} params - Parameters for creating a legal verb.
   * @param {string} params.name - The name of the legal verb.
   * @param {string} params.description - The description of the legal verb.
   * @param {string} params.translation - The translation of the legal verb.
   * @returns {Promise<LegalVerb>} - The created legal verb data.
   * @throws {ErrorUtils} - If an error occurs during creation.
   */
  static async create ({ name, description, translation }) {
    try {
      const parsed = legalVerbsSchema.parse({ name, description, translation })
      const exists = await LegalVerbsRepository.existsByName(parsed.name)
      if (exists) {
        throw new ErrorUtils(409, 'Legal verb name already exists')
      }
      const created = await LegalVerbsRepository.create(
        parsed.name,
        parsed.description,
        parsed.translation
      )
      return created
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors = error.errors.map(e => ({ field: e.path[0], message: e.message }))
        throw new ErrorUtils(400, 'Validation failed', validationErrors)
      }
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to create legal verb')
    }
  }

  /**
   * Fetches all legal verbs.
   * @returns {Promise<Array<LegalVerb>>} - List of all legal verbs.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async getAll () {
    try {
      const items = await LegalVerbsRepository.findAll()
      return items || []
    } catch (error) {
      if (error instanceof ErrorUtils) throw error
      throw new ErrorUtils(500, 'Failed to fetch legal verbs')
    }
  }

  /**
   * Fetches a legal verb by ID.
   * @param {number} id - The ID of the legal verb to retrieve.
   * @returns {Promise<LegalVerb>} - The legal verb data or throws if not found.
   * @throws {ErrorUtils} - If an error occurs during retrieval or not found.
   */
  static async getById (id) {
    try {
      const item = await LegalVerbsRepository.findById(id)
      if (!item) {
        throw new ErrorUtils(404, 'Legal verb not found')
      }
      return item
    } catch (error) {
      if (error instanceof ErrorUtils) throw error
      throw new ErrorUtils(500, 'Failed to fetch legal verb')
    }
  }

  /**
   * Fetches legal verbs by partial or full name match.
   * @param {string} name - The name or partial name to search.
   * @returns {Promise<Array<LegalVerb>>} - List of matching legal verbs.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async getByName (name) {
    try {
      const items = await LegalVerbsRepository.findByName(name)
      return items || []
    } catch (error) {
      if (error instanceof ErrorUtils) throw error
      throw new ErrorUtils(500, 'Failed to fetch legal verbs by name')
    }
  }

  /**
   * Fetches legal verbs by partial or full description match.
   * @param {string} description - The description or partial description to search.
   * @returns {Promise<Array<LegalVerb>>} - List of matching legal verbs.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async getByDescription (description) {
    try {
      const items = await LegalVerbsRepository.findByDescription(description)
      return items || []
    } catch (error) {
      if (error instanceof ErrorUtils) throw error
      throw new ErrorUtils(500, 'Failed to fetch legal verbs by description')
    }
  }

  /**
   * Fetches legal verbs by partial or full translation match.
   * @param {string} translation - The translation or partial translation to search.
   * @returns {Promise<Array<LegalVerb>>} - List of matching legal verbs.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async getByTranslation (translation) {
    try {
      const items = await LegalVerbsRepository.findByTranslation(translation)
      return items || []
    } catch (error) {
      if (error instanceof ErrorUtils) throw error
      throw new ErrorUtils(500, 'Failed to fetch legal verbs by translation')
    }
  }

  /**
   * Updates a legal verb by ID.
   * @param {number} id - The ID of the legal verb to update.
   * @param {Object} params - The new legal verb data.
   * @param {string} params.name - The new name of the legal verb.
   * @param {string} params.description - The new description.
   * @param {string} params.translation - The new translation.
   * @returns {Promise<LegalVerb>} - Returns the updated legal verb data.
   * @throws {ErrorUtils} - If not found, name already exists, validation fails, or any unexpected error occurs.
   */
  static async updateById (id, { name, description, translation }) {
    try {
      const parsed = legalVerbsSchema.parse({ name, description, translation })
      const existing = await LegalVerbsRepository.findById(id)
      if (!existing) {
        throw new ErrorUtils(404, 'Legal verb not found')
      }
      const nameExists = await LegalVerbsRepository.existsByNameExcludingId(parsed.name, id)
      if (nameExists) {
        throw new ErrorUtils(409, 'Legal verb name already exists')
      }
      const updated = await LegalVerbsRepository.update(
        id,
        parsed.name,
        parsed.description,
        parsed.translation
      )
      if (!updated) {
        throw new ErrorUtils(404, 'Legal verb not found')
      }
      return updated
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors = error.errors.map(e => ({ field: e.path[0], message: e.message }))
        throw new ErrorUtils(400, 'Validation failed', validationErrors)
      }
      if (error instanceof ErrorUtils) throw error
      throw new ErrorUtils(500, 'Failed to update legal verb')
    }
  }

  /**
   * Deletes a legal verb by ID.
   * @param {number} id - The ID of the legal verb to delete.
   * @returns {Promise<{ success: boolean }>} - An object indicating whether the deletion was successful.
   * @throws {ErrorUtils} - If the legal verb is not found or an error occurs during deletion.
   */
  static async deleteById (id) {
    try {
      const existing = await LegalVerbsRepository.findById(id)
      if (!existing) {
        throw new ErrorUtils(404, 'Legal verb not found')
      }
      const deleted = await LegalVerbsRepository.deleteById(id)
      if (!deleted) {
        throw new ErrorUtils(404, 'Legal verb not found')
      }
      return { success: true }
    } catch (error) {
      if (error instanceof ErrorUtils) throw error
      throw new ErrorUtils(500, 'Failed to delete legal verb')
    }
  }

  /**
   * Deletes multiple legal verbs by their IDs.
   * @param {Array<number>} ids - Array of legal verb IDs to delete.
   * @returns {Promise<{ success: boolean }>} - An object indicating the deletion was successful.
   * @throws {ErrorUtils} - If IDs not found or deletion fails.
   */
  static async deleteBatch (ids) {
    try {
      const existing = await LegalVerbsRepository.findByIds(ids)
      if (existing.length !== ids.length) {
        const notFoundIds = ids.filter(id => !existing.some(item => item.id === id))
        throw new ErrorUtils(404, 'Legal verbs not found for IDs', { notFoundIds })
      }
      const deleted = await LegalVerbsRepository.deleteBatch(ids)
      if (!deleted) {
        throw new ErrorUtils(404, 'Legal verbs not found')
      }
      return { success: true }
    } catch (error) {
      if (error instanceof ErrorUtils) throw error
      throw new ErrorUtils(500, 'Failed to delete legal verbs')
    }
  }
}

export default LegalVerbsService
