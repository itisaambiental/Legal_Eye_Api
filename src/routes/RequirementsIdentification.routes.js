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
  getAllIdentifications,
  getIdentificationsByName,
  getIdentificationsByDescription,
  getIdentificationsByStatus,
  getIdentificationsByUserId,
  getIdentificationsByCreatedAt
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

/**
 * Route to retrieve requirements identifications filtered by identification name.
 * @method GET
 * @path /requirements-identifications/by-name
 * @description Expects a query parameter `identificationName` (e.g., ?identificationName=Análisis).
 */
router.get('/requirements-identifications/by-name', UserExtractor, getIdentificationsByName)

/**
 * Route to retrieve requirements identifications filtered by identification description.
 * @method GET
 * @path /requirements-identifications/by-description
 * @description Expects a query parameter `identificationDescription` (e.g., ?identificationDescription=Regulación).
 */
router.get('/requirements-identifications/by-description', UserExtractor, getIdentificationsByDescription)

/**
 * Route to retrieve requirements identifications filtered by status.
 * @method GET
 * @path /requirements-identifications/by-status
 * @description Expects a query parameter `status` (e.g., ?status=Active).
 */
router.get('/requirements-identifications/by-status', UserExtractor, getIdentificationsByStatus)

/**
 * Route to retrieve requirements identifications filtered by user ID.
 * @method GET
 * @path /requirements-identifications/by-user
 * @description Expects a query parameter `targetUserId` (e.g., ?targetUserId=10).
 */
router.get('/requirements-identifications/by-user', UserExtractor, getIdentificationsByUserId)

/**
 * Route to retrieve requirements identifications filtered by creation date.
 * @method GET
 * @path /requirements-identifications/by-createdAt
 * @description Expects a query parameter `createdAt` in YYYY-MM-DD format (e.g., ?createdAt=2024-03-15).
 */
router.get('/requirements-identifications/by-createdAt', UserExtractor, getIdentificationsByCreatedAt)

export default router
