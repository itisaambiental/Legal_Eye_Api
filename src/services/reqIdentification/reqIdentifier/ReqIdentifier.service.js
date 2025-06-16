import openai from '../../../config/openapi.config.js'
import { reqIdentifierSchema } from '../../../schemas/reqIdentification.schema.js'
import { zodResponseFormat } from 'openai/helpers/zod'
import HttpException from '../../errors/HttpException.js'

/**
 * Service class to identify requirements
 */
class ReqIdentifierService {
  /** @typedef {import('../../../models/Article.model.js').default} Article */
  /** @typedef {import('../../../models/Requirement.model.js').default} Requirement */

  /** @typedef {import('zod').infer<typeof reqIdentifierSchema>} reqIdentifierSchema */

  /**
   * Constructs an instance of ReqIdentifierService.
   * @param {Article} article - The article to be used in requirements identification.
   * @param {Requirement} requirement - The requirement to be used in requirements identification.
   * @param {string} model - AI model to be used in the requirements identification.
   */
  constructor (article, requirement, model) {
    this.article = article
    this.requirement = requirement
    this.model = model
  }

  /**
   * Method to identify requirements based on the provided article.
   * @returns {Promise<reqIdentifierSchema>} The result of the requirement identification.
   */
  async identifyRequirements () {
    const prompt = this._buildIdentifyRequirementsPrompt(
      this.article,
      this.requirement
    )
    const request = {
      model: this.model,
      messages: [
        {
          role: 'system',
          content: [
            'You are a legal expert specialized in regulatory compliance.',
            'Your task is to analyze a legal article written in Spanish and determine whether it is MANDATORY (Obligatorio), COMPLEMENTARY (Complementario), or GENERAL (General) in relation to a given requirement.',
            'You will classify the article based on the provided requirement information.'
          ].join(' ')
        },
        { role: 'user', content: prompt }
      ],
      response_format: zodResponseFormat(reqIdentifierSchema, 'requirements')
    }
    const attemptRequest = async (retryCount = 0) => {
      try {
        const response = await openai.chat.completions.create(request)
        const content = reqIdentifierSchema.parse(
          JSON.parse(response.choices[0].message.content)
        )
        return content
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
   * Builds the prompt for identifying requirements based on the article and requirement.
   * @param {Article} article - The article to be used.
   * @param {Requirement} requirement - The requirement to be used.
   * @return {string} The formatted prompt for the AI model.
   */
  _buildIdentifyRequirementsPrompt (article, requirement) {
    return `
    You are a legal expert specialized in regulatory compliance.

    Your task is to determine the classification of a legal article with respect to a specific legal requirement. The classification can be one of the following:
    - "Obligatorio" The article explicitly and reasonably supports the **mandatory** content of the requirement.
    - "Complementario" The article explicitly and reasonably supports the **complementary** content of the requirement.
    - "General": The article does not explicitly or reasonably support either the mandatory or complementary content of the requirement.

    ### REQUIREMENT INFORMATION ###
    ...
    Requirement name: ${requirement.requirement_name}
    Mandatory description: ${requirement.mandatory_description}
    Complementary description: ${requirement.complementary_description}
    Mandatory legal sentences ${requirement.mandatory_sentences}
    Complementary legal sentences${requirement.complementary_sentences}
    Mandatory keywords: ${requirement.mandatory_keywords}
    Complementary keywords: ${requirement.complementary_keywords}


    ### LEGAL ARTICLE INFORMATION ###
    ...
    Title: ${article.article_name}
    Text: ${article.plain_description}
  `
  }
}

export default ReqIdentifierService
