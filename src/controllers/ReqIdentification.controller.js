import ReqIdentificationService from '../services/reqIdentification/ReqIdentification.service.js'
import HttpException from '../services/errors/HttpException.js'
import UserService from '../services/users/User.service.js'
import parseDate from '../utils/parseDate.js'

/**
 * Controller for requirement identifications operations.
 * @module ReqIdentificationController
*/

/**
 * Creates a new requirement identification.
 * @function createReqIdentification
 * @param {import('express').Request} req - Request object, expects { reqIdentificationName, reqIdentificationDescription, legalBasisIds, intelligenceLevel } in body and userId in request.
 * @param {import('express').Response} res - Response object.
 * @returns {Object} - The created requirement identification data.
 */
export const createReqIdentification = async (req, res) => {
  const { userId } = req
  const { reqIdentificationName, reqIdentificationDescription, legalBasisIds, intelligenceLevel } = req.body
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const { reqIdentificationId, jobId } = await ReqIdentificationService.create(userId, {
      reqIdentificationName,
      reqIdentificationDescription,
      legalBasisIds,
      intelligenceLevel
    })
    return res.status(201).json({ reqIdentificationId, jobId })
  } catch (error) {
    if (error instanceof HttpException) {
      return res.status(error.status).json({
        message: error.message,
        ...(error.errors && { errors: error.errors })
      })
    }
    return res.status(500).json({ message: 'Internal Server Error' })
  }
}

/**
 * Retrieves all requirement identifications.
 * @function getAllReqIdentifications
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export const getAllReqIdentifications = async (req, res) => {
  const { userId } = req
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const reqIdentifications = await ReqIdentificationService.getAll()
    return res.status(200).json({ reqIdentifications })
  } catch (error) {
    if (error instanceof HttpException) {
      return res.status(error.status).json({
        message: error.message,
        ...(error.errors && { errors: error.errors })
      })
    }
    return res.status(500).json({ message: 'Internal Server Error' })
  }
}

/**
 * Retrieves a single requirement identification by its ID.
 * @function getReqIdentificationById
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export const getReqIdentificationById = async (req, res) => {
  const { userId } = req
  const { id } = req.params

  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const reqIdentification = await ReqIdentificationService.getById(id)
    return res.status(200).json({ reqIdentification })
  } catch (error) {
    if (error instanceof HttpException) {
      return res.status(error.status).json({
        message: error.message,
        ...(error.errors && { errors: error.errors })
      })
    }
    return res.status(500).json({ message: 'Internal Server Error' })
  }
}

/**
 * Retrieves requirement identifications by matching name (partial match).
 * @function getReqIdentificationsByName
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export const getReqIdentificationsByName = async (req, res) => {
  const { userId } = req
  const { name } = req.query

  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const reqIdentifications = await ReqIdentificationService.getByName(name)
    return res.status(200).json({ reqIdentifications })
  } catch (error) {
    if (error instanceof HttpException) {
      return res.status(error.status).json({
        message: error.message,
        ...(error.errors && { errors: error.errors })
      })
    }
    return res.status(500).json({ message: 'Internal Server Error' })
  }
}

/**
 * Retrieves requirement identifications by matching description (full-text search).
 * @function getReqIdentificationsByDescription
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export const getReqIdentificationsByDescription = async (req, res) => {
  const { userId } = req
  const { description } = req.query

  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const reqIdentifications = await ReqIdentificationService.getByDescription(description)
    return res.status(200).json({ reqIdentifications })
  } catch (error) {
    if (error instanceof HttpException) {
      return res.status(error.status).json({
        message: error.message,
        ...(error.errors && { errors: error.errors })
      })
    }
    return res.status(500).json({ message: 'Internal Server Error' })
  }
}

/**
 * Retrieves requirement identifications by user ID.
 * @function getReqIdentificationsByUserId
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export const getReqIdentificationsByUserId = async (req, res) => {
  const { userId } = req
  const { id } = req.params

  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const reqIdentifications = await ReqIdentificationService.getByUserId(id)
    return res.status(200).json({ reqIdentifications })
  } catch (error) {
    if (error instanceof HttpException) {
      return res.status(error.status).json({
        message: error.message,
        ...(error.errors && { errors: error.errors })
      })
    }
    return res.status(500).json({ message: 'Internal Server Error' })
  }
}

/**
 * Retrieves requirement identifications filtered by a creation date range.
 * @function getReqIdentificationsByCreatedAt
 * @param {import('express').Request} req - Request object, expects { from, to } in query parameters.
 * @param {import('express').Response} res - Response object.
 */
export const getReqIdentificationsByCreatedAt = async (req, res) => {
  const { userId } = req
  const { from, to } = req.query

  const { date: parsedFrom, error: fromError } = from
    ? parseDate(from, 'from')
    : { date: null, error: null }

  const { date: parsedTo, error: toError } = to
    ? parseDate(to, 'to')
    : { date: null, error: null }

  if (fromError || toError) {
    return res.status(400).json({
      message: 'Invalid date format',
      errors: [fromError, toError].filter(Boolean)
    })
  }

  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }

    const reqIdentifications = await ReqIdentificationService.getByCreatedAt(parsedFrom, parsedTo)
    return res.status(200).json({ reqIdentifications })
  } catch (error) {
    if (error instanceof HttpException) {
      return res.status(error.status).json({
        message: error.message,
        ...(error.errors && { errors: error.errors })
      })
    }
    return res.status(500).json({ message: 'Internal Server Error' })
  }
}

/**
 * Retrieves requirement identifications by status.
 * @function getReqIdentificationsByStatus
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export const getReqIdentificationsByStatus = async (req, res) => {
  const { userId } = req
  const { status } = req.query

  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const reqIdentifications = await ReqIdentificationService.getByStatus(status)
    return res.status(200).json({ reqIdentifications })
  } catch (error) {
    if (error instanceof HttpException) {
      return res.status(error.status).json({
        message: error.message,
        ...(error.errors && { errors: error.errors })
      })
    }
    return res.status(500).json({ message: 'Internal Server Error' })
  }
}

/**
 * Retrieves requirement identifications by subject ID.
 * @function getReqIdentificationsBySubjectId
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export const getReqIdentificationsBySubjectId = async (req, res) => {
  const { userId } = req
  const { subjectId } = req.params
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const reqIdentifications = await ReqIdentificationService.getBySubjectId(subjectId)
    return res.status(200).json({ reqIdentifications })
  } catch (error) {
    if (error instanceof HttpException) {
      return res.status(error.status).json({
        message: error.message,
        ...(error.errors && { errors: error.errors })
      })
    }
    return res.status(500).json({ message: 'Internal Server Error' })
  }
}

/**
 * Retrieves requirement identifications by subject ID and aspect IDs.
 * @function getReqIdentificationsBySubjectAndAspects
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export const getReqIdentificationsBySubjectAndAspects = async (req, res) => {
  const { userId } = req
  const { subjectId } = req.params
  const { aspectIds } = req.query

  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const aspects = Array.isArray(aspectIds)
      ? aspectIds.map(Number).filter(Number.isInteger)
      : typeof aspectIds === 'string'
        ? aspectIds.split(',').map(Number).filter(Number.isInteger)
        : []

    const reqIdentifications = await ReqIdentificationService.getBySubjectAndAspects(
      subjectId,
      aspects
    )

    return res.status(200).json({ reqIdentifications })
  } catch (error) {
    if (error instanceof HttpException) {
      return res.status(error.status).json({
        message: error.message,
        ...(error.errors && { errors: error.errors })
      })
    }
    return res.status(500).json({ message: 'Internal Server Error' })
  }
}

/**
 * Retrieves requirement identifications by jurisdiction.
 * @function getReqIdentificationsByJurisdiction
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export const getReqIdentificationsByJurisdiction = async (req, res) => {
  const { userId } = req
  const { jurisdiction } = req.query
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const reqIdentifications = await ReqIdentificationService.getByJurisdiction(jurisdiction)
    return res.status(200).json({ reqIdentifications })
  } catch (error) {
    if (error instanceof HttpException) {
      return res.status(error.status).json({
        message: error.message,
        ...(error.errors && { errors: error.errors })
      })
    }
    return res.status(500).json({ message: 'Internal Server Error' })
  }
}

/**
 * Retrieves requirement identifications by state.
 * @function getReqIdentificationsByState
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export const getReqIdentificationsByState = async (req, res) => {
  const { userId } = req
  const { state } = req.query

  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const reqIdentifications = await ReqIdentificationService.getByState(state)
    return res.status(200).json({ reqIdentifications })
  } catch (error) {
    if (error instanceof HttpException) {
      return res.status(error.status).json({
        message: error.message,
        ...(error.errors && { errors: error.errors })
      })
    }
    return res.status(500).json({ message: 'Internal Server Error' })
  }
}

/**
 * Retrieves requirement identifications by state and municipalities.
 * @function getReqIdentificationsByStateAndMunicipalities
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export const getReqIdentificationsByStateAndMunicipalities = async (req, res) => {
  const { userId } = req
  const { state, municipalities } = req.query
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
    const municipalitiesList = Array.isArray(municipalities)
      ? municipalities
        .map((municipality) => String(municipality).trim())
        .filter((municipality) => municipality.length > 0)
      : typeof municipalities === 'string'
        ? municipalities
          .split(',')
          .map((municipality) => String(municipality).trim())
          .filter((municipality) => municipality.length > 0)
        : []
    const reqIdentifications = await ReqIdentificationService.getByStateAndMunicipalities(
      state,
      municipalitiesList
    )
    return res.status(200).json({ reqIdentifications })
  } catch (error) {
    if (error instanceof HttpException) {
      return res.status(error.status).json({
        message: error.message,
        ...(error.errors && { errors: error.errors })
      })
    }
    return res.status(500).json({ message: 'Internal Server Error' })
  }
}

/**
 * Updates a requirement identification.
 * @function updateReqIdentification
 * @param {import('express').Request} req - Request object, expects { id } as URL parameter and any of { reqIdentificationName, reqIdentificationDescription, newUserId } in body.
 * @param {import('express').Response} res - Response object.
 * @returns {Object} - The updated requirement identification data.
 */
export const updateReqIdentification = async (req, res) => {
  const { userId } = req
  const { id } = req.params
  const { reqIdentificationName, reqIdentificationDescription, newUserId } = req.body
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const reqIdentification = await ReqIdentificationService.update(id, {
      reqIdentificationName,
      reqIdentificationDescription,
      newUserId
    })
    return res.status(200).json({ reqIdentification })
  } catch (error) {
    if (error instanceof HttpException) {
      return res.status(error.status).json({
        message: error.message,
        ...(error.errors && { errors: error.errors })
      })
    }
    return res.status(500).json({ message: 'Internal Server Error' })
  }
}

/**
 * Deletes a requirement identification by ID.
 * @function deleteReqIdentification
 * @param {import('express').Request} req - Request object, expects { id } as URL parameter.
 * @param {import('express').Response} res - Response object.
 * @returns {void}
 */
export const deleteReqIdentification = async (req, res) => {
  const { userId } = req
  const { id } = req.params
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const { success } = await ReqIdentificationService.deleteById(id)
    if (success) {
      return res.sendStatus(204)
    } else {
      return res.status(500).json({ message: 'Internal Server Error' })
    }
  } catch (error) {
    if (error instanceof HttpException) {
      return res.status(error.status).json({
        message: error.message,
        ...(error.errors && { errors: error.errors })
      })
    }
    return res.status(500).json({ message: 'Failed to delete requirement identification' })
  }
}

/**
 * Deletes multiple requirement identifications by array of IDs.
 * @function deleteReqIdentificationsBatch
 * @param {import('express').Request} req - Request object, expects { reqIdentificationIds } in body.
 * @param {import('express').Response} res - Response object.
 * @returns {void}
 */
export const deleteReqIdentificationsBatch = async (req, res) => {
  const { userId } = req
  const { reqIdentificationIds } = req.body
  if (
    !reqIdentificationIds ||
    !Array.isArray(reqIdentificationIds) ||
    reqIdentificationIds.length === 0
  ) {
    return res.status(400).json({ message: 'Missing required field: reqIdentificationIds' })
  }
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const { success } = await ReqIdentificationService.deleteBatch(
      reqIdentificationIds
    )
    if (success) {
      return res.sendStatus(204)
    } else {
      return res.status(500).json({ message: 'Internal Server Error' })
    }
  } catch (error) {
    if (error instanceof HttpException) {
      return res.status(error.status).json({
        message: error.message,
        ...(error.errors && { errors: error.errors })
      })
    }
    return res.status(500).json({ message: 'Internal Server Error' })
  }
}

/**
 * Associates a requirement to a requirement identification.
 * @function addRequirementToReqIdentification
 * @param {import('express').Request} req - Request expects { reqIdentificationId, requirementId } and body (requirementName, requirementTypeIds, legalVerbs)
 * @param {import('express').Response} res - Response object.
 */
export const addRequirementToReqIdentification = async (req, res) => {
  const { reqIdentificationId, requirementId } = req.params
  const { requirementName, requirementTypeIds, legalVerbs } = req.body
  try {
    const reqIdentificationRequirement = await ReqIdentificationService.addRequirementToReqIdentification(
      reqIdentificationId, requirementId,
      { requirementName, requirementTypeIds, legalVerbs }
    )
    return res.status(201).json({ reqIdentificationRequirement })
  } catch (error) {
    if (error instanceof HttpException) {
      return res.status(error.status).json({
        message: error.message,
        ...(error.errors && { errors: error.errors })
      })
    }
    return res.status(500).json({ message: 'Internal Server Error' })
  }
}

/**
 * Get all requirements associated with a requirements identification.
 * @function getAllRequirementsFromReqIdentification
 * @param {import('express').Request} req - Request expects { reqIdentificationId }
 * @param {import('express').Response} res - Response object.
 */
export const getAllRequirementsFromReqIdentification = async (req, res) => {
  const { reqIdentificationId } = req.params
  try {
    const reqIdentificationRequirements = await ReqIdentificationService.getAllRequirementsFromReqIdentification(
      reqIdentificationId
    )
    return res.status(201).json({ reqIdentificationRequirements })
  } catch (error) {
    if (error instanceof HttpException) {
      return res.status(error.status).json({
        message: error.message,
        ...(error.errors && { errors: error.errors })
      })
    }
    return res.status(500).json({ message: 'Internal Server Error' })
  }
}
