/**
 * Routes module for Requirements Identification operations.
 * Defines the API endpoints for managing requirements identification jobs.
 */

import { Router } from 'express'
import UserExtractor from '../middlewares/access_token.js'
import {
  startIdentification,
  getIdentificationJobStatus,
  cancelIdentificationJob,
  getAllIdentifications
} from '../controllers/RequirementsIdentification.controller.js'

const router = Router()

/**
 * Route to start a new requirements identification job.
 * @method POST
 * @path /jobs/requirements-identification
 * @description Initiates a new job for identifying requirements based on legal bases, subject, and aspects.
 * @middlewares UserExtractor - Middleware to ensure that the user is authorized and extracted from the request.
 * @param {Object} req.body - The request body must include:
 *   - `identificationName`: Name of the identification.
 *   - `identificationDescription`: Description of the identification (optional).
 *   - `legalBasisIds`: Array of legal basis IDs to analyze.
 *   - `subjectId`: The subject ID (materia).
 *   - `aspectIds`: Array of aspect IDs related to the subject.
 *   - `intelligenceLevel`: Intelligence level for the identification.
 * @returns {Object} - A JSON response containing the job ID and the created requirements identification data.
 */
router.post('/requirements-identification', UserExtractor, startIdentification)

/**
 * Route to get the status of a requirements identification job.
 * @method GET
 * @path /jobs/requirements-identification/:jobId
 * @description Retrieves the current status of a specific requirements identification job by its ID.
 * @param {string} jobId - The ID of the job to be retrieved.
 * @middlewares UserExtractor - Middleware to ensure that the user is authorized.
 * @returns {Object} - A JSON response containing the job status and relevant details (progress, result, or error).
 */
router.get('/jobs/requirements-identification/:jobId', UserExtractor, getIdentificationJobStatus)

/**
 * Cancels a requirements identification job by its ID.
 * @method DELETE
 * @path /jobs/requirements-identification/:jobId
 * @description Cancels a job by its ID. Jobs in 'completed' or 'failed' states cannot be canceled.
 * @param {string} jobId - The ID of the job to be canceled.
 * @middlewares UserExtractor - Middleware to ensure that the user is authorized.
 * @returns {Object} - A response indicating success or failure of the job cancellation.
 */
router.delete('/jobs/requirements-identification/:jobId', UserExtractor, cancelIdentificationJob)

/**
 * Route to get all requirements identifications.
 * @method GET
 * @path /requirements-identifications
 * @description Retrieves all existing requirements identifications.
 * @middlewares UserExtractor - Middleware to ensure that the user is authorized.
 * @returns {Object} - A list of all requirements identifications.
 */
router.get('/requirements-identifications', UserExtractor, getAllIdentifications)

export default router
