// import ErrorUtils from '../../../utils/Error.js'
// import openai from '../../../config/openapi.config.js'
// import { zodResponseFormat } from 'openai/helpers/zod'
// import { ArticleClassificationSchema } from '../../../schemas/identifyRequirements.schema.js'

// /**
//  * Class for requirement indentifier.
//  * Defines methods for analysis and identify requeriments.
//  */
// class RequirementIdentifier {
//   /**
//    * @typedef {Object} LegalBase
//    * @property {import('../../../models/LegalBasis.model.js').default} legalBase - The legal basis information.
//    * @property {import('../../../models/Article.model.js').default[]} articles - The articles associated with the legal basis.
//    */
//   /**
//    * Constructs an instance of RequirementIdentifier.
//    * @param {LegalBase} legalBase - The legal basis related to the requirements.
//    * @param {import('../../../models/Requirement.model.js').default} requirement - The list of requirements to be analyzed.
//    * @param {string} model - AI model to be used in requirements identification.
//    * @param {import("bull").Job} job - The Bull job object used for progress tracking.
//    * @param {number} totalTasks - The total number of tasks to process.
//    */
//   constructor (legalBase, requirement, model, job, totalTasks) {
//     if (this.constructor === RequirementIdentifier) {
//       throw new Error('Cannot instantiate class RequirementIdentifier')
//     }
//     this.legalBase = legalBase
//     this.requirement = requirement
//     this.job = job
//     this.model = model
//     this.obligatoryArticles = []
//     this.complementaryArticles = []
//     this.totalTasks = totalTasks
//     this.processedTasks = 0
//   }

//   /**
//    * Identifies whether each article is "Obligatory" or "Complementary"
//    * based on the requirement conditions.
//    * @returns {Promise<{ obligatoryArticles: import('../../../models/Article.model.js').default[], complementaryArticles: import('../../../models/Article.model.js').default[] }>}
//    */
//   async identifyRequirements () {
//     for (const article of this.legalBase.articles) {
//       try {
//         const prompt = this._buildIdentifyPrompt(article, this.requirement)
//         const { isObligatory, isComplementary } = await this._classifyArticle(
//           prompt
//         )
//         if (isObligatory) {
//           this.obligatoryArticles.push(article)
//         } else if (isComplementary) {
//           this.complementaryArticles.push(article)
//         }
//         this.processedTasks++
//         this.updateProgress()
//       } catch (error) {
//         continue
//       }
//     }
//     return {
//       obligatoryArticles: this.obligatoryArticles,
//       complementaryArticles: this.complementaryArticles
//     }
//   }

//   /**
//    * Calls OpenAI to classify an article as "Obligatory" or "Complementary".
//    * @param {string} prompt - The prompt containing the article and requirement details.
//    * @returns {Promise<{ isObligatory: boolean, isComplementary: boolean }>} - An object indicating the classification.
//    */
//   async _classifyArticle (prompt) {
//     const request = {
//       model: this.model,
//       messages: [
//         {
//           role: 'system',
//           content:
//             'You are a legal expert specializing in identifying obligatory and complementary legal requirements.'
//         },
//         { role: 'user', content: prompt }
//       ],
//       temperature: 0,
//       response_format: zodResponseFormat(
//         ArticleClassificationSchema,
//         'article_classification'
//       )
//     }

//     const attemptRequest = async (retryCount = 0) => {
//       try {
//         const response = await openai.chat.completions.create(request)
//         const content = ArticleClassificationSchema.parse(
//           JSON.parse(response.choices[0].message.content)
//         )
//         return content
//       } catch (error) {
//         if (error.status === 429) {
//           if (retryCount < 3) {
//             const backoffTime = Math.pow(2, retryCount) * 1000
//             await new Promise((resolve) => setTimeout(resolve, backoffTime))
//             return attemptRequest(retryCount + 1)
//           } else {
//             throw new ErrorUtils(500, 'Article Classification Error', error)
//           }
//         }
//         throw new ErrorUtils(500, 'Article Classification Error', error)
//       }
//     }

//     return attemptRequest()
//   }

//   /**
//    * Constructs the prompt for OpenAI to determine article classification.
//    * @param {import('../../../models/Article.model.js').default} article - The article to evaluate.
//    * @param {import('../../../models/Requirement.model.js').default} requirement - The requirement to compare against.
//    * @returns {string} - The constructed prompt.
//    */
//   _buildIdentifyPrompt (article, requirement) {
//     return `
//           Analyze the following legal article and classify it as "Obligatory" or "Complementary" based on the requirement:

//           **Article**:
//           - ID: ${article.id}
//           - Title: ${article.article_name}
//           - Description: ${article.description}

//           **Requirement**:
//           - ID: ${requirement.id}
//           - Name: ${requirement.requirement_name}
//           - Mandatory Description: ${requirement.mandatory_description}
//           - Complementary Description: ${requirement.complementary_description}

//           Based on the above, determine if the article is "Obligatory" or "Complementary".
//         `
//   }

//   /**
//    * Updates the job progress in Bull based on processed tasks.
//    */
//   updateProgress () {
//     const progress = Math.round((this.processedTasks / this.totalTasks) * 100)
//     this.job.progress(progress)
//   }
// }

// export default RequirementIdentifier
