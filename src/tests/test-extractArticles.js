// test-extractArticles.js

class NormaArticleExtractorMock {
  constructor () {
    this.order = 1
  }

  _cleanText (text) {
    const raw = text
      .replace(/\r\n/g, '\n')
      .replace(/\t+/g, '')
      .replace(/[ ]{2,}/g, ' ')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{2,}/g, '\n')
      .trim()

    const transientKeywordRegex = /\b(?:\w+\s+)*[Tt][Rr][Aa][Nn][Ss][Ii][Tt][Oo][Rr][Ii][AaOo](?:\s*[SsAa])?\s*(\d+[A-Z]*|[IVXLCDM]+)?\b/
    const annexKeywordRegex = /\b[Aa]\s*[Nn]\s*[Ee]\s*[Xx]\s*[Oo]\s*(\d+[A-Z]*|[IVXLCDM]+)?\b/
    const appendixKeywordRegex = /^\s*[Aa][Pp](?:[ÉEéè]?)?[Nn][Dd][Ii][Cc][Ee](?:\s+([IVXLCDM]+|\d+[A-Z]*))?\s*$/i
    const prefaceKeywordRegex = /^\s*[Pp][Rr][Ee][Ff][Aa][Cc][Ii][Oo]\s*$/
    const consideringKeywordRegex = /^\s*[Cc][Oo][Nn][Ss][Ii][Dd][Ee][Rr][Aa][Nn][Dd][Oo]\s*$/
    const contentKeywordRegex = /^\s*[Cc][Oo][Nn][Tt][Ee][Nn][Ii][Dd][Oo]\s*$/
    const indexKeywordRegex = /^\s*[ÍIíi][Nn][Dd][ÍIíi][Cc][Ee]\s*$/i

    const lines = raw.split('\n')
    const cleanedLines = lines.map(line => {
      return line
        .replace(transientKeywordRegex, (_, num) => `TRANSITORIO${num ? ' ' + num : ''}`)
        .replace(annexKeywordRegex, (_, num) => `ANEXO${num ? ' ' + num : ''}`)
        .replace(appendixKeywordRegex, (_, num) => `APÉNDICE${num ? ' ' + num : ''}`)
        .replace(prefaceKeywordRegex, 'PREFACIO')
        .replace(consideringKeywordRegex, 'CONSIDERANDO')
        .replace(contentKeywordRegex, 'CONTENIDO')
        .replace(indexKeywordRegex, 'ÍNDICE')
        .trim()
    })

    return cleanedLines.join('\n').trim()
  }

  async _extractArticles (text) {
    text = this._cleanText(text)
    const lines = text.split('\n')

    const articles = []
    let currentTitle = null
    let currentContent = []
    let currentKey = null
    let order = 1

    const regexNumeral = /^(\d+(?:\.\d+)*)(?:\s+)([^\n]+)/ // ej: 6.1.1 Título
    const regexStandalone = /^(PREFACIO|ÍNDICE|CONTENIDO|CONSIDERANDO|TRANSITORIO(?: \w+)?|ANEXO(?: \w+)?|APÉNDICE(?: \w+)?)/i

    const finalize = () => {
      if (!currentTitle) return
      const content = currentContent.join('\n').trim()
      articles.push({
        title: currentTitle,
        article: content,
        plainArticle: content,
        order: order++
      })
      currentTitle = null
      currentContent = []
      currentKey = null
    }

    for (const line of lines) {
      const numeralMatch = line.match(regexNumeral)
      const standaloneMatch = line.match(regexStandalone)

      if (numeralMatch) {
        const numeral = numeralMatch[1]
        const numeralRoot = numeral.split('.')[0]
        if (!currentKey) {
          currentTitle = line
          currentKey = numeralRoot
        }
        if (numeralRoot !== currentKey) {
          finalize()
          currentTitle = line
          currentKey = numeralRoot
        }
        currentContent.push(line)
      } else if (standaloneMatch) {
        finalize()
        currentTitle = standaloneMatch[1].toUpperCase()
        currentKey = standaloneMatch[1].toUpperCase()
        currentContent.push(line)
      } else if (currentTitle) {
        currentContent.push(line)
      }
    }

    finalize()
    return articles
  }
}

// 🧪 Texto de prueba simulado tipo NOM
const rawText = `
  prefacio
  Esta Norma tiene como objetivo establecer criterios técnicos generales.
  
  6 Métodos anticonceptivos
  Se clasifican en diferentes categorías.
  
  6.1 Hormonales
  Uso común de parches, píldoras y otros.
  
  6.1.1 Orales
  Deben tomarse una vez al día.
  
  6.2 Inyectables
  Se aplican en ciclos mensuales.
  
  anexo I
  Incluye un formato de evaluación.
  
  TRANSITORIOS III
  Disposiciones para entrada en vigor.
  `

const extractor = new NormaArticleExtractorMock()
extractor._extractArticles(rawText).then((articles) => {
  console.log('=== Artículos extraídos ===\n')
  for (const art of articles) {
    console.log(`🧾 [${art.order}] ${art.title}`)
    console.log(art.article)
    console.log('----------------------------\n')
  }
})
