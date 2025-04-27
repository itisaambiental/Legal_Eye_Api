/**
 * Routes module for legal basis operations.
 * Defines the API endpoints for legal basis records.
 */

import { Router } from 'express'
import UserExtractor from '../middlewares/access_token.js'
import {
  createLegalBasis,
  getAllLegalBasis,
  getLegalBasisById,
  getLegalBasisByName,
  getLegalBasisByAbbreviation,
  getLegalBasisByClassification,
  getLegalBasisByJurisdiction,
  getLegalBasisByState,
  getLegalBasisByStateAndMunicipalities,
  getLegalBasisBySubject,
  getLegalBasisBySubjectAndAspects,
  getLegalBasisByLastReform,
  getLegalBasisByCriteria,
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
 * @path /legalBasis/name/name
 * @query {string} name - The name of the legal basis to retrieve.
 * @description Retrieves a specific legal basis by its name.
 * @middleware UserExtractor
 */
router.get('/legalBasis/name/name', UserExtractor, getLegalBasisByName)

/**
 * Route to retrieve a legal basis by its abbreviation.
 * @method GET
 * @path /legalBasis/abbreviation/abbreviation
 * @query {string} abbreviation - The abbreviation of the legal basis to retrieve.
 * @description Retrieves a specific legal basis by its abbreviation.
 * @middleware UserExtractor
 */
router.get('/legalBasis/abbreviation/abbreviation', UserExtractor, getLegalBasisByAbbreviation)

/**
 * Route to retrieve a legal basis by its classification.
 * @method GET
 * @path /legalBasis/classification/classification
 * @query {string} classification - The classification of the legal basis to retrieve.
 * @description Retrieves a list of legal basis records by their classification.
 * @middleware UserExtractor
 */
router.get('/legalBasis/classification/classification', UserExtractor, getLegalBasisByClassification)

/**
 * Route to retrieve legal basis entries filtered by jurisdiction.
 * @method GET
 * @path /legalBasis/jurisdiction/jurisdiction
 * @description Retrieves legal basis entries by jurisdiction.
 * @query {string} jurisdiction - The jurisdiction to filter by.
 * @middleware UserExtractor
 */
router.get('/legalBasis/jurisdiction/jurisdiction', UserExtractor, getLegalBasisByJurisdiction)

/**
 * Route to retrieve legal basis entries filtered by state.
 * @method GET
 * @path /legalBasis/state/state
 * @description Retrieves legal basis entries by state.
 * @query {string} state - The state to filter by.
 * @middleware UserExtractor
 */
router.get('/legalBasis/state/state', UserExtractor, getLegalBasisByState)

/**
 * Route to retrieve legal basis entries filtered by state and municipalities.
 * @method GET
 * @path /legalBasis/state/municipalities/query
 * @description Retrieves legal basis entries by state and optionally by municipalities.
 * @query {string} state - The state to filter by.
 * @query {Array<string>} [municipalities] - An array of municipalities to filter by (optional).
 * @middleware UserExtractor
 */
router.get('/legalBasis/state/municipalities/query', UserExtractor, getLegalBasisByStateAndMunicipalities)

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
 * @path /legalBasis/subject/:subjectId/aspects
 * @description Retrieves legal basis entries by subject and optionally by aspects.
 * @param {string} subjectId - The ID of the subject to filter by.
 * @param {Array<string>} [aspectIds] - Optional query parameter: aspect IDs.
 * @middleware UserExtractor
 */
router.get('/legalBasis/subject/:subjectId/aspects', UserExtractor, getLegalBasisBySubjectAndAspects)

/**
 * Route to retrieve legal basis entries by dynamic filters.
 *
 * @method GET
 * @path /legalBasis/criteria/query
 * @description Retrieves legal basis entries filtered dynamically by jurisdiction, state, municipalities, subject, and aspects.
 *
 * @query {string} [jurisdiction] - Optional jurisdiction level (e.g., "Federal", "Estatal", "Local").
 * @query {string} [state] - Optional state to filter by.
 * @query {Array<string>} [municipalities] - Optional array of municipalities to filter by.
 * @query {number} [subjectId] - Optional subject ID to filter by.
 * @query {Array<number>} [aspectIds] - Optional array of aspect IDs to further filter by.
 *
 * @middleware UserExtractor - Middleware to extract and validate user identity.
 */
router.get('/legalBasis/criteria/query', UserExtractor, getLegalBasisByCriteria)

/**
 * Route to retrieve legal basis entries filtered by a date range for the last_reform field.
 * @method GET
 * @path /legalBasis/lastReform/lastReform
 * @description Retrieves legal basis entries filtered by a date range on last_reform.
 * @query {string} [from] - The start date.
 * @query {string} [to] - The end date.
 * @middleware UserExtractor
 */
router.get('/legalBasis/lastReform/lastReform', UserExtractor, getLegalBasisByLastReform)

/**
 * Route to update a legal basis.
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
 * @body {Array<number>} legalBasisIds - Array of IDs of the legal basis to delete.
 * @path /legalBases/batch
 * @description Allows an authorized user to delete multiple legal basis record.
 * @middlewares UserExtractor
 */
router.delete('/legalBasis/delete/batch', UserExtractor, deleteLegalBasisBatch)

export default router
