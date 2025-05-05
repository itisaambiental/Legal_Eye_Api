/**
 * Routes module for requirement type-related operations.
 * Defines the API endpoints for managing requirement types.
 */

import { Router } from 'express'
import {
  createRequirementType,
  getRequirementTypes,
  getRequirementTypeById,
  getRequirementTypesByName,
  getRequirementTypesByDescription,
  getRequirementTypesByClassification,
  updateRequirementType,
  deleteRequirementType,
  deleteRequirementTypesBatch
} from '../controllers/RequirementTypes.controller.js'
import UserExtractor from '../middlewares/user_extractor.js'

/**
 * RequirementTypesRouter
 * @type {Router}
 */
const router = Router()

/**
 * Route to create a new requirement type.
 * @method POST
 * @path /requirement-types
 * @description Creates a new requirement type.
 * @middleware UserExtractor
 */
router.post('/requirement-types', UserExtractor, createRequirementType)

/**
 * Route to retrieve all requirement types.
 * @method GET
 * @path /requirement-types
 * @description Retrieves a list of all requirement types.
 * @middleware UserExtractor
 */
router.get('/requirement-types', UserExtractor, getRequirementTypes)

/**
 * Route to retrieve a requirement type by ID.
 * @method GET
 * @path /requirement-types/:id
 * @description Retrieves details of a requirement type by its ID.
 * @middleware UserExtractor
 */
router.get('/requirement-types/:id', UserExtractor, getRequirementTypeById)

/**
 * Route to retrieve requirement types by name.
 * @method GET
 * @path /requirement-types/search/name
 * @description Retrieves requirement types that match a name.
 * @middleware UserExtractor
 */
router.get('/requirement-types/search/name', UserExtractor, getRequirementTypesByName)

/**
 * Route to retrieve requirement types by description.
 * @method GET
 * @path /requirement-types/search/description
 * @description Retrieves requirement types that match a description.
 * @middleware UserExtractor
 */
router.get('/requirement-types/search/description', UserExtractor, getRequirementTypesByDescription)

/**
 * Route to retrieve requirement types by classification.
 * @method GET
 * @path /requirement-types/search/classification
 * @description Retrieves requirement types that match a classification.
 * @middleware UserExtractor
 */
router.get('/requirement-types/search/classification', UserExtractor, getRequirementTypesByClassification)

/**
 * Route to update a requirement type by ID.
 * @method PATCH
 * @path /requirement-types/:id
 * @description Updates a requirement type's information by its ID.
 * @middleware UserExtractor
 */
router.patch('/requirement-types/:id', UserExtractor, updateRequirementType)

/**
 * Route to delete a requirement type by ID.
 * @method DELETE
 * @path /requirement-types/:id
 * @description Deletes a requirement type by its ID.
 * @middleware UserExtractor
 */
router.delete('/requirement-types/:id', UserExtractor, deleteRequirementType)

/**
 * Route to delete multiple requirement types using an array of IDs.
 * @method DELETE
 * @path /requirement-types/batch
 * @body {Array<number>} requirementTypesIds - Array of IDs of the requirement types to delete.
 * @description Deletes multiple requirement types from the system.
 * @middleware UserExtractor
 */
router.delete('/requirement-types/delete/batch', UserExtractor, deleteRequirementTypesBatch)

export default router
