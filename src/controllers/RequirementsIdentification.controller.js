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
