import LeyArticleExtractor from './LeyArticleExtractor.js'
import ReglamentoArticleExtractor from './ReglamentoArticleExtractor.js'
import NormaArticleExtractor from './NormaArticleExtractor.js'

/**
 * Factory class to obtain the appropriate article extractor based on classification type.
 */
class ArticleExtractorFactory {
  /**
   * Returns an instance of the appropriate ArticleExtractor subclass based on classification.
   *
   * @param {string} classification - The type of document classification.
   * @param {string} name - The name of the document.
   * @param {string} text - The text from which to extract articles.
   * @param {string} model - AI model to be used in article extraction.
   * @param {import('bull').Job} job - The Bull job object used for progress tracking.
   * @returns {import('./ArticleExtractor.js').default|null} - Extractor instance or null if invalid classification.
   */
  static getExtractor (classification, name, text, model, job) {
    switch (classification) {
      case 'Ley':
        return new LeyArticleExtractor(name, text, model, job)

      case 'Reglamento':
        return new ReglamentoArticleExtractor(name, text, model, job)

      case 'Norma':
        return new NormaArticleExtractor(name, text, model, job)

      case 'Acuerdos':
        return new LeyArticleExtractor(name, text, model, job)

      case 'Código':
        return new LeyArticleExtractor(name, text, model, job)

      case 'Decreto':
        return new LeyArticleExtractor(name, text, model, job)

      case 'Lineamiento':
        return new LeyArticleExtractor(name, text, model, job)

      case 'Orden Jurídico':
        return new LeyArticleExtractor(name, text, model, job)

      case 'Aviso':
        return new LeyArticleExtractor(name, text, model, job)

      case 'Convocatoria':
        return new LeyArticleExtractor(name, text, model, job)

      case 'Plan':
        return new LeyArticleExtractor(name, text, model, job)

      case 'Programa':
        return new LeyArticleExtractor(name, text, model, job)

      case 'Recomendaciones':
        return new LeyArticleExtractor(name, text, model, job)

      default:
        return null
    }
  }
}

export default ArticleExtractorFactory
