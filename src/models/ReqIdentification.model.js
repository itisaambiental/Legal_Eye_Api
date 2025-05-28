/**
 * Class representing a Requirement Identification.
 * Contains details about a requirement identification.
 */
class ReqIdentification {
  /**
   * Constructs a ReqIdentification instance.
   * @param {number} id - The unique ID of the requirement identification.
   * @param {string} name - The name of the requirement identification.
   * @param {string|null} description - Optional description for the requirement identification.
   * @param {number|null} userId - The user ID of the creator (nullable).
   * @param {Date} createdAt - The creation date of the identification.
   * @param {string} status - The current status.
   */
  constructor (id, name, description, userId, createdAt, status) {
    this.id = id
    this.name = name
    this.description = description
    this.userId = userId
    this.createdAt = createdAt
    this.status = status
  }
}

export default ReqIdentification
