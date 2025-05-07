/**
 * Routes module for legal verb-related operations.
 * Defines the API endpoints for managing legal verbs.
 */

import { Router } from 'express'
import {
  createLegalVerb,
  getLegalVerbs,
  getLegalVerbById,
  getLegalVerbsByName,
  getLegalVerbsByDescription,
  getLegalVerbsByTranslation,
  updateLegalVerb,
  deleteLegalVerb,
  deleteLegalVerbsBatch
} from '../controllers/LegalVerbs.controller.js'
import UserExtractor from '../middlewares/user_extractor.js'

/**
 * LegalVerbsRouter
 * @type {Router}
 */
const router = Router()

/**
 * Route to create a new legal verb.
 * @method POST
 * @path /legal-verbs
 * @middleware UserExtractor
 */
router.post('/legal-verbs', UserExtractor, createLegalVerb)

/**
 * Route to retrieve all legal verbs.
 * @method GET
 * @path /legal-verbs
 * @middleware UserExtractor
 */
router.get('/legal-verbs', UserExtractor, getLegalVerbs)

/**
 * Route to retrieve a legal verb by ID.
 * @method GET
 * @path /legal-verbs/:id
 * @middleware UserExtractor
 */
router.get('/legal-verbs/:id', UserExtractor, getLegalVerbById)

/**
 * Route to retrieve legal verbs by name.
 * @method GET
 * @path /legal-verbs/search/name
 * @middleware UserExtractor
 */
router.get('/legal-verbs/search/name', UserExtractor, getLegalVerbsByName)

/**
 * Route to retrieve legal verbs by description.
 * @method GET
 * @path /legal-verbs/search/description
 * @middleware UserExtractor
 */
router.get('/legal-verbs/search/description', UserExtractor, getLegalVerbsByDescription)

/**
 * Route to retrieve legal verbs by translation.
 * @method GET
 * @path /legal-verbs/search/translation
 * @middleware UserExtractor
 */
router.get('/legal-verbs/search/translation', UserExtractor, getLegalVerbsByTranslation)

/**
 * Route to update a legal verb by ID.
 * @method PATCH
 * @path /legal-verbs/:id
 * @middleware UserExtractor
 */
router.patch('/legal-verbs/:id', UserExtractor, updateLegalVerb)

/**
 * Route to delete a legal verb by ID.
 * @method DELETE
 * @path /legal-verbs/:id
 * @middleware UserExtractor
 */
router.delete('/legal-verbs/:id', UserExtractor, deleteLegalVerb)

/**
 * Route to delete multiple legal verbs by array of IDs.
 * @method DELETE
 * @path /legal-verbs/delete/batch
 * @body {Array<number>} legalVerbsIds - Array of IDs of the legal verbs to delete.
 * @middleware UserExtractor
 */
router.delete('/legal-verbs/delete/batch', UserExtractor, deleteLegalVerbsBatch)

export default router
