import LegalBasisRepository from '../../repositories/LegalBasis.repository.js'
import articlesQueue from '../../workers/articlesWorker.js'
import legalBasisSchema from '../../validations/legalBasisValidation.js'
import SubjectsRepository from '../../repositories/Subject.repository.js'
import AspectsRepository from '../../repositories/Aspects.repository.js'
import ArticlesWorkerService from '../articles/ArticlesWorkerService.js'
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
 * Creates a new Legal Basis entry.
 * @param {Object} data - Parameters for creating a legal basis.
 * @param {string} data.legalName - The name of the legal basis.
 * @param {string} data.abbreviation - The abbreviation of the legal basis.
 * @param {string} data.subject - The subject of the legal basis.
 * @param {string} data.aspects - The aspects associated with the legal basis.
 * @param {string} data.classification - The classification of the legal basis.
 * @param {string} data.jurisdiction - The jurisdiction of the legal basis.
 * @param {string} [data.state] - The state associated with the legal basis.
 * @param {string} [data.municipality] - The municipality associated with the legal basis.
 * @param {string} data.lastReform - The date of the last reform.
 * @param {string} data.extractArticles - The flag to determine whether to extract articles from the document.
 * @param {Object} [document] - The document to process (optional).
 * @returns {Promise<Object>} - An object containing the created `legalBasis` and the optional `jobId` (which may be null).
 * @property {Object} legalBasis - The created legal basis object.
 * @property {string|null} jobId - The job ID if a job was created, or `null` if no job was created.
 * @throws {ErrorUtils} - If an error occurs during the creation validation.
 */
  static async create (data, document) {
    try {
      const parsedData = legalBasisSchema.parse({
        ...data,
        document
      })
      const legalBasisExists = await LegalBasisRepository.exists(parsedData.legalName)
      if (legalBasisExists) {
        throw new ErrorUtils(409, 'LegalBasis already exists')
      }
      const subjectExists = await SubjectsRepository.findById(parsedData.subjectId)
      if (!subjectExists) {
        throw new ErrorUtils(404, 'Invalid Subject ID')
      }
      const validAspectIds = await AspectsRepository.findByIds(parsedData.aspectsIds)
      if (validAspectIds.length !== parsedData.aspectsIds.length) {
        const notFoundIds = parsedData.aspectsIds.filter(id => !validAspectIds.includes(id))
        throw new ErrorUtils(404, 'Invalid Aspects IDs', { notFoundIds })
      }
      if (parsedData.extractArticles && !document) {
        throw new ErrorUtils(400, 'A document must be provided if extractArticles is true')
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
        ...parsedData,
        url: documentKey
      }
      const createdLegalBasis = await LegalBasisRepository.create(legalBasisData)
      let documentUrl = null
      let jobId = null
      if (documentKey) {
        documentUrl = await FileService.getFile(documentKey)
        if (parsedData.extractArticles) {
          const job = await articlesQueue.add({
            legalBasisId: createdLegalBasis.id
          })
          jobId = job.id
        }
      }
      let formattedLastReform = null
      if (createdLegalBasis.lastReform) {
        formattedLastReform = format(new Date(createdLegalBasis.lastReform), 'dd-MM-yyyy')
      }
      return {
        jobId,
        legalBasis: {
          ...createdLegalBasis,
          lastReform: formattedLastReform,
          url: documentUrl
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
   * @returns {Promise<Array<Object>>} - A list of all legal basis entries.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async getAll () {
    try {
      const legalBasis = await LegalBasisRepository.findAll()
      if (!legalBasis) {
        return []
      }
      const legalBases = await Promise.all(legalBasis.map(async (legalBasis) => {
        let documentUrl = null
        if (legalBasis.url) {
          documentUrl = await FileService.getFile(legalBasis.url)
        }
        let formattedLastReform = null
        if (legalBasis.lastReform) {
          formattedLastReform = format(new Date(legalBasis.lastReform), 'dd-MM-yyyy', { locale: es })
        }
        return {
          id: legalBasis.id,
          legalName: legalBasis.legal_name,
          subject: legalBasis.subject,
          aspects: legalBasis.aspects,
          classification: legalBasis.classification,
          jurisdiction: legalBasis.jurisdiction,
          state: legalBasis.state,
          municipality: legalBasis.municipality,
          last_reform: formattedLastReform,
          abbreviation: legalBasis.abbreviation,
          url: documentUrl
        }
      }))

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
   * @returns {Promise<Object>} - The legal basis entry.
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
        formattedLastReform = format(new Date(legalBase.lastReform), 'dd-MM-yyyy', { locale: es })
      }
      return {
        id: legalBase.id,
        legalName: legalBase.legal_name,
        subject: legalBase.subject,
        aspects: legalBase.aspects,
        classification: legalBase.classification,
        jurisdiction: legalBase.jurisdiction,
        state: legalBase.state,
        municipality: legalBase.municipality,
        last_reform: formattedLastReform,
        abbreviation: legalBase.abbreviation,
        url: documentUrl
      }
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to retrieve legal basis record by ID')
    }
  }

  /**
   * Retrieves a legal basis entry by its name.
   * @param {string} legalName - The name of the legal basis to retrieve.
   * @returns {Promise<Object>} - The legal basis entry.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async getByName (legalName) {
    try {
      const legalBase = await LegalBasisRepository.findByName(legalName)
      if (!legalBase) {
        throw new ErrorUtils(404, 'LegalBasis not found')
      }
      let documentUrl = null
      if (legalBase.url) {
        documentUrl = await FileService.getFile(legalBase.url)
      }
      let formattedLastReform = null
      if (legalBase.lastReform) {
        formattedLastReform = format(new Date(legalBase.lastReform), 'dd-MM-yyyy', { locale: es })
      }
      return {
        id: legalBase.id,
        legalName: legalBase.legal_name,
        subject: legalBase.subject,
        aspects: legalBase.aspects,
        classification: legalBase.classification,
        jurisdiction: legalBase.jurisdiction,
        state: legalBase.state,
        municipality: legalBase.municipality,
        last_reform: formattedLastReform,
        abbreviation: legalBase.abbreviation,
        url: documentUrl
      }
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to retrieve legal basis record by name')
    }
  }

  /**
   * Retrieves a legal basis entry by its abbreviation.
   * @param {string} abbreviation - The abbreviation of the legal basis to retrieve.
   * @returns {Promise<Array<Object>>} - The legal basis entry.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async getByAbbreviation (abbreviation) {
    try {
      const legalBasis = await LegalBasisRepository.findByAbbreviation(abbreviation)
      if (!legalBasis) {
        return []
      }
      const legalBases = await Promise.all(legalBasis.map(async (legalBasis) => {
        let documentUrl = null
        if (legalBasis.url) {
          documentUrl = await FileService.getFile(legalBasis.url)
        }
        let formattedLastReform = null
        if (legalBasis.lastReform) {
          formattedLastReform = format(new Date(legalBasis.lastReform), 'dd-MM-yyyy', { locale: es })
        }
        return {
          id: legalBasis.id,
          legalName: legalBasis.legal_name,
          subject: legalBasis.subject,
          aspects: legalBasis.aspects,
          classification: legalBasis.classification,
          jurisdiction: legalBasis.jurisdiction,
          state: legalBasis.state,
          municipality: legalBasis.municipality,
          last_reform: formattedLastReform,
          abbreviation: legalBasis.abbreviation,
          url: documentUrl
        }
      }))
      return legalBases
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to retrieve legal basis record by abbreviation')
    }
  }

  /**
 * Retrieves all legal basis entries by their classification.
 * @param {string} classification - The classification of the legal basis to retrieve.
 * @returns {Promise<Array<Object>>} - A list of legal basis entries.
 * @throws {ErrorUtils} - If an error occurs during retrieval.
 */
  static async getByClassification (classification) {
    try {
      const legalBasis = await LegalBasisRepository.findByClassification(classification)
      if (!legalBasis) {
        return []
      }
      const legalBases = await Promise.all(legalBasis.map(async (legalBasis) => {
        let documentUrl = null
        if (legalBasis.url) {
          documentUrl = await FileService.getFile(legalBasis.url)
        }
        let formattedLastReform = null
        if (legalBasis.lastReform) {
          formattedLastReform = format(new Date(legalBasis.lastReform), 'dd-MM-yyyy', { locale: es })
        }
        return {
          id: legalBasis.id,
          legalName: legalBasis.legal_name,
          subject: legalBasis.subject,
          aspects: legalBasis.aspects,
          classification: legalBasis.classification,
          jurisdiction: legalBasis.jurisdiction,
          state: legalBasis.state,
          municipality: legalBasis.municipality,
          last_reform: formattedLastReform,
          abbreviation: legalBasis.abbreviation,
          url: documentUrl
        }
      }))

      return legalBases
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to retrieve legal basis records by classification')
    }
  }

  /**
 * Retrieves legal basis entries filtered by jurisdiction.
 * @param {string} jurisdiction - The jurisdiction to filter by.
 * @returns {Promise<Array<Object>>} - A list of legal basis entries.
 * @throws {ErrorUtils} - If an error occurs during retrieval.
 */
  static async getByJurisdiction (jurisdiction) {
    try {
      const legalBasis = await LegalBasisRepository.findByJurisdiction(jurisdiction)
      if (!legalBasis) {
        return []
      }
      const legalBases = await Promise.all(legalBasis.map(async (legalBasis) => {
        let documentUrl = null
        if (legalBasis.url) {
          documentUrl = await FileService.getFile(legalBasis.url)
        }
        let formattedLastReform = null
        if (legalBasis.lastReform) {
          formattedLastReform = format(new Date(legalBasis.lastReform), 'dd-MM-yyyy', { locale: es })
        }
        return {
          id: legalBasis.id,
          legalName: legalBasis.legal_name,
          subject: legalBasis.subject,
          aspects: legalBasis.aspects,
          classification: legalBasis.classification,
          jurisdiction: legalBasis.jurisdiction,
          state: legalBasis.state,
          municipality: legalBasis.municipality,
          last_reform: formattedLastReform,
          abbreviation: legalBasis.abbreviation,
          url: documentUrl
        }
      }))
      return legalBases
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to retrieve legal basis records by jurisdiction')
    }
  }

  /**
 * Retrieves legal basis entries filtered by state and optionally by municipality.
 * @param {Object} params - The parameters for filtering.
 * @param {string} params.state - The state to filter by.
 * @param {string} [params.municipality] - The municipality to filter by (optional).
 * @returns {Promise<Array<Object>>} - A list of legal basis entries.
 * @throws {ErrorUtils} - If an error occurs during retrieval.
 */
  static async getByStateAndMunicipality ({ state, municipality = null }) {
    if (!state) {
      return []
    }
    try {
      const legalBasis = await LegalBasisRepository.findByStateAndMunicipality(state, municipality)
      if (!legalBasis) {
        return []
      }
      const legalBasesWithDetails = await Promise.all(legalBasis.map(async (legalBasis) => {
        let documentUrl = null
        if (legalBasis.url) {
          documentUrl = await FileService.getFile(legalBasis.url)
        }
        let formattedLastReform = null
        if (legalBasis.lastReform) {
          formattedLastReform = format(new Date(legalBasis.lastReform), 'dd-MM-yyyy', { locale: es })
        }
        return {
          id: legalBasis.id,
          legalName: legalBasis.legal_name,
          subject: legalBasis.subject,
          aspects: legalBasis.aspects,
          classification: legalBasis.classification,
          jurisdiction: legalBasis.jurisdiction,
          state: legalBasis.state,
          municipality: legalBasis.municipality,
          last_reform: formattedLastReform,
          abbreviation: legalBasis.abbreviation,
          url: documentUrl
        }
      }))

      return legalBasesWithDetails
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to retrieve legal basis records by state and municipality')
    }
  }

  /**
 * Retrieves legal basis entries filtered by a specific subject.
 * @param {number} subjectId - The subject ID to filter by.
 * @returns {Promise<Array<Object>>} - A list of legal basis entries.
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
      const legalBasesWithDetails = await Promise.all(legalBasis.map(async (legalBasis) => {
        let documentUrl = null
        if (legalBasis.url) {
          documentUrl = await FileService.getFile(legalBasis.url)
        }
        let formattedLastReform = null
        if (legalBasis.lastReform) {
          formattedLastReform = format(new Date(legalBasis.lastReform), 'dd-MM-yyyy', { locale: es })
        }
        return {
          id: legalBasis.id,
          legalName: legalBasis.legal_name,
          subject: legalBasis.subject,
          aspects: legalBasis.aspects,
          classification: legalBasis.classification,
          jurisdiction: legalBasis.jurisdiction,
          state: legalBasis.state,
          municipality: legalBasis.municipality,
          last_reform: formattedLastReform,
          abbreviation: legalBasis.abbreviation,
          url: documentUrl
        }
      }))
      return legalBasesWithDetails
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to retrieve legal basis records by subject')
    }
  }

  /**
 * Retrieves legal basis entries filtered by a specific subject and optionally by aspects.
 * @param {number} subjectId - The subject ID to filter by.
 * @param {Array<number>} [aspectIds] - Optional array of aspect IDs to further filter by.
 * @returns {Promise<Array<Object>>} - A list of legal basis entries.
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
          id => !existingAspects.some(aspect => aspect.id === id))
        throw new ErrorUtils(404, 'Aspects not found for IDs', { notFoundIds })
      }
      const legalBasis = await LegalBasisRepository.findBySubjectAndAspects(subjectId, aspectIds)
      if (!legalBasis) {
        return []
      }
      const legalBases = await Promise.all(legalBasis.map(async (legalBasis) => {
        let documentUrl = null
        if (legalBasis.url) {
          documentUrl = await FileService.getFile(legalBasis.url)
        }
        let formattedLastReform = null
        if (legalBasis.lastReform) {
          formattedLastReform = format(new Date(legalBasis.lastReform), 'dd-MM-yyyy', { locale: es })
        }
        return {
          id: legalBasis.id,
          legalName: legalBasis.legal_name,
          subject: legalBasis.subject,
          aspects: legalBasis.aspects,
          classification: legalBasis.classification,
          jurisdiction: legalBasis.jurisdiction,
          state: legalBasis.state,
          municipality: legalBasis.municipality,
          last_reform: formattedLastReform,
          abbreviation: legalBasis.abbreviation,
          url: documentUrl
        }
      }))

      return legalBases
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to retrieve legal basis records by subject and aspects')
    }
  }

  /**
 * Updates an existing Legal Basis entry.
 * @param {number} legalBasisId - The ID of the legal basis to update.
 * @param {Object} data - Parameters for updating the legal basis.
 * @param {string} [data.legalName] - The new name of the legal basis.
 * @param {string} [data.abbreviation] - The new abbreviation of the legal basis.
 * @param {number} [data.subjectId] - The new ID of the subject associated with the legal basis.
 * @param {Array<number>} [data.aspectsIds] - The new IDs of the aspects to associate with the legal basis.
 * @param {string} [data.classification] - The new classification of the legal basis.
 * @param {string} [data.jurisdiction] - The new jurisdiction of the legal basis.
 * @param {string} [data.state] - The new state associated with the legal basis.
 * @param {string} [data.municipality] - The new municipality associated with the legal basis.
 * @param {string} [data.lastReform] - The new date of the last reform.
 * @param {string} [data.extractArticles] - The flag to determine whether to extract articles from the document.
 * @param {string} [data.removeDocument] - The flag to determine whether the document should be deleted.
 * @param {Object} [document] - The new document to process (optional).
 * @returns {Promise<Object>} - The updated LegalBasis object and any related job information.
 * @throws {ErrorUtils} - If an error occurs during the update validation or processing.
 */
  static async updateById (legalBasisId, data, document) {
    try {
      const parsedData = legalBasisSchema.parse({ ...data, document })
      const existingLegalBasis = await LegalBasisRepository.findById(legalBasisId)
      if (!existingLegalBasis) {
        throw new ErrorUtils(404, 'LegalBasis not found')
      }
      const legalBasisExists = await LegalBasisRepository.existsByLegalNameExcludingId(parsedData.legalName, legalBasisId)
      if (legalBasisExists) {
        throw new ErrorUtils(409, 'LegalBasis already exists')
      }
      const subjectExists = await SubjectsRepository.findById(parsedData.subjectId)
      if (!subjectExists) {
        throw new ErrorUtils(404, 'Invalid Subject ID')
      }
      const validAspectIds = await AspectsRepository.findByIds(parsedData.aspectsIds)
      if (validAspectIds.length !== parsedData.aspectsIds.length) {
        const notFoundIds = parsedData.aspectsIds.filter(id => !validAspectIds.includes(id))
        throw new ErrorUtils(404, 'Invalid Aspects IDs', { notFoundIds })
      }
      const { hasPendingJobs } = await ArticlesWorkerService.hasPendingJobs(legalBasisId)
      if (parsedData.removeDocument && document) {
        throw new ErrorUtils(400, 'Cannot provide a document if removeDocument is true')
      }
      if (parsedData.removeDocument && hasPendingJobs) {
        throw new ErrorUtils(409, 'The document cannot be removed because there are pending jobs for this Legal Basis')
      }
      if (parsedData.extractArticles && !document) {
        throw new ErrorUtils(400, 'A document must be provided if extractArticles is true')
      }
      if (document && parsedData.extractArticles && hasPendingJobs) {
        throw new ErrorUtils(409, 'Articles cannot be extracted because there is already a process that does so.')
      }
      let documentKey = existingLegalBasis.url
      if (document && !parsedData.removeDocument) {
        const uploadResponse = await FileService.uploadFile(document)
        if (uploadResponse.response.$metadata.httpStatusCode === 200) {
          if (existingLegalBasis.url) {
            await FileService.deleteFile(existingLegalBasis.url)
          }
          documentKey = uploadResponse.uniqueFileName
        } else {
          throw new ErrorUtils(500, 'File Upload Error')
        }
      } else if (!document && parsedData.removeDocument) {
        if (existingLegalBasis.url) {
          await FileService.deleteFile(existingLegalBasis.url)
        }
        documentKey = null
      }
      const updatedLegalBasisData = {
        ...parsedData,
        url: documentKey
      }
      const updatedLegalBasis = await LegalBasisRepository.update(legalBasisId, updatedLegalBasisData)
      if (!updatedLegalBasis) {
        throw new ErrorUtils(404, 'LegalBasis not found')
      }
      let documentUrl = null
      let jobId = null
      if (documentKey) {
        documentUrl = await FileService.getFile(documentKey)
        if (parsedData.extractArticles) {
          const job = await articlesQueue.add({
            legalBasisId: updatedLegalBasis.id
          })
          jobId = job.id
        }
      }
      let formattedLastReform = null
      if (updatedLegalBasis.lastReform) {
        formattedLastReform = format(new Date(updatedLegalBasis.lastReform), 'dd-MM-yyyy')
      }
      return {
        jobId,
        legalBasis: {
          ...updatedLegalBasis,
          lastReform: formattedLastReform,
          url: documentUrl
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors = error.errors.map(e => ({
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
 * @returns {Promise<Object>} - Success message if Legal base was deleted.
 * @throws {ErrorUtils} - If an error occurs during deletion.
 */
  static async deleteById (legalBasisId) {
    try {
      const legalBasis = await LegalBasisRepository.findById(legalBasisId)
      if (!legalBasis) {
        throw new ErrorUtils(404, 'LegalBasis not found')
      }
      const { hasPendingJobs } = await ArticlesWorkerService.hasPendingJobs(legalBasisId)
      if (hasPendingJobs) {
        throw new ErrorUtils(409, 'Cannot delete LegalBasis with pending jobs')
      }
      if (legalBasis.url) {
        await FileService.deleteFile(legalBasis.url)
      }
      const LegalBasisdeleted = await LegalBasisRepository.delete(legalBasisId)
      if (!LegalBasisdeleted) {
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
 * @returns {Promise<Object>} - Success message if Legal Basis records were deleted.
 * @throws {ErrorUtils} - If any error occurs during the deletion process.
 */
  static async deleteBatch (legalBasisIds) {
    try {
      const existingLegalBases = await LegalBasisRepository.findByIds(legalBasisIds)
      if (existingLegalBases.length !== legalBasisIds.length) {
        const notFoundIds = legalBasisIds.filter(
          id => !existingLegalBases.some(legalBasis => legalBasis.id === id)
        )
        throw new ErrorUtils(404, 'Legal Basis not found for IDs', { notFoundIds })
      }
      const pendingJobs = []
      for (const legalBasis of existingLegalBases) {
        const { hasPendingJobs } = await ArticlesWorkerService.hasPendingJobs(legalBasis.id)
        if (hasPendingJobs) {
          pendingJobs.push({
            id: legalBasis.id,
            name: legalBasis.legal_name
          })
        }
      }
      if (pendingJobs.length > 0) {
        throw new ErrorUtils(409, 'Cannot delete Legal Bases with pending jobs', {
          associatedLegalBases: pendingJobs
        })
      }
      for (const legalBasis of existingLegalBases) {
        if (legalBasis.url) {
          await FileService.deleteFile(legalBasis.url)
        }
      }
      const LegalBasisDeleted = await LegalBasisRepository.deleteBatch(legalBasisIds)
      if (!LegalBasisDeleted) {
        throw new ErrorUtils(500, 'Legal Basis not found')
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
