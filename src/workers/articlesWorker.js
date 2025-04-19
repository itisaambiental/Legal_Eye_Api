import articlesQueue from '../queues/articlesQueue.js'
import ArticleExtractorFactory from '../services/articles/articleExtraction/ArticleExtractorFactory.js'
import ErrorUtils from '../utils/Error.js'
import DocumentService from '../services/files/Document.service.js'
import LegalBasisRepository from '../repositories/LegalBasis.repository.js'
import ArticlesService from '../services/articles/Articles.service.js'
import UserRepository from '../repositories/User.repository.js'
import EmailService from '../services/email/Email.service.js'
import { CONCURRENCY_EXTRACT_ARTICLES } from '../config/variables.config.js'
import emailQueue from './emailWorker.js'

/**
 * @typedef {Object} ArticleExtractorJobData
 * @property {number} userId - ID of the user who initiated the extraction.
 * @property {number} legalBasisId - ID of the legal basis to extract articles from.
 * @property {'High'|'Low'} [intelligenceLevel] - Optional intelligence level to choose AI model.
 */

/**
 * AI Models.
 */
const models = {
  High: 'gpt-4o',
  Low: 'gpt-4o-mini'
}

/**
 * Selects the appropriate model.
 * @param {string|null|undefined} intelligenceLevel
 * @returns {string}
 */
function getModel (intelligenceLevel) {
  return intelligenceLevel === 'High' ? models.High : models.Low
}

const CONCURRENCY = Number(CONCURRENCY_EXTRACT_ARTICLES || 1)

/**
 * Worker for processing article extraction jobs.
 * Steps:
 * 1. Validates job and dependencies.
 * 2. Downloads and parses document.
 * 3. Extracts articles.
 * 4. Inserts into DB.
 * 5. Notifies user of success or failure.
 *
 * @param {import('bull').Job<import('bull').Job>} job
 * @param {import('bull').ProcessCallbackFunction} done
 */
articlesQueue.process(CONCURRENCY, async (job, done) => {
  /** @type {ArticleExtractorJobData} */
  const { userId, legalBasisId, intelligenceLevel } = job.data
  console.log(job.id)
  try {
    const currentJob = await articlesQueue.getJob(job.id)
    if (!currentJob) throw new ErrorUtils(404, 'Job not found')
    if (await currentJob.isFailed()) throw new ErrorUtils(500, 'Job was canceled')
    const legalBase = await LegalBasisRepository.findById(legalBasisId)
    if (!legalBase) throw new ErrorUtils(404, 'LegalBasis not found')
    const { error, success, text } = await DocumentService.process(legalBase.url)
    if (!success) throw new ErrorUtils(500, 'Document Processing Error', error)
    const model = getModel(intelligenceLevel)
    const extractor = ArticleExtractorFactory.getExtractor(
      legalBase.classification,
      legalBase.legal_name,
      text,
      model,
      currentJob
    )
    if (!extractor) throw new ErrorUtils(400, 'Invalid Classification')
    const extractedArticles = await extractor.extractArticles()
    if (!extractedArticles || extractedArticles.length === 0) {
      throw new ErrorUtils(500, 'Article Processing Error')
    }
    if (await currentJob.isFailed()) throw new ErrorUtils(500, 'Job was canceled')
    const insertionSuccess = await ArticlesService.createMany(
      legalBase.id,
      extractedArticles
    )
    if (!insertionSuccess) throw new ErrorUtils(500, 'Failed to insert articles')
    try {
      const user = await UserRepository.findById(userId)
      if (user) {
        const emailData = EmailService.generateArticleExtractionSuccessEmail(
          user.gmail,
          legalBase.legal_name,
          legalBase.id
        )
        await emailQueue.add(emailData)
      }
    } catch (notifyErr) {
      console.error('Error sending notification email:', notifyErr)
    }

    done(null)
  } catch (error) {
    try {
      const user = await UserRepository.findById(userId)
      const legalBase = await LegalBasisRepository.findById(legalBasisId)
      if (user && legalBase) {
        const emailData = EmailService.generateArticleExtractionFailureEmail(
          user.gmail,
          legalBase.legal_name,
          error.message
        )
        await emailQueue.add(emailData)
      }
    } catch (notifyError) {
      console.error('Error sending notification email:', notifyError)
    }
    if (error instanceof ErrorUtils) return done(error)
    return done(new ErrorUtils(500, 'Unexpected error during article processing'))
  }
})

export default articlesQueue
