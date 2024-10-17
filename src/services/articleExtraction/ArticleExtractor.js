// services/articleExtraction/ArticleExtractor.js
class ArticleExtractor {
  constructor (text) {
    this.text = text
  }

  extractArticles () {
    throw new Error('Method "extractArticles" must be implemented')
  }
}

export default ArticleExtractor
