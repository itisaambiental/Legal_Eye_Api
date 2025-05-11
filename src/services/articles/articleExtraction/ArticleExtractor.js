import { convert } from 'html-to-text'
import HttpException from '../../errors/HttpException.js'
import { sleep } from '../../../utils/sleep.js'
/**
 * Base class for article extractors.
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
 * @typedef {Object} Section
 * @property {string} title - The exact heading text as it appears in the document (e.g., "ARTÍCULO 1", "TÍTULO PRIMERO").
 * @property {number} line - The line number (starting from 1) where the heading is located in the document.
 */

  /**
 * @typedef {Object} Sections
 * @property {Section[]} sections - Array of section headers extracted from the document.
 * @property {boolean} isValid - Indicates whether at least one valid section heading was found.
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
   * Method to extracts and corrects articles from the input text.
   * @returns {Promise<Article[]>} - List of corrected article objects.
   */
  async extractArticles () {
    const text = this._cleanText(this.text)
    const articles = await this._extractArticles(text)
    const totalArticles = articles.length
    const correctedArticles = []

    for (let i = 0; i < totalArticles; i++) {
      if (await this.job.isFailed()) {
        throw new HttpException(500, 'Job was canceled')
      }
      const article = articles[i]
      try {
        const correctedArticle = await this._correctArticle(article)
        correctedArticle.plainArticle = convert(correctedArticle.article)
        correctedArticles.push(correctedArticle)
      } catch (error) {
        correctedArticles.push({
          ...article,
          plainArticle: convert(article.article)
        })
      }
      this._updateProgress(i + 1, totalArticles)
      await sleep(3000)
    }

    return correctedArticles
  }

  /**
   * Method to clean the input text.
   * @param {string} text - The text to clean.
   * @returns {string} - The cleaned text.
   */
  _cleanText (text) {
    const ellipsisTextRegex = /[^.]+\s*\.{3,}\s*/g
    const singleEllipsisRegex = /\s*\.{3,}\s*/g

    return text.replace(ellipsisTextRegex, '').replace(singleEllipsisRegex, '')
  }

  /**
 * Method to extract articles from the cleaned text.
 * @param {string} text - Full document text to process and extract sections from.
 * @returns {Promise<Article[]>} - Ordered array of extracted article objects.
 * @throws {Error} If an error occurs during extraction.
 */
  async _extractArticles (text) {
    try {
      const { sections, isValid } = await this._extractSections(text)
      if (!isValid || !Array.isArray(sections) || sections.length === 0) {
        throw new HttpException(500, 'Article Processing Error')
      }
      const lines = text.split('\n')
      const sortedSections = sections.sort((a, b) => a.line - b.line)
      const articles = []
      let order = 1
      for (let i = 0; i < sortedSections.length; i++) {
        const { title, line } = sortedSections[i]
        const currentLineIndex = line - 1
        const nextLineIndex = (sortedSections[i + 1]?.line ?? lines.length + 1) - 1

        const blockLines = lines.slice(currentLineIndex, nextLineIndex)
        const articleText = blockLines.join('\n').trim()
        articles.push({
          title,
          article: articleText,
          plainArticle: '',
          order: order++
        })
      }
      return articles
    } catch (error) {
      throw new HttpException(500, 'Article Processing Error', error)
    }
  }

  /**
 * Method to updates the progress of a job.
 * @param {number} current - Steps completed in the current phase.
 * @param {number} total - Total steps in the current phase.
 * @param {number} phaseStart - Percentage where this phase begins (0–100).
 * @param {number} phaseEnd - Percentage where this phase ends (0–100).
 */
  _updateProgress (current, total, phaseStart = 0, phaseEnd = 100) {
    const phaseRange = phaseEnd - phaseStart
    const phaseProgress = Math.floor((current / total) * phaseRange)
    const totalProgress = Math.max(0, Math.min(phaseStart + phaseProgress, 100))
    this.job.progress(totalProgress)
  }

  /**
   * Abstract method to extract high-level section from the text.
   * Subclasses must override this method to provide specific extraction logic.
   * @param {string} _text - The cleaned full text of the document.
   * @returns {Promise<Sections>} - Extracted section titles and validity flag.
   * @throws {Error} If not implemented in a subclass.
   */
  async _extractSections (_text) {
    throw new Error('Method "_extractSections" must be implemented')
  }

  /**
     * Abstract method to generate a prompt for extracting top-level section headings.
     * Subclasses must override this method to provide specific prompt formatting.
     * @param {string} _text - The full text of the document to analyze.
     * @returns {string} - The formatted prompt used for section extraction.
     * @throws {Error} If not implemented in a subclass.
     */
  _buildSectionsPrompt (_text) {
    throw new Error('Method "_buildSectionsPrompt" must be implemented')
  }

  /**
   * Abstract method to correct an article.
   * Subclasses must override this method to provide specific correction logic.
   * @param {string} _legalName - The name of the Legal Base.
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
}

export default ArticleExtractor
