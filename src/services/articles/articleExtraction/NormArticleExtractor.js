import ArticleExtractor from './ArticleExtractor.js'
import openai from '../../../config/openapi.config.js'
import { singleArticleModelSchema, sectionsResponseSchema } from '../../../schemas/article.schema.js'
import { zodResponseFormat } from 'openai/helpers/zod'
import ErrorUtils from '../../../utils/Error.js'

/**
 * Class extending ArticleExtractor to extract articles from (NOMs).
 */
class NormArticleExtractor extends ArticleExtractor {
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
            'You are an expert at legal documents (Norms).',
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
   * @param {string} text - The full text of the document.
   * @returns {string} The formatted prompt.
   */
  _buildSectionsPrompt (text) {
    const lines = text.split('\n')
    const numberedText = lines.map((line, index) => `${index + 1}: ${line}`).join('\n')
    return `
Extract only top‑level and unnumbered standalone section headings from a document(Norm), based strictly on the content itself (not just any index or table of contents):

- Top-level numerals: "1. OBJETIVO", "2. REFERENCIAS", ..., "10. OBSERVANCIA DE ESTA NORMA"
- Generic section blocks such as:
  - "CONSIDERANDO", "PREFACIO", "INTRODUCCIÓN"
  - "ÍNDICE", "CONTENIDO"
  - "TRANSITORIOS", "DISPOSICIONES TRANSITORIAS"
  - "ANEXO A", "ANEXO B", "ANEXO C", "ANEXO D"
  - "ANEXO 1", "ANEXO II",  "ANEXO III","ANEXO NORMATIVO", "ANEXO TÉCNICO"
  - "APÉNDICE", "APÉNDICE A", "APÉNDICE NORMATIVO"
  - "SECCIÓN 1", "SECCIÓN PRIMERA"
    **Important:** Do not include generic headings, summaries, or formatting artifacts (e.g., centered bold phrases, footers, page numbers, author credits). Only return those which clearly represent structural sections in the document's hierarchy.

Do NOT extract any sub‑numbered headings (e.g. "6.1", "6.1.1")—they belong under their parent.
Preserve original accents, punctuation, and order.
Ignore page numbers, headers, footers, links, or any notes.
Do NOT rely solely on an index or table of contents; identify headings as they appear in the document body.
Treat any document as valid if it contains at least one top‑level heading or numeral that can be divided and extracted individually.
The word **"ANEXO" can appear alone or followed by a letter, roman numeral, or descriptor** — treat all of them as valid top-level headings.

INDEX-BASED HEADINGS WARNING:

In some legal documents (Normas), a block titled "ÍNDICE" (Index) appears before the body text. This block often contains lines like:

1. Introducción
2. Objeto y Ámbito de validez
3. Definiciones
4. Límites máximos permisibles de emisiones de Compuestos Orgánicos Volátiles
5. Requisitos técnicos
6 Vigilancia
7. Vigencia
8. Referencias
ANEXOS

Be aware of **two common scenarios**:

1. **If a heading from the index (e.g., "1. Introducción") reappears exactly in the body**, then you may include it as a section.
2. **If the heading appears only in the index (e.g., "ANEXOS")**, but the body only contains "ANEXO I", "ANEXO II", etc., then:
   - DO NOT include "ANEXOS"
   - Instead, extract the real top-level headings: "ANEXO I", "ANEXO II", etc.

In general:
- **Do not extract any title that appears only inside the index block.**
- **Only extract a heading if it appears again after the index block in the real content**.
- Consider headings like “ANEXO”, “APÉNDICE”, etc., as valid only when they appear individually in the body of the text.

The goal is to build a sequence of sections that match the structure of the actual document content — not the index.

Return JSON matching this schema:

\`\`\`json
{
  "sections": [
    {
      "title": "string", // The exact heading text as it appears in the document.
      "line": number     // The line number (starting from 1) where the heading is located.
    }
  ],
  "isValid": true // true if at least one valid heading was found; false otherwise
}
\`\`\`

Example:

\`\`\`json
{
  "sections": [
  { title: "CONSIDERANDO", line: 1 },
  { title: "PREFACIO", line: 2 },
  { title: "ÍNDICE", line: 3 },
  { title: "CONTENIDO", line: 4 },
  { title: "1. OBJETIVO Y CAMPO DE APLICACIÓN", line: 5 },
  { title: "2. REFERENCIAS NORMATIVAS", line: 6 },
  { title: "3. TÉRMINOS Y DEFINICIONES", line: 7 },
  { title: "4. ESPECIFICACIONES", line: 8 },
  { title: "5. MÉTODOS DE PRUEBA", line: 9 },
  { title: "6. ACCIONES ESTRATÉGICAS E INSTRUMENTOS DE EJECUCIÓN", line: 10 },
  { title: "7. PROCEDIMIENTO PARA LA EVALUACIÓN DE LA CONFORMIDAD", line: 11 },
  { title: "8. CONCORDANCIA CON NORMAS INTERNACIONALES", line: 12 },
  { title: "9. BIBLIOGRAFÍA", line: 13 },
  { title: "10. OBSERVANCIA DE ESTA NORMA", line: 14 },
  { title: "SECCIÓN 1", line: 15 },
  { title: "ANEXO 1", line: 16 },
  { title: "ANEXO 2", line: 17 },
  { title: "ANEXO 3", line: 18 },
  { title: "TRANSITORIOS", line: 20 },
  { title: "APÉNDICE", line: 21 },
  { title: "APÉNDICE NORMATIVO: PUERTOS DE MUESTREO", line: 23 }
  ],
  "isValid": true
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
            'You are a virtual assistant specialized in reviewing, correcting, and documenting legal articles extracted from various Norms. Note: All Norms are in Spanish, and all output must also be in Spanish.'
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

export default NormArticleExtractor
