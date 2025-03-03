import ErrorUtils from '../../../utils/Error.js'
import openai from '../../../config/openapi.config.js'
import { zodResponseFormat } from 'openai/helpers/zod'
import { ArticleClassificationSchema } from '../../../schemas/identifyRequirements.schema.js'

/**
 * Class for requirement indentifier.
 * Defines methods for analysis and identify requeriment.
 */
class RequirementIdentifier {
  /**
   * @typedef {Object} Article
   * @property {number} id - The unique identifier of the article.
   * @property {number} legal_basis_id - The ID of the legal basis associated with this article.
   * @property {string} article_name - The name/title of the article.
   * @property {string} description - The description or content of the article.
   * @property {number} article_order - The order of the article within the legal basis.
   */

  /**
   * @typedef {Object} LegalBase
   * @property {number} id - The unique identifier of the legal basis.
   * @property {string} legal_name - The name of the legal basis.
   * @property {string} subject - The subject related to the legal basis.
   * @property {string[]} aspects - The aspects covered by the legal basis.
   * @property {string} abbreviation - The abbreviation of the legal basis.
   * @property {string} classification - The classification of the legal basis.
   * @property {string} jurisdiction - The jurisdiction (federal, state, etc.).
   * @property {string} state - The state (if applicable).
   * @property {string} municipality - The municipality (if applicable).
   * @property {string} lastReform - The last reform date.
   * @property {string} url - The URL of the legal document.
   * @property {Article[]} articles - The articles associated with the legal basis.
   */

  /**
   * @typedef {Object} Requirement
   * @property {number} id - The unique identifier of the requirement.
   * @property {string} subject - The subject related to the requirement.
   * @property {string} aspect - The aspect related to the requirement.
   * @property {number} requirement_number - The requirement number.
   * @property {string} requirement_name - The name of the requirement.
   * @property {string} mandatory_description - Description of mandatory conditions.
   * @property {string} complementary_description - Description of complementary conditions.
   * @property {string} mandatory_sentences - List of mandatory sentences.
   * @property {string} complementary_sentences - List of complementary sentences.
   * @property {string} mandatory_keywords - List of keywords for mandatory conditions.
   * @property {string} complementary_keywords - List of keywords for complementary conditions.
   * @property {string} condition - The condition for the requirement.
   * @property {string} evidence - The evidence required for compliance.
   * @property {string} periodicity - The periodicity of compliance.
   * @property {string} requirement_type - The type of requirement (e.g., legal, procedural).
   * @property {string} jurisdiction - The jurisdiction applicable.
   * @property {string} state - The state applicable.
   * @property {string} municipality - The municipality applicable.
   */

  /**
   * Constructs an instance of RequirementIdentifier.
   * @param {LegalBase} legalBase - The legal basis related to the requirements.
   * @param {Requirement} requirement - The list of requirements to be analyzed.
   * @param {string} model - AI model to be used in requirements identification.
   * @param {import("bull").Job} job - The Bull job object used for progress tracking.
   * @param {number} totalTasks - The total number of tasks to process.
   */
  constructor (legalBase, requirement, model, job, totalTasks) {
    if (this.constructor === RequirementIdentifier) {
      throw new Error('Cannot instantiate class RequirementIdentifier')
    }
    this.legalBase = legalBase
    this.requirement = requirement
    this.job = job
    this.model = model
    this.obligatoryArticles = []
    this.complementaryArticles = []
    this.totalTasks = totalTasks
    this.processedTasks = 0
  }

  /**
   * Identifies whether each article is "Obligatory" or "Complementary"
   * based on the requirement conditions.
   * @returns {Promise<{ obligatoryArticles: Article[], complementaryArticles: Article[] }>}
   */
  async identifyRequirements () {
    for (const article of this.legalBase.articles) {
      try {
        const prompt = this._buildIdentifyPrompt(article, this.requirement)
        const { isObligatory, isComplementary } = await this._classifyArticle(
          prompt
        )
        if (isObligatory) {
          this.obligatoryArticles.push(article)
        } else if (isComplementary) {
          this.complementaryArticles.push(article)
        }
        this.processedTasks++
        this.updateProgress()
      } catch (error) {
        continue
      }
    }
    return {
      obligatoryArticles: this.obligatoryArticles,
      complementaryArticles: this.complementaryArticles
    }
  }

  /**
   * Calls OpenAI to classify an article as "Obligatory" or "Complementary".
   * @param {string} prompt - The prompt containing the article and requirement details.
   * @returns {Promise<{ isObligatory: boolean, isComplementary: boolean }>} - An object indicating the classification.
   */
  async _classifyArticle (prompt) {
    const request = {
      model: this.model,
      messages: [
        {
          role: 'system',
          content:
            'You are a legal expert specializing in identifying obligatory and complementary legal requirements.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0,
      response_format: zodResponseFormat(
        ArticleClassificationSchema,
        'article_classification'
      )
    }

    const attemptRequest = async (retryCount = 0) => {
      try {
        const response = await openai.chat.completions.create(request)
        const content = ArticleClassificationSchema.parse(
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
            throw new ErrorUtils(500, 'Article Classification Error', error)
          }
        }
        throw new ErrorUtils(500, 'Article Classification Error', error)
      }
    }

    return attemptRequest()
  }

  /**
   * Constructs the prompt for OpenAI to determine article classification.
   * @param {Article} article - The article to evaluate.
   * @param {Requirement} requirement - The requirement to compare against.
   * @returns {string} - The constructed prompt.
   */
  _buildIdentifyPrompt (article, requirement) {
    return `
          Analyze the following legal article and classify it as "Obligatory" or "Complementary" based on the requirement:
    
          **Article**:
          - ID: ${article.id}
          - Title: ${article.article_name}
          - Description: ${article.description}
    
          **Requirement**:
          - ID: ${requirement.id}
          - Name: ${requirement.requirement_name}
          - Mandatory Description: ${requirement.mandatory_description}
          - Complementary Description: ${requirement.complementary_description}
          
    
          Based on the above, determine if the article is "Obligatory" or "Complementary".
        `
  }

  /**
   * Updates the job progress in Bull based on processed tasks.
   */
  updateProgress () {
    const progress = Math.round((this.processedTasks / this.totalTasks) * 100)
    this.job.progress(progress)
  }
}

export default RequirementIdentifier
