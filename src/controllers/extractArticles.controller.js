import ErrorUtils from '../utils/Error.js'
import UserService from '../services/users/User.service.js'
import extractArticlesService from '../services/articles/extractArticles/extractArticles.service.js'

/**
 * Controller for extract Articles Jobs operations.
 * @module extractArticlesController
 */

/**
 * Retrieves the status of a job by its ID.
 * @function getStatusJob
 * @param {import('express').Request} req - Request object, expects jobId in req.params.
 * @param {import('express').Response} res - Response object.
 * @returns {Object} - The job status or error details.
 */
export const getStatusJob = async (req, res) => {
  const { userId } = req
  const { jobId } = req.params
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const jobStatus = await extractArticlesService.getStatusJob(jobId)
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
 * Checks if there are pending jobs for a given legalBasisId.
 * @function checkLegalBasisJobs
 * @param {import('express').Request} req - Request object, expects legalBasisId in req.params and userId in req.
 * @param {import('express').Response} res - Response object.
 * @returns {Object} - Response with job status and jobId or error details.
 */
export const checkLegalBasisJobs = async (req, res) => {
  const { userId } = req
  const { legalBasisId } = req.params
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const { hasPendingJobs, jobId } = await extractArticlesService.hasPendingJobs(legalBasisId)
    return res.status(200).json({ hasPendingJobs, jobId })
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
 * Cancels a job by its ID.
 * @function cancelJob
 * @param {import('express').Request} req - Request object, expects jobId in req.params and userId in req.
 * @param {import('express').Response} res - Response object.
 * @returns {Object} - Response indicating success or failure of the job cancellation.
 */
export const cancelJob = async (req, res) => {
  const { userId } = req
  const { jobId } = req.params
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const success = await extractArticlesService.cancelJob(jobId)
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
