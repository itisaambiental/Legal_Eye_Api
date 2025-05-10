import HttpException from '../utils/HttpException.js'
import UserService from '../services/users/User.service.js'
import SendLegalBasisService from '../services/legalBasis/sendLegalBasis/sendLegalBasis.service.js'

/**
 * Controller for Send Legal Basis Jobs operations.
 * @module SendLegalBasisController
 */

/**
 * Sends selected legal basis records to ACM Suite.
 * @function sendLegalBasis
 * @param {import('express').Request} req - Request object, expects { legalBasisIds } in body.
 * @param {import('express').Response} res - Response object.
 * @returns {Object} - Job information for processing the sending task.
 */
export const sendLegalBasis = async (req, res) => {
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
    const { jobId } = await SendLegalBasisService.sendLegalBasis(
      userId,
      legalBasisIds
    )
    return res.status(201).json({ jobId })
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
 * Retrieves the status of a send legal basis job by its ID.
 * @function getSendLegalBasisJobStatus
 * @param {import('express').Request} req - Request object, expects jobId in req.params.
 * @param {import('express').Response} res - Response object.
 * @returns {Object} - The job status or error details.
 */
export const getSendLegalBasisJobStatus = async (req, res) => {
  const { userId } = req
  const { jobId } = req.params
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const jobStatus = await SendLegalBasisService.getSendLegalBasisJobStatus(
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
