import ArticleExtractor from './ArticleExtractor.js'
import openai from '../../../config/openapi.config.js'
import { singleArticleModelSchema, sectionsResponseSchema } from '../../../schemas/article.schema.js'
import { zodResponseFormat } from 'openai/helpers/zod'
import HttpException from '../../../utils/HttpException.js'

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
        throw new HttpException(500, 'Article Processing Error', error)
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

   Acceptable variations include capitalized, lowercase, and sentence-case versions. For example:
     - "CONSIDERANDO", "Considerando"
     - "ARTÍCULO 1", "Artículo 1", "artículo 1,", "Artículo 1."
     - "CAPÍTULO I", "Capítulo I", "capítulo I" , "Capítulo I."
     - "TÍTULO PRIMERO", "Título Primero", "título primero", "Título Primero."
     - Also accept: "Artículo 10 bis", "Artículo 15 ter", "Capítulo Segundo", "Artículo 2.1", etc.

     **Generic blocks commonly present in normative documents**:
    - "CONSIDERANDO", "PREFACIO", "INTRODUCCIÓN"
    - "ÍNDICE", "CONTENIDO"

   Include compound and extended article formats as standalone section headers:
     - e.g., "Artículo 2.1", "Artículo 3-B", "Artículo 10 bis", "Artículo 12 ter", etc.

   You must identify legal headers based on their **legal meaning and structural intent**, not just formatting or spelling.

   Extract the following types of structural sections when present (in any casing):
      Valid examples include:
    - "CONSIDERANDO", "Considerando"
    - "ARTÍCULO 1", "Artículo 1", "artículo 1.", "Artículo 2:", "artículo 3;"
    - "CAPÍTULO I", "Capítulo Primero", "capítulo II.", "Capítulo Segundo:"
    - "TÍTULO I", "Título Primero", "título segundo."
    - "SECCIÓN I", "Sección Primera", "sección tercera:"
    - "ARTÍCULO 10 bis", "Artículo 12 ter.", "Artículo 15 quater:", "Artículo 7-B"
    - "ARTÍCULO 1 BIS", "Artículo Primero BIS"
    - "TRANSITORIOS", "Disposiciones Transitorias", "transitorios:"
    - "ANEXO A", "Anexo I", "anexo B:"
    - "APÉNDICE A", "Apéndice Normativo"

       VERY IMPORTANT — DETECT  HEADINGS IN BODY TEXT

      • In legal documents such as regulations, it is common for article headers like "Artículo 1." or "Artículo 14." to appear directly before their content on the same line. These must be recognized and extracted as valid legal section headings.

      • If a line matches a valid legal header, check that the next line is not also a valid header before extracting. If multiple headers are stacked without content lines in between, only extract the topmost one.

      • Do not extract subtitles, thematic descriptions, or content headers, even if they are in uppercase or appear on a separate line.

      • Never extract two valid legal headings one immediately after the other on consecutive lines. There must always be at least one non-header line (such as a paragraph, description, or article body) between two legal section headings.

      • If a thematic description or subtitle appears below or on the same line as a structural heading, it must not be extracted separately. It belongs to the content of the preceding heading.

      • Only extract the heading itself, exactly as it appears in the document, and ignore any additional sentence or content in the same line.

      • For example:
      - "Artículo 1. Este Reglamento tiene por objeto..." → heading: "Artículo 1."
      - "Artículo 2. Se aplicará conforme a..." → heading: "Artículo 2."

 • Treat any line starting with "Artículo" and ending at the first punctuation mark — like a period (.), colon (:), or semicolon (;) — as a standalone section title.

    • DO NOT skip, paraphrase, summarize or ignore these — they are the **primary legal structure** of regulations.

    • If the article number includes modifiers like "bis", "ter", "quater", or "7-B", they must also be captured.

    • The heading must be returned **verbatim** as it appears in the original line, preserving capitalization and punctuation.
  

    Do NOT reject section headers due to:
    - casing (e.g., "artículo" instead of "ARTÍCULO")
    - punctuation (e.g., "Artículo 1.", "Capítulo II:")
    - numbering style (numerical or ordinal)

    You MUST extract based only on real legal content hierarchy, not visual formatting.

• Preserve original **accents**, **punctuation**, and **order** of appearance.
• Ignore any **page numbers**, **headers**, **footers**, **marginal notes**, or **index references**.
• Do NOT rely on any index or table of contents—extract based solely on the actual content flow.

• Consider the document valid (isValid: true) if it contains at least one extractable section or sub-article heading as defined above.

Important: You must extract and return each heading **exactly as it appears in the original document**, without paraphrasing or summarizing. This includes:
  - Keeping all punctuation marks (e.g., ".", "-", ":")
  - Preserving sentence structure and exact words
  - NOT rewriting or improving text for clarity

This is a legal document — accuracy is critical.

IMPORTANT (Transitional-Provisions) Blocks

  • Top-level only:
  Any heading whose main text is exactly a form of “TRANSITORIOS” (e.g. “TRANSITORIOS”, “Disposiciones Transitorias”, etc.) is a standalone section. Record it once, verbatim, with its line number.

  • One heading = one block:
  If the document later repeats a TRANSITORIOS-type heading, treat that as a new section. Do not merge separate blocks, even if the wording is identical.

  •Ignore inner headings:
  Inside a TRANSITORIOS block you may see internal articles. Do not extract or list these. They are content of the current block—not separate sections.

You MUST return the extracted sections **in the exact order in which they appear** in the document, based on their line number.

  IMPORTANT – ABOUT THE COMPLETE OUTPUT
  - Do not summarize the output, do not reduce it because of size, and do not assume that I only want the top-level hierarchy.
  - The size of the JSON IS NOT AN OBJECTION. If the document contains hundreds or thousands of headings, you must list absolutely all of them, one by one, exactly as they appear in the text.
  - DO NOT group or omit headers, etc.
  - DO NOT summarize, DO NOT trim for reasons of size or practicality.
  - Only return the valid section heading found on each line.
  - Do NOT return any additional content, explanations, or body text, even if it appears on the same line: only extract and return the valid legal heading.

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
            throw new HttpException(500, 'Article Processing Error', error)
          }
        }
        throw new HttpException(500, 'Article Processing Error', error)
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
    "article": \`\`\`${article.article}\`\`\`,
    "plainArticle": "${article.plainArticle}",
    "order": ${article.order}
  }
  
  VERY IMPORTANT:
  - Do not paraphrase, summarize, restructure or reinterpret the original text.  
  - Every section title, article content, bullet point, and table must be reproduced **verbatim**,  
    including punctuation, spacing, and line breaks.  
  - This is a legal document and must preserve its original wording with full fidelity.
  - Apply the CSS ('style="text-align: justify;">') style to all paragraph (<p>) elements and relevant text content to ensure that the text is aligned to both margins. This improves the readability and professional presentation of the document(Except in tables).

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

  7- **Tables**:
     - Whenever you encounter a <table> anywhere in the document—whether under a numeral, in the main content, in an annex, or in any other section—**always** include its title immediately **before** the <table> tag.
     - If the title consists of multiple lines (e.g. “TABLA X” on one line and subtitle in the next one), keep all lines in the same order.
 
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
  
  ### Additional Formatting Guidelines:
  
  - Please do not create or write random definitions within the article. Just make sure you are working with the information that is being shared with you. 
  - All paragraph (<p>) elements content should be justified using CSS ('style="text-align: justify;">') to align the text to both margins in a professional and legible manner(Except in tables).
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
