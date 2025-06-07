/**
 * Service class to identify requirements
 */
class ReqIdentifierService {
  /** @typedef {import('../../../models/Article.model.js').default} Article */
  /** @typedef {import('../../../models/Requirement.model.js').default} Requirement */

  /**
   * Constructs an instance of ReqIdentifierService.
   * @param {Article} article - The article to be used in requirements identification.
   * @param {Requirement} requirement - The requirement to be used in requirements identification.
   * @param {string} model - AI model to be used in the requirements identification.
   * @param {import("bull").Job} job - The Bull job object used for progress tracking.
   */
  constructor (article, requirement, model, job) {
    this.article = article
    this.requirement = requirement
    this.job = job
    this.model = model
  }

  /**
  * Method to identify requirements based on the provided article.
  */
  async identifyRequirements () {

  }
}

export default ReqIdentifierService
