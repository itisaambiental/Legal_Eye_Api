import ArticleExtractor from './ArticleExtractor.js'
import openai from '../../../config/openapi.config.js'
import { singleArticleModelSchema } from '../../../schemas/articlesValidation.js'
import { zodResponseFormat } from 'openai/helpers/zod'
import { convert } from 'html-to-text'
/**
 * Class extending ArticleExtractor to extract articles from laws texts.
 * Processes the text, cleans inconsistent formats, and extracts articles,
 * chapters, sections, and transitory provisions in a structured manner.
 */
class LeyArticleExtractor extends ArticleExtractor {
  async extractArticles () {
    const text = this.cleanText(this.text)
    const articles = this._extractArticles(text)
    const totalArticles = articles.length
    const formatArticles = []
    let currentProgress = 0
    for (const article of articles) {
      const correctedArticle = await this.correctArticle(article)
      correctedArticle.plainArticle = convert(correctedArticle.article)
      formatArticles.push(correctedArticle)
      currentProgress += 1
      this.updateProgress(currentProgress, totalArticles)
    }
    return this.formatArticles(formatArticles)
  }

  cleanText (text) {
    const multipleSpacesRegex = /\s+/g
    const lineBreaksRegex = /\n/g
    const articleKeywordRegex =
      /A\s*(?:R\s*T\s*[ÍI]\s*C\s*U\s*L\s*O|r\s*t\s*[íi]\s*c\s*u\s*l\s*o)/g
    const chapterKeywordRegex =
      /C\s*(?:[ÁA]\s*P\s*[ÍI]\s*T\s*U\s*L\s*O|[áa]\s*p\s*[íi]\s*t\s*u\s*l\s*o)/g
    const sectionKeywordRegex =
      /S\s*(?:E\s*C\s*C\s*[ÍI]\s*[ÓO]\s*N|e\s*c\s*c\s*[íi]\s*[óo]\s*n)/g
    const transitoriosKeywordRegex =
      /T\s*(?:R\s*A\s*N\s*S\s*I\s*T\s*O\s*R\s*I\s*O\s*S|r\s*a\s*n\s*s\s*i\s*t\s*o\s*r\s*i\s*o\s*s)/g
    const ellipsisTextRegex = /[^.]+\s*\.{3,}\s*/g
    const singleEllipsisRegex = /\s*\.{3,}\s*/g
    return text
      .replace(multipleSpacesRegex, ' ')
      .replace(lineBreaksRegex, ' ')
      .replace(articleKeywordRegex, 'ARTÍCULO')
      .replace(chapterKeywordRegex, 'CAPÍTULO')
      .replace(sectionKeywordRegex, 'SECCIÓN')
      .replace(transitoriosKeywordRegex, 'TRANSITORIOS')
      .replace(ellipsisTextRegex, '')
      .replace(singleEllipsisRegex, '')
  }

  _extractArticles (text) {
    const articlePatternString =
      '((?:C[ÁA]P[IÍ]TULO)\\s+\\w+|' +
      '(?:SECCI[ÓO]N|Secci[óo]n)\\s+\\d+|' +
      '(?:ART[ÍI]CULO|Art[íi]culo)\\s+\\d+|' +
      '(?:TRANSITORIOS|Transitorios))'
    const articlePattern = new RegExp(articlePatternString, 'g')
    const titleChapterRegex = /^(C[ÁA]P[IÍ]TULO)/
    const titleSectionRegex = /^(SECCI[ÓO]N|Secci[óo]n)/
    const titleArticleRegex = /^(ART[ÍI]CULO|Art[íi]culo)/
    const titleTransitoriosRegex = /^(TRANSITORIOS|Transitorios)$/
    const matches = text.split(articlePattern)
    const articles = []
    let currentArticle = null
    let order = 1
    for (let i = 1; i < matches.length; i++) {
      const currentMatch = matches[i].trim()
      if (titleChapterRegex.test(currentMatch)) {
        if (currentArticle) articles.push(currentArticle)
        currentArticle = this.createArticleObject(
          currentMatch,
          matches[i + 1],
          order++
        )
      } else if (titleSectionRegex.test(currentMatch)) {
        if (currentArticle) articles.push(currentArticle)
        currentArticle = this.createArticleObject(
          currentMatch,
          matches[i + 1],
          order++
        )
      } else if (titleArticleRegex.test(currentMatch)) {
        if (currentArticle) articles.push(currentArticle)
        currentArticle = this.createArticleObject(
          currentMatch,
          matches[i + 1],
          order++
        )
      } else if (titleTransitoriosRegex.test(currentMatch)) {
        if (currentArticle) articles.push(currentArticle)
        currentArticle = this.createArticleObject(
          currentMatch,
          matches[i + 1],
          order++
        )
      }
    }
    if (currentArticle) articles.push(currentArticle)
    return articles
  }

  createArticleObject (title, content, order) {
    return {
      title,
      article: content ? content.trim() : '',
      plainArticle: '',
      order
    }
  }

  async correctArticle (article) {
    const prompt = this.buildPrompt(this.name, article)
    const request = {
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a virtual assistant specialized in reviewing, correcting, and documenting Mexican legal articles extracted from various laws. Note: All laws are in Spanish, and all output must also be in Spanish.'
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
        const content = JSON.parse(response.choices[0].message.content)
        if (content) {
          return content
        } else {
          return article
        }
      } catch (error) {
        if (error.status === 429) {
          if (retryCount < 3) {
            const backoffTime = Math.pow(2, retryCount) * 1000
            await new Promise((resolve) => setTimeout(resolve, backoffTime))
            return attemptRequest(retryCount + 1)
          } else {
            return article
          }
        }
        return article
      }
    }

    return attemptRequest()
  }

  buildPrompt (documentName, article) {
    return `
Analyze the content of "${article.title}" within the Mexican legal basis titled "${documentName}". Then, help format and correct the following article using professional HTML structure and styles:

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
   - The title field should only state the article, section, or chapter number.
   - Ensure that titles are concise and formatted consistently.
   - Do not use HTML tags in titles.

  #### Examples (in Spanish):
   - Artículo 1, Sección 2, Capítulo 3
   - Artículo I - Artículo II, Sección III, Capítulo IV
   - Artículo 1 - Artículo 2, Sección 3, Capítulo 4
   - Capítulo Tercero, Sección Cuarta, Artículo Primero

  **Output (Unformatted HTML):**  
   // Titles should not have HTML tags.
   - Artículo 1, Sección 2, Capítulo 3
   - Artículo I - Artículo II, Sección III, Capítulo IV
   - Artículo 1 - Artículo 2, Sección 3, Capítulo 4
   - Capítulo Tercero, Sección Cuarta, Artículo Primero

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

4. **Chapters and Sections**:
   - Ensure headings are concise and formatted with appropriate HTML tags such as <h1>, <h2>, or <h3>.
   - Make sure they are short and concise, containing only the grouping heading without including articles or detailed content. If you include any articles, remove them from the chapter or section.

  #### Example (in Spanish):
   **title:** CAPÍTULO TERCERO  
   **article:** DEL COMITÉ ESTATAL DE EMERGENCIAS Y DESASTRES. La Ley del Agua para el Estado de Puebla tiene como finalidad regular el uso, conservación y protección del agua, asegurando su disponibilidad y calidad para las generaciones presentes y futuras.
   **order:** 3

  **Output (Formatted in HTML):**  
  **title:** CAPÍTULO TERCERO   // Titles should not have HTML tags.
   **title:** <h2>DEL COMITÉ ESTATAL DE EMERGENCIAS Y DESASTRES</h2> //Remove the article or any additional information from the chapter or section.
   **order:** 3

   #### Example (in Spanish):
   **title:** SECCIÓN PRIMERA   
   **article:** DISPOSICIONES COMUNES   
   **order:** 6

  **Output (Formatted in HTML):**  
  **title:** SECCIÓN PRIMERA    // Titles should not have HTML tags.
   **title:** <h2>DISPOSICIONES COMUNES</h2>
   **order:** 6

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

- Use consistent and professional formatting, such as proper indentation for nested elements.
- Respect spaces, punctuation (e.g., periods, hyphens), and line breaks for clarity.
- Ensure all text ends with complete ideas.
- Maintain any existing tables or columns using <table>, <thead>, <tbody>, and <tr> tags.
- Use semantic HTML wherever possible to improve readability and structure.
- Return the corrected object in **Spanish**, preserving the original meaning of the text.
  `
  }
}

export default LeyArticleExtractor
