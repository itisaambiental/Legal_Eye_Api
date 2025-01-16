import ArticleExtractor from './ArticleExtractor.js'
import openai from '../../../config/openapi.config.js'
import { singleArticleModelSchema } from '../../../schemas/articlesValidation.js'
import { zodResponseFormat } from 'openai/helpers/zod'
/**
 * Class extending ArticleExtractor to extract and correct articles from legal texts.
 * It processes the text, cleans inconsistent formats, and extracts articles,
 * chapters, sections, and transitory provisions in a structured manner.
 */
class ReglamentoArticleExtractor extends ArticleExtractor {
  /**
   * Extracts and corrects articles from the text after cleaning it.
   * @returns {Promise<Array>} - List of formatted articles.
   */
  async extractArticles () {
    const text = this.cleanText(this.text)
    const articles = this._extractArticles(text)
    const totalArticles = articles.length
    const formatArticles = []
    let currentProgress = 0
    for (const article of articles) {
      const correctedArticle = await this.correctArticle(article)
      formatArticles.push(correctedArticle)
      currentProgress += 1
      this.updateProgress(currentProgress, totalArticles)
    }
    return this.formatArticles(formatArticles)
  }

  /**
* Cleans the input text by normalizing spaces, removing line breaks,
* and standardizing keywords like "ARTÍCULO", "CAPÍTULO", "SECCIÓN",
* and "TRANSITORIOS", even if they have interleaved spaces.
* Matches only uppercase or capitalized keywords to avoid false positives.
* @param {string} text - Text to clean.
* @returns {string} - Cleaned text.
*/
  cleanText (text) {
    const multipleSpacesRegex = /\s+/g
    const lineBreaksRegex = /\n/g
    const articleKeywordRegex = /A\s*(?:R\s*T\s*[ÍI]\s*C\s*U\s*L\s*O|r\s*t\s*[íi]\s*c\s*u\s*l\s*o)/g
    const chapterKeywordRegex = /C\s*(?:[ÁA]\s*P\s*[ÍI]\s*T\s*U\s*L\s*O|[áa]\s*p\s*[íi]\s*t\s*u\s*l\s*o)/g
    const sectionKeywordRegex = /S\s*(?:E\s*C\s*C\s*[ÍI]\s*[ÓO]\s*N|e\s*c\s*c\s*[íi]\s*[óo]\s*n)/g
    const transitoriosKeywordRegex = /T\s*(?:R\s*A\s*N\s*S\s*I\s*T\s*O\s*R\s*I\s*O\s*S|r\s*a\s*n\s*s\s*i\s*t\s*o\s*r\s*i\s*o\s*s)/g
    const ellipsisTextRegex = /[^.]+\s*\.{3,}\s*/g
    const singleEllipsisRegex = /\s*\.{3,}\s*/g
    return text
      .replace(multipleSpacesRegex, ' ')
      .replace(lineBreaksRegex, ' ')
      .replace(articleKeywordRegex, 'ARTÍCULO')
      .replace(chapterKeywordRegex, 'CAPÍTULO')
      .replace(sectionKeywordRegex, 'SECCIÓN')
      .replace(transitoriosKeywordRegex, 'TRANSITORIOS')
      .replace(ellipsisTextRegex, '')
      .replace(singleEllipsisRegex, '')
  }

  /**
* Extracts articles from the cleaned text using regular expressions.
* @param {string} text - Cleaned text.
* @returns {Array} - List of article objects.
*/
  _extractArticles (text) {
    const articlePatternString = '((?:C[ÁA]P[IÍ]TULO)\\s+\\w+|' +
  '(?:SECCI[ÓO]N|Secci[óo]n)\\s+\\d+|' +
  '(?:ART[ÍI]CULO|Art[íi]culo)\\s+\\d+|' +
  '(?:TRANSITORIOS|Transitorios))'
    const articlePattern = new RegExp(articlePatternString, 'g')
    const titleChapterRegex = /^(C[ÁA]P[IÍ]TULO)/
    const titleSectionRegex = /^(SECCI[ÓO]N|Secci[óo]n)/
    const titleArticleRegex = /^(ART[ÍI]CULO|Art[íi]culo)/
    const titleTransitoriosRegex = /^(TRANSITORIOS|Transitorios)$/
    const matches = text.split(articlePattern)
    const articles = []
    let currentArticle = null
    let order = 1
    for (let i = 1; i < matches.length; i++) {
      const currentMatch = matches[i].trim()
      if (titleChapterRegex.test(currentMatch)) {
        if (currentArticle) articles.push(currentArticle)
        currentArticle = this.createArticleObject(currentMatch, matches[i + 1], order++)
      } else if (titleSectionRegex.test(currentMatch)) {
        if (currentArticle) articles.push(currentArticle)
        currentArticle = this.createArticleObject(currentMatch, matches[i + 1], order++)
      } else if (titleArticleRegex.test(currentMatch)) {
        if (currentArticle) articles.push(currentArticle)
        currentArticle = this.createArticleObject(currentMatch, matches[i + 1], order++)
      } else if (titleTransitoriosRegex.test(currentMatch)) {
        if (currentArticle) articles.push(currentArticle)
        currentArticle = this.createArticleObject(currentMatch, matches[i + 1], order++)
      }
    }
    if (currentArticle) articles.push(currentArticle)
    return articles
  }

  /**
* Creates an article object with title, content, and order.
* @param {string} title - Title of the article.
* @param {string} content - Content of the article.
* @param {number} order - Order of the article.
* @returns {Object} - Article object.
*/
  createArticleObject (title, content, order) {
    return {
      title,
      article: content ? content.trim() : '',
      order
    }
  }

  /**
* Corrects the article using AI models.
* @param {Object} article - The article object to correct.
* @returns {Promise<Object>} - Corrected article object or original if correction fails.
*/
  async correctArticle (article) {
    const prompt = this.buildPrompt(this.name, article)
    const request = {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a virtual assistant specialized in reviewing, correcting and documenting Mexican legal articles that have been extracted from different laws, rules and regulations.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0,
      response_format: zodResponseFormat(singleArticleModelSchema, 'articles_response')
    }
    const attemptRequest = async (retryCount = 0) => {
      try {
        const response = await openai.chat.completions.create(request)
        const content = JSON.parse(response.choices[0].message.content)
        if (content) {
          return content
        } else {
          return article
        }
      } catch (error) {
        if (error.status === 429) {
          if (retryCount < 3) {
            const backoffTime = Math.pow(2, retryCount) * 1000
            await new Promise((resolve) => setTimeout(resolve, backoffTime))
            return attemptRequest(retryCount + 1)
          } else {
            return article
          }
        }
        return article
      }
    }
    return attemptRequest()
  }

  /**
* Builds the prompt for the AI models to process.
* @param {string} documentName - The document name to include in the prompt.
* @param {Object} article - The article object to include in the prompt.
* @returns {string} - The constructed prompt.
*/
  buildPrompt (documentName, article) {
    return `
Research the content of "${article.title}" in the Mexican legal basis entitled "${documentName}". Then, help format and correct the following article:

{
  "title": "${article.title}",
  "article": "${article.article}",
  "order": ${article.order}
}

- Correct formatting issues such as unnecessary spaces, incorrect line breaks, or misaligned indentation.
- With the information you obtained, verify that the Article, section or Chapter is complete and coherent. If not, complete it and improve it.
- Ensure that all content ends with a coherent idea and a period.
- Complete truncated words or sentences when necessary, without altering their original meaning.
- Handle tables and columns carefully, preserving their original structure for readability and clarity.
- Articles are in Spanish; provide the corrected object in the same language.
- Pay special attention to article titles. Only complete them if necessary, and avoid altering their structure or changing their meaning to maintain consistency and order.
`
  }
}

export default ReglamentoArticleExtractor
