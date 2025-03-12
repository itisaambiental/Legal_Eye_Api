import RequirementsIdentificationService from '../services/requirements/requirementsIdentification/requirementsIdentification.service.js'
import UserService from '../services/users/User.service.js'
import ErrorUtils from '../utils/Error.js'

/**
 * Controller for Requirements Identification Jobs operations.
 * @module RequirementsIdentificationController
 */

/**
 * Starts a requirements identification job.
 * @function startIdentification
 * @param {import('express').Request} req - Request object, expects { identificationName, identificationDescription, legalBasisIds, subjectId, aspectIds, intelligenceLevel } in req.body.
 * @param {import('express').Response} res - Response object.
 * @returns {Object} - The jobId and the created requirementsIdentification data.
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
    const { jobId, requirementsIdentificationId } =
      await RequirementsIdentificationService.startIdentification(
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
    const jobStatus =
      await RequirementsIdentificationService.getIdentificationJobStatus(jobId)

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
    const success =
      await RequirementsIdentificationService.cancelIdentificationJob(jobId)
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
 * Retrieves all requirements identifications.
 * @function getAllIdentifications
 * @param {import('express').Request} req - Request object.
 * @param {import('express').Response} res - Response object.
 * @returns {Object} - A list of all requirements identifications or an error message.
 */
export const getAllIdentifications = async (req, res) => {
  const { userId } = req
  try {
    // Verifica que el usuario esté autorizado
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }

    // Obtiene todas las identificaciones de requisitos
    const identifications = await RequirementsIdentificationService.getAllIdentifications()

    return res.status(200).json(identifications)
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
    const identifications = await RequirementsIdentificationService.findByName(identificationName)
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
 */
export const getIdentificationsByDescription = async (req, res) => {
  const { userId } = req
  const { identificationDescription } = req.query
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const identifications = await RequirementsIdentificationService.findByDescription(identificationDescription)
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
 */
export const getIdentificationsByStatus = async (req, res) => {
  const { userId } = req
  const { status } = req.query
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const identifications = await RequirementsIdentificationService.findByStatus(status)
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
 */
export const getIdentificationsByUserId = async (req, res) => {
  const { userId } = req
  const { targetUserId } = req.query
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const identifications = await RequirementsIdentificationService.findByUserId(targetUserId)
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
 */
export const getIdentificationsByCreatedAt = async (req, res) => {
  const { userId } = req
  const { createdAt } = req.query
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const identifications = await RequirementsIdentificationService.findByCreatedAt(createdAt)
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
 * @param {import('express').Request} req - Request object, expects { identificationName, identificationDescription } in req.body and { identificationId } in req.params.
 * @param {import('express').Response} res - Response object.
 * @returns {Object} - The updated identification data or an error message.
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
 * @returns {Object} - Response indicating success or failure of the deletion.
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
    return res.status(204).send() // No Content
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
 * @returns {Object} - Response indicating success or failure of the batch deletion.
 */
export const deleteBatchIdentifications = async (req, res) => {
  const { userId } = req
  const { identificationIds } = req.body
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    if (!Array.isArray(identificationIds) || identificationIds.length === 0) {
      return res.status(400).json({ message: 'Invalid request: identificationIds must be a non-empty array' })
    }
    await RequirementsIdentificationService.deleteBatch(identificationIds)
    return res.status(204).send() // No Content
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
