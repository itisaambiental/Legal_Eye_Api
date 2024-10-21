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
   * @returns {ArticleExtractor|null} - An instance of an ArticleExtractor subclass, or null if no matching extractor is found.
   */
  static getExtractor (classification, text) {
    switch (classification) {
      case 'Ley':
        return new LeyArticleExtractor(text)
      case 'Reglamento':
        return new ReglamentoArticleExtractor(text)
      default:
        return null
    }
  }
}

export default ArticleExtractorFactory
