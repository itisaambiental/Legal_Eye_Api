/**
 * Routes module for aspect-related operations.
 * Defines the API endpoints for aspect management within subjects.
 */

import { Router } from 'express'
import {
  createAspect,
  getAspectsBySubject,
  getAspectById,
  getAspectsByName,
  updateAspect,
  deleteAspect,
  deleteAspectsBatch
} from '../controllers/Aspects.controller.js'
import UserExtractor from '../middlewares/access_token.js'

/**
 * AspectRouter
 * @type {Router}
 */
const router = Router()

/**
 * Route to create a new aspect for a specific subject.
 * @method POST
 * @path /subjects/:subjectId/aspects
 * @description Creates a new aspect associated with a specific subject.
 * @middleware UserExtractor
 */
router.post('/subjects/:subjectId/aspects', UserExtractor, createAspect)

/**
 * Route to retrieve all aspects for a specific subject.
 * @method GET
 * @path /subjects/:subjectId/aspects
 * @description Retrieves a list of all aspects associated with a specific subject.
 * @middleware UserExtractor
 */
router.get('/subjects/:subjectId/aspects', UserExtractor, getAspectsBySubject)

/**
 * Route to retrieve an aspect by its ID.
 * @method GET
 * @path /aspects/:id
 * @description Retrieves a specific aspect by its ID.
 * @middleware UserExtractor
 */
router.get('/aspect/:id', UserExtractor, getAspectById)

/**
 * Route to retrieve aspects by name for a specific subject.
 * @method GET
 * @path /subjects/:subjectId/aspects/name
 * @description Retrieves a list of aspects by name associated with a specific subject.
 * @middleware UserExtractor
 */
router.get('/subjects/:subjectId/aspects/name', UserExtractor, getAspectsByName)

/**
 * Route to update an aspect by its ID for a specific subject.
 * @method PATCH
 * @path /aspects/:id
 * @description Updates an aspect's information by its ID.
 * @middleware UserExtractor
 */
router.patch('/aspect/:id', UserExtractor, updateAspect)

/**
 * Route to delete an aspect by its ID.
 * @method DELETE
 * @path /aspects/:id
 * @description Deletes an aspect by its ID.
 * @middleware UserExtractor
 */
router.delete('/aspect/:id', UserExtractor, deleteAspect)

/**
 * Route to delete multiple aspects using an array of IDs.
 * @method DELETE
 * @body {Array<number>} aspectIds - Array of IDs of the aspects to delete.
 * @path /aspects/batch
 * @description Deletes multiple aspects from the system.
 * @middleware UserExtractor
 */
router.delete('/aspects/batch', UserExtractor, deleteAspectsBatch)

export default router
