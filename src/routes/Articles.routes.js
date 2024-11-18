/**
 * Routes module for articles operations.
 * Defines the API endpoints for articles records.
 */

import { Router } from 'express'
import UserExtractor from '../middleware/access_token.js'
import { getArticlesByLegalBasisId } from '../controllers/Articles.controller.js'

const router = Router()

/**
 * Route to retrieve articles associated with a specific legal basis.
 * @method GET
 * @path /articles/legalBasis/:id
 * @description Retrieves a list of articles associated with the specified legal basis ID.
 * @param {string} id - The ID of the legal basis whose articles are to be retrieved.
 * @middlewares UserExtractor - Middleware to ensure that the user is authorized and extracted from the request.
 * @returns {Object} - A JSON response containing the list of articles or an error message.
 */
router.get('/articles/legalBasis/:id', UserExtractor, getArticlesByLegalBasisId)

export default router
