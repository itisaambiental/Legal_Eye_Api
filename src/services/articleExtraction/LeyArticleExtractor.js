import ArticleExtractor from './ArticleExtractor.js'

/**
 * Class extending ArticleExtractor to extract articles from legal texts.
 * Processes the text, cleans inconsistent formats, and extracts articles,
 * chapters, sections, and transitory provisions in a structured manner.
 */
class LeyArticleExtractor extends ArticleExtractor {
  /**
   * Extracts articles from the text after cleaning it.
   * @returns {Array} - List of formatted articles.
   */
  extractArticles () {
    const text = this.cleanText(this.text)
    const articles = this._extractArticles(text)
    return this.formatArticles(articles)
  }

  /**
   * Cleans the input text by normalizing spaces, removing line breaks,
   * and standardizing keywords like "ARTÍCULO", "CAPÍTULO", "SECCIÓN",
   * and "TRANSITORIOS", even if they have interleaved spaces.
   * Only matches uppercase or capitalized keywords to avoid false positives.
   * @param {string} text - Text to clean.
   * @returns {string} - Cleaned text.
   */
  cleanText (text) {
    const multipleSpacesRegex = /\s+/g
    const lineBreaksRegex = /\n/g
    // Regex patterns for uppercase and capitalized keywords
    const articleKeywordRegex = /A\s*(?:R\s*T\s*[ÍI]\s*C\s*U\s*L\s*O|r\s*t\s*[íi]\s*c\s*u\s*l\s*o)/g
    const chapterKeywordRegex = /C\s*(?:[ÁA]\s*P\s*[ÍI]\s*T\s*U\s*L\s*O|[áa]\s*p\s*[íi]\s*t\s*u\s*l\s*o)/g
    const sectionKeywordRegex = /S\s*(?:E\s*C\s*C\s*[ÍI]\s*[ÓO]\s*N|e\s*c\s*c\s*[íi]\s*[óo]\s*n)/g
    const transitoriosKeywordRegex = /T\s*(?:R\s*A\s*N\s*S\s*I\s*T\s*O\s*R\s*I\s*O\s*S|r\s*a\s*n\s*s\s*i\s*t\s*o\s*r\s*i\s*o\s*s)/g
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

  /**
   * Extracts articles from the cleaned text using regular expressions.
   * @param {string} text - Cleaned text.
   * @returns {Array} - List of article objects.
   */
  _extractArticles (text) {
    const articlePatternString = '((?:C[ÁA]P[IÍ]TULO)\\s+\\w+|' +
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
        if (currentArticle) {
          articles.push(currentArticle)
        }
        const chapterTitle = currentMatch
        const chapterDescription = matches[i + 1] ? matches[i + 1].trim() : ''
        currentArticle = {
          title: chapterTitle,
          article: chapterDescription,
          order: order++
        }
      } else if (titleSectionRegex.test(currentMatch)) {
        if (currentArticle) {
          articles.push(currentArticle)
        }
        const sectionTitle = currentMatch
        const sectionDescription = matches[i + 1] ? matches[i + 1].trim() : ''
        currentArticle = {
          title: sectionTitle,
          article: sectionDescription,
          order: order++
        }
      } else if (titleArticleRegex.test(currentMatch)) {
        if (currentArticle) {
          articles.push(currentArticle)
        }
        const articleTitle = currentMatch
        const articleContent = matches[i + 1] ? matches[i + 1].trim() : ''
        currentArticle = {
          title: articleTitle,
          article: articleContent,
          order: order++
        }
      } else if (titleTransitoriosRegex.test(currentMatch)) {
        if (currentArticle) {
          articles.push(currentArticle)
        }
        const transitoriosTitle = currentMatch
        const transitoriosContent = matches[i + 1] ? matches[i + 1].trim() : ''
        currentArticle = {
          title: transitoriosTitle,
          article: transitoriosContent,
          order: order++
        }
      }
    }

    if (currentArticle) {
      articles.push(currentArticle)
    }

    return articles
  }
}

export default LeyArticleExtractor
