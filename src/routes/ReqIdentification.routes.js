/**
 * Routes module for req_identifications operations.
 * Defines the API endpoints for req_identifications and all their linked entities.
 */

import { Router } from 'express'
import UserExtractor from '../middlewares/user_extractor.js'
import {
  createIdentification,
  getAllIdentifications,
  getIdentificationById,
  updateIdentification,
  deleteIdentification,
  deleteAllIdentifications,
  markAsCompleted,
  markAsFailed,
  linkRequirement,
  unlinkRequirement,
  getLinkedRequirements,
  linkMetadata,
  unlinkMetadata,
  getLinkedMetadata,
  linkLegalBasis,
  unlinkLegalBasis,
  getLinkedLegalBases,
  linkArticle,
  unlinkArticle,
  getLinkedArticles,
  linkLegalVerb,
  unlinkLegalVerb,
  getLinkedLegalVerbs
} from '../controllers/ReqIdentification.controller.js'

/**
 * ReqIdentificationRouter
 * @type {Router}
 */
const router = Router()

/**
 * Creates a new req_identification.
 * @method POST
 * @path /reqIdentification
 * @middleware UserExtractor
 */
router.post('/reqIdentification', UserExtractor, createIdentification)

/**
 * Retrieves all req_identifications.
 * @method GET
 * @path /reqIdentification
 * @middleware UserExtractor
 */
router.get('/reqIdentification', UserExtractor, getAllIdentifications)

/**
 * Retrieves a single req_identification by ID.
 * @method GET
 * @path /reqIdentification/:id
 * @param {string} id - The identification ID.
 * @middleware UserExtractor
 */
router.get('/reqIdentification/:id', UserExtractor, getIdentificationById)

/**
 * Updates name/description of a req_identification.
 * @method PATCH
 * @path /reqIdentification/:id
 * @param {string} id - The identification ID.
 * @middleware UserExtractor
 */
router.patch('/reqIdentification/:id', UserExtractor, updateIdentification)

/**
 * Deletes a req_identification by ID.
 * @method DELETE
 * @path /reqIdentification/:id
 * @param {string} id - The identification ID.
 * @middleware UserExtractor
 */
router.delete('/reqIdentification/:id', UserExtractor, deleteIdentification)

/**
 * Deletes all req_identifications.
 * @method DELETE
 * @path /reqIdentification
 * @middleware UserExtractor
 */
router.delete('/reqIdentification', UserExtractor, deleteAllIdentifications)

/**
 * Marks a req_identification as Completed.
 * @method POST
 * @path /reqIdentification/:id/complete
 * @param {string} id - The identification ID.
 * @middleware UserExtractor
 */
router.post('/reqIdentification/:id/complete', UserExtractor, markAsCompleted)

/**
 * Marks a req_identification as Failed.
 * @method POST
 * @path /reqIdentification/:id/fail
 * @param {string} id - The identification ID.
 * @middleware UserExtractor
 */
router.post('/reqIdentification/:id/fail', UserExtractor, markAsFailed)

/**
 * Links a requirement to an identification.
 * @method POST
 * @path /reqIdentification/:identificationId/requirements
 * @param {string} identificationId
 * @body {number} requirementId
 * @middleware UserExtractor
 */
router.post(
  '/reqIdentification/:identificationId/requirements',
  UserExtractor,
  linkRequirement
)

/**
 * Unlinks a requirement from an identification.
 * @method DELETE
 * @path /reqIdentification/:identificationId/requirements/:requirementId
 * @params {string} identificationId, requirementId
 * @middleware UserExtractor
 */
router.delete(
  '/reqIdentification/:identificationId/requirements/:requirementId',
  UserExtractor,
  unlinkRequirement
)

/**
 * Retrieves all requirements linked to an identification.
 * @method GET
 * @path /reqIdentification/:identificationId/requirements
 * @param {string} identificationId
 * @middleware UserExtractor
 */
router.get(
  '/reqIdentification/:identificationId/requirements',
  UserExtractor,
  getLinkedRequirements
)

/**
 * Links metadata for a requirement.
 * @method POST
 * @path /reqIdentification/:identificationId/requirements/:requirementId/metadata
 * @params {string} identificationId, requirementId
 * @body {string} requirementNumber, {number|null} requirementTypeId
 * @middleware UserExtractor
 */
router.post(
  '/reqIdentification/:identificationId/requirements/:requirementId/metadata',
  UserExtractor,
  linkMetadata
)

/**
 * Unlinks metadata for a requirement.
 * @method DELETE
 * @path /reqIdentification/:identificationId/requirements/:requirementId/metadata
 * @params {string} identificationId, requirementId
 * @middleware UserExtractor
 */
router.delete(
  '/reqIdentification/:identificationId/requirements/:requirementId/metadata',
  UserExtractor,
  unlinkMetadata
)

/**
 * Retrieves metadata linked to a requirement.
 * @method GET
 * @path /reqIdentification/:identificationId/requirements/:requirementId/metadata
 * @params {string} identificationId, requirementId
 * @middleware UserExtractor
 */
router.get(
  '/reqIdentification/:identificationId/requirements/:requirementId/metadata',
  UserExtractor,
  getLinkedMetadata
)

/**
 * Links a legal basis to a requirement.
 * @method POST
 * @path /reqIdentification/:identificationId/requirements/:requirementId/legalBasis
 * @params {string} identificationId, requirementId
 * @body {number} legalBasisId
 * @middleware UserExtractor
 */
router.post(
  '/reqIdentification/:identificationId/requirements/:requirementId/legalBasis',
  UserExtractor,
  linkLegalBasis
)

/**
 * Unlinks a legal basis from a requirement.
 * @method DELETE
 * @path /reqIdentification/:identificationId/requirements/:requirementId/legalBasis/:legalBasisId
 * @params {string} identificationId, requirementId, legalBasisId
 * @middleware UserExtractor
 */
router.delete(
  '/reqIdentification/:identificationId/requirements/:requirementId/legalBasis/:legalBasisId',
  UserExtractor,
  unlinkLegalBasis
)

/**
 * Retrieves legal bases linked to a requirement.
 * @method GET
 * @path /reqIdentification/:identificationId/requirements/:requirementId/legalBasis
 * @params {string} identificationId, requirementId
 * @middleware UserExtractor
 */
router.get(
  '/reqIdentification/:identificationId/requirements/:requirementId/legalBasis',
  UserExtractor,
  getLinkedLegalBases
)

/**
 * Links an article under a legal basis.
 * @method POST
 * @path /reqIdentification/:identificationId/requirements/:requirementId/articles
 * @params {string} identificationId, requirementId
 * @body {number} legalBasisId, {number} articleId, {string} articleType
 * @middleware UserExtractor
 */
router.post(
  '/reqIdentification/:identificationId/requirements/:requirementId/articles',
  UserExtractor,
  linkArticle
)

/**
 * Unlinks an article under a legal basis.
 * @method DELETE
 * @path /reqIdentification/:identificationId/requirements/:requirementId/articles/:legalBasisId/:articleId
 * @params {string} identificationId, requirementId, legalBasisId, articleId
 * @middleware UserExtractor
 */
router.delete(
  '/reqIdentification/:identificationId/requirements/:requirementId/articles/:legalBasisId/:articleId',
  UserExtractor,
  unlinkArticle
)

/**
 * Retrieves articles linked to a requirement.
 * @method GET
 * @path /reqIdentification/:identificationId/requirements/:requirementId/articles
 * @params {string} identificationId, requirementId
 * @middleware UserExtractor
 */
router.get(
  '/reqIdentification/:identificationId/requirements/:requirementId/articles',
  UserExtractor,
  getLinkedArticles
)

/**
 * Links a legal verb translation.
 * @method POST
 * @path /reqIdentification/:identificationId/requirements/:requirementId/legalVerbs
 * @params {string} identificationId, requirementId
 * @body {number} legalVerbId, {string} translation
 * @middleware UserExtractor
 */
router.post(
  '/reqIdentification/:identificationId/requirements/:requirementId/legalVerbs',
  UserExtractor,
  linkLegalVerb
)

/**
 * Unlinks a legal verb translation.
 * @method DELETE
 * @path /reqIdentification/:identificationId/requirements/:requirementId/legalVerbs/:legalVerbId
 * @params {string} identificationId, requirementId, legalVerbId
 * @middleware UserExtractor
 */
router.delete(
  '/reqIdentification/:identificationId/requirements/:requirementId/legalVerbs/:legalVerbId',
  UserExtractor,
  unlinkLegalVerb
)

/**
 * Retrieves legal verbs linked to a requirement.
 * @method GET
 * @path /reqIdentification/:identificationId/requirements/:requirementId/legalVerbs
 * @params {string} identificationId, requirementId
 * @middleware UserExtractor
 */
router.get(
  '/reqIdentification/:identificationId/requirements/:requirementId/legalVerbs',
  UserExtractor,
  getLinkedLegalVerbs
)

export default router
