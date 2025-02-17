/**
 * Abstract base class for article extractors.
 * Defines the interface and common methods for extracting and formatting articles from text.
 */
class ArticleExtractor {
  /**
   * @typedef {Object} Article
   * @property {string} title - The title of the article, chapter, section, or transitory provision.
   * @property {string} article - The content of the article in HTML format. Empty string if no content is found.
   * @property {string} plainArticle - The plain text equivalent of the article content.
   * @property {number} order - The sequential order of the extracted item.
   */

  /**
   * Constructs an instance of ArticleExtractor.
   * @param {string} name - The name of the document.
   * @param {string} text - The text from which to extract articles.
   * @param {import("bull").Job} job - The Bull job object used for progress tracking.
   */
  constructor (name, text, job) {
    if (this.constructor === ArticleExtractor) {
      throw new Error('Cannot instantiate abstract class ArticleExtractor')
    }
    this.name = name
    this.text = text
    this.job = job
    this.model = 'gpt-4o-mini'
  }

  /**
   * Abstract method to extract articles from the text.
   * Must be implemented by subclasses.
   * @throws {Error} If not implemented in a subclass.
   * @returns {Promise<Array<Article>>} - List of extracted articles.
   */
  async extractArticles () {
    throw new Error('Method "extractArticles" must be implemented')
  }

  /**
   * Abstract method to clean the input text.
   * Subclasses must override this method to provide specific cleaning logic.
   * @param {string} _text - The text to clean.
   * @returns {string} - The cleaned text.
   * @throws {Error} If not implemented in a subclass.
   */
  _cleanText (_text) {
    throw new Error('Method "cleanText" must be implemented')
  }

  /**
   * Abstract method to extract articles from the cleaned text.
   * Subclasses must override this method to provide specific extraction logic.
   * @param {string} _text - Text to process and extract articles from.
   * @returns {Promise<Array<Article>>} - List of article objects.
   * @throws {Error} If not implemented in a subclass.
   */
  async _extractArticles (_text) {
    throw new Error('Method "_extractArticles" must be implemented')
  }

  /**
   * Abstract method to create an article object.
   * Subclasses must override this method to define how articles are created.
   * @param {string} _title - Title of the article.
   * @param {string} _content - Content of the article.
   * @param {number} _order - Order of the article.
   * @returns {Article} - The article object.
   * @throws {Error} If not implemented in a subclass.
   */
  _createArticleObject (_title, _content, _order) {
    throw new Error('Method "createArticleObject" must be implemented')
  }

  /**
   * Abstract method to correct an article.
   * Subclasses must override this method to provide specific correction logic.
   * @param {Article} _article - The article object to correct.
   * @returns {Promise<Article>} - Corrected article object.
   * @throws {Error} If not implemented in a subclass.
   */
  async _correctArticle (_article) {
    throw new Error('Method "correctArticle" must be implemented')
  }

  /**
   * Abstract method to build the prompt for AI correction.
   * Subclasses must override this method to construct specific prompts.
   * @param {string} _documentName - The name of the document.
   * @param {Article} _article - The article object for which the prompt is built.
   * @returns {string} - The constructed prompt.
   * @throws {Error} If not implemented in a subclass.
   */
  _buildCorrectArticlePrompt (_documentName, _article) {
    throw new Error('Method "buildCorrectArticlePrompt" must be implemented')
  }

  /**
   * Abstract method to verify an article.
   * Subclasses must override this method to provide specific verification logic.
   * @param {Article} _article - The article object to verify.
   * @returns {Promise<{ isValid: boolean }>} - JSON object indicating if the article is valid.
   * @throws {Error} If not implemented in a subclass.
   */
  async _verifyArticle (_article) {
    throw new Error('Method "verifyArticle" must be implemented')
  }

  /**
   * Abstract method to build the prompt for article verification.
   * Subclasses must override this method to construct specific prompts.
   * @param {string} _documentName - The name of the document.
   * @param {Article} _article - The article object for which the verification prompt is built.
   * @returns {string} - The constructed prompt.
   * @throws {Error} If not implemented in a subclass.
   */
  _buildVerifyPrompt (_documentName, _article) {
    throw new Error('Method "buildVerifyPrompt" must be implemented')
  }

  /**
   * Updates the progress of the job.
   * @param {number} current - The current number of processed articles.
   * @param {number} total - The total number of articles to process.
   */
  updateProgress (current, total) {
    let progress = Math.floor((current / total) * 100)
    progress = Math.max(0, Math.min(progress, 100))
    this.job.progress(progress)
  }

  /**
   * Formats the extracted articles into a standardized structure.
   * @param {Array<Article>} articles - The list of articles to format.
   * @returns {Array<Article>} - The list of formatted articles.
   */
  formatArticles (articles) {
    return articles.map((article) => ({
      title: article.title,
      article: article.article,
      plainArticle: article.plainArticle,
      order: article.order
    }))
  }
}

export default ArticleExtractor
