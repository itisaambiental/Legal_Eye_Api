import LegalBasisRepository from '../../repositories/LegalBasis.repository.js'
import ArticlesRepository from '../../repositories/Articules.repository.js'
import legalBasisSchema from '../../validations/legalBasisValidation.js'
import { z } from 'zod'
import ErrorUtils from '../../utils/Error.js'
import FileService from '../files/File.service.js'
import generateAbbreviation from '../../utils/generateAbbreviation.js'
import DocumentService from '../files/DocumentService.js'
import ArticleExtractorFactory from '../articleExtraction/ArticleExtractorFactory.js'

/**
 * Service class for handling Legal Basis operations.
 */
class LegalBasisService {
  /**
   * Creates a new Legal Basis entry and processes associated documents.
   * @param {Object} params - Parameters for creating a legal basis.
   * @param {string} params.legalName - The name of the legal basis.
   * @param {string} params.classification - The classification of the legal basis.
   * @param {string} params.jurisdiction - The jurisdiction of the legal basis.
   * @param {string} [params.state] - The state associated with the legal basis.
   * @param {string} [params.municipality] - The municipality associated with the legal basis.
   * @param {string} params.lastReform - The date of the last reform.
   * @param {Object} [params.document] - The document to process (optional).
   * @returns {Promise<Object>} - The created legal basis data.
   * @throws {ErrorUtils} - If an error occurs during creation.
   */
  static async create ({ legalName, classification, jurisdiction, state, municipality, lastReform, document }) {
    try {
      const parsedData = legalBasisSchema.parse({ legalName, classification, jurisdiction, state, municipality, lastReform, document })
      const legalBasisExists = await LegalBasisRepository.exists(parsedData.legalName)
      if (legalBasisExists) {
        throw new ErrorUtils(400, 'LegalBasis already exists')
      }

      let documentKey = null
      let extractedArticles = []

      if (document) {
        const { error, success, data } = await DocumentService.process({ document })
        if (!success) {
          throw new ErrorUtils(500, 'Document Processing Error', error)
        }

        const extractor = ArticleExtractorFactory.getExtractor(parsedData.classification, data)
        if (!extractor) {
          throw new ErrorUtils(400, 'Invalid Classification', 'No extractor found for the provided classification')
        }

        extractedArticles = extractor.extractArticles()
        if (!extractedArticles || extractedArticles.length === 0) {
          throw new ErrorUtils(500, 'Article Processing Error', 'No articles were extracted from the document')
        }

        const uploadResponse = await FileService.uploadFile(document)
        if (uploadResponse.response.$metadata.httpStatusCode !== 200) {
          throw new ErrorUtils(500, 'File Upload Error', 'Failed to upload document')
        }

        documentKey = uploadResponse.uniqueFileName
      }

      const abbreviation = generateAbbreviation(parsedData.legalName)
      const lastReformDate = new Date(parsedData.lastReform)

      const legalBasisId = await LegalBasisRepository.create({
        legalName: parsedData.legalName,
        abbreviation,
        classification: parsedData.classification,
        jurisdiction: parsedData.jurisdiction,
        state: parsedData.state,
        municipality: parsedData.municipality,
        lastReform: lastReformDate,
        url: documentKey
      })

      const articlesInserted = await ArticlesRepository.insertArticles(legalBasisId, extractedArticles)
      if (!articlesInserted) {
        throw new ErrorUtils(500, 'Failed to insert articles')
      }

      const legalBase = await this.getById(legalBasisId)

      return {
        legalBase
      }
    } catch (error) {
      console.error('Error creating a new legal basis:', error.message)

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
      const legalBases = await LegalBasisRepository.findAll()
      if (legalBases.length === 0) {
        return []
      }
      const legalBasesWithDetails = await Promise.all(legalBases.map(async (legalBasis) => {
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
      console.error('Error retrieving all legal basis:', error.message)
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
      const legalBasis = await LegalBasisRepository.findById(id)
      if (!legalBasis) {
        return []
      }
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
    } catch (error) {
      console.error('Error retrieving legal basis by ID:', error.message)

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
      const legalBasis = await LegalBasisRepository.findByName(legalName)
      if (!legalBasis) {
        return []
      }
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
    } catch (error) {
      console.error('Error retrieving legal basis by name:', error.message)
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
   * @returns {Promise<Object>} - The legal basis entry, including document URL.
   * @throws {ErrorUtils} - If an error occurs during retrieval or if the legal basis is not found.
   */
  static async getByAbbreviation (abbreviation) {
    try {
      const legalBasis = await LegalBasisRepository.findByAbbreviation(abbreviation)

      if (!legalBasis) {
        return []
      }

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
        last_reform: legalBasis.last_reform,
        abbreviation: legalBasis.abbreviation,
        url: documentUrl
      }
    } catch (error) {
      console.error('Error retrieving legal basis by abbreviation:', error.message)

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
      const legalBases = await LegalBasisRepository.findByClassification(classification)

      if (legalBases.length === 0) {
        return []
      }

      const legalBasesWithDetails = await Promise.all(legalBases.map(async (legalBasis) => {
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
          last_reform: legalBasis.last_reform,
          abbreviation: legalBasis.abbreviation,
          url: documentUrl
        }
      }))

      return legalBasesWithDetails
    } catch (error) {
      console.error('Error retrieving legal basis by classification:', error.message)

      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to retrieve legal basis records by classification')
    }
  }
}

export default LegalBasisService
