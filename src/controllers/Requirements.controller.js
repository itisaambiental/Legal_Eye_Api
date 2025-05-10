import RequirementService from '../services/requirements/Requirements.service.js'
import UserService from '../services/users/User.service.js'
import HttpException from '../utils/HttpException.js'

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
    aspectsIds,
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
    specifyEvidence,
    periodicity
  } = req.body
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const requirement = await RequirementService.create({
      subjectId,
      aspectsIds,
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
      specifyEvidence,
      periodicity
    })
    return res.status(201).json({ requirement })
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
    if (error instanceof HttpException) {
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
    if (error instanceof HttpException) {
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
    if (error instanceof HttpException) {
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
    if (error instanceof HttpException) {
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
    if (error instanceof HttpException) {
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
  const { aspectIds } = req.query
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const aspects = Array.isArray(aspectIds)
      ? aspectIds.map(Number).filter(Number.isInteger)
      : typeof aspectIds === 'string'
        ? aspectIds.split(',').map(Number).filter(Number.isInteger)
        : []
    const requirements = await RequirementService.getBySubjectAndAspects(
      subjectId,
      aspects
    )
    return res.status(200).json({ requirements })
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
 * Retrieves requirements by a flexible full-text match in their mandatory description.
 * @function getRequirementsByMandatoryDescription
 * @param {import('express').Request} req - Request object, expects { description } in query.
 * @param {import('express').Response} res - Response object.
 * @returns {Array<Object>} - A list of requirements matching the description.
 */
export const getRequirementsByMandatoryDescription = async (req, res) => {
  const { userId } = req
  const { description } = req.query
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const requirements = await RequirementService.getByMandatoryDescription(
      description
    )
    return res.status(200).json({ requirements })
  } catch (error) {
    if (error instanceof HttpException) {
      return res.status(error.status).json({ message: error.message })
    }
    return res.status(500).json({ message: 'Internal Server Error' })
  }
}

/**
 * Retrieves requirements by a flexible full-text match in their complementary description.
 * @function getRequirementsByComplementaryDescription
 * @param {import('express').Request} req - Request object, expects { description } in query.
 * @param {import('express').Response} res - Response object.
 * @returns {Array<Object>} - A list of requirements matching the complementary description.
 */
export const getRequirementsByComplementaryDescription = async (req, res) => {
  const { userId } = req
  const { description } = req.query
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const requirements = await RequirementService.getByComplementaryDescription(
      description
    )
    return res.status(200).json({ requirements })
  } catch (error) {
    if (error instanceof HttpException) {
      return res.status(error.status).json({ message: error.message })
    }
    return res.status(500).json({ message: 'Internal Server Error' })
  }
}

/**
 * Retrieves requirements by a flexible full-text match in their mandatory sentences.
 * @function getRequirementsByMandatorySentences
 * @param {import('express').Request} req - Request object, expects { sentence } in query.
 * @param {import('express').Response} res - Response object.
 * @returns {Array<Object>} - A list of requirements matching the mandatory sentence.
 */
export const getRequirementsByMandatorySentences = async (req, res) => {
  const { userId } = req
  const { sentence } = req.query
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const requirements = await RequirementService.getByMandatorySentences(
      sentence
    )
    return res.status(200).json({ requirements })
  } catch (error) {
    if (error instanceof HttpException) {
      return res.status(error.status).json({ message: error.message })
    }
    return res.status(500).json({ message: 'Internal Server Error' })
  }
}

/**
 * Retrieves requirements by a flexible full-text match in their complementary sentences.
 * @function getRequirementsByComplementarySentences
 * @param {import('express').Request} req - Request object, expects { sentence } in query.
 * @param {import('express').Response} res - Response object.
 * @returns {Array<Object>} - A list of requirements matching the complementary sentence.
 */
export const getRequirementsByComplementarySentences = async (req, res) => {
  const { userId } = req
  const { sentence } = req.query
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const requirements = await RequirementService.getByComplementarySentences(
      sentence
    )
    return res.status(200).json({ requirements })
  } catch (error) {
    if (error instanceof HttpException) {
      return res.status(error.status).json({ message: error.message })
    }
    return res.status(500).json({ message: 'Internal Server Error' })
  }
}

/**
 * Retrieves requirements by a flexible full-text match in their mandatory keywords.
 * @function getRequirementsByMandatoryKeywords
 * @param {import('express').Request} req - Request object, expects { keyword } in query.
 * @param {import('express').Response} res - Response object.
 * @returns {Array<Object>} - A list of requirements matching the mandatory keyword.
 */
export const getRequirementsByMandatoryKeywords = async (req, res) => {
  const { userId } = req
  const { keyword } = req.query
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const requirements = await RequirementService.getByMandatoryKeywords(
      keyword
    )
    return res.status(200).json({ requirements })
  } catch (error) {
    if (error instanceof HttpException) {
      return res.status(error.status).json({ message: error.message })
    }
    return res.status(500).json({ message: 'Internal Server Error' })
  }
}

/**
 * Retrieves requirements by a flexible full-text match in their complementary keywords.
 * @function getRequirementsByComplementaryKeywords
 * @param {import('express').Request} req - Request object, expects { keyword } in query.
 * @param {import('express').Response} res - Response object.
 * @returns {Array<Object>} - A list of requirements matching the complementary keyword.
 */
export const getRequirementsByComplementaryKeywords = async (req, res) => {
  const { userId } = req
  const { keyword } = req.query
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const requirements = await RequirementService.getByComplementaryKeywords(
      keyword
    )
    return res.status(200).json({ requirements })
  } catch (error) {
    if (error instanceof HttpException) {
      return res.status(error.status).json({ message: error.message })
    }
    return res.status(500).json({ message: 'Internal Server Error' })
  }
}

/**
 * Retrieves requirements filtered by a specific condition.
 * @function getRequirementsByCondition
 * @param {import('express').Request} req - Request object, expects { condition } in query.
 * @param {import('express').Response} res - Response object.
 * @returns {Array<Object>} - A list of requirements matching the condition.
 */
export const getRequirementsByCondition = async (req, res) => {
  const { userId } = req
  const { condition } = req.query
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const requirements = await RequirementService.getByCondition(condition)
    return res.status(200).json({ requirements })
  } catch (error) {
    if (error instanceof HttpException) {
      return res.status(error.status).json({ message: error.message })
    }
    return res.status(500).json({ message: 'Internal Server Error' })
  }
}

/**
 * Retrieves requirements filtered by a specific evidence type.
 * @function getRequirementsByEvidence
 * @param {import('express').Request} req - Request object, expects { evidence } in query.
 * @param {import('express').Response} res - Response object.
 * @returns {Array<Object>} - A list of requirements matching the evidence type.
 */
export const getRequirementsByEvidence = async (req, res) => {
  const { userId } = req
  const { evidence } = req.query
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const requirements = await RequirementService.getByEvidence(evidence)
    return res.status(200).json({ requirements })
  } catch (error) {
    if (error instanceof HttpException) {
      return res.status(error.status).json({ message: error.message })
    }
    return res.status(500).json({ message: 'Internal Server Error' })
  }
}

/**
 * Retrieves requirements filtered by a specific periodicity.
 * @function getRequirementsByPeriodicity
 * @param {import('express').Request} req - Request object, expects { periodicity } in query.
 * @param {import('express').Response} res - Response object.
 * @returns {Array<Object>} - A list of requirements matching the periodicity.
 */
export const getRequirementsByPeriodicity = async (req, res) => {
  const { userId } = req
  const { periodicity } = req.query
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const requirements = await RequirementService.getByPeriodicity(periodicity)
    return res.status(200).json({ requirements })
  } catch (error) {
    if (error instanceof HttpException) {
      return res.status(error.status).json({ message: error.message })
    }
    return res.status(500).json({ message: 'Internal Server Error' })
  }
}

/**
 * Updates an existing requirement by its ID.
 * @function updateRequirementById
 * @param {import('express').Request} req - Request object, expects { id } in params and updated requirement fields in body.
 * @param {import('express').Response} res - Response object.
 * @returns {Object} - The updated requirement data.
 */
export const updateRequirement = async (req, res) => {
  const { userId } = req
  const { id } = req.params
  const {
    subjectId,
    aspectsIds,
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
    specifyEvidence,
    periodicity
  } = req.body
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const requirement = await RequirementService.updateById(id, {
      subjectId,
      aspectsIds,
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
      specifyEvidence,
      periodicity
    })
    return res.status(200).json({ requirement })
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
 * Deletes a requirement by ID.
 * @function deleteRequirement
 * @param {import('express').Request} req - Request object, expects { id } in params.
 * @param {import('express').Response} res - Response object.
 * @returns {void}
 */
export const deleteRequirement = async (req, res) => {
  const { userId } = req
  const { id } = req.params
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const { success } = await RequirementService.deleteById(id)
    if (success) {
      return res.sendStatus(204)
    } else {
      return res.status(500).json({ message: 'Internal Server Error' })
    }
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
 * Deletes multiple requirements by their IDs.
 * @function deleteRequirementBatch
 * @param {import('express').Request} req - Request object, expects { requirementIds } in body.
 * @param {import('express').Response} res - Response object.
 * @returns {void}
 */
export const deleteRequirementBatch = async (req, res) => {
  const { userId } = req
  const { requirementIds } = req.body
  if (
    !requirementIds ||
    !Array.isArray(requirementIds) ||
    requirementIds.length === 0
  ) {
    return res.status(400).json({
      message: 'Missing required fields: requirementIds'
    })
  }
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const { success } = await RequirementService.deleteBatch(requirementIds)
    if (success) {
      return res.sendStatus(204)
    } else {
      return res.status(500).json({ message: 'Internal Server Error' })
    }
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
