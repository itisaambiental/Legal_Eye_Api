import identifyRequirementsQueue from '../queues/identifyRequirementsQueue.js'
import LegalBasisRepository from '../repositories/LegalBasis.repository.js'
import RequirementRepository from '../repositories/Requirements.repository.js'
import IdentifyRequirementsService from '../services/requirements/IdentifyRequirements.service.js'
import RequirementIdentifier from '../services/requirements/requirementIdentification/RequirementIdentifier.js'
import ErrorUtils from '../utils/Error.js'
import { CONCURRENCY_IDENTIFY_REQUIREMENTS } from '../config/variables.config.js'

/**
 * @typedef {Object} Article
 * @property {number} id - The unique identifier of the article.
 * @property {number} legal_basis_id - The ID of the legal basis associated with this article.
 * @property {string} article_name - The name/title of the article.
 * @property {string} description - The description or content of the article.
 * @property {number} article_order - The order of the article within the legal basis.
 */

/**
 * @typedef {Object} LegalBase
 * @property {number} id - The unique identifier of the legal basis.
 * @property {string} legal_name - The name of the legal basis.
 * @property {string} subject - The subject related to the legal basis.
 * @property {string[]} aspects - The aspects covered by the legal basis.
 * @property {string} abbreviation - The abbreviation of the legal basis.
 * @property {string} classification - The classification of the legal basis.
 * @property {string} jurisdiction - The jurisdiction (federal, state, etc.).
 * @property {string} state - The state (if applicable).
 * @property {string} municipality - The municipality (if applicable).
 * @property {string} lastReform - The last reform date.
 * @property {string} url - The URL of the legal document.
 * @property {Article[]} articles - The articles associated with the legal basis.
 */

/**
 * @typedef {Object} Requirement
 * @property {number} id - The unique identifier of the requirement.
 * @property {string} subject - The subject related to the requirement.
 * @property {string} aspect - The aspect related to the requirement.
 * @property {number} requirement_number - The requirement number.
 * @property {string} requirement_name - The name of the requirement.
 * @property {string} mandatory_description - Description of mandatory conditions.
 * @property {string} complementary_description - Description of complementary conditions.
 * @property {string} mandatory_sentences - List of mandatory sentences.
 * @property {string} complementary_sentences - List of complementary sentences.
 * @property {string} mandatory_keywords - List of keywords for mandatory conditions.
 * @property {string} complementary_keywords - List of keywords for complementary conditions.
 * @property {string} condition - The condition for the requirement.
 * @property {string} evidence - The evidence required for compliance.
 * @property {string} periodicity - The periodicity of compliance.
 * @property {string} requirement_type - The type of requirement (e.g., legal, procedural).
 * @property {string} jurisdiction - The jurisdiction applicable.
 * @property {string} state - The state applicable.
 * @property {string} municipality - The municipality applicable.
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
 * @typedef {Object} IdentifyRequirementsJobData
 * @property {LegalBase[]} legalBasis - The list of legal bases.
 * @property {Requirement[]} requirements - The list of requirements.
 * @property {string} intelligenceLevel - The intelligence level ('High' or 'Low').
 */

/**
 * Worker for processing jobs from the identify requirements queue.
 * Listens to the identify requirements queue and processes the data.
 *
 * @param {import('bull').Job<IdentifyRequirementsJobData>} job - The job object containing data to be processed.
 * @param {import('bull').ProcessCallbackFunction} done - Callback function to signal job completion.
 * @throws {ErrorUtils} - Throws an error if any step in the job processing fails.
 */
identifyRequirementsQueue.process(CONCURRENCY, async (job, done) => {
  /** @type {IdentifyRequirementsJobData} */
  const { legalBasis, requirements, intelligenceLevel } = job.data
  try {
    const currentJob = await identifyRequirementsQueue.getJob(job.id)
    if (!currentJob) {
      return done(new ErrorUtils(404, 'Job not found'))
    }
    if (await currentJob.isFailed()) {
      return done(new ErrorUtils(500, 'Job was canceled'))
    }
    const legalBasisIds = legalBasis.map(lb => lb.id)
    const foundLegalBases = await LegalBasisRepository.findByIds(legalBasisIds)
    const missingLegalBasisIds = legalBasisIds.filter(id => !foundLegalBases.some(lb => lb.id === id))
    if (missingLegalBasisIds.length > 0) {
      return done(new ErrorUtils(404, 'LegalBasis not found'))
    }
    const requirementsIds = requirements.map(req => req.id)
    const foundRequirements = await RequirementRepository.findByIds(requirementsIds)
    const missingRequirementsIds = requirementsIds.filter(id => !foundRequirements.some(req => req.id === id))
    if (missingRequirementsIds.length > 0) {
      return done(new ErrorUtils(404, 'Requirements not found'))
    }
    const model = getModel(intelligenceLevel)
    const totalTasks = legalBasis.reduce((sum, lb) => sum + (lb.articles ? lb.articles.length * requirements.length : 0), 0)
    const identifyRequirementIds = []
    for (const requirement of requirements) {
      const identifyRequirementId = await IdentifyRequirementsService.createIdentifyRequirement(requirement.id)
      if (!identifyRequirementId) {
        return done(new ErrorUtils(500, 'Failed to create identify requirement'))
      }
      identifyRequirementIds.push(identifyRequirementId)
      for (const legalBase of legalBasis) {
        const linkLegalBasisSuccess = await IdentifyRequirementsService.linkToLegalBasis(identifyRequirementId, legalBase.id)
        if (!linkLegalBasisSuccess) {
          return done(new ErrorUtils(500, 'Failed link to legal basis'))
        }
        const identifier = new RequirementIdentifier(legalBase, requirement, model, currentJob, totalTasks)
        const { obligatoryArticles, complementaryArticles } = await identifier.identifyRequirements()
        for (const article of obligatoryArticles) {
          const articleLinkSuccess = await IdentifyRequirementsService.linkObligatoryArticle(identifyRequirementId, legalBase.id, article.id)
          if (!articleLinkSuccess) {
            return done(new ErrorUtils(500, 'Failed link to obligatory article'))
          }
        }
        for (const article of complementaryArticles) {
          const articleLinkSuccess = await IdentifyRequirementsService.linkComplementaryArticle(identifyRequirementId, legalBase.id, article.id)
          if (!articleLinkSuccess) {
            return done(new ErrorUtils(500, 'Failed link to complementary article'))
          }
        }
      }
    }
    done(null, { identifyRequirementIds })
  } catch (error) {
    if (error instanceof ErrorUtils) {
      return done(error)
    }
    return done(new ErrorUtils(500, 'Unexpected error during requirements identification'))
  }
})

export default identifyRequirementsQueue
