import UserRepository from '../../repositories/User.repository.js'
import bcrypt from 'bcrypt'
import userSchema from '../../validations/userValidation.js'
import loginSchema from '../../validations/loginValidation.js'
import { generatePassword } from '../../utils/generatePassword.js'
import { z } from 'zod'
import ErrorUtils from '../../utils/Error.js'
import emailQueue from '../../workers/emailWorker.js'
import jwt from 'jsonwebtoken'
import { JWT_SECRET, JWT_EXPIRATION } from '../../config/variables.config.js'
import FileService from '../files/File.service.js'
import { getUserData } from '../../utils/microsoftAPICalls.js'
import generateVerificationCode from '../../utils/generateCode.js'
import { addMinutes } from 'date-fns'
import EmailService from '../email/Email.service.js'

/**
 * Service class for handling User operations.
 * Provides methods for user registration, login, retrieval, update, and deletion.
 */
class UserService {
  /**
   * Registers a new user and sends a welcome email.
   * @param {Object} userData - Data for the new user.
   * @param {string} userData.name - User's name.
   * @param {string} userData.gmail - User's Gmail.
   * @param {number} userData.roleId - User's role ID.
   * @param {Object} profilePicture - User's profile picture file (optional).
   * @returns {Promise<Object>} - Registered user data.
   * @throws {ErrorUtils} - If validation fails or user already exists.
   */
  static async registerUser (userData, profilePicture) {
    try {
      const parsedUser = userSchema.parse(userData)

      const existingUser = await UserRepository.findByGmail(parsedUser.gmail)
      if (existingUser) {
        throw new ErrorUtils(400, 'Gmail already exists')
      }

      const password = generatePassword()
      const salt = await bcrypt.genSalt()
      const hashedPassword = await bcrypt.hash(password, salt)

      let profilePictureKey = null
      if (profilePicture) {
        const uploadResponse = await FileService.uploadFile(profilePicture)

        if (uploadResponse.response.$metadata.httpStatusCode === 200) {
          profilePictureKey = uploadResponse.uniqueFileName
        } else {
          throw new ErrorUtils(500, 'Failed to upload profile picture')
        }
      }

      const userId = await UserRepository.create({
        name: parsedUser.name,
        password: hashedPassword,
        gmail: parsedUser.gmail,
        roleId: parsedUser.roleId,
        profilePicture: profilePictureKey
      })

      let profilePictureUrl = null
      if (profilePictureKey) {
        profilePictureUrl = await FileService.getFile(profilePictureKey)
      }

      const emailData = EmailService.generateWelcomeEmail(parsedUser, password)
      await emailQueue.add(emailData)

      return {
        id: userId,
        name: parsedUser.name,
        gmail: parsedUser.gmail,
        roleId: parsedUser.roleId,
        profile_picture: profilePictureUrl
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors = error.errors.map((e) => ({
          field: e.path[0],
          message: e.message
        }))
        throw new ErrorUtils(400, 'Validation failed', validationErrors)
      }

      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Unexpected error during user registration')
    }
  }

  /**
   * Logs in a user by verifying credentials.
   * @param {Object} loginData - User's login data.
   * @param {string} loginData.gmail - User's Gmail.
   * @param {string} loginData.password - User's password.
   * @returns {Promise<Object>} - Object containing JWT token.
   * @throws {ErrorUtils} - If validation fails or credentials are invalid.
   */

  static async loginUser (loginData) {
    try {
      const parsedLoginData = loginSchema.parse(loginData)

      const { gmail, password } = parsedLoginData

      const user = await UserRepository.findByGmail(gmail)
      if (!user) {
        throw new ErrorUtils(401, 'Invalid email or password')
      }

      const correctPassword = await bcrypt.compare(password, user.password)
      if (!correctPassword) {
        throw new ErrorUtils(401, 'Invalid email or password')
      }

      const userForToken = {
        id: user.id,
        gmail: user.gmail,
        username: user.name,
        userType: user.role_id
      }

      const token = jwt.sign(
        { userForToken },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRATION }
      )

      return { token }
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ErrorUtils(401, 'Invalid email or password')
      }
      throw new ErrorUtils(401, 'Invalid email or password')
    }
  }

  /**
   * Logs in a user using Microsoft OAuth.
   * @param {string} accessToken - Microsoft access token.
   * @returns {Promise<Object>} - Object containing JWT token.
   * @throws {ErrorUtils} - If login fails or user does not exist.
   */
  static async microsoftLogin (accessToken) {
    try {
      const userEmail = await getUserData(accessToken)

      const user = await UserRepository.findByGmail(userEmail)
      if (!user) {
        throw new ErrorUtils(401, 'Invalid email')
      }

      const userForToken = {
        id: user.id,
        gmail: user.gmail,
        username: user.name,
        userType: user.role_id
      }

      const token = jwt.sign(
        { userForToken },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRATION }
      )

      return { token }
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }

      throw new ErrorUtils(500, 'Failed to login with Microsoft')
    }
  }

  /**
   * Retrieves all users from the database.
   * @returns {Promise<Array<Object>>} - Array of user objects.
   * @throws {ErrorUtils} - If retrieval fails.
   */
  static async getAllUsers () {
    try {
      const users = await UserRepository.findAll()

      const usersWithProfilePicture = await Promise.all(users.map(async (user) => {
        let profilePictureUrl = null
        if (user.profile_picture) {
          profilePictureUrl = await FileService.getFile(user.profile_picture)
        }
        const { password, ...userWithoutPassword } = user

        return {
          ...userWithoutPassword,
          profile_picture: profilePictureUrl
        }
      }))

      return usersWithProfilePicture
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to retrieve users')
    }
  }

  /**
   * Retrieves all roles from the database.
   * @returns {Promise<Array<Object>>} - Array of role objects.
   * @throws {ErrorUtils} - If retrieval fails.
   */
  static async getAllRoles () {
    try {
      const roles = await UserRepository.findAllRoles()
      return roles
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to retrieve users')
    }
  }

  /**
   * Retrieves a user by their ID.
   * @param {number} id - User's ID.
   * @returns {Promise<Object>} - User object without password.
   * @throws {ErrorUtils} - If user not found or retrieval fails.
   */
  static async getUserById (id) {
    try {
      const userExists = await UserRepository.userExists(id)

      if (!userExists) {
        throw new ErrorUtils(404, 'User not found')
      }

      const user = await UserRepository.findById(id)

      let profilePictureUrl = null
      if (user.profile_picture) {
        profilePictureUrl = await FileService.getFile(user.profile_picture)
      }
      const { password, ..._user } = user

      return {
        ..._user,
        profile_picture: profilePictureUrl
      }
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to retrieve user')
    }
  }

  /**
   * Retrieves users by their role ID.
   * @param {number} roleId - Role ID to filter users by.
   * @returns {Promise<Array<Object>>} - Array of user objects.
   * @throws {ErrorUtils} - If retrieval fails.
   */
  static async getUsersByRole (roleId) {
    try {
      const users = await UserRepository.findByRole(roleId)

      if (users.length === 0) {
        return []
      }

      const usersWithProfilePictures = await Promise.all(users.map(async (user) => {
        let profilePictureUrl = null
        if (user.profile_picture) {
          profilePictureUrl = await FileService.getFile(user.profile_picture)
        }

        const { password, ..._user } = user

        return {
          ..._user,
          profile_picture: profilePictureUrl
        }
      }))

      return usersWithProfilePictures
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to retrieve users by role')
    }
  }

  /**
   * Updates a user's information by ID.
   * @param {number} userId - User's ID.
   * @param {Object} updates - Fields to update.
   * @param {number} currentUserId - ID of the currently logged-in user.
   * @returns {Promise<Object>} - Updated user data and a new token if applicable.
   * @throws {ErrorUtils} - If update fails or user not found.
   */
  static async updateUser (userId, updates, currentUserId) {
    try {
      const validFields = ['name', 'roleId', 'gmail', 'profilePicture']
      const fieldsToUpdate = {}

      for (const key in updates) {
        if (validFields.includes(key)) {
          fieldsToUpdate[key] = updates[key]
        }
      }

      if (Object.keys(fieldsToUpdate).length === 0) {
        throw new ErrorUtils(400, 'No valid fields to update')
      }

      if (fieldsToUpdate.gmail) {
        const existingUser = await UserRepository.findByGmailExcludingUserId(fieldsToUpdate.gmail, userId)
        if (existingUser) {
          throw new ErrorUtils(400, 'Gmail already exists')
        }
      }

      const currentUser = await UserRepository.findById(userId)
      if (!currentUser) {
        throw new ErrorUtils(404, 'User not found')
      }

      if (fieldsToUpdate.profilePicture == null) {
        fieldsToUpdate.profilePicture = null
      } else if (typeof fieldsToUpdate.profilePicture === 'string') {
        fieldsToUpdate.profilePicture = currentUser.profile_picture
      } else {
        const uploadResponse = await FileService.uploadFile(fieldsToUpdate.profilePicture)
        if (uploadResponse.response.$metadata.httpStatusCode === 200) {
          fieldsToUpdate.profilePicture = uploadResponse.uniqueFileName
        } else {
          throw new ErrorUtils(500, 'Failed to upload profile picture')
        }
      }

      const updatedUser = await UserRepository.update(userId, fieldsToUpdate)
      if (!updatedUser) {
        throw new ErrorUtils(404, 'User not found')
      }

      let profilePictureUrl = null
      if (updatedUser.user.profile_picture) {
        profilePictureUrl = await FileService.getFile(updatedUser.user.profile_picture)
      }

      const { password, ...userWithoutPassword } = updatedUser.user
      let token = null

      if (Number(userId) === Number(currentUserId)) {
        const userForToken = {
          id: updatedUser.user.id,
          gmail: updatedUser.user.gmail,
          username: updatedUser.user.name,
          userType: updatedUser.user.roleId
        }
        token = jwt.sign({ userForToken }, JWT_SECRET, { expiresIn: JWT_EXPIRATION })
      }

      return {
        updatedUser: {
          ...userWithoutPassword,
          profile_picture: profilePictureUrl
        },
        token
      }
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to update user')
    }
  }

  /**
   * Updates a user's profile picture.
   * @param {number} userId - User's ID.
   * @param {Object} profilePicture - New profile picture file.
   * @returns {Promise<string>} - URL of the updated profile picture.
   * @throws {ErrorUtils} - If update fails.
   */
  static async updateUserPicture (userId, profilePicture) {
    try {
      const uploadResponse = await FileService.uploadFile(profilePicture)

      if (uploadResponse.response.$metadata.httpStatusCode !== 200) {
        throw new ErrorUtils(500, 'Failed to upload profile picture')
      }
      const profilePictureKey = uploadResponse.uniqueFileName
      const savePicture = await UserRepository.updateProfilePicture(userId, profilePictureKey)

      if (!savePicture) {
        throw new ErrorUtils(404, 'User not found')
      }

      const profilePictureUrl = await FileService.getFile(profilePictureKey)

      return profilePictureUrl
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }

      throw new ErrorUtils(500, 'Failed to update user picture')
    }
  }

  /**
   * Deletes a user by their ID.
   * @param {number} id - User's ID.
   * @returns {Promise<boolean>} - True if user was deleted.
   * @throws {ErrorUtils} - If user not found or deletion fails.
   */
  static async deleteUser (id) {
    try {
      const userDeleted = await UserRepository.delete(id)

      if (!userDeleted) {
        throw new ErrorUtils(404, 'User not found')
      }

      return userDeleted
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to delete user')
    }
  }

  /**
   * Deletes multiple users by their IDs.
   * @param {Array<number>} userIds - Array of user IDs to delete.
   * @returns {Promise<Object>} - Success message if users were deleted.
   * @throws {ErrorUtils} - If users not found or deletion fails.
   */
  static async deleteUsersBatch (userIds) {
    try {
      const existingUsers = await UserRepository.findByIds(userIds)

      if (existingUsers.length !== userIds.length) {
        const notFoundIds = userIds.filter(id => !existingUsers.includes(id))
        throw new ErrorUtils(404, `Users not found for IDs: ${notFoundIds.join(', ')}`)
      }

      await UserRepository.deleteBatch(userIds)

      return { success: true }
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to delete users')
    }
  }

  /**
   * Checks if a user is authorized as an admin.
   * @param {number} userId - User's ID.
   * @returns {Promise<boolean>} - True if the user is authorized.
   * @throws {ErrorUtils} - If check fails.
   */

  static async isAuthorized (userId) {
    try {
      const user = await UserRepository.findById(userId)
      if (!user) {
        return false
      }
      return user.roleId === 1
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to check authorization')
    }
  }

  /**
   * Checks if a user can access another user's data.
   * @param {number} requestingUserId - ID of the requesting user.
   * @param {number} targetUserId - ID of the target user.
   * @returns {Promise<boolean>} - True if the user can access the target user's data.
   * @throws {ErrorUtils} - If check fails.
   */
  static async canAccessUser (requestingUserId, targetUserId) {
    try {
      const requestingUser = await UserRepository.findById(requestingUserId)

      if (!requestingUser) {
        return false
      }

      if (requestingUser.roleId === 1 || requestingUserId === parseInt(targetUserId, 10)) {
        return true
      }

      return false
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Authorization failed')
    }
  }

  /**
   * Requests a password reset by generating a verification code.
   * @param {string} gmail - User's Gmail.
   * @returns {Promise<void>}
   * @throws {ErrorUtils} - If code generation or email sending fails.
   */
  static async requestPasswordReset (gmail) {
    try {
      const verificationCode = generateVerificationCode()

      const expiresAt = addMinutes(new Date(), 1)

      await UserRepository.saveVerificationCode({ gmail, code: verificationCode, expiresAt })

      const emailData = EmailService.generatePasswordResetEmail(gmail, verificationCode)

      await emailQueue.add(emailData)
    } catch (error) {
      throw new ErrorUtils(500, 'Failed to send verification code')
    }
  }

  /**
   * Verifies the password reset code and generates a new password.
   * @param {string} gmail - User's Gmail.
   * @param {string} code - Verification code.
   * @returns {Promise<boolean>} - True if verification is successful.
   * @throws {ErrorUtils} - If verification or password update fails.
   */
  static async verifyPasswordResetCode (gmail, code) {
    try {
      const verification = await UserRepository.getVerificationCode(gmail, code)

      if (!verification) {
        return false
      }

      const { expiresAt } = verification
      const currentTime = new Date()

      if (currentTime > expiresAt) {
        return false
      }

      const password = generatePassword()
      const salt = await bcrypt.genSalt()
      const hashedPassword = await bcrypt.hash(password, salt)

      const userUpdated = await UserRepository.updateUserPassword(gmail, hashedPassword)

      if (!userUpdated) {
        throw new ErrorUtils(500, 'Failed to update user password')
      }

      const emailData = EmailService.generatePasswordResetEmailSend(gmail, password)
      await emailQueue.add(emailData)

      return true
    } catch (error) {
      throw new ErrorUtils(500, 'Failed verifying verification code')
    }
  }
}

export default UserService
