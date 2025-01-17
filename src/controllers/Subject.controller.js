import SubjectsService from '../services/subjects/Subjects.service.js'
import ErrorUtils from '../utils/Error.js'
import UserService from '../services/users/User.service.js'

/**
 * Creates a new subject.
 * @function createSubject
 * @param {Object} req - Request object, expects { subjectName } in body.
 * @param {Object} res - Response object.
 * @returns {Object} - The created subject data.
 * @throws {ErrorUtils} - If the process fails.
 */
export const createSubject = async (req, res) => {
  const { userId } = req
  const { subjectName } = req.body
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const subject = await SubjectsService.create({ subjectName })
    return res.status(201).json({ subject })
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
 * Retrieves all subjects.
 * @function getSubjects
 * @param {Object} req - Request object.
 * @param {Object} res - Response object.
 * @returns {Array} - List of all subjects.
 * @throws {ErrorUtils} - If the process fails.
 */
export const getSubjects = async (req, res) => {
  const { userId } = req
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const subjects = await SubjectsService.getAll()
    return res.status(200).json({ subjects })
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
 * Retrieves a subject by ID.
 * @function getSubjectById
 * @param {Object} req - Request object, expects { id } as URL parameter.
 * @param {Object} res - Response object.
 * @returns {Object} - The subject data.
 * @throws {ErrorUtils} - If the process fails.
 */
export const getSubjectById = async (req, res) => {
  const { userId } = req
  const { id } = req.params
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const subject = await SubjectsService.getById(id)
    return res.status(200).json({ subject })
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
 * Retrieves subjects by name.
 * @function getSubjectsByName
 * @param {Object} req - Request object, expects `name` in the query parameters.
 * @param {Object} res - Response object.
 * @returns {Object} - The subjects data.
 * @throws {ErrorUtils} - If the process fails.
 */
export const getSubjectsByName = async (req, res) => {
  const { userId } = req
  const { name } = req.query
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const subjects = await SubjectsService.getByName(name)
    return res.status(200).json({ subjects })
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
 * Updates a subject by ID.
 * @function updateSubject
 * @param {Object} req - Request object, expects { subjectName } in body and { id } as URL parameter.
 * @param {Object} res - Response object.
 * @returns {Object} - The updated subject data.
 * @throws {ErrorUtils} - If the process fails.
 */
export const updateSubject = async (req, res) => {
  const { userId } = req
  const { id } = req.params
  const { subjectName } = req.body
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const updatedSubject = await SubjectsService.updateById(id, subjectName)
    return res.status(200).json({ updatedSubject })
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
 * Deletes a subject by ID.
 * @function deleteSubject
 * @param {Object} req - Request object, expects { id } as URL parameter.
 * @param {Object} res - Response object.
 * @returns {Object} - The result of the deletion operation.
 * @throws {ErrorUtils} - If the process fails.
 */
export const deleteSubject = async (req, res) => {
  const { userId } = req
  const { id } = req.params
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const { success } = await SubjectsService.deleteById(id)
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
    return res.status(500).json({ message: 'Failed to delete subject' })
  }
}

/**
 * Delete multiple subjects using an array of IDs.
 * @function deleteSubjectsBatch
 * @param {Object} req - Request object, expects { subjectIds } in body.
 * @param {Object} res - Response object.
 * @throws {ErrorUtils} - Throws an instance of ErrorUtils error if the process fails.
 */
export const deleteSubjectsBatch = async (req, res) => {
  const { subjectIds } = req.body
  const { userId } = req
  if (!subjectIds || !Array.isArray(subjectIds) || subjectIds.length === 0) {
    return res.status(400).json({
      message: 'Missing required fields: subjectIds'
    })
  }
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const { success } = await SubjectsService.deleteSubjectsBatch(subjectIds)
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
