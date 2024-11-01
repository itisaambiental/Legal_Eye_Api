import SubjectsService from '../services/subjects/Subjects.service.js'
import ErrorUtils from '../utils/Error.js'

/**
 * Creates a new subject.
 * @function createSubject
 * @param {Object} req - Request object, expects { subjectName } in body.
 * @param {Object} res - Response object.
 * @returns {Object} - The created subject data.
 * @throws {ErrorUtils} - If the process fails.
 */
export const createSubject = async (req, res) => {
  const { subjectName } = req.body
  if (!subjectName) {
    return res.status(400).json({ message: 'Missing required field: subjectName' })
  }
  try {
    const subject = await SubjectsService.create({ subjectName })
    return res.status(201).json(subject)
  } catch (error) {
    if (error instanceof ErrorUtils) {
      return res.status(error.status).json({
        message: error.message,
        ...(error.errors && { errors: error.errors })
      })
    }
    return res.status(500).json({ message: 'Failed to create subject' })
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
  try {
    const subjects = await SubjectsService.getAll()
    return res.status(200).json(subjects)
  } catch (error) {
    if (error instanceof ErrorUtils) {
      return res.status(error.status).json({
        message: error.message,
        ...(error.errors && { errors: error.errors })
      })
    }
    return res.status(500).json({ message: 'Failed to fetch subjects' })
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
  const { id } = req.params
  try {
    const subject = await SubjectsService.getById(id)
    return res.status(200).json(subject)
  } catch (error) {
    if (error instanceof ErrorUtils) {
      return res.status(error.status).json({
        message: error.message,
        ...(error.errors && { errors: error.errors })
      })
    }
    return res.status(500).json({ message: 'Failed to fetch subject' })
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
  const { id } = req.params
  const { subjectName } = req.body
  try {
    const updatedSubject = await SubjectsService.updateById(id, subjectName)
    return res.status(200).json({
      updatedSubject
    })
  } catch (error) {
    if (error instanceof ErrorUtils) {
      return res.status(error.status).json({
        message: error.message,
        ...(error.errors && { errors: error.errors })
      })
    }
    return res.status(500).json({ message: 'Failed to update subject' })
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
  const { id } = req.params
  try {
    await SubjectsService.deleteById(id)
    return res.sendStatus(204)
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
