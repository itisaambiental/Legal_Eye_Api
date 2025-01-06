import ErrorUtils from '../utils/Error.js'
import UserService from '../services/users/User.service.js'
import WorkerService from '../services/worker/Worker.service.js'

/**
 * Controller for Articles Jobs operations.
 * @module ArticlesWorkerController
 */

/**
 * Retrieves the status of a job by its ID.
 * @param {Object} req - Request object, expects jobId in req.params.
 * @param {Object} res - Response object.
 * @returns {Object} - The job status or error details.
 */
export const getStatusJob = async (req, res) => {
  const { userId } = req
  const { id } = req.params
  if (!id) {
    return res.status(400).json({ message: 'jobId is required' })
  }
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const jobStatus = await WorkerService.getStatusJob(id)
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
 * @param {Object} req - Request object, expects legalBasisId in req.params and userId in req.
 * @param {Object} res - Response object.
 * @returns {Object} - Response with job status and jobId or error details.
 */
export const checkLegalBasisJobs = async (req, res) => {
  const { userId } = req
  const { legalBasisId } = req.params

  if (!legalBasisId) {
    return res.status(400).json({ message: 'legalBasisId is required' })
  }
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const { hasPendingJobs, jobId } = await WorkerService.hasPendingJobs(legalBasisId)
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
