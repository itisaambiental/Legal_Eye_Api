import legalBasis from '../queues/legalBasisQueue.js'
import LegalBasisService from '../services/legalBasis/LegalBasis.service.js'

/**
 * Worker for processing legal basis jobs from the legalBasis queue.
 * Listens to the legalBasis queue and processes the legal basis data.
 * Handles successful job completion and error cases.
 * @type {process}
 */
legalBasis.process(async (job, done) => {
  try {
    /**
     * Destructure the job data to get legal basis details.
     * @param {Object} job.data - The job data containing legal basis details.
     * @param {string} params.legalName - The name of the legal basis.
     * @param {string} params.subject - The name of the legal basis.
     * @param {string} params.aspects - The name of the legal basis.
     * @param {string} params.classification - The classification of the legal basis.
     * @param {string} params.jurisdiction - The jurisdiction of the legal basis.
     * @param {string} [params.state] - The state associated with the legal basis.
     * @param {string} [params.municipality] - The municipality associated with the legal basis.
     * @param {string} params.lastReform - The date of the last reform.
     * @param {Object} params.document - The document to process.
     */
    const { legalName, subject, aspects, classification, jurisdiction, state, municipality, lastReform, document } = job.data
    const response = await LegalBasisService.create({ legalName, subject, aspects, classification, jurisdiction, state, municipality, lastReform, document })
    done(null, response.legalBase)
  } catch (error) {
    console.error('Error processing legal basis', error)
    done(error)
  }
})

export default legalBasis
