import RequirementsIdentificationService from '../services/requirements/requirementsIdentification/requirementsIdentification.service.js'
import UserService from '../services/users/User.service.js'
import ErrorUtils from '../utils/Error.js'
import validateDate from '../utils/validateDate.js'

/**
 * Controller module for Requirements Identification operations.
 * Handles API requests for creating, retrieving, updating, and deleting requirements identifications.
 * @module RequirementsIdentificationController
 */
/**
 * Starts a requirements identification job.
 * @function startIdentification
 * @param {import('express').Request} req - Request object, expects { identificationName, identificationDescription, legalBasisIds, subjectId, aspectIds, intelligenceLevel } in req.body.
 * @param {import('express').Response} res - Response object.
 * @returns {Object} - The jobId and the created requirementsIdentificationId.
 */
export const startIdentification = async (req, res) => {
  const { userId } = req
  const {
    identificationName,
    identificationDescription,
    legalBasisIds,
    subjectId,
    aspectIds,
    intelligenceLevel
  } = req.body
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const { jobId, requirementsIdentificationId } = await RequirementsIdentificationService.startIdentification(
      {
        identificationName,
        identificationDescription,
        legalBasisIds,
        subjectId,
        aspectIds,
        intelligenceLevel
      },
      userId
    )
    return res.status(201).json({ jobId, requirementsIdentificationId })
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
 * Retrieves the status of a requirements identification job by its ID.
 * @function getIdentificationJobStatus
 * @param {import('express').Request} req - Request object, expects jobId in req.params.
 * @param {import('express').Response} res - Response object.
 * @returns {Object} - The job status or error details.
 */
export const getIdentificationJobStatus = async (req, res) => {
  const { userId } = req
  const { jobId } = req.params
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const jobStatus = await RequirementsIdentificationService.getIdentificationJobStatus(jobId)
    return res.status(jobStatus.status).json(jobStatus.data)
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
 * Cancels a requirements identification job by its ID.
 * @function cancelIdentificationJob
 * @param {import('express').Request} req - Request object, expects jobId in req.params and userId in req.
 * @param {import('express').Response} res - Response object.
 * @returns {Object} - Response indicating success or failure of the job cancellation.
 */
export const cancelIdentificationJob = async (req, res) => {
  const { userId } = req
  const { jobId } = req.params

  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const success = await RequirementsIdentificationService.cancelIdentificationJob(jobId)
    if (success) {
      return res.sendStatus(204)
    }
    return res.status(500).json({ message: 'Internal Server Error' })
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
 * Retrieves a single requirements identification by its ID.
 * @function getIdentificationById
 * @param {import('express').Request} req - Request object, expects { identificationId } in req.params.
 * @param {import('express').Response} res - Response object.
 * @returns {Object} - The identification data or an error message.
 */
export const getIdentificationById = async (req, res) => {
  const { userId } = req
  const { identificationId } = req.params

  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const identification = await RequirementsIdentificationService.getById(Number(identificationId))
    return res.status(200).json({ identification })
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
 * Retrieves all requirements identifications.
 * @function getAllIdentifications
 * @param {import('express').Request} req - Request object.
 * @param {import('express').Response} res - Response object.
 * @returns {Object} - A list of all requirements identifications or an error message.
 */
export const getAllIdentifications = async (req, res) => {
  const { userId } = req

  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const identifications = await RequirementsIdentificationService.getAllIdentifications()
    return res.status(200).json({ identifications })
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
 * Retrieves requirements identifications filtered by name.
 * @function getIdentificationsByName
 * @param {import('express').Request} req - Request object, expects { identificationName } in query.
 * @param {import('express').Response} res - Response object.
 * @returns {Object} - The list of identifications matching the name.
 */
export const getIdentificationsByName = async (req, res) => {
  const { userId } = req
  const { identificationName } = req.query

  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const identifications = await RequirementsIdentificationService.getByName(identificationName)
    return res.status(200).json({ identifications })
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
 * Retrieves requirements identifications filtered by description.
 * @function getIdentificationsByDescription
 * @param {import('express').Request} req - Request object, expects { identificationDescription } in query.
 * @param {import('express').Response} res - Response object.
 * @returns {Object} - The list of identifications matching the description.
 */
export const getIdentificationsByDescription = async (req, res) => {
  const { userId } = req
  const { identificationDescription } = req.query

  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const identifications = await RequirementsIdentificationService.getByDescription(identificationDescription)
    return res.status(200).json({ identifications })
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
 * Retrieves requirements identifications filtered by status.
 * @function getIdentificationsByStatus
 * @param {import('express').Request} req - Request object, expects { status } in query.
 * @param {import('express').Response} res - Response object.
 * @returns {Object} - The list of identifications matching the status.
 */
export const getIdentificationsByStatus = async (req, res) => {
  const { userId } = req
  const { status } = req.query
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const identifications = await RequirementsIdentificationService.getByStatus(status)
    return res.status(200).json({ identifications })
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
 * Retrieves requirements identifications filtered by user ID.
 * @function getIdentificationsByUserId
 * @param {import('express').Request} req - Request object, expects { targetUserId } in query.
 * @param {import('express').Response} res - Response object.
 * @returns {Object} - The list of identifications matching the user ID.
 */
export const getIdentificationsByUserId = async (req, res) => {
  const { userId } = req
  const { targetUserId } = req.query
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const identifications = await RequirementsIdentificationService.getByUserId(targetUserId)
    return res.status(200).json({ identifications })
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
 * Retrieves requirements identifications filtered by creation date.
 * @function getIdentificationsByCreatedAt
 * @param {import('express').Request} req - Request object, expects { createdAt } in query.
 * @param {import('express').Response} res - Response object.
 * @returns {Object} - The list of identifications matching the creation date.
 */
export const getIdentificationsByCreatedAt = async (req, res) => {
  const { userId } = req
  const { from, to } = req.query
  const { date: parsedFrom, error: fromError } = from ? validateDate(from, 'from') : { date: null, error: null }
  const { date: parsedTo, error: toError } = to ? validateDate(to, 'to') : { date: null, error: null }
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
    const identifications = await RequirementsIdentificationService.getByCreatedAt(
      parsedFrom,
      parsedTo
    )
    return res.status(200).json({ identifications })
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
 * Updates an existing requirements identification entry.
 * @function updateIdentificationById
 * @param {import('express').Request} req - Request object, expects { identificationName, identificationDescription } in body and { identificationId } in params.
 * @param {import('express').Response} res - Response object.
 * @returns {Object} - The updated identification data.
 */
export const updateIdentificationById = async (req, res) => {
  const { userId } = req
  const { identificationId } = req.params
  const { identificationName, identificationDescription } = req.body
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const updatedIdentification = await RequirementsIdentificationService.updateById(
      identificationId,
      { identificationName, identificationDescription }
    )
    return res.status(200).json({ updatedIdentification })
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
 * Deletes a requirements identification by its ID.
 * @function deleteIdentificationById
 * @param {import('express').Request} req - Request object, expects { identificationId } in params.
 * @param {import('express').Response} res - Response object.
 * @returns {Object} - Empty response indicating success.
 */
export const deleteIdentificationById = async (req, res) => {
  const { userId } = req
  const { identificationId } = req.params
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    await RequirementsIdentificationService.deleteById(identificationId)
    return res.status(204).send()
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
 * Deletes multiple requirements identifications by their IDs.
 * @function deleteBatchIdentifications
 * @param {import('express').Request} req - Request object, expects { identificationIds } in body as an array.
 * @param {import('express').Response} res - Response object.
 * @returns {Object} - Empty response indicating success.
 */
export const deleteBatchIdentifications = async (req, res) => {
  const { userId } = req
  const { identificationIds } = req.body
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    if (
      !identificationIds ||
      !Array.isArray(identificationIds) ||
      identificationIds.length === 0
    ) {
      return res.status(400).json({
        message: 'Missing required fields: identificationIds'
      })
    }
    await RequirementsIdentificationService.deleteBatch(identificationIds)
    return res.status(204).send()
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
