/**
 * Routes module for articles operations.
 * Defines the API endpoints for articles records.
 */

import { Router } from 'express'
import UserExtractor from '../middleware/access_token.js'
import { getStatusJob, checkPendingJobs } from '../controllers/ArticlesWorker.controller.js'

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

/**
 * Route to check for jobs for a legal basis.
 * @method GET
 * @path /jobs/articles/legalBasis/:legalBasisId
 * @description Checks if there are pending jobs for the specified legalBasisId and retrieves their progress if applicable.
 * @param {string} legalBasisId - The ID of the legal basis to check for pending jobs.
 * @middlewares UserExtractor - Middleware to ensure that the user is authorized and extracted from the request.
 * @returns {Object} - A JSON response containing:
 * - `hasPendingJobs`: Boolean indicating if there are pending jobs.
 * - `progress`: Number representing the job's progress, or null if no jobs exist.
 */
router.get('/jobs/articles/legalBasis/:legalBasisId', UserExtractor, checkPendingJobs)

export default router
