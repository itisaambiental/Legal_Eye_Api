import LeyArticleExtractor from './LeyArticleExtractor.js'
import ReglamentoArticleExtractor from './ReglamentoArticleExtractor.js'

/**
 * Factory class to obtain the appropriate article extractor based on the classification type.
 */
class ArticleExtractorFactory {
  /**
   * Returns an instance of the appropriate ArticleExtractor subclass based on classification.
   * Ensures that the returned instance implements all methods defined in the ArticleExtractor base class.
   *
   * @param {string} classification - The type of document classification (e.g., 'Ley', 'Reglamento').
   * @param {string} name - The name of the document.
   * @param {string} text - The text from which to extract articles.
   * @param {Object} job - The Bull job object used for progress tracking.
   * @returns {import('./ArticleExtractor.js').default|null} - An instance of a subclass of ArticleExtractor or null if the classification is invalid.
   */
  static getExtractor (classification, name, text, job) {
    switch (classification) {
      case 'Ley':
        return new LeyArticleExtractor(name, text, job)
      case 'Reglamento':
        return new ReglamentoArticleExtractor(name, text, job)
      default:
        return null
    }
  }
}

export default ArticleExtractorFactory
