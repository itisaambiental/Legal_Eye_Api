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
  getArticlesByDescription,
  getArticleById,
  updateArticle,
  deleteArticle,
  deleteArticlesBatch
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
 * Route to filter articles by name for a specific legal basis.
 * @method GET
 * @path /articles/:legalBasisId/name
 * @description Retrieves a list of articles matching the specified name for the given legal basis.
 * @param {string} legalBasisId - The ID of the legal basis.
 * @query {string} name - The name or part of the name of the articles to be retrieved.
 * @middlewares UserExtractor - Middleware to ensure that the user is authorized and extracted from the request.
 * @returns {Object} - A JSON response containing the list of articles or an error message.
 */
router.get('/articles/:legalBasisId/name', UserExtractor, getArticlesByName)

/**
 * Route to filter articles by description for a specific legal basis.
 * @method GET
 * @path /articles/:legalBasisId/description
 * @description Retrieves a list of articles matching the specified description for the given legal basis.
 * @param {string} legalBasisId - The ID of the legal basis.
 * @query {string} description - The description or part of the description of the articles to be retrieved.
 * @middlewares UserExtractor - Middleware to ensure that the user is authorized and extracted from the request.
 * @returns {Object} - A JSON response containing the list of articles or an error message.
 */
router.get('/articles/:legalBasisId/description', UserExtractor, getArticlesByDescription)

/**
 * Route to fetch an article by its ID.
 * @method GET
 * @path /articles/:id
 * @description Retrieves an article by its ID.
 * @param {string} id - The ID of the article to retrieve.
 * @middlewares UserExtractor - Middleware to ensure that the user is authorized and extracted from the request.
 * @returns {Object} - A JSON response containing the article or an error message.
 */
router.get('/article/:id', UserExtractor, getArticleById)

/**
 * Route to update an article by its ID.
 * @method PATCH
 * @path /articles/:id
 * @description Updates an article by its ID.
 * @param {string} id - The ID of the article to update.
 * @body {string} title - The new title of the article (optional).
 * @body {string} article - The new content of the article (optional).
 * @body {number} order - The new order of the article (optional).
 * @middlewares UserExtractor - Middleware to ensure that the user is authorized and extracted from the request.
 * @returns {Object} - A JSON response containing the updated article or an error message.
 */
router.patch('/article/:id', UserExtractor, updateArticle)

/**
 * Route to delete an article by its ID.
 * @method DELETE
 * @path /articles/:id
 * @description Deletes an article by its ID.
 * @param {string} id - The ID of the article to delete.
 * @middlewares UserExtractor - Middleware to ensure that the user is authorized and extracted from the request.
 * @returns {Object} - A 204 No Content response or an error message.
 */
router.delete('/article/:id', UserExtractor, deleteArticle)

/**
 * Route to delete multiple articles by their IDs.
 * @method DELETE
 * @path /articles/batch
 * @description Deletes multiple articles using an array of IDs.
 * @body {Array<number>} articleIds - Array of IDs of the articles to delete.
 * @middlewares UserExtractor - Middleware to ensure that the user is authorized and extracted from the request.
 * @returns {Object} - A 204 No Content response or an error message.
 */
router.delete('/articles/batch', UserExtractor, deleteArticlesBatch)

export default router
