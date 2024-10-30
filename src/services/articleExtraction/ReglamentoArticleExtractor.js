import ArticleExtractor from './ArticleExtractor.js'
import llamaAPI from '../../config/llamaAI.config.js'
import openai from '../../config/openapi.config.js'
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
    const formatArticles = []
    for (const article of articles) {
      const correctedArticle = await this.correctArticleWithFallback(article)
      formatArticles.push(correctedArticle)
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
 * Corrects the article using multiple AI models as a fallback strategy.
 * If the first model fails, tries the second one.
 * @param {Object} article - The article object to correct.
 * @returns {Promise<Object>} - Corrected article object or original if both models fail.
 */
  async correctArticleWithFallback (article) {
    return this.correctArticleWithLlama(article)
      .catch(() => {
        return this.correctArticleWithOpenAI(article)
      })
      .catch(() => {
        return article
      })
  }

  /**
   * Calls Llama API to correct the article.
   * @param {Object} article - The article object to correct.
   * @returns {Promise<Object>} - Corrected article object.
   */
  async correctArticleWithLlama (article) {
    const prompt = this.buildPrompt(article)
    const apiRequestJson = {
      model: 'llama3.1-405b',
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: JSON.stringify(article) }
      ],
      temperature: 0,
      stream: false,
      max_tokens: 3096
    }

    const response = await llamaAPI.run(apiRequestJson)
    const generatedText = response.choices[0].message.content.trim()
    return this.parseCorrectedArticle(generatedText, article)
  }

  /**
   * Calls OpenAI to correct the article.
   * @param {Object} article - The article object to correct.
   * @returns {Promise<Object>} - Corrected article object.
   */
  async correctArticleWithOpenAI (article) {
    const prompt = this.buildPrompt(article)
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: JSON.stringify(article) }
      ],
      max_completion_tokens: 3096,
      temperature: 0,
      response_format: { type: 'text' }
    })
    const generatedText = response.choices[0].message.content.trim()
    return this.parseCorrectedArticle(generatedText, article)
  }

  /**
 * Parses the corrected article from the model's response.
 * @param {string} generatedText - The response from the model.
 * @param {Object} originalArticle - The original article object.
 * @returns {Object} - Corrected article object or original if parsing fails.
 */
  parseCorrectedArticle (generatedText, originalArticle) {
    const hasTitle = /"title":/.test(generatedText)
    const hasArticle = /"article":/.test(generatedText)
    const hasOrder = /"order":/.test(generatedText)

    if (hasTitle && hasArticle && hasOrder) {
      const titleMatch = generatedText.match(/"title":\s*"([^"]+)"/)
      const articleMatch = generatedText.match(/"article":\s*"([^"]+)"/s)
      const orderMatch = generatedText.match(/"order":\s*(\d+)/)

      return {
        title: titleMatch ? titleMatch[1] : originalArticle.title,
        article: articleMatch ? articleMatch[1] : originalArticle.article,
        order: orderMatch ? parseInt(orderMatch[1], 10) : originalArticle.order
      }
    }
    return originalArticle
  }

  /**
   * Builds the prompt for the AI models to process.
   * @returns {string} - The constructed prompt.
   */
  buildPrompt () {
    return `
    You are a legal content assistant focused on reviewing and formatting Mexican legal texts. Please process the following object and return it in valid JSON format:
    { 
      "title": "Title of the article, chapter, section, or transitory", 
      "article": "Content of the article or section", 
      "order": "Order number of the article, chapter, section, or transitory" 
    }
    - Correct formatting errors like unnecessary spaces, incorrect line breaks, or misaligned indentations.
    - Ensure text accuracy: if the title appears incomplete or contains errors, correct it, but only if the intended correction is clear from the context.
    - Do not summarize or shorten the content of the article.
    - Complete truncated words or sentences only when the missing content is obvious and does not alter the meaning.
    - Handle tables and columns with special care, formatting them professionally to maintain their original structure and ensure readability.
    - Do not modify the legal content, order, or meaning of the article. Maintain the integrity of the legal text.
    - Do not introduce new information or make assumptions beyond what is clearly present in the original text.
    - Respond only with the corrected JSON object, ensuring it meets the formatting and accuracy requirements described above.
    - The articles will be in Spanish, and you must return the corrected object in the same language.
    - Respond only in the requested JSON format. Do not include any additional text or explanations.

    ### Example Input:
{
  "title": "artículo 1 ",
  "article": " Las disposiciones de este Articulo... ",
  "order": 1
}

### Example Response:
[
  {
    "title": "Artículo 1",
    "article": "Las disposiciones de este Articulo son de orden público, interés social y observancia general. Regula la participación de entidades en la gestión del agua en Puebla, promoviendo desarrollo sustentable y mitigación climática. Se aplicará supletoriamente la legislación federal y estatal en la materia.",
    "order": 1
  },
  {
    "title": "Artículo 2",
    "article": "Se declara de interés público: I. Conservación de fuentes de agua; II. Políticas para desarrollo hídrico; III. Prestación de servicios; IV. Infraestructura hídrica; V. Captación y tratamiento de agua; VI. Control de contaminación; VII. Inspección de la Ley; VIII. Investigación en tecnología para manejo de agua.",
    "order": 2
  }
    `
  }
}

export default ReglamentoArticleExtractor
