import openai from '../../../config/openapi.config.js'
import { requirementTypeIdentifiersSchema } from '../../../schemas/reqIdentification.schema.js'
import { zodResponseFormat } from 'openai/helpers/zod'
import HttpException from '../../errors/HttpException.js'

/**
 * Service to identify requirement types.
 */
class RequirementTypesIdentifierService {
  /** @typedef {import('../../../models/Article.model.js').default} Article */
  /** @typedef {import('../../../models/RequirementTypes.model.js').default} RequirementType */

  /** @typedef {import('zod').infer<typeof requirementTypeIdentifiersSchema>} requirementTypeIdentifiersSchema */

  /**
   * Constructs an instance of RequirementTypesIdentifierService.
   * @param {Article[]} articles - The articles to be used in identifying the type of requirements.
   * @param {RequirementType[]} requirementTypes - The list of requirement types to choose from.
   * @param {string} model - AI model to be used in the requirement types identification.
   */
  constructor (articles, requirementTypes, model) {
    this.articles = articles
    this.requirementTypes = requirementTypes
    this.model = model
  }

  /**
   * Method to identify the requirements type.
   * @return {Promise<requirementTypeIdentifiersSchema>} A promise that resolves to an array of identified requirement types.
   * @throws {HttpException} If there is an error during the identification process.
   */
  async identifyRequirementTypes () {
    const prompt = this._buildIdentifyRequirementTypesPrompt(
      this.articles,
      this.requirementTypes
    )

    const request = {
      model: this.model,
      messages: [
        {
          role: 'system',
          content: [
            'You are a legal expert in normative classification.',
            'Your task is to analyze a list of legal articles and identify which requirement types from a given list match their content.',
            'Return an array of the matching requirement type IDs.',
            'If no requirement type matches any article, return an empty array [].',
            'Each requirement type includes a description and classification guidelines to help you decide.'
          ].join(' ')
        },
        { role: 'user', content: prompt }
      ],
      response_format: zodResponseFormat(
        requirementTypeIdentifiersSchema,
        'requirement_types'
      )
    }

    const attemptRequest = async (retryCount = 0) => {
      try {
        const response = await openai.chat.completions.create(request)
        const requirementTypeIds = requirementTypeIdentifiersSchema.parse(
          JSON.parse(response.choices[0].message.content)
        )
        return requirementTypeIds
      } catch (error) {
        if (error.status === 429 && retryCount < 3) {
          const backoffTime = Math.pow(2, retryCount) * 1000
          await new Promise((resolve) => setTimeout(resolve, backoffTime))
          return attemptRequest(retryCount + 1)
        }
        throw new HttpException(500, 'Requirement Identification Error', error)
      }
    }

    return attemptRequest()
  }

  /**
   * Builds the prompt for identifying the requirement types.
   * @param {Article[]} articles - The articles to be analyzed.
   * @param {RequirementType[]} requirementTypes - The list of requirement types to choose from.
   * @returns {string} The formatted prompt for the AI model.
   */
  _buildIdentifyRequirementTypesPrompt (articles, requirementTypes) {
    const articlesInfo = articles
      .map(
        (article) => `
    ID: ${article.id}
    Title: ${article.article_name} 
    Description: ${article.plain_description}
    `
      )
      .join('\n')

    const requirementTypesInfo = requirementTypes
      .map(
        (requirementType) => `
    ID: ${requirementType.id}
    Name: ${requirementType.name}
    Description: ${requirementType.description}
    Classification Guidelines: ${requirementType.classification}
    `
      )
      .join('\n')

    return `
    You are tasked with classifying the following legal articles according to predefined requirement types.

    Each requirement type includes a description and classification criteria. Your goal is to analyze the articles and determine which requirement types are reasonably supported by their content.

    ### INSTRUCTIONS ###
    - Analyze the entire list of articles.
    - Return an array with the IDs of all requirement types that are clearly supported by the articles.
    - If no requirement type is appropriate, return an empty array [].
    - Do not include duplicate IDs.
    - Focus on the relevance of article content to the classification guidelines.

    ### REQUIREMENT TYPES ###
    ${requirementTypesInfo}

    ### ARTICLES ###
    ${articlesInfo}
    `
  }
}

export default RequirementTypesIdentifierService
