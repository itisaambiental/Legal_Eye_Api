import LegalBasisRepository from '../../repositories/LegalBasis.repository.js'
import articlesQueue from '../../workers/articlesWorker.js'
import legalBasisSchema from '../../schemas/legalBasis.schema.js'
import SubjectsRepository from '../../repositories/Subject.repository.js'
import AspectsRepository from '../../repositories/Aspects.repository.js'
import extractArticles from '../articles/extractArticles/extractArticles.service.js'
import RequirementsIdentificationService from '../requirements/requirementsIdentification/requirementsIdentification.service.js'
import { z } from 'zod'
import ErrorUtils from '../../utils/Error.js'
import FileService from '../files/File.service.js'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
/**
 * Service class for handling Legal Basis operations.
 */
class LegalBasisService {
/**
 * @typedef {Object} LegalBasis
 * @property {number} id - The unique identifier of the legal basis.
 * @property {string} legal_name - The name of the legal document.
 * @property {Object} subject - The subject associated with the legal basis.
 * @property {number} subject.subject_id - The ID of the subject.
 * @property {string} subject.subject_name - The name of the subject.
 * @property {Array<Object>} aspects - The aspects associated with the legal basis.
 * @property {number} aspects[].aspect_id - The ID of the aspect.
 * @property {string} aspects[].aspect_name - The name of the aspect.
 * @property {string} abbreviation - The abbreviation of the legal document.
 * @property {string} classification - The classification of the legal document.
 * @property {string} jurisdiction - The jurisdiction ('Estatal', 'Federal', etc.).
 * @property {string} [state] - The state associated with the legal basis, if applicable.
 * @property {string} [municipality] - The municipality associated with the legal basis, if applicable.
 * @property {string|null} lastReform - The date of the last reform (formatted as dd-MM-yyyy or ISO).
 * @property {string|null} url - The URL to the legal document.
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
   * @throws {ErrorUtils} If an error occurs during validation or creation.
   */
  static async create (legalBasis, document) {
    try {
      const parsedlegalBasis = legalBasisSchema.parse({
        ...legalBasis,
        document
      })
      const legalBasisExists = await LegalBasisRepository.existsByName(
        parsedlegalBasis.legalName
      )
      if (legalBasisExists) {
        throw new ErrorUtils(409, 'LegalBasis already exists')
      }
      const abbreviationExists =
        await LegalBasisRepository.existsByAbbreviation(
          parsedlegalBasis.abbreviation
        )
      if (abbreviationExists) {
        throw new ErrorUtils(409, 'LegalBasis abbreviation already exists')
      }
      const subjectExists = await SubjectsRepository.findById(
        parsedlegalBasis.subjectId
      )
      if (!subjectExists) {
        throw new ErrorUtils(404, 'Subject not found')
      }
      const validAspectIds = await AspectsRepository.findByIds(
        parsedlegalBasis.aspectsIds
      )
      if (validAspectIds.length !== parsedlegalBasis.aspectsIds.length) {
        const notFoundIds = parsedlegalBasis.aspectsIds.filter(
          (id) => !validAspectIds.includes(id)
        )
        throw new ErrorUtils(404, 'Aspects not found for IDs', { notFoundIds })
      }
      if (parsedlegalBasis.extractArticles && !document) {
        throw new ErrorUtils(
          400,
          'A document must be provided if extractArticles is true'
        )
      }
      let documentKey = null
      if (document) {
        const uploadResponse = await FileService.uploadFile(document)
        if (uploadResponse.response.$metadata.httpStatusCode !== 200) {
          throw new ErrorUtils(500, 'File Upload Error')
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
          const job = await articlesQueue.add({
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
        throw new ErrorUtils(400, 'Validation failed', validationErrors)
      }
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Unexpected error during legal basis creation')
    }
  }

  /**
   * Retrieves all legal basis entries from the database.
   * @returns {Promise<Array<LegalBasis>>} - A list of all legal basis entries.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
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
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to retrieve legal basis records')
    }
  }

  /**
   * Retrieves a legal basis entry by its ID.
   * @param {number} id - The ID of the legal basis to retrieve.
   * @returns {Promise<LegalBasis>} - The legal basis entry.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async getById (id) {
    try {
      const legalBase = await LegalBasisRepository.findById(id)
      if (!legalBase) {
        throw new ErrorUtils(404, 'LegalBasis not found')
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
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to retrieve legal basis record by ID')
    }
  }

  /**
   * Retrieves all legal basis entries by name.
   * @param {string} legalName - The name or part of the name of the legal basis to retrieve.
   * @returns {Promise<Array<LegalBasis>>} - A list of legal basis entries matching the name.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
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
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(
        500,
        'Failed to retrieve legal basis records by name'
      )
    }
  }

  /**
   * Retrieves all legal basis entry by abbreviation.
   * @param {string} abbreviation - The abbreviation or part of the abbreviation of the legal basis to retrieve.
   * @returns {Promise<Array<LegalBasis>>} - A list of legal basis entries matching the abbreviation.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
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
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(
        500,
        'Failed to retrieve legal basis record by abbreviation'
      )
    }
  }

  /**
   * Retrieves all legal basis entries by their classification.
   * @param {string} classification - The classification of the legal basis to retrieve.
   * @returns {Promise<Array<LegalBasis>>} - A list of legal basis entries.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
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
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(
        500,
        'Failed to retrieve legal basis records by classification'
      )
    }
  }

  /**
   * Retrieves legal basis entries filtered by jurisdiction.
   * @param {string} jurisdiction - The jurisdiction to filter by.
   * @returns {Promise<Array<LegalBasis>>} - A list of legal basis entries.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
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
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(
        500,
        'Failed to retrieve legal basis records by jurisdiction'
      )
    }
  }

  /**
   * Retrieves legal basis entries filtered by state.
   * @param {string} state - The state to filter by.
   * @returns {Promise<Array<LegalBasis>>} - A list of legal basis entries.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
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
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(
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
   * @throws {ErrorUtils} - If an error occurs during retrieval.
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
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(
        500,
        'Failed to retrieve legal basis records by state and municipalities'
      )
    }
  }

  /**
   * Retrieves legal basis entries filtered by a specific subject.
   * @param {number} subjectId - The subject ID to filter by.
   * @returns {Promise<Array<LegalBasis>>} - A list of legal basis entries.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async getBySubject (subjectId) {
    try {
      const subject = await SubjectsRepository.findById(subjectId)
      if (!subject) {
        throw new ErrorUtils(404, 'Subject not found')
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
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(
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
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async getBySubjectAndAspects (subjectId, aspectIds = []) {
    try {
      const subject = await SubjectsRepository.findById(subjectId)
      if (!subject) {
        throw new ErrorUtils(404, 'Subject not found')
      }
      const existingAspects = await AspectsRepository.findByIds(aspectIds)
      if (existingAspects.length !== aspectIds.length) {
        const notFoundIds = aspectIds.filter(
          (id) => !existingAspects.some((aspect) => aspect.id === id)
        )
        throw new ErrorUtils(404, 'Aspects not found for IDs', { notFoundIds })
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
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(
        500,
        'Failed to retrieve legal basis records by subject and aspects'
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
   * @throws {ErrorUtils} - If an error occurs during retrieval or date validation.
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
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(
        500,
        'Failed to retrieve legal basis records by last reform range'
      )
    }
  }

  /**
   * Updates an existing legal basis entry.
   *
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
   * @throws {ErrorUtils} If an error occurs during validation or update processing.
   */
  static async updateById (legalBasisId, legalBasis, document) {
    try {
      const parsedlegalBasis = legalBasisSchema.parse({
        ...legalBasis,
        document
      })
      const existingLegalBasis = await LegalBasisRepository.findById(
        legalBasisId
      )
      if (!existingLegalBasis) {
        throw new ErrorUtils(404, 'LegalBasis not found')
      }
      const legalBasisExists =
        await LegalBasisRepository.existsByNameExcludingId(
          parsedlegalBasis.legalName,
          legalBasisId
        )
      if (legalBasisExists) {
        throw new ErrorUtils(409, 'LegalBasis already exists')
      }
      const abbreviationExists =
        await LegalBasisRepository.existsByAbbreviationExcludingId(
          parsedlegalBasis.abbreviation,
          legalBasisId
        )
      if (abbreviationExists) {
        throw new ErrorUtils(409, 'LegalBasis abbreviation already exists')
      }

      const subjectExists = await SubjectsRepository.findById(
        parsedlegalBasis.subjectId
      )
      if (!subjectExists) {
        throw new ErrorUtils(404, 'Subject not found')
      }
      const validAspectIds = await AspectsRepository.findByIds(
        parsedlegalBasis.aspectsIds
      )
      if (validAspectIds.length !== parsedlegalBasis.aspectsIds.length) {
        const notFoundIds = parsedlegalBasis.aspectsIds.filter(
          (id) => !validAspectIds.includes(id)
        )
        throw new ErrorUtils(404, 'Aspects not found for IDs', { notFoundIds })
      }
      if (parsedlegalBasis.removeDocument && document) {
        throw new ErrorUtils(
          400,
          'Cannot provide a document if removeDocument is true'
        )
      }
      const { hasPendingJobs } = await extractArticles.hasPendingExtractionJobs(
        legalBasisId
      )
      if (parsedlegalBasis.removeDocument && hasPendingJobs) {
        throw new ErrorUtils(
          409,
          'The document cannot be removed because there are pending jobs for this Legal Basis'
        )
      }
      if (hasPendingJobs && document) {
        throw new ErrorUtils(
          409,
          'A new document cannot be uploaded because there are pending jobs for this Legal Basis'
        )
      }
      if (parsedlegalBasis.extractArticles) {
        if (!document && !existingLegalBasis.url) {
          throw new ErrorUtils(
            400,
            'A document must be provided if extractArticles is true'
          )
        }
        if (hasPendingJobs) {
          throw new ErrorUtils(
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
          throw new ErrorUtils(500, 'File Upload Error')
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
        throw new ErrorUtils(404, 'LegalBasis not found')
      }
      let documentUrl = null
      let jobId = null
      if (documentKey) {
        documentUrl = await FileService.getFile(documentKey)
        if (parsedlegalBasis.extractArticles) {
          const job = await articlesQueue.add({
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
        throw new ErrorUtils(400, 'Validation failed', validationErrors)
      }
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Unexpected error during legal basis update')
    }
  }

  /**
 * Deletes a Legal base by ID.
 * @param {number} legalBasisId - The ID of the Legal base to delete.
 * @returns {Promise<{ success: boolean }>} - An object indicating the deletion was successful.
 * @throws {ErrorUtils} - If an error occurs during deletion.
 */
  static async deleteById (legalBasisId) {
    try {
      const legalBasis = await LegalBasisRepository.findById(legalBasisId)
      if (!legalBasis) {
        throw new ErrorUtils(404, 'LegalBasis not found')
      }
      const { hasPendingJobs: hasPendingArticleExtractionJobs } = await extractArticles.hasPendingExtractionJobs(legalBasisId)
      if (hasPendingArticleExtractionJobs) {
        throw new ErrorUtils(409, 'Cannot delete LegalBasis with pending Article Extraction jobs')
      }
      const { hasPendingJobs: hasPendingRequirementIdentificationJobs } = await RequirementsIdentificationService.hasPendingLegalBasisJobs(legalBasisId)
      if (hasPendingRequirementIdentificationJobs) {
        throw new ErrorUtils(409, 'Cannot delete LegalBasis with pending Requirement Identification jobs')
      }
      if (legalBasis.url) {
        await FileService.deleteFile(legalBasis.url)
      }
      const legalBasisDeleted = await LegalBasisRepository.delete(legalBasisId)
      if (!legalBasisDeleted) {
        throw new ErrorUtils(404, 'LegalBasis not found')
      }
      return { success: true }
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Unexpected error during LegalBasis deletion')
    }
  }

  /**
 * Deletes multiple Legal Basis records by their IDs.
 * @param {Array<number>} legalBasisIds - An array of IDs of the Legal Basis records to delete.
 * @returns {Promise<{ success: boolean }>} - An object indicating the deletion was successful.
 * @throws {ErrorUtils} - If any error occurs during the deletion process.
 */
  static async deleteBatch (legalBasisIds) {
    try {
      const legalBasis = await LegalBasisRepository.findByIds(legalBasisIds)
      if (legalBasis.length !== legalBasisIds.length) {
        const notFoundIds = legalBasisIds.filter(
          (id) => !legalBasis.some((legalBase) => legalBase.id === id)
        )
        throw new ErrorUtils(404, 'LegalBasis not found for IDs', { notFoundIds })
      }
      const pendingArticleExtractionJobs = []
      const pendingRequirementIdentificationJobs = []
      const urlsToDelete = []
      await Promise.all(
        legalBasis.map(async (legalBase) => {
          const { hasPendingJobs: hasPendingArticleExtractionJobs } = await extractArticles.hasPendingExtractionJobs(legalBase.id)
          const { hasPendingJobs: hasPendingRequirementIdentificationJobs } = await RequirementsIdentificationService.hasPendingLegalBasisJobs(legalBase.id)
          if (hasPendingArticleExtractionJobs) {
            pendingArticleExtractionJobs.push({
              id: legalBase.id,
              name: legalBase.legal_name
            })
          }
          if (hasPendingRequirementIdentificationJobs) {
            pendingRequirementIdentificationJobs.push({
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
        throw new ErrorUtils(
          409,
          'Cannot delete Legal Bases with pending Article Extraction jobs',
          { legalBases: pendingArticleExtractionJobs }
        )
      }
      if (pendingRequirementIdentificationJobs.length > 0) {
        throw new ErrorUtils(
          409,
          'Cannot delete Legal Bases with pending Requirement Identification jobs',
          { legalBases: pendingRequirementIdentificationJobs }
        )
      }
      await Promise.all(
        urlsToDelete.map((url) => FileService.deleteFile(url))
      )
      const legalBasisDeleted = await LegalBasisRepository.deleteBatch(legalBasisIds)
      if (!legalBasisDeleted) {
        throw new ErrorUtils(404, 'LegalBasis not found')
      }
      return { success: true }
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Unexpected error during batch Legal Basis deletion')
    }
  }
}

export default LegalBasisService
