import ArticleExtractor from './ArticleExtractor.js'
import openai from '../../../config/openapi.config.js'
import {
  articleVerificationSchema,
  singleArticleModelSchema,
  sectionsResponseSchema
} from '../../../schemas/article.schema.js'
import { zodResponseFormat } from 'openai/helpers/zod'
import { convert } from 'html-to-text'
import ErrorUtils from '../../../utils/Error.js'

/**
 * Class extending ArticleExtractor to extract articles from (NOMs).
 * It processes the technical text of the standard, cleans formatting inconsistencies,
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
      this.updateProgress(i + 1, totalArticles, 50, 100)
    }

    return correctedArticles
  }

  /**
   * @param {string} text - The text to clean.
   * @returns {string} - The cleaned text.
   */
  _cleanText (text) {
    const ellipsisTextRegex = /[^.]+\s*\.{3,}\s*/g
    const singleEllipsisRegex = /\s*\.{3,}\s*/g

    return text.replace(ellipsisTextRegex, '').replace(singleEllipsisRegex, '')
  }

  /**
   * @param {string} text - Full document text to process and extract sections from.
   * @returns {Promise<Array<Article>>} - Ordered array of validated article objects.
   */
  async _extractArticles (text) {
    try {
      const documentText = this._cleanText(text)
      const { sections, isValid } = await this._extractSections(documentText)
      if (!isValid) {
        throw new ErrorUtils(500, 'Article Processing Error')
      }

      const headingRegex = this._buildHeadingRegex(sections)
      const matches = Array.from(documentText.matchAll(headingRegex), (m) => ({
        header: m[0],
        start: m.index
      }))
      matches.push({ start: documentText.length })

      const rawArticles = []
      const lastResult = { isValid: true, reason: null }
      let order = 1

      for (let i = 0; i < matches.length - 1; i++) {
        const { header, start } = matches[i]
        const end = matches[i + 1].start
        const content = documentText.slice(start + header.length, end).trim()

        const prevStart = i > 0 ? matches[i - 1].start : 0
        const prevEnd = start
        const previousTitle = i > 0 ? matches[i - 1].header : ''
        const previousContent = documentText
          .slice(prevStart + previousTitle.length, prevEnd)
          .trim()

        const nextTitle =
          i + 1 < matches.length - 1 ? matches[i + 1].header : ''
        const nextContent =
          i + 2 < matches.length
            ? documentText
              .slice(
                matches[i + 1].start + nextTitle.length,
                matches[i + 2].start
              )
              .trim()
            : documentText
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
   * Build a regular expression to match any of the given section headings.
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
  /**
 * Extracts all standalone section headings from a Mexican Official Standard (NOM) document.
 *
 * @param {string} text - The full text of the NOM document in Spanish.
 * @returns {Promise<{ sections: string[], isValid: boolean }>}
 *   An object containing:
 *   - sections: an array of extracted headings (numbered or unnumbered), in original order.
 *   - isValid: true if the text looks like a valid NOM with separable sections; false otherwise.
 */
  async _extractSections (text) {
    const prompt = this._buildSectionsPrompt(text)
    const request = {
      model: this.model,
      messages: [
        {
          role: 'system',
          content: [
            'You are an expert at parsing (NOMs).',
            'Given a Spanish document, extract every standalone heading—numbered or unnumbered—and preserve order.',
            'Ignore headers, footers, page numbers, and any notes.'
          ].join(' ')
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0,
      response_format: zodResponseFormat(sectionsResponseSchema, 'sections')
    }
    const attemptRequest = async (retryCount = 0) => {
      try {
        const response = await openai.chat.completions.create(request)
        const content = sectionsResponseSchema.parse(
          JSON.parse(response.choices[0].message.content)
        )
        return content
      } catch (error) {
        if (error.status === 429 && retryCount < 3) {
          const backoffTime = Math.pow(2, retryCount) * 1000
          await new Promise((resolve) => setTimeout(resolve, backoffTime))
          return attemptRequest(retryCount + 1)
        }
        throw new ErrorUtils(500, 'Article Processing Error', error)
      }
    }

    return attemptRequest()
  }

  /**
   * Builds the user‑facing prompt for extracting **only** top‑level and unnumbered section headings.
   *
   * @param {string} text - The full text of the document.
   * @returns {string} The formatted prompt.
   */
  _buildSectionsPrompt (text) {
    return `
Extract only top‑level and unnumbered standalone section headings from a document, based strictly on the content itself (not just any index or table of contents):

- Top-level numerals: "1. OBJETIVO", "2. REFERENCIAS", ..., "10. OBSERVANCIA DE ESTA NORMA"
- Generic section blocks such as:
  - "CONSIDERANDO", "PREFACIO", "INTRODUCCIÓN"
  - "ÍNDICE", "CONTENIDO"
  - "TRANSITORIOS", "DISPOSICIONES TRANSITORIAS"
  - "ANEXO 1", "ANEXO II", "ANEXO NORMATIVO"
  - "APÉNDICE", "APÉNDICE A", "APÉNDICE NORMATIVO"
  - "SECCIÓN 1", "SECCIÓN PRIMERA"
  - Other structural headers such as "LIBRO PRIMERO", "PARTE GENERAL", etc.

Do NOT extract any sub‑numbered headings (e.g. "6.1", "6.1.1")—they belong under their parent.
Preserve original accents, punctuation, and order.
Ignore page numbers, headers, footers, links, or any notes.
Do NOT rely solely on an index or table of contents; identify headings as they appear in the document body.
Treat any document as valid if it contains at least one top‑level heading or numeral that can be divided and extracted individually.

Return JSON matching this schema:

\`\`\`json
{
  "sections": [ /* array of heading strings */ ],
  "isValid": /* true if the document contains at least one extractable top‑level heading */
}
\`\`\`

Example sections array:

\`\`\`
[
  "CONSIDERANDO",
  "PREFACIO",
  "ÍNDICE",
  "CONTENIDO",
  "1. OBJETIVO Y CAMPO DE APLICACIÓN",
  "2. REFERENCIAS NORMATIVAS",
  "3. TÉRMINOS Y DEFINICIONES",
  "4. ESPECIFICACIONES",
  "5. MÉTODOS DE PRUEBA",
  "6. ACCIONES ESTRATÉGICAS E INSTRUMENTOS DE EJECUCIÓN",
  "7. PROCEDIMIENTO PARA LA EVALUACIÓN DE LA CONFORMIDAD",
  "8. CONCORDANCIA CON NORMAS INTERNACIONALES",
  "9. BIBLIOGRAFÍA",
  "10. OBSERVANCIA DE ESTA NORMA",
  "SECCIÓN 1",
  "ANEXO 1",
  "ANEXO 2",
  "ANEXO 3",
  "TRANSITORIOS",
  "APÉNDICE",
  "APÉNDICE NORMATIVO: PUERTOS DE MUESTREO"
]
\`\`\`

Document text:
"""
${text}
"""
`
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
    const totalArticles = rawArticles.length
    let lastResult = { isValid: true, reason: null }
    let lastArticle = null
    let isConcatenating = false

    for (let i = 0; i < totalArticles; i++) {
      const currentArticleData = rawArticles[i]

      try {
        const { isValid, reason } = await this._verifyArticle(
          currentArticleData
        )

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
        } else if (reason === 'IsIncomplete') {
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
          if (
            lastResult.reason === 'IsIncomplete' ||
            (isConcatenating && lastResult.reason === 'IsContinuation')
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

      this.updateProgress(i + 1, totalArticles, 0, 50)
    }

    if (lastArticle) {
      validated.push(lastArticle)
    }

    return validated
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
        articleVerificationSchema,
        'article_verification'
      )
    }
    const attemptRequest = async (retryCount = 0) => {
      try {
        const response = await openai.chat.completions.create(request)
        const content = articleVerificationSchema.parse(
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
- If Numerals article has no substantive body beyond the title (i.e. sólo aparece “7”) , skip it altogether.
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
      - If the extracted content repeats the title from the start, remove that duplicate so that it only appears once.
   - **Labels and list markers** (e.g. “3.27. Muestra compuesta:”, “Opción 1:”, “PRIMERO.”, “A 1 Clasificación…”, “a)”)  
     must appear in **bold** in the final HTML/text.
   - For cases of **TRANSITORIOS**:
     * always leaves **title** as **"TRANSITORIOS"** (without ordinal),
     * and handle sequential labels (“PRIMERO.”, “SEGUNDO.”, etc.) as part of the **content**.
   - For cases of **TRANSITORIO**:
     *"TRANSITORIO"** (and if it has an ordinal number, add it),
     * and handle sequential tags (“PRIMERO.”, “SEGUNDO.”, etc.) as part of the **title**.
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
- **TRANSITORIOS**, **TRANSITORIO PRIMERO**, **TRANSITORIO SEGUNDO**, **ANEXO C**
- **14. Vigencia**, **SECCIÓN FINAL**, **ANEXO D**

**Output (Unformatted HTML):**  
- 0. Introducción, 1. Objeto y Ámbito de validez, 2. Campo de aplicación  
- 3. Referencias normativas, 4. Definiciones, SECCIÓN I, 5. Clasificación  
- 6. Requisitos técnicos, 7. Métodos de prueba, SECCIÓN II  
- 8. Inspección, 9. Muestreo, 10. Marcado, etiquetado y embalaje  
- ANEXO A, ANEXO B, 11. Almacenamiento  
- 12. Bibliografía, 13. Concordancia con normas internacionales  
- TRANSITORIOS,TRANSITORIO PRIMERO, TRANSITORIO SEGUNDO, ANEXO C  
- 14. Vigencia, SECCIÓN FINAL, ANEXO D


3. **Numerals**:
   - Review and correct long paragraphs, ensuring each explains a specific concept or legal provision.
   - If a paragraph belongs to a fourth level numeral (e.g. 1.1.1.1),  
     ensure the **full numeral** is prepended to each line.  
     Do not drop or repeat only the parent (1.1.1); instead use 1.1.1.1, 1.1.1.2, etc.
   - Divide content into sections or subsections for clarity, using appropriate HTML tags:
     - <h2>, <h3> for headings
     - <p> for paragraphs
     - <ul> and <li> for lists
   - **Automatic subitem numbering at any depth**:  
     When a block of text follows a heading numeral of *any* depth (e.g. X.Y, X.Y.Z, X.Y.Z.W.V, etc.),  
     prepend each line in that block with the **full parent numeral** plus a new sequential index (.1, .2, …).  
     Do not omit or truncate levels.  
   - Use <b> for emphasis, <i> for additional context, and <span> for inline styles where necessary.
   - Complete truncated words or sentences without altering their meaning.

  #### Generic Example
      **Input (unstyled subitems under a 3 level numeral):**

      2.5.3 Procedimiento
          Paso uno: preparar la muestra.
          Paso dos: medir el pH.

  
      **Expected output (with automatic “.1”, “.2”):**

      2.5.3 Procedimiento
        2.5.3.1 Paso uno: preparar la muestra.
        2.5.3.2 Paso dos: medir el pH.

  
      #### Deep level Example (6 niveles)
      **Input:**

      1.2.3.4.5.6 Especificaciones avanzadas
          Detalle A de la primera característica.
          Detalle B de la primera característica.

  
      **Expected output:**

      1.2.3.4.5.6 Especificaciones avanzadas
        1.2.3.4.5.6.1 Detalle A de la primera característica.
        1.2.3.4.5.6.2 Detalle B de la primera característica.

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

  7- **Tables**:
     - Whenever you encounter a <table> anywhere in the document—whether under a numeral, in the main content, in an annex, or in any other section—**always** include its title immediately **before** the <table> tag.
     - If the title consists of multiple lines (e.g. “TABLA X” on one line y subtítulo en la siguiente), preserve todas las líneas en el mismo orden.
 
   #### Example 1 (in a numeral):
   3.5 Características del muestreo
   TABLA 2
   Valores permisibles de pH y sólidos totales
   <table>…</table>
 
   #### Example 2 (en un ANEXO, pero la regla aplica igual si aparece en medio de un párrafo):
   ANEXO B: Especificaciones adicionales
   TABLA 5
   Límites de oxígeno disuelto en efluentes
   <table>…</table>
   Texto siguiente…

8. **Others (if applicable)**:
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
