import LeyArticleExtractor from './LeyArticleExtractor.js'
import ReglamentoArticleExtractor from './ReglamentoArticleExtractor.js'
/**
 * Factory class to obtain the appropriate article extractor based on the classification type.
 */
class ArticleExtractorFactory {
  /**
   * Returns an instance of the appropriate ArticleExtractor subclass based on classification.
   * @param {string} classification - The type of document classification (e.g., 'Ley', 'Reglamento').
   * @param {string} text - The text from which to extract articles.
   * @param {Object} job - The Bull job object used for progress tracking.
   * @returns { Articule|null} - An instance of an ArticleExtractor subclass, or null if no matching extractor is found.
   */
  static getExtractor (classification, text, job) {
    switch (classification) {
      case 'Ley':
        return new LeyArticleExtractor(text, job)
      case 'Reglamento':
        return new ReglamentoArticleExtractor(text, job)
      default:
        return null
    }
  }
}

export default ArticleExtractorFactory
