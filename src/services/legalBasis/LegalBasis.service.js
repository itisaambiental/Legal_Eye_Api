import LegalBasisRepository from '../../repositories/LegalBasis.repository.js'
import legalBasisSchema from '../../validations/legalBasisValidation.js'
import { z } from 'zod'
import ErrorUtils from '../../utils/Error.js'
import FileService from '../files/File.service.js'
import generateAbbreviation from '../../utils/generateAbbreviation.js'
import DocumentService from '../files/DocumentService.js'
import ArticleExtractorFactory from '../articleExtraction/ArticleExtractorFactory.js'

// Class to handle Legal Basis
class LegalBasisService {
  // Create a Legal Basis
  static async create ({ legalName, classification, jurisdiction, state, municipality, lastReform, document }) {
    try {
      const parsedData = legalBasisSchema.parse({ legalName, classification, jurisdiction, state, municipality, lastReform, document })
      const legalBasisExists = await LegalBasisRepository.exists(legalName)
      if (legalBasisExists) {
        throw new ErrorUtils(400, 'LegalBasis already exists')
      }
      let documentKey = null
      let extractedArticles = ''

      if (document) {
        const { error, success, data } = await DocumentService.process({ document })
        if (success) {
          const extractor = ArticleExtractorFactory.getExtractor(classification, data)
          if (extractor) {
            extractedArticles = extractor.extractArticles()
            if (!extractedArticles || Object.keys(extractedArticles).length === 0) {
              throw new ErrorUtils(500, 'Articules Processing Error')
            }
          } else {
            throw new ErrorUtils(400, 'Classification Invalid')
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

      console.log('Articulos listos para su procesamiento', extractedArticles)

      const abbreviation = generateAbbreviation(legalName)
      const lastReformDate = new Date(lastReform)

      const id = await LegalBasisRepository.create({
        ...parsedData,
        last_reform: lastReformDate,
        url: documentKey
      })

      let documentUrl = null
      if (documentKey) {
        documentUrl = await FileService.getFile(documentKey)
      }

      return {
        id,
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
