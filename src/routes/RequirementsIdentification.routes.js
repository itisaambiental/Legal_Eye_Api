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
  getIdentificationsByCreatedAt,
  updateIdentificationById,
  deleteIdentificationById,
  deleteBatchIdentifications
} from '../controllers/RequirementsIdentification.controller.js'

const router = Router()

/**
 * Route to start a new requirements identification job.
 * @method POST
 * @path /requirements-identifications
 * @description Initiates a new job for identifying requirements based on legal bases, subject, and aspects.
 * @middleware UserExtractor
 */
router.post('/requirements-identifications', UserExtractor, startIdentification)

/**
 * Route to get the status of a requirements identification job.
 * @method GET
 * @path /jobs/requirements-identifications/:jobId
 * @description Retrieves the current status of a specific requirements identification job by its ID.
 * @middleware UserExtractor
 */
router.get('/jobs/requirements-identifications/:jobId', UserExtractor, getIdentificationJobStatus)

/**
 * Route to cancel a requirements identification job.
 * @method DELETE
 * @path /jobs/requirements-identifications/:jobId
 * @description Cancels a job by its ID. Jobs in 'completed' or 'failed' states cannot be canceled.
 * @middleware UserExtractor
 */
router.delete('/jobs/requirements-identifications/:jobId', UserExtractor, cancelIdentificationJob)

/**
 * Route to retrieve all requirements identifications.
 * @method GET
 * @path /requirements-identifications
 * @description Retrieves all existing requirements identifications.
 * @middleware UserExtractor
 */
router.get('/requirements-identifications', UserExtractor, getAllIdentifications)

/**
 * Route to retrieve requirements identifications filtered by identification name.
 * @method GET
 * @path /requirements-identifications/name
 * @description Retrieves requirements identifications filtered by identification name.
 * @middleware UserExtractor
 */
router.get('/requirements-identifications/name', UserExtractor, getIdentificationsByName)

/**
 * Route to retrieve requirements identifications filtered by identification description.
 * @method GET
 * @path /requirements-identifications/description
 * @description Retrieves requirements identifications filtered by identification description.
 * @middleware UserExtractor
 */
router.get('/requirements-identifications/description', UserExtractor, getIdentificationsByDescription)

/**
 * Route to retrieve requirements identifications filtered by status.
 * @method GET
 * @path /requirements-identifications/status
 * @description Retrieves requirements identifications filtered by status.
 * @middleware UserExtractor
 */
router.get('/requirements-identifications/status', UserExtractor, getIdentificationsByStatus)

/**
 * Route to retrieve requirements identifications filtered by user ID.
 * @method GET
 * @path /requirements-identifications/user
 * @description Retrieves requirements identifications filtered by user ID.
 * @middleware UserExtractor
 */
router.get('/requirements-identifications/user', UserExtractor, getIdentificationsByUserId)

/**
 * Route to retrieve requirements identifications filtered by creation date.
 * @method GET
 * @path /requirements-identifications/createdAt
 * @description Retrieves requirements identifications filtered by creation date.
 * @middleware UserExtractor
 */
router.get('/requirements-identifications/createdAt', UserExtractor, getIdentificationsByCreatedAt)

/**
 * Route to update an existing requirements identification.
 * @method PATCH
 * @path /requirements-identifications/:identificationId
 * @description Updates the identification name and/or description for a specific requirements identification.
 * @middleware UserExtractor
 */
router.patch('/requirements-identifications/:identificationId', UserExtractor, updateIdentificationById)

/**
 * Route to delete a requirements identification by ID.
 * @method DELETE
 * @path /requirements-identifications/:identificationId
 * @description Deletes a specific requirements identification if it has no active jobs.
 * @middleware UserExtractor
 */
router.delete('/requirements-identifications/:identificationId', UserExtractor, deleteIdentificationById)

/**
 * Route to delete multiple requirements identifications.
 * @method DELETE
 * @path /requirements-identifications
 * @description Deletes multiple requirements identifications if they have no active jobs.
 * @middleware UserExtractor
 */
router.delete('/requirements-identifications', UserExtractor, deleteBatchIdentifications)

export default router
