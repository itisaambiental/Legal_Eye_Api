import ArticlesService from '../services/articles/Articles.service.js'
import UserService from '../services/users/User.service.js'
import ErrorUtils from '../utils/Error.js'

/**
 * Controller for Articles operations.
 * @module ArticlesController
 */

/**
 * Creates a single article associated with a legal basis.
 * @function createArticle
 * @param {import('express').Request} req - Request object, expects { id } in req.params and fields in req.body (title, article, order).
 * @param {import('express').Response} res - Response object.
 * @returns {Object} - The created article or an error message if an error occurs.
 */
export const createArticle = async (req, res) => {
  const { userId } = req
  const { legalBasisId } = req.params
  const { title, article, order } = req.body
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const createdArticle = await ArticlesService.create(legalBasisId, {
      title,
      article,
      order
    })
    return res.status(201).json({ article: createdArticle })
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
 * Retrieves articles associated with a specific legal basis by its ID.
 * @function getArticlesByLegalBasisId
 * @param {import('express').Request} req - Request object, expects { id } in req.params representing the legalBasisId.
 * @param {import('express').Response} res - Response object.
 * @returns {Object} - A list of articles associated with the given legal basis or an error message if an error occurs.
 */
export const getArticlesByLegalBasisId = async (req, res) => {
  const { userId } = req
  const { legalBasisId } = req.params
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const articles = await ArticlesService.getByLegalBasisId(legalBasisId)
    return res.status(200).json({ articles })
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
 * Filters articles by their name for a specific legal basis.
 * @function getArticlesByName
 * @param {import('express').Request} req - Request object, expects { name } in req.query and { legalBasisId } in req.params.
 * @param {import('express').Response} res - Response object.
 * @returns {Object} - A list of articles matching the name for the given legal basis or an error message if an error occurs.
 */
export const getArticlesByName = async (req, res) => {
  const { userId } = req
  const { legalBasisId } = req.params
  const { name } = req.query
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const articles = await ArticlesService.getByName(legalBasisId, name)
    return res.status(200).json({ articles })
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
 * Filters articles by their description for a specific legal basis.
 * @function getArticlesByDescription
 * @param {import('express').Request} req - Request object, expects { description } in req.query and { legalBasisId } in req.params.
 * @param {import('express').Response} res - Response object.
 * @returns {Object} - A list of articles matching the description for the given legal basis or an error message if an error occurs.
 */
export const getArticlesByDescription = async (req, res) => {
  const { userId } = req
  const { legalBasisId } = req.params
  const { description } = req.query
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const articles = await ArticlesService.getByDescription(
      legalBasisId,
      description
    )
    return res.status(200).json({ articles })
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
 * Fetches an article by its ID.
 * @function getArticleById
 * @param {import('express').Request} req - Request object, expects { id } in req.params.
 * @param {import('express').Response} res - Response object.
 * @returns {Object} - The article or an error message if an error occurs.
 */
export const getArticleById = async (req, res) => {
  const { userId } = req
  const { id } = req.params
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const article = await ArticlesService.getById(id)
    return res.status(200).json({ article })
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
 * Updates an article by its ID.
 * @function updateArticleById
 * @param {import('express').Request} req - Request object, expects { id } in req.params and updated fields in req.body (title, article, order).
 * @param {import('express').Response} res - Response object.
 * @returns {Object} - The updated article or an error message if an error occurs.
 */
export const updateArticle = async (req, res) => {
  const { userId } = req
  const { id } = req.params
  const { title, article, order } = req.body
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const updatedArticle = await ArticlesService.updateById(id, {
      title,
      article,
      order
    })
    return res.status(200).json({ article: updatedArticle })
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
 * Deletes an article by its ID.
 * @function deleteArticleById
 * @param {import('express').Request} req - Request object, expects { id } in req.params.
 * @param {import('express').Response} res - Response object.
 * @returns {void}
 */
export const deleteArticle = async (req, res) => {
  const { userId } = req
  const { id } = req.params
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const { success } = await ArticlesService.deleteById(id)
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

/**
 * Deletes multiple articles using an array of IDs.
 * @function deleteArticlesBatch
 * @param {import('express').Request} req - Request object, expects { articleIds } in body.
 * @param {import('express').Response} res - Response object.
 * @returns {void}
 */
export const deleteArticlesBatch = async (req, res) => {
  const { articleIds } = req.body
  const { userId } = req
  if (!articleIds || !Array.isArray(articleIds) || articleIds.length === 0) {
    return res.status(400).json({
      message: 'Missing required fields: articleIds'
    })
  }
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const { success } = await ArticlesService.deleteArticlesBatch(articleIds)
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
