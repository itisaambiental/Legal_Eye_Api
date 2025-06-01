/**
 * Class representing a Legal Verb.
 */
class LegalVerb {
  /**
     * Constructs a LegalVerb instance.
     * @param {number} id - The ID of the legal verb.
     * @param {string} name - The name of the legal verb.
     * @param {string} description - A textual description of the legal verb.
     * @param {string} translation - A long text field defining the translation.
     */
  constructor (id, name, description, translation) {
    this.id = id
    this.name = name
    this.description = description
    this.translation = translation
  }
}

export default LegalVerb
