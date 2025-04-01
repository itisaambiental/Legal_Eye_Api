import RequirementRepository from '../../repositories/Requirements.repository.js'
import requirementSchema from '../../schemas/requirement.schema.js'
import SubjectsRepository from '../../repositories/Subject.repository.js'
import AspectsRepository from '../../repositories/Aspects.repository.js'
import RequirementsIdentificationService from './requirementsIdentification/requirementsIdentification.service.js'
import ErrorUtils from '../../utils/Error.js'
import { z } from 'zod'

/**
 * Service class for handling Requirement operations.
 */
class RequirementService {
  /**
 * @typedef {Object} Requirement
  * @property {number} id - The unique identifier of the requirement.
  * @property {Object} subject - The subject associated with the requirement.
  * @property {number} subject.subject_id - The ID of the subject.
  * @property {string} subject.subject_name - The name of the subject.
  * @property {Array<Object>} aspects - The aspects associated with the requirement.
  * @property {number} aspects[].aspect_id - The ID of the aspect.
  * @property {string} aspects[].aspect_name - The name of the aspect.
  * @property {string} requirement_number - The unique number identifying the requirement.
  * @property {string} requirement_name - The name of the requirement.
  * @property {string} mandatory_description - The mandatory description of the requirement.
  * @property {string} complementary_description - The complementary description of the requirement.
  * @property {string} mandatory_sentences - The mandatory legal sentences related to the requirement.
  * @property {string} complementary_sentences - The complementary legal sentences related to the requirement.
  * @property {string} mandatory_keywords - Keywords related to the mandatory aspect of the requirement.
  * @property {string} complementary_keywords - Keywords related to the complementary aspect of the requirement.
  * @property {string} condition - The condition type ('Crítica', 'Operativa', 'Recomendación', 'Pendiente').
  * @property {string} evidence - The type of evidence ('Trámite', 'Registro', 'Específica', 'Documento').
  * @property {string} specify_evidence - The description of the specific evidence.
  * @property {string} formatted_evidence - The formatted evidence.
  * @property {string} periodicity - The specific periodicity.
  * @property {string} specify_periodicity - The description of the specific periodicity.
  * @property {string} requirement_type - The type of requirement.
 */

  /**
  * @typedef {import('../../models/Requirement.model.js').default} RequirementModel
 */

  /**
 * Formats a single requirement by concatenating `evidence` and `periodicity`
 * if their value is 'Específica'. Removes `specify_evidence` and `specify_periodicity` from the output.
 * @param {RequirementModel} requirement - A single requirement model instance.
 * @returns {Requirement} - The formatted requirement.
 */
  static _formatRequirementWithSpecificValues (requirement) {
    return {
      ...requirement,
      formatted_evidence:
        requirement.evidence === 'Específica'
          ? `${requirement.evidence} - ${requirement.specify_evidence || ''}`.trim()
          : requirement.evidence
    }
  }

  /**
 * Formats a list of requirements by applying concatenation rules for 'Específica' values.
 * @param {RequirementModel[]} requirements - List of requirement model instances.
 * @returns {Requirement[]} List of formatted requirements.
 */
  static _formatRequirementsListWithSpecificValues (requirements) {
    return requirements.map(this._formatRequirementWithSpecificValues)
  }

  /**
   * Creates a new requirement.
   *
   * @param {Object} requirement - Parameters for creating a requirement.
   * @param {number} requirement.subjectId - The subject ID.
   * @param {number[]} requirement.aspectsIds - The aspects IDs.
   * @param {string} requirement.requirementNumber - The requirement number.
   * @param {string} requirement.requirementName - The requirement name.
   * @param {string} requirement.mandatoryDescription - The mandatory description.
   * @param {string} requirement.complementaryDescription - The complementary description.
   * @param {string} requirement.mandatorySentences - The mandatory legal sentences.
   * @param {string} requirement.complementarySentences - The complementary legal sentences.
   * @param {string} requirement.mandatoryKeywords - Keywords for mandatory aspects.
   * @param {string} requirement.complementaryKeywords - Keywords for complementary aspects.
   * @param {string} requirement.condition - The condition type.
   * @param {string} requirement.evidence - 'Trámite', etc.
   * @param {string} requirement.specifyEvidence - The description of the specific evidence.
   * @param {string} requirement.periodicity - 'Anual', etc.
   * @param {string} requirement.requirementType - The type of requirement.
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
      const validAspectIds = await AspectsRepository.findByIds(
        parsedRequirement.aspectsIds
      )
      if (validAspectIds.length !== parsedRequirement.aspectsIds.length) {
        const notFoundIds = parsedRequirement.aspectsIds.filter(
          (id) => !validAspectIds.includes(id)
        )
        throw new ErrorUtils(404, 'Aspects not found for IDs', { notFoundIds })
      }
      const requirementExistsByNumber =
        await RequirementRepository.existsByRequirementNumber(
          parsedRequirement.requirementNumber
        )
      if (requirementExistsByNumber) {
        throw new ErrorUtils(409, 'Requirement number already exists')
      }
      const requirementExistsByName =
        await RequirementRepository.existsByRequirementName(
          parsedRequirement.requirementName
        )
      if (requirementExistsByName) {
        throw new ErrorUtils(409, 'Requirement name already exists')
      }
      const createdRequirement = await RequirementRepository.create(
        parsedRequirement
      )
      return RequirementService._formatRequirementWithSpecificValues(createdRequirement)
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
      return this._formatRequirementsListWithSpecificValues(requirements)
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
      return this._formatRequirementWithSpecificValues(requirement)
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
      return this._formatRequirementsListWithSpecificValues(requirements)
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
      return this._formatRequirementsListWithSpecificValues(requirements)
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
      return this._formatRequirementsListWithSpecificValues(requirements)
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
      return this._formatRequirementsListWithSpecificValues(requirements)
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

  /**
   * Retrieves requirements by a flexible full-text match in their mandatory description.
   * @param {string} description - The description or part of the description to search for.
   * @returns {Promise<Array<Requirement>>} - A list of requirements matching the description.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async getByMandatoryDescription (description) {
    try {
      const requirements =
        await RequirementRepository.findByMandatoryDescription(description)
      if (!requirements) {
        return []
      }
      return this._formatRequirementsListWithSpecificValues(requirements)
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(
        500,
        'Failed to retrieve requirements by mandatory description'
      )
    }
  }

  /**
   * Retrieves requirements by a flexible full-text match in their complementary description.
   * @param {string} description - The description or part of the description to search for.
   * @returns {Promise<Array<Requirement>>} - A list of requirements matching the complementary description.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async getByComplementaryDescription (description) {
    try {
      const requirements =
        await RequirementRepository.findByComplementaryDescription(description)
      if (!requirements) {
        return []
      }
      return this._formatRequirementsListWithSpecificValues(requirements)
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(
        500,
        'Failed to retrieve requirements by complementary description'
      )
    }
  }

  /**
   * Retrieves requirements by a flexible full-text match in their mandatory sentences.
   * @param {string} sentence - The sentence or part of the sentence to search for.
   * @returns {Promise<Array<Requirement>>} - A list of requirements matching the mandatory sentence.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async getByMandatorySentences (sentence) {
    try {
      const requirements = await RequirementRepository.findByMandatorySentences(
        sentence
      )
      if (!requirements) {
        return []
      }
      return this._formatRequirementsListWithSpecificValues(requirements)
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(
        500,
        'Failed to retrieve requirements by mandatory sentences'
      )
    }
  }

  /**
   * Retrieves requirements by a flexible full-text match in their complementary sentences.
   * @param {string} sentence - The sentence or part of the sentence to search for.
   * @returns {Promise<Array<Requirement>>} - A list of requirements matching the complementary sentence.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async getByComplementarySentences (sentence) {
    try {
      const requirements =
        await RequirementRepository.findByComplementarySentences(sentence)
      if (!requirements) {
        return []
      }
      return this._formatRequirementsListWithSpecificValues(requirements)
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(
        500,
        'Failed to retrieve requirements by complementary sentences'
      )
    }
  }

  /**
   * Retrieves requirements by a flexible full-text match in their mandatory keywords.
   * @param {string} keyword - The keyword or part of the keyword to search for.
   * @returns {Promise<Array<Requirement>>} - A list of requirements matching the mandatory keyword.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async getByMandatoryKeywords (keyword) {
    try {
      const requirements = await RequirementRepository.findByMandatoryKeywords(
        keyword
      )
      if (!requirements) {
        return []
      }
      return this._formatRequirementsListWithSpecificValues(requirements)
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(
        500,
        'Failed to retrieve requirements by mandatory keywords'
      )
    }
  }

  /**
   * Retrieves requirements by a flexible full-text match in their complementary keywords.
   * @param {string} keyword - The keyword or part of the keyword to search for.
   * @returns {Promise<Array<Requirement>>} - A list of requirements matching the complementary keyword.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async getByComplementaryKeywords (keyword) {
    try {
      const requirements = await RequirementRepository.findByComplementaryKeywords(keyword)
      if (!requirements) {
        return []
      }
      return this._formatRequirementsListWithSpecificValues(requirements)
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(
        500,
        'Failed to retrieve requirements by complementary keywords'
      )
    }
  }

  /**
   * Retrieves requirements filtered by a specific condition.
   * @param {string} condition - The condition type ('Crítica', 'Operativa', 'Recomendación', 'Pendiente') to filter by.
   * @returns {Promise<Array<Requirement>>} - A list of Requirement instances matching the condition.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async getByCondition (condition) {
    try {
      const requirements = await RequirementRepository.findByCondition(
        condition
      )
      if (!requirements) {
        return []
      }
      return this._formatRequirementsListWithSpecificValues(requirements)
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to retrieve requirements by condition')
    }
  }

  /**
   * Retrieves requirements filtered by a specific evidence type.
   * @param {string} evidence - The evidence type ('Trámite', 'Registro', 'Específico', 'Documento') to filter by.
   * @returns {Promise<Array<Requirement>>} - A list of Requirement instances matching the evidence type.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async getByEvidence (evidence) {
    try {
      const requirements = await RequirementRepository.findByEvidence(evidence)
      if (!requirements) {
        return []
      }
      return this._formatRequirementsListWithSpecificValues(requirements)
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(
        500,
        'Failed to retrieve requirements by evidence type'
      )
    }
  }

  /**
   * Retrieves requirements filtered by a specific periodicity.
   * @param {string} periodicity - The periodicity ('Anual', '2 años', 'Por evento', 'Única vez') to filter by.
   * @returns {Promise<Array<Requirement>>} - A list of Requirement instances matching the periodicity.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async getByPeriodicity (periodicity) {
    try {
      const requirements = await RequirementRepository.findByPeriodicity(
        periodicity
      )
      if (!requirements) {
        return []
      }
      return this._formatRequirementsListWithSpecificValues(requirements)
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(
        500,
        'Failed to retrieve requirements by periodicity'
      )
    }
  }

  /**
   * Retrieves requirements filtered by a specific requirement type.
   * @param {string} requirementType - The requirement type to filter by.
   * @returns {Promise<Array<Requirement>>} - A list of Requirement instances matching the requirement type.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async getByRequirementType (requirementType) {
    try {
      const requirements = await RequirementRepository.findByRequirementType(
        requirementType
      )
      if (!requirements) {
        return []
      }
      return this._formatRequirementsListWithSpecificValues(requirements)
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(
        500,
        'Failed to retrieve requirements by requirement type'
      )
    }
  }

  /**
   * Retrieves requirements filtered by a specific jurisdiction.
   * @param {string} jurisdiction - The jurisdiction to filter by.
   * @returns {Promise<Array<Requirement>>} - A list of Requirement instances matching the jurisdiction.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async getByJurisdiction (jurisdiction) {
    try {
      const requirements = await RequirementRepository.findByJurisdiction(
        jurisdiction
      )
      if (!requirements) {
        return []
      }
      return this._formatRequirementsListWithSpecificValues(requirements)
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(
        500,
        'Failed to retrieve requirements by jurisdiction'
      )
    }
  }

  /**
   * Retrieves requirements filtered by a specific state.
   * @param {string} state - The state to filter by.
   * @returns {Promise<Array<Requirement>>} - A list of Requirement instances matching the state.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async getByState (state) {
    try {
      const requirements = await RequirementRepository.findByState(state)
      if (!requirements) {
        return []
      }
      return this._formatRequirementsListWithSpecificValues(requirements)
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to retrieve requirements by state')
    }
  }

  /**
   * Retrieves requirements filtered by state and optionally by municipalities.
   * @param {string} state - The state to filter by.
   * @param {Array<string>} [municipalities] - An array of municipalities to filter by (optional).
   * @returns {Promise<Array<Requirement>>} - A list of Requirement instances matching the filters.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async getByStateAndMunicipalities (state, municipalities = []) {
    try {
      const requirements =
        await RequirementRepository.findByStateAndMunicipalities(
          state,
          municipalities
        )
      if (!requirements) {
        return []
      }
      return this._formatRequirementsListWithSpecificValues(requirements)
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(
        500,
        'Failed to retrieve requirements by state and municipalities'
      )
    }
  }

  /**
   * Updates an existing requirement by its ID.
   *
   * @param {number} requirementId - The ID of the requirement to update.
   * @param {Object} requirement - Parameters for updating a requirement.
   * @param {number} [requirement.subjectId] - The updated subject ID (optional).
   * @param {number[]} [requirement.aspectsIds] - The updated aspects IDs (optional).
   * @param {string} [requirement.requirementNumber] - The updated requirement number (optional).
   * @param {string} [requirement.requirementName] - The updated requirement name (optional).
   * @param {string} [requirement.mandatoryDescription] - The updated mandatory description (optional).
   * @param {string} [requirement.complementaryDescription] - The updated complementary description (optional).
   * @param {string} [requirement.mandatorySentences] - The updated mandatory legal sentences (optional).
   * @param {string} [requirement.complementarySentences] - The updated complementary legal sentences (optional).
   * @param {string} [requirement.mandatoryKeywords] - The updated mandatory keywords (optional).
   * @param {string} [requirement.complementaryKeywords] - The updated complementary keywords (optional).
   * @param {string} [requirement.condition] - The updated condition type (optional).
   * @param {string} [requirement.evidence] - The updated evidence type (optional).
   * @param {string} requirement.specifyPeriodicity - The description of the specific periodicity (optional).
   * @param {string} [requirement.periodicity] - The updated periodicity (optional).
   * @param {string} requirement.specifyEvidence - The description of the specific evidence (optional).
   * @param {string} [requirement.requirementType] - The updated requirement type (optional).
   * @param {string} [requirement.jurisdiction] - The updated jurisdiction (optional).
   * @param {string} [requirement.state] - The updated state (optional).
   * @param {string} [requirement.municipality] - The updated municipality (optional).
   * @returns {Promise<Requirement>} - The updated requirement.
   * @throws {ErrorUtils} - If an error occurs during validation or update.
   */
  static async updateById (requirementId, requirement) {
    try {
      const parsedRequirement = requirementSchema.parse(requirement)
      const existingRequirement = await RequirementRepository.findById(
        requirementId
      )
      if (!existingRequirement) {
        throw new ErrorUtils(404, 'Requirement not found')
      }
      if (parsedRequirement.subjectId) {
        const subjectExists = await SubjectsRepository.findById(
          parsedRequirement.subjectId
        )
        if (!subjectExists) {
          throw new ErrorUtils(404, 'Subject not found')
        }
      }
      const validAspectIds = await AspectsRepository.findByIds(
        parsedRequirement.aspectsIds
      )
      if (validAspectIds.length !== parsedRequirement.aspectsIds.length) {
        const notFoundIds = parsedRequirement.aspectsIds.filter(
          (id) => !validAspectIds.includes(id)
        )
        throw new ErrorUtils(404, 'Aspects not found for IDs', { notFoundIds })
      }
      if (parsedRequirement.requirementNumber) {
        const requirementExistsByNumber =
          await RequirementRepository.existsByNumberExcludingId(
            parsedRequirement.requirementNumber,
            requirementId
          )
        if (requirementExistsByNumber) {
          throw new ErrorUtils(409, 'Requirement number already exists')
        }
      }
      if (parsedRequirement.requirementName) {
        const requirementExistsByName =
          await RequirementRepository.existsByNameExcludingId(
            parsedRequirement.requirementName,
            requirementId
          )
        if (requirementExistsByName) {
          throw new ErrorUtils(409, 'Requirement name already exists')
        }
      }
      const updatedRequirement = await RequirementRepository.update(
        requirementId,
        parsedRequirement
      )
      return RequirementService._formatRequirementWithSpecificValues(updatedRequirement)
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
      throw new ErrorUtils(500, 'Unexpected error during requirement update')
    }
  }

  /**
   * Deletes a requirement by ID.
   * @param {number} requirementId - The ID of the requirement to delete.
   * @returns {Promise<{ success: boolean }>} - An object indicating whether the deletion was successful.
   * @throws {ErrorUtils} - If an error occurs during deletion.
   */
  static async deleteById (requirementId) {
    try {
      const existingRequirement = await RequirementRepository.findById(
        requirementId
      )
      if (!existingRequirement) {
        throw new ErrorUtils(404, 'Requirement not found')
      }
      const { hasPendingJobs: hasPendingRequirementIdentificationJobs } = await RequirementsIdentificationService.hasPendingRequirementJobs(requirementId)
      if (hasPendingRequirementIdentificationJobs) {
        throw new ErrorUtils(409, 'Cannot delete Requirement with pending Requirement Identification jobs')
      }
      const requirementDeleted = await RequirementRepository.delete(
        requirementId
      )
      if (!requirementDeleted) {
        throw new ErrorUtils(404, 'Requirement not found')
      }
      return { success: true }
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Unexpected error during requirement deletion')
    }
  }

  /**
 * Deletes multiple requirements by their IDs.
 * @param {Array<number>} requirementIds - Array of requirement IDs to delete.
 * @returns {Promise<{ success: boolean }>} - An object indicating whether the deletion was successful.
 * @throws {ErrorUtils} - If requirements not found, have active jobs, or deletion fails.
 */
  static async deleteBatch (requirementIds) {
    try {
      const requirements = await RequirementRepository.findByIds(requirementIds)
      if (requirements.length !== requirementIds.length) {
        const notFoundIds = requirementIds.filter(
          (id) => !requirements.some((requirement) => requirement.id === id)
        )
        throw new ErrorUtils(404, 'Requirements not found for IDs', { notFoundIds })
      }
      const results = await Promise.all(
        requirements.map(async (requirement) => {
          const { hasPendingJobs: hasPendingRequirementIdentificationJobs } = await RequirementsIdentificationService.hasPendingRequirementJobs(requirement.id)
          return hasPendingRequirementIdentificationJobs
            ? { id: requirement.id, name: requirement.requirement_name }
            : null
        })
      )
      const pendingRequirementIdentificationJobs = results.filter(Boolean)
      if (pendingRequirementIdentificationJobs.length > 0) {
        throw new ErrorUtils(
          409,
          'Cannot delete Requirements with pending Requirement Identification jobs',
          { requirements: pendingRequirementIdentificationJobs }
        )
      }
      const requirementsDeleted = await RequirementRepository.deleteBatch(requirementIds)
      if (!requirementsDeleted) {
        throw new ErrorUtils(404, 'Requirements not found')
      }
      return { success: true }
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Unexpected error during batch deletion of Requirements')
    }
  }
}

export default RequirementService
