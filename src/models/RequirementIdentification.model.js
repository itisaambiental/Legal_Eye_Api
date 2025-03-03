import Article from './Article.model.js'
import LegalBasis from './LegalBasis.model.js'
import Requirement from './Requirement.model.js'

/**
 * @typedef {Object} LegalBase
 * @property {LegalBasis} legalBase - The legal basis information.
 * @property {Array<Article>} articles.obligatory - List of obligatory articles.
 * @property {Array<Article>} articles.complementary - List of complementary articles.
 */

/**
 * Class representing a Requirement Identification.
 * Stores details about a requirement identification, its legal basis associates, articles, status, and user information.
 */
class RequirementIdentification {
  /**
   * Constructs a RequirementsIdentification instance.
   * @param {number} identificationId - The ID of the identified requirement process.
   * @param {Requirement} requirement - An instance of the Requirement class.
   * @param {Array<LegalBase>} legalBasis - The legal basis related to the identified requirement, including articles.
   * @param {import('./User.model.js').default} user - The user who initiated the identification process.
   * @param {string} status - The status of the requirements identification ('Active', 'Completed', 'Failed').
   */
  constructor (
    identificationId,
    requirement,
    legalBasis = [],
    user,
    status = 'Active' // Default to 'Active'
  ) {
    this.identificationId = identificationId
    this.requirement = new Requirement(
      requirement.id,
      requirement.subject,
      requirement.aspect,
      requirement.requirement_number,
      requirement.requirement_name,
      requirement.mandatory_description,
      requirement.complementary_description,
      requirement.mandatory_sentences,
      requirement.complementary_sentences,
      requirement.mandatory_keywords,
      requirement.complementary_keywords,
      requirement.condition,
      requirement.evidence,
      requirement.periodicity,
      requirement.requirement_type,
      requirement.jurisdiction,
      requirement.state,
      requirement.municipality
    )

    this.legalBasis = legalBasis.map(lb => {
      const legalBase = new LegalBasis(
        lb.legalBase.id,
        lb.legalBase.legal_name,
        lb.legalBase.subject,
        lb.legalBase.aspects,
        lb.legalBase.abbreviation,
        lb.legalBase.classification,
        lb.legalBase.jurisdiction,
        lb.legalBase.state,
        lb.legalBase.municipality,
        lb.legalBase.lastReform,
        lb.legalBase.url
      )

      return {
        legalBasis: legalBase,
        articles: {
          obligatory: lb.obligatory.map(a => new Article(a)),
          complementary: lb.complementary.map(a => new Article(a))
        }
      }
    })

    this.userId = user.id
    this.userName = user.name
    this.status = status
  }
}

export default RequirementIdentification
