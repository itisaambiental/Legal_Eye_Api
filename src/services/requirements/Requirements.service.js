import RequirementRepository from '../../repositories/Requirements.repository.js'
import requirementSchema from '../../schemas/requirement.schema.js'
import SubjectsRepository from '../../repositories/Subject.repository.js'
import AspectsRepository from '../../repositories/Aspects.repository.js'
import ErrorUtils from '../../utils/Error.js'
import { z } from 'zod'

/**
 * Service class for handling Requirement operations.
 */
class RequirementService {
  /**
   * @typedef {Object} Requirement
   * @property {number} id - The unique identifier of the requirement.
   * @property {string} requirementNumber - The unique number identifying the requirement.
   * @property {string} requirementName - The name of the requirement.
   * @property {string} mandatoryDescription - The mandatory description of the requirement.
   * @property {string} complementaryDescription - The complementary description of the requirement.
   * @property {string} mandatorySentences - The mandatory legal sentences related to the requirement.
   * @property {string} complementarySentences - The complementary legal sentences related to the requirement.
   * @property {string} mandatoryKeywords - Keywords related to the mandatory aspect of the requirement.
   * @property {string} complementaryKeywords - Keywords related to the complementary aspect of the requirement.
   * @property {string} condition - The condition type ('Crítica', 'Operativa', 'Recomendación', 'Pendiente').
   * @property {string} evidence - The type of evidence ('Tramite', 'Registro', 'Específico', 'Documento').
   * @property {string} periodicity - The periodicity of the requirement ('Anual', '2 años', 'Por evento', 'Única vez').
   * @property {string} specificDocument - A specific document related to the requirement.
   * @property {string} requirementType - The type of requirement.
   * @property {string} jurisdiction - The jurisdiction ('Estatal', 'Federal', 'Local').
   * @property {string} [state] - The state associated with the requirement, if applicable.
   * @property {string} [municipality] - The municipality associated with the requirement, if applicable.
   * @property {Object} subject - The subject associated with the requirement.
   * @property {number} subject.subject_id - The subject ID.
   * @property {string} subject.subject_name - The subject name.
   * @property {Object} aspect - The aspect associated with the requirement.
   * @property {number} aspect.aspect_id - The aspect ID.
   * @property {string} aspect.aspect_name - The aspect name.
   */

  /**
   * Creates a new requirement.
   *
   * @param {Object} requirement - Parameters for creating a requirement.
   * @param {number} requirement.subjectId - The subject ID.
   * @param {number} requirement.aspectId - The aspect ID.
   * @param {string} requirement.requirementNumber - The requirement number.
   * @param {string} requirement.requirementName - The requirement name.
   * @param {string} requirement.mandatoryDescription - The mandatory description.
   * @param {string} requirement.complementaryDescription - The complementary description.
   * @param {string} requirement.mandatorySentences - The mandatory legal sentences.
   * @param {string} requirement.complementarySentences - The complementary legal sentences.
   * @param {string} requirement.mandatoryKeywords - Keywords for mandatory aspects.
   * @param {string} requirement.complementaryKeywords - Keywords for complementary aspects.
   * @param {string} requirement.condition - The condition type.
   * @param {string} requirement.evidence - The evidence type.
   * @param {string} requirement.periodicity - The periodicity.
   * @param {string} requirement.specificDocument - A related document.
   * @param {string} requirement.requirementType - The type of requirement.
   * @param {string} requirement.jurisdiction - The jurisdiction type.
   * @param {string} [requirement.state] - The state, if applicable.
   * @param {string} [requirement.municipality] - The municipality, if applicable.
   * @returns {Promise<Requirement>} - The created requirement.
   * @throws {ErrorUtils} - If an error occurs during validation or creation.
   */
  static async create (requirement) {
    try {
      const parsedRequirement = requirementSchema.parse(requirement)
      const subjectExists = await SubjectsRepository.findById(
        parsedRequirement.subjectId
      )
      if (!subjectExists) {
        throw new ErrorUtils(404, 'Subject not found')
      }
      const aspectExists = await AspectsRepository.findById(
        parsedRequirement.aspectId
      )
      if (!aspectExists) {
        throw new ErrorUtils(404, 'Aspect not found')
      }
      const requirementExists =
        await RequirementRepository.existsByRequirementName(
          parsedRequirement.requirementName
        )
      if (requirementExists) {
        throw new ErrorUtils(409, 'Requirement already exists')
      }
      const createdRequirement = await RequirementRepository.create(
        parsedRequirement
      )
      return {
        requirement: createdRequirement
      }
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      if (error instanceof z.ZodError) {
        const validationErrors = error.errors.map((e) => ({
          field: e.path[0],
          message: e.message
        }))
        throw new ErrorUtils(400, 'Validation failed', validationErrors)
      }
      throw new ErrorUtils(500, 'Unexpected error during requirement creation')
    }
  }

  /**
   * Retrieves all requirements from the database.
   * @returns {Promise<Array<Requirement>>} - A list of all requirements.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async getAll () {
    try {
      const requirements = await RequirementRepository.findAll()
      if (!requirements) {
        return []
      }
      return requirements
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to retrieve requirement records')
    }
  }

  /**
   * Retrieves a requirement entry by its ID.
   * @param {number} id - The ID of the requirement to retrieve.
   * @returns {Promise<Requirement>} - The requirement entry.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async getById (id) {
    try {
      const requirement = await RequirementRepository.findById(id)
      if (!requirement) {
        throw new ErrorUtils(404, 'Requirement not found')
      }
      return requirement
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to retrieve requirement record by ID')
    }
  }

  /**
   * Retrieves requirements by their requirement number or part of it.
   * @param {string} requirementNumber - The requirement number or partial match.
   * @returns {Promise<Array<Requirement>>} - A list of matching requirements.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async getByNumber (requirementNumber) {
    try {
      const requirements = await RequirementRepository.findByNumber(
        requirementNumber
      )
      if (!requirements) {
        return []
      }
      return requirements
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to retrieve requirements by number')
    }
  }

  /**
   * Retrieves requirements by their name or part of it.
   * @param {string} requirementName - The requirement name or partial match.
   * @returns {Promise<Array<Requirement>>} - A list of matching requirements.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async getByName (requirementName) {
    try {
      const requirements = await RequirementRepository.findByName(
        requirementName
      )
      if (!requirements) {
        return []
      }
      return requirements
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to retrieve requirements by name')
    }
  }

  /**
   * Retrieves requirements by a specific subject.
   * @param {number} subjectId - The subject ID to filter by.
   * @returns {Promise<Array<Requirement>>} - A list of requirements filtered by the subject.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async getBySubject (subjectId) {
    try {
      const subject = await SubjectsRepository.findById(subjectId)
      if (!subject) {
        throw new ErrorUtils(404, 'Subject not found')
      }
      const requirements = await RequirementRepository.findBySubject(subjectId)
      if (!requirements) {
        return []
      }
      return requirements
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to retrieve requirements by subject')
    }
  }

  /**
   * Retrieves requirements filtered by a specific subject and optionally by aspects.
   * @param {number} subjectId - The subject ID to filter by.
   * @param {Array<number>} [aspectIds] - Optional array of aspect IDs to further filter by.
   * @returns {Promise<Array<Requirement>>} - A list of requirements matching the filters.
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
      const requirements = await RequirementRepository.findBySubjectAndAspects(
        subjectId,
        aspectIds
      )
      if (!requirements) {
        return []
      }
      return requirements
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(
        500,
        'Failed to retrieve requirements by subject and aspects'
      )
    }
  }
}

export default RequirementService
