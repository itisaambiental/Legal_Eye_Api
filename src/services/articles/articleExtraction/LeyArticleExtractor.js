import ArticleExtractor from './ArticleExtractor.js'
import openai from '../../../config/openapi.config.js'
import { singleArticleModelSchema } from '../../../schemas/article.schema.js'
import { zodResponseFormat } from 'openai/helpers/zod'
import { convert } from 'html-to-text'
import ErrorUtils from '../../../utils/Error.js'
/**
 * Class extending ArticleExtractor to extract articles from laws texts.
 * Processes the text, cleans inconsistent formats, and extracts articles,
 * chapters, sections, and transitory provisions in a structured manner.
 */
class LeyArticleExtractor extends ArticleExtractor {
  /**
   * @typedef {Object} Article
   * @property {string} title - The title of the article, chapter, section, title or transitory provision.
   * @property {string} article - The content of the article in HTML format. Empty string if no content is found.
   * @property {string} plainArticle - The plain text equivalent of the article content.
   * @property {number} order - The sequential order of the extracted item.
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
    const formatArticles = []
    let currentProgress = 0
    for (const article of articles) {
      if (await this.job.isFailed()) {
        throw new ErrorUtils(500, 'Job was canceled')
      }
      try {
        const correctedArticle = await this._correctArticle(article)
        correctedArticle.plainArticle = convert(correctedArticle.article)
        formatArticles.push(correctedArticle)
      } catch (error) {
        continue
      }
      currentProgress += 1
      this.updateProgress(currentProgress, totalArticles)
    }
    return this.formatArticles(formatArticles)
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
      /\b[Tt]\s*[Rr]\s*[Aa]\s*[Nn]\s*[Ss]\s*[Ii]\s*[Tt]\s*[Oo]\s*[Rr]\s*[Ii]\s*[Oo](?:\s*[Ss])?\s*(\d+[A-Z]*|[IVXLCDM]+)?\b/gi
    const annexKeywordRegex =
      /\b[Aa]\s*[Nn]\s*[Ee]\s*[Xx]\s*[Oo]\s*(\d+[A-Z]*|[IVXLCDM]+)?\b/gi
    const ellipsisTextRegex = /[^.]+\s*\.{3,}\s*/g
    const singleEllipsisRegex = /\s*\.{3,}\s*/g

    return text
      .replace(articleKeywordRegex, 'ARTÍCULO $1')
      .replace(chapterKeywordRegex, 'CAPÍTULO $1')
      .replace(sectionKeywordRegex, 'SECCIÓN $1')
      .replace(titleKeywordRegex, 'TÍTULO $1')
      .replace(transientKeywordRegex, 'TRANSITORIOS $1')
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
      '(?:transitori[oó]s?)\\s+\\S+|' +
      '(?:anexo)\\s+\\S+' +
      ')'

    const articlePattern = new RegExp(articlePatternString, 'i')
    const chapterRegex = /^(?:c[áa]p[ií]tulo)\s+\S+$/i
    const titleRegex = /^(?:t[ií]tulo)\s+\S+$/i
    const sectionRegex = /^(?:secci[oó]n)\s+\S+$/i
    const articleRegex = /^(?:art[ií]culo)\s+\S+$/i
    const transientHeaderRegex = /^(?:transitori[oó]s?)\s+\S+$/i
    const annexHeaderRegex = /^(?:anexo)\s+\S+$/i

    const regexes = [
      chapterRegex,
      sectionRegex,
      titleRegex,
      articleRegex,
      transientHeaderRegex,
      annexHeaderRegex
    ]

    const matches = text.split(articlePattern)
    const articles = []
    let currentArticle = null
    let order = 1

    for (let i = 1; i < matches.length; i++) {
      const currentMatch = matches[i].trim()
      if (regexes.some((regex) => regex.test(currentMatch))) {
        if (currentArticle) {
          const { isValid } = await this._verifyArticle(currentArticle)
          if (isValid) articles.push(currentArticle)
        }
        currentArticle = this._createArticleObject(
          currentMatch,
          matches[i + 1],
          order++
        )
      }
    }

    if (currentArticle) {
      const { isValid } = await this._verifyArticle(currentArticle)
      if (isValid) articles.push(currentArticle)
    }

    return articles
  }

  /**
   * @param {string} title - Title of the article.
   * @param {string} content - Content of the article.
   * @param {number} order - Order of the article.
   */
  _createArticleObject (title, content, order) {
    return {
      title,
      article: content ? content.trim() : '',
      plainArticle: '',
      order
    }
  }

  /**
   * @param {Article} article - The article object to verify.
   * @returns {Promise<{ isValid: boolean }>} - JSON object indicating if the article is valid.
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
        const content = JSON.parse(response.choices[0].message.content)
        if (content && typeof content.isValid === 'boolean') {
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
   * @param {string} documentName - The name of the document.
   * @param {Article} article - The article object for which the prompt is built.
   */
  _buildVerifyPrompt (documentName, article) {
    return `
    Analyze the content of "${article.title}" within the Mexican legal basis titled "${documentName}". 
    Then, determine whether the legal provision is valid based on the following criteria:

    ### **Legal Provision Details**
    {
      "title": "${article.title}",
      "article": "${article.article}",
      "plainArticle": "${article.plainArticle}",
      "order": ${article.order}
    }

    ### **Criteria for a Valid Legal Provision**
    A provision is considered valid if it meets at least one of the following conditions:

    1. **Articles (Artículos)**:
      - Must belong to a recognized legal document.
      - Must establish legal norms such as obligations, rights, prohibitions, or principles.
      - Should have a clear legal structure.
      - It must contain a specific legal rule or directive rather than just referencing other articles.

    2. **Chapters (Capítulos), Titles (Títulos), and Sections (Secciones)**:
      - Must be part of a structured legal framework.

    3. **Annexes (Anexos)**:
      - Must provide additional information that supports or complements the legal text.

    4. **Transitory Provisions (Disposiciones Transitorias)**:
      - Must establish rules for the transition or application of the legal document.
   `
  }

  /**
   * @param {Article} article - The article object to correct.
   * @returns {Promise<Article>} - Corrected article object.
   */
  async _correctArticle (article) {
    const prompt = this._buildCorrectArticlePrompt(this.name, article)
    const request = {
      model: this.model,
      messages: [
        {
          role: 'system',
          content:
            'You are a virtual assistant specialized in reviewing, correcting, and documenting Mexican legal articles extracted from various laws. Note: All laws are in Spanish, and all output must also be in Spanish.'
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
   * @param {string} documentName - The name of the document.
   * @param {Article} article - The article object for which the prompt is built.
   */
  _buildCorrectArticlePrompt (documentName, article) {
    return `
Analyze the content of "${article.title}" within the Mexican legal basis titled "${documentName}". Then, help format and correct the following article using professional HTML structure and styles:

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

- Use consistent and professional formatting, such as proper indentation for nested elements.
- Respect spaces, punctuation (e.g., periods, hyphens), and line breaks for clarity.
- Ensure all text ends with complete ideas but but without making up or creating new things.
- Maintain any existing tables or columns using <table>, <thead>, <tbody>, and <tr> tags.
- Use semantic HTML wherever possible to improve readability and structure.
- Return the corrected object in **Spanish**, preserving the original meaning of the text.
- Sometimes the text contains footnotes or headers that is not relevant to the context. This information that is out of context is removed. 
  `
  }
}

export default LeyArticleExtractor
