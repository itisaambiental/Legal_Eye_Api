import { pool } from '../config/db.config.js'
import Role from '../models/Roles.model.js'
import User from '../models/User.model.js'
import ErrorUtils from '../utils/Error.js'

/**
 * Repository class for handling database operations related to Users.
 * Provides CRUD functionality for the 'users' and 'roles' tables.
 */

class UserRepository {
  /**
   * Creates a new user in the database and returns the generated ID.
   * @param {Object} userData - User data to be inserted.
   * @param {string} userData.name - User's name.
   * @param {string} userData.password - User's hashed password.
   * @param {string} userData.gmail - User's email address.
   * @param {number} userData.roleId - ID of the user's role.
   * @param {string} userData.profilePicture - URL of the user's profile picture.
   * @returns {Promise<number>} - The ID of the created user.
   * @throws {ErrorUtils} - If an error occurs during user creation.
   */
  static async create (userData) {
    const { name, password, gmail, roleId, profilePicture } = userData
    const query = `
      INSERT INTO users (name, password, gmail, role_id, profile_picture) 
      VALUES (?, ?, ?, ?, ?)
    `
    try {
      const [result] = await pool.query(query, [name, password, gmail, roleId, profilePicture])
      return result.insertId
    } catch (error) {
      console.error('Error creating user:', error)
      throw new ErrorUtils(500, 'Error creating user in the database')
    }
  }

  /**
   * Updates the user's password in the database.
   * @param {string} gmail - User's email address.
   * @param {string} hashedPassword - The new hashed password.
   * @returns {Promise<boolean>} - True if the password was updated, otherwise false.
   * @throws {ErrorUtils} - If an error occurs during the update.
   */
  static async updateUserPassword (gmail, hashedPassword) {
    const query = `
    UPDATE users
    SET password = ?
    WHERE gmail = ?
  `
    const values = [hashedPassword, gmail]

    try {
      const [rows] = await pool.query(query, values)
      if (rows.affectedRows === 0) {
        return false
      }
      return true
    } catch (error) {
      console.error('Error updating user password:', error)
      throw new ErrorUtils(500, 'Error updating user password')
    }
  }

  /**
   * Updates an existing user in the database by their ID.
   * @param {number} id - User's ID.
   * @param {Object} userData - User data to be updated.
   * @param {string} [userData.name] - New name for the user.
   * @param {string} [userData.password] - New hashed password for the user.
   * @param {string} [userData.gmail] - New Gmail address for the user.
   * @param {number} [userData.roleId] - New role ID for the user.
   * @param {string} [userData.profilePicture] - New profile picture URL.
   * @returns {Promise<Object|null>} - Updated user data without the password or null if not found.
   * @throws {ErrorUtils} - If an error occurs during the update.
   */
  static async update (id, userData) {
    const { name, password, gmail, roleId, profilePicture } = userData
    const query = `
      UPDATE users 
      SET 
        name = IFNULL(?, name), 
        password = IFNULL(?, password), 
        gmail = IFNULL(?, gmail), 
        role_id = IFNULL(?, role_id), 
        profile_picture = ?
      WHERE id = ?
    `
    try {
      const [result] = await pool.query(query, [name, password, gmail, roleId, profilePicture, id])
      if (result.affectedRows === 0) {
        return null
      }
      const updatedUser = await this.findById(id)
      const { password: userPassword, ...userWithoutPassword } = updatedUser
      return { user: userWithoutPassword }
    } catch (error) {
      console.error('Error updating user:', error)
      throw new ErrorUtils(500, 'Error updating user in the database')
    }
  }

  /**
   * Updates the user's profile picture in the database.
   * @param {number} id - User's ID.
   * @param {string} profilePicture - New profile picture URL.
   * @returns {Promise<boolean>} - True if the profile picture was updated, otherwise false.
   * @throws {ErrorUtils} - If an error occurs during the update.
   */
  static async updateProfilePicture (id, profilePicture) {
    const query = `
    UPDATE users
    SET profile_picture = ?
    WHERE id = ?
  `
    try {
      const [result] = await pool.query(query, [profilePicture, id])

      if (result.affectedRows === 0) {
        return false
      }
      return true
    } catch (error) {
      console.error('Error updating user profile picture:', error)
      throw new ErrorUtils(500, 'Error updating profile picture in the database')
    }
  }

  /**
   * Deletes a user from the database by their ID.
   * @param {number} id - User's ID to delete.
   * @returns {Promise<boolean>} - True if the user was deleted, otherwise false.
   * @throws {ErrorUtils} - If an error occurs during the deletion.
   */
  static async delete (id) {
    const query = `
        DELETE FROM users WHERE id = ?
      `
    try {
      const [result] = await pool.query(query, [id])
      if (result.affectedRows === 0) {
        return false
      }
      return true
    } catch (error) {
      console.error('Error deleting user:', error)
      throw new ErrorUtils(500, 'Error deleting user from the database')
    }
  }

  /**
   * Deletes multiple users from the database using an array of IDs.
   * @param {Array<number>} userIds - Array of user IDs to delete.
   * @returns {Promise<boolean>} - True if users were deleted, otherwise false.
   * @throws {ErrorUtils} - If an error occurs during the deletion.
   */
  static async deleteBatch (userIds) {
    const query = `
      DELETE FROM users WHERE id IN (?)
    `

    try {
      const [result] = await pool.query(query, [userIds])

      if (result.affectedRows === 0) {
        return false
      }

      return true
    } catch (error) {
      console.error('Error deleting users:', error)
      throw new ErrorUtils(500, 'Error deleting users from the database')
    }
  }

  /**
   * Finds a user in the database by their ID.
   * @param {number} id - User's ID to find.
   * @returns {Promise<User|null>} - The found user or a empty array if not found.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async findById (id) {
    const query = `
      SELECT * FROM users WHERE id = ?
    `
    try {
      const [rows] = await pool.query(query, [id])
      if (rows.length === 0) return null
      const user = rows[0]
      return new User(user.id, user.name, user.password, user.gmail, user.role_id, user.profile_picture)
    } catch (error) {
      console.error('Error retrieving user by ID:', error)
      throw new ErrorUtils(500, 'Error retrieving user by ID')
    }
  }

  /**
 * Finds users in the database using an array of IDs.
 * Constructs and returns instances of User.
 * @param {Array<number>} userIds - Array of user IDs to find.
 * @returns {Promise<Array<User>>} - Array of User instances with relevant data.
 * @throws {ErrorUtils} - If an error occurs during retrieval.
 */
  static async findByIds (userIds) {
    const query = `
    SELECT * FROM users WHERE id IN (?)
  `

    try {
      const [rows] = await pool.query(query, [userIds])
      return rows.map(user => new User(user.id, user.name, user.password, user.gmail, user.role_id, user.profile_picture))
    } catch (error) {
      console.error('Error finding users by IDs:', error)
      throw new ErrorUtils(500, 'Error finding users by IDs')
    }
  }

  /**
   * Retrieves users from the database by their role ID.
   * @param {number} roleId - The role ID to filter users by.
   * @returns {Promise<Array<User|null>>} - Array of users with the specified role ID.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async findByRole (roleId) {
    const query = `
      SELECT * FROM users WHERE role_id = ?
    `
    try {
      const [rows] = await pool.query(query, [roleId])
      if (rows.length === 0) return null
      return rows.map(user => new User(user.id, user.name, user.password, user.gmail, user.role_id, user.profile_picture))
    } catch (error) {
      console.error('Error retrieving users by role:', error)
      throw new ErrorUtils(500, 'Error retrieving users by role')
    }
  }

  /**
   * Checks if a user exists in the database by their ID.
   * @param {number} id - User's ID to check.
   * @returns {Promise<boolean>} - True if the user exists, otherwise false.
   * @throws {ErrorUtils} - If an error occurs during the check.
   */
  static async userExists (id) {
    const query = `
      SELECT 1 FROM users WHERE id = ?
    `
    try {
      const [rows] = await pool.query(query, [id])
      return rows.length > 0
    } catch (error) {
      console.error('Error checking if user exists by ID:', error)
      throw new ErrorUtils(500, 'Error checking if user exists by ID')
    }
  }

  /**
   * Finds a user in the database by their Gmail.
   * @param {string} gmail - User's Gmail to find.
   * @returns {Promise<User|null>} - The found user or null if not found.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async findByGmail (gmail) {
    const query = 'SELECT * FROM users WHERE gmail = ?'
    try {
      const [rows] = await pool.query(query, [gmail])
      if (rows.length === 0) return null
      const user = rows[0]
      return new User(user.id, user.name, user.password, user.gmail, user.role_id, user.profile_picture)
    } catch (error) {
      console.error('Error finding user by gmail:', error)
      throw new ErrorUtils(500, 'Error finding user by gmail')
    }
  }

  /**
 * Finds a user in the database by their Gmail, excluding a specific user ID.
 * @param {string} gmail - User's Gmail to find.
 * @param {number} excludeUserId - User ID to exclude from the search.
 * @returns {Promise<User|null>} - The found user or null if not found.
 * @throws {ErrorUtils} - If an error occurs during retrieval.
 */
  static async findByGmailExcludingUserId (gmail, excludeUserId) {
    const query = 'SELECT * FROM users WHERE gmail = ? AND id != ?'

    try {
      const [rows] = await pool.query(query, [gmail, excludeUserId])
      if (rows.length === 0) return null
      const user = rows[0]
      return new User(user.id, user.name, user.password, user.gmail, user.role_id, user.profile_picture)
    } catch (error) {
      console.error('Error finding user by Gmail excluding user ID:', error.message)
      throw new ErrorUtils(500, 'Error finding user by Gmail excluding user ID')
    }
  }

  /**
   * Retrieves all users from the database.
   * @returns {Promise<Array<User|null>>} - Array of all users.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async findAll () {
    const query = `
      SELECT * FROM users
    `
    try {
      const [rows] = await pool.query(query)
      if (rows.length === 0) return null
      return rows.map(user => new User(user.id, user.name, user.password, user.gmail, user.role_id, user.profile_picture))
    } catch (error) {
      console.error('Error retrieving all users:', error)
      throw new ErrorUtils(500, 'Error retrieving all users')
    }
  }

  /**
   * Retrieves all roles from the database.
   * @returns {Promise<Array<Role|null>>} - Array of all roles.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */

  static async findAllRoles () {
    const query = `
        SELECT * FROM roles
      `
    try {
      const [rows] = await pool.query(query)
      if (rows.length === 0) return null
      return rows.map(role => new Role(role.id, role.name))
    } catch (error) {
      console.error('Error retrieving all roles:', error)
      throw new ErrorUtils(500, 'Error retrieving all roles')
    }
  }

  /**
   * Deletes all users from the database except one specified by Gmail.
   * Its used only for testing.
   * @param {string} gmail - Gmail of the user to exclude from deletion.
   * @returns {Promise<number>} - Number of affected rows.
   * @throws {ErrorUtils} - If an error occurs during deletion.
   */
  static async deleteAllExceptByGmail (gmail) {
    const query = `
      DELETE FROM users WHERE gmail != ?
    `
    try {
      const [result] = await pool.query(query, [gmail])
      return result.affectedRows
    } catch (error) {
      console.error('Error deleting all users except one by gmail:', error)
      throw new ErrorUtils(500, 'Error deleting users from the database')
    }
  }
  /**
   * Saves a verification code to the database.
   * @param {Object} data - Verification code data.
   * @param {string} data.gmail - Gmail associated with the code.
   * @param {string} data.code - The verification code.
   * @param {Date} data.expiresAt - Expiration date of the code.
   * @returns {Promise<void>}
   * @throws {ErrorUtils} - If an error occurs during insertion.
   */

  static async saveVerificationCode ({ gmail, code, expiresAt }) {
    const query = `
      INSERT INTO verification_codes (gmail, code, expires_at)
      VALUES (?, ?, ?)
    `
    const values = [gmail, code, expiresAt]
    try {
      await pool.query(query, values)
    } catch (error) {
      console.error('Error saving verification code to database:', error)
      throw new ErrorUtils(500, 'Error saving verification code to database')
    }
  }

  /**
   * Retrieves a verification code from the database.
   * @param {string} gmail - Gmail associated with the code.
   * @param {string} code - The verification code.
   * @returns {Promise<Object|null>} - The verification code object or null if not found.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async getVerificationCode (gmail, code) {
    const query = `
      SELECT id, gmail, code, expires_at AS expiresAt
      FROM verification_codes
      WHERE gmail = ? AND code = ?
    `
    const values = [gmail, code]

    try {
      const [result] = await pool.query(query, values)
      return result[0]
    } catch (error) {
      console.error('Error retrieving verification code from database:', error)
      throw new ErrorUtils(500, 'Error retrieving verification code from database')
    }
  }
}

export default UserRepository
