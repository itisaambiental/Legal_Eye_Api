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
    try {
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
          console.error('❌ Error corrigiendo artículo:', article.title)
          console.error(error)
          continue
        }
        currentProgress += 1
        this.updateProgress(currentProgress, totalArticles)
      }
      return correctedArticles
    } catch (error) {
      console.error('🔥 Error global en extractArticles:', error)
      throw new ErrorUtils(500, 'Error inesperado durante la extracción de artículos', error)
    }
  }

  /**
   * @param {string} text - The text to clean.
   * @returns {string} - The cleaned text.
   */
  _cleanText (text) {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\t+/g, '')
      .replace(/[ ]{2,}/g, ' ')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{2,}/g, '\n')
      .trim()
  }

  /**
 * @param {string} text - Text to process and extract articles from.
 * @returns {Promise<Array<Article>>} - List of article objects.co
 */
  async _extractArticles (text) {
    const lines = this._cleanText(text).split('\n')
    const articles = []
    const keywordRegex = /^(ÍNDICE|CONTENIDO|CONSIDERANDO|PREFACIO|TRANSITORIOS?|ANEXO(?:\s+[IVXLCDM]+)?|APÉNDICE(?:\s+[A-Z])?)$/i
    const numeralRegex = /^\d+(?:\.\d+)*\s+/
    let currentTitle = ''
    let currentContent = []
    let foundFirstNumeral = false
    let order = 1

    const pushArticle = () => {
      if (currentTitle && currentContent.length > 0) {
        articles.push({
          title: currentTitle,
          article: currentContent.join('\n').trim(),
          plainArticle: '',
          order: order++
        })
      }
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const isKeyword = keywordRegex.test(line)
      const isNumeral = numeralRegex.test(line)

      if (isKeyword) {
        pushArticle()
        currentTitle = line
        currentContent = []
        foundFirstNumeral = false
      } else if (isNumeral) {
        if (!foundFirstNumeral && currentTitle && /^(ÍNDICE|CONTENIDO)$/i.test(currentTitle)) {
          currentContent.push(line)
        } else {
          pushArticle()
          currentTitle = line
          currentContent = []
          foundFirstNumeral = true
        }
      } else {
        currentContent.push(line)
      }
    }
    pushArticle()
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
  _createArticleToVerify (title, previousLastResult, previousContent, currentContent, nextContent, order) {
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
    console.log('🧪 Enviando artículo a verificación:', article.title)
    console.log('Contenido:', article.currentArticle.slice(0, 300))
    const prompt = this._buildVerifyPrompt(this.name, article)
    const request = {
      model: this.model,
      messages: [
        {
          role: 'system',
          content: 'You are a legal expert who is specialized in confirming the validity of the legal provisions extracted from legal documents. Note: Although your instructions are in English, the provisions provided will be in Spanish.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0,
      response_format: zodResponseFormat(ArticleVerificationSchema, 'article_verification')
    }

    const attemptRequest = async (retryCount = 0) => {
      try {
        const response = await openai.chat.completions.create(request)
        return ArticleVerificationSchema.parse(JSON.parse(response.choices[0].message.content))
      } catch (error) {
        if (error.status === 429 && retryCount < 3) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000))
          return attemptRequest(retryCount + 1)
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
