import LegalBasisService from '../services/legalBasis/LegalBasis.service.js'
import ErrorUtils from '../utils/Error.js'
import legalBasis from '../queues/legalBasisQueue.js'
/**
 * Controller for legal basis operations.
 * @module LegalBasisController
 */

/**
 * Creates a new legal basis record.
 * @function createLegalBasis
 * @param {Object} req - Request object, expects { legalName, classification, jurisdiction, state, municipality, lastReform } in body, and 'document' as a file.
 * @param {Object} res - Response object.
 * @returns {Object} - The task ID for the created legal basis data.
 */
export const createLegalBasis = async (req, res) => {
  const { legalName, subject, aspects, classification, jurisdiction, state, municipality, lastReform } = req.body
  const document = req.file

  if (!legalName || !subject || !aspects || !classification || !jurisdiction || !lastReform || !document) {
    return res.status(400).json({
      message: 'Missing required fields: legalName, classification, jurisdiction, lastReform, document'
    })
  }

  try {
    const job = await legalBasis.add({
      legalName,
      subject,
      aspects,
      classification,
      jurisdiction,
      state,
      municipality,
      lastReform,
      document
    })
    return res.status(201).json({ taskId: job.id })
  } catch (error) {
    return res.status(500).json({ message: 'Error initializing legal basis creation' })
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
    return res.status(200).json({ legalBasis })
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
    return res.status(200).json({ legalBasis })
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
    return res.status(200).json({ legalBasis })
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
    return res.status(200).json({ legalBasis })
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
    return res.status(200).json({ legalBasis })
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

/**
 * Retrieves legal basis entries by jurisdiction.
 * @function getLegalBasisByJurisdiction
 * @param {Object} req - Request object, expects { jurisdiction } as a route parameter.
 * @param {Object} res - Response object.
 * @returns {Object} - A list of filtered legal basis entries.
 * @throws {ErrorUtils} - Throws an instance of ErrorUtils if the process fails.
 */
export const getLegalBasisByJurisdiction = async (req, res) => {
  const { jurisdiction } = req.params
  try {
    const legalBasis = await LegalBasisService.getByJurisdiction(jurisdiction)
    return res.status(200).json({ legalBasis })
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

/**
 * Retrieves legal basis entries by state and municipality.
 * @function getLegalBasisByStateAndMunicipality
 * @param {Object} req - Request object, expects { state, municipality } in query parameters.
 * @param {Object} res - Response object.
 * @returns {Object} - A list of filtered legal basis entries.
 * @throws {ErrorUtils} - Throws an instance of ErrorUtils if the process fails.
 */
export const getLegalBasisByStateAndMunicipality = async (req, res) => {
  const { state, municipality } = req.query
  try {
    const legalBasis = await LegalBasisService.getByStateAndMunicipality({ state, municipality })
    return res.status(200).json({ legalBasis })
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
