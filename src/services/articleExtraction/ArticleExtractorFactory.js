import LeyArticleExtractor from './LeyArticleExtractor.js'
import ReglamentoArticleExtractor from './ReglamentoArticleExtractor.js'

class ArticleExtractorFactory {
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
