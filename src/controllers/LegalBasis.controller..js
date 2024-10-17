// controllers/LegalBasis.controller.js

import LegalBasisService from '../services/legalBasis/LegalBasis.service.js'
import ErrorUtils from '../utils/Error.js'

// Controller to create a new Legal Basis
export const createLegalBasis = async (req, res) => {
  const { legalName, classification, jurisdiction, state, municipality, lastReform } = req.body
  const document = req.file

  if (!legalName || !classification || !jurisdiction) {
    return res.status(400).json({
      message: 'Missing required fields: legalName, classification, jurisdiction'
    })
  }

  try {
    const legalBasis = await LegalBasisService.create({
      legalName,
      classification,
      jurisdiction,
      state,
      municipality,
      lastReform,
      document
    })

    return res.status(201).json(legalBasis)
  } catch (error) {
    if (error instanceof ErrorUtils) {
      return res.status(error.status).json({
        message: error.message,
        ...(error.errors && { errors: error.errors })
      })
    }
    return res.status(500).json({ message: 'Internal Server Error' })
  }
}
