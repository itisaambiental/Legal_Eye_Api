import { pool } from '../config/db.config.js'
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

  // Updates an existing user in the database by their ID
  static async update (id, userData) {
    const { name, password, gmail, roleId, profilePicture } = userData
    const query = `
      UPDATE users 
      SET name = ?, password = ?, gmail = ?, role_id = ?, profile_picture = ?
      WHERE id = ?
    `
    try {
      await pool.query(query, [name, password, gmail, roleId, profilePicture, id])
      return true
    } catch (error) {
      console.error('Error updating user:', error)
      throw new ErrorUtils(500, 'Error updating user in the database')
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
        throw new ErrorUtils(404, 'User not found')
      }
      return true
    } catch (error) {
      console.error('Error deleting user:', error)
      throw new ErrorUtils(500, 'Error deleting user from the database')
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
}

export default UserRepository
