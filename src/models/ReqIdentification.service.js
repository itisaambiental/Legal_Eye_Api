/**
 * Data model for the req_identifications table.
 * Stores metadata for a requirements identification analysis.
 */
class ReqIdentification {
  /**
     * @param {object} row
     * @param {number} row.id
     * @param {string} row.name
     * @param {string|null} row.description
     * @param {number|null} row.user_id
     * @param {Date} row.created_at
     * @param {string} row.status
     */
  constructor ({ id, name, description, user_id: userId, created_at: createdAt, status }) {
    this.id = id
    this.name = name
    this.description = description
    this.userId = userId
    this.createdAt = createdAt
    this.status = status
  }

  /**
     * Factory: instantiate from a DB row.
     * @param {object} row
     * @returns {ReqIdentification}
     */
  static fromRow (row) {
    return new ReqIdentification({
      id: row.id,
      name: row.name,
      description: row.description,
      user_id: row.user_id,
      created_at: row.created_at,
      status: row.status
    })
  }
}

export default ReqIdentification
