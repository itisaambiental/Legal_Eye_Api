/**
 * Routes module for articles operations.
 * Defines the API endpoints for articles records.
 */

import { Router } from 'express'
import UserExtractor from '../middleware/access_token.js'
import { getStatusJob } from '../controllers/ArticlesWorker.controller.js'

const router = Router()

/**
 * Route to get the status of a legal basis job.
 * @method GET
 * @path /jobs/articles/:id
 * @description Retrieves the current status of a specific job by its ID. This route is intended for users to check the progress, completion, or failure of a job related to the articles extraction process.
 * @param {string} id - The ID of the job to be retrieved.
 * @middlewares UserExtractor - Middleware to ensure that the user is authorized and extracted from the request.
 * @returns {Object} - A JSON response containing the job status and relevant details (progress, result, or error).
 */
router.get('/jobs/articles/:id', UserExtractor, getStatusJob)

export default router
