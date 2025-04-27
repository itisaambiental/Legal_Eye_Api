import sendLegalBasisQueue from '../queues/sendLegalBasisQueue.js'
import ErrorUtils from '../utils/Error.js'
import LegalBasisRepository from '../repositories/LegalBasis.repository.js'
import ArticlesRepository from '../repositories/Articles.repository.js'
import UserRepository from '../repositories/User.repository.js'
import EmailService from '../services/email/Email.service.js'
import AcmSuiteService from '../services/legalBasis/acmSuite/AcmSuite.service.js'
import emailQueue from './emailWorker.js'
import { CONCURRENCY_SEND_LEGAL_BASIS } from '../config/variables.config.js'

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
  const { userId, legalBasisIds } = job.data
  try {
    console.log(job.data, job.id)
    const currentJob = await sendLegalBasisQueue.getJob(job.id)
    if (!currentJob) throw new ErrorUtils(404, 'Job not found')
    if (await currentJob.isFailed()) throw new ErrorUtils(500, 'Job was canceled')
    const acmSuiteService = new AcmSuiteService()
    await acmSuiteService.auth()
    const user = await UserRepository.findById(userId)
    let totalTasks = 0
    let completedTasks = 0
    for (const legalBasisId of legalBasisIds) {
      const articles = await ArticlesRepository.findByLegalBasisId(legalBasisId)
      totalTasks += 1
      totalTasks += articles.length
    }
    for (const legalBasisId of legalBasisIds) {
      try {
        console.log('Sending legal basis:', legalBasisId)
        const legalBase = await LegalBasisRepository.findById(legalBasisId)
        console.log('Legal basis:', legalBase)
        if (!legalBase) continue
        const classificationId = await acmSuiteService.getClassificationId(legalBase.classification)
        const jurisdictionId = await acmSuiteService.getJurisdictionId(legalBase.jurisdiction)
        const stateId = legalBase.state ? await acmSuiteService.getStateId(legalBase.state) : null
        const municipalityId = (legalBase.state && legalBase.municipality)
          ? await acmSuiteService.getMunicipalityId(stateId, legalBase.municipality)
          : null
        const legalBasisIdAcmSuite = await acmSuiteService.sendLegalBasis({
          legalName: legalBase.legal_name,
          abbreviation: legalBase.abbreviation,
          lastReform: legalBase.lastReform,
          classificationId,
          jurisdictionId,
          stateId,
          municipalityId
        })
        console.log('Legal basis sent:', legalBasisIdAcmSuite)
        completedTasks++
        await currentJob.progress(Math.floor((completedTasks / totalTasks) * 100))
        const articles = await ArticlesRepository.findByLegalBasisId(legalBase.id)
        if (articles) {
          for (const article of articles) {
            await acmSuiteService.sendArticle(legalBasisIdAcmSuite, {
              article_name: article.article_name,
              description: article.description,
              article_order: article.article_order
            })
            console.log('Article sent:', article.article_name)
            completedTasks++
            await currentJob.progress(Math.floor((completedTasks / totalTasks) * 100))
          }
        }
      } catch (error) {
        if (error instanceof ErrorUtils && user) {
          try {
            const legalBase = await LegalBasisRepository.findById(legalBasisId)
            const emailData = EmailService.generateSendLegalBasisFailureEmail(
              user.gmail,
              legalBase?.legal_name,
              error.message
            )
            await emailQueue.add(emailData)
          } catch (notifyError) {
            console.error('Error sending notification email:', notifyError)
          }
        }
      }
    }
    if (user) {
      try {
        const emailData = EmailService.generateAllLegalBasisSentSuccessEmail(user.gmail)
        await emailQueue.add(emailData)
      } catch (notifyError) {
        console.error('Error sending notification email:', notifyError)
      }
    }
    done(null)
  } catch (error) {
    console.error('Error processing send legal basis job:', error)
    try {
      const user = await UserRepository.findById(userId)
      if (user) {
        const emailData = EmailService.generateAllLegalBasisFailedEmail(user.gmail)
        await emailQueue.add(emailData)
      }
    } catch (notifyError) {
      console.error('Error sending total notification email:', notifyError)
    }
    if (error instanceof ErrorUtils) return done(error)
    done(new ErrorUtils(500, 'Unexpected error sending legal basis'))
  }
})

export default sendLegalBasisQueue
