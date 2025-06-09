/**
 * Routes module for legal basis sending operations.
 * Defines the API endpoints for managing legal basis sending jobs.
 */

import { Router } from 'express'
import UserExtractor from '../middlewares/user_extractor.js'
import { sendLegalBasis, getSendLegalBasisJobStatus } from '../controllers/SendLegalBasis.controller.js'

/**
 * SendLegalBasisRouter
 * @type {Router}
 */
const router = Router()

/**
 * Route to send selected legal basis IDs to ACM Suite.
 * @method POST
 * @path /jobs/legalBasis/
 * @description Sends one or multiple legal basis to ACM Suite for registration.
 * @middlewares UserExtractor
 */
router.post('/jobs/legalBasis/', UserExtractor, sendLegalBasis)

/**
 * Route to get the status of a legal basis sending job.
 * @method GET
 * @path /jobs/legalBasis/:jobId
 * @description Retrieves the current status of a specific legal basis sending job by its ID.
 * @param {string} jobId - The ID of the job to be retrieved.
 * @middlewares UserExtractor
 */
router.get('/jobs/legalBasis/:jobId', UserExtractor, getSendLegalBasisJobStatus)

export default router
