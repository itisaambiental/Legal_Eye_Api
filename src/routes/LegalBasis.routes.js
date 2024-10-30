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
  getLegalBasisByStateAndMunicipality
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
 * @path /fundamentos
 * @description Allows an authorized user to create a new legal basis record.
 * @middlewares upload.single('document'), UserExtractor
 */
router.post('/fundamentos', upload.single('document'), UserExtractor, createLegalBasis)

/**
 * Route to retrieve all legal basis records.
 * @method GET
 * @path /fundamentos
 * @description Retrieves all legal basis records.
 * @middleware UserExtractor
 */
router.get('/fundamentos', UserExtractor, getAllLegalBasis)

/**
 * Route to retrieve a legal basis by its ID.
 * @method GET
 * @path /fundamento/id/:id
 * @param {string} id - The ID of the legal basis to retrieve.
 * @description Retrieves a specific legal basis by its ID.
 * @middleware UserExtractor
 */
router.get('/fundamento/:id', UserExtractor, getLegalBasisById)

/**
 * Route to retrieve a legal basis by its name.
 * @method GET
 * @path /fundamento/name/:name
 * @param {string} name - The name of the legal basis to retrieve.
 * @description Retrieves a specific legal basis by its name.
 * @middleware UserExtractor
 */
router.get('/fundamento/name/:name', UserExtractor, getLegalBasisByName)

/**
 * Route to retrieve a legal basis by its abbreviation.
 * @method GET
 * @path /fundamento/abbreviation/:abbreviation
 * @param {string} abbreviation - The abbreviation of the legal basis to retrieve.
 * @description Retrieves a specific legal basis by its abbreviation.
 * @middleware UserExtractor
 */
router.get('/fundamento/abbreviation/:abbreviation', UserExtractor, getLegalBasisByAbbreviation)

/**
 * Route to retrieve a legal basis by its classification.
 * @method GET
 * @path /fundamento/classification/:classification
 * @param {string} classification - The classification of the legal basis to retrieve.
 * @description Retrieves a list of legal basis records by their classification.
 * @middleware UserExtractor
 */
router.get('/fundamento/classification/:classification', UserExtractor, getLegalBasisByClassification)

/**
 * Route to retrieve legal basis entries filtered by jurisdiction.
 * @method GET
 * @path /fundamento/jurisdiction/:jurisdiction
 * @description Retrieves legal basis entries by jurisdiction.
 * @param {string} jurisdiction - The jurisdiction to filter by.
 * @middleware UserExtractor
 */
router.get('/fundamento/jurisdiction/:jurisdiction', UserExtractor, getLegalBasisByJurisdiction)

/**
 * Route to retrieve legal basis entries filtered by state and municipality.
 * @method GET
 * @path /fundamento/filter
 * @description Retrieves legal basis entries by state and optionally by municipality.
 * @query {string} state - The state to filter by.
 * @query {string} [municipality] - The municipality to filter by (optional).
 * @middleware UserExtractor
 */
router.get('/fundamento/state-municipality', UserExtractor, getLegalBasisByStateAndMunicipality)

router.patch('/fundamento/:id', UserExtractor)
router.delete('/fundamento/:id', UserExtractor)

export default router
