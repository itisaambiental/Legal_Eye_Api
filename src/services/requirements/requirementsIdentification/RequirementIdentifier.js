import fetch from 'node-fetch'
import ErrorUtils from '../../../utils/Error.js'

/**
 * Service class for analyzing article-requirement relationships.
 */
class RequirementIdentifierAnalysis {
  /**
   * Analyzes if an article is obligatory or complementary for a requirement using OpenAI.
   *
   * @param {Object} article - Article data.
   * @param {Object} requirement - Requirement data.
   * @returns {Promise<string>} - 'Obligatory' or 'Complementary'.
   * @throws {ErrorUtils} - If an error occurs during analysis.
   */
  static async analyzeArticleRequirementRelation (article, requirement) {
    const prompt = `
Eres un experto en leyes y fundamentos legales. Yo te voy a dar un artículo y un requerimiento, 
tu me vas a decir si el artículo es obligatorio o complementario para cumplir con el requerimiento.
Responde en JSON con el siguiente formato:
{
    "obligatorio": true,
    "complementario": false
}

### REQUERIMIENTO ###
Descripción: ${requirement.mandatory_description}
Oraciones: ${requirement.mandatory_sentences}
Palabras claves: ${requirement.mandatory_keywords}

### ARTÍCULO ###
${article.article_name}
`

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer OpenAI API'
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{ role: 'system', content: prompt }]
        })
      })

      const result = await response.json()
      if (!result || !result.choices || !result.choices.length) {
        throw new Error('Invalid response from AI API')
      }

      const classification = JSON.parse(result.choices[0].message.content)
      return classification.obligatorio ? 'Obligatory' : 'Complementary'
    } catch (error) {
      console.error('Error analyzing article-requirement relation:', error.message)
      throw new ErrorUtils(500, 'Error analyzing article-requirement relation')
    }
  }
}

export default RequirementIdentifierAnalysis
