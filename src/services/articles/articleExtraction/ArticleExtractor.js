// services/articleExtraction/ArticleExtractor.js

/**
 * Abstract base class for article extractors.
 * Defines the interface and common methods for extracting and formatting articles from text.
 */
class ArticleExtractor {
  /**
   * Constructs an instance of ArticleExtractor.
   * @param {string} text - The text from which to extract articles.
   * @param {Object} job - The Bull job object used for progress tracking.
   */
  constructor (text, job) {
    this.text = text
    this.job = job
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
   * Updates the progress of the job.
   * @param {number} current - The current number of processed articles.
   * @param {number} total - The total number of articles to process.
   */
  updateProgress (current, total) {
    const progress = Math.floor((current / total) * 100)
    this.job.progress(progress)
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
