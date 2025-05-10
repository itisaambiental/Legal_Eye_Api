import LegalVerbsService from '../services/requirements/legalVerbs/legalVerbs.service.js'
import UserService from '../services/users/User.service.js'
import HttpException from '../utils/HttpException.js'

/**
 * Controller for legal verbs operations.
 * @module LegalVerbsController
 */

/**
 * Creates a new legal verb.
 * @function createLegalVerb
 * @param {import('express').Request} req - Request object, expects { name, description, translation } in body.
 * @param {import('express').Response} res - Response object.
 * @returns {Object} - The created legal verb data.
 */
export const createLegalVerb = async (req, res) => {
  const { userId } = req
  const { name, description, translation } = req.body
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const legalVerb = await LegalVerbsService.create({
      name,
      description,
      translation
    })
    return res.status(201).json({ legalVerb })
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
 * Retrieves all legal verbs.
 * @function getLegalVerbs
 * @param {import('express').Request} req - Request object.
 * @param {import('express').Response} res - Response object.
 * @returns {Object} - Object of all legal verbs.
 */
export const getLegalVerbs = async (req, res) => {
  const { userId } = req
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const legalVerbs = await LegalVerbsService.getAll()
    return res.status(200).json({ legalVerbs })
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
 * Retrieves a legal verb by ID.
 * @function getLegalVerbById
 * @param {import('express').Request} req - Request object, expects { id } as URL parameter.
 * @param {import('express').Response} res - Response object.
 * @returns {Object} - The legal verb data.
 */
export const getLegalVerbById = async (req, res) => {
  const { userId } = req
  const { id } = req.params
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const legalVerb = await LegalVerbsService.getById(id)
    return res.status(200).json({ legalVerb })
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
 * Retrieves legal verbs by name (partial or full match).
 * @function getLegalVerbsByName
 * @param {import('express').Request} req - Request object, expects `name` in query parameters.
 * @param {import('express').Response} res - Response object.
 * @returns {Object} - Object of matching legal verbs.
 */
export const getLegalVerbsByName = async (req, res) => {
  const { userId } = req
  const { name } = req.query
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const legalVerbs = await LegalVerbsService.getByName(name)
    return res.status(200).json({ legalVerbs })
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
 * Retrieves legal verbs by description (partial or full match).
 * @function getLegalVerbsByDescription
 * @param {import('express').Request} req - Request object, expects `description` in query parameters.
 * @param {import('express').Response} res - Response object.
 * @returns {Object} - Object of matching legal verbs.
 */
export const getLegalVerbsByDescription = async (req, res) => {
  const { userId } = req
  const { description } = req.query
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const legalVerbs = await LegalVerbsService.getByDescription(description)
    return res.status(200).json({ legalVerbs })
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
 * Retrieves legal verbs by translation (partial or full match).
 * @function getLegalVerbsByTranslation
 * @param {import('express').Request} req - Request object, expects `translation` in query parameters.
 * @param {import('express').Response} res - Response object.
 * @returns {Object} - Object of matching legal verbs.
 */
export const getLegalVerbsByTranslation = async (req, res) => {
  const { userId } = req
  const { translation } = req.query
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const legalVerbs = await LegalVerbsService.getByTranslation(translation)
    return res.status(200).json({ legalVerbs })
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
 * Updates a legal verb by ID.
 * @function updateLegalVerb
 * @param {import('express').Request} req - Request object, expects { id } as URL parameter and { name, description, translation } in body.
 * @param {import('express').Response} res - Response object.
 * @returns {Object} - The updated legal verb data.
 */
export const updateLegalVerb = async (req, res) => {
  const { userId } = req
  const { id } = req.params
  const { name, description, translation } = req.body
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const legalVerb = await LegalVerbsService.updateById(id, {
      name,
      description,
      translation
    })
    return res.status(200).json({ legalVerb })
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
 * Deletes a legal verb by ID.
 * @function deleteLegalVerb
 * @param {import('express').Request} req - Request object, expects { id } as URL parameter.
 * @param {import('express').Response} res - Response object.
 * @returns {void}
 */
export const deleteLegalVerb = async (req, res) => {
  const { userId } = req
  const { id } = req.params
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const { success } = await LegalVerbsService.deleteById(id)
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
    return res.status(500).json({ message: 'Failed to delete legal verb' })
  }
}

/**
 * Deletes multiple legal verbs by array of IDs.
 * @function deleteLegalVerbsBatch
 * @param {import('express').Request} req - Request object, expects { legalVerbsIds } in body.
 * @param {import('express').Response} res - Response object.
 * @returns {void}
 */
export const deleteLegalVerbsBatch = async (req, res) => {
  const { userId } = req
  const { legalVerbsIds } = req.body
  if (
    !legalVerbsIds ||
    !Array.isArray(legalVerbsIds) ||
    legalVerbsIds.length === 0
  ) {
    return res
      .status(400)
      .json({ message: 'Missing required field: legalVerbsIds' })
  }
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const { success } = await LegalVerbsService.deleteBatch(legalVerbsIds)
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
