import {
  VALIDATION_REASONS
} from '../../../schemas/article.schema.js'
import { convert } from 'html-to-text'
import ErrorUtils from '../../../utils/Error.js'

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
   * @typedef {Object} ValidationResult
   * @property {boolean} isValid - Indicates if the article is valid.
   * @property {VALIDATION_REASONS} reason - The reason why the article is considered invalid.
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
        throw new ErrorUtils(500, 'Job was canceled')
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
      this._updateProgress(i + 1, totalArticles, 50, 100)
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
   * @returns {Promise<Article[]>} - Ordered array of validated article objects.
   * @throws {Error} If an error occurs during extraction.
   */
  async _extractArticles (text) {
    try {
      const { sections, isValid } = await this._extractSections(text)
      if (!isValid) {
        throw new ErrorUtils(500, 'Article Processing Error')
      }
      const headingRegex = this._buildHeadingRegex(sections)
      const matches = Array.from(text.matchAll(headingRegex), (m) => ({
        header: m[0],
        start: m.index
      }))
      matches.push({ start: text.length })
      const rawArticles = []
      const lastResult = { isValid: true, reason: null }
      let order = 1

      for (let i = 0; i < matches.length - 1; i++) {
        const { header, start } = matches[i]
        const end = matches[i + 1].start
        const content = text.slice(start + header.length, end).trim()

        const prevStart = i > 0 ? matches[i - 1].start : 0
        const prevEnd = start
        const previousTitle = i > 0 ? matches[i - 1].header : ''
        const previousContent = text
          .slice(prevStart + previousTitle.length, prevEnd)
          .trim()
        const nextTitle =
        i + 1 < matches.length - 1 ? matches[i + 1].header : ''
        const nextContent =
        i + 2 < matches.length
          ? text
            .slice(
              matches[i + 1].start + nextTitle.length,
              matches[i + 2].start
            )
            .trim()
          : text
            .slice(matches[i + 1].start + nextTitle.length)
            .trim()

        const previousArticle = `${previousTitle} ${previousContent}`.trim()
        const nextArticle = `${nextTitle} ${nextContent}`.trim()

        const articleToVerify = this._createArticleToVerify(
          header,
          lastResult,
          previousArticle,
          content,
          nextArticle,
          order++
        )

        rawArticles.push(articleToVerify)
      }

      const articles = await this._validateExtractedArticles(rawArticles)
      return articles
    } catch (error) {
      throw new ErrorUtils(500, 'Article Processing Error', error)
    }
  }

  /**
   * Method to create a regular expression that matches any of the given section headers.
   * @param {string[]} sections - Array of section heading strings.
   * @returns {RegExp} - Regex to match headings at start of a line.
   */
  _buildHeadingRegex (sections) {
    const escapeForRegex = (str) =>
      str.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
    const pattern = sections.map(escapeForRegex).join('|')
    return new RegExp(`^(?:${pattern})`, 'gim')
  }

  /**
  * Method to validate extracted articles.
  * @param {ArticleToVerify[]} articles - Array of articles to validate.
  * @returns {Promise<Article[]>} - Array of validated articles.
  * @throws {Error} If an error occurs during validation.
 */
  async _validateExtractedArticles (articles) {
    const validated = []
    const totalArticles = articles.length
    let lastResult = { isValid: true, reason: null }
    let lastArticle = null
    let isConcatenating = false

    for (let i = 0; i < totalArticles; i++) {
      const currentArticleData = articles[i]
      try {
        const { isValid, reason } = await this._verifyArticle(currentArticleData)

        if (isValid) {
          if (lastArticle) {
            validated.push(lastArticle)
            lastArticle = null
          }
          validated.push({
            title: currentArticleData.title,
            article: currentArticleData.currentArticle,
            plainArticle: currentArticleData.plainArticle,
            order: currentArticleData.order
          })
          isConcatenating = false
        } else if (reason === VALIDATION_REASONS.IS_INCOMPLETE) {
          if (lastArticle && lastResult.reason === VALIDATION_REASONS.IS_INCOMPLETE) {
            lastArticle.article += ` ${currentArticleData.currentArticle}`
          } else {
            lastArticle = {
              title: currentArticleData.title,
              article: currentArticleData.currentArticle,
              plainArticle: currentArticleData.plainArticle,
              order: currentArticleData.order
            }
          }
          isConcatenating = true
        } else if (reason === VALIDATION_REASONS.IS_CONTINUATION) {
          if (
            lastResult.reason === VALIDATION_REASONS.IS_INCOMPLETE ||
            (isConcatenating && lastResult.reason === VALIDATION_REASONS.IS_CONTINUATION)
          ) {
            if (lastArticle) {
              lastArticle.article += ` ${currentArticleData.currentArticle}`
            }
            isConcatenating = true
          } else {
            if (lastArticle) {
              validated.push(lastArticle)
              lastArticle = null
            }
            isConcatenating = false
          }
        }
        lastResult = { isValid, reason }
      } catch (error) {
        validated.push({
          title: currentArticleData.title,
          article: currentArticleData.currentArticle,
          plainArticle: currentArticleData.plainArticle,
          order: currentArticleData.order
        })
      }
      this._updateProgress(i + 1, totalArticles, 0, 50)
    }
    if (lastArticle) {
      validated.push(lastArticle)
    }

    return validated
  }

  /**
   * Method to create an article to verify.
   * @param {string} title - Title of the article.
   * @param {ValidationResult} previousLastResult - Validation result of the previous article.
   * @param {string} previousContent - Content of the previous article.
   * @param {string} currentContent - Content of the article.
   * @param {string} nextContent - Next article including its title.
   * @param {number} order - Order of the article.
   * @returns {ArticleToVerify} - The article to verify.
   */
  _createArticleToVerify (
    title,
    previousLastResult,
    previousContent,
    currentContent,
    nextContent,
    order
  ) {
    return {
      title,
      previousArticle: {
        content: previousContent,
        lastResult: previousLastResult
      },
      currentArticle: currentContent,
      nextArticle: nextContent,
      plainArticle: '',
      order
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
   * @returns {Promise<{ sections: string[], isValid: boolean }>} - Extracted section titles and validity flag.
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
   * Abstract method to verify an article.
    * Subclasses must override this method to provide specific verification logic.
   * @param {ArticleToVerify} _article - The article to verify.
   * @returns {Promise<ValidationResult>} - An object indicating if the article is valid and optionally the reason why it is considered invalid.
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
