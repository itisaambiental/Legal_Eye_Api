import sendLegalBasisQueue from '../queues/sendLegalBasisQueue.js'
import HttpException from '../utils/HttpException.js'
import LegalBasisRepository from '../repositories/LegalBasis.repository.js'
import ArticlesRepository from '../repositories/Articles.repository.js'
import UserRepository from '../repositories/User.repository.js'
import EmailService from '../services/email/Email.service.js'
import AcmSuiteService from '../services/legalBasis/acmSuite/AcmSuite.service.js'
import emailQueue from './emailWorker.js'
import { CONCURRENCY_SEND_LEGAL_BASIS } from '../config/variables.config.js'
import { sleep } from '../utils/sleep.js'
import { format } from 'date-fns'

/**
 * @typedef {Object} SendLegalBasisJobData
 * @property {number} userId - ID of the user who initiated the legal basis sending process.
 * @property {number[]} legalBasisIds - List of legal basis IDs to be sent to ACM Suite.
 */

const CONCURRENCY = Number(CONCURRENCY_SEND_LEGAL_BASIS || 1)

/**
 * Worker for processing send legalbasis jobs.
 * Steps:
 * 1. Validates job and dependencies.
 * 2. Sends legal basis and articles to ACM Suite.
 * 3. Notifies user of success or failure.
 *
 * @param {import('bull').Job<import('bull').Job>} job
 * @param {import('bull').ProcessCallbackFunction} done
 */
sendLegalBasisQueue.process(CONCURRENCY, async (job, done) => {
  /** @type {SendLegalBasisJobData} */
  const { userId, legalBasisIds } = job.data
  try {
    const currentJob = await sendLegalBasisQueue.getJob(job.id)
    if (!currentJob) throw new HttpException(404, 'Job not found')

    let totalTasks = 0
    let completedTasks = 0
    const successLegalBasis = []
    const failedLegalBasis = []
    const acmSuiteService = new AcmSuiteService()
    await acmSuiteService.auth()
    const user = await UserRepository.findById(userId)

    for (const legalBasisId of legalBasisIds) {
      const articles = await ArticlesRepository.findByLegalBasisId(
        legalBasisId
      )
      totalTasks += 1 + (articles ? articles.length : 0)
    }
    for (const legalBasisId of legalBasisIds) {
      let legalBase
      try {
        legalBase = await LegalBasisRepository.findById(legalBasisId)
        if (!legalBase) continue
        const classificationId = await acmSuiteService.getClassificationId(
          legalBase.classification
        )
        const jurisdictionId = await acmSuiteService.getJurisdictionId(
          legalBase.jurisdiction
        )
        const stateId = legalBase.state
          ? await acmSuiteService.getStateId(legalBase.state)
          : null
        const municipalityId =
          legalBase.state && legalBase.municipality
            ? await acmSuiteService.getMunicipalityId(
              stateId,
              legalBase.municipality
            )
            : null
        const legalBasisIdAcmSuite = await acmSuiteService.sendLegalBasis({
          legalName: legalBase.legal_name,
          abbreviation: legalBase.abbreviation,
          lastReform: format(new Date(legalBase.lastReform), 'yyyy-MM-dd'),
          classificationId,
          jurisdictionId,
          stateId,
          municipalityId
        })
        completedTasks++
        await currentJob.progress(
          Math.floor((completedTasks / totalTasks) * 100)
        )
        const articles = await ArticlesRepository.findByLegalBasisId(
          legalBase.id
        )
        let articlesSent = 0
        let articlesFailed = 0
        if (articles) {
          for (const article of articles) {
            try {
              await acmSuiteService.sendArticle(legalBasisIdAcmSuite, {
                article_name: article.article_name,
                description: article.description,
                article_order: article.article_order
              })
              articlesSent++
            } catch (articleError) {
              articlesFailed++
              if (user) {
                try {
                  const emailData =
                    EmailService.generateSendArticleFailureEmail(
                      user.gmail,
                      legalBase.legal_name,
                      article.article_name
                    )
                  await emailQueue.add(emailData)
                } catch (notifyErr) {
                  console.error(
                    'Error sending article failure notification:',
                    notifyErr
                  )
                }
              }
            }
            completedTasks++
            await currentJob.progress(Math.floor((completedTasks / totalTasks) * 100))
            await sleep(3000)
          }
        }
        successLegalBasis.push({
          name: legalBase.legal_name,
          articlesSent,
          articlesFailed
        })
      } catch (legalBasisError) {
        if (user && legalBase) {
          try {
            failedLegalBasis.push(legalBase.legal_name)
            const emailData = EmailService.generateSendLegalBasisFailureEmail(
              user.gmail,
              legalBase.legal_name
            )
            await emailQueue.add(emailData)
          } catch (notifyErr) {
            console.error(
              'Error sending legal basis failure notification:',
              notifyErr
            )
          }
        }
        continue
      }
    }
    if (user) {
      try {
        const emailData = EmailService.generateLegalBasisSummaryReportEmail(
          user.gmail,
          successLegalBasis,
          failedLegalBasis
        )
        await emailQueue.add(emailData)
      } catch (notifyErr) {
        console.error('Error sending final summary notification:', notifyErr)
      }
    }
    done(null)
  } catch (error) {
    try {
      const user = await UserRepository.findById(userId)
      if (user) {
        const emailData = EmailService.generateAllLegalBasisFailedEmail(
          user.gmail
        )
        await emailQueue.add(emailData)
      }
    } catch (notifyErr) {
      console.error('Error sending total failure notification:', notifyErr)
    }
    if (error instanceof HttpException) return done(error)
    done(new HttpException(500, 'Unexpected error sending legal basis'))
  }
})

export default sendLegalBasisQueue
