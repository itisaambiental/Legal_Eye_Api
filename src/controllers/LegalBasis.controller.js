import LegalBasisService from '../services/legalBasis/LegalBasis.service.js'
import ErrorUtils from '../utils/Error.js'
import UserService from '../services/users/User.service.js'
import validateDate from '../validations/dateValidation.js'
/**
 * Controller for legal basis operations.
 * @module LegalBasisController
 */

/**
 * Creates a new legal basis record.
 * @function createLegalBasis
 * @param {Object} req - Request object, expects { legalName, abbreviation, subjectId, aspectsIds, classification, jurisdiction, state, municipality, lastReform, extractArticles } in body, and 'document' as a file.
 * @param {Object} res - Response object.
 * @returns {Object} - The jobId and the created legalBasis data.
 * @throws {ErrorUtils} - Throws an instance of ErrorUtils error if the process fails.
 */
export const createLegalBasis = async (req, res) => {
  const { userId } = req
  const { legalName, abbreviation, subjectId, aspectsIds, classification, jurisdiction, state, municipality, lastReform, extractArticles } = req.body
  const document = req.file
  if (!legalName || !abbreviation || !subjectId || !aspectsIds || !classification || !jurisdiction || !lastReform || !extractArticles) {
    return res.status(400).json({
      message: 'Missing required fields: legalName, abbreviation, subjectId, aspectsIds (non-empty array), classification, jurisdiction, lastReform, extractArticles'
    })
  }
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const { jobId, legalBasis } = await LegalBasisService.create(
      { legalName, abbreviation, subjectId, aspectsIds, classification, jurisdiction, state, municipality, lastReform, extractArticles },
      document
    )
    return res.status(201).json({ jobId, legalBasis })
  } catch (error) {
    if (error instanceof ErrorUtils) {
      return res.status(error.status).json({
        message: error.message,
        ...(error.errors && { errors: error.errors })
      })
    }
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
    const { userId } = req
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
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
  const { userId } = req
  const { id } = req.params
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
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
 * Retrieves legal basis by their name.
 * @function getLegalBasisByName
 * @param {Object} req - Request object, expects { name } in params.
 * @param {Object} res - Response object.
 * @returns {Object} - The legal basis data.
 * @throws {ErrorUtils} - Throws an instance of ErrorUtils if retrieval fails.
 */
export const getLegalBasisByName = async (req, res) => {
  const { userId } = req
  const { name } = req.query
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
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
  const { userId } = req
  const { abbreviation } = req.query
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
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
  const { userId } = req
  const { classification } = req.query
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
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
  const { userId } = req
  const { jurisdiction } = req.query
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
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
 * Retrieves legal basis entries by state.
 * @function getLegalBasisByState
 * @param {Object} req - Request object, expects { state } in query parameters.
 * @param {Object} res - Response object.
 * @returns {Object} - A list of filtered legal basis entries.
 * @throws {ErrorUtils} - Throws an instance of ErrorUtils if the process fails.
 */
export const getLegalBasisByState = async (req, res) => {
  const { userId } = req
  const { state } = req.query
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const legalBasis = await LegalBasisService.getByState(state)
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
 * Retrieves legal basis entries by state and municipalities.
 * @function getLegalBasisByStateAndMunicipalities
 * @param {Object} req - Request object, expects { state, municipalities } in query parameters.
 * @param {Object} res - Response object.
 * @returns {Object} - A list of filtered legal basis entries.
 * @throws {ErrorUtils} - Throws an instance of ErrorUtils if the process fails.
 */
export const getLegalBasisByStateAndMunicipalities = async (req, res) => {
  const { userId } = req
  const { state } = req.query
  let { municipalities } = req.query
  if (municipalities && municipalities.length > 0 && !state) {
    return res.status(400).json({
      message: 'State is required if municipalities are provided'
    })
  }
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    municipalities = Array.isArray(municipalities)
      ? municipalities.map(municipality => String(municipality).trim()).filter(municipality => municipality.length > 0)
      : typeof municipalities === 'string'
        ? municipalities.split(',').map(municipality => String(municipality).trim()).filter(municipality => municipality.length > 0)
        : []
    const legalBasis = await LegalBasisService.getByStateAndMunicipalities(state, municipalities)
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
 * Retrieves legal basis entries filtered by subject.
 * @function getLegalBasisBySubject
 * @param {Object} req - Request object, expects { subjectId } in query parameters.
 * @param {Object} res - Response object.
 * @returns {Object} - A list of filtered legal basis entries by subject.
 * @throws {ErrorUtils} - Throws an instance of ErrorUtils if the process fails.
 */
export const getLegalBasisBySubject = async (req, res) => {
  const { userId } = req
  const { subjectId } = req.params
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const legalBasis = await LegalBasisService.getBySubject(subjectId)
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
 * Retrieves legal basis entries filtered by subject and optionally by aspects.
 * @function getLegalBasisBySubjectAndAspects
 * @param {Object} req - Request object, expects { subjectId, aspectIds } in query parameters.
 * @param {Object} res - Response object.
 * @returns {Object} - A list of filtered legal basis entries by subject and aspects.
 * @throws {ErrorUtils} - Throws an instance of ErrorUtils if the process fails.
 */
export const getLegalBasisBySubjectAndAspects = async (req, res) => {
  const { userId } = req
  let { subjectId, aspectIds } = req.query
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    aspectIds = Array.isArray(aspectIds)
      ? aspectIds.map(id => Number(id)).filter(id => !isNaN(id))
      : typeof aspectIds === 'string'
        ? aspectIds.split(',').map(id => Number(id)).filter(id => !isNaN(id))
        : []
    const legalBasis = await LegalBasisService.getBySubjectAndAspects(subjectId, aspectIds)
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
 * Retrieves legal basis entries filtered by a date range for the last_reform.
 * @function getLegalBasisByLastReform
 * @param {Object} req - Request object, expects { from, to } in query parameters.
 * @param {Object} res - Response object.
 * @returns {Object} - A list of filtered legal basis entries by date range.
 */
export const getLegalBasisByLastReform = async (req, res) => {
  const { userId } = req
  const { from, to } = req.query
  const errors = []
  if (!from && !to) {
    errors.push(
      { field: 'from', message: 'At least one of "from" or "to" must be provided' },
      { field: 'to', message: 'At least one of "from" or "to" must be provided' }
    )
  } else if (!from) {
    errors.push({ field: 'from', message: 'The "from" date must be provided when "to" is specified' })
  } else if (!to) {
    errors.push({ field: 'to', message: 'The "to" date must be provided when "from" is specified' })
  }
  if (errors.length > 0) {
    return res.status(400).json({ message: 'Validation failed', errors })
  }
  const { date: parsedFrom, error: fromError } = from ? validateDate(from, 'from') : {}
  const { date: parsedTo, error: toError } = to ? validateDate(to, 'to') : {}

  if (fromError) errors.push(fromError)
  if (toError) errors.push(toError)
  if (errors.length > 0) {
    return res.status(400).json({ message: 'Validation failed', errors })
  }
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const legalBasis = await LegalBasisService.getByLastReform(parsedFrom, parsedTo)
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
 * Updates a legal basis record.
 * @function updateLegalBasis
 * @param {Object} req - Request object, expects { id } in params and { legalName, abbreviation, subjectId, aspectsIds, classification, jurisdiction, state, municipality, lastReform, extractArticles, removeDocument } in body and an optional 'document' file.
 * @param {Object} res - Response object.
 * @throws {ErrorUtils} - Throws an instance of ErrorUtils error if the process fails.
 */
export const updateLegalBasis = async (req, res) => {
  const { id } = req.params
  const { userId } = req
  const { legalName, abbreviation, subjectId, aspectsIds, classification, jurisdiction, state, municipality, lastReform, extractArticles, removeDocument } = req.body
  const document = req.file
  if (!id) {
    return res.status(400).json({
      message: 'Missing required parameter: id'
    })
  }
  if (!legalName && !abbreviation && !subjectId && !aspectsIds && !classification && !jurisdiction && !state && !municipality && !lastReform && !extractArticles && !removeDocument && !document) {
    return res.status(400).json({
      message: 'Missing required fields: legalName, abbreviation, subjectId, aspectsIds, classification, jurisdiction, state, municipality, lastReform, extractArticles, removeDocument, or document'
    })
  }
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const { jobId, legalBasis } = await LegalBasisService.updateById(
      id,
      { legalName, abbreviation, subjectId, aspectsIds, classification, jurisdiction, state, municipality, lastReform, extractArticles, removeDocument },
      document
    )
    return res.status(200).json({
      jobId,
      legalBasis
    })
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
 * Deletes a Legal Base by ID.
 * @function deleteLegalBasis
 * @param {Object} req - Request object, expects { id } in params.
 * @param {Object} res - Response object.
 * @returns {Object} - The result of the deletion operation.
 * @throws {ErrorUtils} - If the process fails.
 */
export const deleteLegalBasis = async (req, res) => {
  const { userId } = req
  const { id } = req.params
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const { success } = await LegalBasisService.deleteById(id)
    if (success) {
      return res.sendStatus(204)
    } else {
      return res.status(500).json({ message: 'Internal Server Error' })
    }
  } catch (error) {
    if (error instanceof ErrorUtils) {
      return res.status(error.status).json({
        message: error.message,
        ...(error.errors && { errors: error.errors })
      })
    }
    return res.status(500).json({ message: 'Failed to delete legal basis by ID' })
  }
}

/**
 * Deletes a Legal Base by ID.
 * @function deleteLegalBasisBatch
 * @param {Object} req - Request object, expects { legalBasisIds } in body.
 * @param {Object} res - Response object.
 * @returns {Object} - The result of the deletion operation.
 * @throws {ErrorUtils} - If the process fails.
 */
export const deleteLegalBasisBatch = async (req, res) => {
  const { userId } = req
  const { legalBasisIds } = req.body
  if (!legalBasisIds || !Array.isArray(legalBasisIds) || legalBasisIds.length === 0) {
    return res.status(400).json({
      message: 'Missing required fields: legalBasisIds'
    })
  }
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const { success } = await LegalBasisService.deleteBatch(legalBasisIds)
    if (success) {
      return res.sendStatus(204)
    } else {
      return res.status(500).json({ message: 'Internal Server Error' })
    }
  } catch (error) {
    if (error instanceof ErrorUtils) {
      return res.status(error.status).json({
        message: error.message,
        ...(error.errors && { errors: error.errors })
      })
    }
    return res.status(500).json({ message: 'Failed to delete legal basis by ID' })
  }
}

/**
 * Retrieves all unique classification values.
 * @function getClassifications
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @returns {Object} - Returns a JSON object containing an array of unique classifications.
 * @throws {ErrorUtils} - If an error occurs during retrieval, an ErrorUtils instance is thrown.
 */
export const getClassifications = async (req, res) => {
  const { userId } = req
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const classifications = await LegalBasisService.getClassifications()
    return res.status(200).json({ classifications })
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
 * Retrieves all unique jurisdiction values.
 * @function getJurisdictions
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @returns {Object} - Returns a JSON object containing an array of unique jurisdictions.
 * @throws {ErrorUtils} - If an error occurs during retrieval, an ErrorUtils instance is thrown.
 */
export const getJurisdictions = async (req, res) => {
  const { userId } = req
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const jurisdictions = await LegalBasisService.getJurisdictions()
    return res.status(200).json({ jurisdictions })
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
