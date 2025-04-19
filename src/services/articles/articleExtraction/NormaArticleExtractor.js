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
   * @property {string} title - The title of the article, appendix, section, annex, or transitory provision.
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
   * @property {string} title - The title of the article, title, appendix, section, annex, or transitory provision.
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
        correctedArticles.push({
          ...article,
          plainArticle: convert(article.article)
        })
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
    const appendixKeywordRegex = /\b[AaÁá][Pp][ÉéEe]?[Nn][Dd][Ii][Cc][Ee]?[Ss]?\s*(\d+[A-Z]*|[IVXLCDM]+)?\b/gi
    const ellipsisTextRegex = /[^.]+\s*\.{3,}\s*/g
    const singleEllipsisRegex = /\s*\.{3,}\s*/g

    return text
      .replace(contentKeywordRegex, 'CONTENIDO')
      .replace(indexKeywordRegex, 'ÍNDICE')
      .replace(sectionKeywordRegex, 'SECCIÓN $1')
      .replace(transientKeywordRegex, 'TRANSITORIO $1')
      .replace(annexKeywordRegex, 'ANEXO $1')
      .replace(appendixKeywordRegex, 'APÉNDICE $1')
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
    '(?:anexo)\\s+\\S+|' +
    '(?:ap[eé]ndice[s]?)\\s+\\S+' +
    ')'
    const articlePattern = new RegExp(articlePatternString, 'i')
    const articleRegexes = [
      /^(?:secci[oó]n)\s+\S+$/i,
      /^(?:transitori[oa][s]?)\s+\S+$/i,
      /^(?:anexo)\s+\S+$/i,
      /^(?:ap[eé]ndice[s]?)\s+\S+$/i
    ]

    const rawArticles = []
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
          rawArticles.push(currentArticleData)
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
      const { isValid, numerals } = await this._cleanIndex(indexBlock)
      if (!isValid) {
        return tryExtractFrom(startIndex + 1)
      }
      const escapedPatterns = numerals.map(n => this._escapeForRegex(n))
      const pattern = new RegExp(`(^|\\n)\\s*(${escapedPatterns.join('|')})\\b`, 'gi')
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
              rawArticles.push(currentArticleData)
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
              rawArticles.push(currentArticleData)
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
            rawArticles.push(currentArticleData)
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
          rawArticles.push(currentArticleData)
        }
      }
      return rawArticles
    }

    const result = await tryExtractFrom()
    const articles = await this._validateExtractedArticles(result)
    return articles
  }

  /**
 * Validate a list of articles using _verifyArticle.
 * Groups incomplete and continuations.
 *
 * @param {Array<ArticleToVerify>} rawArticles
 * @returns {Promise<Array<Article>>}
 */
  async _validateExtractedArticles (rawArticles) {
    const validated = []
    let lastResult = { isValid: true, reason: null }
    let lastArticle = null
    let isConcatenating = false

    for (const currentArticleData of rawArticles) {
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
                validated.push(lastArticle)
                lastArticle = null
              }
              isConcatenating = false
            }
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
    }

    if (lastArticle) {
      validated.push(lastArticle)
    }

    return validated
  }

  /**
 * Normalizes and escapes a string to be safely used in a regular expression.
 * - Removes diacritics (accents like á, é, í)
 * - Removes all spaces
 * - Escapes special regex characters
 * - Converts to lowercase if needed
 *
 * @param {string} str - The string to normalize and escape.
 * @returns {string} - A safe, normalized, and escaped regex string.
 */
  _escapeForRegex (str) {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '')
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
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
 * @returns {Promise<{ numerals: string[], isValid: boolean, hasSubNumerals: boolean }>} - Cleaned numerals and index validity.
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
 * Builds the prompt that cleans the index and extracts its numerals.
 *
 * @param {string} index - Raw index text.
 * @returns {string} - Prompt for the OpenAI API.
 */
  _buildCleanIndexPrompt (index) {
    return `
You are a text‑processing expert specialized in the index (Índice/Contenido)
sections of Mexican Official Standards (NOMs).

Given the raw index text below:

"""
${index}
"""

Your task:

1. Remove headers, footers, page numbers, links, administrative notes and
   any irrelevant content.
2. **Return every numeral exactly as it appears, including the text that follows
   the number preserve original order, accents, and punctuation.  
   
   •First‑level examples →  
     "0. Introducción"  
     "1. Fundamentos y Motivación"  
     "2. Referencias"

   •Sub‑numeral examples →  
     "1.1 Antecedentes"  
     "1.1.1 Fundamentación Jurídica"  
     "4.4.1.2 Distribución de Usos del Suelo"


**Important constraints**

* **Never invent** new numerals (neither first‑level nor hierarchical).  
  Return only those that already exist in the index.
* Annexes, transitory provisions, appendices, or unnumbered items must be
  excluded from the array.

**isValid rules**

Return \`"isValid": true\` only if:

* They keep the original order from the document.
* Set “hasSubNumerals” to true if at least one entry appears in the list whose number contains an extra period (e.g., “1.1”, “4.4.1”). Otherwise return false.

Return \`"isValid": false\` if the text is mostly administrative notes,
page references, or lacks the required numerals.
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
 * @param {string} legalName - The name of the legal base.
 * @param {ArticleToVerify} article - The article for which the verification prompt is built.
 * @returns {string} - The constructed prompt.
 */
  _buildVerifyPrompt (legalName, article) {
    return `
You are a legal expert who confirms the validity of legal provisions:

### Evaluation Context:
- **Legal Base:** "${legalName}"
- **Previous Provision:** "${article.previousArticle.content}" 
(Validation: { "isValid": ${article.previousArticle.lastResult.isValid}, "reason": "${article.previousArticle.lastResult.reason}" })
- **Current Provision(To be evaluated):** "${article.currentArticle}"
- **Next Provision:** "${article.nextArticle}"

### **Important Note on Text Evaluation**
- **Headers and Footnotes:** Please disregard any **headers** or **footnotes** (e.g., page numbers, publication dates, and references to external sources) present in the article or legal text. These elements are often part of the document layout but are not considered part of the legal provision itself.
- **Content of the Provision:** Focus on the **legal content** itself, i.e., the specific rule, directive, or principle outlined in the body of the article or provision.
- **Order of Provisions:** If the **Previous Provision**, **Current Provision**, and **Next Provision** follow the correct **logical order** and are connected in a coherent sequence, they must always be classified as **VALID**.
- **Classification Caution:** Be **extremely careful** when classifying a provision as invalid. If there is **any doubt**, lean towards classifying it as **VALID** to avoid **accidentally skipping** or omitting an article from analysis. Every provision must be evaluated **meticulously** to ensure completeness.

- **Numerals from Index or Table of Contents (Índice o Contenido):**  
  - If the current provision contains only a numeral or subnumeral along with its title as presented in the index or table of contents, without additional legal text (no specific rules, directives, principles, obligations, prohibitions, or rights explicitly stated), it must always be classified as **INVALID** with the reason **"Other"**.  
  - Such provisions serve merely as structural placeholders or titles and do not constitute complete legal provisions for evaluation.  

##### Example of Other:
- **Previous Provision:** "1. Objetivo y campo de aplicación"
- **Current Provision:** "2. Definiciones"
- **Next Provision:** "3. Especificaciones generales"

- **Reasoning:** The current provision ("2. Definiciones") contains only a numeral and a title, identical to how it appears in the index or table of contents, with no accompanying legal text or detailed content. Therefore, it must be marked as **INVALID** with the reason **Other**.

- 1- If the article is classified as VALID (isValid: true), then the field reason must be null. 

  2- If the article is classified as INVALID (isValid: false), then the field reason must always contain a specific value from the following options:
    "IsContinuation" → The provision is a direct continuation of a previous incomplete provision.
    "IsIncomplete" → The provision is abruptly cut off or clearly unfinished, lacking a concluding idea.

    ## **Valid Legal Provision**

1. **Numerals or Subnumerals (Numerales o Subnumerales)**:
- If the current numeral or subnumeral ends with a clear, logical idea, whether short or long, it should be considered valid. A clear idea is one that presents a complete rule, principle, or directive, even if brief.
- Must establish legal norms such as obligations, rights, prohibitions, or principles.
- Should have a clear legal structure.
- It must contain a specific legal rule or directive rather than just referencing other articles.
- If the previous numeral or subnumeral is valid, the current article should be evaluated independently and should not be marked as \`IsContinuation\` even if the structure suggests continuity.

#### Example 1:
- **Previous Provision:** "1.1 Introducción general al sistema normativo"
- **Current Provision:** "4.1.1 Toda instalación deberá cumplir con las disposiciones establecidas en esta Norma para efectos de inspección."
- **Next Provision:** "9.1.2 La revisión periódica deberá realizarse al menos una vez cada doce meses."

#### Example 2:
- **Previous Provision:** "4.3 Evaluación de riesgos"
- **Current Provision:** "3.3.1 El responsable técnico deberá realizar una evaluación documental y física de todos los componentes del sistema."
- **Next Provision:** "2.3.2 Los resultados deberán ser archivados y estar disponibles ante cualquier autoridad competente."

#### Example 3:
- **Previous Provision:** "93.2.5 Disposiciones de seguridad"
- **Current Provision:** "2.2.6 No se permitirá el uso de materiales inflamables en zonas de operación crítica."
- **Next Provision:** "1.3 Supervisión operativa y técnica"

2. **Appendices (Apéndices), and Sections (Secciones)**:
 - If the current provision is a structural marker (e.g., Section [Sección], Appendix (Apéndices), Annex [Anexo], or Transitory Provision [Transitorio]) and it presents a complete, logically coherent provision, it must always be classified as VALID.
 - If the previous provision is a structural marker (e.g., Section [Sección], Appendix (Apéndices), Annex [Anexo], or Transitory Provision [Transitorio]) and it presents a complete, logically coherent provision, the current provision  must always be classified as VALID.
 - Must be part of a structured legal framework.
#### Example 1:
- **Previous Provision:** "1.1 Introducción general al sistema normativo"
- **Current Provision:** "SECCIÓN II. DISPOSICIONES GENERALES"
- **Next Provision:** "4.1.1 Toda instalación deberá cumplir con las disposiciones establecidas en esta Norma para efectos de inspección."

#### Example 2:
- **Previous Provision:** "4.3 Evaluación de riesgos"
- **Current Provision:** "APÉNDICE B. FORMATOS Y CRITERIOS DE EXAMEN"
- **Next Provision:** "2.3.2 Los resultados deberán ser archivados y estar disponibles ante cualquier autoridad competente."

#### Example 3:
- **Previous Provision:** "SECCIÓN II. DISPOSICIONES GENERALES"
- **Current Provision:** "93.2.5 Disposiciones de seguridad"
- **Next Provision:** "1.3 Supervisión operativa y técnica"

#### Example 4:
- **Previous Provision:** "2.1.4 Reglas de operación específicas"
- **Current Provision:** "3.1.1 El reporte de cumplimiento debe entregarse al finalizar cada trimestre."
- **Next Provision:** "APÉNDICE A. FORMATOS Y CRITERIOS DE EVALUACIÓN"

3. **Annexes (Anexos)**:
 - If the current provision is a structural marker (e.g., Section [Sección], Appendix (Apéndices), Annex [Anexo], or Transitory Provision [Transitorio]) and it presents a complete, logically coherent provision, it must always be classified as VALID.
 - If the previous provision is a structural marker (e.g., Section [Sección], Appendix (Apéndices), Annex [Anexo], or Transitory Provision [Transitorio]) and it presents a complete, logically coherent provision, the current provision  must always be classified as VALID.
 - Must provide additional information that supports or complements the legal text.
 - **Example 1:**
   - **Previous Provision:** "ANEXO A. REGULACIÓN COMPLEMENTARIA"
   - **Current Provision:** "3.1.1 El reporte de cumplimiento debe entregarse al finalizar cada trimestre."
   - **Next Provision:**  "APÉNDICE A. FORMATOS Y CRITERIOS DE EVALUACIÓN"
   - **Example 2:**
   - **Previous Provision:** "4.1.1 Toda instalación deberá cumplir con las disposiciones establecidas en esta Norma para efectos de inspección."
   - **Current Provision:** "ANEXO A. REGULACIÓN COMPLEMENTARIA"
   - **Next Provision:** "SECCIÓN II. DISPOSICIONES GENERALES"

4. **Transitory Provisions (Disposiciones Transitorias)**:
 - If the current provision is a structural marker (e.g., Section [Sección], Appendix (Apéndices), Annex [Anexo], or Transitory Provision [Transitorio]) and it presents a complete, logically coherent provision, it must always be classified as VALID.
 - If the previous provision is a structural marker (e.g., Section [Sección], Appendix (Apéndices), Annex [Anexo], or Transitory Provision [Transitorio]) and it presents a complete, logically coherent provision, the current provision  must always be classified as VALID.
 - Must establish rules for the transition or application of the legal document.
 - **Example 1:**
   - **Previous Provision:** "TRANSITORIO PRIMERO. Disposiciones transitorias sobre la implementación de nuevas normativas."
   - **Current Provision:** "2.2.6 No se permitirá el uso de materiales inflamables en zonas de operación crítica."
   - **Next Provision:** "3.1.1 El reporte de cumplimiento debe entregarse al finalizar cada trimestre."
   - **Example 2:**
   - **Previous Provision:** "93.2.5 Disposiciones de seguridad"
   - **Current Provision:** "TRANSITORIO PRIMERO. Disposiciones transitorias sobre la implementación de nuevas normativas"
   - **Next Provision:** "SECCIÓN II. DISPOSICIONES GENERALES"


   ### **Invalid Legal Provisions:**
   Mark the provision as **INVALID** if it clearly meets one of the following conditions:
   
   #### **IsIncomplete:**
   - **Definition:** An article is considered **incomplete** if it is abruptly cut off or clearly unfinished, lacking a concluding idea. If an article ends without delivering a complete directive, rule, or idea, it is deemed incomplete.
   - **Note:** An article **is not considered incomplete** if it ends with a **clear, logical, and complete idea** even if it is short. A brief statement or directive that is logically conclusive and understandable is sufficient.
   ##### Example of IsIncomplete:
    - **Previous Provision:** "1.4.7 Requisitos mínimos de control y supervisión"
    - **Current Provision:** "1.4.8 Los responsables deberán coordinarse con las autoridades locales para la implementación de los procedimientos establecidos en la presente norma. Las acciones específicas que deberán considerarse incluyen la inspección técnica, monitoreo continuo, evaluación periódica y elaboración de…"
    - **Next Provision:** "Las instalaciones deberán contar con personal capacitado y debidamente acreditado para operar el sistema de control."

    - **Reasoning:** The current provision is **incomplete** because it ends abruptly and does not provide a complete directive or conclusion. Furthermore, it does not begin with a new valid numeral or subnumeral.
   
   #### **IsContinuation:**
   - **Definition:** If the **Previous Provision** has been marked as **invalid** with the reason **IsIncomplete**, then the **Current Provision** should **always** be considered **INVALID** and marked as **IsContinuation**, even if it seems to continue logically. This ensures that any unfinished provision is treated as a continuation of the previous one.
   - **Note:** The current article can only be marked as **IsContinuation** if the **Previous Provision** was already invalidated for **IsIncomplete**.
     
   - **Reasoning:** The **Previous Provision** was cut off or left unfinished, so the **Current Provision** should not be evaluated independently. It must be treated as a continuation of the incomplete thought in the **Previous Provision**.
   
  ##### Example of IsContinuation:
  - **Previous Provision:** "3.2.5 Las disposiciones de seguridad deberán implementarse conforme al protocolo establecido en el capítulo 4 de la Norma. Los responsables designados deberán garantizar la supervisión en todos los turnos, además de establecer mecanismos de reporte diario a través de…"
  - **Current Provision:** "los formatos establecidos por la autoridad competente, sin excepción alguna."
  - **Next Provision:** "3.2.7 Todos los registros deberán conservarse por un mínimo de cinco años."

  - **Reasoning:** The **Current Provision** is a direct continuation of the **Previous Provision**, which ended with an incomplete clause. Even though the current provision lacks un encabezado numeral, it completes the unfinished idea and must be classified as **IsContinuation**.    

     - **Example 2:**
  - **Previous Provision:** "4.2.8 Los equipos deberán ser calibrados conforme a los lineamientos establecidos en la Norma Oficial Mexicana, incluyendo aquellos especificados por la autoridad competente en materia de…"
  - **Current Provision:** "medición ambiental, en particular para partículas suspendidas y emisiones de gases contaminantes."
  - **Next Provision:** "4.2.9 Las mediciones deberán registrarse en bitácoras oficiales y estar disponibles para consulta durante un periodo mínimo de cinco años."

  - **Reasoning:** The **Current Provision** is a direct continuation of the **Previous Provision**, which ended with an incomplete clause. Even though the current provision lacks un encabezado numeral, it completes the unfinished idea and must be classified as **IsContinuation**.    
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

  **Numerals Output (Formatted in HTML):**  
   **title:** Introducción, 1    // Titles should not have HTML tags.
   **article:** <p>Esta <i>Norma Oficial Mexicana</i> establece los requisitos mínimos de construcción que se deben cumplir  durante la perforación de pozos para la extracción de aguas nacionales y trabajos asociados,</p>  
   <p>con objeto de evitar la contaminación de los acuíferos.</p>
   **order:** 1

  4. Sections, and Annexes:
   - Ensure headings are concise and formatted with appropriate text structure.
   - Titles should be short and precise, containing only the grouping heading without including articles or detailed content.
   - If any articles are included, remove them from the appendix, section, or annex.
   - Please do not create or write random definitions within the Sections and Annexes. Just make sure you are working with the information that is being shared with you. 

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

6. **Appendices**:
   - Format appendices clearly, preserving their informative nature.
   - Use <table> tags to structure any included technical data or references.

   #### Example (in Spanish):
    **title:** APÉNDICE  
    **article:**  
      PRIMERO. El presente Apéndice proporciona información técnica adicional de carácter orientativo.  
      SEGUNDO. Su contenido no es obligatorio, pero puede ser utilizado como referencia para una mejor comprensión de la Norma.  
    **order:** 300

  **Output (Formatted in HTML):**
    **title:** APÉNDICE   // Titles should not have HTML tags.
    **article:**  
     <p><b>PRIMERO.</b> El presente Apéndice proporciona información técnica adicional de carácter orientativo.</p>  
     <p><b>SEGUNDO.</b> Su contenido no es obligatorio, pero puede ser utilizado como referencia para una mejor comprensión de la Norma.</p>  
    **order:** 300

7. **Others (if applicable)**:
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
