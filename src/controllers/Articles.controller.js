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
 * @param {Object} req - Request object, expects { id } in req.params and fields in req.body (title, article, order).
 * @param {Object} res - Response object.
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
    const createdArticle = await ArticlesService.create(legalBasisId,
      { title, article, order }
    )
    return res.status(201).json({ article: createdArticle })
  } catch (error) {
    console.error(error)
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
 * @param {Object} req - Request object, expects { id } in req.params representing the legalBasisId.
 * @param {Object} res - Response object.
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
 * Filters articles by their name.
 * @function getArticlesByName
 * @param {Object} req - Request object, expects { name } in req.query.
 * @param {Object} res - Response object.
 * @returns {Object} - A list of articles matching the name or an error message if an error occurs.
 */
export const getArticlesByName = async (req, res) => {
  const { userId } = req
  const { name } = req.query
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const articles = await ArticlesService.getByName(name)
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
 * Filters articles by their description.
 * @function getArticlesByDescription
 * @param {Object} req - Request object, expects { description } in req.query.
 * @param {Object} res - Response object.
 * @returns {Object} - A list of articles matching the description or an error message if an error occurs.
 */
export const getArticlesByDescription = async (req, res) => {
  const { userId } = req
  const { description } = req.query
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const articles = await ArticlesService.getByDescription(description)
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
