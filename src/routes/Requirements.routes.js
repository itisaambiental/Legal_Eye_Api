/**
 * Routes module for requirement operations.
 * Defines the API endpoints for requirement records.
 */

import { Router } from 'express'
import UserExtractor from '../middlewares/user_extractor.js'
import {
  createRequirement,
  getAllRequirements,
  getRequirementById,
  getRequirementsByNumber,
  getRequirementsByName,
  getRequirementsBySubject,
  getRequirementsBySubjectAndAspects,
  getRequirementsByMandatoryDescription,
  getRequirementsByComplementaryDescription,
  getRequirementsByMandatorySentences,
  getRequirementsByComplementarySentences,
  getRequirementsByMandatoryKeywords,
  getRequirementsByComplementaryKeywords,
  getRequirementsByCondition,
  getRequirementsByEvidence,
  getRequirementsByPeriodicity,
  updateRequirement,
  deleteRequirement,
  deleteRequirementBatch
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
 * @path /requirement/:id
 * @description Fetches a specific requirement using its ID.
 *
 * @middlewares UserExtractor - Middleware to ensure that the user is authorized and extracted from the request.
 * @returns {Object} - The retrieved requirement data.
 */
router.get('/requirement/:id', UserExtractor, getRequirementById)

/**
 * Route to retrieve requirements by their requirement number.
 * @method GET
 * @path /requirements/search/number
 * @description Fetches requirements matching the given number or partial match.
 *
 * @param {string} number - The number to filter by.
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
 * @param {string} name - The name to filter by.
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

/**
 * Route to retrieve requirements by their mandatory description.
 * @method GET
 * @path /requirements/search/mandatory-description
 * @description Fetches requirements matching the given mandatory description.
 *
 * @param {string} description - The description or partial match.
 * @middlewares UserExtractor - Middleware to ensure that the user is authorized and extracted from the request.
 * @returns {Array<Object>} - A list of matching requirements.
 */
router.get('/requirements/search/mandatory-description', UserExtractor, getRequirementsByMandatoryDescription)

/**
 * Route to retrieve requirements by their complementary description.
 * @method GET
 * @path /requirements/search/complementary-description
 * @description Fetches requirements matching the given complementary description.
 *
 * @param {string} description - The description or partial match.
 * @middlewares UserExtractor - Middleware to ensure that the user is authorized and extracted from the request.
 * @returns {Array<Object>} - A list of matching requirements.
 */
router.get('/requirements/search/complementary-description', UserExtractor, getRequirementsByComplementaryDescription)

/**
 * Route to retrieve requirements by their mandatory sentences.
 * @method GET
 * @path /requirements/search/mandatory-sentences
 * @description Fetches requirements matching the given mandatory sentences.
 *
 * @param {string} sentence - The sentence or partial match.
 * @middlewares UserExtractor - Middleware to ensure that the user is authorized and extracted from the request.
 * @returns {Array<Object>} - A list of matching requirements.
 */
router.get('/requirements/search/mandatory-sentences', UserExtractor, getRequirementsByMandatorySentences)

/**
 * Route to retrieve requirements by their complementary sentences.
 * @method GET
 * @path /requirements/search/complementary-sentences
 * @description Fetches requirements matching the given complementary sentences.
 *
 * @param {string} sentence - The sentence or partial match.
 * @middlewares UserExtractor - Middleware to ensure that the user is authorized and extracted from the request.
 * @returns {Array<Object>} - A list of matching requirements.
 */
router.get('/requirements/search/complementary-sentences', UserExtractor, getRequirementsByComplementarySentences)

/**
 * Route to retrieve requirements by their mandatory keywords.
 * @method GET
 * @path /requirements/search/mandatory-keywords
 * @description Fetches requirements matching the given mandatory keywords.
 *
 * @param {string} keyword - The keyword or partial match.
 * @middlewares UserExtractor - Middleware to ensure that the user is authorized and extracted from the request.
 * @returns {Array<Object>} - A list of matching requirements.
 */
router.get('/requirements/search/mandatory-keywords', UserExtractor, getRequirementsByMandatoryKeywords)

/**
 * Route to retrieve requirements by their complementary keywords.
 * @method GET
 * @path /requirements/search/complementary-keywords
 * @description Fetches requirements matching the given complementary keywords.
 *
 * @param {string} keyword - The keyword or partial match.
 * @middlewares UserExtractor - Middleware to ensure that the user is authorized and extracted from the request.
 * @returns {Array<Object>} - A list of matching requirements.
 */
router.get('/requirements/search/complementary-keywords', UserExtractor, getRequirementsByComplementaryKeywords)

/**
 * Route to retrieve requirements filtered by a specific condition.
 * @method GET
 * @path /requirements/search/condition
 * @description Fetches requirements matching the specified condition type.
 *
 * @param {string} condition - The condition type ('Crítica', 'Operativa', 'Recomendación', 'Pendiente').
 * @middlewares UserExtractor - Middleware to ensure that the user is authorized and extracted from the request.
 * @returns {Array<Object>} - A list of requirements matching the condition.
 */
router.get('/requirements/search/condition', UserExtractor, getRequirementsByCondition)

/**
 * Route to retrieve requirements filtered by a specific evidence type.
 * @method GET
 * @path /requirements/search/evidence
 * @description Fetches requirements matching the specified evidence type.
 *
 * @param {string} evidence - The evidence type ('Trámite', 'Registro', 'Específico', 'Documento').
 * @middlewares UserExtractor - Middleware to ensure that the user is authorized and extracted from the request.
 * @returns {Array<Object>} - A list of requirements matching the evidence type.
 */
router.get('/requirements/search/evidence', UserExtractor, getRequirementsByEvidence)

/**
 * Route to retrieve requirements filtered by a specific periodicity.
 * @method GET
 * @path /requirements/search/periodicity
 * @description Fetches requirements matching the specified periodicity.
 *
 * @param {string} periodicity - The periodicity ('Anual', '2 años', 'Por evento', 'Única vez').
 * @middlewares UserExtractor - Middleware to ensure that the user is authorized and extracted from the request.
 * @returns {Array<Object>} - A list of requirements matching the periodicity.
 */
router.get('/requirements/search/periodicity', UserExtractor, getRequirementsByPeriodicity)

/**
 * Route to update an existing requirement by its ID.
 * @method PATCH
 * @path /requirement/:id
 * @description Updates an existing requirement with the provided details.
 *
 * @param {string} id - The ID of the requirement to update.
 * @middlewares UserExtractor - Middleware to ensure that the user is authorized and extracted from the request.
 * @returns {Object} - The updated requirement data.
 */
router.patch('/requirement/:id', UserExtractor, updateRequirement)

/**
 * Route to delete a requirement by its ID.
 * @method DELETE
 * @path /requirement/:id
 * @description Deletes a requirement by its ID.
 *
 * @param {string} id - The ID of the requirement to delete.
 * @middlewares UserExtractor - Middleware to ensure that the user is authorized and extracted from the request.
 * @returns {void} - No content if successful.
 */
router.delete('/requirement/:id', UserExtractor, deleteRequirement)

/**
 * Route to delete multiple requirements by their IDs.
 * @method DELETE
 * @path /requirements/batch
 * @description Deletes multiple requirements by their IDs.
 *
 * @param {number[]} requirementIds - An array of requirement IDs to delete.
 * @middlewares UserExtractor - Middleware to ensure that the user is authorized and extracted from the request.
 * @returns {void} - No content if successful.
 */
router.delete('/requirements/batch', UserExtractor, deleteRequirementBatch)

export default router
