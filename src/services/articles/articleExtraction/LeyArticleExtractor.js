import ArticleExtractor from './ArticleExtractor.js'
import openai from '../../../config/openapi.config.js'
import { ArticleVerificationSchema, singleArticleModelSchema } from '../../../schemas/article.schema.js'
import { zodResponseFormat } from 'openai/helpers/zod'
import { convert } from 'html-to-text'
import ErrorUtils from '../../../utils/Error.js'

/**
 * Class extending ArticleExtractor to extract articles from laws texts.
 * Processes the text, cleans inconsistent formats, and extracts articles,
 * chapters, titles, sections, annexes, and transitory provisions in a structured manner.
 */
class LeyArticleExtractor extends ArticleExtractor {
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
- 1- If the article is classified as VALID (isValid: true), then the field reason must be null. 

  2- If the article is classified as INVALID (isValid: false), then the field reason must always contain a specific value from the following options:
    "IsContinuation" → The provision is a direct continuation of a previous incomplete provision.
    "IsIncomplete" → The provision is abruptly cut off or clearly unfinished, lacking a concluding idea.

    ## **Valid Legal Provision**

1. **Articles (Artículos)**:
 - If the current article ends with a clear, logical idea, whether short or long, it should be considered valid. A clear idea is one that presents a complete rule, principle, or directive, even if brief.
 - Must establish legal norms such as obligations, rights, prohibitions, or principles.
 - Should have a clear legal structure.
 - It must contain a specific legal rule or directive rather than just referencing other articles.
 - If the previous article is valid, the current article should be evaluated independently and should not be marked as IsContinuation even if the structure suggests continuity.
  - **Example 1:**
  - **Previous Provision:** "CAPÍTULO PRIMERO DE LA NATURALEZA, OBJETO Y DEFINICIONES"
  - **Current Provision:** "ARTÍCULO 5.La operación y funcionamiento del Consejo estará establecido en su Reglamento Interno."
  - **Next Provision:** "ARTÍCULO 6.La conformación de los Comités Especiales señalados en el artículo 22 de la Ley será determinada en el seno del Consejo."
  - **Example 2:**
  - **Previous Provision:** "ARTÍCULO 7.El Consejo para su mejor funcionamiento podrá constituir Consejos Forestales Regionales, para lo cual emitirá la convocatoria respectiva, en la que se establecerán las bases para la elección y número de representantes de cada sector, así como los integrantes del mismo."
  - **Current Provision:** "TÍTULO PRIMERO DISPOSICIONES GENERALES"
  - **Next Provision:** "ARTÍCULO 8.EI Consejo promoverá la constitución de Consejos Forestales Municipales, en aquellos municipios de vocación forestal, los cuales se formarán e integrarán de la misma manera que los Consejos Forestales Regionales 4 de 70 Aprobación 2008/04/15 Publicación 2008/05/21 Vigencia 2008/05/22 Expidió Poder Ejecutivo del Estado de Morelos Periódico Oficial 4613 "Tierra y Libertad" UIENES-LA-T Reglamento de la Ley de Desarrollo Forestal Sustentable del Estado de Morelos MORELOS Consejería Jurídica del Poder Ejecutivo del Estado de Morelos Última Reforma: Texto original Dirección General de Legislación 2018 2024 Subdirección de Jurismática"
  - **Example 3:**
  - **Previous Provision:** "ARTÍCULO 9. Los convenios de concertación que en materia forestal celebre el Estado con personas físicas y morales del sector social y privado, podrán versar sobre la instrumentación de programas forestales, el fomento a la educación, cultura, capacitación, servicios ambientales e investigación forestales, así como respecto de las labores de vigilancia y demás programas operativos establecidos en esta Ley."
  - **Current Provision:** "ARTÍCULO 10. Se preverá que en el seguimiento y evaluación de los resultados que se obtengan por la ejecución de los convenios a que se refiere este capítulo, intervenga el Consejo Forestal Estatal."
  - **Next Provision:** "SECCIÓN II. DISPOSICIONES GENERALES"

2. **Chapters (Capítulos), Titles (Títulos), and Sections (Secciones)**:
 - If the current provision is a structural marker (e.g., Chapter [Capítulo], Section [Sección], Title [Título], Annex [Anexo], or Transitory Provision [Transitorio]) and it presents a complete, logically coherent provision, it must always be classified as VALID.
 - If the previous provision is a structural marker (e.g., Chapter [Capítulo], Section [Sección], Title [Título], Annex [Anexo], or Transitory Provision [Transitorio]) and it presents a complete, logically coherent provision, the current provision  must always be classified as VALID.
 - Must be part of a structured legal framework.
 - **Example 1:**
   - **Previous Provision:** "CAPÍTULO I CONSEJO FORESTAL DEL ESTADO DE MORELOS"
   - **Current Provision:** "ARTÍCULO 4. Para la elección de los representantes de los sectores que conforme a la Ley deben formar parte del Consejo, la Comisión publicará en dos diarios de mayor circulación en el Estado, la convocatoria que establezca las bases sobre las cuales cada sector habrá de elegir sus representantes."
   - **Next Provision:** "ARTÍCULO 5. Las normas administrativas se aplican a todas las entidades y organismos públicos, garantizando la coherencia en su funcionamiento."
   - **Example 2:**
   - **Previous Provision:** "SECCIÓN II. DISPOSICIONES GENERALES"
   - **Current Provision:** "ARTÍCULO 1. Las disposiciones generales se rigen por los principios de transparencia y eficiencia en la administración pública."
   - **Next Provision:** "ARTÍCULO 3.Para los efectos del presente Reglamento, se consideran las definiciones contenidas en la Ley General de Desarrollo Forestal Sustentable y la Ley de Desarrollo Forestal Sustentable del Estado de Morelos."
   - **Example 3:**
   - **Previous Provision:** "TÍTULO: NORMAS ADMINISTRATIVAS"
   - **Current Provision:** "ARTÍCULO 5. Las normas administrativas se aplican a todas las entidades y organismos públicos, garantizando la coherencia en su funcionamiento."
   - **Next Provision:** "ARTÍCULO 6.La conformación de los Comités Especiales señalados en el artículo 22 de la Ley será determinada en el seno del Consejo."
   - **Example 4:**
   - **Previous Provision:** "TÍTULO PRIMERO DISPOSICIONES GENERALES"
   - **Current Provision:** "CAPÍTULO PRIMERO DE LA NATURALEZA, OBJETO Y DEFINICIONES"
   - **Next Provision:** "SECCIÓN II. DISPOSICIONES GENERALES"
  - **Example 5:**
   - **Previous Provision:** "TÍTULO PRIMERO DISPOSICIONES GENERALES"
   - **Current Provision:** "SECCIÓN II. DISPOSICIONES GENERALES"
   - **Next Provision:** "CAPÍTULO PRIMERO DE LA NATURALEZA, OBJETO Y DEFINICIONES"
  - **Example 6:**
   - **Previous Provision:** "CAPÍTULO PRIMERO DE LA NATURALEZA, OBJETO Y DEFINICIONES"
   - **Current Provision:** "TÍTULO PRIMERO DISPOSICIONES GENERALES"
   - **Next Provision:** "ARTÍCULO 5.La operación y funcionamiento del Consejo estará establecido en su Reglamento Interno."
  - **Example 7:**
   - **Previous Provision:** "ARTÍCULO 3.Para los efectos del presente Reglamento, se consideran las definiciones contenidas en la Ley General de Desarrollo Forestal Sustentable y la Ley de Desarrollo Forestal Sustentable del Estado de Morelos."
   - **Current Provision:** "TÍTULO PRIMERO DISPOSICIONES GENERALES"
   - **Next Provision:** "CAPÍTULO I CONSEJO FORESTAL DEL ESTADO DE MORELOS"
   - **Example 8:**
   - **Previous Provision:** "TÍTULO SEGUNDO ORGANIZACIÓN Y ADMINISTRACIÓN DEL SECTOR PÚBLICO FORESTAL"
   - **Current Provision:** "CAPÍTULO I CONSEJO FORESTAL DEL ESTADO DE MORELOS"
   - **Next Provision:** "SECCIÓN II. DISPOSICIONES GENERALES"
 - **Example 9:**
   - **Previous Provision:** "CAPÍTULO I CONSEJO FORESTAL DEL ESTADO DE MORELOS"
   - **Current Provision:** "SECCIÓN II. DISPOSICIONES GENERALES"
   - **Next Provision:** "ARTÍCULO 6.La conformación de los Comités Especiales señalados en el artículo 22 de la Ley será determinada en el seno del Consejo."
 - **Example 10:**
   - **Previous Provision:** "ARTÍCULO 5.La operación y funcionamiento del Consejo estará establecido en su Reglamento Interno."
   - **Current Provision:** "CAPÍTULO I CONSEJO FORESTAL DEL ESTADO DE MORELOS"
   - **Next Provision:** "TÍTULO SEGUNDO ORGANIZACIÓN Y ADMINISTRACIÓN DEL SECTOR PÚBLICO FORESTAL"

3. **Annexes (Anexos)**:
 - If the current provision is a structural marker (e.g., Chapter [Capítulo], Section [Sección], Title [Título], Annex [Anexo], or Transitory Provision [Transitorio]) and it presents a complete, logically coherent provision, it must always be classified as VALID.
 - If the previous provision is a structural marker (e.g., Chapter [Capítulo], Section [Sección], Title [Título], Annex [Anexo], or Transitory Provision [Transitorio]) and it presents a complete, logically coherent provision, the current provision  must always be classified as VALID.
 - Must provide additional information that supports or complements the legal text.
 - **Example 1:**
   - **Previous Provision:** "ANEXO A. REGULACIÓN COMPLEMENTARIA"
   - **Current Provision:** "ARTÍCULO 3. Este anexo establece las regulaciones complementarias para la implementación de las políticas públicas definidas en el cuerpo principal de la ley."
   - **Next Provision:** "TÍTULO SEGUNDO ORGANIZACIÓN Y ADMINISTRACIÓN DEL SECTOR PÚBLICO FORESTAL"
   - **Example 2:**
   - **Previous Provision:** "ARTÍCULO 3. Este anexo establece las regulaciones complementarias para la implementación de las políticas públicas definidas en el cuerpo principal de la ley."
   - **Current Provision:** "ANEXO A. REGULACIÓN COMPLEMENTARIA"
   - **Next Provision:** "CAPÍTULO I CONSEJO FORESTAL DEL ESTADO DE MORELOS"

4. **Transitory Provisions (Disposiciones Transitorias)**:
 - If the current provision is a structural marker (e.g., Chapter [Capítulo], Section [Sección], Title [Título], Annex [Anexo], or Transitory Provision [Transitorio]) and it presents a complete, logically coherent provision, it must always be classified as VALID.
 - If the previous provision is a structural marker (e.g., Chapter [Capítulo], Section [Sección], Title [Título], Annex [Anexo], or Transitory Provision [Transitorio]) and it presents a complete, logically coherent provision, the current provision  must always be classified as VALID.
 - Must establish rules for the transition or application of the legal document.
 - **Example 1:**
   - **Previous Provision:** "TRANSITORIO PRIMERO. Disposiciones transitorias sobre la implementación de nuevas normativas."
   - **Current Provision:** "ARTÍCULO 2. Durante el periodo de transición, se aplicarán las siguientes medidas para asegurar la continuidad en la gestión pública."
   - **Next Provision:** "ARTÍCULO 3.Para los efectos del presente Reglamento, se consideran las definiciones contenidas en la Ley General de Desarrollo Forestal Sustentable y la Ley de Desarrollo Forestal Sustentable del Estado de Morelos."
   - **Example 2:**
   - **Previous Provision:** "ARTÍCULO 2. Durante el periodo de transición, se aplicarán las siguientes medidas para asegurar la continuidad en la gestión pública."
   - **Current Provision:** "TRANSITORIO PRIMERO. Disposiciones transitorias sobre la implementación de nuevas normativas"
   - **Next Provision:** "TÍTULO SEGUNDO ORGANIZACIÓN Y ADMINISTRACIÓN DEL SECTOR PÚBLICO FORESTAL"


   ### **Invalid Legal Provisions:**
   Mark the provision as **INVALID** if it clearly meets one of the following conditions:
   
   #### **IsIncomplete:**
   - **Definition:** An article is considered **incomplete** if it is abruptly cut off or clearly unfinished, lacking a concluding idea. If an article ends without delivering a complete directive, rule, or idea, it is deemed incomplete.
   - **Note:** An article **is not considered incomplete** if it ends with a **clear, logical, and complete idea** even if it is short. A brief statement or directive that is logically conclusive and understandable is sufficient.
   - **Example of IsIncomplete:**
      - **Previous Provision:** "ARTÍCULO 6. Las atribuciones gubernamentales, en materia de conservación, protección, restauración, producción, ordenación, cultivo, manejo y aprovechamiento de los ecosistemas forestales que son objeto de esta ley, serán ejercidas, de conformidad con la distribución que hace la misma, sin perjuicio de lo que se disponga en otros ordenamientos aplicables. Para efecto de la coordinación de acciones, siempre que exista transferencia de atribuciones, el Gobierno del Estado y los gobiernos municipales deberán celebrar convenios entre ellos y/o con la federación, en los casos y las materias que se precisan en la presente ley."
      - **Current Provision:** "ARTÍCULO 7. El Estado podrá suscribir convenios o acuerdos de coordinación con la Federación con el objeto de que en el ámbito territorial de su competencia asuma las funciones previstas en el artículo 24 de la Ley General. El Gobierno del Estado y los Municipios podrán celebrar convenios de coordinación en materia forestal con la finalidad de que estos últimos, en el ámbito de su competencia territorial asuman algunas de las funciones previstas en el..."
      - **Next Provision:** "ARTÍCULO 24. Las funciones que se describen a continuación, serán asumidas por los Gobiernos de los Estados y Municipios conforme a los convenios establecidos con la Federación."
      - **Reasoning:** The current article is **incomplete** because it leaves the clause unfinished. The specific functions to be assumed are missing.
   
   #### **IsContinuation:**
   - **Definition:** If the **Previous Provision** has been marked as **invalid** with the reason **IsIncomplete**, then the **Current Provision** should **always** be considered **INVALID** and marked as **IsContinuation**, even if it seems to continue logically. This ensures that any unfinished provision is treated as a continuation of the previous one.
   - **Note:** The current article can only be marked as **IsContinuation** if the **Previous Provision** was already invalidated for **IsIncomplete**.
     
   - **Reasoning:** The **Previous Provision** was cut off or left unfinished, so the **Current Provision** should not be evaluated independently. It must be treated as a continuation of the incomplete thought in the **Previous Provision**.
   
   - **Examples of IsContinuation:**
     - **Example 1:**
       - **Previous Provision:** "ARTÍCULO 7. El Estado podrá suscribir convenios o acuerdos de coordinación con la Federación con el objeto de que en el ámbito territorial de su competencia asuma las funciones previstas en el artículo 24 de la Ley General. El Gobierno del Estado y los Municipios podrán celebrar convenios de coordinación en materia forestal con la finalidad de que estos últimos, en el ámbito de su competencia territorial asuman algunas de las funciones previstas en el..."
       - **Current Provision:** "ARTÍCULO 24. Las funciones que se describen a continuación, serán asumidas por los Gobiernos de los Estados y Municipios conforme a los convenios establecidos con la Federación."
       - **Next Provision:** "ARTÍCULO 8.El Consejo promoverá la constitución de Consejos Forestales Municipales, en aquellos municipios de vocación forestal, los cuales se formarán e integrarán de la misma manera que los Consejos Forestales Regionales."
       - **Reasoning:** The **Current Provision** is a direct continuation of the **Previous Provision**, and therefore, it is marked as **IsContinuation**.
   
     - **Example 2:**
       - **Previous Provision:** "ARTÍCULO 12.- Los Consejos Regionales tienen las atribuciones que les confiere el"
       - **Current Provision:** "ARTÍCULO 35 de la Ley, son coordinados por la Secretaría, su Secretario Técnico podrá ser un representante de la instancia coordinadora sectorial de la federación se integran con representantes de los gobiernos municipales que conforman su región, quienes conforman la comisión ejecutiva, y con representantes de las organizaciones productivas y sociales con incidencia en la mayor parte o en la totalidad del territorio de la región, en conjunto con las instituciones federales y estatales que apoyan proyectos y acciones para el desarrollo económico, social ambiental de alcance microregional o regional."
       - **Next Provision:** "ARTÍCULO 13.- En concordancia con el ARTÍCULO 37 de la Ley, los Consejos Municipales son las instancias encargadas de la formulación participativa del Programa Estratégico Municipal de Desarrollo Rural Sustentable, mismo que deberá actualizarse anualmente con un programa de trabajo sectorial, el cual servirá de sustento formal a los gobiernos municipales para la inclusión de los rubros de inversión para el sector rural en sus programas operativos anuales."
       - **Reasoning:** The **Current Provision** is a clear continuation of the **Previous Provision**, and should be marked as **IsContinuation**. Even though the article number changed, the content logically continues from the previous article, and thus it is treated as a continuation.
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

export default LeyArticleExtractor
