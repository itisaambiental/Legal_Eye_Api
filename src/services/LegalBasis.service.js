// services/LegalBasisService.js

import LegalBasisRepository from '../repositories/LegalBasis.repository.js'
import legalBasisSchema from '../validations/legalBasisValidation.js'
import { z } from 'zod'
import ErrorUtils from '../utils/Error.js'
import FileService from './File.service.js'
import generateAbbreviation from '../utils/generateAbbreviation.js'
import DocumentService from './DocumentService.js'

class LegalBasisService {
  static async create ({ legalName, classification, jurisdiction, state, municipality, lastReform, document }) {
    try {
      const parsedData = legalBasisSchema.parse({ legalName, classification, jurisdiction, state, municipality, lastReform, document })

      const abbreviation = generateAbbreviation(legalName)
      const lastReformDate = new Date(lastReform)

      let documentKey = null
      let documentText = null
      if (document) {
        const documentResult = await DocumentService.process({ document })
        if (documentResult.success) {
          documentText = documentResult.data
          console.log('Extracted Document Text:', documentText)
        } else {
          console.error('Document Processing Error:', documentResult.error)
          throw new ErrorUtils(500, 'Document Processing Error', 'Failed to process the document')
        }

        const uploadResponse = await FileService.uploadFile(document)
        if (uploadResponse.response.$metadata.httpStatusCode === 200) {
          documentKey = uploadResponse.uniqueFileName
        } else {
          throw new ErrorUtils(500, 'File Upload Error', 'Failed to upload document')
        }
      }

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
        ...parsedData,
        abbreviation,
        last_reform: lastReformDate,
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
