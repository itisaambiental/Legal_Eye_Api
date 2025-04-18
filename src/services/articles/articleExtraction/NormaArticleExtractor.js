import ArticleExtractor from './ArticleExtractor.js'
import openai from '../../../config/openapi.config.js'
import { ArticleVerificationSchema, singleArticleModelSchema, IndexResponseSchema } from '../../../schemas/article.schema.js'
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
    const contentKeywordRegex = /\b[Cc]\s*[OoÓó]\s*[Nn]\s*[Tt]\s*[Ee]\s*[Nn]\s*[IiÍí]\s*[Dd]\s*[Oo]\b/gi
    const indexKeywordRegex = /\b[ÍIíi]\s*[Nn]\s*[Dd]\s*[IiÍí]\s*[Cc]\s*[Ee]\b/gi

    const ellipsisTextRegex = /[^.]+\s*\.{3,}\s*/g
    const singleEllipsisRegex = /\s*\.{3,}\s*/g

    return text
      .replace(contentKeywordRegex, 'CONTENIDO')
      .replace(indexKeywordRegex, 'ÍNDICE')
      .replace(ellipsisTextRegex, '')
      .replace(singleEllipsisRegex, '')
  }

  /**
 * @param {string} text - Text to process and extract articles from.
 * @returns {Promise<Array<Article>>} - List of article objects.
 */
  async _extractArticles (text) {
    text = this._cleanText(text)

    const lines = text.split('\n').map(line => line.trim()).filter(Boolean)
    let startIndex = -1
    let endIndex = -1
    let firstIndexLine = null
    const indexRegex = /^\s*(ÍNDICE|CONTENIDO)\s*$/i
    for (let i = 0; i < lines.length; i++) {
      if (indexRegex.test(lines[i])) {
        startIndex = i
        break
      }
    }
    if (startIndex === -1) return null
    firstIndexLine = lines[startIndex + 1]
    if (!firstIndexLine) return null

    for (let i = startIndex + 2; i < lines.length; i++) {
      if (lines[i] === firstIndexLine) {
        endIndex = i
        break
      }
    }

    if (endIndex === -1) return null

    const indexBlock = lines.slice(startIndex + 1, endIndex).join('\n')

    const matches = await this._cleanIndex(indexBlock)
    console.log(matches)
  }

  /**
   * @param {string} title - Title of the article.
   * @param {ValidationResult} previousLastResult - Validation result of the previous article.
   * @param {string} previousContent - Previous article including its title.
   * @param {string} currentContent - Current article including its title.
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
 * @param {string} indexText - The raw index text to clean.
 * @returns {Promise<string[]>} - An array of numeral titles extracted from the index.
 */
  async _cleanIndex (indexText) {
    const prompt = this._buildCleanIndexPrompt(indexText)
    const request = {
      model: this.model,
      messages: [
        {
          role: 'system',
          content: 'You are a text processing expert specialized in analyzing index sections of Mexican Official Standards (NOMs). Note: Although your instructions are in English, the index sections provided will be in Spanish.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0,
      response_format: zodResponseFormat(IndexResponseSchema, 'clean_index')
    }

    const attemptRequest = async (retryCount = 0) => {
      try {
        const response = await openai.chat.completions.create(request)
        const content = IndexResponseSchema.parse(
          JSON.parse(response.choices[0].message.content)
        )
        return content
      } catch (error) {
        console.log(error)
        if (error.status === 429 && retryCount < 3) {
          const backoffTime = Math.pow(2, retryCount) * 1000
          await new Promise(resolve => setTimeout(resolve, backoffTime))
          return attemptRequest(retryCount + 1)
        }
        throw new ErrorUtils(500, 'Index Cleaning Error', error)
      }
    }

    return attemptRequest()
  }

  /**
 * Constructs a prompt to clean the given index text and extract only numerals.
 *
 * @param {string} index - The index text extracted from the document.
 * @returns {string} - The prompt to send to the OpenAI API.
 */
  _buildCleanIndexPrompt (index) {
    return `
You are a text processing expert specialized in analyzing the index (Índice/Contenido) sections of Mexican Official Standards (NOMs).

Given the raw index text below:

"""
${index}
"""

Clean it by removing headers, footers, page numbers, and any extraneous content. Then:
1. Produce a cleaned index containing only the numbered sections (numerals 0., 1., 2., ...), each on its own line.
2. Extract an array of strings listing each numeral title in order.

Do NOT include annexes, transitory provisions, appendices, or any non-numeral sections in the array.
`
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
      response_format: zodResponseFormat(
        ArticleVerificationSchema,
        'article_verification'
      )
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
  /**
 * @param {string} legalName - The name of the legal base.
 * @param {ArticleToVerify} article - The article for which the verification prompt is built.
 * @returns {string} - The constructed prompt.
 */
  _buildVerifyPrompt (legalName, article) {
    return `
You are a regulatory expert in chemical safety and compliance. Your task is to validate provisions extracted from Mexican Official Standards (Normas Oficiales Mexicanas – NOMs) in the chemical field.

### 0. Segmentation Rules
1. **End of Index/Content**  
   After a title matching /^ÍNDICE\b/i or /^CONTENIDO\b/i, collect all subsequent list lines until you see the very first repetition of the root numeral (e.g. “0. Introducción”). That repeated numeral marks the end of the Index/Content block and the start of actual articles.

2. **Numeral‑based Articles**  
   * A new article begins at any line matching // ^[0-9]+\\.
   • **Group** that root line and **all** its sub‑levels (1.1, 1.1.2, etc.) **and** any embedded tables (TABLA 1, TABLA 2) into **one** article.  
   • Do **not** split sub‑levels or table rows into separate articles.

3. **End of Articles**  
   A numeral article ends when you hit one of these markers (case‑insensitive):  
   – TRANSITORIOS  
   – ANEXO or APÉNDICE  

---

### 1. Evaluation Context:
– NOM Standard: "${legalName}"  
– Previous Section: "${article.previousArticle.content}"  
  (Validation: { isValid: ${article.previousArticle.lastResult.isValid}, reason: ${article.previousArticle.lastResult.reason === null ? 'null' : `"${article.previousArticle.lastResult.reason}"`} })  
– Current Section: "${article.currentArticle}"  
– Next Section: "${article.nextArticle}"

### 2. Important Note on Text Evaluation
– Ignore headers, footers, page numbers, dates, external references.  
– Focus only on the body of the provision.  
– If Previous, Current and Next form a coherent sequence → VALID.

### 3. Classification Rules
1. VALID → { isValid: true, reason: null }  
2. INVALID → { isValid: false, reason: "<rule>" }, where <rule> is:
   – IsIncomplete → the section is clearly cut off or unfinished.  
   – IsContinuation → follows a previously IsIncomplete section.

---

### 4. Normative Categories with Examples

**A. CONSIDERANDO**  
– Title /^CONSIDERANDO\b/i → always VALID.  
  Example:  
    CONSIDERANDO  
    …toda persona tiene derecho…  
  Result: { isValid: true, reason: null }

**B. Index / Content (ÍNDICE / CONTENIDO)**  
– Title matches /^ÍNDICE\b/i or /^CONTENIDO\b/i.  
– Group into a single article all list lines until the repeated root numeral.  
– Never split or invent text.  
– Always VALID.  
  Example:
    ÍNDICE  
    0. Introducción  
    1. Objetivo y campo de aplicación  
    …  
    VII Contenido de la bitácora…  
    0. Introducción  ← end of index  
  Result: { isValid: true, reason: null }

**C. Preface (PREFACIO)**  
– A narrative intro by the issuer.  
– Must end listing all participants.  
  Valid Example:  
    PREFACIO  
    En la elaboración participaron:  
    1. CONAGUA  
    …  
    6. SEMARNAT  
  → { isValid: true, reason: null }  
  Incomplete Example (cuts off):  
    PREFACIO  
    Esta Norma tiene por objeto…  
  → { isValid: false, reason: IsIncomplete }

**D. Introduction (INTRODUCCION)**  
– Context, justification, scope.  
  Valid:  
    0. Introducción  
    La necesidad de obtener…  
    …  
    se expide la presente Norma.  
  → { isValid: true, reason: null }  
  Incomplete (cuts off mid‑justification):  
    INTRODUCCION  
    Ante la creciente demanda…  
  → { isValid: false, reason: IsIncomplete }

**E. Transitory Provisions (TRANSITORIOS)**  
– Title /^TRANSITORIOS\b/i or “PRIMERO”, “SEGUNDO”…  
  Valid:  
    TRANSITORIOS  
    PRIMERO. Entrará en vigor…  
    SEGUNDO. Los parámetros…  
    …  
    SÉPTIMO. Deroga la NOM-001-SEMARNAT-1996.  
  → { isValid: true, reason: null }  
  Incomplete (missing date):  
    TRANSITORIO PRIMERO  
    Entrará en vigor…  
  → { isValid: false, reason: IsIncomplete }

**F. Annex / Appendix (ANEXO / APÉNDICE)**  
– Title /^ANEXO\b/i or /^APENDICE\b/i.  
  Valid:  
    APÉNDICE NORMATIVO: PUERTOS DE MUESTREO  
    (detalladas instrucciones…)  
  → { isValid: true, reason: null }

**G. Numeral Sections (Numerales)**  
- Title  // A new article begins at any line matching the pattern:
  // ^[0-9]+\\.
– Group that line + all its sub‑levels + any embedded tables into one article.  
  Valid Example:  
    1. Objetivo y campo de aplicación  
    1.1 Objetivo  
    1.2 Campo de aplicación…  
  → { isValid: true, reason: null }  
  Incomplete Example:  
    2. Referencias normativas  
    2.1 Norma Mexicana… (cuts off)  
  → { isValid: false, reason: IsIncomplete }  
  Continuation: if Previous was IsIncomplete → { isValid: false, reason: IsContinuation }

---

Apply these segmentation and validation rules to every section of the NOM.
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
  You are a technical reviewer and documentation specialist with expertise in Mexican Official Standards (Normas Oficiales Mexicanas, NOMs), specifically in the area of chemistry and industrial regulation. Your task is to correct and format extracted sections of NOMs using clear and professional HTML formatting for use in a legal-technical platform.
  
  ### Standard Reference:
  - **Norma Oficial Mexicana:** "${legalName}"
  
  ### Input:
  {
  "title": "${article.title}",
  "article": "${article.article}",
  "plainArticle": "${article.plainArticle}",
  "order": ${article.order}
  }
  
  ---
  
  ### Instructions:
  
  1. **plainArticle**:
   - Always leave the value as an empty string: "".
  
  2. **Title**:
   - The "title" must only include the section heading such as "APÉNDICE I", "TRANSITORIO PRIMERO", or hierarchical numerals like "6.1.1 Métodos químicos".
   - Do not include HTML tags in the title.
   - If the heading contains a clear numeral (e.g. "6", "6.1", "6.1.1.1") and a short title, preserve it.
   - Titles must not contain content or explanatory sentences.
   - Apply consistent formatting for numbering (Arabic or Roman) and qualifiers (Bis, Ter, etc.).
  
  #### Examples:
   - "6 Métodos de Muestreo"
   - "6.1 Sustancias Volátiles"
   - "TRANSITORIO PRIMERO"
   - "APÉNDICE I"
   - "ÍNDICE"
   - "PREFACIO"
  
  3. **Article (Body)**:
   - Structure the content using semantic HTML:
     - Use <p> for paragraphs
     - Use <h2> or <h3> for subsections
     - Use <ul>/<ol> and <li> for lists
     - Use <table> when presenting data or conditions
     - Use <b> or <i> for emphasis
   - Break down long paragraphs for readability
   - Ensure chemical or technical terms are preserved with correct symbols or notation (e.g., "H₂O", "pH", "°C")
   - If the article contains procedural steps, use numbered or bulleted lists
   - Do **not** create new content—only complete ideas if obviously truncated.
  
  #### Example Output (Chemical NOM):
  **title:** 6.1 Sustancias Volátiles  
  **article:**
  <p>Las sustancias volátiles deberán analizarse utilizando métodos previamente validados por el laboratorio, conforme a los procedimientos establecidos por la autoridad competente.</p>
  <p>El análisis se realizará bajo condiciones controladas de temperatura (<i>25 ± 2 °C</i>) y presión atmosférica estándar.</p>
  <ul>
    <li>Utilizar columnas GC-MS calibradas</li>
    <li>Realizar duplicados para validar resultados</li>
  </ul>
  
  ---
  
  4. **Annexes, Appendices, and Transitory Provisions**:
   - Format annexes and appendices as short structured references.
   - Transitory provisions should list each condition separately using bold identifiers (e.g., "PRIMERO.", "SEGUNDO.").
  
  #### Example:
  **title:** TRANSITORIOS  
  **article:**
  <p><b>PRIMERO.</b> Esta Norma entrará en vigor 60 días naturales después de su publicación en el Diario Oficial de la Federación.</p>
  <p><b>SEGUNDO.</b> Los laboratorios tendrán un periodo de adecuación de 180 días.</p>
  
  ---
  
  5. **General Guidelines**:
   - Do not add new sections, headers, or fictional definitions.
   - Ensure clean semantic structure, proper line spacing, and punctuation.
   - Maintain technical neutrality and avoid interpreting the regulation content.
   - If tables are found, use proper HTML tags: <table>, <thead>, <tbody>, <tr>, <td>, etc.
   - Output must be **entirely in Spanish**, preserving the original intent and regulatory integrity.
  
  Return the corrected version of the article in this same format.
  `
  }
}

export default NormaArticleExtractor
