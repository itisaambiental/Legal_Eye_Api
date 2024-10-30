// services/articleExtraction/ArticleExtractor.js

/**
 * Abstract base class for article extractors.
 * Defines the interface and common methods for extracting and formatting articles from text.
 */
class ArticleExtractor {
  /**
   * Constructs an instance of ArticleExtractor.
   * @param {string} text - The text from which to extract articles.
   */
  constructor (text) {
    this.text = text
  }

  /**
   * Abstract method to extract articles from the text.
   * Must be implemented by subclasses.
   * @throws {Error} If not implemented in a subclass.
   */
  async extractArticles () {
    throw new Error('Method "extractArticles" must be implemented')
  }

  /**
   * Formats the extracted articles into a standardized structure.
   * @param {Array} articles - The list of articles to format.
   * @returns {Array} - The list of formatted articles.
   */
  formatArticles (articles) {
    return articles.map((article) => ({
      title: article.title,
      article: article.article,
      order: article.order
    }))
  }
}

export default ArticleExtractor
