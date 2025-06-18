import reqIdentificationQueue from '../queues/reqIdentificationQueue.js'
import ArticlesRepository from '../repositories/Articles.repository.js'
import ReqIdentificationRepository from '../repositories/ReqIdentification.repository.js'
import RequirementTypesRepository from '../repositories/RequirementTypes.repository.js'
import LegalVerbsRepository from '../repositories/LegalVerbs.repository.js'
import ReqIdentifierService from '../services/reqIdentification/reqIdentifier/ReqIdentifier.service.js'
import RequirementTypesIdentifierService from '../services/reqIdentification/reqIdentifier/RequirementTypesIdentifier.service.js'
import LegalVerbsTranslatorService from '../services/reqIdentification/reqIdentifier/LegalVerbsTranslator.service.js'
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

/**
 * Worker for processing requirement identification jobs.
 *
 * Steps:
 * 1. Validates job and fetches requirement identification from DB.
 * 2. For each requirement:
 *    a. Filters applicable legal bases based on subject and aspects.
 *    b. Links the requirement to the identification (if not already linked).
 *    c. For each legal basis:
 *       i. Links it to the requirement.
 *       ii. Retrieves its articles and:
 *           - Classifies each article.
 *           - Links the article with classification and score.
 *    d. Extracts top mandatory articles to:
 *       i. Identify applicable requirement types.
 *       ii. Translate legal verbs.
 * 3. Tracks progress throughout the process.
 * 4. Marks the identification as completed or failed.
 * 5. Notifies the user by email with summary or error report.
 *
 * @param {import('bull').Job<import('../types').ReqIdentificationJobData>} job
 * @param {import('bull').DoneCallback} done
 */

reqIdentificationQueue.process(CONCURRENCY, async (job, done) => {
  /** @type {ReqIdentificationJobData} */
  const { reqIdentificationId, legalBases, requirements, intelligenceLevel } =
    job.data

  try {
    const currentJob = await reqIdentificationQueue.getJob(job.id)
    if (!currentJob) throw new HttpException(404, 'Job not found')

    const reqIdentification = await ReqIdentificationRepository.findById(
      reqIdentificationId
    )
    if (!reqIdentification) { throw new HttpException(404, 'Requirement identification not found') }

    const model = getReasoningModel(intelligenceLevel)
    const totalLegalBasis = new Set()
    let totalArticles = 0
    let totalRequirements = 0
    let totalTasks = 0
    let completedTasks = 0

    for (const requirement of requirements) {
      totalTasks++

      const legalBasis = legalBases.filter(
        (lb) =>
          lb.subject.subject_id === requirement.subject.subject_id &&
          requirement.aspects.some((reqAspect) =>
            lb.aspects.some(
              (lbAspect) => lbAspect.aspect_id === reqAspect.aspect_id
            )
          )
      )

      totalTasks += legalBasis.length

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

      totalTasks += 2
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

      const requirementName = [
        ...new Set([
          ...legalBasis.map((lb) => lb.subject.abbreviation).filter(Boolean),
          ...legalBasis.flatMap((lb) =>
            lb.aspects.map((a) => a.abbreviation).filter(Boolean)
          ),
          ...legalBasis.map((lb) => lb.state).filter(Boolean),
          ...legalBasis.map((lb) => lb.municipality).filter(Boolean),
          requirement.requirement_number
        ])
      ]
        .map((part) => String(part).trim())
        .filter((part) => part !== '')
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
      completedTasks++
      await currentJob.progress(
        Math.floor((completedTasks / totalTasks) * 100)
      )

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
        completedTasks++
        await currentJob.progress(
          Math.floor((completedTasks / totalTasks) * 100)
        )

        const articles = await ArticlesRepository.findByLegalBasisId(
          legalBase.id
        )
        if (!articles) continue

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
              const reqIdentifier = new ReqIdentifierService(
                article,
                requirement,
                model
              )
              const { classification, score } =
                await reqIdentifier.identifyRequirements()
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
          completedTasks++
          await currentJob.progress(
            Math.floor((completedTasks / totalTasks) * 100)
          )
        }
      }

      const mandatoryArticles =
        await ReqIdentificationRepository.findTopMandatoryArticlesByRequirement(
          reqIdentificationId,
          requirement.id
        )
      if (mandatoryArticles) {
        try {
          const requirementTypes = await RequirementTypesRepository.findAll()
          if (requirementTypes) {
            const requirementTypesIdentifierService =
              new RequirementTypesIdentifierService(
                mandatoryArticles,
                requirementTypes,
                model
              )
            const requirementsTypesIdentifiedIds =
              await requirementTypesIdentifierService.identifyRequirementTypes()
            await ReqIdentificationRepository.linkRequirementTypesToRequirement(
              reqIdentificationId,
              requirement.id,
              requirementsTypesIdentifiedIds
            )
          }
          completedTasks++
          await currentJob.progress(
            Math.floor((completedTasks / totalTasks) * 100)
          )

          const mandatoryArticlesText = mandatoryArticles
            .map((article) => article.plain_description)
            .join('\n')
          const legalVerbs = await LegalVerbsRepository.findAll()
          if (legalVerbs) {
            const legalVerbsTranslator = new LegalVerbsTranslatorService(
              mandatoryArticlesText,
              legalVerbs,
              model
            )
            const legalVerbsTranslations =
              await legalVerbsTranslator.translateRequirement()
            await ReqIdentificationRepository.linkLegalVerbsTranslationsToRequirement(
              reqIdentificationId,
              requirement.id,
              legalVerbsTranslations
            )
          }
          completedTasks++
          await currentJob.progress(
            Math.floor((completedTasks / totalTasks) * 100)
          )
        } catch {
          continue
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
