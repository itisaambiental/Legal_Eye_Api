/**
 * Routes module for requirements identification operations.
 * Defines the API endpoints for requirements identification records.
 */

import { Router } from 'express'
import UserExtractor from '../middlewares/access_token.js'
import {
  startIdentifyRequirements
} from '../controllers/IdentifyRequirements.controller.js'

const router = Router()

/**
 * Route to start an requirements identification.
 * @method POST
 * @path start/identify/requirements
 * @description Initiates a requirements identification job for selected legal bases and associated requirements.
 *
 * @middlewares UserExtractor - Middleware to ensure that the user is authorized.
 * @returns {number} - The ID of the created requirements identification job.
 */
router.post('start/identify/requirements', UserExtractor, startIdentifyRequirements)

export default router
