// test-cleanText.js

// Simulación mínima de la clase NormaArticleExtractor
class NormaArticleExtractorMock {
  _cleanText (text) {
    const raw = text
      .replace(/\r\n/g, '\n')
      .replace(/\t+/g, '')
      .replace(/[ ]{2,}/g, ' ')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{2,}/g, '\n')
      .trim()

    const transientKeywordRegex =
          /\b(?:\w+\s+)*[Tt][Rr][Aa][Nn][Ss][Ii][Tt][Oo][Rr][Ii][AaOo](?:\s*[SsAa])?\s*(\d+[A-Z]*|[IVXLCDM]+)?\b/

    const annexKeywordRegex =
          /\b[Aa]\s*[Nn]\s*[Ee]\s*[Xx]\s*[Oo]\s*(\d+[A-Z]*|[IVXLCDM]+)?\b/

    const appendixKeywordRegex =
          /^\s*[Aa][Pp](?:[ÉEéè]?)?[Nn][Dd][Ii][Cc][Ee](?:\s+([IVXLCDM]+|\d+[A-Z]*))?\s*$/i

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
}

// Texto de prueba
const rawText = `
  prefacio
  Esta norma es técnica...
  
  transitorios III
  Son aplicables a...
  
  anexo 1
  Contiene el diagrama...
  
  Índice
  
  Contenido
  
  considerando
  Las condiciones legales...
  
  apendice II
  Información adicional
  `

// Ejecutar prueba
const mock = new NormaArticleExtractorMock()
const cleaned = mock._cleanText(rawText)

console.log('=== Texto Limpio ===\n')
console.log(cleaned)
