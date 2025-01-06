import articlesQueue from '../queues/articlesQueue.js'
import ArticleExtractorFactory from '../services/articles/articleExtraction/ArticleExtractorFactory.js'
import ErrorUtils from '../utils/Error.js'
import DocumentService from '../services/files/Document.service.js'
import LegalBasisRepository from '../repositories/LegalBasis.repository.js'
import ArticlesService from '../services/articles/Articles.service.js'
import FileService from '../services/files/File.service.js'

/**
 * Worker for processing articles jobs from the articles queue.
 * Listens to the articles queue and processes the articles data.
 * Handles the extraction and insertion of articles from a legal basis document.
 *
 * @param {Object} job - The job object containing data to be processed.
 * @param {Object} job.data - The data for the job.
 * @param {number} job.data.legalBasisId - The ID of the legal basis to process.
 * @param {Function} done - Callback function to signal job completion.
 * @throws {ErrorUtils} - Throws an error if any step in the job processing fails.
 */
articlesQueue.process(async (job, done) => {
  const { legalBasisId } = job.data
  try {
    const legalBase = await LegalBasisRepository.findById(legalBasisId)
    if (!legalBase) {
      return done(new ErrorUtils(404, 'Legal Basis not found'))
    }
    const document = await FileService.getFileContent(legalBase.url)
    if (!document || !document.buffer || !document.mimetype) {
      return done(
        new ErrorUtils(400, 'Invalid document: missing buffer or mimetype')
      )
    }
    const { error, success, data } = await DocumentService.process({
      document
    })
    if (!success) {
      return done(new ErrorUtils(500, 'Document Processing Error', error))
    }
    const extractor = ArticleExtractorFactory.getExtractor(
      legalBase.classification,
      legalBase.legal_name,
      data,
      job
    )
    if (!extractor) {
      return done(new ErrorUtils(400, 'Invalid Classification'))
    }
    const extractedArticles = await extractor.extractArticles()
    if (!extractedArticles || extractedArticles.length === 0) {
      return done(new ErrorUtils(500, 'Article Processing Error'))
    }
    const insertionSuccess = await ArticlesService.insertArticles(
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
    return done(
      new ErrorUtils(500, 'Unexpected error during article processing')
    )
  }
})

export default articlesQueue
