import { pool } from '../config/db.config.js'
import Role from '../models/Roles.model.js'
import User from '../models/User.model.js'
import ErrorUtils from '../utils/Error.js'

// Class that handles CRUD operations for the User entity in the database
class UserRepository {
  // Creates a new user in the database and returns the generated ID
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

  // Updates the user's password in the database
  static async updateUserPassword (gmail, hashedPassword) {
    const query = `
    UPDATE users
    SET password = ?
    WHERE gmail = ?
  `
    const values = [hashedPassword, gmail]

    try {
      const [result] = await pool.query(query, values)
      return result.affectedRows > 0
    } catch (error) {
      console.error('Error updating user password:', error)
      throw new ErrorUtils(500, 'Error updating user password')
    }
  }

  // Updates an existing user in the database by their ID
  static async update (id, userData) {
    const { name, password, gmail, roleId, profilePicture } = userData

    const query = `
      UPDATE users 
      SET 
        name = IFNULL(?, name), 
        password = IFNULL(?, password), 
        gmail = IFNULL(?, gmail), 
        role_id = IFNULL(?, role_id), 
        profile_picture = IFNULL(?, profile_picture)
      WHERE id = ?
    `

    try {
      const [result] = await pool.query(query, [name, password, gmail, roleId, profilePicture, id])

      if (result.affectedRows === 0) {
        return false
      }

      const updatedUser = await this.findById(id)
      return { success: true, user: updatedUser }
    } catch (error) {
      console.error('Error updating user:', error)
      throw new ErrorUtils(500, 'Error updating user in the database')
    }
  }

  // Update the user's profile picture in the database
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

  // Deletes a user from the database by their ID
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

  // Delete users in the database
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

  // Retrieves a user from the database by their ID
  static async findById (id) {
    const query = `
      SELECT * FROM users WHERE id = ?
    `
    try {
      const [rows] = await pool.query(query, [id])
      if (rows.length === 0) {
        return null
      }
      const user = rows[0]
      return new User(user.id, user.name, user.password, user.gmail, user.role_id, user.profile_picture)
    } catch (error) {
      console.error('Error retrieving user by ID:', error)
      throw new ErrorUtils(500, 'Error retrieving user by ID')
    }
  }

  // Retrieves users from the database using an array of Ids
  static async findByIds (userIds) {
    const query = `
      SELECT id FROM users WHERE id IN (?)
    `

    try {
      const [rows] = await pool.query(query, [userIds])
      return rows.map(row => row.id)
    } catch (error) {
      console.error('Error finding users by IDs:', error)
      throw new ErrorUtils(500, 'Error finding users by IDs')
    }
  }

  // Retrieves users from the database by their role ID
  static async findByRole (roleId) {
    const query = `
    SELECT * FROM users WHERE role_id = ?
  `
    try {
      const [rows] = await pool.query(query, [roleId])
      if (rows.length === 0) {
        return []
      }

      return rows.map(user => new User(user.id, user.name, user.password, user.gmail, user.role_id, user.profile_picture))
    } catch (error) {
      console.error('Error retrieving users by role:', error)
      throw new ErrorUtils(500, 'Error retrieving users by role')
    }
  }

  // Check if a user exists in the database by its ID
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

  // Finds a user in the database by their gmail
  static async findByGmail (gmail) {
    const query = 'SELECT * FROM users WHERE gmail = ?'
    try {
      const [rows] = await pool.query(query, [gmail])
      return rows.length > 0 ? rows[0] : null
    } catch (error) {
      console.error('Error finding user by gmail:', error)
      throw new ErrorUtils(500, 'Error finding user by gmail')
    }
  }

  // Retrieves all users from the database
  static async findAll () {
    const query = `
      SELECT * FROM users
    `
    try {
      const [rows] = await pool.query(query)
      return rows.map(user => new User(user.id, user.name, user.password, user.gmail, user.role_id, user.profile_picture))
    } catch (error) {
      console.error('Error retrieving all users:', error)
      throw new ErrorUtils(500, 'Error retrieving all users')
    }
  }

  // Retrieves all roles from the database
  static async findAllRoles () {
    const query = `
        SELECT * FROM roles
      `
    try {
      const [rows] = await pool.query(query)
      return rows.map(role => new Role(role.id, role.name))
    } catch (error) {
      console.error('Error retrieving all roles:', error)
      throw new ErrorUtils(500, 'Error retrieving all roles')
    }
  }

  // Used for testing
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

  static async getVerificationCode (gmail, code) {
    const query = `
      SELECT * FROM verification_codes
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
