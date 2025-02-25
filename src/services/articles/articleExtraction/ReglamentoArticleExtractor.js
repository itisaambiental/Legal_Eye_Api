import ArticleExtractor from './ArticleExtractor.js'
import openai from '../../../config/openapi.config.js'
import { singleArticleModelSchema } from '../../../schemas/article.schema.js'
import { zodResponseFormat } from 'openai/helpers/zod'
import { convert } from 'html-to-text'
import ErrorUtils from '../../../utils/Error.js'

/**
 * Class extending ArticleExtractor to extract articles from regulations texts.
 * Processes the text, cleans inconsistent formats, and extracts articles,
 * chapters, titles, sections, annexes, and transitory provisions in a structured manner.
 */
class ReglamentoArticleExtractor extends ArticleExtractor {
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
   * @property {string} plainArticle - Plain text of the article.
   * @property {number} order - Order of the article.
   */

  /**
   * Method to extract articles from the text.
   */
  async extractArticles () {
    let articles
    try {
      articles = await this._extractArticles(this.text)
    } catch (error) {
      throw new ErrorUtils(500, 'Article Processing Error', error)
    }
    const totalArticles = articles.length
    const correctedArticles = []
    let currentProgress = 0
    for (const article of articles) {
      if (await this.job.isFailed()) {
        throw new ErrorUtils(500, 'Job was canceled')
      }
      try {
        const correctedArticle = await this._correctArticle(article)
        correctedArticle.plainArticle = convert(correctedArticle.article)
        correctedArticles.push(correctedArticle)
      } catch (error) {
        continue
      }
      currentProgress += 1
      this.updateProgress(currentProgress, totalArticles)
    }
    return correctedArticles
  }

  /**
   * @param {string} text - The text to clean.
   * @returns {string} - The cleaned text.
   */
  _cleanText (text) {
    const articleKeywordRegex =
    /\b[Aa]\s*R\s*T\s*[ÍIíi]\s*C\s*U\s*L\s*O\s*(\d+[A-Z]*|[IVXLCDM]+)\b/gi
    const chapterKeywordRegex =
    /\b[Cc]\s*[ÁAáa]\s*[Pp]\s*[ÍIíi]\s*[Tt]\s*[Uu]\s*[Ll]\s*[Oo]\s*(\d+[A-Z]*|[IVXLCDM]+)\b/gi
    const titleKeywordRegex =
    /\b[Tt]\s*[ÍIíi]\s*[Tt]\s*[Uu]\s*[Ll]\s*[Oo]\s*(\d+[A-Z]*|[IVXLCDM]+)\b/gi
    const sectionKeywordRegex =
    /\b[Ss]\s*[Ee]\s*[Cc]\s*[Cc]\s*[ÍIíi]\s*[ÓOóo]\s*[Nn]\s*(\d+[A-Z]*|[IVXLCDM]+)\b/gi
    const transientKeywordRegex =
    /\b(?:\w+\s+)*[Tt][Rr][Aa][Nn][Ss][Ii][Tt][Oo][Rr][Ii][AaOo](?:\s*[SsAa])?\s*(\d+[A-Z]*|[IVXLCDM]+)?\b/gi
    const annexKeywordRegex =
    /\b[Aa]\s*[Nn]\s*[Ee]\s*[Xx]\s*[Oo]\s*(\d+[A-Z]*|[IVXLCDM]+)?\b/gi
    const ellipsisTextRegex = /[^.]+\s*\.{3,}\s*/g
    const singleEllipsisRegex = /\s*\.{3,}\s*/g

    return text
      .replace(articleKeywordRegex, 'ARTÍCULO $1')
      .replace(chapterKeywordRegex, 'CAPÍTULO $1')
      .replace(sectionKeywordRegex, 'SECCIÓN $1')
      .replace(titleKeywordRegex, 'TÍTULO $1')
      .replace(transientKeywordRegex, 'TRANSITORIO $1')
      .replace(annexKeywordRegex, 'ANEXO $1')
      .replace(ellipsisTextRegex, '')
      .replace(singleEllipsisRegex, '')
  }

  /**
 * @param {string} text - Text to process and extract articles from.
 * @returns {Promise<Array<Article>>} - List of article objects.
 */
  async _extractArticles (text) {
    text = this._cleanText(text)

    const articlePatternString =
    '(?:^|\\n)\\s*(' +
    '(?:c[áa]p[ií]tulo)\\s+\\S+|' +
    '(?:t[ií]tulo)\\s+\\S+|' +
    '(?:secci[oó]n)\\s+\\S+|' +
    '(?:art[ií]culo)\\s+\\S+|' +
    '(?:transitori[oa][s]?)\\s+\\S+|' +
    '(?:anexo)\\s+\\S+' +
    ')'

    const articlePattern = new RegExp(articlePatternString, 'i')
    const regexes = [
      /^(?:c[áa]p[ií]tulo)\s+\S+$/i,
      /^(?:t[ií]tulo)\s+\S+$/i,
      /^(?:secci[oó]n)\s+\S+$/i,
      /^(?:art[ií]culo)\s+\S+$/i,
      /^(?:transitori[oa][s]?)\s+\S+$/i,
      /^(?:anexo)\s+\S+$/i
    ]

    const matches = text.split(articlePattern)
    const articles = []
    let order = 1
    let lastResult = { isValid: true, reason: null }
    let lastArticle = null
    let isConcatenating = false

    for (let i = 1; i < matches.length; i++) {
      const previousTitle = i > 1 ? matches[i - 2]?.trim() : ''
      const previousContent = i > 1 ? matches[i - 1]?.trim() : ''
      const currentTitle = matches[i].trim()
      const currentContent =
      i + 1 < matches.length ? matches[i + 1].trim() : ''

      if (regexes.some((regex) => regex.test(currentTitle))) {
        const previousArticle = `${previousTitle} ${previousContent}`.trim()
        const currentArticle = `${currentTitle} ${currentContent}`.trim()
        const currentArticleData = this._createArticleToVerify(
          currentTitle,
          lastResult,
          previousArticle,
          currentArticle,
          order++
        )
        const { isValid, reason } = await this._verifyArticle(
          currentArticleData
        )
        if (reason === 'IsContinuation') {
          if (
            lastResult.reason === 'IsIncomplete' ||
          (isConcatenating && lastResult.reason === 'IsContinuation')
          ) {
            if (lastArticle) {
              lastArticle.article += ` ${currentArticleData.currentArticle}`
            } else {
              lastArticle = {
                title: previousTitle,
                article: `${previousContent} ${currentArticleData.currentArticle}`,
                plainArticle: currentArticleData.plainArticle,
                order: currentArticleData.order
              }
            }
            isConcatenating = true
          } else {
            isConcatenating = false
            if (lastArticle) {
              articles.push(lastArticle)
              lastArticle = null
            }
          }
        } else {
          if (lastArticle) {
            articles.push(lastArticle)
            lastArticle = null
          }
          if (isValid) {
            articles.push({
              title: currentArticleData.title,
              article: currentArticleData.currentArticle,
              plainArticle: currentArticleData.plainArticle,
              order: currentArticleData.order
            })
          }
          isConcatenating = false
        }

        lastResult = { isValid, reason }
      }
    }
    if (lastArticle) {
      articles.push(lastArticle)
    }

    return articles
  }

  /**
 * @param {string} title - Title of the article.
 * @param {ValidationResult} previousLastResult - Validation result of the previous article.
 * @param {string} previousContent - Previous article including its title.
 * @param {string} currentContent - Current article including its title.
 * @param {number} order - Order of the article.
 * @returns {ArticleToVerify} - The article to verify.
 */
  _createArticleToVerify (
    title,
    previousLastResult,
    previousContent,
    currentContent,
    order
  ) {
    return {
      title,
      previousArticle: {
        content: previousContent.trim(),
        lastResult: previousLastResult
      },
      currentArticle: currentContent.trim(),
      plainArticle: '',
      order
    }
  }

  /**
 * @param {ArticleToVerify} article - The article to verify.
 * @returns {Promise<{ isValid: boolean, reason?: string }>} - An object indicating if the article is valid and optionally the reason why it is considered invalid.
 */
  async _verifyArticle (article) {
    const prompt = this._buildVerifyPrompt(this.name, article)

    const request = {
      model: this.model,
      messages: [
        {
          role: 'system',
          content:
          'You are a virtual assistant specialized in evaluating the validity of legal articles extracted from Mexican legal documents. Note: Although your instructions are in English, the articles provided will be in Spanish.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'article_verification_schema',
          schema: {
            type: 'object',
            properties: {
              isValid: {
                description: 'Indicates if the article is valid',
                type: 'boolean'
              },
              reason: {
                description:
                'Reason why the article is considered invalid. Possible values: "IsContinuation", "IsIncomplete", "OutContext".',
                type: 'string',
                enum: ['IsContinuation', 'IsIncomplete', 'OutContext']
              }
            },
            additionalProperties: false
          }
        }
      }
    }

    const attemptRequest = async (retryCount = 0) => {
      try {
        const response = await openai.chat.completions.create(request)
        const { isValid, reason } = JSON.parse(
          response.choices[0].message.content
        )
        if (typeof isValid === 'boolean') {
          return { isValid, reason }
        } else {
          throw new ErrorUtils(500, 'Article Processing Error')
        }
      } catch (error) {
        if (error.status === 429) {
          if (retryCount < 3) {
            const backoffTime = Math.pow(2, retryCount) * 1000
            await new Promise((resolve) => setTimeout(resolve, backoffTime))
            return attemptRequest(retryCount + 1)
          } else {
            throw new ErrorUtils(500, 'Article Processing Error', error)
          }
        }
        throw new ErrorUtils(500, 'Article Processing Error', error)
      }
    }

    return attemptRequest()
  }

  /**
   * Constructs a verification prompt for evaluating a legal provision.
   *
   * @param {string} legalName - The name of the legal base.
   * @param {ArticleToVerify} article - The article for which the verification prompt is built.
   * @returns {string} - The constructed prompt.
   */
  _buildVerifyPrompt (legalName, article) {
    return `
  You are an AI expert evaluating legal provisions from Mexican law. By default, every article is VALID unless it clearly meets one of the following exceptions:
  
  ### Context:
  - **Legal Base:** "${legalName}"
  - **Previous Provision:** "${article.previousArticle.content}" (Validation: { "isValid": ${article.previousArticle.lastResult.isValid}, "reason": "${article.previousArticle.lastResult.reason}" })
  - **Title:** "${article.title}"
  - **Content:** "${article.currentArticle}"
  
  ### Exceptions (mark as INVALID):
  
  - **IsIncomplete:** The text is abruptly cut off or clearly unfinished, lacking a concluding idea.
    - *Exception:* If the previous article was marked as "IsIncomplete", classify the current one as "IsContinuation" instead.
  
  - **IsContinuation:** The current article directly continues the idea from a complete previous article without standing alone.
  
  - **OutContext:** The article merely references another provision without presenting an independent provision.
  
  Unless any of these conditions are clearly met, always classify the article as VALID.
  `
  }

  /**
   * @param {Article} article - The article object to correct.
   * @returns {Promise<Article>} - Corrected article object.
   */
  async _correctArticle (article) {
    const prompt = this._buildCorrectPrompt(this.name, article)
    const request = {
      model: this.model,
      messages: [
        {
          role: 'system',
          content:
            'You are a virtual assistant specialized in reviewing, correcting, and documenting Mexican legal articles extracted from various regulations. Note: All regulations are in Spanish, and all output must also be in Spanish.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0,
      response_format: zodResponseFormat(
        singleArticleModelSchema,
        'articles_response'
      )
    }
    const attemptRequest = async (retryCount = 0) => {
      try {
        const response = await openai.chat.completions.create(request)
        const content = JSON.parse(response.choices[0].message.content)
        if (content) {
          return content
        } else {
          throw new ErrorUtils(500, 'Article Processing Error')
        }
      } catch (error) {
        if (error.status === 429) {
          if (retryCount < 3) {
            const backoffTime = Math.pow(2, retryCount) * 1000
            await new Promise((resolve) => setTimeout(resolve, backoffTime))
            return attemptRequest(retryCount + 1)
          } else {
            throw new ErrorUtils(500, 'Article Processing Error', error)
          }
        }
        throw new ErrorUtils(500, 'Article Processing Error', error)
      }
    }
    return attemptRequest()
  }

  /**
   * @param {string} legalName - The name of the legal Base.
   * @param {Article} article - The article object for which the prompt is built.
   */
  _buildCorrectPrompt (legalName, article) {
    return `
Analyze the content of "${article.title}" within the Mexican legal basis titled "${legalName}". Then, help format and correct the following article using professional HTML structure and styles:

{
  "title": "${article.title}",
  "article": "${article.article}",
  "plainArticle": "${article.plainArticle}",
  "order": ${article.order}
}

### Instructions:

1. **plainArticle**:
   - The "plainArticle" field must always remain as an empty string ("").
   - Do not modify or populate this field with any content.

2. **Title**:
   - The title field should only state the article, title, section, or chapter number.
   - If the article content begins with a **numeral indicator** (e.g., "bis", "ter", "quater", "quinquies", "sexies", "septies", "octies", "novies", "nonies", "decies", "undecies", "duodecies", "terdecies", "quaterdecies", "quindecies"), **or an ordinal numeral** (e.g., "décimo", "undécimo", "duodécimo", "trigésimo", "cuadragésimo", "quincuagésimo", "sexagésimo", "septuagésimo", "octogésimo", "nonagésimo", "centésimo"), "Check if the numeral indicator is being used as part of the article’s legal meaning. If removing it does not change the meaning, move it to the title field.  If the numeral indicator is an essential part of the article’s meaning, keep it within the content.".
   - This applies to **articles, chapters, sections, titles, annex and transitories,**.
   - Ensure that titles are concise and formatted consistently.
   - Do not use HTML tags in titles.

  #### Examples (in Spanish):
   - **ARTÍCULO 1 Bis**, **SECCIÓN 2**, **CAPÍTULO 3**
   - **Artículo I Ter**, **Artículo II**, **Sección III**, **CAPÍTULO IV**
   - **Artículo 1 Bis**, **Artículo 2**, **SECCIÓN 3 Ter**, **Capítulo 4 Bis**
   - **Capítulo Tercero**, **Sección Cuarta**, **Artículo Primero Sexies**
   - **TÍTULO I**, **Título I Bis**, **Título VII**, **Título VIII Quater**
   - **CAPÍTULO DÉCIMO SEGUNDO**, **CAPÍTULO DÉCIMO TERCERO**, **CAPÍTULO TRIGÉSIMO PRIMERO**
   - **SECCIÓN UNDÉCIMA**, **SECCIÓN VIGÉSIMA, **TRANSITORIO PRIMERO**, **ANEXO 1**
   - **TÍTULO CUADRAGÉSIMO**, **TÍTULO QUINCUAGÉSIMO SEXTO**, **TRANSITORIO SEGUNDO**, **ANEXO II**

  **Output (Unformatted HTML):**  
   // Titles should not have HTML tags.
   - ARTÍCULO 1 Bis, Sección 2, Capítulo 3
   - Artículo I Ter - Artículo II, Sección III, CAPÍTULO IV
   - Artículo 1 Bis - Artículo 2, SECCIÓN 3 Ter, Capítulo 4 Bis
   - Capítulo Tercero, Sección Cuarta, Artículo Primero Sexies
   - TÍTULO I, Título I Bis, Título VII, Título VIII Quater
   - CAPÍTULO DÉCIMO SEGUNDO, CAPÍTULO DÉCIMO TERCERO, CAPÍTULO TRIGÉSIMO PRIMERO
   - SECCIÓN UNDÉCIMA, SECCIÓN VIGÉSIMA, TRANSITORIO PRIMERO, ANEXO 1
   - TÍTULO CUADRAGÉSIMO, TÍTULO QUINCUAGÉSIMO SEXTO, TRANSITORIO SEGUNDO, ANEXO II

3. **Articles**:
   - Review and correct long paragraphs, ensuring each explains a specific concept or legal provision.
   - Divide content into sections or subsections for clarity, using appropriate HTML tags:
     - <h2>, <h3> for headings
     - <p> for paragraphs
     - <ul> and <li> for lists
   - Use <b> for emphasis, <i> for additional context, and <span> for inline styles where necessary.
   - Complete truncated words or sentences without altering their meaning.

  #### Example (in Spanish):
   **title:** ARTÍCULO 1 
   **article:** La Secretaría podrá establecer una vigencia en las autorizaciones que ésta emita en materia de impacto ambiental y, en su caso, de riesgo ambiental. En tales casos, el promovente deberá tramitar la renovación correspondiente conforme a los criterios que la Secretaría determine.
   **order:** 1

  **Article Output (Formatted in HTML):**  
   **title:** ARTÍCULO 1   // Titles should not have HTML tags.
   **article:** <p>La Secretaría podrá establecer una <b>vigencia</b> en las autorizaciones que ésta emita en materia de <i>impacto ambiental</i> y, en su caso, de riesgo ambiental.</p>  
   <p>En tales casos, el promovente deberá tramitar la renovación correspondiente conforme a los criterios que la Secretaría determine.</p>
   **order:** 1

  4. Chapters, Titles, Sections, and Annexes:
   - Ensure headings are concise and formatted with appropriate text structure.
   - Titles should be short and precise, containing only the grouping heading without including articles or detailed content.
   - If any articles are included, remove them from the chapter, section, title, or annex.
   - Please do not create or write random definitions within the Chapters, Titles, Sections, and Annexes. Just make sure you are working with the information that is being shared with you. //Attention with this rule.

   - Chapters, Titles, Sections, and Annexes should follow the structure:
     - TITLE # + Title Name
     - CHAPTER # + Chapter Name
     - SECTION # + Section Name
     - ANNEX # + Annex Name

   ATTENTION:
   - Title, Chapter, Section, and Annex names should be short.
   - Do not include additional information in these headings.

    Examples:

    Example 1 (Chapter in Spanish):
    title: CAPÍTULO TERCERO
    article: DEL COMITÉ ESTATAL DE EMERGENCIAS Y DESASTRES. La Ley del Agua para el Estado de Puebla tiene como finalidad regular el uso, conservación y protección del agua, asegurando su disponibilidad y calidad para las generaciones presentes y futuras.
    order: 3

    Output (Formatted):
    title: CAPÍTULO TERCERO
    article: DEL COMITÉ ESTATAL DE EMERGENCIAS Y DESASTRES
    order: 3

    Example 2 (Section in Spanish):
    title: SECCIÓN PRIMERA
    article: DISPOSICIONES COMUNES
    order: 6

    Output (Formatted):
    title: SECCIÓN PRIMERA
    article: DISPOSICIONES COMUNES
    order: 6

    Example 3 (Title in Spanish):
    title: TÍTULO I
    article: DISPOSICIONES GENERALES
    order: 1

    Output (Formatted):
    title: TÍTULO I
    article: DISPOSICIONES GENERALES
    order: 1

    Example 4 (Annex in Spanish) - NEW:
    title: ANEXO IV
    article: REQUISITOS TÉCNICOS PARA LA EVALUACIÓN DE IMPACTO AMBIENTAL
    order: 1

    Output (Formatted):
    title: ANEXO IV
    article: REQUISITOS TÉCNICOS PARA LA EVALUACIÓN DE IMPACTO AMBIENTAL
    order: 1

5. **Transitory Provisions**:
   - Format temporary provisions clearly, specifying effective dates and adaptation periods.
   - Use <table> tags to organize conditions, dates, and timelines when needed.

   #### Example (in Spanish):
    **title:** TRANSITORIOS  
    **article:**  
      PRIMERO. El presente Decreto entrará en vigor al día siguiente de su publicación en el Periódico Oficial del Estado.  
      SEGUNDO. Se derogan todas las disposiciones que se opongan al presente Decreto.  
    **order:** 200

  **Output (Formatted in HTML):**
    **title:** TRANSITORIOS   // Titles should not have HTML tags.
    **article:**  
     <p><b>PRIMERO.</b> El presente Decreto entrará en vigor al día siguiente de su publicación en el Periódico Oficial del Estado.</p>  
     <p><b>SEGUNDO.</b> Se derogan todas las disposiciones que se opongan al presente Decreto.</p>  
    **order:** 200

6. **Others (if applicable)**:
   - Review for general coherence, structure, and formatting.
   - Apply HTML styles to maintain clarity, readability, and a professional appearance.

### Additional Formatting Guidelines:

- Please do not create or write random definitions within the article. Just make sure you are working with the information that is being shared with you. //Attention with this rule.
- Use consistent and professional formatting, such as proper indentation for nested elements.
- Respect spaces, punctuation (e.g., periods, hyphens), and line breaks for clarity.
- The text contains footnotes or headers that is not relevant to the context. This information that is out of context is removed. (Remove footnotes and headers) // Attention: Do not remove any relevant information.
- Ensure all text ends with complete ideas but but without making up or creating new things.
- Maintain any existing tables or columns using <table>, <thead>, <tbody>, and <tr> tags.
- Use semantic HTML wherever possible to improve readability and structure.
- Return the corrected object in **Spanish**, preserving the original meaning of the text.
  `
  }
}

export default ReglamentoArticleExtractor
