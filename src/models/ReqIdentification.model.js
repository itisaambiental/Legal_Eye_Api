/**
 * @typedef {Object} Aspect
 * @property {number} aspect_id - The ID of the aspect.
 * @property {string} aspect_name - The name of the aspect.
 * @property {string} [abbreviation] - Optional abbreviation for the aspect.
 * @property {number} [order_index] - Optional order index for the aspect.
 */

/**
 * @typedef {Object} Subject
 * @property {number} subject_id - The ID of the subject.
 * @property {string} subject_name - The name of the subject.
 * @property {string} [abbreviation] - Optional abbreviation for the subject.
 * @property {number} [order_index] - Optional order index for the subject.
 */

/** @typedef {import('./User.model.js').default} User */
/** @typedef {import('./Requirement.model.js').default} Requirement */
/** @typedef {import('./RequirementTypes.model.js').default} RequirementType */
/** @typedef {import('./LegalVerbs.model.js').default} LegalVerb */
/** @typedef {import('./LegalBasis.model.js').default} LegalBasis */
/** @typedef {import('./Article.model.js').default} Article */

/**
 * Class representing an Article associated with a Legal Basis.
 */
export class ReqIdentificationRequirementLegalBasisArticle {
  /**
   * Constructs a ReqIdentificationRequirementLegalBasisArticle instance.
   *
   * @param {Article} article - The article object.
   * @param {string} articleType - Type of the article.
   * @param {number} score - Confidence score assigned to the article.
   */
  constructor (article, articleType, score) {
    this.article = article
    this.articleType = articleType
    this.score = score
  }
}

/**
 * Class representing a Legal Basis associated with a Requirement.
 */
export class ReqIdentificationRequirementLegalBasis {
  /**
   * Constructs a ReqIdentificationRequirementLegalBasis instance.
   *
   * @param {LegalBasis} legalBasis - The legal basis object.
   * @param {ReqIdentificationRequirementLegalBasisArticle[]} articles - List of associated articles.
   */
  constructor (legalBasis, articles) {
    this.legalBasis = legalBasis
    this.articles = articles
  }
}

/**
 * Class representing a Legal Verb translation for a requirement inside a requirement identification.
 */
export class ReqIdentificationRequirementLegalVerb {
  /**
   * Constructs a ReqIdentificationRequirementLegalVerb instance.
   *
   * @param {LegalVerb} legalVerb - The legal verb object.
   * @param {string} translation - The translated verb.
   */
  constructor (legalVerb, translation) {
    this.legalVerb = legalVerb
    this.translation = translation
  }
}
/**
 * Class representing a Requirement inside a specific Requirement Identification.
 */
export class ReqIdentificationRequirement {
  /**
   * Constructs a ReqIdentificationRequirement instance.
   *
   * @param {number} reqIdentificationId - The ID of the parent requirement identification.
   * @param {Requirement} requirement - The requirement object.
   * @param {string} requirementName - The name of the requirement.
   * @param {RequirementType[]} requirementTypes - The types of the requirement.
   * @param {ReqIdentificationRequirementLegalVerb[]} legalVerbs - Translated legal verbs.
   * @param {ReqIdentificationRequirementLegalBasis[]} legalBasis - Associated legal basis.
   */
  constructor (
    reqIdentificationId,
    requirement,
    requirementName,
    requirementTypes,
    legalVerbs,
    legalBasis
  ) {
    this.reqIdentificationId = reqIdentificationId
    this.requirement = requirement
    this.requirementName = requirementName
    this.requirementTypes = requirementTypes
    this.legalVerbs = legalVerbs
    this.legalBasis = legalBasis
  }
}

/**
 * Class representing a Requirement Identification.
 */
export class ReqIdentification {
  /**
   * Constructs a ReqIdentification instance.
   *
   * @param {number} id - The ID of the identification.
   * @param {string} name - The name of the identification.
   * @param {string} description - The description of the identification.
   * @param {User} user - The user who created the identification
   * @param {Date} createdAt - Creation date.
   * @param {string} status - Current status.
   * @param {Subject} subject - The subject.
   * @param {Aspect[]} aspects - List of aspects.
   * @param {string} jurisdiction - Jurisdiction level.
   * @param {string} state - State name if applicable.
   * @param {string} municipality - Municipality name if applicable.
   */
  constructor (
    id,
    name,
    description,
    user,
    createdAt,
    status,
    subject,
    aspects,
    jurisdiction,
    state,
    municipality
  ) {
    this.id = id
    this.name = name
    this.description = description
    this.user = user
    this.createdAt = createdAt
    this.status = status
    this.subject = subject
    this.aspects = aspects
    this.jurisdiction = jurisdiction
    this.state = state
    this.municipality = municipality
  }
}
