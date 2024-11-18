import ErrorUtils from '../utils/Error.js'
import UserService from '../services/users/User.service.js'
import ArticlesWorkerService from '../services/articles/worker/ArticlesWorkerService.js'

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
    const jobStatus = await ArticlesWorkerService.getStatusJob(id)
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
