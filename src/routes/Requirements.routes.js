/**
 * Routes module for requirement operations.
 * Defines the API endpoints for requirement records.
 */

import { Router } from 'express'
import UserExtractor from '../middlewares/access_token.js'
import {
  createRequirement,
  getAllRequirements,
  getRequirementById,
  getRequirementsByNumber,
  getRequirementsByName,
  getRequirementsBySubject,
  getRequirementsBySubjectAndAspects
} from '../controllers/Requirements.controller.js'

const router = Router()

/**
 * Route to create a new requirement.
 * @method POST
 * @path /requirements
 * @description Creates a new requirement with the provided details.
 *
 * @middlewares UserExtractor - Middleware to ensure that the user is authorized and extracted from the request.
 * @returns {Object} - The created requirement data.
 */
router.post('/requirements', UserExtractor, createRequirement)

/**
 * Route to retrieve all requirements.
 * @method GET
 * @path /requirements
 * @description Fetches all existing requirements in the system.
 *
 * @middlewares UserExtractor - Middleware to ensure that the user is authorized and extracted from the request.
 * @returns {Array<Object>} - A list of requirements.
 */
router.get('/requirements', UserExtractor, getAllRequirements)

/**
 * Route to retrieve a requirement by its ID.
 * @method GET
 * @path /requirements/:id
 * @description Fetches a specific requirement using its ID.
 *
 * @middlewares UserExtractor - Middleware to ensure that the user is authorized and extracted from the request.
 * @returns {Object} - The retrieved requirement data.
 */
router.get('/requirements/:id', UserExtractor, getRequirementById)

/**
 * Route to retrieve requirements by their requirement number.
 * @method GET
 * @path /requirements/search/number
 * @description Fetches requirements matching the given number or partial match.
 *
 * @middlewares UserExtractor - Middleware to ensure that the user is authorized and extracted from the request.
 * @returns {Array<Object>} - A list of matching requirements.
 */
router.get('/requirements/search/number', UserExtractor, getRequirementsByNumber)

/**
 * Route to retrieve requirements by their name.
 * @method GET
 * @path /requirements/search/name
 * @description Fetches requirements matching the given name or partial match.
 *
 * @middlewares UserExtractor - Middleware to ensure that the user is authorized and extracted from the request.
 * @returns {Array<Object>} - A list of matching requirements.
 */
router.get('/requirements/search/name', UserExtractor, getRequirementsByName)

/**
 * Route to retrieve requirements by subject.
 * @method GET
 * @path /requirements/subject/:subjectId
 * @description Fetches requirements filtered by subject.
 *
 * @param {string} subjectId - The ID of the subject to filter by.
 * @middlewares UserExtractor - Middleware to ensure that the user is authorized and extracted from the request.
 * @returns {Array<Object>} - A list of requirements filtered by subject.
 */
router.get('/requirements/subject/:subjectId', UserExtractor, getRequirementsBySubject)

/**
 * Route to retrieve requirements by subject and optionally by aspects.
 * @method GET
 * @path /requirements/subject/:subjectId/aspects
 * @description Fetches requirements filtered by subject and optionally by aspects.
 *
 * @param {string} subjectId - The ID of the subject to filter by.
 * @param {Array<string>} [aspectIds] - Optional query parameter: aspect IDs to further filter by.
 * @middlewares UserExtractor - Middleware to ensure that the user is authorized and extracted from the request.
 * @returns {Array<Object>} - A list of requirements matching the filters.
 */
router.get('/requirements/subject/:subjectId/aspects', UserExtractor, getRequirementsBySubjectAndAspects)

export default router
