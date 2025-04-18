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
    const sectionKeywordRegex =
    /\b[Ss]\s*[Ee]\s*[Cc]\s*[Cc]\s*[ÍIíi]\s*[ÓOóo]\s*[Nn]\s*(\d+[A-Z]*|[IVXLCDM]+)\b/gi
    const transientKeywordRegex =
    /\b(?:\w+\s+)*[Tt][Rr][Aa][Nn][Ss][Ii][Tt][Oo][Rr][Ii][AaOo](?:\s*[SsAa])?\s*(\d+[A-Z]*|[IVXLCDM]+)?\b/gi
    const annexKeywordRegex =
    /\b[Aa]\s*[Nn]\s*[Ee]\s*[Xx]\s*[Oo]\s*(\d+[A-Z]*|[IVXLCDM]+)?\b/gi
    const ellipsisTextRegex = /[^.]+\s*\.{3,}\s*/g
    const singleEllipsisRegex = /\s*\.{3,}\s*/g

    return text
      .replace(contentKeywordRegex, 'CONTENIDO')
      .replace(indexKeywordRegex, 'ÍNDICE')
      .replace(sectionKeywordRegex, 'SECCIÓN $1')
      .replace(transientKeywordRegex, 'TRANSITORIO $1')
      .replace(annexKeywordRegex, 'ANEXO $1')
      .replace(ellipsisTextRegex, '')
      .replace(singleEllipsisRegex, '')
  }

  /**
 * @param {string} text - Text to process and extract articles from.
 * @returns {Promise<Array<Article>>} - Array of extracted articles.
 */
  async _extractArticles (text) {
    text = this._cleanText(text)
    const lines = text.split('\n').map(line => line.trim()).filter(Boolean)
    const indexRegex = /^\s*(ÍNDICE|CONTENIDO)\s*$/i

    const articlePatternString =
    '(?:^|\\n)\\s*(' +
    '(?:secci[oó]n)\\s+\\S+|' +
    '(?:transitori[oa][s]?)\\s+\\S+|' +
    '(?:anexo)\\s+\\S+' +
    ')'

    const articlePattern = new RegExp(articlePatternString, 'i')
    const articleRegexes = [
      /^(?:secci[oó]n)\s+\S+$/i,
      /^(?:transitori[oa][s]?)\s+\S+$/i,
      /^(?:anexo)\s+\S+$/i
    ]

    const articles = []
    let order = 1
    const lastResult = { isValid: true, reason: null }
    const indexLine = lines.findIndex(line => indexRegex.test(line))
    if (indexLine > 0) {
      const preIndexText = lines.slice(0, indexLine).join('\n')
      const preSegments = preIndexText.split(articlePattern)

      for (let i = 1; i < preSegments.length; i += 2) {
        const currentTitle = preSegments[i].trim()
        const currentContent = (preSegments[i + 1] || '').trim()
        const currentArticle = `${currentTitle} ${currentContent}`.trim()

        const prevTitle = i > 1 ? preSegments[i - 2]?.trim() : ''
        const prevContent = i > 1 ? preSegments[i - 1]?.trim() : ''
        const nextTitle = i + 2 < preSegments.length ? preSegments[i + 2]?.trim() : ''
        const nextContent = i + 3 < preSegments.length ? preSegments[i + 3]?.trim() : ''

        const previousArticle = `${prevTitle} ${prevContent}`.trim()
        const nextArticle = `${nextTitle} ${nextContent}`.trim()

        if (articleRegexes.some(r => r.test(currentTitle))) {
          const currentArticleData = this._createArticleToVerify(
            currentTitle,
            lastResult,
            previousArticle,
            currentArticle,
            nextArticle,
            order++
          )

          articles.push({
            title: currentArticleData.title,
            article: currentArticleData.currentArticle,
            plainArticle: currentArticleData.plainArticle,
            order: currentArticleData.order
          })
        }
      }
    }
    const tryExtractFrom = async (startFromIndex = indexLine >= 0 ? indexLine : 0) => {
      let startIndex = -1
      let endIndex = -1
      for (let i = startFromIndex; i < lines.length; i++) {
        if (indexRegex.test(lines[i])) {
          startIndex = i
          break
        }
      }
      if (startIndex === -1 || startIndex + 1 >= lines.length) {
        throw new ErrorUtils(500, 'Article Processing Error')
      }
      const firstIndexLine = lines[startIndex + 1]
      for (let i = startIndex + 2; i < lines.length; i++) {
        if (lines[i] === firstIndexLine) {
          endIndex = i
          break
        }
      }
      if (endIndex === -1) {
        return tryExtractFrom(startIndex + 1)
      }
      const indexBlock = lines.slice(startIndex + 1, endIndex).join('\n')
      const result = await this._cleanIndex(indexBlock)
      if (!result.isValid) {
        return tryExtractFrom(startIndex + 1)
      }
      const numerals = result.numerals
      const escapedPatterns = numerals.map(title => {
        const parts = title.split('.')
        const num = parts[0].trim()
        const rest = parts.slice(1).join('.').trim()
        return `${num}\\.\\s+${rest.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`
      })
      const pattern = new RegExp(`^\\s*(${escapedPatterns.join('|')})\\b`, 'gm')
      const matches = [...text.matchAll(pattern)]
      for (let i = 0; i < matches.length; i++) {
        const start = matches[i].index
        const end = i + 1 < matches.length ? matches[i + 1].index : text.length
        const numeral = matches[i][1]
        const content = text.slice(start, end).trim()

        const previousTitle = i > 0 ? matches[i - 1][1] : ''
        const previousContent = i > 0 ? text.slice(matches[i - 1].index, matches[i].index).trim() : ''
        const nextTitle = i + 1 < matches.length ? matches[i + 1][1] : ''
        const nextContent = i + 1 < matches.length
          ? text.slice(matches[i + 1].index, matches[i + 2]?.index || text.length).trim()
          : ''
        const previousArticle = `${previousTitle} ${previousContent}`.trim()
        const nextArticle = `${nextTitle} ${nextContent}`.trim()
        if (i === matches.length - 1) {
          const segments = content.split(articlePattern)
          const matchesInContent = [...content.matchAll(new RegExp(articlePatternString, 'ig'))]
          let wasSubArticlePushed = false
          if (matchesInContent.length > 0) {
            const firstIndex = matchesInContent[0].index
            const introContent = content.slice(0, firstIndex).trim()

            if (introContent) {
              const currentArticleData = this._createArticleToVerify(
                numeral,
                lastResult,
                previousArticle,
                introContent,
                nextArticle,
                order++
              )
              articles.push({
                title: currentArticleData.title,
                article: currentArticleData.currentArticle,
                plainArticle: currentArticleData.plainArticle,
                order: currentArticleData.order
              })
              wasSubArticlePushed = true
            }
          }
          for (let j = 1; j < segments.length; j += 2) {
            const currentTitle = segments[j].trim()
            const currentContent = (segments[j + 1] || '').trim()
            const currentArticle = `${currentTitle} ${currentContent}`.trim()

            const prevTitle = j > 1 ? segments[j - 2]?.trim() : ''
            const prevContent = j > 1 ? segments[j - 1]?.trim() : ''
            const nextTitle = j + 2 < segments.length ? segments[j + 2]?.trim() : ''
            const nextContent = j + 3 < segments.length ? segments[j + 3]?.trim() : ''

            const previousSubArticle = `${prevTitle} ${prevContent}`.trim()
            const nextSubArticle = `${nextTitle} ${nextContent}`.trim()

            if (articleRegexes.some(r => r.test(currentTitle))) {
              const currentArticleData = this._createArticleToVerify(
                currentTitle,
                lastResult,
                previousSubArticle,
                currentArticle,
                nextSubArticle,
                order++
              )
              articles.push({
                title: currentArticleData.title,
                article: currentArticleData.currentArticle,
                plainArticle: currentArticleData.plainArticle,
                order: currentArticleData.order
              })
              wasSubArticlePushed = true
            }
          }

          if (!wasSubArticlePushed) {
            const currentArticleData = this._createArticleToVerify(
              numeral,
              lastResult,
              previousArticle,
              content,
              nextArticle,
              order++
            )
            articles.push({
              title: currentArticleData.title,
              article: currentArticleData.currentArticle,
              plainArticle: currentArticleData.plainArticle,
              order: currentArticleData.order
            })
          }
        } else {
          const currentArticleData = this._createArticleToVerify(
            numeral,
            lastResult,
            previousArticle,
            content,
            nextArticle,
            order++
          )

          articles.push({
            title: currentArticleData.title,
            article: currentArticleData.currentArticle,
            plainArticle: currentArticleData.plainArticle,
            order: currentArticleData.order
          })
        }
      }

      return articles
    }

    return tryExtractFrom()
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
 * @returns {Promise<{ numerals: string[], isValid: boolean }>} - Cleaned numerals and index validity.
 */
  async _cleanIndex (indexText) {
    const prompt = this._buildCleanIndexPrompt(indexText)
    const request = {
      model: this.model,
      messages: [
        {
          role: 'system',
          content:
          'You are a text processing expert specialized in analyzing index sections of Mexican Official Standards (NOMs). Note: Although your instructions are in English, the index sections provided will be in Spanish.'
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
        if (error.status === 429 && retryCount < 3) {
          const backoffTime = Math.pow(2, retryCount) * 1000
          await new Promise(resolve => setTimeout(resolve, backoffTime))
          return attemptRequest(retryCount + 1)
        }
        throw new ErrorUtils(500, 'Article Processing Error', error)
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

Your task is to:
1. Clean the index by removing headers, footers, page numbers, links, administrative notes, and any irrelevant content.
2. Identify and extract only the **numerically ordered** sections such as:
   - "0. Introducción"
   - "1. Objeto y Ámbito de validez"
   - "2. Referencias"
   - "3. Definiciones"
   - "4. Requisitos técnicos"
   - etc.

Rules to determine "isValid":
- Return "isValid": true **only** if:
  - The index has at least **3 numeric sections** with a clear order (e.g., "1. Introducción", "2. Objeto...", etc.).
  - Each line begins with a **number followed by a period and a space**, like "3. Requisitos...".
  - The list is consistent, structured, and technical in nature (e.g., related to definitions, scope, requirements).
- Return "isValid": false if:
  - The text contains non-numeric items, administrative notes, legal announcements, dependencies, pages, or bullet points.
  - The content resembles a government bulletin, administrative circular, or includes entities like "Secretaría de...", "Delegación...", or page numbers.

Examples of **invalid index content**:
- Viene de la Pág. 1
- Secretaría de Seguridad Pública
-  Aviso por el que se da a conocer...
- MA-11000-16/10
- Padrones de Personas Beneficia...

Important:
- Exclude annexes, transitory provisions, appendices, and **any unnumbered or unordered sections** from the "numerals" list.
- Each valid numeral must be returned as a **clean string**, preserving accents and original order.
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
   - The title field should only state the numeral, section, or annex number.
   - If the article content begins with a **numeral indicator** (e.g., "1.1", "3.3", "bis", "ter", "quater", "quinquies", "sexies", "septies", "octies", "novies", "nonies", "decies", "undecies", "duodecies", "terdecies", "quaterdecies", "quindecies"), **or an ordinal numeral** (e.g., "décimo", "undécimo", "duodécimo", "trigésimo", "cuadragésimo", "quincuagésimo", "sexagésimo", "septuagésimo", "octogésimo", "nonagésimo", "centésimo"), "Check if the numeral indicator is being used as part of the article’s legal meaning. If removing it does not change the meaning, move it to the title field.  If the numeral indicator is an essential part of the article’s meaning, keep it within the content.".
   - This applies to **numerals, sections,annex and transitories,**.
   - Ensure that titles are concise and formatted consistently.
   - Do not use HTML tags in titles.

#### Examples (in Spanish):
- **0. Introducción**, **1. Objeto y Ámbito de validez**, **2. Campo de aplicación**
- **3. Referencias normativas**, **4. Definiciones**, **SECCIÓN I**, **5. Clasificación**
- **6. Requisitos técnicos**, **7. Métodos de prueba**, **SECCIÓN II**
- **8. Inspección**, **9. Muestreo**, **10. Marcado, etiquetado y embalaje**
- **ANEXO A**, **ANEXO B**, **11. Almacenamiento**
- **12. Bibliografía**, **13. Concordancia con normas internacionales**
- **TRANSITORIO PRIMERO**, **TRANSITORIO SEGUNDO**, **ANEXO C**
- **14. Vigencia**, **SECCIÓN FINAL**, **ANEXO D**

**Output (Unformatted HTML):**  
- 0. Introducción, 1. Objeto y Ámbito de validez, 2. Campo de aplicación  
- 3. Referencias normativas, 4. Definiciones, SECCIÓN I, 5. Clasificación  
- 6. Requisitos técnicos, 7. Métodos de prueba, SECCIÓN II  
- 8. Inspección, 9. Muestreo, 10. Marcado, etiquetado y embalaje  
- ANEXO A, ANEXO B, 11. Almacenamiento  
- 12. Bibliografía, 13. Concordancia con normas internacionales  
- TRANSITORIO PRIMERO, TRANSITORIO SEGUNDO, ANEXO C  
- 14. Vigencia, SECCIÓN FINAL, ANEXO D


3. **Numerals**:
   - Review and correct long paragraphs, ensuring each explains a specific concept or legal provision.
   - Divide content into sections or subsections for clarity, using appropriate HTML tags:
     - <h2>, <h3> for headings
     - <p> for paragraphs
     - <ul> and <li> for lists
   - Use <b> for emphasis, <i> for additional context, and <span> for inline styles where necessary.
   - Complete truncated words or sentences without altering their meaning.

  #### Example (in Spanish):
   **title:** Introducción, 1 
   **article:** Esta Norma Oficial Mexicana establece los requisitos mínimos de construcción que se deben cumplir
  durante la perforación de pozos para la extracción de aguas nacionales y trabajos asociados, con objeto
  deevitar la contaminación de los acuíferos.
   **order:** 1

  **Article Output (Formatted in HTML):**  
   **title:** Introducción, 1    // Titles should not have HTML tags.
   **article:** <p>Esta <i>Norma Oficial Mexicana</i> establece los requisitos mínimos de construcción que se deben cumplir  durante la perforación de pozos para la extracción de aguas nacionales y trabajos asociados,</p>  
   <p>con objeto de evitar la contaminación de los acuíferos.</p>
   **order:** 1

  4. Sections, and Annexes:
   - Ensure headings are concise and formatted with appropriate text structure.
   - Titles should be short and precise, containing only the grouping heading without including articles or detailed content.
   - If any articles are included, remove them from the chapter, section, title, or annex.
   - Please do not create or write random definitions within the Sections, and Annexes. Just make sure you are working with the information that is being shared with you. 

   - Sections, and Annexes should follow the structure:
     - SECTION # + Section Name
     - ANNEX # + Annex Name

   ATTENTION:
   - Section, and Annex names should be short.
   - Do not include additional information in these headings.

    Examples:

    Example 2 (Section in Spanish):
    title: SECCIÓN PRIMERA
    article: DISPOSICIONES COMUNES
    order: 6

    Output (Formatted):
    title: SECCIÓN PRIMERA
    article: DISPOSICIONES COMUNES
    order: 6

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
- **Never delete, omit, or ignore numbered or lettered fractions** (e.g., 1.1, 1.1.2, I.A, a), i), etc.) found in the articles.
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
