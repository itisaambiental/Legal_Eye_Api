import ArticleExtractor from './ArticleExtractor.js'
// import llamaAPI from '../../../config/llamaAPI.config.js'
import openai from '../../../config/openapi.config.js'
/**
 * Class extending ArticleExtractor to extract articles from legal texts.
 * Processes the text, cleans inconsistent formats, and extracts articles,
 * chapters, sections, and transitory provisions in a structured manner.
 */
class LeyArticleExtractor extends ArticleExtractor {
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
 * Corrects the article using multiple AI models.
 * @param {Object} article - The article object to correct.
 * @returns {Promise<Object>} - Corrected article object or original if both models fail.
 */
  async correctArticle (article) {
    return this.correctArticleOpenAI(article)
      .catch(() => {
        return article
      })
  }

  /**
 * Calls OpenAI to correct the article.
 * @param {Object} article - The article object to correct.
 * @returns {Promise<Object>} - Corrected article object.
 */
  async correctArticleOpenAI (article) {
    const prompt = this.buildPrompt(this.name, article)
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a virtual assistant specialized in reviewing, correcting and documenting Mexican legal articles that have been extracted from different laws, rules and regulations.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'article_schema',
          schema: {
            type: 'object',
            properties: {
              title: { type: 'string', description: 'The title of the article' },
              article: { type: 'string', description: 'The content of the article' },
              order: { type: 'integer', description: 'The order number of the article' }
            },
            required: ['title', 'article', 'order'],
            additionalProperties: false
          }
        }
      }
    })
    const correctedArticle = JSON.parse(response.choices[0].message.content)
    return correctedArticle
  }

  /**
 * Builds the prompt for the AI models to process.
 * @param {string} documentName - The document name to include in the prompt.
 * @param {Object} article - The article object to include in the prompt.
 * @returns {string} - The constructed prompt.
 */
  buildPrompt (documentName, article) {
    return `
    Investigate the content of "${article.title}" in the Mexican legal document titled "${documentName}". Then, assist in formatting and correcting the following article:

    {
      "title": "${article.title}",
      "article": "${article.article}",
      "order": ${article.order}
    }

    - Correct formatting issues such as unnecessary spaces, incorrect line breaks, or misaligned indentation.
    - Ensure that all content ends with a coherent idea and a period.
    - Complete truncated words or sentences when necessary, without altering their original meaning.
    - Handle tables and columns carefully, preserving their original structure for readability and clarity.
    - Do not introduce new information or make assumptions beyond what is explicitly present in the text.
    - Articles are in Spanish; provide the corrected object in the same language.
    - Pay special attention to article titles. Only complete them if necessary, and avoid altering their structure or changing their meaning to maintain consistency and order.
  `
  }
}

export default LeyArticleExtractor
