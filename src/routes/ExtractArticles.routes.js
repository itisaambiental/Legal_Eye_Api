/**
 * Routes module for articles extraction operations.
 * Defines the API endpoints for managing articles extraction jobs.
 */

import { Router } from 'express'
import UserExtractor from '../middlewares/user_extractor.js'
import { getExtractionJobStatus, hasPendingExtractionJobs, cancelExtractionJob } from '../controllers/ExtractArticles.controller.js'

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
router.get('/jobs/articles/:jobId', UserExtractor, getExtractionJobStatus)

/**
 * Route to check for jobs for a legal basis.
 * @method GET
 * @path /jobs/articles/legalBasis/:legalBasisId
 * @description Checks if there are pending jobs for the specified legalBasisId.
 * Returns whether a job exists and its jobId if applicable.
 *
 * @param {string} legalBasisId - The ID of the legal basis to check for pending jobs.
 *
 * @middlewares UserExtractor - Middleware to ensure that the user is authorized and extracted from the request.
 *
 * @returns {Object} - A JSON response containing:
 * - `hasPendingJobs`: Boolean indicating if there are pending jobs.
 * - `jobId`: String representing the job's ID if a job exists, or null if no jobs exist.
 */
router.get('/jobs/articles/legalBasis/:legalBasisId', UserExtractor, hasPendingExtractionJobs)

/**
 * Cancels a job by its ID.
 * @method DELETE
 * @path /jobs/articles/:jobId
 * @description Cancels a job by its ID. Jobs in 'completed' or 'failed' states cannot be canceled.
 * @param {string} jobId - The ID of the job to be canceled.
 * @middlewares UserExtractor - Middleware to ensure that the user is authorized.
 */
router.delete('/jobs/articles/:jobId', UserExtractor, cancelExtractionJob)

export default router
