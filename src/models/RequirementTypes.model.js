/**
 * Class representing a Requirement Type.
 * Stores information about the different types of requirements,
 * including their name, description, and classification.
 */
class RequirementType {
  /**
     * Constructs a RequirementType instance.
     * @param {number} id - The ID of the requirement type.
     * @param {string} name - The name of the requirement type.
     * @param {string} description - A textual description of the requirement type.
     * @param {string} classification - A long text field defining the classification.
     */
  constructor (id, name, description, classification) {
    this.id = id
    this.name = name
    this.description = description
    this.classification = classification
  }
}

export default RequirementType
