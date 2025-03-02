/**
 * Class representing an Identify Requirement.
 * Stores details about a requirement identification, its legal basis associates, and articles.
 */
class IdentifyRequirement {
  /**
     * Constructs an IdentifyRequirement instance.
     * @param {number} identifyRequirementId - The ID of the identified requirement.
     * @param {number} requirementId - The ID of the original requirement.
     * @param {string} requirementNumber - The unique number of the requirement.
     * @param {string} requirementName - The name of the requirement.
     * @param {string} mandatoryDescription - The mandatory description of the requirement.
     * @param {string} complementaryDescription - The complementary description of the requirement.
     * @param {string} mandatorySentences - The mandatory sentences related to the requirement.
     * @param {string} complementarySentences - The complementary sentences related to the requirement.
     * @param {string} mandatoryKeywords - The mandatory keywords associated with the requirement.
     * @param {string} complementaryKeywords - The complementary keywords associated with the requirement.
     * @param {string} requirementCondition - The condition of the requirement ('Crítica', 'Operativa', etc.).
     * @param {string} evidence - The evidence type required ('Trámite', 'Registro', etc.).
     * @param {string} periodicity - The periodicity of the requirement ('Anual', 'Única vez', etc.).
     * @param {string} requirementType - The type of requirement.
     * @param {string} jurisdiction - The jurisdiction ('Federal', 'Estatal', 'Local').
     * @param {string} state - The state associated with the requirement, if applicable.
     * @param {string} municipality - The municipality associated with the requirement, if applicable.
     * @param {Object} legalBasis - The legal basis related to the identified requirement.
     * @param {number} legalBasis.id - The ID of the legal basis.
     * @param {string} legalBasis.legal_name - The name of the legal basis.
     * @param {Object} legalBasis.articles - The articles associated with the legal basis.
     * @param {Array<Object>} legalBasis.articles.obligatory - List of obligatory articles.
     * @param {number} legalBasis.articles.obligatory[].articleId - The ID of the obligatory article.
     * @param {string} legalBasis.articles.obligatory[].articleName - The name of the obligatory article.
     * @param {Array<Object>} legalBasis.articles.complementary - List of complementary articles.
     * @param {number} legalBasis.articles.complementary[].articleId - The ID of the complementary article.
     * @param {string} legalBasis.articles.complementary[].articleName - The name of the complementary article.
     */
  constructor (
    identifyRequirementId,
    requirementId,
    requirementNumber,
    requirementName,
    mandatoryDescription,
    complementaryDescription,
    mandatorySentences,
    complementarySentences,
    mandatoryKeywords,
    complementaryKeywords,
    requirementCondition,
    evidence,
    periodicity,
    requirementType,
    jurisdiction,
    state,
    municipality,
    legalBasis
  ) {
    this.identifyRequirementId = identifyRequirementId
    this.requirementId = requirementId
    this.requirementNumber = requirementNumber
    this.requirementName = requirementName
    this.mandatoryDescription = mandatoryDescription
    this.complementaryDescription = complementaryDescription
    this.mandatorySentences = mandatorySentences
    this.complementarySentences = complementarySentences
    this.mandatoryKeywords = mandatoryKeywords
    this.complementaryKeywords = complementaryKeywords
    this.requirementCondition = requirementCondition
    this.evidence = evidence
    this.periodicity = periodicity
    this.requirementType = requirementType
    this.jurisdiction = jurisdiction
    this.state = state
    this.municipality = municipality
    this.legalBasis = {
      id: legalBasis.id,
      legal_name: legalBasis.legal_name,
      articles: {
        obligatory: legalBasis.articles.obligatory.map(article => ({
          articleId: article.articleId,
          articleName: article.articleName
        })),
        complementary: legalBasis.articles.complementary.map(article => ({
          articleId: article.articleId,
          articleName: article.articleName
        }))
      }
    }
  }
}

export default IdentifyRequirement
