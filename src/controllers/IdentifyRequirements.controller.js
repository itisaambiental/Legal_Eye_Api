/**
 * Controller module for Identify Requirements.
 * Handles API requests related to Identify Requirements records.
 */

import IdentifyRequirementsService from '../services/requirements/IdentifyRequirements.service.js'
import UserService from '../services/users/User.service.js'
import ErrorUtils from '../utils/Error.js'

/**
 * Starts a new requirements identification for selected legal bases and associated requirements.
 * @function startIdentifyRequirements
 * @param {import('express').Request} req - The request object containing the selected legal basis IDs.
 * @param {import('express').Response} res - The response object.
 * @returns {number} - The ID of the created job.
 */
export const startIdentifyRequirements = async (req, res) => {
  const { userId } = req
  const { legalBasisIds, subjectId, aspectsIds, intelligenceLevel } = req.body
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const jobId = await IdentifyRequirementsService.startIdentify({ legalBasisIds, subjectId, aspectsIds, intelligenceLevel }, userId)
    return res.status(201).json({ jobId })
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
