// services/articleExtraction/ReglamentoArticleExtractor.js
import ArticleExtractor from './ArticleExtractor.js'

class ReglamentoArticleExtractor extends ArticleExtractor {
  extractArticles () {
    return this.text
  }
}

export default ReglamentoArticleExtractor
