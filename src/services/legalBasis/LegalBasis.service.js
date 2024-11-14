import LegalBasisRepository from '../../repositories/LegalBasis.repository.js'
import articlesQueue from '../../workers/articlesWorker.js'
import legalBasisSchema from '../../validations/legalBasisValidation.js'
import SubjectsRepository from '../../repositories/Subject.repository.js'
import AspectsRepository from '../../repositories/Aspects.repository.js'
import { z } from 'zod'
import ErrorUtils from '../../utils/Error.js'
import FileService from '../files/File.service.js'
/**
 * Service class for handling Legal Basis operations.
 */
class LegalBasisService {
  /**
 * Creates a new Legal Basis entry by validating data and delegating heavy tasks to the worker.
 * @param {Object} params - Parameters for creating a legal basis.
 * @param {string} params.legalName - The name of the legal basis.
 * @param {string} params.abbreviation - The abbreviation of the legal basis.
 * @param {string} params.subject - The subject of the legal basis.
 * @param {string} params.aspects - The aspects associated with the legal basis.
 * @param {string} params.classification - The classification of the legal basis.
 * @param {string} params.jurisdiction - The jurisdiction of the legal basis.
 * @param {string} [params.state] - The state associated with the legal basis.
 * @param {string} [params.municipality] - The municipality associated with the legal basis.
 * @param {string} params.lastReform - The date of the last reform.
 * @param {Object} params.document - The document to process.
* @returns {Promise<Object>} - The JobId and the created legalBasis object.
 * @throws {ErrorUtils} - If an error occurs during the creation validation.
 */
  static async create ({ legalName, abbreviation, subjectId, aspectsIds, classification, jurisdiction, state, municipality, lastReform, document }) {
    try {
      const parsedData = legalBasisSchema.parse({ legalName, abbreviation, subjectId, aspectsIds, classification, jurisdiction, state, municipality, lastReform, document })
      const legalBasisExists = await LegalBasisRepository.exists(parsedData.legalName)
      if (legalBasisExists) {
        throw new ErrorUtils(409, 'LegalBasis already exists')
      }
      const subjectExists = await SubjectsRepository.findById(parsedData.subjectId)
      if (!subjectExists) {
        throw new ErrorUtils(400, 'Invalid subject ID')
      }
      const validAspectIds = await AspectsRepository.findByIds(parsedData.aspectsIds)
      if (validAspectIds.length !== parsedData.aspectsIds.length) {
        const invalidIds = parsedData.aspectsIds.filter(id => !validAspectIds.includes(id))
        throw new ErrorUtils(400, 'Invalid aspect Ids', { invalidIds })
      }
      let documentKey = null
      const uploadResponse = await FileService.uploadFile(document)
      if (uploadResponse.response.$metadata.httpStatusCode !== 200) {
        throw new ErrorUtils(500, 'File Upload Error')
      }
      documentKey = uploadResponse.uniqueFileName
      const lastReformDate = new Date(parsedData.lastReform)
      const legalBasisData = {
        legalName: parsedData.legalName,
        abbreviation: parsedData.abbreviation,
        subjectId: parsedData.subjectId,
        aspectsIds: parsedData.aspectsIds,
        classification: parsedData.classification,
        jurisdiction: parsedData.jurisdiction,
        state: parsedData.state,
        municipality: parsedData.municipality,
        lastReform: lastReformDate,
        url: documentKey
      }
      const createdLegalBasis = await LegalBasisRepository.create(legalBasisData)
      const job = await articlesQueue.add({
        document: documentKey,
        legalBasisId: createdLegalBasis.id
      })
      return { jobId: job.id, legalBasis: createdLegalBasis }
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
      throw new ErrorUtils(500, 'Unexpected error during legal basis creation')
    }
  }

  /**
   * Retrieves all legal basis entries from the database.
   * Fetches articles and document URLs for each legal basis.
   * @returns {Promise<Array<Object>>} - A list of all legal basis entries, including document URL.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async getAll () {
    try {
      const legalBasis = await LegalBasisRepository.findAll()
      if (!legalBasis) {
        return []
      }
      const legalBasesWithDetails = await Promise.all(legalBasis.map(async (legalBasis) => {
        let documentUrl = null
        if (legalBasis.url) {
          documentUrl = await FileService.getFile(legalBasis.url)
        }

        return {
          id: legalBasis.id,
          legalName: legalBasis.legal_name,
          subject: legalBasis.subject,
          aspects: legalBasis.aspects,
          classification: legalBasis.classification,
          jurisdiction: legalBasis.jurisdiction,
          state: legalBasis.state,
          municipality: legalBasis.municipality,
          last_reform: legalBasis.lastReform,
          abbreviation: legalBasis.abbreviation,
          url: documentUrl
        }
      }))

      return legalBasesWithDetails
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to retrieve legal basis records')
    }
  }

  /**
   * Retrieves a legal basis entry by its ID.
   * Fetches articles and document URL for the specified legal basis.
   * @param {number} id - The ID of the legal basis to retrieve.
   * @returns {Promise<Object>} - The legal basis entry, and document URL.
   * @throws {ErrorUtils} - If an error occurs during retrieval or if the legal basis is not found.
   */
  static async getById (id) {
    try {
      const legalBase = await LegalBasisRepository.findById(id)
      if (!legalBase) {
        return []
      }
      let documentUrl = null
      if (legalBase.url) {
        documentUrl = await FileService.getFile(legalBase.url)
      }
      return {
        id: legalBase.id,
        legalName: legalBase.legal_name,
        subject: legalBase.subject,
        aspects: legalBase.aspects,
        classification: legalBase.classification,
        jurisdiction: legalBase.jurisdiction,
        state: legalBase.state,
        municipality: legalBase.municipality,
        last_reform: legalBase.lastReform,
        abbreviation: legalBase.abbreviation,
        url: documentUrl
      }
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to retrieve legal basis record by ID')
    }
  }

  /**
   * Retrieves a legal basis entry by its name.
   * Fetches articles and document URL for the specified legal basis.
   * @param {string} legalName - The name of the legal basis to retrieve.
   * @returns {Promise<Object>} - The legal basis entry, including document URL.
   * @throws {ErrorUtils} - If an error occurs during retrieval or if the legal basis is not found.
   */
  static async getByName (legalName) {
    try {
      const legalBase = await LegalBasisRepository.findByName(legalName)
      if (!legalBase) {
        return []
      }
      let documentUrl = null
      if (legalBase.url) {
        documentUrl = await FileService.getFile(legalBase.url)
      }
      return {
        id: legalBase.id,
        legalName: legalBase.legal_name,
        subject: legalBase.subject,
        aspects: legalBase.aspects,
        classification: legalBase.classification,
        jurisdiction: legalBase.jurisdiction,
        state: legalBase.state,
        municipality: legalBase.municipality,
        last_reform: legalBase.lastReform,
        abbreviation: legalBase.abbreviation,
        url: documentUrl
      }
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to retrieve legal basis record by name')
    }
  }

  /**
   * Retrieves a legal basis entry by its abbreviation.
   * Fetches the document URL for the specified legal basis.
   * @param {string} abbreviation - The abbreviation of the legal basis to retrieve.
   * @returns {Promise<Array<Object>>} - The legal basis entry, including document URL.
   * @throws {ErrorUtils} - If an error occurs during retrieval or if the legal basis is not found.
   */
  static async getByAbbreviation (abbreviation) {
    try {
      const legalBasis = await LegalBasisRepository.findByAbbreviation(abbreviation)

      if (!legalBasis) {
        return []
      }

      const legalBasesWithDetails = await Promise.all(legalBasis.map(async (legalBasis) => {
        let documentUrl = null
        if (legalBasis.url) {
          documentUrl = await FileService.getFile(legalBasis.url)
        }

        return {
          id: legalBasis.id,
          legalName: legalBasis.legal_name,
          subject: legalBasis.subject,
          aspects: legalBasis.aspects,
          classification: legalBasis.classification,
          jurisdiction: legalBasis.jurisdiction,
          state: legalBasis.state,
          municipality: legalBasis.municipality,
          last_reform: legalBasis.lastReform,
          abbreviation: legalBasis.abbreviation,
          url: documentUrl
        }
      }))

      return legalBasesWithDetails
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to retrieve legal basis record by abbreviation')
    }
  }

  /**
 * Retrieves all legal basis entries by their classification.
 * Fetches the document URL for each legal basis.
 * @param {string} classification - The classification of the legal basis to retrieve.
 * @returns {Promise<Array<Object>>} - A list of legal basis entries, including document URLs.
 * @throws {ErrorUtils} - If an error occurs during retrieval.
 */
  static async getByClassification (classification) {
    try {
      const legalBasis = await LegalBasisRepository.findByClassification(classification)

      if (!legalBasis) {
        return []
      }
      const legalBasesWithDetails = await Promise.all(legalBasis.map(async (legalBasis) => {
        let documentUrl = null
        if (legalBasis.url) {
          documentUrl = await FileService.getFile(legalBasis.url)
        }

        return {
          id: legalBasis.id,
          legalName: legalBasis.legal_name,
          classification: legalBasis.classification,
          jurisdiction: legalBasis.jurisdiction,
          state: legalBasis.state,
          municipality: legalBasis.municipality,
          last_reform: legalBasis.lastReform,
          abbreviation: legalBasis.abbreviation,
          url: documentUrl
        }
      }))

      return legalBasesWithDetails
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to retrieve legal basis records by classification')
    }
  }

  /**
 * Retrieves legal basis entries filtered by jurisdiction.
 * Fetches the document URL for each legal basis.
 * @param {string} jurisdiction - The jurisdiction to filter by.
 * @returns {Promise<Array<Object>>} - A list of legal basis entries, including document URLs.
 * @throws {ErrorUtils} - If an error occurs during retrieval.
 */
  static async getByJurisdiction (jurisdiction) {
    try {
      const legalBasis = await LegalBasisRepository.findByJurisdiction(jurisdiction)

      if (!legalBasis) {
        return []
      }

      const legalBasesWithDetails = await Promise.all(legalBasis.map(async (legalBasis) => {
        let documentUrl = null
        if (legalBasis.url) {
          documentUrl = await FileService.getFile(legalBasis.url)
        }

        return {
          id: legalBasis.id,
          legalName: legalBasis.legal_name,
          classification: legalBasis.classification,
          jurisdiction: legalBasis.jurisdiction,
          state: legalBasis.state,
          municipality: legalBasis.municipality,
          last_reform: legalBasis.lastReform,
          abbreviation: legalBasis.abbreviation,
          url: documentUrl
        }
      }))

      return legalBasesWithDetails
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to retrieve legal basis records by jurisdiction')
    }
  }

  /**
 * Retrieves legal basis entries filtered by state and optionally by municipality.
 * Fetches the document URL for each legal basis.
 * @param {Object} params - The parameters for filtering.
 * @param {string} params.state - The state to filter by.
 * @param {string} [params.municipality] - The municipality to filter by (optional).
 * @returns {Promise<Array<Object>>} - A list of legal basis entries, including document URLs.
 * @throws {ErrorUtils} - If an error occurs during retrieval or validation.
 */
  static async getByStateAndMunicipality ({ state, municipality = null }) {
    if (!state) {
      return []
    }
    try {
      const legalBasis = await LegalBasisRepository.findByStateAndMunicipality(state, municipality)
      if (!legalBasis) {
        return []
      }
      const legalBasesWithDetails = await Promise.all(legalBasis.map(async (legalBasis) => {
        let documentUrl = null
        if (legalBasis.url) {
          documentUrl = await FileService.getFile(legalBasis.url)
        }

        return {
          id: legalBasis.id,
          legalName: legalBasis.legal_name,
          classification: legalBasis.classification,
          jurisdiction: legalBasis.jurisdiction,
          state: legalBasis.state,
          municipality: legalBasis.municipality,
          last_reform: legalBasis.lastReform,
          abbreviation: legalBasis.abbreviation,
          url: documentUrl
        }
      }))

      return legalBasesWithDetails
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to retrieve legal basis records by state and municipality')
    }
  }
}

export default LegalBasisService
