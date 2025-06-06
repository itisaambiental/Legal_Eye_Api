import reqIdentificationQueue from '../queues/reqIdentificationQueue.js'
import ArticlesRepository from '../repositories/Articles.repository.js'
import ReqIdentificationRepository from '../repositories/ReqIdentification.repository.js'
import HttpException from '../services/errors/HttpException.js'
import { CONCURRENCY_REQ_IDENTIFICATIONS } from '../config/variables.config.js'

/**
 * @typedef {Object} ReqIdentificationJobData
 * @property {number} reqIdentificationId
 * @property {import('../models/LegalBasis.model.js').default[]} legalBases
 * @property {import('../models/Requirement.model.js').default[]} requirements
 * @property {string} intelligenceLevel
 */

const CONCURRENCY = Number(CONCURRENCY_REQ_IDENTIFICATIONS || 1)

/**
 * Worker for processing requirement identification jobs.
 * Steps:
 * 1. Validates job and dependencies.
 * 2. For each requirement:
 *    - Filters matching legal bases by subject and common aspects.
 *    - Generates the full requirement name from all unique matches.
 *    - Links requirement and all applicable legal bases.
 */
reqIdentificationQueue.process(CONCURRENCY, async (job, done) => {
  /** @type {ReqIdentificationJobData} */
  const { reqIdentificationId, legalBases, requirements } = job.data

  try {
    const currentJob = await reqIdentificationQueue.getJob(job.id)
    if (!currentJob) throw new HttpException(404, 'Job not found')

    for (const requirement of requirements) {
      const legalBasis = legalBases.filter(
        (lb) =>
          lb.subject.subject_id === requirement.subject.subject_id &&
          requirement.aspects.some((reqAspect) =>
            lb.aspects.some(
              (lbAspect) => lbAspect.aspect_id === reqAspect.aspect_id
            )
          )
      )

      if (legalBasis.length === 0) continue

      const subjectAbbreviations = [
        ...new Set(
          legalBasis.map((lb) => lb.subject.abbreviation).filter(Boolean)
        )
      ]

      const aspectAbbreviations = [
        ...new Set(
          legalBasis.flatMap((lb) =>
            lb.aspects.map((a) => a.abbreviation).filter(Boolean)
          )
        )
      ]

      const states = [
        ...new Set(legalBasis.map((lb) => lb.state).filter(Boolean))
      ]

      const municipalities = [
        ...new Set(legalBasis.map((lb) => lb.municipality).filter(Boolean))
      ]

      const subject = subjectAbbreviations.join(', ')
      const aspect = aspectAbbreviations.join(', ')
      const state = states.join(', ')
      const municipality = municipalities.join(', ')
      const requirementNumber = requirement.requirement_number

      const requirementName = [
        subject,
        aspect,
        state,
        municipality,
        requirementNumber
      ]
        .map((part) => String(part).trim())
        .filter((part) => part !== '')
        .filter((part, index, arr) => arr.indexOf(part) === index)
        .join(' - ')

      await ReqIdentificationRepository.linkRequirement(
        reqIdentificationId,
        requirement.id,
        requirementName
      )

      for (const legalBase of legalBasis) {
        await ReqIdentificationRepository.linkLegalBaseToRequirement(
          reqIdentificationId,
          requirement.id,
          legalBase.id
        )
        const articles = await ArticlesRepository.findByLegalBasisId(
          legalBase.id
        )
        if (articles) {
          for (const article of articles) {
            await ReqIdentificationRepository.linkArticleToLegalBaseToRequirement(
              reqIdentificationId,
              requirement.id,
              legalBase.id,
              article.id
            )
          }
        }
      }
    }
  } catch (error) {
    console.error(error)
    if (error instanceof HttpException) return done(error)
    done(new HttpException(500, 'Unexpected error identifying requirements'))
  }
})

export default reqIdentificationQueue
