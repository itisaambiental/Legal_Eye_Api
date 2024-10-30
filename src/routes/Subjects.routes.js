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
 * @path /materias
 * @description Creates a new subject in the system.
 * @middleware UserExtractor
 */
router.post('/materias', UserExtractor, createSubject)

/**
 * Route to retrieve all subjects.
 * @method GET
 * @path /materias
 * @description Retrieves a list of all subjects.
 * @middleware UserExtractor
 */
router.get('/materias', UserExtractor, getSubjects)

/**
 * Route to retrieve a specific subject by ID.
 * @method GET
 * @path /materia/:id
 * @description Retrieves details of a specific subject by its ID.
 * @middleware UserExtractor
 */
router.get('/materia/:id', UserExtractor, getSubjectById)

/**
 * Route to update a subject by ID.
 * @method PATCH
 * @path /materia/:id
 * @description Updates a subject's information by its ID.
 * @middleware UserExtractor
 */
router.patch('/materia/:id', UserExtractor, updateSubject)

/**
 * Route to delete a subject by ID.
 * @method DELETE
 * @path /materia/:id
 * @description Deletes a subject by its ID.
 * @middleware UserExtractor
 */
router.delete('/materia/:id', UserExtractor, deleteSubject)

export default router
