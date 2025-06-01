/**
 * @typedef {Object} Aspect
 * @property {number} aspect_id - The ID of the aspect.
 * @property {string} aspect_name - The name of the aspect.
 */

/**
 * @typedef {Object} Subject
 * @property {number} subject_id - The ID of the subject.
 * @property {string} subject_name - The name of the subject.
 */

/** @typedef {import('./Requirement.model.js').default} Requirement */
/** @typedef {import('./RequirementTypes.model.js').default} RequirementType */
/** @typedef {import('./LegalVerbs.model.js').default} LegalVerb */

/**
 * Class representing a Requirement Identification.
 */
export class ReqIdentification {
  /**
   * Constructs a ReqIdentification instance.
   *
   * @param {number} id
   * @param {string} name
   * @param {string} description
   * @param {number} userId
   * @param {Date} createdAt
   * @param {string} status
   * @param {Subject} subject
   * @param {Aspect[]} aspects
   * @param {string} jurisdiction
   * @param {string} state
   * @param {string} municipality
   */
  constructor (
    id,
    name,
    description,
    userId,
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
    this.userId = userId
    this.createdAt = createdAt
    this.status = status
    this.subject = subject
    this.aspects = aspects
    this.jurisdiction = jurisdiction
    this.state = state
    this.municipality = municipality
  }
}

/**
 * Class representing a Legal Verb translation for a requirement inside a requirement identification.
 */
export class ReqIdentificationRequirementLegalVerb {
  /**
   * Constructs a ReqIdentificationRequirementLegalVerb instance.
   *
   * @param {LegalVerb} legalVerb
   * @param {string} translation
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
   * @param {number} reqIdentificationId
   * @param {Requirement} requirement
   * @param {string} requirementName
   * @param {RequirementType} requirementType
   * @param {ReqIdentificationRequirementLegalVerb[]} legalVerbs
   */
  constructor (
    reqIdentificationId,
    requirement,
    requirementName,
    requirementType,
    legalVerbs
  ) {
    this.reqIdentificationId = reqIdentificationId
    this.requirement = requirement
    this.requirementName = requirementName
    this.requirementType = requirementType
    this.legalVerbs = legalVerbs
  }
}
