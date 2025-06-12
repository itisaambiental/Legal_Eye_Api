import reqIdentificationQueue from '../queues/reqIdentificationQueue.js'
import ArticlesRepository from '../repositories/Articles.repository.js'
import ReqIdentificationRepository from '../repositories/ReqIdentification.repository.js'
import ReqIdentifierService from '../services/reqIdentification/reqIdentifier/ReqIdentifier.service.js'
import EmailService from '../services/email/Email.service.js'
import HttpException from '../services/errors/HttpException.js'
import { CONCURRENCY_REQ_IDENTIFICATIONS } from '../config/variables.config.js'
import { getReasoningModel } from '../config/openapi.config.js'
import emailQueue from './emailWorker.js'

/**
 * @typedef {Object} ReqIdentificationJobData
 * @property {number} reqIdentificationId
 * @property {import('../models/LegalBasis.model.js').default[]} legalBases
 * @property {import('../models/Requirement.model.js').default[]} requirements
 * @property {string} intelligenceLevel
 */

const CONCURRENCY = Number(CONCURRENCY_REQ_IDENTIFICATIONS || 1)

reqIdentificationQueue.process(CONCURRENCY, async (job, done) => {
  /** @type {ReqIdentificationJobData} */
  const { reqIdentificationId, legalBases, requirements, intelligenceLevel } = job.data

  try {
    const currentJob = await reqIdentificationQueue.getJob(job.id)
    if (!currentJob) throw new HttpException(404, 'Job not found')

    const reqIdentification = await ReqIdentificationRepository.findById(reqIdentificationId)
    if (!reqIdentification) throw new HttpException(404, 'Requirement identification not found')

    const totalLegalBasis = new Set()
    let totalArticles = 0
    let totalRequirements = 0
    let totalTasks = 0
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
      for (const legalBase of legalBasis) {
        try {
          const articles = await ArticlesRepository.findByLegalBasisId(
            legalBase.id
          )
          if (articles) totalTasks += articles.length
        } catch {
          continue
        }
      }
    }

    if (totalTasks === 0) {
      await ReqIdentificationRepository.markAsCompleted(reqIdentificationId)
      await currentJob.progress(100)
      return done()
    }

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

      totalRequirements++
      legalBasis.forEach((lb) => totalLegalBasis.add(lb.id))

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

      try {
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
      } catch {
        continue
      }

      for (const legalBase of legalBasis) {
        try {
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
        } catch {
          continue
        }

        const articles = await ArticlesRepository.findByLegalBasisId(legalBase.id)
        for (const article of articles) {
          try {
            const existsArticle =
              await ReqIdentificationRepository.existsArticleLegalBaseRequirementLink(
                reqIdentificationId,
                requirement.id,
                legalBase.id,
                article.id
              )
            if (!existsArticle) {
              const model = getReasoningModel(intelligenceLevel)
              const reqIdentifier = new ReqIdentifierService(
                article,
                requirement,
                model
              )
              const { classification, score } = await reqIdentifier.identifyRequirements()
              await ReqIdentificationRepository.linkArticleToLegalBaseToRequirement(
                reqIdentificationId,
                requirement.id,
                legalBase.id,
                article.id,
                classification,
                score
              )
              totalArticles++
            }
          } catch {
            try {
              if (reqIdentification?.user?.gmail) {
                const emailData =
                  EmailService.generateReqIdentificationArticleFailureEmail(
                    reqIdentification.user.gmail,
                    reqIdentificationId,
                    reqIdentification.name,
                    article.article_name
                  )
                await emailQueue.add(emailData)
              }
            } catch (notifyErr) {
              console.error('Error sending article failure email:', notifyErr)
            }
            continue
          }

          await currentJob.progress(
            Math.floor((++completedTasks / totalTasks) * 100)
          )
        }
      }
    }

    await ReqIdentificationRepository.markAsCompleted(reqIdentificationId)

    if (reqIdentification?.user?.gmail) {
      try {
        const emailData =
          EmailService.generateReqIdentificationSummaryReportEmail(
            reqIdentification.user.gmail,
            reqIdentificationId,
            reqIdentification.name,
            {
              legalBasis: totalLegalBasis.size,
              articles: totalArticles,
              requirements: totalRequirements
            }
          )
        await emailQueue.add(emailData)
      } catch (notifyErr) {
        console.error('Error sending final summary notification:', notifyErr)
      }
    }

    return done()
  } catch (error) {
    console.error(error)
    try {
      await ReqIdentificationRepository.markAsFailed(reqIdentificationId)
      const reqIdentification = await ReqIdentificationRepository.findById(
        reqIdentificationId
      )
      if (reqIdentification?.user?.gmail) {
        const emailData = EmailService.generateReqIdentificationFailureEmail(
          reqIdentification.user.gmail,
          reqIdentificationId,
          reqIdentification.name
        )
        await emailQueue.add(emailData)
      }
    } catch (notifyErr) {
      console.error('Error sending total failure notification:', notifyErr)
    }

    if (error instanceof HttpException) return done(error)
    return done(
      new HttpException(500, 'Unexpected error identifying requirements')
    )
  }
})

export default reqIdentificationQueue
