import LegalBasisService from '../services/legalBasis/LegalBasis.service.js'
import ErrorUtils from '../utils/Error.js'
import UserService from '../services/users/User.service.js'
import validateDate from '../utils/validateDate.js'

/**
 * Controller for legal basis operations.
 * @module LegalBasisController
 */

/**
 * Creates a new legal basis record.
 * @function createLegalBasis
 * @param {import('express').Request} req - Request object, expects { legalName, abbreviation, subjectId, aspectsIds, classification, jurisdiction, state, municipality, lastReform, extractArticles } in body, and 'document' as a file.
 * @param {import('express').Response} res - Response object.
 * @returns {Object} - The jobId and the created legalBasis data.
 */
export const createLegalBasis = async (req, res) => {
  const { userId } = req
  const {
    legalName,
    abbreviation,
    subjectId,
    aspectsIds,
    classification,
    jurisdiction,
    state,
    municipality,
    lastReform,
    extractArticles
  } = req.body
  const document = req.file
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const { jobId, legalBasis } = await LegalBasisService.create(
      {
        legalName,
        abbreviation,
        subjectId,
        aspectsIds,
        classification,
        jurisdiction,
        state,
        municipality,
        lastReform,
        extractArticles
      },
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
    return res.status(500).json({ message: 'Internal Server Error' })
  }
}

/**
 * Retrieves all legal basis records.
 * @function getAllLegalBasis
 * @param {import('express').Request} req - Request object.
 * @param {import('express').Response} res - Response object.
 * @returns {Array<Object>} - A list of legal basis entries.
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
    return res.status(500).json({ message: 'Internal Server Error' })
  }
}

/**
 * Retrieves a legal basis by its ID.
 * @function getLegalBasisById
 * @param {import('express').Request} req - Request object, expects { id } in params.
 * @param {import('express').Response} res - Response object.
 * @returns {Object} - The legal basis data.
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
    return res.status(500).json({ message: 'Internal Server Error' })
  }
}

/**
 * Retrieves legal basis by their name.
 * @function getLegalBasisByName
 * @param {import('express').Request} req - Request object, expects { name } in params.
 * @param {import('express').Response} res - Response object.
 * @returns {Object} - The legal basis data.
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
    return res.status(500).json({ message: 'Internal Server Error' })
  }
}

/**
 * Retrieves a legal basis by its abbreviation.
 * @function getLegalBasisByAbbreviation
 * @param {import('express').Request} req - Request object, expects { abbreviation } in params.
 * @param {import('express').Response} res - Response object.
 * @returns {Object} - The legal basis data.
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
    return res.status(500).json({ message: 'Internal Server Error' })
  }
}

/**
 * Retrieves a legal basis by its classification.
 * @function getLegalBasisByClassification
 * @param {import('express').Request} req - Request object, expects { classification } in params.
 * @param {import('express').Response} res - Response object.
 * @returns {Object} - The legal basis data.
 */
export const getLegalBasisByClassification = async (req, res) => {
  const { userId } = req
  const { classification } = req.query
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const legalBasis = await LegalBasisService.getByClassification(
      classification
    )
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
 * Retrieves legal basis entries by jurisdiction.
 * @function getLegalBasisByJurisdiction
 * @param {import('express').Request} req - Request object, expects { jurisdiction } as a route parameter.
 * @param {import('express').Response} res - Response object.
 * @returns {Object} - A list of filtered legal basis entries.
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
 * @param {import('express').Request} req - Request object, expects { state } in query parameters.
 * @param {import('express').Response} res - Response object.
 * @returns {Object} - A list of filtered legal basis entries.
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
 * @param {import('express').Request} req - Request object, expects { state, municipalities } in query parameters.
 * @param {import('express').Response} res - Response object.
 * @returns {Object} - A list of filtered legal basis entries.
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
      ? municipalities
        .map((municipality) => String(municipality).trim())
        .filter((municipality) => municipality.length > 0)
      : typeof municipalities === 'string'
        ? municipalities
          .split(',')
          .map((municipality) => String(municipality).trim())
          .filter((municipality) => municipality.length > 0)
        : []
    const legalBasis = await LegalBasisService.getByStateAndMunicipalities(
      state,
      municipalities
    )
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
 * @param {import('express').Request} req - Request object, expects { subjectId } in query parameters.
 * @param {import('express').Response} res - Response object.
 * @returns {Object} - A list of filtered legal basis entries by subject.
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
 * @param {import('express').Request} req - Request object, expects { subjectId, aspectIds } in query parameters.
 * @param {import('express').Response} res - Response object.
 * @returns {Object} - A list of filtered legal basis entries by subject and aspects.
 */
export const getLegalBasisBySubjectAndAspects = async (req, res) => {
  const { userId } = req
  const { subjectId } = req.params
  let { aspectIds } = req.query
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    aspectIds = Array.isArray(aspectIds)
      ? aspectIds.map(Number).filter(Number.isInteger)
      : typeof aspectIds === 'string'
        ? aspectIds.split(',').map(Number).filter(Number.isInteger)
        : []
    const legalBasis = await LegalBasisService.getBySubjectAndAspects(
      subjectId,
      aspectIds
    )
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
 * @param {import('express').Request} req - Request object, expects { from, to } in query parameters.
 * @param {import('express').Response} res - Response object.
 * @returns {Object} - A list of filtered legal basis entries by date range.
 */
export const getLegalBasisByLastReform = async (req, res) => {
  const { userId } = req
  const { from, to } = req.query
  const errors = []
  if (!from && !to) {
    errors.push(
      {
        field: 'from',
        message: 'At least one of "from" or "to" must be provided'
      },
      {
        field: 'to',
        message: 'At least one of "from" or "to" must be provided'
      }
    )
  } else if (!from) {
    errors.push({
      field: 'from',
      message: 'The "from" date must be provided when "to" is specified'
    })
  } else if (!to) {
    errors.push({
      field: 'to',
      message: 'The "to" date must be provided when "from" is specified'
    })
  }
  if (errors.length > 0) {
    return res.status(400).json({ message: 'Validation failed', errors })
  }
  const { date: parsedFrom, error: fromError } = from
    ? validateDate(from, 'from')
    : {}
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
    const legalBasis = await LegalBasisService.getByLastReform(
      parsedFrom,
      parsedTo
    )
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
 * @param {import('express').Request} req - Request object, expects { id } in params and { legalName, abbreviation, subjectId, aspectsIds, classification, jurisdiction, state, municipality, lastReform, extractArticles, removeDocument } in body and an optional 'document' file.
 * @param {import('express').Response} res - Response object.
 * @returns {Object} - The updated legal basis record.
 */
export const updateLegalBasis = async (req, res) => {
  const { id } = req.params
  const { userId } = req
  const {
    legalName,
    abbreviation,
    subjectId,
    aspectsIds,
    classification,
    jurisdiction,
    state,
    municipality,
    lastReform,
    extractArticles,
    removeDocument
  } = req.body
  const document = req.file
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const { jobId, legalBasis } = await LegalBasisService.updateById(
      id,
      {
        legalName,
        abbreviation,
        subjectId,
        aspectsIds,
        classification,
        jurisdiction,
        state,
        municipality,
        lastReform,
        extractArticles,
        removeDocument
      },
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
 * Deletes a legal basis by ID.
 * @function deleteLegalBasis
 * @param {import('express').Request} req - Request object, expects { id } in params.
 * @param {import('express').Response} res - Response object.
 * @returns {void}
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
    return res.status(500).json({ message: 'Internal Server Error' })
  }
}

/**
 * Deletes multiple legal bases by their IDs.
 * @function deleteLegalBasisBatch
 * @param {import('express').Request} req - Request object, expects { legalBasisIds } in body.
 * @param {import('express').Response} res - Response object.
 * @returns {void}
 */
export const deleteLegalBasisBatch = async (req, res) => {
  const { userId } = req
  const { legalBasisIds } = req.body
  if (
    !legalBasisIds ||
    !Array.isArray(legalBasisIds) ||
    legalBasisIds.length === 0
  ) {
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
    return res.status(500).json({ message: 'Internal Server Error' })
  }
}

/**
 * Retrieves all unique classification values.
 * @function getClassifications
 * @param {import('express').Request} req - Request object.
 * @param {import('express').Response} res - Response object.
 * @returns {Object} - A JSON object containing an array of unique classifications.
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
 * @param {import('express').Request} req - Request object.
 * @param {import('express').Response} res - Response object.
 * @returns {Object} - A JSON object containing an array of unique jurisdictions.
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
