import LegalBasisRepository from '../../repositories/LegalBasis.repository.js'
import extractArticlesQueue from '../../workers/extractArticlesWorker.js'
import legalBasisSchema from '../../schemas/legalBasis.schema.js'
import sendLegalBasisQueue from '../../workers/sendLegalBasisWorker.js'
import SubjectsRepository from '../../repositories/Subject.repository.js'
import AspectsRepository from '../../repositories/Aspects.repository.js'
import ExtractArticlesService from '../articles/extractArticles/ExtractArticles.service.js'
import SendLegalBasisService from './sendLegalBasis/SendLegalBasis.service.js'
import { z } from 'zod'
import HttpException from '../errors/HttpException.js'
import FileService from '../files/File.service.js'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
/**
 * Service class for handling Legal Basis operations.
 */
class LegalBasisService {
/**
 * @typedef {Object} Aspect
 * @property {number} aspect_id - The ID of the aspect.
 * @property {string} aspect_name - The name of the aspect.
 * @property {string} [abbreviation] - Optional abbreviation for the aspect.
 * @property {number} [order_index] - Optional order index for the aspect.
 */

  /**
 * @typedef {Object} Subject
 * @property {number} subject_id - The ID of the subject.
 * @property {string} subject_name - The name of the subject.
 * @property {string} [abbreviation] - Optional abbreviation for the subject.
 * @property {number} [order_index] - Optional order index for the subject.
 */

  /**
   * @typedef {Object} LegalBasis
   * @property {number} id - The unique identifier of the legal basis.
   * @property {string} legal_name - The name of the legal document.
   * @property {Subject} subject - The subject associated with the legal basis.
   * @property {Aspect[]} aspects - The aspects associated with the legal basis.
   * @property {string} abbreviation - The abbreviation of the legal document.
   * @property {string} classification - The classification of the legal document.
   * @property {string} jurisdiction - The jurisdiction ('Estatal', 'Federal', etc.).
   * @property {string} [state] - The state associated with the legal basis, if applicable.
   * @property {string} [municipality] - The municipality associated with the legal basis, if applicable.
   * @property {string|null} lastReform - The date of the last reform (formatted as dd-MM-yyyy or ISO).
   * @property {string|null} url - The URL to the legal document.
   * @property {string|null} fileKey - The key of the file in S3 system.
   */

  /**
   * @typedef {Object} CreatedLegalBasis
   * @property {string|number|null} jobId - The ID of the article extraction job, if created; otherwise, null.
   * @property {LegalBasis & { fileKey?: string|null }} legalBasis - The object containing the created legal basis information.
   */

  /**
   * @typedef {Object} UpdatedLegalBasis
   * @property {string|number|null} jobId - The ID of the article extraction job, if updated; otherwise, null.
   * @property {LegalBasis & { fileKey?: string|null }} legalBasis - The object containing the updated legal basis information.
   */

  /**
   * Creates a new legal basis entry.
   *
   * @param {number} userId - The ID of the user creating the legal basis.
   * @param {Object} legalBasis - Parameters for creating a legal basis.
   * @param {string} legalBasis.legalName - The legal basis name.
   * @param {string} legalBasis.abbreviation - The legal basis abbreviation.
   * @param {string} legalBasis.subjectId - The legal basis subject ID.
   * @param {string} legalBasis.aspectsIds - The aspects IDs associated with the legal basis.
   * @param {string} legalBasis.classification - The legal basis classification.
   * @param {string} legalBasis.jurisdiction - The jurisdiction of the legal basis.
   * @param {string} [legalBasis.state] - The state associated with the legal basis.
   * @param {string} [legalBasis.municipality] - The municipality associated with the legal basis.
   * @param {string} legalBasis.lastReform - The date of the last reform.
   * @param {boolean} legalBasis.extractArticles - Indicator whether to extract articles from the document.
   * @param {string} legalBasis.intelligenceLevel - Level of intelligence to extract the articles
   * @param {Express.Multer.File} [document] - The document to process (optional).
   * @returns {Promise<CreatedLegalBasis>} A promise that resolves with an object containing the jobId (if applicable) and the created legal basis data.
   * @throws {HttpException} If an error occurs during validation or creation.
   */
  static async create (userId, legalBasis, document) {
    try {
      const parsedlegalBasis = legalBasisSchema.parse({
        ...legalBasis,
        document
      })
      const legalBasisExists = await LegalBasisRepository.existsByName(
        parsedlegalBasis.legalName
      )
      if (legalBasisExists) {
        throw new HttpException(409, 'LegalBasis already exists')
      }
      const abbreviationExists =
        await LegalBasisRepository.existsByAbbreviation(
          parsedlegalBasis.abbreviation
        )
      if (abbreviationExists) {
        throw new HttpException(409, 'LegalBasis abbreviation already exists')
      }
      const subjectExists = await SubjectsRepository.findById(
        parsedlegalBasis.subjectId
      )
      if (!subjectExists) {
        throw new HttpException(404, 'Subject not found')
      }
      const validAspectIds = await AspectsRepository.findByIds(
        parsedlegalBasis.aspectsIds
      )
      if (validAspectIds.length !== parsedlegalBasis.aspectsIds.length) {
        const notFoundIds = parsedlegalBasis.aspectsIds.filter(
          (id) => !validAspectIds.includes(id)
        )
        throw new HttpException(404, 'Aspects not found for IDs', { notFoundIds })
      }
      if (parsedlegalBasis.extractArticles && !document) {
        throw new HttpException(
          400,
          'A document must be provided if extractArticles is true'
        )
      }
      let documentKey = null
      if (document) {
        const uploadResponse = await FileService.uploadFile(document)
        if (uploadResponse.response.$metadata.httpStatusCode !== 200) {
          throw new HttpException(500, 'File Upload Error')
        }
        documentKey = uploadResponse.uniqueFileName
      }
      const legalBasisData = {
        ...parsedlegalBasis,
        url: documentKey
      }
      const createdLegalBasis = await LegalBasisRepository.create(
        legalBasisData
      )
      let documentUrl = null
      let jobId = null
      if (documentKey) {
        documentUrl = await FileService.getFile(documentKey)
        if (parsedlegalBasis.extractArticles) {
          const job = await extractArticlesQueue.add({
            userId,
            legalBasisId: createdLegalBasis.id,
            intelligenceLevel: parsedlegalBasis.intelligenceLevel
          })
          jobId = job.id
        }
      }
      let formattedLastReform = null
      if (createdLegalBasis.lastReform) {
        formattedLastReform = format(
          new Date(createdLegalBasis.lastReform),
          'dd-MM-yyyy',
          { locale: es }
        )
      }
      const { lastReform, ...legalBases } = createdLegalBasis
      return {
        jobId,
        legalBasis: {
          ...legalBases,
          last_reform: formattedLastReform,
          url: documentUrl,
          fileKey: documentKey
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors = error.errors.map((e) => ({
          field: e.path[0],
          message: e.message
        }))
        throw new HttpException(400, 'Validation failed', validationErrors)
      }
      if (error instanceof HttpException) {
        throw error
      }
      throw new HttpException(500, 'Unexpected error during legal basis creation')
    }
  }

  /**
   * Retrieves all legal basis entries from the database.
   * @returns {Promise<Array<LegalBasis>>} - A list of all legal basis entries.
   * @throws {HttpException} - If an error occurs during retrieval.
   */
  static async getAll () {
    try {
      const legalBasis = await LegalBasisRepository.findAll()
      if (!legalBasis) {
        return []
      }
      const legalBases = await Promise.all(
        legalBasis.map(async (legalBasis) => {
          let documentUrl = null
          if (legalBasis.url) {
            documentUrl = await FileService.getFile(legalBasis.url)
          }
          let formattedLastReform = null
          if (legalBasis.lastReform) {
            formattedLastReform = format(
              new Date(legalBasis.lastReform),
              'dd-MM-yyyy',
              { locale: es }
            )
          }
          return {
            id: legalBasis.id,
            legal_name: legalBasis.legal_name,
            subject: legalBasis.subject,
            aspects: legalBasis.aspects,
            classification: legalBasis.classification,
            jurisdiction: legalBasis.jurisdiction,
            state: legalBasis.state,
            municipality: legalBasis.municipality,
            last_reform: formattedLastReform,
            abbreviation: legalBasis.abbreviation,
            url: documentUrl,
            fileKey: legalBasis.url
          }
        })
      )

      return legalBases
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      throw new HttpException(500, 'Failed to retrieve legal basis records')
    }
  }

  /**
   * Retrieves a legal basis entry by its ID.
   * @param {number} id - The ID of the legal basis to retrieve.
   * @returns {Promise<LegalBasis>} - The legal basis entry.
   * @throws {HttpException} - If an error occurs during retrieval.
   */
  static async getById (id) {
    try {
      const legalBase = await LegalBasisRepository.findById(id)
      if (!legalBase) {
        throw new HttpException(404, 'LegalBasis not found')
      }
      let documentUrl = null
      if (legalBase.url) {
        documentUrl = await FileService.getFile(legalBase.url)
      }
      let formattedLastReform = null
      if (legalBase.lastReform) {
        formattedLastReform = format(
          new Date(legalBase.lastReform),
          'dd-MM-yyyy',
          { locale: es }
        )
      }
      return {
        id: legalBase.id,
        legal_name: legalBase.legal_name,
        subject: legalBase.subject,
        aspects: legalBase.aspects,
        classification: legalBase.classification,
        jurisdiction: legalBase.jurisdiction,
        state: legalBase.state,
        municipality: legalBase.municipality,
        last_reform: formattedLastReform,
        abbreviation: legalBase.abbreviation,
        url: documentUrl,
        fileKey: legalBase.url
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      throw new HttpException(500, 'Failed to retrieve legal basis record by ID')
    }
  }

  /**
   * Retrieves all legal basis entries by name.
   * @param {string} legalName - The name or part of the name of the legal basis to retrieve.
   * @returns {Promise<Array<LegalBasis>>} - A list of legal basis entries matching the name.
   * @throws {HttpException} - If an error occurs during retrieval.
   */
  static async getByName (legalName) {
    try {
      const legalBasis = await LegalBasisRepository.findByName(legalName)
      if (!legalBasis) {
        return []
      }
      const legalBases = await Promise.all(
        legalBasis.map(async (legalBase) => {
          let documentUrl = null
          if (legalBase.url) {
            documentUrl = await FileService.getFile(legalBase.url)
          }

          let formattedLastReform = null
          if (legalBase.lastReform) {
            formattedLastReform = format(
              new Date(legalBase.lastReform),
              'dd-MM-yyyy',
              { locale: es }
            )
          }

          return {
            id: legalBase.id,
            legal_name: legalBase.legal_name,
            subject: legalBase.subject,
            aspects: legalBase.aspects,
            classification: legalBase.classification,
            jurisdiction: legalBase.jurisdiction,
            state: legalBase.state,
            municipality: legalBase.municipality,
            last_reform: formattedLastReform,
            abbreviation: legalBase.abbreviation,
            url: documentUrl,
            fileKey: legalBase.url
          }
        })
      )
      return legalBases
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      throw new HttpException(
        500,
        'Failed to retrieve legal basis records by name'
      )
    }
  }

  /**
   * Retrieves all legal basis entry by abbreviation.
   * @param {string} abbreviation - The abbreviation or part of the abbreviation of the legal basis to retrieve.
   * @returns {Promise<Array<LegalBasis>>} - A list of legal basis entries matching the abbreviation.
   * @throws {HttpException} - If an error occurs during retrieval.
   */
  static async getByAbbreviation (abbreviation) {
    try {
      const legalBasis = await LegalBasisRepository.findByAbbreviation(
        abbreviation
      )
      if (!legalBasis) {
        return []
      }
      const legalBases = await Promise.all(
        legalBasis.map(async (legalBasis) => {
          let documentUrl = null
          if (legalBasis.url) {
            documentUrl = await FileService.getFile(legalBasis.url)
          }
          let formattedLastReform = null
          if (legalBasis.lastReform) {
            formattedLastReform = format(
              new Date(legalBasis.lastReform),
              'dd-MM-yyyy',
              { locale: es }
            )
          }
          return {
            id: legalBasis.id,
            legal_name: legalBasis.legal_name,
            subject: legalBasis.subject,
            aspects: legalBasis.aspects,
            classification: legalBasis.classification,
            jurisdiction: legalBasis.jurisdiction,
            state: legalBasis.state,
            municipality: legalBasis.municipality,
            last_reform: formattedLastReform,
            abbreviation: legalBasis.abbreviation,
            url: documentUrl,
            fileKey: legalBasis.url
          }
        })
      )
      return legalBases
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      throw new HttpException(
        500,
        'Failed to retrieve legal basis record by abbreviation'
      )
    }
  }

  /**
   * Retrieves all legal basis entries by their classification.
   * @param {string} classification - The classification of the legal basis to retrieve.
   * @returns {Promise<Array<LegalBasis>>} - A list of legal basis entries.
   * @throws {HttpException} - If an error occurs during retrieval.
   */
  static async getByClassification (classification) {
    try {
      const legalBasis = await LegalBasisRepository.findByClassification(
        classification
      )
      if (!legalBasis) {
        return []
      }
      const legalBases = await Promise.all(
        legalBasis.map(async (legalBasis) => {
          let documentUrl = null
          if (legalBasis.url) {
            documentUrl = await FileService.getFile(legalBasis.url)
          }
          let formattedLastReform = null
          if (legalBasis.lastReform) {
            formattedLastReform = format(
              new Date(legalBasis.lastReform),
              'dd-MM-yyyy',
              { locale: es }
            )
          }
          return {
            id: legalBasis.id,
            legal_name: legalBasis.legal_name,
            subject: legalBasis.subject,
            aspects: legalBasis.aspects,
            classification: legalBasis.classification,
            jurisdiction: legalBasis.jurisdiction,
            state: legalBasis.state,
            municipality: legalBasis.municipality,
            last_reform: formattedLastReform,
            abbreviation: legalBasis.abbreviation,
            url: documentUrl,
            fileKey: legalBasis.url
          }
        })
      )

      return legalBases
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      throw new HttpException(
        500,
        'Failed to retrieve legal basis records by classification'
      )
    }
  }

  /**
   * Retrieves legal basis entries filtered by jurisdiction.
   * @param {string} jurisdiction - The jurisdiction to filter by.
   * @returns {Promise<Array<LegalBasis>>} - A list of legal basis entries.
   * @throws {HttpException} - If an error occurs during retrieval.
   */
  static async getByJurisdiction (jurisdiction) {
    try {
      const legalBasis = await LegalBasisRepository.findByJurisdiction(
        jurisdiction
      )
      if (!legalBasis) {
        return []
      }
      const legalBases = await Promise.all(
        legalBasis.map(async (legalBasis) => {
          let documentUrl = null
          if (legalBasis.url) {
            documentUrl = await FileService.getFile(legalBasis.url)
          }
          let formattedLastReform = null
          if (legalBasis.lastReform) {
            formattedLastReform = format(
              new Date(legalBasis.lastReform),
              'dd-MM-yyyy',
              { locale: es }
            )
          }
          return {
            id: legalBasis.id,
            legal_name: legalBasis.legal_name,
            subject: legalBasis.subject,
            aspects: legalBasis.aspects,
            classification: legalBasis.classification,
            jurisdiction: legalBasis.jurisdiction,
            state: legalBasis.state,
            municipality: legalBasis.municipality,
            last_reform: formattedLastReform,
            abbreviation: legalBasis.abbreviation,
            url: documentUrl,
            fileKey: legalBasis.url
          }
        })
      )
      return legalBases
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      throw new HttpException(
        500,
        'Failed to retrieve legal basis records by jurisdiction'
      )
    }
  }

  /**
   * Retrieves legal basis entries filtered by state.
   * @param {string} state - The state to filter by.
   * @returns {Promise<Array<LegalBasis>>} - A list of legal basis entries.
   * @throws {HttpException} - If an error occurs during retrieval.
   */
  static async getByState (state) {
    try {
      const legalBasis = await LegalBasisRepository.findByState(state)
      if (!legalBasis) {
        return []
      }
      const legalBases = await Promise.all(
        legalBasis.map(async (legalBasis) => {
          let documentUrl = null
          if (legalBasis.url) {
            documentUrl = await FileService.getFile(legalBasis.url)
          }
          let formattedLastReform = null
          if (legalBasis.lastReform) {
            formattedLastReform = format(
              new Date(legalBasis.lastReform),
              'dd-MM-yyyy',
              { locale: es }
            )
          }
          return {
            id: legalBasis.id,
            legal_name: legalBasis.legal_name,
            subject: legalBasis.subject,
            aspects: legalBasis.aspects,
            classification: legalBasis.classification,
            jurisdiction: legalBasis.jurisdiction,
            state: legalBasis.state,
            municipality: legalBasis.municipality,
            last_reform: formattedLastReform,
            abbreviation: legalBasis.abbreviation,
            url: documentUrl,
            fileKey: legalBasis.url
          }
        })
      )

      return legalBases
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      throw new HttpException(
        500,
        'Failed to retrieve legal basis records by state'
      )
    }
  }

  /**
   * Retrieves legal basis entries filtered by state and optionally by municipalities.
   * @param {string} state - The state to filter by.
   * @param {Array<string>} [municipalities] - An array of municipalities to filter by (optional).
   * @returns {Promise<Array<LegalBasis>>} - A list of legal basis entries.
   * @throws {HttpException} - If an error occurs during retrieval.
   */
  static async getByStateAndMunicipalities (state, municipalities = []) {
    try {
      const legalBasis =
        await LegalBasisRepository.findByStateAndMunicipalities(
          state,
          municipalities
        )
      if (!legalBasis) {
        return []
      }
      const legalBases = await Promise.all(
        legalBasis.map(async (legalBasis) => {
          let documentUrl = null
          if (legalBasis.url) {
            documentUrl = await FileService.getFile(legalBasis.url)
          }
          let formattedLastReform = null
          if (legalBasis.lastReform) {
            formattedLastReform = format(
              new Date(legalBasis.lastReform),
              'dd-MM-yyyy',
              { locale: es }
            )
          }
          return {
            id: legalBasis.id,
            legal_name: legalBasis.legal_name,
            subject: legalBasis.subject,
            aspects: legalBasis.aspects,
            classification: legalBasis.classification,
            jurisdiction: legalBasis.jurisdiction,
            state: legalBasis.state,
            municipality: legalBasis.municipality,
            last_reform: formattedLastReform,
            abbreviation: legalBasis.abbreviation,
            url: documentUrl,
            fileKey: legalBasis.url
          }
        })
      )

      return legalBases
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      throw new HttpException(
        500,
        'Failed to retrieve legal basis records by state and municipalities'
      )
    }
  }

  /**
   * Retrieves legal basis entries filtered by a specific subject.
   * @param {number} subjectId - The subject ID to filter by.
   * @returns {Promise<Array<LegalBasis>>} - A list of legal basis entries.
   * @throws {HttpException} - If an error occurs during retrieval.
   */
  static async getBySubject (subjectId) {
    try {
      const subject = await SubjectsRepository.findById(subjectId)
      if (!subject) {
        throw new HttpException(404, 'Subject not found')
      }
      const legalBasis = await LegalBasisRepository.findBySubject(subjectId)
      if (!legalBasis) {
        return []
      }
      const legalBases = await Promise.all(
        legalBasis.map(async (legalBasis) => {
          let documentUrl = null
          if (legalBasis.url) {
            documentUrl = await FileService.getFile(legalBasis.url)
          }
          let formattedLastReform = null
          if (legalBasis.lastReform) {
            formattedLastReform = format(
              new Date(legalBasis.lastReform),
              'dd-MM-yyyy',
              { locale: es }
            )
          }
          return {
            id: legalBasis.id,
            legal_name: legalBasis.legal_name,
            subject: legalBasis.subject,
            aspects: legalBasis.aspects,
            classification: legalBasis.classification,
            jurisdiction: legalBasis.jurisdiction,
            state: legalBasis.state,
            municipality: legalBasis.municipality,
            last_reform: formattedLastReform,
            abbreviation: legalBasis.abbreviation,
            url: documentUrl,
            fileKey: legalBasis.url
          }
        })
      )
      return legalBases
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      throw new HttpException(
        500,
        'Failed to retrieve legal basis records by subject'
      )
    }
  }

  /**
   * Retrieves legal basis entries filtered by a specific subject and optionally by aspects.
   * @param {number} subjectId - The subject ID to filter by.
   * @param {Array<number>} [aspectIds] - Optional array of aspect IDs to further filter by.
   * @returns {Promise<Array<LegalBasis>>} - A list of legal basis entries.
   * @throws {HttpException} - If an error occurs during retrieval.
   */
  static async getBySubjectAndAspects (subjectId, aspectIds = []) {
    try {
      const subject = await SubjectsRepository.findById(subjectId)
      if (!subject) {
        throw new HttpException(404, 'Subject not found')
      }
      const existingAspects = await AspectsRepository.findByIds(aspectIds)
      if (existingAspects.length !== aspectIds.length) {
        const notFoundIds = aspectIds.filter(
          (id) => !existingAspects.some((aspect) => aspect.id === id)
        )
        throw new HttpException(404, 'Aspects not found for IDs', { notFoundIds })
      }
      const legalBasis = await LegalBasisRepository.findBySubjectAndAspects(
        subjectId,
        aspectIds
      )
      if (!legalBasis) {
        return []
      }
      const legalBases = await Promise.all(
        legalBasis.map(async (legalBasis) => {
          let documentUrl = null
          if (legalBasis.url) {
            documentUrl = await FileService.getFile(legalBasis.url)
          }
          let formattedLastReform = null
          if (legalBasis.lastReform) {
            formattedLastReform = format(
              new Date(legalBasis.lastReform),
              'dd-MM-yyyy',
              { locale: es }
            )
          }
          return {
            id: legalBasis.id,
            legal_name: legalBasis.legal_name,
            subject: legalBasis.subject,
            aspects: legalBasis.aspects,
            classification: legalBasis.classification,
            jurisdiction: legalBasis.jurisdiction,
            state: legalBasis.state,
            municipality: legalBasis.municipality,
            last_reform: formattedLastReform,
            abbreviation: legalBasis.abbreviation,
            url: documentUrl,
            fileKey: legalBasis.url
          }
        })
      )

      return legalBases
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      throw new HttpException(
        500,
        'Failed to retrieve legal basis records by subject and aspects'
      )
    }
  }

  /**
 * Retrieves legal basis entries by dynamic filters.
 *
 * @param {Object} filters - The filtering criteria.
 * @param {string} [filters.jurisdiction] - Optional jurisdiction value.
 * @param {string} [filters.state] - Optional state name.
 * @param {string} [filters.municipality] - Optional municipality.
 * @param {number} [filters.subjectId] - Optional subject ID.
 * @param {Array<number>} [filters.aspectIds] - Optional array of aspect IDs.
 * @returns {Promise<Array<LegalBasis>>} - A list of filtered and formatted legal basis records.
 * @throws {HttpException} - If an error occurs during retrieval.
 */
  static async getLegalBasisByCriteria (filters = {}) {
    try {
      const {
        jurisdiction,
        state,
        municipality,
        subjectId,
        aspectIds
      } = filters

      const legalBasis = await LegalBasisRepository.findLegalBasisByCriteria({
        jurisdiction,
        state,
        municipality,
        subjectId,
        aspectIds
      })

      if (!legalBasis) return []

      const legalBases = await Promise.all(
        legalBasis.map(async (legalBasis) => {
          let documentUrl = null
          if (legalBasis.url) {
            documentUrl = await FileService.getFile(legalBasis.url)
          }

          let formattedLastReform = null
          if (legalBasis.lastReform) {
            formattedLastReform = format(
              new Date(legalBasis.lastReform),
              'dd-MM-yyyy',
              { locale: es }
            )
          }

          return {
            id: legalBasis.id,
            legal_name: legalBasis.legal_name,
            subject: legalBasis.subject,
            aspects: legalBasis.aspects,
            classification: legalBasis.classification,
            jurisdiction: legalBasis.jurisdiction,
            state: legalBasis.state,
            municipality: legalBasis.municipality,
            last_reform: formattedLastReform,
            abbreviation: legalBasis.abbreviation,
            url: documentUrl,
            fileKey: legalBasis.url
          }
        })
      )

      return legalBases
    } catch (error) {
      if (error instanceof HttpException) throw error

      throw new HttpException(
        500,
        'Failed to retrieve legal basis records with filters'
      )
    }
  }

  /**
   * Retrieves legal basis entries filtered by a date range for the last_reform.
   * Both 'from' and 'to' are optional. If provided, they can be in 'YYYY-MM-DD' or 'DD-MM-YYYY'.
   *
   * @function getByLastReform
   * @param {string} [from] - Start date.
   * @param {string} [to] - End date.
   * @returns {Promise<Array<LegalBasis>>} - A list of legal basis entries filtered by the date range.
   * @throws {HttpException} - If an error occurs during retrieval.
   */
  static async getByLastReform (from, to) {
    try {
      const legalBasis = await LegalBasisRepository.findByLastReform(from, to)
      if (!legalBasis) {
        return []
      }
      const legalBases = await Promise.all(
        legalBasis.map(async (legalBasis) => {
          let documentUrl = null
          if (legalBasis.url) {
            documentUrl = await FileService.getFile(legalBasis.url)
          }
          let formattedLastReform = null
          if (legalBasis.lastReform) {
            formattedLastReform = format(
              new Date(legalBasis.lastReform),
              'dd-MM-yyyy',
              { locale: es }
            )
          }
          return {
            id: legalBasis.id,
            legal_name: legalBasis.legal_name,
            subject: legalBasis.subject,
            aspects: legalBasis.aspects,
            classification: legalBasis.classification,
            jurisdiction: legalBasis.jurisdiction,
            state: legalBasis.state,
            municipality: legalBasis.municipality,
            last_reform: formattedLastReform,
            abbreviation: legalBasis.abbreviation,
            url: documentUrl,
            fileKey: legalBasis.url
          }
        })
      )

      return legalBases
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      throw new HttpException(
        500,
        'Failed to retrieve legal basis records by last reform range'
      )
    }
  }

  /**
 * Sends selected Legal Basis entries to ACM Suite after validating them.
 *
 * @param {number} userId - The ID of the user sending legal basis.
 * @param {Array<number>} legalBasisIds - An array of Legal Basis IDs to send.
 * @returns {Promise<{ jobId: string|number|null }>} - The job ID created for sending legal basis.
 * @throws {HttpException} - If validation fails or no valid records are found.
 */
  static async sendLegalBasis (userId, legalBasisIds) {
    try {
      const legalBasis = await LegalBasisRepository.findByIds(legalBasisIds)
      if (legalBasis.length !== legalBasisIds.length) {
        const notFoundIds = legalBasisIds.filter(
          (id) => !legalBasis.some((legalBase) => legalBase.id === id)
        )
        throw new HttpException(404, 'LegalBasis not found for IDs', {
          notFoundIds
        })
      }
      const job = await sendLegalBasisQueue.add({
        userId,
        legalBasisIds
      })
      return { jobId: job.id }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      throw new HttpException(500, 'Unexpected error during send LegalBasis operation')
    }
  }

  /**
   * Updates an existing legal basis entry.
   *
   * @param {number} userId - The ID of the user updating the legal basis.
   * @param {number} legalBasisId - The ID of the legal basis to update.
   * @param {Object} legalBasis - Parameters for creating a legal basis.
   * @param {string} legalBasis.legalName - The legal basis name.
   * @param {string} legalBasis.abbreviation - The legal basis abbreviation.
   * @param {string} legalBasis.subjectId - The legal basis subject ID.
   * @param {string} legalBasis.aspectsIds - The aspects Ids associated with the legal basis.
   * @param {string} legalBasis.classification - The legal basis classification.
   * @param {string} legalBasis.jurisdiction - The jurisdiction of the legal basis.
   * @param {string} [legalBasis.state] - The state associated with the legal basis.
   * @param {string} [legalBasis.municipality] - The municipality associated with the legal basis.
   * @param {string} legalBasis.lastReform - The date of the last reform.
   * @param {string} legalBasis.extractArticles - Indicator whether to extract articles from the document.
   * @param {string} legalBasis.intelligenceLevel - Level of intelligence to extract the articles
   * @param {string} [legalBasis.removeDocument] - The flag to determine whether the document should be deleted.
   * @param {Express.Multer.File} [document] - The document to process (optional).
   * @returns {Promise<UpdatedLegalBasis>} A promise that resolves with an object containing the jobId (if an extraction job is initiated) and the updated legal basis data.
   * @throws {HttpException} If an error occurs during validation or update processing.
   */
  static async updateById (userId, legalBasisId, legalBasis, document) {
    try {
      const parsedlegalBasis = legalBasisSchema.parse({
        ...legalBasis,
        document
      })
      const existingLegalBasis = await LegalBasisRepository.findById(
        legalBasisId
      )
      if (!existingLegalBasis) {
        throw new HttpException(404, 'LegalBasis not found')
      }
      const legalBasisExists =
        await LegalBasisRepository.existsByNameExcludingId(
          parsedlegalBasis.legalName,
          legalBasisId
        )
      if (legalBasisExists) {
        throw new HttpException(409, 'LegalBasis already exists')
      }
      const abbreviationExists =
        await LegalBasisRepository.existsByAbbreviationExcludingId(
          parsedlegalBasis.abbreviation,
          legalBasisId
        )
      if (abbreviationExists) {
        throw new HttpException(409, 'LegalBasis abbreviation already exists')
      }

      const subjectExists = await SubjectsRepository.findById(
        parsedlegalBasis.subjectId
      )
      if (!subjectExists) {
        throw new HttpException(404, 'Subject not found')
      }
      const validAspectIds = await AspectsRepository.findByIds(
        parsedlegalBasis.aspectsIds
      )
      if (validAspectIds.length !== parsedlegalBasis.aspectsIds.length) {
        const notFoundIds = parsedlegalBasis.aspectsIds.filter(
          (id) => !validAspectIds.includes(id)
        )
        throw new HttpException(404, 'Aspects not found for IDs', { notFoundIds })
      }
      if (parsedlegalBasis.removeDocument && document) {
        throw new HttpException(
          400,
          'Cannot provide a document if removeDocument is true'
        )
      }
      const { hasPendingJobs } = await ExtractArticlesService.hasPendingExtractionJobs(
        legalBasisId
      )
      if (parsedlegalBasis.removeDocument && hasPendingJobs) {
        throw new HttpException(
          409,
          'The document cannot be removed because there are pending jobs for this Legal Basis'
        )
      }
      if (hasPendingJobs && document) {
        throw new HttpException(
          409,
          'A new document cannot be uploaded because there are pending jobs for this Legal Basis'
        )
      }
      if (parsedlegalBasis.extractArticles) {
        if (!document && !existingLegalBasis.url) {
          throw new HttpException(
            400,
            'A document must be provided if extractArticles is true'
          )
        }
        if (hasPendingJobs) {
          throw new HttpException(
            409,
            'Articles cannot be extracted because there is already a process that does so'
          )
        }
      }
      let documentKey = existingLegalBasis.url
      if (document && !parsedlegalBasis.removeDocument) {
        const uploadResponse = await FileService.uploadFile(document)
        if (uploadResponse.response.$metadata.httpStatusCode === 200) {
          if (existingLegalBasis.url) {
            await FileService.deleteFile(existingLegalBasis.url)
          }
          documentKey = uploadResponse.uniqueFileName
        } else {
          throw new HttpException(500, 'File Upload Error')
        }
      } else if (!document && parsedlegalBasis.removeDocument) {
        if (existingLegalBasis.url) {
          await FileService.deleteFile(existingLegalBasis.url)
        }
        documentKey = null
      }
      const updatedLegalBasisData = {
        ...parsedlegalBasis,
        url: documentKey
      }
      const updatedLegalBasis = await LegalBasisRepository.update(
        legalBasisId,
        updatedLegalBasisData
      )
      if (!updatedLegalBasis) {
        throw new HttpException(404, 'LegalBasis not found')
      }
      let documentUrl = null
      let jobId = null
      if (documentKey) {
        documentUrl = await FileService.getFile(documentKey)
        if (parsedlegalBasis.extractArticles) {
          const job = await extractArticlesQueue.add({
            userId,
            legalBasisId: updatedLegalBasis.id,
            intelligenceLevel: parsedlegalBasis.intelligenceLevel
          })
          jobId = job.id
        }
      }
      const formattedLastReform = updatedLegalBasis.lastReform
        ? format(new Date(updatedLegalBasis.lastReform), 'dd-MM-yyyy', {
          locale: es
        })
        : null
      const { lastReform, ...legalBases } = updatedLegalBasis
      return {
        jobId,
        legalBasis: {
          ...legalBases,
          last_reform: formattedLastReform,
          url: documentUrl,
          fileKey: documentKey
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors = error.errors.map((e) => ({
          field: e.path[0],
          message: e.message
        }))
        throw new HttpException(400, 'Validation failed', validationErrors)
      }
      if (error instanceof HttpException) {
        throw error
      }
      throw new HttpException(500, 'Unexpected error during legal basis update')
    }
  }

  /**
   * Deletes a Legal base by ID.
   * @param {number} legalBasisId - The ID of the Legal base to delete.
   * @returns {Promise<{ success: boolean }>} - An object indicating the deletion was successful.
   * @throws {HttpException} - If an error occurs during deletion.
   */
  static async deleteById (legalBasisId) {
    try {
      const legalBasis = await LegalBasisRepository.findById(legalBasisId)
      if (!legalBasis) {
        throw new HttpException(404, 'LegalBasis not found')
      }
      const { hasPendingJobs: hasPendingArticleExtractionJobs } =
        await ExtractArticlesService.hasPendingExtractionJobs(legalBasisId)
      if (hasPendingArticleExtractionJobs) {
        throw new HttpException(
          409,
          'Cannot delete LegalBasis with pending Article Extraction jobs'
        )
      }
      const { hasPendingJobs: hasPendingSendLegalBasisJobs } =
        await SendLegalBasisService.hasPendingSendJobs(legalBasisId)
      if (hasPendingSendLegalBasisJobs) {
        throw new HttpException(
          409,
          'Cannot delete LegalBasis with pending Send Legal Basis jobs'
        )
      }
      if (legalBasis.url) {
        await FileService.deleteFile(legalBasis.url)
      }
      const legalBasisDeleted = await LegalBasisRepository.delete(legalBasisId)
      if (!legalBasisDeleted) {
        throw new HttpException(404, 'LegalBasis not found')
      }
      return { success: true }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      throw new HttpException(500, 'Unexpected error during LegalBasis deletion')
    }
  }

  /**
 * Deletes multiple Legal Basis records by their IDs.
 * @param {Array<number>} legalBasisIds - An array of IDs of the Legal Basis records to delete.
 * @returns {Promise<{ success: boolean }>} - An object indicating the deletion was successful.
 * @throws {HttpException} - If any error occurs during the deletion process.
 */
  static async deleteBatch (legalBasisIds) {
    try {
      const legalBasis = await LegalBasisRepository.findByIds(legalBasisIds)
      if (legalBasis.length !== legalBasisIds.length) {
        const notFoundIds = legalBasisIds.filter(
          (id) => !legalBasis.some((legalBase) => legalBase.id === id)
        )
        throw new HttpException(404, 'LegalBasis not found for IDs', { notFoundIds })
      }
      const pendingArticleExtractionJobs = []
      const pendingSendLegalBasisJobs = []
      const urlsToDelete = []

      await Promise.all(
        legalBasis.map(async (legalBase) => {
          const { hasPendingJobs: hasPendingArticleExtractionJobs } =
          await ExtractArticlesService.hasPendingExtractionJobs(legalBase.id)

          const { hasPendingJobs: hasPendingSendLegalBasisJobs } =
          await SendLegalBasisService.hasPendingSendJobs(legalBase.id)

          if (hasPendingArticleExtractionJobs) {
            pendingArticleExtractionJobs.push({
              id: legalBase.id,
              name: legalBase.legal_name
            })
          }

          if (hasPendingSendLegalBasisJobs) {
            pendingSendLegalBasisJobs.push({
              id: legalBase.id,
              name: legalBase.legal_name
            })
          }

          if (legalBase.url) {
            urlsToDelete.push(legalBase.url)
          }
        })
      )

      if (pendingArticleExtractionJobs.length > 0) {
        throw new HttpException(
          409,
          'Cannot delete Legal Bases with pending Article Extraction jobs',
          { legalBases: pendingArticleExtractionJobs }
        )
      }

      if (pendingSendLegalBasisJobs.length > 0) {
        throw new HttpException(
          409,
          'Cannot delete Legal Bases with pending Send Legal Basis jobs',
          { legalBases: pendingSendLegalBasisJobs }
        )
      }

      await Promise.all(urlsToDelete.map((url) => FileService.deleteFile(url)))
      const legalBasisDeleted = await LegalBasisRepository.deleteBatch(legalBasisIds)
      if (!legalBasisDeleted) {
        throw new HttpException(404, 'LegalBasis not found')
      }

      return { success: true }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      throw new HttpException(500, 'Unexpected error during batch Legal Basis deletion')
    }
  }
}

export default LegalBasisService
