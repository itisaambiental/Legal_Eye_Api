// services/articleExtraction/ArticleExtractor.js
// Abstract class to define common methods
class ArticleExtractor {
  constructor (text) {
    this.text = text
  }

  // Method to extract articles from text that all classes that inherit this class must have.
  extractArticles () {
    throw new Error('Method "extractArticles" must be implemented')
  }

  // Method for formatting text articles that all classes that inherit this class should have.
  formatArticles (articles) {
    return articles.map((article, index) => ({
      title: article.title,
      article: article.article,
      order: article.order
    }))
  }
}

export default ArticleExtractor
