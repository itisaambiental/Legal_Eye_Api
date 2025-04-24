import ArticleExtractor from './ArticleExtractor.js'
import openai from '../../../config/openapi.config.js'
import { singleArticleModelSchema, sectionsResponseSchema } from '../../../schemas/article.schema.js'
import { zodResponseFormat } from 'openai/helpers/zod'
import ErrorUtils from '../../../utils/Error.js'

/**
 * Class extending ArticleExtractor to extract articles from (Laws).
 */
class LawArticleExtractor extends ArticleExtractor {
  /**
   * @param {string} text - The cleaned full text of the document.
   * @returns {Promise<Sections>} - Extracted section titles and validity flag.
   */
  async _extractSections (text) {
    const prompt = this._buildSectionsPrompt(text)
    const request = {
      model: this.model,
      messages: [
        {
          role: 'system',
          content: [
            'You are an expert in parsing legal documents(Laws).',
            'Given a Spanish legal document, extract all standalone headings — such as articles, titles, chapters, sections, annexes and transitory provisions — in their original order.',
            'Ignore headers, footers, page numbers, and non-structural content.'
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
   * @param {string} text - The full text of the document.
   * @returns {string} The formatted prompt.
   */
  _buildSectionsPrompt (text) {
    const lines = text.split('\n')
    const numberedText = lines.map((line, index) => `${index + 1}: ${line}`).join('\n')
    return `
    Extract all legal section headings and their sub-divisions from a legal document (law, code, regulation), based strictly on the body content (not from any index or table of contents):

• Valid section headers include (case-insensitive, punctuation-preserving, and semantically understood by meaning, not just appearance):

  ✅ Acceptable variations include capitalized, lowercase, and sentence-case versions. For example:
     - "ARTÍCULO 1", "Artículo 1", "artículo 1,", "Artículo 1."
     - "CAPÍTULO I", "Capítulo I", "capítulo I" , "Capítulo I."
     - "TÍTULO PRIMERO", "Título Primero", "título primero", "Título Primero."
     - Also accept: "Artículo 10 bis", "Artículo 15 ter", "Capítulo Segundo", "Artículo 2.1", etc.

  ➕ Include compound and extended article formats as standalone section headers:
     - e.g., "Artículo 2.1", "Artículo 3-B", "Artículo 10 bis", "Artículo 12 ter", etc.

  🧠 You must identify legal headers based on their **legal meaning and structural intent**, not just formatting or spelling.

  🔍 Extract the following types of structural sections when present (in any casing):
    ✅ Valid examples include:
    - "ARTÍCULO 1", "Artículo 1", "artículo 1.", "Artículo 2:", "artículo 3;"
    - "CAPÍTULO I", "Capítulo Primero", "capítulo II.", "Capítulo Segundo:"
    - "TÍTULO I", "Título Primero", "título segundo."
    - "SECCIÓN I", "Sección Primera", "sección tercera:"
    - "ARTÍCULO 10 bis", "Artículo 12 ter.", "Artículo 15 quater:", "Artículo 7-B"
    - "ARTÍCULO 1 BIS", "Artículo Primero BIS"
    - "TRANSITORIOS", "Disposiciones Transitorias", "transitorios:"
    - "ANEXO A", "Anexo I", "anexo B:"
    - "APÉNDICE A", "Apéndice Normativo"

  ⚠️ Do NOT reject section headers due to:
    - casing (e.g., "artículo" instead of "ARTÍCULO")
    - punctuation (e.g., "Artículo 1.", "Capítulo II:")
    - numbering style (numerical or ordinal)

  🔒 You MUST extract based only on real legal content hierarchy, not visual formatting.

• Preserve original **accents**, **punctuation**, and **order** of appearance.
• Ignore any **page numbers**, **headers**, **footers**, **marginal notes**, or **index references**.
• Do NOT rely on any index or table of contents—extract based solely on the actual content flow.

• Consider the document valid (isValid: true) if it contains at least one extractable section or sub-article heading as defined above.

Important: You must extract and return each heading **exactly as it appears in the original document**, without paraphrasing or summarizing. This includes:
  - Keeping all punctuation marks (e.g., ".", "-", ":")
  - Preserving sentence structure and exact words
  - NOT rewriting or improving text for clarity

This is a legal document — accuracy is critical.

IMPORTANT – MULTIPLE "TRANSITORIOS" BLOCKS

Legal documents may include multiple "TRANSITORIOS" blocks, especially when reforms or annexes have been added in different dates or through different agreements.

• You MUST treat each "TRANSITORIOS" heading as a **separate standalone section** if it appears more than once in the document.
• Do NOT group multiple "TRANSITORIOS" blocks into one single section, even if they share the same heading.
• Each "TRANSITORIOS" must be extracted **with its own content block**, starting from the heading and continuing until the next structural heading.

Examples:
  - First "TRANSITORIOS" (line 120) → title: "TRANSITORIOS", line: 120
  - Second "TRANSITORIOS" (line 560) → title: "TRANSITORIOS", line: 560
  - Third "TRANSITORIOS" (line 770) → title: "TRANSITORIOS", line: 770

This ensures that each reform, publication, or addendum is captured independently.

You MUST return the extracted sections **in the exact order in which they appear** in the document, based on their line number.

📤 **Return the output as valid JSON in this format**:
  
  \`\`\`json
  {
    "sections": [ 
      {
        "title": "string", // The exact heading text as it appears in the document.
        "line": "number"   // The line number (starting from 1) where the heading is located in the document
      }
    ],
    "isValid": true // true if at least one valid heading was found; false otherwise
  }
  \`\`\`
    Document text:
    """
    ${numberedText}
    """
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
            'You are a virtual assistant specialized in reviewing, correcting, and documenting legal articles extracted from various Laws. Note: All Laws are in Spanish, and all output must also be in Spanish.'
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
   * @param {Article} article - The article object for which the prompt is built.\
   * @returns {string} - The constructed prompt.
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
     - **ARTÍCULO 10**, **ARTÍCULO 11**, **ARTÍCULO 12**
     - **ARTÍCULO 100**, **ARTÍCULO 101**, **ARTÍCULO 102**

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
     - ARTÍCULO 10, ARTÍCULO 11, ARTÍCULO 12
     - ARTÍCULO 100, ARTÍCULO 101, ARTÍCULO 102
  
  3. **Articles**:
     - Review and correct long paragraphs, ensuring each explains a specific concept or legal provision.
     - Divide content into sections or subsections for clarity, using appropriate HTML tags:
       - <h2>, <h3> for headings
       - <p> for paragraphs
       - <ul> and <li> for lists
     - Use <b> for emphasis, <i> for additional context, and <span> for inline styles where necessary.
     - Complete truncated words or sentences without altering their meaning.
     - **Preserve full article numbers**:  
       When producing the **title** for each article, always copy the **exact numeral** from the source, whether it is 1 digit, 2 digit, 3 digit or more.  

    #### Example (in Spanish):
     **title:** ARTÍCULO 1 
     **article:** La Secretaría podrá establecer una vigencia en las autorizaciones que ésta emita en materia de impacto ambiental y, en su caso, de riesgo ambiental. En tales casos, el promovente deberá tramitar la renovación correspondiente conforme a los criterios que la Secretaría determine.
     **order:** 1

    #### Example (multi digit article numbers)
      **Input headings:**
      ARTÍCULO 20. Disposiciones especiales…
      ARTÍCULO 100. Vigencia…
      ARTÍCULO 101. Derogaciones…

      **Expected output:**
      **title:** ARTÍCULO 20
      **article:** <p>Disposiciones especiales…</p>
      **order:** 20

      **title:** ARTÍCULO 100
      **article:** <p>Vigencia…</p>
      **order:** 100

      **title:** ARTÍCULO 101
      **article:** <p>Derogaciones…</p>
      **order:** 101
  
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

export default LawArticleExtractor
