// routes/Aspect.routes.js

/**
 * Routes module for aspect-related operations.
 * Defines the API endpoints for aspect management within subjects.
 */

import { Router } from 'express'
import {
  createAspect,
  getAspectsBySubject,
  getAspectById,
  updateAspect,
  deleteAspect
} from '../controllers/Aspects.controller.js'
import UserExtractor from '../middleware/access_token.js'

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
router.get('/aspects/:id', UserExtractor, getAspectById)

/**
 * Route to update an aspect by its ID for a specific subject.
 * @method PATCH
 * @path /aspects/:id
 * @description Updates an aspect's information by its ID.
 * @middleware UserExtractor
 */
router.patch('/aspects/:id', UserExtractor, updateAspect)

/**
 * Route to delete an aspect by its ID.
 * @method DELETE
 * @path /aspects/:id
 * @description Deletes an aspect by its ID.
 * @middleware UserExtractor
 */
router.delete('/aspects/:id', UserExtractor, deleteAspect)

export default router