/**
 * Routes module for requirement identifications operations.
 * Defines the API endpoints for managing requirement identifications
 */

import { Router } from 'express'
import UserExtractor from '../middlewares/user_extractor.js'
import {
  createReqIdentification,
  getAllReqIdentifications,
  getReqIdentificationById,
  getReqIdentificationsByName,
  getReqIdentificationsByDescription,
  getReqIdentificationsByUserId,
  getReqIdentificationsByCreatedAt,
  getReqIdentificationsByStatus,
  getReqIdentificationsByJurisdiction,
  getReqIdentificationsByState,
  getReqIdentificationsByStateAndMunicipalities,
  getReqIdentificationsBySubjectId,
  getReqIdentificationsBySubjectAndAspects,
  updateReqIdentification,
  deleteReqIdentification,
  deleteReqIdentificationsBatch
} from '../controllers/ReqIdentification.controller.js'

/**
 * ReqIdentificationRouter
 * @type {Router}
 */
const router = Router()

/**
 * Route to create a new requirement identification.
 * @method POST
 * @path /req-identification
 * @middleware UserExtractor
 */
router.post('/req-identification', UserExtractor, createReqIdentification)

/**
 * Retrieves all requirement identifications.
 * @method GET
 * @path /req-identification
 * @middleware UserExtractor
 */
router.get('/req-identification', UserExtractor, getAllReqIdentifications)

/**
 * Retrieves a single requirement identification by its ID.
 * @method GET
 * @path /req-identification/:id
 * @middleware UserExtractor
 */
router.get('/req-identification/:id', UserExtractor, getReqIdentificationById)

/**
 * Retrieves requirement identifications by name.
 * @method GET
 * @path /req-identification/search/name
 * @middleware UserExtractor
 */
router.get('/req-identification/search/name', UserExtractor, getReqIdentificationsByName)

/**
 * Retrieves requirement identifications by description.
 * @method GET
 * @path /req-identification/search/description
 * @middleware UserExtractor
 */
router.get('/req-identification/search/description', UserExtractor, getReqIdentificationsByDescription)

/**
 * Retrieves requirement identifications by user ID.
 * @method GET
 * @path /req-identification/search/user/:id
 * @middleware UserExtractor
 */
router.get('/req-identification/search/user/:id', UserExtractor, getReqIdentificationsByUserId)

/**
 * Retrieves requirement identifications by creation date.
 * @method GET
 * @path /req-identification/search/created-at
 * @middleware UserExtractor
 */
router.get('/req-identification/search/created-at', UserExtractor, getReqIdentificationsByCreatedAt)

/**
 * Retrieves requirement identifications by status.
 * @method GET
 * @path /req-identification/search/status
 * @middleware UserExtractor
 */
router.get('/req-identification/search/status', UserExtractor, getReqIdentificationsByStatus)

/**
 * Retrieves requirement identifications by jurisdiction.
 * @method GET
 * @path /req-identification/search/jurisdiction
 * @middleware UserExtractor
 */
router.get('/req-identification/search/jurisdiction', UserExtractor, getReqIdentificationsByJurisdiction)

/**
 * Retrieves requirement identifications by state.
 * @method GET
 * @path /req-identification/search/state
 * @middleware UserExtractor
 */
router.get('/req-identification/search/state', UserExtractor, getReqIdentificationsByState)

/**
 * Retrieves requirement identifications by state and municipalities.
 * @method GET
 * @path /req-identification/search/state-municipalities
 * @middleware UserExtractor
 */
router.get('/req-identification/search/state-municipalities', UserExtractor, getReqIdentificationsByStateAndMunicipalities)

/**
 * Retrieves requirement identifications by subject ID.
 * @method GET
 * @path /req-identification/search/subject/:subjectId
 * @middleware UserExtractor
 */
router.get('/req-identification/search/subject/:subjectId', UserExtractor, getReqIdentificationsBySubjectId)

/**
 * Retrieves requirement identifications by subject ID and aspect IDs.
 * @method GET
 * @path /req-identification/search/subject/:subjectId/aspects
 * @middleware UserExtractor
 */
router.get('/req-identification/search/subject/:subjectId/aspects', UserExtractor, getReqIdentificationsBySubjectAndAspects)

/**
 * Updates a requirement identification by its ID.
 * @method PATCH
 * @path /req-identification/:id
 * @middleware UserExtractor
 */
router.patch('/req-identification/:id', UserExtractor, updateReqIdentification)

/**
 * Route to delete a requirement identification by ID.
 * @method DELETE
 * @path /req-identification/:id
 * @description Deletes a requirement identification by its ID.
 * @middleware UserExtractor
 */
router.delete('/req-identification/:id', UserExtractor, deleteReqIdentification)

/**
 * Route to delete multiple requirement identifications using an array of IDs.
 * @method DELETE
 * @path /req-identification/delete/batch
 * @body {Array<number>} reqIdentificationIds - Array of IDs of the requirement identifications to delete.
 * @description Deletes multiple requirement identifications from the system.
 * @middleware UserExtractor
 */
router.delete('/req-identification/delete/batch', UserExtractor, deleteReqIdentificationsBatch)

// -----------------------------------------------------------------------------
// TODO: Crear los siguientes endpoints para gestionar relaciones dentro de una
// identificación de requerimientos:
// -----------------------------------------------------------------------------

/**
 * Asociar un requerimiento a una identificación de requerimientos.
 * @method POST
 * @path /req-identification/requirements/:id
 * @description Asocia un requerimiento a la identificación con ID `:id`.
 */

/**
 * Desasociar un requerimiento de una identificación de requerimientos.
 * @method DELETE
 * @path /req-identification/requirements/:id
 * @description Elimina la asociación de un requerimiento de la identificación con ID `:id`.
 */

/**
 * Actualizar el nombre del requerimiento dentro de una identificación.
 * @method PATCH
 * @path /req-identification/requirements/:id
 * @body { requirementId: number, requirementName: string }
 * @description Actualiza el nombre del requerimiento en la relación dentro de la identificación con ID `:id`.
 */

export default router
