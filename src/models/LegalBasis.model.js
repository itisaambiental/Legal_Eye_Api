/**
 * Class representing a Legal Basis.
 * Contains details about a legal document, its classification, jurisdiction, and related information.
 */
class LegalBasis {
  /**
   * Constructs a LegalBasis instance.
   * @param {number} id - The ID of the legal basis.
   * @param {string} legalName - The name of the legal document.
   * @param {string} abbreviation - The abbreviation of the legal document.
   * @param {string} classification - The type of legal document (e.g., 'Ley', 'Reglamento').
   * @param {string} jurisdiction - The jurisdiction of the legal document (e.g., 'Estatal', 'Federal').
   * @param {string} state - The state associated with the legal document, if applicable.
   * @param {string} municipality - The municipality associated with the legal document, if applicable.
   * @param {Date} lastReform - The date of the last reform of the legal document.
   * @param {string} url - The URL of the legal document.
   */
  constructor (id, legalName, abbreviation, classification, jurisdiction, state, municipality, lastReform, url) {
    this.id = id
    this.legal_name = legalName
    this.abbreviation = abbreviation
    this.classification = classification
    this.jurisdiction = jurisdiction
    this.state = state
    this.municipality = municipality
    this.lastReform = lastReform
    this.url = url
  }
}

export default LegalBasis
