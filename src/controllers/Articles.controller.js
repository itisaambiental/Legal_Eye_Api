import ArticlesService from '../services/articles/ArticlesService.js'
import UserService from '../services/users/User.service.js'
import ErrorUtils from '../utils/Error.js'
/**
 * Controller for Articles operations.
 * @module ArticlesController
 */

/**
 * Retrieves articles associated with a specific legal basis by its ID.
 * @function getArticlesByLegalBasisId
 * @param {Object} req - Request object, expects { id } in req.params representing the legalBasisId.
 * @param {Object} res - Response object.
 * @returns {Object} - A list of articles associated with the given legal basis or an error message if an error occurs.
 */
export const getArticlesByLegalBasisId = async (req, res) => {
  const { userId } = req
  const { id } = req.params
  if (!id) {
    return res.status(400).json({ message: 'legalBasisId is required' })
  }
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const articles = await ArticlesService.getArticlesByLegalBasisId(id)
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
