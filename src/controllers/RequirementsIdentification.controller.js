/**
 * Controller module for Requirements Identification.
 * Handles API requests related to Requirements Identification records.
 */

import RequirementsIdentificationService from '../services/requirements/requirementIdentification/RequirementsIdentification.service.js'
import UserService from '../services/users/User.service.js'
import ErrorUtils from '../utils/Error.js'

/**
 * Starts a new requirements identification for selected legal bases and associated requirements.
 * @function startRequirementsIdentification
 * @param {import('express').Request} req - The request object containing the selected legal basis IDs.
 * @param {import('express').Response} res - The response object.
 * @returns {Object} - An object containing the ID of the created job.
 */
export const startRequirementsIdentification = async (req, res) => {
  const { userId } = req
  const { legalBasisIds, subjectId, aspectsIds, intelligenceLevel } = req.body
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const jobId = await RequirementsIdentificationService.startRequirementsIdentification(
      { legalBasisIds, subjectId, aspectsIds, intelligenceLevel },
      userId
    )
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
