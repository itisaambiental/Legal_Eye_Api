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
Extract only **top-level and unnumbered standalone section headings** from a technical or legal normative document (e.g., Normas Oficiales Mexicanas), based **strictly** on the content itself — **not from any index or table of contents**.

---

🔍 **You MUST extract top-level structural sections**, such as:

📘 **Numeral-based headings** (preserve punctuation and allow natural variations):
- "1. OBJETIVO"
- "2. REFERENCIAS"
- "3. DEFINICIONES"
- "4. REQUISITOS"
- "10. OBSERVANCIA DE ESTA NORMA"
- Accept as valid: "1. Objetivo", "2. Referencias:", "3. DEFINICIONES." — the casing and trailing punctuation may vary.

📂 **Generic blocks commonly present in normative documents**:
- "CONSIDERANDO", "PREFACIO", "INTRODUCCIÓN"
- "ÍNDICE", "CONTENIDO"

📑 **Transitional provisions**:
- "TRANSITORIOS", "DISPOSICIONES TRANSITORIAS" (even if repeated — extract each block individually)

📎 **Annexes** (considered valid when found in the body, not just in the index):
- "ANEXO", "ANEXO A", "ANEXO B", "ANEXO C", ...
- "ANEXO I", "ANEXO II", "ANEXO III"
- "ANEXO NORMATIVO", "ANEXO TÉCNICO"
- Accept both lettered and roman numeral variants.

📘 **Appendices**:
- "APÉNDICE", "APÉNDICE A", "APÉNDICE NORMATIVO", etc.

🗂 **Sections**:
- "SECCIÓN 1", "SECCIÓN PRIMERA", "SECCIÓN II", etc.

---

⚠️ **Strict Exclusion Rules**:
- ❌ Do NOT include any heading that appears **only inside the "ÍNDICE"** block if it does not reappear in the body text.
- ❌ Do NOT extract sub-numbered headings such as "4.1", "4.2.1", "6.1.3.4". These belong under their respective parent and should be ignored for this task.
- ❌ Do NOT include formatting artifacts like centered titles, footers, headers, watermarks, editorial credits, or decorative text.

---

🧠 **Semantic Guidance**:
- Always interpret heading validity based on its **structural role and legal-normative purpose**, not its appearance alone.
- Accept headings in **any casing** (uppercase, lowercase, sentence-case), and even if followed by a period, colon or semicolon.
- Examples of valid variants:  
  - "3. Definiciones.", "5. MÉTODOS DE PRUEBA:", "ANEXO I.", "SECCIÓN 2;", "Apéndice Normativo: Requisitos adicionales".

---

📌 **Reminder on the use of index blocks**:
- If a heading appears both in the "ÍNDICE" and again in the document body, you MUST extract it.
- If a heading appears **only in the index**, DO NOT extract it.
- Instead, extract only headings that occur **within the actual content** of the document.

---

✅ **The goal is to capture the real content structure** that defines the document’s organization and meaning.



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
      "title": "string", // Exact heading text as found in the document
      "line": number     // Line number (starting from 1)
    }
  ],
  "isValid": true // true if at least one valid heading was found
}
\`\`\`

---

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

VERY IMPORTANT:
- Do not paraphrase, summarize, restructure or reinterpret the original text.  
- Every section title, article content, bullet point, and table must be reproduced **verbatim**,  
  including punctuation, spacing, and line breaks.  
- This is a legal document and must preserve its original wording with full fidelity.

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
