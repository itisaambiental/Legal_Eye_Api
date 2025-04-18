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
    const titleKeywordRegex = /\b[Tt]\s*[ÍIíi]\s*[Tt]\s*[Uu]\s*[Ll]\s*[Oo]\s*(\d+[A-Z]*|[IVXLCDM]+)\b/gi
    const sectionKeywordRegex = /\b[Ss]\s*[Ee]\s*[Cc]\s*[Cc]\s*[ÍIíi]\s*[ÓOóo]\s*[Nn]\s*(\d+[A-Z]*|[IVXLCDM]+)\b/gi
    const transientKeywordRegex = /\b(?:\w+\s+)*[Tt][Rr][Aa][Nn][Ss][Ii][Tt][Oo][Rr][Ii][AaOo](?:\s*[SsAa])?\s*(\d+[A-Z]*|[IVXLCDM]+)?\b/gi
    const annexKeywordRegex = /\b[Aa]\s*[Nn]\s*[Ee]\s*[Xx]\s*[Oo]\s*(\d+[A-Z]*|[IVXLCDM]+)?\b/gi

    const appendixKeywordRegex = /\b[Aa]\s*[Pp]\s*[EeÉé]\s*[Nn]\s*[Dd]\s*[IiÍí]\s*[Cc]\s*[Ee]\s*(\d+[A-Z]*|[IVXLCDM]+)?\b/gi
    const contentKeywordRegex = /\b[Cc]\s*[OoÓó]\s*[Nn]\s*[Tt]\s*[Ee]\s*[Nn]\s*[IiÍí]\s*[Dd]\s*[Oo]\s*(\d+[A-Z]*|[IVXLCDM]+)?\b/gi
    const indexKeywordRegex = /\b[ÍIíi]\s*[Nn]\s*[Dd]\s*[IiÍí]\s*[Cc]\s*[Ee]\s*(\d+[A-Z]*|[IVXLCDM]+)?\b/gi

    const ellipsisTextRegex = /[^.]+\s*\.{3,}\s*/g
    const singleEllipsisRegex = /\s*\.{3,}\s*/g

    return text
      .replace(titleKeywordRegex, 'TÍTULO $1')
      .replace(sectionKeywordRegex, 'SECCIÓN $1')
      .replace(transientKeywordRegex, 'TRANSITORIO $1')
      .replace(annexKeywordRegex, 'ANEXO $1')
      .replace(appendixKeywordRegex, 'APÉNDICE $1')
      .replace(contentKeywordRegex, 'CONTENIDO $1')
      .replace(indexKeywordRegex, 'ÍNDICE $1')
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
      '(?:c[áa]p[ií]tulo)\\s+[^\n]+|' +
      '(?:t[ií]tulo)\\s+[^\n]+|' +
      '(?:secci[oó]n)\\s+[^\n]+|' +
      '(?:ap[eé]ndice)\\s+[^\n]+|' +
      '(?:transitori[oa][s]?)\\s+[^\n]+|' +
      '(?:anexo)\\s+[^\n]+|' +
      '(?:considerando)\\s+[^\n]+|' +
      '(?:contenido)\\s+[^\n]+|' +
      '(?:[ÍIíi]ndice)\\s+[^\n]+|' +
      '(?:\\d+(?:\\.\\d+)*\\.?\\s*[^\n]+)' +
    ')'

    const articlePattern = new RegExp(articlePatternString, 'im')

    const regexes = [
      /^(?:c[áa]p[ií]tulo)\s+[^\n]+$/im,
      /^(?:t[ií]tulo)\s+[^\n]+$/im,
      /^(?:secci[oó]n)\s+[^\n]+$/im,
      /^(?:ap[eé]ndice)\s+[^\n]+$/im,
      /^(?:transitori[oa][s]?)\s+[^\n]+$/im,
      /^(?:anexo)\s+[^\n]+$/im,
      /^(?:considerando)\s+[^\n]+$/im,
      /^(?:contenido)\s+[^\n]+$/im,
      /^(?:[ÍIíi]ndice)\s+[^\n]+$/im,
      /^\d+(?:\.\d+)*\.?\s*[^\n]+$/m
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

      if (regexes.some((rx) => rx.test(currentTitle))) {
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
You are a regulatory expert in chemical safety and compliance. Your task is to validate provisions extracted from Mexican Official Standards (Normas Oficiales Mexicanas - NOMs) in the chemical field.

### Evaluation Context:
- **NOM Standard:** "${legalName}"
- **Previous Section:** "${article.previousArticle.content}"
  (Validation: { "isValid": ${article.previousArticle.lastResult.isValid}, "reason": ${article.previousArticle.lastResult.reason === null ? 'null' : `"${article.previousArticle.lastResult.reason}"`} })
- **Current Section (To be evaluated):** "${article.currentArticle}"
- **Next Section:** "${article.nextArticle}"

### **Important Note on Text Evaluation**
- **Headers and Footnotes:** Please disregard any **headers** or **footnotes** (e.g., page numbers, publication dates, and references to external sources) present in the article or legal text. These elements are part of the document layout but **are not** considered part of the legal provision itself.
- **Content of the Provision:** Focus solely on the **legal content** itself, i.e. the specific rule, directive, or principle outlined in the body of the article or provision.
- **Order of Provisions:** If the **Previous**, **Current**, and **Next** follow a coherent logical sequence, they **must** be classified as **VALID**.
- **Classification Rules:**
  1. If the article is classified as **VALID** (\`isValid: true\`), then the field \`reason\` **must** be \`null\`.  
  2. If the article is classified as **INVALID** (\`isValid: false\`), then the field \`reason\` **must** be one of:
     - \`"IsContinuation"\` → The provision continues an earlier incomplete section.
     - \`"IsIncomplete"\`   → The provision is abruptly cut off or clearly unfinished, lacking a concluding idea.

## Normative Categories for "Normas" (Validación)

1. **Index (INDICE)**
   - Titles starting with **"INDICE"** denote the table of contents, listing all main headings until the next marker.
   - **Always** classified **VALID**.
   - **Example – Valid Index**  
     - **Title:** \`INDICE\`  
     - **Content:**
       \`\`\`text
       1. OBJETIVO Y CAMPO DE APLICACION
       2. REFERENCIAS NORMATIVAS
       3. TERMINOS Y DEFINICIONES
       …
       10. OBSERVANCIA DE ESTA NORMA
       TRANSITORIOS
       APENDICE NORMATIVO: PUERTOS DE MUESTREO
       \`\`\`
     → \`{ "isValid": true, "reason": null }\`

2. **Content (CONTENIDO)**
   - Titles starting with **"CONTENIDO"** introduce a summary of sections.
   - **Always** classified **VALID**.
   - **Example: Valid Content**  
     - **Title:** \`CONTENIDO\` 
     - **Content:**
       \`\`\`text
       0. Introducción
       1. Objetivo y campo de aplicación
       2. Referencias
       3. Definiciones
       4. Especificaciones
       5. Muestreo y métodos de prueba
       6. Evaluación de la conformidad
       7. Grado de concordancia con normas y lineamientos internacionales
       8. Bibliografía
       9. Observancia de esta Norma
       Anexos
       I Opciones para la reducción de atracción de vectores
       II Método de muestreo de lodos y biosólidos
       III Método para la cuantificación de coliformes fecales en lodos y biosólidos
       IV Método para la cuantificación de Salmonella spp., en lodos y biosólidos
       V Método para la cuantificación de huevos de helmintos en lodos y biosólidos
       VI Método para la cuantificación de metales pesados en biosólidos
       VII Contenido de la bitácora de control de lodos y biosólidos
       \`\`\`
      \`{ "isValid": true, "reason": null }\`
   - **Example: Incomplete Content**  
     - **Title:** \`CONTENIDO. Se presenta la relación de secciones…\`  
     - **Content:** Abruptly cut off mid‑list  
     → \`{ "isValid": false, "reason": "IsIncomplete" }\`

3. **Preface (PREFACIO)**
   - A narrative introduction by the issuing authority.
   - Must end with a complete, coherent statement.
   - **Example: Valid Preface**  
     - **Title:** \`PREFACIO\`  
     - **Content:**
       \`\`\`text
       En la elaboracion de la presente Norma Oficial Mexicana participaron:
       1. Comision Nacional del Agua (CONAGUA)
       2. Comision Federal para la Proteccion contra Riesgos Sanitarios (COFEPRIS)
       …
       6. Secretaria de Medio Ambiente y Recursos Naturales (SEMARNAT)
       \`\`\`
     → \`{ "isValid": true, "reason": null }\`
   - **Example: Incomplete Preface**  
     - **Title:** \`PREFACIO. Esta Norma tiene por objeto…\`  
     - **Content:** Cut off before naming participants  
     → \`{ "isValid": false, "reason": "IsIncomplete" }\`

4. **Introduction (INTRODUCCION)**
   - Presents context, justification and scope.
   - **Example: Valid Introduction**  
     - **Title:** \`0. Introduccion\`  
     - **Content:**
       \`\`\`text
       La necesidad de obtener agua en cantidades economicamente explotables ha originado la perforacion de…
       Con el objeto de minimizar este riesgo y establecer los requisitos minimos, se expide la presente Norma.
       \`\`\`
     → \`{ "isValid": true, "reason": null }\`
   - **Example: Incomplete Introduction**  
     - **Title:** \`INTRODUCCION. Ante la creciente demanda…\`  
     - **Content:** Stops mid-justification  
     → \`{ "isValid": false, "reason": "IsIncomplete" }\`

5. **Transitory Provisions (TRANSITORIOS)**
   - Marked with **TRANSITORIOS** or numbered **PRIMERO**, **SEGUNDO**, etc.
   - Regulate entry into force and deadlines.
   - **Example: Valid Transitory**  
     - **Title:** \`TRANSITORIOS\`  
     - **Content:**
       \`\`\`text
       PRIMERO. Entrara en vigor a los 365 dias de su publicacion.
       SEGUNDO. Los parametros de tablas 1 y 2 entraran en vigor el 3 de abril de 2023.
       TERCERO. Toxicidad aguda entrara en vigor al cuarto ano.
       …
       SEPTIMO. Deroga la NOM-001-SEMARNAT-1996.
       \`\`\`
     → \`{ "isValid": true, "reason": null }\`
   - **Example: Incomplete Transitory**  
     - **Title:** \`TRANSITORIO PRIMERO. Entrara en vigor…\`  
     - **Content:** Missing date and rest  
     → \`{ "isValid": false, "reason": "IsIncomplete" }\`

6. **Annex / Appendix (ANEXO / APENDICE)**
   - Titles **ANEXO A. …** or **APENDICE NORMATIVO: …**, containing supplementary tables or methods.
   - **Example: Valid Annex**  
     - **Title:** \`APENDICE NORMATIVO: PUERTOS DE MUESTREO\`  
     - **Content:** Detailed sampling port instructions  
     → \`{ "isValid": true, "reason": null }\`
   - **Example: Valid Annex**  
     - **Title:** \`ANEXO I OPCIONES PARA LA REDUCCION DE ATRACCION DE VECTORES\`  
     - **Content:** List of 9 control options  
     → \`{ "isValid": true, "reason": null }\`

7. **Numeral Sections (Numerales)**
   - Titles beginning with a numeral (e.g. \`1.\`, \`1.1\`, \`4.1.10\`, \`11.1\`).
   - Define clauses like Objetivo, Definiciones, Especificaciones.
   - **Example: Valid Numeral**  
     - **Title:** \`1. Objetivo y campo de aplicacion\`  
     - **Content:**
       \`\`\`text
       Esta Norma Oficial Mexicana establece los limites maximos permisibles de contaminantes…
       \`\`\`
     → \`{ "isValid": true, "reason": null }\`
   - **Example: Incomplete Numeral**  
     - **Title:** \`2. Referencias normativas\`  
     - **Content:**
       \`\`\`text
       2.1. Norma Mexicana NMX-AA-003-1980, Aguas residuales-Muestreo (cancela a la NMX-AA-003-1975).
       \`\`\`
     → \`{ "isValid": false, "reason": "IsIncomplete" }\`

---

### **Invalid Legal Provisions**

#### **IsIncomplete**
- A section is **incomplete** if it is cut off or clearly unfinished.
- **Example:**
  - **Prev:** \`"INDICE. 1. OBJETIVO… 6. MUESTRE"\`
  - **Curr:** \`"6. Muestreo"\`
  - → \`{ "isValid": false, "reason": "IsIncomplete" }\`

#### **IsContinuation**
- If the **Previous** was marked **IsIncomplete**, then the **Current** must be \`{ "isValid": false, "reason": "IsContinuation" }\`.
- **Example:**
  - **Prev:** \`"INDICE. …6. MUESTRE"\` (IsIncomplete)
  - **Curr:** \`"6. Muestreo"\`
  - → \`{ "isValid": false, "reason": "IsContinuation" }\`
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
