/**
 * Class representing a Requirements Identification.
 * This model manages the grouping of evaluated requirements, including analysis name, description, status, and associated user.
 */
class RequirementsIdentification {
  /**
     * Constructs a RequirementsIdentification instance.
     * @param {number} id - The ID of the requirements identification.
     * @param {string} identificationName - The name of the identification/analysis.
     * @param {string} identificationDescription - Description of the analysis.
     * @param {string} status - The status of the analysis ('Active', 'Completed', 'Failed').
     * @param {number|null} userId - The ID of the user who created the analysis.
     * @param {Date} createdAt - The timestamp when the analysis was created.
     */
  constructor (
    id,
    identificationName,
    identificationDescription,
    status,
    userId,
    createdAt
  ) {
    this.id = id
    this.identification_name = identificationName
    this.identification_description = identificationDescription
    this.status = status
    this.user_id = userId
    this.created_at = createdAt
  }
}

export default RequirementsIdentification
