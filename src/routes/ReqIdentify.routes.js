/**
 * Routes module for requirement identification jobs.
 * Defines the API endpoints for managing requirement identification sending jobs.
 */

import { Router } from 'express'
import UserExtractor from '../middlewares/user_extractor.js'
import { getReqIdentificationJobStatus } from '../controllers/ReqIdentify.controller.js'

/**
 * ReqIdentifyRouter
 * @type {Router}
 */
const router = Router()

/**
 * Route to get the status of a requirement identification sending job.
 * @method GET
 * @path /jobs/req-identification/:jobId
 * @description Retrieves the current status of a specific requirement identification sending job by its ID.
 * @param {string} jobId - The ID of the job to be retrieved.
 * @middlewares UserExtractor
 */
router.get('/jobs/req-identification/:jobId', UserExtractor, getReqIdentificationJobStatus)

export default router
