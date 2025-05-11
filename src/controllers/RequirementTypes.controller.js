import RequirementTypesService from '../services/requirementTypes/RequirementTypes.service.js'
import UserService from '../services/users/User.service.js'
import HttpException from '../services/errors/HttpException.js'

/**
 * Controller for requirement types operations.
 * @module RequirementTypesController
 */

/**
 * Creates a new requirement type.
 * @function createRequirementType
 * @param {import('express').Request} req - Request object, expects { name, description, classification } in body.
 * @param {import('express').Response} res - Response object.
 * @returns {Object} - The created requirement type data.
 */
export const createRequirementType = async (req, res) => {
  const { userId } = req
  const { name, description, classification } = req.body
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const requirementType = await RequirementTypesService.create({
      name,
      description,
      classification
    })
    return res.status(201).json({ requirementType })
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
 * Retrieves all requirement types.
 * @function getRequirementTypes
 * @param {import('express').Request} req - Request object.
 * @param {import('express').Response} res - Response object.
 * @returns {Object} - Object of all requirement types.
 */
export const getRequirementTypes = async (req, res) => {
  const { userId } = req
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const requirementTypes = await RequirementTypesService.getAll()
    return res.status(200).json({ requirementTypes })
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
 * Retrieves a requirement type by ID.
 * @function getRequirementTypeById
 * @param {import('express').Request} req - Request object, expects { id } as URL parameter.
 * @param {import('express').Response} res - Response object.
 * @returns {Object} - The requirement type data.
 */
export const getRequirementTypeById = async (req, res) => {
  const { userId } = req
  const { id } = req.params
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const requirementType = await RequirementTypesService.getById(id)
    return res.status(200).json({ requirementType })
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
 * Retrieves requirement types by name (partial or full match).
 * @function getRequirementTypesByName
 * @param {import('express').Request} req - Request object, expects `name` in query parameters.
 * @param {import('express').Response} res - Response object.
 * @returns {Object} - Object of matching requirement types.
 */
export const getRequirementTypesByName = async (req, res) => {
  const { userId } = req
  const { name } = req.query
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const requirementTypes = await RequirementTypesService.getByName(name)
    return res.status(200).json({ requirementTypes })
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
 * Retrieves requirement types by description (partial or full match).
 * @function getRequirementTypesByDescription
 * @param {import('express').Request} req - Request object, expects `description` in query parameters.
 * @param {import('express').Response} res - Response object.
 * @returns {Object} - Object of matching requirement types.
 */
export const getRequirementTypesByDescription = async (req, res) => {
  const { userId } = req
  const { description } = req.query
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const requirementTypes = await RequirementTypesService.getByDescription(
      description
    )
    return res.status(200).json({ requirementTypes })
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
 * Retrieves requirement types by classification (partial or full match).
 * @function getRequirementTypesByClassification
 * @param {import('express').Request} req - Request object, expects `classification` in query parameters.
 * @param {import('express').Response} res - Response object.
 * @returns {Array} - Array of matching requirement types.
 */
export const getRequirementTypesByClassification = async (req, res) => {
  const { userId } = req
  const { classification } = req.query
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const requirementTypes = await RequirementTypesService.getByClassification(
      classification
    )
    return res.status(200).json({ requirementTypes })
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
 * Updates a requirement type by ID.
 * @function updateRequirementType
 * @param {import('express').Request} req - Request object, expects { id } as URL parameter and { name, description, classification } in body.
 * @param {import('express').Response} res - Response object.
 * @returns {Object} - The updated requirement type data.
 */
export const updateRequirementType = async (req, res) => {
  const { userId } = req
  const { id } = req.params
  const { name, description, classification } = req.body
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const requirementType = await RequirementTypesService.updateById(id, {
      name,
      description,
      classification
    })
    return res.status(200).json({ requirementType })
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
 * Deletes a requirement type by ID.
 * @function deleteRequirementType
 * @param {import('express').Request} req - Request object, expects { id } as URL parameter.
 * @param {import('express').Response} res - Response object.
 * @returns {void}
 */
export const deleteRequirementType = async (req, res) => {
  const { userId } = req
  const { id } = req.params
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const { success } = await RequirementTypesService.deleteById(id)
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
    return res
      .status(500)
      .json({ message: 'Failed to delete requirement type' })
  }
}

/**
 * Deletes multiple requirement types by array of IDs.
 * @function deleteRequirementTypesBatch
 * @param {import('express').Request} req - Request object, expects { ids } in body.
 * @param {import('express').Response} res - Response object.
 * @returns {void}
 */
export const deleteRequirementTypesBatch = async (req, res) => {
  const { userId } = req
  const { requirementTypesIds } = req.body
  if (
    !requirementTypesIds ||
    !Array.isArray(requirementTypesIds) ||
    requirementTypesIds.length === 0
  ) {
    return res.status(400).json({ message: 'Missing required field: requirementTypesIds' })
  }
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const { success } = await RequirementTypesService.deleteBatch(
      requirementTypesIds
    )
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
