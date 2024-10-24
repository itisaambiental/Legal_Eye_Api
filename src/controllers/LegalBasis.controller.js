import LegalBasisService from '../services/legalBasis/LegalBasis.service.js'
import ErrorUtils from '../utils/Error.js'

/**
 * Controller for legal basis operations.
 * @module LegalBasisController
 */

/**
 * Creates a new legal basis record.
 * @function createLegalBasis
 * @param {Object} req - Request object, expects { legalName, classification, jurisdiction, state, municipality, lastReform } in body, and 'document' as a file.
 * @param {Object} res - Response object.
 * @returns {Object} - The created legal basis data.
 * @throws {ErrorUtils} - Throws an instance of ErrorUtils if the process fails.
 */
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
    return res.status(500).json({ message: 'Failed to create legal basis' })
  }
}

/**
 * Retrieves all legal basis records.
 * @function getAllLegalBasis
 * @param {Object} req - Request object.
 * @param {Object} res - Response object.
 * @returns {Array<Object>} - A list of legal basis entries.
 * @throws {ErrorUtils} - Throws an instance of ErrorUtils if retrieval fails.
 */
export const getAllLegalBasis = async (req, res) => {
  try {
    const legalBasis = await LegalBasisService.getAll()
    return res.status(200).json(legalBasis)
  } catch (error) {
    if (error instanceof ErrorUtils) {
      return res.status(error.status).json({
        message: error.message,
        ...(error.errors && { errors: error.errors })
      })
    }
    return res.status(500).json({ message: 'Failed to retrieve legal basis records' })
  }
}

/**
 * Retrieves a legal basis by its ID.
 * @function getLegalBasisById
 * @param {Object} req - Request object, expects { id } in params.
 * @param {Object} res - Response object.
 * @returns {Object} - The legal basis data.
 * @throws {ErrorUtils} - Throws an instance of ErrorUtils if retrieval fails.
 */
export const getLegalBasisById = async (req, res) => {
  const { id } = req.params

  try {
    const legalBasis = await LegalBasisService.getById(id)
    return res.status(200).json(legalBasis)
  } catch (error) {
    if (error instanceof ErrorUtils) {
      return res.status(error.status).json({
        message: error.message,
        ...(error.errors && { errors: error.errors })
      })
    }
    return res.status(500).json({ message: 'Failed to retrieve legal basis by ID' })
  }
}

/**
 * Retrieves a legal basis by its name.
 * @function getLegalBasisByName
 * @param {Object} req - Request object, expects { name } in params.
 * @param {Object} res - Response object.
 * @returns {Object} - The legal basis data.
 * @throws {ErrorUtils} - Throws an instance of ErrorUtils if retrieval fails.
 */
export const getLegalBasisByName = async (req, res) => {
  const { name } = req.params

  try {
    const legalBasis = await LegalBasisService.getByName(name)
    return res.status(200).json(legalBasis)
  } catch (error) {
    if (error instanceof ErrorUtils) {
      return res.status(error.status).json({
        message: error.message,
        ...(error.errors && { errors: error.errors })
      })
    }
    return res.status(500).json({ message: 'Failed to retrieve legal basis by name' })
  }
}

/**
 * Retrieves a legal basis by its abbreviation.
 * @function getLegalBasisByAbbreviation
 * @param {Object} req - Request object, expects { abbreviation } in params.
 * @param {Object} res - Response object.
 * @returns {Object} - The legal basis data.
 * @throws {ErrorUtils} - Throws an instance of ErrorUtils if retrieval fails.
 */
export const getLegalBasisByAbbreviation = async (req, res) => {
  const { abbreviation } = req.params

  try {
    const legalBasis = await LegalBasisService.getByAbbreviation(abbreviation)
    return res.status(200).json(legalBasis)
  } catch (error) {
    if (error instanceof ErrorUtils) {
      return res.status(error.status).json({
        message: error.message,
        ...(error.errors && { errors: error.errors })
      })
    }
    return res.status(500).json({ message: 'Failed to retrieve legal basis by abbreviation' })
  }
}

/**
 * Retrieves a legal basis by its classification.
 * @function getLegalBasisByClassification
 * @param {Object} req - Request object, expects { classification } in params.
 * @param {Object} res - Response object.
 * @returns {Object} - The legal basis data.
 * @throws {ErrorUtils} - Throws an instance of ErrorUtils if retrieval fails.
 */
export const getLegalBasisByClassification = async (req, res) => {
  const { classification } = req.params

  try {
    const legalBasis = await LegalBasisService.getByClassification(classification)
    return res.status(200).json(legalBasis)
  } catch (error) {
    if (error instanceof ErrorUtils) {
      return res.status(error.status).json({
        message: error.message,
        ...(error.errors && { errors: error.errors })
      })
    }
    return res.status(500).json({ message: 'Failed to retrieve legal basis by classification' })
  }
}
