import IdentifyRequirementRepository from '../../repositories/IdentifyRequirement.repository.js'
import SubjectsRepository from '../../repositories/Subject.repository.js'
import AspectsRepository from '../../repositories/Aspects.repository.js'
import ArticlesRepository from '../../repositories/Articles.repository.js'
import UserRepository from '../../repositories/User.repository.js'
import RequirementsRepository from '../../repositories/Requirements.repository.js'
import { identifyRequirementsSchema } from '../../schemas/identifyRequirements.schema.js'
import LegalBasisRepository from '../../repositories/LegalBasis.repository.js'
import identifyRequirementsQueue from '../../workers/identifyRequirementsWorker.js'
import ErrorUtils from '../../utils/Error.js'
import { z } from 'zod'
/**
 * Service class for handling Identify Requirements operations.
 */
class IdentifyRequirementsService {
  /**
   * Starts a new requirements identification for selected legal bases and associated requirements.
   * @param {Object} identifyRequirementData  - The data to identify requeriments.
   * @param {string[]} identifyRequirementData.legalBasisIds - The IDs of the selected legal bases.
   * @param {string} identifyRequirementData.subjectId - The ID of the subject.
   * @param {string[]} identifyRequirementData.aspectsIds - The IDs of the selected aspects.
   * @param {string} identifyRequirementData.intelligenceLevel - The level of intelligence for the identification of requirements.
   * @param {number} userId - The ID of the user who starts the analysis.
   * @returns {Promise<number>} - The ID of the created job.
   */
  static async startIdentify (identifyRequirementData, userId) {
    try {
      const parsedIdentifyRequirementData = identifyRequirementsSchema.parse(
        identifyRequirementData
      )
      const legalBasis = await LegalBasisRepository.findByIds(
        parsedIdentifyRequirementData.legalBasisIds
      )
      if (
        legalBasis.length !== parsedIdentifyRequirementData.legalBasisIds.length
      ) {
        const notFoundIds = parsedIdentifyRequirementData.legalBasisIds.filter(
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
          'Some legal basis have no associated articles',
          {
            missingArticlesLegalBasis
          }
        )
      }
      const subjectExists = await SubjectsRepository.findById(
        parsedIdentifyRequirementData.subjectId
      )
      if (!subjectExists) {
        throw new ErrorUtils(404, 'Subject not found')
      }
      const validAspectIds = await AspectsRepository.findByIds(
        parsedIdentifyRequirementData.aspectsIds
      )
      if (
        validAspectIds.length !==
        parsedIdentifyRequirementData.aspectsIds.length
      ) {
        const notFoundIds = parsedIdentifyRequirementData.aspectsIds.filter(
          (id) => !validAspectIds.includes(id)
        )

        throw new ErrorUtils(404, 'Aspects not found for IDs', { notFoundIds })
      }
      const requirements = await RequirementsRepository.findBySubjectAndAspects(
        parsedIdentifyRequirementData.subjectId,
        parsedIdentifyRequirementData.aspectsIds
      )
      if (!requirements) {
        throw new ErrorUtils(
          400,
          'No requirements found for the given subject and aspects',
          {
            subjectId: parsedIdentifyRequirementData.subjectId,
            aspectIds: parsedIdentifyRequirementData.aspectsIds
          }
        )
      }
      const intelligenceLevel = parsedIdentifyRequirementData.intelligenceLevel
      const job = await identifyRequirementsQueue.add({
        legalBasis,
        requirements,
        intelligenceLevel,
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
        'Unexpected error during start identify requirements'
      )
    }
  }

  /**
   * Creates a new identified requirement in the database.
   *
   * This function registers an identified requirement based on a legal analysis.
   *
   * @param {number} requirementId - The ID of the requirement being identified.
   * @returns {Promise<number>} - Returns the ID of the created identified requirement.
   * @param {number} userId - The ID of the user performing the analysis.
   * @throws {ErrorUtils} - If an error occurs during the insertion.
   */
  static async createIdentifyRequirement (requirementId, userId) {
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
      const identifyRequirementId =
        await IdentifyRequirementRepository.createIdentifyRequirement(
          requirementId,
          userId
        )
      return identifyRequirementId
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Error creating identified requirement')
    }
  }

  /**
   * Links an identified requirement to a legal basis in the database.
   *
   * This function creates a relationship between an identified requirement and a legal basis.
   *
   * @param {number} identifyRequirementId - The ID of the identified requirement.
   * @param {number} legalBasisId - The ID of the legal basis.
   * @returns {Promise<boolean>} - Returns `true` if the link was successful, `false` otherwise.
   * @throws {ErrorUtils} - If an error occurs during the insertion.
   */
  static async linkToLegalBasis (identifyRequirementId, legalBasisId) {
    try {
      const legalBasis = await LegalBasisRepository.findById(legalBasisId)
      if (!legalBasis) {
        throw new ErrorUtils(404, 'LegalBasis not found')
      }
      const result = await IdentifyRequirementRepository.linkToLegalBasis(
        identifyRequirementId,
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
   *
   * @param {number} identifyRequirementId - The ID of the identified requirement.
   * @param {number} legalBasisId - The ID of the legal basis.
   * @param {number} articleId - The ID of the article.
   * @returns {Promise<boolean>} - Returns `true` if the link was successful, `false` otherwise.
   * @throws {ErrorUtils} - If an error occurs during the insertion.
   */
  static async linkObligatoryArticle (
    identifyRequirementId,
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
      const result = await IdentifyRequirementRepository.linkObligatoryArticle(
        identifyRequirementId,
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
   *
   * @param {number} identifyRequirementId - The ID of the identified requirement.
   * @param {number} legalBasisId - The ID of the legal basis.
   * @param {number} articleId - The ID of the article.
   * @returns {Promise<boolean>} - Returns `true` if the link was successful, `false` otherwise.
   * @throws {ErrorUtils} - If an error occurs during the insertion.
   */
  static async linkComplementaryArticle (
    identifyRequirementId,
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
        await IdentifyRequirementRepository.linkComplementaryArticle(
          identifyRequirementId,
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

export default IdentifyRequirementsService
