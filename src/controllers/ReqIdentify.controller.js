import HttpException from '../services/errors/HttpException.js'
import UserService from '../services/users/User.service.js'
import ReqIdentifyService from '../services/reqIdentification/reqIdentify/ReqIdentify.service.js'

/**
 * Controller for requirement identification job status operations.
 * @module ReqIdentifyController
 */

/**
 * Retrieves the status of a request identification job by its ID.
 * @function getReqIdentificationJobStatus
 * @param {import('express').Request} req - Request object, expects jobId in req.params.
 * @param {import('express').Response} res - Response object.
 * @returns {Object} - The job status or error details.
 */
export const getReqIdentificationJobStatus = async (req, res) => {
  const { userId } = req
  const { jobId } = req.params
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const jobStatus = await ReqIdentifyService.getReqIdentificationJobStatus(
      jobId
    )
    return res.status(jobStatus.status).json(jobStatus.data)
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
