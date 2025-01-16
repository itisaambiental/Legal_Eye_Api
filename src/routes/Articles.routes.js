/**
 * Routes module for articles operations.
 * Defines the API endpoints for articles records.
 */

import { Router } from 'express'
import UserExtractor from '../middleware/access_token.js'
import {
  createArticle,
  getArticlesByLegalBasisId,
  getArticlesByName,
  getArticlesByDescription
} from '../controllers/Articles.controller.js'

const router = Router()

/**
 * Route to create a new article associated with a legal basis.
 * @method POST
 * @path /articles/legalBasis/:id
 * @description Creates a new article associated with the specified legal basis ID.
 * @param {string} legalBasisId - The ID of the legal basis to associate the article with.
 * @body {string} title - The title of the article.
 * @body {string} article - The content of the article.
 * @body {number} order - The order of the article within the legal basis.
 * @middlewares UserExtractor - Middleware to ensure that the user is authorized and extracted from the request.
 * @returns {Object} - A JSON response containing the created article or an error message.
 */
router.post('/articles/legalBasis/:legalBasisId', UserExtractor, createArticle)

/**
 * Route to retrieve articles associated with a specific legal basis.
 * @method GET
 * @path /articles/legalBasis/:id
 * @description Retrieves a list of articles associated with the specified legal basis ID.
 * @param {string} legalBasisId - The ID of the legal basis whose articles are to be retrieved.
 * @middlewares UserExtractor - Middleware to ensure that the user is authorized and extracted from the request.
 * @returns {Object} - A JSON response containing the list of articles or an error message.
 */
router.get('/articles/legalBasis/:legalBasisId', UserExtractor, getArticlesByLegalBasisId)

/**
 * Route to filter articles by name.
 * @method GET
 * @path /articles/name
 * @description Retrieves a list of articles matching the specified name.
 * @query {string} name - The name or part of the name of the articles to be retrieved.
 * @middlewares UserExtractor - Middleware to ensure that the user is authorized and extracted from the request.
 * @returns {Object} - A JSON response containing the list of articles or an error message.
 */
router.get('/articles/name', UserExtractor, getArticlesByName)

/**
 * Route to filter articles by description.
 * @method GET
 * @path /articles/description
 * @description Retrieves a list of articles matching the specified description.
 * @query {string} description - The description or part of the description of the articles to be retrieved.
 * @middlewares UserExtractor - Middleware to ensure that the user is authorized and extracted from the request.
 * @returns {Object} - A JSON response containing the list of articles or an error message.
 */
router.get('/articles/description', UserExtractor, getArticlesByDescription)

export default router
