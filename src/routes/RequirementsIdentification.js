/**
 * Routes module for requirements identification operations.
 * Defines the API endpoints for requirements identification records.
 */

import { Router } from 'express'
import UserExtractor from '../middlewares/access_token.js'
import {
  startRequirementsIdentification
} from '../controllers/RequirementsIdentification.controller.js'

const router = Router()

/**
 * Route to start a requirements identification.
 * @method POST
 * @path /requirements-identification
 * @description Initiates a requirements identification job for selected legal bases and associated requirements.
 *
 * @middlewares UserExtractor - Middleware to ensure that the user is authorized.
 */
router.post('/requirements-identification', UserExtractor, startRequirementsIdentification)

export default router
