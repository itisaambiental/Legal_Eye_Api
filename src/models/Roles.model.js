/**
 * Class representing a Role.
 * Defines the role of a user within the system.
 */
class Role {
  /**
   * Constructs a Role instance.
   * @param {number} id - The ID of the role.
   * @param {string} role - The name of the role (e.g., 'Admin', 'Analyst').
   */
  constructor (id, role) {
    this.id = id
    this.role = role
  }
}

export default Role
