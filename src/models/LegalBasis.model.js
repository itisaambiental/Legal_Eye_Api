// models/LegalBasis.model.js

class LegalBasis {
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
