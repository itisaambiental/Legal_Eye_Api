import AspectsService from '../services/aspects/Aspects.service.js'
import ErrorUtils from '../utils/Error.js'
import UserService from '../services/users/User.service.js'

/**
 * Creates a new aspect.
 * @function createAspect
 * @param {Object} req - Request object, expects { subjectId, aspectName } in body.
 * @param {Object} res - Response object.
 * @returns {Object} - The created aspect data.
 * @throws {ErrorUtils} - If the process fails.
 */
export const createAspect = async (req, res) => {
  const { userId } = req
  const { aspectName } = req.body
  const { subjectId } = req.params
  if (!subjectId || !aspectName) {
    return res.status(400).json({ message: 'Missing required fields: subjectId and/or aspectName' })
  }
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const aspect = await AspectsService.create({ subjectId, aspectName })
    return res.status(201).json({ aspect })
  } catch (error) {
    if (error instanceof ErrorUtils) {
      return res.status(error.status).json({
        message: error.message,
        ...(error.errors && { errors: error.errors })
      })
    }
    return res.status(500).json({ message: 'Failed to create aspect' })
  }
}

/**
 * Retrieves all aspects associated with a specific subject.
 * @function getAspectsBySubject
 * @param {Object} req - Request object, expects { subjectId } as URL parameter.
 * @param {Object} res - Response object.
 * @returns {Array} - List of aspects associated with the subject.
 * @throws {ErrorUtils} - If the process fails.
 */
export const getAspectsBySubject = async (req, res) => {
  const { userId } = req
  const { subjectId } = req.params
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const aspects = await AspectsService.getBySubjectId(subjectId)
    return res.status(200).json({ aspects })
  } catch (error) {
    if (error instanceof ErrorUtils) {
      return res.status(error.status).json({
        message: error.message,
        ...(error.errors && { errors: error.errors })
      })
    }
    return res.status(500).json({ message: 'Failed to fetch aspects' })
  }
}

/**
 * Retrieves an aspect by ID.
 * @function getAspectById
 * @param {Object} req - Request object, expects { id } as URL parameter.
 * @param {Object} res - Response object.
 * @returns {Object} - The aspect data.
 * @throws {ErrorUtils} - If the process fails.
 */
export const getAspectById = async (req, res) => {
  const { userId } = req
  const { id } = req.params
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const aspect = await AspectsService.getById(id)
    return res.status(200).json({ aspect })
  } catch (error) {
    if (error instanceof ErrorUtils) {
      return res.status(error.status).json({
        message: error.message,
        ...(error.errors && { errors: error.errors })
      })
    }
    return res.status(500).json({ message: 'Failed to fetch aspect' })
  }
}

/**
 * Updates an aspect by ID.
 * @function updateAspect
 * @param {Object} req - Request object, expects { aspectName } in body and { id } as URL parameter.
 * @param {Object} res - Response object.
 * @returns {Object} - The updated aspect data.
 * @throws {ErrorUtils} - If the process fails.
 */
export const updateAspect = async (req, res) => {
  const { userId } = req
  const { id } = req.params
  const { aspectName } = req.body
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    if (!aspectName) {
      return res.status(400).json({ message: 'Missing required field: aspectName' })
    }
    const updatedAspect = await AspectsService.updateById(id, aspectName)
    return res.status(200).json({ updatedAspect })
  } catch (error) {
    if (error instanceof ErrorUtils) {
      return res.status(error.status).json({
        message: error.message,
        ...(error.errors && { errors: error.errors })
      })
    }
    return res.status(500).json({ message: 'Failed to update aspect' })
  }
}

/**
 * Deletes an aspect by ID.
 * @function deleteAspect
 * @param {Object} req - Request object, expects { id } as URL parameter.
 * @param {Object} res - Response object.
 * @returns {Object} - The result of the deletion operation.
 * @throws {ErrorUtils} - If the process fails.
 */
export const deleteAspect = async (req, res) => {
  const { userId } = req
  const { id } = req.params
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    await AspectsService.deleteById(id)
    return res.sendStatus(204)
  } catch (error) {
    if (error instanceof ErrorUtils) {
      return res.status(error.status).json({
        message: error.message,
        ...(error.errors && { errors: error.errors })
      })
    }
    return res.status(500).json({ message: 'Failed to delete aspect' })
  }
}

/**
 * Delete multiple aspects using an array of IDs.
 * @function deleteAspectsBatch
 * @param {Object} req - Request object, expects { aspectIds } in body.
 * @param {Object} res - Response object.
 * @throws {ErrorUtils} - Throws an instance of ErrorUtils error if the process fails.
 */
export const deleteAspectsBatch = async (req, res) => {
  const { aspectIds } = req.body
  const { userId } = req
  if (!aspectIds || !Array.isArray(aspectIds) || aspectIds.length === 0) {
    return res.status(400).json({
      message: 'Missing required fields: aspectIds'
    })
  }
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const result = await AspectsService.deleteAspectsBatch(aspectIds)
    if (result.success) {
      return res.sendStatus(204)
    } else {
      return res.status(404).json({ message: result.message })
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
