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
   * @typedef {'IsContinuation' | 'IsIncomplete'} ValidationReason
   */

  /**
   * @typedef {Object} ValidationResult
   * @property {boolean} isValid - Indicates if the article is valid.
   * @property {ValidationReason} reason - The reason why the article is considered invalid.
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
    throw new Error('Method "_cleanText" must be implemented')
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
   * Abstract method to extract high-level section titles from the text.
   * This method should return a list of section headings (e.g., numerals, annexes, appendices)
   * and a boolean indicating whether the document has a valid structure.
   *
   * @param {string} _text - The cleaned full text of the document.
   * @returns {Promise<{ sections: string[], isValid: boolean }>} - Extracted section titles and validity flag.
   * @throws {Error} If not implemented in a subclass.
   */
  async _extractSections (_text) {
    throw new Error('Method "_extractSections" must be implemented')
  }

  /**
     * Abstract method to build a regular expression that matches any of the given section headings.
     * This is typically used to find where each section begins in the document.
     *
     * @param {string[]} _sections - Array of section headings extracted from the document.
     * @returns {RegExp} - Regular expression to match section headings at line starts.
     * @throws {Error} If not implemented in a subclass.
     */
  _buildHeadingRegex (_sections) {
    throw new Error('Method "_buildHeadingRegex" must be implemented')
  }

  /**
     * Abstract method to generate a prompt for extracting top-level section headings.
     * This prompt is typically passed to an LLM to identify all relevant section headers from the text body.
     *
     * @param {string} _text - The full text of the document to analyze.
     * @returns {string} - The formatted prompt used for section extraction.
     * @throws {Error} If not implemented in a subclass.
     */
  _buildSectionsPrompt (_text) {
    throw new Error('Method "_buildSectionsPrompt" must be implemented')
  }

  /**
     * Abstract method to validate and clean extracted articles.
     * Should process a list of articles, handling incomplete or continuation fragments.
     *
     * @param {Array<ArticleToVerify>} _rawArticles - List of raw articles extracted with full context.
     * @returns {Promise<Array<Article>>} - List of validated and cleaned articles.
     * @throws {Error} If not implemented in a subclass.
     */
  async _validateExtractedArticles (_rawArticles) {
    throw new Error('Method "_validateExtractedArticles" must be implemented')
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
  _createArticleToVerify (
    _title,
    _previousLastResult,
    _previousContent,
    _currentContent,
    _nextContent,
    _order
  ) {
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
    throw new Error('Method "_verifyArticle" must be implemented')
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
    throw new Error('Method "_buildVerifyPrompt" must be implemented')
  }

  /**
   * Abstract method to correct an article.
   * Subclasses must override this method to provide specific correction logic.
   * @param {Article} _article - The article object to correct.
   * @returns {Promise<Article>} - Corrected article object.
   * @throws {Error} If not implemented in a subclass.
   */
  async _correctArticle (_article) {
    throw new Error('Method "_correctArticle" must be implemented')
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
 * Updates the progress of a job, supporting multiple weighted phases.
 *
 * @param {number} current - Steps completed in the current phase.
 * @param {number} total - Total steps in the current phase.
 * @param {number} phaseStart - Percentage where this phase begins (0–100).
 * @param {number} phaseEnd - Percentage where this phase ends (0–100).
 */
  updateProgress (current, total, phaseStart = 0, phaseEnd = 100) {
    const phaseRange = phaseEnd - phaseStart
    const phaseProgress = Math.floor((current / total) * phaseRange)
    const totalProgress = Math.max(0, Math.min(phaseStart + phaseProgress, 100))
    this.job.progress(totalProgress)
  }
}

export default ArticleExtractor
