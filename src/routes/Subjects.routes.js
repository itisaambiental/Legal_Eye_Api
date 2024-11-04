// routes/User.routes.js

/**
 * Routes module for subject-related operations.
 * Defines the API endpoints for subject management.
 */

import { Router } from 'express'
import {
  createSubject,
  getSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject
} from '../controllers/Subject.controller.js'
import UserExtractor from '../middleware/access_token.js'

/**
 * SubjectRouter
 * @type {Router}
 */
const router = Router()

/**
 * Route to create a new subject.
 * @method POST
 * @path /subjects
 * @description Creates a new subject in the system.
 * @middleware UserExtractor
 */
router.post('/subjects', UserExtractor, createSubject)

/**
 * Route to retrieve all subjects.
 * @method GET
 * @path /subjects
 * @description Retrieves a list of all subjects.
 * @middleware UserExtractor
 */
router.get('/subjects', UserExtractor, getSubjects)

/**
 * Route to retrieve a specific subject by ID.
 * @method GET
 * @path /subject/:id
 * @description Retrieves details of a specific subject by its ID.
 * @middleware UserExtractor
 */
router.get('/subject/:id', UserExtractor, getSubjectById)

/**
 * Route to update a subject by ID.
 * @method PATCH
 * @path /subject/:id
 * @description Updates a subject's information by its ID.
 * @middleware UserExtractor
 */
router.patch('/subject/:id', UserExtractor, updateSubject)

/**
 * Route to delete a subject by ID.
 * @method DELETE
 * @path /subject/:id
 * @description Deletes a subject by its ID.
 * @middleware UserExtractor
 */
router.delete('/subject/:id', UserExtractor, deleteSubject)

export default router