import ArticleExtractor from './ArticleExtractor.js'
import openai from '../../../config/openapi.config.js'
import { ArticleVerificationSchema, singleArticleModelSchema } from '../../../schemas/article.schema.js'
import { zodResponseFormat } from 'openai/helpers/zod'
import { convert } from 'html-to-text'
import ErrorUtils from '../../../utils/Error.js'

/**
 * Class extending ArticleExtractor to extract articles from Mexican Official Standards (NOMs).
 * It processes the technical text of the standard, cleans formatting inconsistencies,
 * and extracts structured content based on hierarchical numerals (e.g., 6, 6.1, 6.1.1)
 * and centered headings (e.g., PREFACIO, ÍNDICE, CONSIDERANDO, CONTENIDO, TRANSITORIOS, ANEXO, APENDICE).
 * Each major numeral root or standalone centered title is treated as a distinct article.
 */
class NormaArticleExtractor extends ArticleExtractor {
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
   * Method to extract articles from the text.
   */
  async extractArticles () {
    const articles = await this._extractArticles(this.text)
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
    const raw = text
      .replace(/\r\n/g, '\n')
      .replace(/\t+/g, '')
      .replace(/[ ]{2,}/g, ' ')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{2,}/g, '\n')
      .trim()

    const transientKeywordRegex = /\b(?:\w+\s+)*[Tt][Rr][Aa][Nn][Ss][Ii][Tt][Oo][Rr][Ii][AaOo](?:\s*[SsAa])?\s*(\d+[A-Z]*|[IVXLCDM]+)?\b/
    const annexKeywordRegex = /\b[Aa]\s*[Nn]\s*[Ee]\s*[Xx]\s*[Oo]\s*(\d+[A-Z]*|[IVXLCDM]+)?\b/
    const appendixKeywordRegex = /^\s*[Aa][Pp](?:[ÉEéè]?)?[Nn][Dd][Ii][Cc][Ee](?:\s+(\d+[A-Z]*|[IVXLCDM]+))?\s*$/i

    const prefaceKeywordRegex = /^\s*[Pp][Rr][Ee][Ff][Aa][Cc][Ii][Oo]\s*$/
    const consideringKeywordRegex = /^\s*[Cc][Oo][Nn][Ss][Ii][Dd][Ee][Rr][Aa][Nn][Dd][Oo]\s*$/
    const contentKeywordRegex = /^\s*[Cc][Oo][Nn][Tt][Ee][Nn][Ii][Dd][Oo]\s*$/
    const indexKeywordRegex = /^\s*[ÍIíi][Nn][Dd][ÍIíi][Cc][Ee]\s*$/i

    const lines = raw.split('\n')
    const cleanedLines = lines.map(line => {
      return line
        .replace(transientKeywordRegex, (_, num) => `TRANSITORIO${num ? ' ' + num : ''}`)
        .replace(annexKeywordRegex, (_, num) => `ANEXO${num ? ' ' + num : ''}`)
        .replace(appendixKeywordRegex, (_, num) => `APÉNDICE${num ? ' ' + num : ''}`)
        .replace(prefaceKeywordRegex, 'PREFACIO')
        .replace(consideringKeywordRegex, 'CONSIDERANDO')
        .replace(contentKeywordRegex, 'CONTENIDO')
        .replace(indexKeywordRegex, 'ÍNDICE')
        .trim()
    })

    return cleanedLines.join('\n').trim()
  }

  /**
 * @param {string} text - Text to process and extract articles from.
 * @returns {Promise<Array<Article>>} - List of article objects.co
 */
  async _extractArticles (text) {
    text = this._cleanText(text)

    const articlePatternString =
      '(?:^|\\n)\\s*(' +
      '(?:[Tt][Rr][Aa][Nn][Ss][Ii][Tt][Oo][Rr][Ii][OoSs]?(?:\\s+\\S+)?)|' +
      '(?:[Aa][Nn][Ee][Xx][Oo](?:\\s+\\S+)?)|' +
      '(?:[Aa][Pp][ÉÉEÉéè]?[Nn][Dd][Ii][Cc][Ee](?:\\s+\\S+)?)|' +
      '(?:[Pp][Rr][Ee][Ff][Aa][Cc][Ii][Oo])|' +
      '(?:[Cc][Oo][Nn][Ss][Ii][Dd][Ee][Rr][Aa][Nn][Dd][Oo])|' +
      '(?:[Cc][Oo][Nn][Tt][Ee][Nn][Ii][Dd][Oo])|' +
      '(?:[ÍIíi][Nn][Dd][ÍIíi][Cc][Ee])' +
      ')'

    const articlePattern = new RegExp(articlePatternString, 'i')
    const regexes = [
      /^(?:[Tt][Rr][Aa][Nn][Ss][Ii][Tt][Oo][Rr][Ii][OoSs]?(?:\s+\S+)?)$/i,
      /^(?:[Aa][Nn][Ee][Xx][Oo](?:\s+\S+)?)$/i,
      /^(?:[Aa][Pp][ÉÉEÉéè]?[Nn][Dd][Ii][Cc][Ee](?:\s+\S+)?)$/i,
      /^(?:[Pp][Rr][Ee][Ff][Aa][Cc][Ii][Oo])$/i,
      /^(?:[Cc][Oo][Nn][Ss][Ii][Dd][Ee][Rr][Aa][Nn][Dd][Oo])$/i,
      /^(?:[Cc][Oo][Nn][Tt][Ee][Nn][Ii][Dd][Oo])$/i,
      /^(?:[ÍIíi][Nn][Dd][ÍIíi][Cc][Ee])$/i
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
      const currentContent = i + 1 < matches.length ? matches[i + 1].trim() : ''
      const nextTitle = i + 2 < matches.length ? matches[i + 2].trim() : ''
      const nextContent = i + 3 < matches.length ? matches[i + 3].trim() : ''

      if (regexes.some((regex) => regex.test(currentTitle))) {
        const previousArticle = `${previousTitle} ${previousContent}`.trim()
        const currentArticle = `${currentTitle} ${currentContent}`.trim()
        const nextArticle = `${nextTitle} ${nextContent}`.trim()

        const currentArticleData = this._createArticleToVerify(
          currentTitle,
          lastResult,
          previousArticle,
          currentArticle,
          nextArticle,
          order++
        )

        try {
          const { isValid, reason } = await this._verifyArticle(currentArticleData)

          if (isValid) {
            if (lastArticle) {
              articles.push(lastArticle)
              lastArticle = null
            }
            articles.push({
              title: currentArticleData.title,
              article: currentArticleData.currentArticle,
              plainArticle: currentArticleData.plainArticle,
              order: currentArticleData.order
            })
            isConcatenating = false
          } else {
            if (reason === 'IsIncomplete') {
              if (lastArticle && lastResult.reason === 'IsIncomplete') {
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
            } else if (reason === 'IsContinuation') {
              if (lastResult.reason === 'IsIncomplete' || (isConcatenating && lastResult.reason === 'IsContinuation')) {
                if (lastArticle) {
                  lastArticle.article += ` ${currentArticleData.currentArticle}`
                }
                isConcatenating = true
              } else {
                if (lastArticle) {
                  articles.push(lastArticle)
                  lastArticle = null
                }
                isConcatenating = false
              }
            }
          }

          lastResult = { isValid, reason }
        } catch (error) {
          articles.push({
            title: currentArticleData.title,
            article: currentArticleData.currentArticle,
            plainArticle: currentArticleData.plainArticle,
            order: currentArticleData.order
          })
        }
      }
    }

    if (lastArticle) {
      articles.push(lastArticle)
    }

    return articles
  }

  /**
   * @param {ArticleToVerify} article - The article to verify.
   * @returns {Promise<ValidationResult>} - An object indicating if the article is valid and optionally the reason why it is considered invalid.
   */
  async _verifyArticle (article) {
    const prompt = this._buildVerifyPrompt(this.name, article)
    const request = {
      model: this.model,
      messages: [
        {
          role: 'system',
          content:
            'You are a legal expert who is specialized in confirming the validity of the legal provisions extracted from legal documents. Note: Although your instructions are in English, the provisions provided will be in Spanish.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0,
      response_format: zodResponseFormat(ArticleVerificationSchema, 'article_verification')
    }
    const attemptRequest = async (retryCount = 0) => {
      try {
        const response = await openai.chat.completions.create(request)
        const content = ArticleVerificationSchema.parse(
          JSON.parse(response.choices[0].message.content)
        )
        return content
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
  You are a regulatory expert in chemical safety and compliance. Your task is to validate provisions extracted from Mexican Official Standards (Normas Oficiales Mexicanas - NOMs) in the chemical field.
  
  ### Evaluation Context:
  - **NOM Standard:** "${legalName}"
  - **Previous Section:** "${article.previousArticle.content}" 
  (Validation: { "isValid": ${article.previousArticle.lastResult.isValid}, "reason": "${article.previousArticle.lastResult.reason}" })
  - **Current Section (To be evaluated):** "${article.currentArticle}"
  - **Next Section:** "${article.nextArticle}"
  
  ---
  
  ### ✅ Valid Provision Criteria
  Mark the current section as **VALID** if:
  - It expresses a complete instruction, rule, or technical guideline.
  - It introduces safety measures, chemical handling protocols, classification systems, etc.
  - It is a numeral (e.g., 5, 5.1, 5.1.1...) that introduces a new scope, concept, or criteria.
  - It is a heading or structural section (e.g., "PREFACIO", "ANEXO", "OBJETIVO") with or without accompanying text.
  
  ---
  
  ### ❌ Invalid Provision Criteria
  
  - **IsIncomplete**:
    - Lacks a complete directive, technical idea, or closes abruptly.
    - May be the beginning of a list but is missing key elements.
  
  - **IsContinuation**:
    - Only applies when the **Previous Section** is marked as **IsIncomplete**.
    - Should not be evaluated independently but as a continuation of the previous.
  
  ---
  
  ### 🧪 Examples in Chemical NOM Context
  
  #### ✅ **Example 1 - Valid:**
  - **Previous Provision:** "3. DEFINICIONES"
  - **Current Provision:** "4. CLASIFICACIÓN DE SUSTANCIAS PELIGROSAS"
  - **Next Provision:** "4.1 Sustancias inflamables"
  - **Reasoning:** The current provision introduces a key section related to classification. It is complete and serves as a technical boundary for what follows.
  
  ---
  
  #### ✅ **Example 2 - Valid:**
  - **Previous Provision:** "4.2.2 Límites de exposición para vapores orgánicos."
  - **Current Provision:** "4.2.3 Para compuestos volátiles con punto de ebullición menor a 37.5 °C, deberá aplicarse ventilación localizada."
  - **Next Provision:** "4.2.4 Límites de exposición para compuestos corrosivos."
  - **Reasoning:** This is a complete, enforceable instruction regarding exposure control.
  
  ---
  
  #### ❌ **Example 3 - Incomplete:**
  - **Previous Provision:** "5.2.1 Los envases deberán estar"
  - **Current Provision:** "5.2.2 Etiquetados conforme a lo establecido en..."
  - **Next Provision:** "5.2.3 Deberán cumplir con los requisitos de resistencia química."
  - **Reasoning:** The previous provision is cut off, suggesting that "5.2.1" is incomplete. Even if "5.2.2" introduces a new rule, it's better to treat it as part of the same group.
  
  ---
  
  #### ❌ **Example 4 - Continuation:**
  - **Previous Provision:** "5.1.4 El operador debe realizar pruebas de hermeticidad en los..."
  - **Current Provision:** "dispositivos antes de su uso con solventes clorados."
  - **Next Provision:** "5.1.5 Las áreas deben estar ventiladas adecuadamente."
  - **Reasoning:** The current section cannot stand alone. It completes the previous one and should be marked as **IsContinuation**.
  
  ---
  
  ### Final Notes
  - The provision must be evaluated **as written**, considering only the text presented.
  - Do not hallucinate additional context — assess what is visible.
  - If the section introduces a new numeral or heading and presents valid content, mark it as **Valid**.
  - If it depends on a previous incomplete sentence, mark it as **IsContinuation**.
  
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
            'You are a virtual assistant specialized in reviewing, correcting, and documenting legal articles extracted from various laws. Note: All laws are in Spanish, and all output must also be in Spanish.'
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
        const content = singleArticleModelSchema.parse(
          JSON.parse(response.choices[0].message.content)
        )
        return content
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
Analyze the content of "${article.title}" within the legal basis titled "${legalName}". Then, help format and correct the following article using professional HTML structure and styles:

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
 - Please do not create or write random definitions within the Chapters, Titles, Sections, and Annexes. Just make sure you are working with the information that is being shared with you. 

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

- Please do not create or write random definitions within the article. Just make sure you are working with the information that is being shared with you. 
- Use consistent and professional formatting, such as proper indentation for nested elements.
- Respect spaces, punctuation (e.g., periods, hyphens), and line breaks for clarity.
- The text contains footnotes or headers that is not relevant to the context. This information that is out of context is removed. (Remove footnotes and headers)
- Ensure all text ends with complete ideas but but without making up or creating new things.
- Maintain any existing tables or columns using <table>, <thead>, <tbody>, and <tr> tags.
- Use semantic HTML wherever possible to improve readability and structure.
- Return the corrected object in **Spanish**, preserving the original meaning of the text.
`
  }
}

export default NormaArticleExtractor
