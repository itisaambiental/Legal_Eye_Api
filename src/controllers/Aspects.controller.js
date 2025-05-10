import AspectsService from '../services/aspects/Aspects.service.js'
import HttpException from '../utils/HttpException.js'
import UserService from '../services/users/User.service.js'

/**
 * Controller for Aspects operations.
 * @module AspectsController
 */

/**
 * Creates a new aspect.
 * @function createAspect
 * @param {import('express').Request} req - Request object, expects { aspectName, abbreviation, orderIndex } in body and { subjectId } in params.
 * @param {import('express').Response} res - Response object.
 * @returns {Object} - The created aspect data.
 */
export const createAspect = async (req, res) => {
  const { userId } = req
  const { aspectName, abbreviation, orderIndex } = req.body
  const { subjectId } = req.params
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const aspect = await AspectsService.create({
      subjectId,
      aspectName,
      abbreviation,
      orderIndex
    })
    return res.status(201).json({ aspect })
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
 * Retrieves all aspects associated with a specific subject.
 * @function getAspectsBySubject
 * @param {import('express').Request} req - Request object, expects { subjectId } as URL parameter.
 * @param {import('express').Response} res - Response object.
 * @returns {Array} - List of aspects associated with the subject.
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
 * Retrieves an aspect by ID.
 * @function getAspectById
 * @param {import('express').Request} req - Request object, expects { id } as URL parameter.
 * @param {import('express').Response} res - Response object.
 * @returns {Object} - The aspect data.
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
 * Retrieves aspects by name for a specific subject.
 * @function getAspectsByName
 * @param {import('express').Request} req - Request object, expects `aspectName` in query parameters and `subjectId` in URL parameters.
 * @param {import('express').Response} res - Response object.
 * @returns {Array} - An array of aspects matching the criteria or an empty array if none found.
 */
export const getAspectsByName = async (req, res) => {
  const { userId } = req
  const { subjectId } = req.params
  const { aspectName } = req.query
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const aspects = await AspectsService.getByName(aspectName, subjectId)
    return res.status(200).json({ aspects })
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
 * Updates an aspect by ID.
 * @function updateAspect
 * @param {import('express').Request} req - Request object, expects { aspectName, abbreviation, orderIndex } in body and { id } as URL parameter.
 * @param {import('express').Response} res - Response object.
 * @returns {Object} - The updated aspect data.
 */
export const updateAspect = async (req, res) => {
  const { userId } = req
  const { id } = req.params
  const { aspectName, abbreviation, orderIndex } = req.body
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const aspect = await AspectsService.updateById(id, {
      aspectName,
      abbreviation,
      orderIndex
    })
    return res.status(200).json({ aspect })
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
 * Deletes an aspect by ID.
 * @function deleteAspect
 * @param {import('express').Request} req - Request object, expects { id } as URL parameter.
 * @param {import('express').Response} res - Response object.
 * @returns {void}
 */
export const deleteAspect = async (req, res) => {
  const { userId } = req
  const { id } = req.params
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const { success } = await AspectsService.deleteById(id)
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
 * Deletes multiple aspects using an array of IDs.
 * @function deleteAspectsBatch
 * @param {import('express').Request} req - Request object, expects { aspectIds } in body.
 * @param {import('express').Response} res - Response object.
 * @returns {void}
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
    const { success } = await AspectsService.deleteAspectsBatch(aspectIds)
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
