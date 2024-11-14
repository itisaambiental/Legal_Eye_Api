import ArticlesService from '../services/articles/ArticlesService.js'
import ErrorUtils from '../utils/Error.js'
/**
 * Controller for Articles operations.
 * @module ArticlesController
 */
/**
 * Retrieves the status of a job by its ID.
 * @param {Object} req - Request object, expects jobId in req.params.
 * @param {Object} res - Response object.
 * @returns {Object} - The job status or error details.
 */
export const getStatusArticlesJobs = async (req, res) => {
  const { id } = req.params
  if (!id) {
    return res.status(400).json({ message: 'jobId is required' })
  }
  try {
    const jobStatus = await ArticlesService.getStatusArticlesJobs(id)
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
