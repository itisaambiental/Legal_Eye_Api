import requirementsIdentificationQueue from '../queues/requirementsIdentificationQueue.js'
import LegalBasisRepository from '../repositories/LegalBasis.repository.js'
import RequirementRepository from '../repositories/Requirements.repository.js'
import RequirementsIdentificationService from '../services/requirements/requirementIdentification/RequirementsIdentification.service.js'
import UserRepository from '../repositories/User.repository.js'
import RequirementIdentifier from '../services/requirements/requirementIdentification/RequirementIdentifier.js'
import ErrorUtils from '../utils/Error.js'
import { CONCURRENCY_IDENTIFY_REQUIREMENTS } from '../config/variables.config.js'

/**
 * @typedef {Object} LegalBase
 * @property {import('../models/LegalBasis.model.js').default} legalBase - The legal basis information.
 * @property {import('../models/Article.model.js').default[]} articles - The articles associated with the legal basis.
 */

/**
 * AI Models.
 * @type {Object}
 */
const models = {
  High: 'gpt-4o',
  Low: 'gpt-4o-mini'
}

/**
 * Returns the appropriate model based on the provided intelligence level.
 *
 * @param {string|null|undefined} intelligenceLevel - The intelligence level, expected to be 'High' or 'Low'.
 * @returns {string} - Returns 'gpt-4o' if intelligenceLevel is 'High'; otherwise, returns 'gpt-4o-mini'.
 */
function getModel (intelligenceLevel) {
  return intelligenceLevel === 'High' ? models.High : models.Low
}

/**
 * Maximum number of asynchronous operations possible in parallel.
 */
const CONCURRENCY = Number(CONCURRENCY_IDENTIFY_REQUIREMENTS || 1)

/**
 * @typedef {Object} RequirementsIdentificationJobData
 * @property {LegalBase[]} legalBasis - The list of legal bases.
 * @property {import('../models/Requirement.model.js').default[]} requirements - The list of requirements.
 * @property {string} intelligenceLevel - The intelligence level ('High' or 'Low').
 * @property {number} userId - The ID of the user performing the analysis.
 */

/**
 * Worker for processing jobs from the requirements identification queue.
 * Listens to the requirements identification queue and processes the data.
 *
 * @param {import('bull').Job<RequirementsIdentificationJobData>} job - The job object containing data to be processed.
 * @param {import('bull').ProcessCallbackFunction} done - Callback function to signal job completion.
 * @throws {ErrorUtils} - Throws an error if any step in the job processing fails.
 */
requirementsIdentificationQueue.process(CONCURRENCY, async (job, done) => {
  /** @type {RequirementsIdentificationJobData} */
  const { legalBasis, requirements, intelligenceLevel, userId } = job.data
  try {
    const currentJob = await requirementsIdentificationQueue.getJob(job.id)
    if (!currentJob) {
      return done(new ErrorUtils(404, 'Job not found'))
    }
    if (await currentJob.isFailed()) {
      return done(new ErrorUtils(500, 'Job was canceled'))
    }
    const userExists = await UserRepository.findById(userId)
    if (!userExists) {
      return done(new ErrorUtils(404, 'User not found'))
    }
    const legalBasisIds = legalBasis.map(lb => lb.legalBase.id)
    const foundLegalBases = await LegalBasisRepository.findByIds(legalBasisIds)
    const missingLegalBasisIds = legalBasisIds.filter(id => !foundLegalBases.some(lb => lb.id === id))
    if (missingLegalBasisIds.length > 0) {
      return done(new ErrorUtils(404, 'Some legal bases were not found', { missingLegalBasisIds }))
    }
    const requirementsIds = requirements.map(req => req.id)
    const foundRequirements = await RequirementRepository.findByIds(requirementsIds)
    const missingRequirementsIds = requirementsIds.filter(id => !foundRequirements.some(req => req.id === id))

    if (missingRequirementsIds.length > 0) {
      return done(new ErrorUtils(404, 'Some requirements were not found', { missingRequirementsIds }))
    }
    const model = getModel(intelligenceLevel)
    const totalTasks = legalBasis.reduce((sum, lb) => sum + (lb.articles.length * requirements.length), 0)
    for (const requirement of requirements) {
      const requirementIdentificationId = await RequirementsIdentificationService.createRequirementIdentification(
        requirement.id,
        userId
      )
      if (!requirementIdentificationId) {
        return done(new ErrorUtils(500, 'Failed to create requirements identification'))
      }
      for (const legalBase of legalBasis) {
        const linkLegalBasisSuccess = await RequirementsIdentificationService.linkToLegalBasis(
          requirementIdentificationId,
          legalBase.legalBase.id
        )
        if (!linkLegalBasisSuccess) {
          return done(new ErrorUtils(500, 'Failed to link to legal basis'))
        }
        const identifier = new RequirementIdentifier(legalBase, requirement, model, currentJob, totalTasks)
        const { obligatoryArticles, complementaryArticles } = await identifier.identifyRequirements()
        for (const article of obligatoryArticles) {
          const articleLinkSuccess = await RequirementsIdentificationService.linkToObligatoryArticle(
            requirementIdentificationId,
            legalBase.legalBase.id,
            article.id
          )
          if (!articleLinkSuccess) {
            return done(new ErrorUtils(500, 'Failed to link to obligatory article'))
          }
        }
        for (const article of complementaryArticles) {
          const articleLinkSuccess = await RequirementsIdentificationService.linkToComplementaryArticle(
            requirementIdentificationId,
            legalBase.legalBase.id,
            article.id
          )
          if (!articleLinkSuccess) {
            return done(new ErrorUtils(500, 'Failed to link to complementary article'))
          }
        }
      }
    }
    done(null)
  } catch (error) {
    if (error instanceof ErrorUtils) {
      return done(error)
    }
    return done(new ErrorUtils(500, 'Unexpected error during requirements identification'))
  }
})

export default requirementsIdentificationQueue
