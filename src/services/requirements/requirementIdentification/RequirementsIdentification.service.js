import RequirementsIdentificationRepository from '../../../repositories/RequirementsIdentification.repository.js'
import SubjectsRepository from '../../../repositories/Subject.repository.js'
import AspectsRepository from '../../../repositories/Aspects.repository.js'
import ArticlesRepository from '../../../repositories/Articles.repository.js'
import UserRepository from '../../../repositories/User.repository.js'
import RequirementsRepository from '../../../repositories/Requirements.repository.js'
import { RequirementsIdentificationSchema } from '../../../schemas/identifyRequirements.schema.js'
import LegalBasisRepository from '../../../repositories/LegalBasis.repository.js'
import requirementsIdentificationQueue from '../../../workers/requirementsIdentificationWorker.js'
import ErrorUtils from '../../../utils/Error.js'
import { z } from 'zod'
/**
 * Service class for handling Requirements Identification operations.
 */
class RequirementsIdentificationService {
  /**
   * Starts a new requirements identification for selected legal bases and associated requirements.
   * @param {Object} identificationData - The data to identify requirements.
   * @param {string[]} identificationData.legalBasisIds - The IDs of the selected legal bases.
   * @param {string} identificationData.subjectId - The ID of the subject.
   * @param {string[]} identificationData.aspectsIds - The IDs of the selected aspects.
   * @param {string} identificationData.intelligenceLevel - The intelligence level for the identification process.
   * @param {number} userId - The ID of the user who starts the identification.
   * @returns {Promise<number>} - The ID of the created job.
   */
  static async startRequirementsIdentification (identificationData, userId) {
    try {
      const parsedData =
        RequirementsIdentificationSchema.parse(identificationData)
      const legalBasis = await LegalBasisRepository.findByIds(
        parsedData.legalBasisIds
      )
      if (legalBasis.length !== parsedData.legalBasisIds.length) {
        const notFoundIds = parsedData.legalBasisIds.filter(
          (id) => !legalBasis.some((legalBase) => legalBase.id === id)
        )
        throw new ErrorUtils(404, 'LegalBasis not found for IDs', {
          notFoundIds
        })
      }
      legalBasis.forEach((legalBase) => {
        legalBase.articles = []
      })
      const missingArticlesLegalBasis = []
      for (const legalBase of legalBasis) {
        const articles = await ArticlesRepository.findByLegalBasisId(
          legalBase.id
        )
        if (!articles) {
          missingArticlesLegalBasis.push(legalBase.id)
        } else {
          legalBase.articles = articles
        }
      }
      if (missingArticlesLegalBasis.length > 0) {
        throw new ErrorUtils(
          400,
          'Some legal bases have no associated articles',
          {
            missingArticlesLegalBasis
          }
        )
      }
      const subjectExists = await SubjectsRepository.findById(
        parsedData.subjectId
      )
      if (!subjectExists) {
        throw new ErrorUtils(404, 'Subject not found')
      }
      const validAspectIds = await AspectsRepository.findByIds(
        parsedData.aspectsIds
      )
      if (validAspectIds.length !== parsedData.aspectsIds.length) {
        const notFoundIds = parsedData.aspectsIds.filter(
          (id) => !validAspectIds.includes(id)
        )
        throw new ErrorUtils(404, 'Aspects not found for IDs', { notFoundIds })
      }
      const requirements = await RequirementsRepository.findBySubjectAndAspects(
        parsedData.subjectId,
        parsedData.aspectsIds
      )
      if (!requirements) {
        throw new ErrorUtils(
          400,
          'No requirements found for the given subject and aspects',
          {
            subjectId: parsedData.subjectId,
            aspectIds: parsedData.aspectsIds
          }
        )
      }
      const job = await requirementsIdentificationQueue.add({
        legalBasis,
        requirements,
        intelligenceLevel: parsedData.intelligenceLevel,
        userId
      })
      return job.id
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
      throw new ErrorUtils(
        500,
        'Unexpected error during start requirements identification'
      )
    }
  }

  /**
   * Creates a new requirement identification.
   * @param {number} requirementId - The ID of the requirement being identified.
   * @param {number} userId - The ID of the user performing the analysis.
   * @returns {Promise<number>} - Returns the ID of the created requirement identification.
   * @throws {ErrorUtils} - If an error occurs during insertion.
   */
  static async createRequirementIdentification (requirementId, userId) {
    try {
      const existingRequirement = await RequirementsRepository.findById(
        requirementId
      )
      if (!existingRequirement) {
        throw new ErrorUtils(404, 'Requirement not found')
      }
      const userExists = await UserRepository.findById(userId)
      if (!userExists) {
        throw new ErrorUtils(404, 'User not found')
      }
      const requirementIdentificationId =
        await RequirementsIdentificationRepository.createRequirementIdentification(
          requirementId,
          userId
        )
      return requirementIdentificationId
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Error creating identified requirement')
    }
  }

  /**
   * Links a requirement identification to a legal basis.
   * @param {number} requirementIdentificationId - The ID of the requirement identification.
   * @param {number} legalBasisId - The ID of the legal basis.
   * @returns {Promise<boolean>} - Returns `true` if successful, `false` otherwise.
   * @throws {ErrorUtils} - If an error occurs during insertion.
   */
  static async linkToLegalBasis (requirementIdentificationId, legalBasisId) {
    try {
      const legalBasis = await LegalBasisRepository.findById(legalBasisId)
      if (!legalBasis) {
        throw new ErrorUtils(404, 'LegalBasis not found')
      }
      const result =
        await RequirementsIdentificationRepository.linkLegalBasis(
          requirementIdentificationId,
          legalBasisId
        )
      return result
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(
        500,
        'Error linking identified requirement to legal basis'
      )
    }
  }

  /**
   * Links an identified requirement to an **obligatory** article under a specific legal basis.
   * @param {number} requirementIdentificationId - The ID of the requirement identification.
   * @param {number} legalBasisId - The ID of the legal basis.
   * @param {number} articleId - The ID of the article.
   * @returns {Promise<boolean>} - Returns `true` if successful, `false` otherwise.
   * @throws {ErrorUtils} - If an error occurs during insertion.
   */
  static async linkToObligatoryArticle (
    requirementIdentificationId,
    legalBasisId,
    articleId
  ) {
    try {
      const legalBasis = await LegalBasisRepository.findById(legalBasisId)
      if (!legalBasis) {
        throw new ErrorUtils(404, 'LegalBasis not found')
      }
      const article = await ArticlesRepository.findById(articleId)
      if (!article) {
        throw new ErrorUtils(404, 'Article not found')
      }
      const result =
        await RequirementsIdentificationRepository.linkObligatoryArticle(
          requirementIdentificationId,
          legalBasisId,
          articleId
        )
      return result
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(
        500,
        'Error linking identified requirement to article'
      )
    }
  }

  /**
   * Links an identified requirement to a **complementary** article under a specific legal basis.
   * @param {number} requirementIdentificationId - The ID of the requirement identification.
   * @param {number} legalBasisId - The ID of the legal basis.
   * @param {number} articleId - The ID of the article.
   * @returns {Promise<boolean>} - Returns `true` if successful, `false` otherwise.
   * @throws {ErrorUtils} - If an error occurs during insertion.
   */
  static async linkToComplementaryArticle (
    requirementIdentificationId,
    legalBasisId,
    articleId
  ) {
    try {
      const legalBasis = await LegalBasisRepository.findById(legalBasisId)
      if (!legalBasis) {
        throw new ErrorUtils(404, 'LegalBasis not found')
      }
      const article = await ArticlesRepository.findById(articleId)
      if (!article) {
        throw new ErrorUtils(404, 'Article not found')
      }
      const result =
        await RequirementsIdentificationRepository.linkComplementaryArticle(
          requirementIdentificationId,
          legalBasisId,
          articleId
        )
      return result
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(
        500,
        'Error linking identified requirement to article'
      )
    }
  }
}

export default RequirementsIdentificationService
