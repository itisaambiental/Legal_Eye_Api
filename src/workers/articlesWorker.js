import articlesQueue from '../queues/articlesQueue.js'
import ArticleExtractorFactory from '../services/articles/articleExtraction/ArticleExtractorFactory.js'
import ErrorUtils from '../utils/Error.js'
import DocumentService from '../services/files/Document.service.js'
import LegalBasisRepository from '../repositories/LegalBasis.repository.js'
import ArticlesService from '../services/articles/Articles.service.js'
import { CONCURRENCY_EXTRACT_ARTICLES } from '../config/variables.config.js'

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
const CONCURRENCY = Number(CONCURRENCY_EXTRACT_ARTICLES || 1)

/**
 * Worker for processing articles jobs from the articles queue.
 * Listens to the articles queue and processes the articles data.
 *
 * @param {import('bull').Job} job - The job object containing data to be processed.
 * @param {import('bull').ProcessCallbackFunction} done - Callback function to signal job completion.
 * @throws {ErrorUtils} - Throws an error if any step in the job processing fails.
 */
articlesQueue.process(CONCURRENCY, async (job, done) => {
  const { legalBasisId, intelligenceLevel } = job.data
  console.log(legalBasisId)
  try {
    const currentJob = await articlesQueue.getJob(job.id)
    if (!currentJob) {
      return done(new ErrorUtils(404, 'Job not found'))
    }
    if (await currentJob.isFailed()) {
      return done(new ErrorUtils(500, 'Job was canceled'))
    }
    const legalBase = await LegalBasisRepository.findById(legalBasisId)
    if (!legalBase) {
      return done(new ErrorUtils(404, 'LegalBasis not found'))
    }
    const { error, success, text } = await DocumentService.process(legalBase.url)
    if (!success) {
      return done(new ErrorUtils(500, 'Document Processing Error', error))
    }
    const model = getModel(intelligenceLevel)
    const extractor = ArticleExtractorFactory.getExtractor(
      legalBase.classification,
      legalBase.legal_name,
      text,
      model,
      currentJob
    )
    if (!extractor) {
      return done(new ErrorUtils(400, 'Invalid Classification'))
    }
    const extractedArticles = await extractor.extractArticles()
    if (!extractedArticles || extractedArticles.length === 0) {
      return done(new ErrorUtils(500, 'Article Processing Error'))
    }
    if (await currentJob.isFailed()) {
      return done(new ErrorUtils(500, 'Job was canceled'))
    }
    const insertionSuccess = await ArticlesService.createMany(
      legalBase.id,
      extractedArticles
    )
    if (!insertionSuccess) {
      return done(new ErrorUtils(500, 'Failed to insert articles'))
    }
    done(null)
  } catch (error) {
    if (error instanceof ErrorUtils) {
      return done(error)
    }
    return done(new ErrorUtils(500, 'Unexpected error during article processing'))
  }
})

export default articlesQueue
