/**
 * Routes module for legal basis operations.
 * Defines the API endpoints for legal basis records.
 */

import { Router } from 'express'
import UserExtractor from '../middleware/access_token.js'
import {
  createLegalBasis,
  getAllLegalBasis,
  getLegalBasisById,
  getLegalBasisByName,
  getLegalBasisByAbbreviation,
  getLegalBasisByClassification,
  getLegalBasisByJurisdiction,
  getLegalBasisByStateAndMunicipality,
  getLegalBasisBySubject,
  getLegalBasisBySubjectAndAspects,
  updateLegalBasis,
  deleteLegalBasis,
  deleteLegalBasisBatch
} from '../controllers/LegalBasis.controller.js'
import { upload } from '../config/multer.config.js'

/**
 * LegalBasisRouter
 * @type {Router}
 */
const router = Router()

/**
 * Route to create a new legal basis.
 * @method POST
 * @path /legalBases
 * @description Allows an authorized user to create a new legal basis record.
 * @middlewares upload.single('document'), UserExtractor
 */
router.post('/legalBasis', upload.single('document'), UserExtractor, createLegalBasis)

/**
 * Route to retrieve all legal basis records.
 * @method GET
 * @path /legalBases
 * @description Retrieves all legal basis records.
 * @middleware UserExtractor
 */
router.get('/legalBasis', UserExtractor, getAllLegalBasis)

/**
 * Route to retrieve a legal basis by its ID.
 * @method GET
 * @path /legalBasis/:id
 * @param {string} id - The ID of the legal basis to retrieve.
 * @description Retrieves a specific legal basis by its ID.
 * @middleware UserExtractor
 */
router.get('/legalBasis/:id', UserExtractor, getLegalBasisById)

/**
 * Route to retrieve a legal basis by its name.
 * @method GET
 * @path /legalBasis/name/:name
 * @param {string} name - The name of the legal basis to retrieve.
 * @description Retrieves a specific legal basis by its name.
 * @middleware UserExtractor
 */
router.get('/legalBasis/name/:name', UserExtractor, getLegalBasisByName)

/**
 * Route to retrieve a legal basis by its abbreviation.
 * @method GET
 * @path /legalBasis/abbreviation/:abbreviation
 * @param {string} abbreviation - The abbreviation of the legal basis to retrieve.
 * @description Retrieves a specific legal basis by its abbreviation.
 * @middleware UserExtractor
 */
router.get('/legalBasis/abbreviation/:abbreviation', UserExtractor, getLegalBasisByAbbreviation)

/**
 * Route to retrieve a legal basis by its classification.
 * @method GET
 * @path /legalBasis/classification/:classification
 * @param {string} classification - The classification of the legal basis to retrieve.
 * @description Retrieves a list of legal basis records by their classification.
 * @middleware UserExtractor
 */
router.get('/legalBasis/classification/:classification', UserExtractor, getLegalBasisByClassification)

/**
 * Route to retrieve legal basis entries filtered by jurisdiction.
 * @method GET
 * @path /legalBasis/jurisdiction/:jurisdiction
 * @description Retrieves legal basis entries by jurisdiction.
 * @param {string} jurisdiction - The jurisdiction to filter by.
 * @middleware UserExtractor
 */
router.get('/legalBasis/jurisdiction/:jurisdiction', UserExtractor, getLegalBasisByJurisdiction)

/**
 * Route to retrieve legal basis entries filtered by state and municipality.
 * @method GET
 * @path /legalBasis/state-municipality
 * @description Retrieves legal basis entries by state and optionally by municipality.
 * @query {string} state - The state to filter by.
 * @query {string} [municipality] - The municipality to filter by (optional).
 * @middleware UserExtractor
 */
router.get('/legalBasis/state-municipality', UserExtractor, getLegalBasisByStateAndMunicipality)

/**
 * Route to retrieve legal basis entries filtered by subject.
 * @method GET
 * @path /legalBasis/subject/:subjectId
 * @description Retrieves legal basis entries by subject.
 * @param {string} subjectId - The subject ID to filter by.
 * @middleware UserExtractor
 */
router.get('/legalBasis/subject/:subjectId', UserExtractor, getLegalBasisBySubject)

/**
 * Route to retrieve legal basis entries filtered by subject and optionally by aspects.
 * @method GET
 * @path /legalBasis/subject-aspects
 * @description Retrieves legal basis entries by subject and optionally by aspects.
 * @query {string} subjectId - The subject ID to filter by.
 * @query {string} [aspectIds] - Comma-separated list of aspect IDs to filter by (optional).
 * @middleware UserExtractor
 */
router.get('/legalBasis/subject-aspects', UserExtractor, getLegalBasisBySubjectAndAspects)

/**
 * Route to create a new legal basis.
 * @method PATCH
 * @path /legalBases/:id
 * @description Allows an authorized user to update a legal basis record.
 * @middlewares upload.single('document'), UserExtractor
 * @param {number} id - The ID of the legal basis to update.
 */
router.patch('/legalBasis/:id', upload.single('document'), UserExtractor, updateLegalBasis)

/**
 * Route to delete a legal basis.
 * @method DELETE
 * @path /legalBases/:id
 * @description Allows an authorized user to delete a legal basis record.
 * @middlewares UserExtractor
 * @param {number} id - The ID of the legal basis to delete.
 */
router.delete('/legalBasis/:id', UserExtractor, deleteLegalBasis)

/**
 * Route to delete multiple Legal basis using an array of IDs.
 * @method DELETE
 * @path /legalBases/batch
 * @description Allows an authorized user to delete multiple legal basis record.
 * @middlewares UserExtractor
 */
router.delete('/legalBases/batch', UserExtractor, deleteLegalBasisBatch)

export default router
