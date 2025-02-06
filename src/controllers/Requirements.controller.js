import RequirementService from '../services/requirements/Requirements.service.js'
import UserService from '../services/users/User.service.js'
import ErrorUtils from '../utils/Error.js'

/**
 * Controller for requirement operations.
 * @module RequirementsController
 */

/**
 * Creates a new requirement.
 * @function createRequirement
 * @param {import('express').Request} req - Request object, expects requirement details in body.
 * @param {import('express').Response} res - Response object.
 * @returns {Object} - The created requirement data.
 */
export const createRequirement = async (req, res) => {
  const { userId } = req
  const {
    subjectId,
    aspectId,
    requirementNumber,
    requirementName,
    mandatoryDescription,
    complementaryDescription,
    mandatorySentences,
    complementarySentences,
    mandatoryKeywords,
    complementaryKeywords,
    condition,
    evidence,
    periodicity,
    specificDocument,
    requirementType,
    jurisdiction,
    state,
    municipality
  } = req.body
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const requirement = await RequirementService.create({
      subjectId,
      aspectId,
      requirementNumber,
      requirementName,
      mandatoryDescription,
      complementaryDescription,
      mandatorySentences,
      complementarySentences,
      mandatoryKeywords,
      complementaryKeywords,
      condition,
      evidence,
      periodicity,
      specificDocument,
      requirementType,
      jurisdiction,
      state,
      municipality
    })
    return res.status(201).json({ requirement })
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
 * Retrieves all requirements.
 * @function getAllRequirements
 * @param {import('express').Request} req - Request object.
 * @param {import('express').Response} res - Response object.
 * @returns {Array<Object>} - A list of requirements.
 */
export const getAllRequirements = async (req, res) => {
  const { userId } = req
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const requirements = await RequirementService.getAll()
    return res.status(200).json({ requirements })
  } catch (error) {
    if (error instanceof ErrorUtils) {
      return res.status(error.status).json({ message: error.message })
    }
    return res.status(500).json({ message: 'Internal Server Error' })
  }
}

/**
 * Retrieves a requirement by its ID.
 * @function getRequirementById
 * @param {import('express').Request} req - Request object, expects { id } in params.
 * @param {import('express').Response} res - Response object.
 * @returns {Object} - The retrieved requirement data.
 */
export const getRequirementById = async (req, res) => {
  const { userId } = req
  const { id } = req.params
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const requirement = await RequirementService.getById(id)
    return res.status(200).json({ requirement })
  } catch (error) {
    if (error instanceof ErrorUtils) {
      return res.status(error.status).json({ message: error.message })
    }
    return res.status(500).json({ message: 'Internal Server Error' })
  }
}

/**
 * Retrieves requirements by their requirement number or part of it.
 * @function getRequirementsByNumber
 * @param {import('express').Request} req - Request object, expects { number } in query.
 * @param {import('express').Response} res - Response object.
 * @returns {Array<Object>} - A list of matching requirements.
 */
export const getRequirementsByNumber = async (req, res) => {
  const { userId } = req
  const { number } = req.query
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const requirements = await RequirementService.getByNumber(number)
    return res.status(200).json({ requirements })
  } catch (error) {
    if (error instanceof ErrorUtils) {
      return res.status(error.status).json({ message: error.message })
    }
    return res.status(500).json({ message: 'Internal Server Error' })
  }
}

/**
 * Retrieves requirements by their name or part of it.
 * @function getRequirementsByName
 * @param {import('express').Request} req - Request object, expects { name } in query.
 * @param {import('express').Response} res - Response object.
 * @returns {Array<Object>} - A list of matching requirements.
 */
export const getRequirementsByName = async (req, res) => {
  const { userId } = req
  const { name } = req.query
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const requirements = await RequirementService.getByName(name)
    return res.status(200).json({ requirements })
  } catch (error) {
    if (error instanceof ErrorUtils) {
      return res.status(error.status).json({ message: error.message })
    }
    return res.status(500).json({ message: 'Internal Server Error' })
  }
}

/**
 * Retrieves requirements by subject.
 * @function getRequirementsBySubject
 * @param {import('express').Request} req - Request object, expects { subjectId } in params.
 * @param {import('express').Response} res - Response object.
 * @returns {Array<Object>} - A list of requirements filtered by subject.
 */
export const getRequirementsBySubject = async (req, res) => {
  const { userId } = req
  const { subjectId } = req.params
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const requirements = await RequirementService.getBySubject(subjectId)
    return res.status(200).json({ requirements })
  } catch (error) {
    if (error instanceof ErrorUtils) {
      return res.status(error.status).json({ message: error.message })
    }
    return res.status(500).json({ message: 'Internal Server Error' })
  }
}

/**
 * Retrieves requirements by subject and optionally by aspects.
 * @function getRequirementsBySubjectAndAspects
 * @param {import('express').Request} req - Request object, expects { subjectId } in params and { aspectIds } in query as an array.
 * @param {import('express').Response} res - Response object.
 * @returns {Array<Object>} - A list of requirements matching the filters.
 */
export const getRequirementsBySubjectAndAspects = async (req, res) => {
  const { userId } = req
  const { subjectId } = req.params
  let { aspectIds } = req.query
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    aspectIds = Array.isArray(aspectIds)
      ? aspectIds.map(Number).filter(Number.isInteger)
      : typeof aspectIds === 'string'
        ? aspectIds.split(',').map(Number).filter(Number.isInteger)
        : []
    const requirements = await RequirementService.getBySubjectAndAspects(subjectId, aspectIds)
    return res.status(200).json({ requirements })
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
