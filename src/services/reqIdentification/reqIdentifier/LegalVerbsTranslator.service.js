import openai from '../../../config/openapi.config.js'
import { legalVerbTranslationSchema } from '../../../schemas/reqIdentification.schema.js'
import { zodResponseFormat } from 'openai/helpers/zod'
import HttpException from '../../errors/HttpException.js'

/**
 * Service to translate a requirement(Mandatory Article) into legal verb expressions.
 */
class LegalVerbsTranslatorService {
  /** @typedef {import('../../../models/LegalVerbs.model.js').default} LegalVerb */
  /** @typedef {import('zod').infer<typeof legalVerbTranslationSchema>} LegalVerbTranslation */

  /**
   * Constructs an instance of LegalVerbsTranslatorService.
   * @param {string} requirement - The requirement text to be translated into legal verbs.
   * @param {LegalVerb[]} legalVerbs - The list of available legal verbs to use in translation.
   * @param {string} model - AI model to be used in the translation process.
   */
  constructor (requirement, legalVerbs, model) {
    this.requirement = requirement
    this.legalVerbs = legalVerbs
    this.model = model
  }

  /**
   * Translates a requirement into legal verbs using AI.
   * @returns {Promise<LegalVerbTranslation>} A promise resolving to an array of translated legal verbs.
   * @throws {HttpException} If there is an error during the translation process.
   */
  async translateRequirement () {
    const prompt = this._buildTranslateLegalVerbsPrompt(
      this.requirement,
      this.legalVerbs
    )

    const request = {
      model: this.model,
      messages: [
        {
          role: 'system',
          content: [
            'You are a legal assistant specializing in regulatory translation.',
            'Your task is to create an individual translation of a given legal requirement using **each** of the legal verbs from a provided list.'
          ].join(' ')
        },
        { role: 'user', content: prompt }
      ],
      response_format: zodResponseFormat(
        legalVerbTranslationSchema,
        'legal_verbs'
      )
    }

    const attemptRequest = async (retryCount = 0) => {
      try {
        const response = await openai.chat.completions.create(request)
        const content = legalVerbTranslationSchema.parse(
          JSON.parse(response.choices[0].message.content)
        )
        return content
      } catch (error) {
        if (error.status === 429 && retryCount < 3) {
          const backoffTime = Math.pow(2, retryCount) * 1000
          await new Promise((resolve) => setTimeout(resolve, backoffTime))
          return attemptRequest(retryCount + 1)
        }
        throw new HttpException(500, 'Legal Verbs Translation Error', error)
      }
    }

    return attemptRequest()
  }

  /**
   * Builds the prompt to translate a requirement into legal verbs.
   * @param {string} requirement - The requirement text.
   * @param {LegalVerb[]} legalVerbs - The list of legal verbs to choose from.
   * @returns {string} The formatted prompt for the AI model.
   */
  _buildTranslateLegalVerbsPrompt (requirement, legalVerbs) {
    const legalVerbsInfo = legalVerbs
      .map(
        (legalVerb) => `
    ID: ${legalVerb.id}
    Verb: ${legalVerb.name}
    Description: ${legalVerb.description}
    How translated: ${legalVerb.translation}
    `
      )
      .join('\n')

    return `
    You are given a legal requirement and a list of legal verbs.
    Translate the requirement individually using **each** of the provided legal verbs. 
    Each translation should reflect the logic and intent of the verb while maintaining the original meaning of the requirement.

    ### INSTRUCTIONS ###
    - Analyze the full requirement content.
    - For each legal verb that applies, rewrite the requirement using the logic and intent of the verb.

    ### LEGAL VERBS ###
    ${legalVerbsInfo}

    ### REQUIREMENT TO TRANSLATE ###
    ${requirement}
    `
  }
}

export default LegalVerbsTranslatorService
