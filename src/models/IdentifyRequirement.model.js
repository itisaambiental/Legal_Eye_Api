import Article from './Article.model'
import LegalBasis from './LegalBasis.model'
import Requirement from './Requirement.model'

/**
 * @typedef {Object} LegalBase
 * @property {LegalBasis} legalBase - The legal basis information.
 * @property {Array<Article>} articles.obligatory - List of obligatory articles.
 * @property {Array<Article>} articles.complementary - List of complementary articles.
 */

/**
 * Class representing an Identify Requirement.
 * Stores details about a requirement identification, its legal basis associates, and articles.
 */
class IdentifyRequirement {
  /**
   * Constructs an IdentifyRequirement instance.
   * @param {number} identifyRequirementId - The ID of the identified requirement.
   * @param {Requirement} requirement - An instance of the Requirement class.
   * @param {Array<LegalBase>} legalBasis - The legal basis related to the identified requirement, including articles.
   */
  constructor (
    identifyRequirementId,
    requirement,
    legalBasis = []
  ) {
    this.identifyRequirementId = identifyRequirementId
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
  }
}

export default IdentifyRequirement
