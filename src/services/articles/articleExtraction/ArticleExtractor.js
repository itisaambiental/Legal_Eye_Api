/**
 * Abstract base class for article extractors.
 * Defines the interface and common methods for extracting and formatting articles from text.
 */
class ArticleExtractor {
  /**
   * @typedef {Object} Article
   * @property {string} title - The title of the article, chapter, section, annex, or transitory provision.
   * @property {string} article - The content of the article.
   * @property {string} plainArticle - Plain text of the article.
   * @property {number} order - Order of the article.
   */

  /**
   * @typedef {Object} ValidationResult
   * @property {boolean} isValid - Indicates if the article is valid.
   * @property {string | null} reason - The reason why the article is considered invalid, or null if valid.
   */

  /**
   * @typedef {Object} PreviousArticle
   * @property {string} content - Content of the previous article.
   * @property {ValidationResult} lastResult - Validation result of the previous article.
   */

  /**
   * @typedef {Object} ArticleToVerify
   * @property {string} title - The title of the article, title, chapter, section, annex, or transitory provision.
   * @property {PreviousArticle} previousArticle - Object containing the content and validation result of the previous article.
   * @property {string} currentArticle - Main content of the article to be analyzed.
   * @property {string} nextArticle - Content of the next article.
   * @property {string} plainArticle - Plain text of the article.
   * @property {number} order - Order of the article.
   */

  /**
   * Constructs an instance of ArticleExtractor.
   * @param {string} name - The name of the document.
   * @param {string} text - The text from which to extract articles.
   * @param {string} model - AI model to be used in article extraction
   * @param {import("bull").Job} job - The Bull job object used for progress tracking.
   */
  constructor (name, text, model, job) {
    if (this.constructor === ArticleExtractor) {
      throw new Error('Cannot instantiate abstract class ArticleExtractor')
    }
    this.name = name
    this.text = text
    this.job = job
    this.model = model
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
   * @returns {Promise<Array<Article>>} - List of articles.
   * @throws {Error} If not implemented in a subclass.
   */
  async _extractArticles (_text) {
    throw new Error('Method "_extractArticles" must be implemented')
  }

  /**
   * Abstract method to create an article.
   * Subclasses must override this method to define how articles are created.
   * @param {string} _title - Title of the article.
   * @param {ValidationResult} _previousLastResult - Validation result of the previous article.
   * @param {string} _previousContent - Content of the previous article.
   * @param {string} _currentContent - Content of the article.
   * @param {string} _nextContent - Next article including its title.
   * @param {number} _order - Order of the article.
   * @returns {ArticleToVerify} - The article to verify.
   * @throws {Error} If not implemented in a subclass.
   */
  _createArticleToVerify (_title, _previousLastResult, _previousContent, _currentContent, _nextContent, _order) {
    throw new Error('Method "_createArticleToVerify" must be implemented')
  }

  /**
   * Abstract method to verify an article.
   * Subclasses must override this method to provide specific verification logic.
   * @param {ArticleToVerify} _article - The article to verify.
   * @returns {Promise<boolean> }>} - Boolean indicating if the article is valid.
   * @throws {Error} If not implemented in a subclass.
   */
  async _verifyArticle (_article) {
    throw new Error('Method "verifyArticle" must be implemented')
  }

  /**
   * Abstract method to build the prompt for article verification.
   * Subclasses must override this method to construct specific prompts.
   * @param {string} _legalName - The name of the legal Base.
   * @param {ArticleToVerify} _article - The article for which the verification prompt is built.
   * @returns {string} - The constructed prompt.
   * @throws {Error} If not implemented in a subclass.
   */
  _buildVerifyPrompt (_legalName, _article) {
    throw new Error('Method "buildVerifyPrompt" must be implemented')
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
   * @param {string} _legalName - The name of the Lega Base.
   * @param {Article} _article - The article object for which the prompt is built.
   * @returns {string} - The constructed prompt.
   * @throws {Error} If not implemented in a subclass.
   */
  _buildCorrectPrompt (_legalName, _article) {
    throw new Error('Method "_buildCorrectPrompt" must be implemented')
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
}

export default ArticleExtractor
