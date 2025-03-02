import identifyRequirementsQueue from '../queues/identifyRequirementsQueue.js'
import LegalBasisRepository from '../repositories/LegalBasis.repository.js'
import RequirementRepository from '../repositories/Requirements.repository.js'
import IdentifyRequirementsService from '../services/requirements/IdentifyRequirements.service.js'
import RequirementIdentifier from '../services/requirements/requirementIdentification/RequirementIdentifier.js'
import ErrorUtils from '../utils/Error.js'
import { CONCURRENCY_IDENTIFY_REQUIREMENTS } from '../config/variables.config.js'

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
 * Worker for processing  jobs from the identify requirements queue.
 * Listens to the identify requirements queue and processes the data.
 *
 * @param {import('bull').Job} job - The job object containing data to be processed.
 * @param {import('bull').ProcessCallbackFunction} done - Callback function to signal job completion.
 * @throws {ErrorUtils} - Throws an error if any step in the job processing fails.
 */
identifyRequirementsQueue.process(CONCURRENCY, async (job, done) => {
  const { legalBasis, requirements, intelligenceLevel } = job.data
  try {
    const currentJob = await identifyRequirementsQueue.getJob(job.id)
    if (!currentJob) {
      return done(new ErrorUtils(404, 'Job not found'))
    }
    if (await currentJob.isFailed()) {
      return done(new ErrorUtils(500, 'Job was canceled'))
    }
    const legalBasisIds = legalBasis.map(item => item.id)
    const foundLegalBases = await LegalBasisRepository.findByIds(legalBasisIds)
    const foundLegalBasisIds = foundLegalBases.map(item => item.id)
    const missingLegalBasisIds = legalBasisIds.filter(id => !foundLegalBasisIds.includes(id))
    if (missingLegalBasisIds.length > 0) {
      return done(new ErrorUtils(404, 'LegalBasis not found'))
    }
    const requirementsIds = requirements.map(item => item.id)
    const foundRequirements = await RequirementRepository.findByIds(requirementsIds)
    const foundRequirementsIds = foundRequirements.map(item => item.id)
    const missingRequirementsIds = requirementsIds.filter(id => !foundRequirementsIds.includes(id))
    if (missingRequirementsIds.length > 0) {
      return done(new ErrorUtils(404, 'Requirements not found'))
    }
    const model = getModel(intelligenceLevel)
    done(null)
  } catch (error) {
    if (error instanceof ErrorUtils) {
      return done(error)
    }
    return done(new ErrorUtils(500, 'Unexpected error during requirements identification'))
  }
})

export default identifyRequirementsQueue
