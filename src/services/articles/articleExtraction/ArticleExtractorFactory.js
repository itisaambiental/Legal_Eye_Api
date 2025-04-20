import LawArticleExtractor from './LawArticleExtractor.js'
import RegulationArticleExtractor from './RegulationArticleExtractor.js'
import NormArticleExtractor from './NormArticleExtractor.js'

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
        return new LawArticleExtractor(name, text, model, job)

      case 'Reglamento':
        return new RegulationArticleExtractor(name, text, model, job)

      case 'Norma':
        return new NormArticleExtractor(name, text, model, job)

      case 'Acuerdos':
        return new LawArticleExtractor(name, text, model, job)

      case 'Código':
        return new LawArticleExtractor(name, text, model, job)

      case 'Decreto':
        return new LawArticleExtractor(name, text, model, job)

      case 'Lineamiento':
        return new LawArticleExtractor(name, text, model, job)

      case 'Orden Jurídico':
        return new LawArticleExtractor(name, text, model, job)

      case 'Aviso':
        return new LawArticleExtractor(name, text, model, job)

      case 'Convocatoria':
        return new LawArticleExtractor(name, text, model, job)

      case 'Plan':
        return new LawArticleExtractor(name, text, model, job)

      case 'Programa':
        return new LawArticleExtractor(name, text, model, job)

      case 'Recomendaciones':
        return new LawArticleExtractor(name, text, model, job)

      default:
        return null
    }
  }
}

export default ArticleExtractorFactory
