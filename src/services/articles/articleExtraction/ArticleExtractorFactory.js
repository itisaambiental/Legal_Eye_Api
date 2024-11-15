import LeyArticleExtractor from './LeyArticleExtractor.js'
import ReglamentoArticleExtractor from './ReglamentoArticleExtractor.js'
/**
 * Factory class to obtain the appropriate article extractor based on the classification type.
 */
class ArticleExtractorFactory {
  /**
   * Returns an instance of the appropriate ArticleExtractor subclass based on classification.
   * @param {string} classification - The type of document classification (e.g., 'Ley', 'Reglamento').
   * @param {string} name - The name of the document.
   * @param {string} text - The text from which to extract articles.
   * @param {Object} job - The Bull job object used for progress tracking.
   * @returns { Articule|null} - An instance of an ArticleExtractor subclass, or null if no matching extractor is found.
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
