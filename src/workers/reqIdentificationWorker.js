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
 */
reqIdentificationQueue.process(CONCURRENCY, async (job, done) => {
  /** @type {ReqIdentificationJobData} */
  const { reqIdentificationId, legalBases, requirements } = job.data
  console.log('Processing requirement identification job:', job.id)

  try {
    const currentJob = await reqIdentificationQueue.getJob(job.id)
    if (!currentJob) throw new HttpException(404, 'Job not found')

    let totalTasks = 0
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
      for (const legalBase of legalBasis) {
        const articles = await ArticlesRepository.findByLegalBasisId(
          legalBase.id
        )
        if (articles) {
          totalTasks += articles.length
        }
      }
    }

    if (totalTasks === 0) {
      await currentJob.progress(100)
      return done()
    }

    let completedTasks = 0

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

      const requirementName = [
        subjectAbbreviations.join(', '),
        aspectAbbreviations.join(', '),
        states.join(', '),
        municipalities.join(', '),
        requirement.requirement_number
      ]
        .map((part) => String(part).trim())
        .filter((part) => part !== '')
        .filter((part, index, arr) => arr.indexOf(part) === index)
        .join(' - ')

      const existsRequirement =
        await ReqIdentificationRepository.existsRequirementLink(
          reqIdentificationId,
          requirement.id
        )
      if (!existsRequirement) {
        await ReqIdentificationRepository.linkRequirement(
          reqIdentificationId,
          requirement.id,
          requirementName
        )
      }

      for (const legalBase of legalBasis) {
        const existsLegalBasis =
          await ReqIdentificationRepository.existsLegalBaseRequirementLink(
            reqIdentificationId,
            requirement.id,
            legalBase.id
          )
        if (!existsLegalBasis) {
          await ReqIdentificationRepository.linkLegalBaseToRequirement(
            reqIdentificationId,
            requirement.id,
            legalBase.id
          )
        }

        const articles = await ArticlesRepository.findByLegalBasisId(
          legalBase.id
        )

        if (articles) {
          for (const article of articles) {
            const existsArticle =
              await ReqIdentificationRepository.existsArticleLegalBaseRequirementLink(
                reqIdentificationId,
                requirement.id,
                legalBase.id,
                article.id
              )
            if (!existsArticle) {
              await ReqIdentificationRepository.linkArticleToLegalBaseToRequirement(
                reqIdentificationId,
                requirement.id,
                legalBase.id,
                article.id
              )
            }

            completedTasks += 1
            await currentJob.progress(
              Math.floor((completedTasks / totalTasks) * 100)
            )
          }
        }
      }
    }

    return done()
  } catch (error) {
    console.error(error)
    if (error instanceof HttpException) return done(error)
    return done(
      new HttpException(500, 'Unexpected error identifying requirements')
    )
  }
})

export default reqIdentificationQueue
