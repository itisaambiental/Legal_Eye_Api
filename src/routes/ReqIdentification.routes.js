/**
 * Routes module for requirement identifications operations.
 * Defines the API endpoints for managing requirement identifications
 */

import { Router } from 'express'
import UserExtractor from '../middlewares/user_extractor.js'
import {
  createReqIdentification,
  getAllReqIdentifications
  // getReqIdentificationById,
  // detectRequirements,
  // updateReqIdentificationById,
  // deleteReqIdentificationById,
  // deleteAllReqIdentifications,
  // markReqIdentificationCompleted,
  // markReqIdentificationFailed,
  // linkRequirement,
  // unlinkRequirement,
  // getLinkedRequirements,
  // linkMetadata,
  // unlinkMetadata,
  // getLinkedMetadata,
  // linkLegalBasis,
  // unlinkLegalBasis,
  // getLinkedLegalBases,
  // linkArticle,
  // unlinkArticle,
  // getLinkedArticles,
  // linkLegalVerb,
  // unlinkLegalVerb,
  // getLinkedLegalVerbs
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

// PARA CADA CONTROLLER EN LOS CONTROLLERS DE FILTRADO SE DEBE IMPLEMENTAR UNA CONTROLADOR SIGUIENDO EL ESTANDAR Y GUIANDOSE DE LA RUTA  router.get('/req-identification', UserExtractor, getAllReqIdentifications).

// COMENZAR DESDE AQUI

// /**
//  * Retrieves a single req_identification by ID.
//  * @method GET
//  * @path /reqIdentification/:id
//  * @middleware UserExtractor
//  */
// router.get('/reqIdentification/:id', UserExtractor, getReqIdentificationById)

// /**
//  * Detects applicable requirements for a given identification based on subject and aspects,
//  * then links them into req_identifications_requirements.
//  * @method POST
//  * @path /reqIdentification/detectRequirements
//  * @middleware UserExtractor
//  */
// router.post('/reqIdentification/detectRequirements', UserExtractor, detectRequirements)

// /**
//  * Updates name and description of a req_identification.
//  * @method PATCH
//  * @path /reqIdentification/:id
//  * @middleware UserExtractor
//  */
// router.patch('/reqIdentification/:id', UserExtractor, updateReqIdentificationById)

// /**
//  * Deletes a req_identification by ID.
//  * @method DELETE
//  * @path /reqIdentification/:id
//  * @middleware UserExtractor
//  */
// router.delete('/reqIdentification/:id', UserExtractor, deleteReqIdentificationById)

// /**
//  * Deletes all req_identifications.
//  * @method DELETE
//  * @path /reqIdentification
//  * @middleware UserExtractor
//  */
// router.delete('/reqIdentification', UserExtractor, deleteAllReqIdentifications)

// /**
//  * Marks a req_identification as 'Completed'.
//  * @method PATCH
//  * @path /reqIdentification/:id/completed
//  * @middleware UserExtractor
//  */
// router.patch('/reqIdentification/:id/completed', UserExtractor, markReqIdentificationCompleted)

// /**
//  * Marks a req_identification as 'Failed'.
//  * @method PATCH
//  * @path /reqIdentification/:id/failed
//  * @middleware UserExtractor
//  */
// router.patch('/reqIdentification/:id/failed', UserExtractor, markReqIdentificationFailed)

// /**
//  * Links a requirement to a req_identification.
//  * @method POST
//  * @path /reqIdentification/linkRequirement
//  * @middleware UserExtractor
//  */
// router.post('/reqIdentification/linkRequirement', UserExtractor, linkRequirement)

// /**
//  * Unlinks a requirement from a req_identification.
//  * @method POST
//  * @path /reqIdentification/unlinkRequirement
//  * @middleware UserExtractor
//  */
// router.post('/reqIdentification/unlinkRequirement', UserExtractor, unlinkRequirement)

// /**
//  * Retrieves all requirements linked to a req_identification.
//  * @method GET
//  * @path /reqIdentification/:identificationId/requirements
//  * @middleware UserExtractor
//  */
// router.get('/reqIdentification/:identificationId/requirements', UserExtractor, getLinkedRequirements)

// /**
//  * Links metadata for a requirement.
//  * @method POST
//  * @path /reqIdentification/linkMetadata
//  * @middleware UserExtractor
//  */
// router.post('/reqIdentification/linkMetadata', UserExtractor, linkMetadata)

// /**
//  * Unlinks metadata for a requirement.
//  * @method POST
//  * @path /reqIdentification/unlinkMetadata
//  * @middleware UserExtractor
//  */
// router.post('/reqIdentification/unlinkMetadata', UserExtractor, unlinkMetadata)

// /**
//  * Retrieves metadata linked to a requirement.
//  * @method GET
//  * @path /reqIdentification/metadata
//  * @middleware UserExtractor
//  */
// router.get('/reqIdentification/metadata', UserExtractor, getLinkedMetadata)

// /**
//  * Links a legal basis to a requirement.
//  * @method POST
//  * @path /reqIdentification/linkLegalBasis
//  * @middleware UserExtractor
//  */
// router.post('/reqIdentification/linkLegalBasis', UserExtractor, linkLegalBasis)

// /**
//  * Unlinks a legal basis from a requirement.
//  * @method POST
//  * @path /reqIdentification/unlinkLegalBasis
//  * @middleware UserExtractor
//  */
// router.post('/reqIdentification/unlinkLegalBasis', UserExtractor, unlinkLegalBasis)

// /**
//  * Retrieves legal bases linked to a requirement.
//  * @method GET
//  * @path /reqIdentification/legalBases
//  * @middleware UserExtractor
//  */
// router.get('/reqIdentification/legalBases', UserExtractor, getLinkedLegalBases)

// /**
//  * Links an article to a requirement under a legal basis.
//  * @method POST
//  * @path /reqIdentification/linkArticle
//  * @middleware UserExtractor
//  */
// router.post('/reqIdentification/linkArticle', UserExtractor, linkArticle)

// /**
//  * Unlinks an article from a requirement under a legal basis.
//  * @method POST
//  * @path /reqIdentification/unlinkArticle
//  * @middleware UserExtractor
//  */
// router.post('/reqIdentification/unlinkArticle', UserExtractor, unlinkArticle)

// /**
//  * Retrieves articles linked to a requirement under a legal basis.
//  * @method GET
//  * @path /reqIdentification/articles
//  * @middleware UserExtractor
//  */
// router.get('/reqIdentification/articles', UserExtractor, getLinkedArticles)

// /**
//  * Links a legal verb translation to a requirement.
//  * @method POST
//  * @path /reqIdentification/linkLegalVerb
//  * @middleware UserExtractor
//  */
// router.post('/reqIdentification/linkLegalVerb', UserExtractor, linkLegalVerb)

// /**
//  * Unlinks a legal verb translation from a requirement.
//  * @method POST
//  * @path /reqIdentification/unlinkLegalVerb
//  * @middleware UserExtractor
//  */
// router.post('/reqIdentification/unlinkLegalVerb', UserExtractor, unlinkLegalVerb)

// /**
//  * Retrieves legal verb translations linked to a requirement.
//  * @method GET
//  * @path /reqIdentification/legalVerbs
//  * @middleware UserExtractor
//  */
// router.get('/reqIdentification/legalVerbs', UserExtractor, getLinkedLegalVerbs)

export default router
