/**
 * Class representing a User.
 */
class User {
  /**
   * Constructs a User instance.
   * @param {number} id - The ID of the user.
   * @param {string} name - The name of the user.
   * @param {string} password - The hashed password of the user.
   * @param {string} gmail - The Gmail address of the user.
   * @param {number} roleId - The ID of the role associated with the user.
   * @param {string} profilePicture - The URL of the user's profile picture.
   */
  constructor (id, name, password, gmail, roleId, profilePicture) {
    this.id = id
    this.name = name
    this.password = password
    this.gmail = gmail
    this.roleId = roleId
    this.profile_picture = profilePicture
  }
}

export default User
