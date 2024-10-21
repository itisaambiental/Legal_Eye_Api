// services/LegalBasis/LegalBasis.service.js

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
        if (success) {
          const extractor = ArticleExtractorFactory.getExtractor(parsedData.classification, data)
          if (extractor) {
            extractedArticles = extractor.extractArticles()
            if (!extractedArticles || extractedArticles.length === 0) {
              throw new ErrorUtils(500, 'Article Processing Error', 'No articles were extracted from the document')
            }
          } else {
            throw new ErrorUtils(400, 'Invalid Classification', 'No extractor found for the provided classification')
          }
        } else {
          throw new ErrorUtils(500, 'Document Processing Error', error)
        }
        const uploadResponse = await FileService.uploadFile(document)
        if (uploadResponse.response.$metadata.httpStatusCode === 200) {
          documentKey = uploadResponse.uniqueFileName
        } else {
          throw new ErrorUtils(500, 'File Upload Error', 'Failed to upload document')
        }
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
        last_reform: lastReformDate,
        url: documentKey
      })

      await ArticlesRepository.insertArticles(legalBasisId, extractedArticles)
      let documentUrl = null
      if (documentKey) {
        documentUrl = await FileService.getFile(documentKey)
      }

      return {
        id: legalBasisId,
        legalName,
        classification,
        jurisdiction,
        state,
        municipality,
        last_reform: lastReformDate,
        abbreviation,
        url: documentUrl
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors = error.errors.map((e) => ({
          field: e.path[0],
          message: e.message
        }))
        throw new ErrorUtils(400, 'Validation failed', validationErrors)
      }
      throw error
    }
  }
}

export default LegalBasisService
