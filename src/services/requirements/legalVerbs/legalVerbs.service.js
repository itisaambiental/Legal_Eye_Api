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
      const legalVerbParsed = legalVerbsSchema.parse({ name, description, translation })
      const LegalVerbNameExists = await LegalVerbsRepository.existsByName(legalVerbParsed.name)
      if (LegalVerbNameExists) {
        throw new ErrorUtils(409, 'Legal verb name already exists')
      }
      const createdLegalVerb = await LegalVerbsRepository.create(
        legalVerbParsed.name,
        legalVerbParsed.description,
        legalVerbParsed.translation
      )
      return createdLegalVerb
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
      const legalVerbs = await LegalVerbsRepository.findAll()
      if (!legalVerbs) {
        return []
      }
      return legalVerbs
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
      const legalVerb = await LegalVerbsRepository.findById(id)
      if (!legalVerb) {
        throw new ErrorUtils(404, 'Legal verb not found')
      }
      return legalVerb
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
      const legalVerbs = await LegalVerbsRepository.findByName(name)
      if (!legalVerbs) {
        return []
      }
      return legalVerbs
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
      const legalVerbs = await LegalVerbsRepository.findByDescription(description)
      if (!legalVerbs) {
        return []
      }
      return legalVerbs
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
      const legalVerbs = await LegalVerbsRepository.findByTranslation(translation)
      if (!legalVerbs) {
        return []
      }
      return legalVerbs
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
      const legalVerbParsed = legalVerbsSchema.parse({ name, description, translation })
      const legalVerb = await LegalVerbsRepository.findById(id)
      if (!legalVerb) {
        throw new ErrorUtils(404, 'Legal verb not found')
      }
      const LegalVerbNameExists = await LegalVerbsRepository.existsByNameExcludingId(
        legalVerbParsed.name,
        id
      )
      if (LegalVerbNameExists) {
        throw new ErrorUtils(409, 'Legal verb name already exists')
      }
      const updatedLegalVerb = await LegalVerbsRepository.update(
        id,
        legalVerbParsed.name,
        legalVerbParsed.description,
        legalVerbParsed.translation
      )
      if (!updatedLegalVerb) {
        throw new ErrorUtils(404, 'Legal verb not found')
      }
      return updatedLegalVerb
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors = error.errors.map((e) => ({
          field: e.path[0],
          message: e.message
        }))
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
      const legalVerb = await LegalVerbsRepository.findById(id)
      if (!legalVerb) {
        throw new ErrorUtils(404, 'Legal verb not found')
      }
      const deletedLegalVerb = await LegalVerbsRepository.deleteById(id)
      if (!deletedLegalVerb) {
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
   * @param {Array<number>} legalVerbsIds - Array of legal verb IDs to delete.
   * @returns {Promise<{ success: boolean }>} - An object indicating the deletion was successful.
   * @throws {ErrorUtils} - If IDs not found or deletion fails.
   */
  static async deleteBatch (legalVerbsIds) {
    try {
      const legalVerbs = await LegalVerbsRepository.findByIds(legalVerbsIds)
      if (legalVerbs.length !== legalVerbsIds.length) {
        const notFoundIds = legalVerbsIds.filter(
          (id) => !legalVerbs.some((lv) => lv.id === id)
        )
        throw new ErrorUtils(404, 'Legal verbs not found for IDs', {
          notFoundIds
        })
      }
      const deletedLegalVerbs = await LegalVerbsRepository.deleteBatch(legalVerbsIds)
      if (!deletedLegalVerbs) {
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
