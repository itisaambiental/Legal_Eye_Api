import UserRepository from '../repositories/User.repository.js'
import bcrypt from 'bcrypt'
import userSchema from '../validations/userValidation.js'
import loginSchema from '../validations/loginValidation.js'
import { generatePassword } from '../utils/generatePassword.js'
import { z } from 'zod'
import ErrorUtils from '../utils/Error.js'
import emailQueue from '../workers/emailWorker.js'
import { generateWelcomeEmail, generatePasswordResetEmail, generatePasswordResetEmailSend } from '../utils/EmailFunctions.js'
import jwt from 'jsonwebtoken'
import { JWT_SECRET, JWT_EXPIRATION } from '../config/variables.config.js'
import FileService from '../services/File.service.js'
import { getUserData } from '../utils/microsoftAPICalls.js'
import generateVerificationCode from '../utils/generateCode.js'
import { addMinutes } from 'date-fns'

// Class to handle user
class UserService {
  // User register
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

      const emailData = generateWelcomeEmail(parsedUser, password)
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

      throw error
    }
  }

  // User login
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

  // Microsoft login
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

  // Retrieve all users
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

  // Retrieve all roles
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

  // Retrieve a user by ID
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

  // Retrieve users by role ID
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

  // Update a user's information by ID
  static async updateUser (userId, updates) {
    try {
      const validFields = ['name', 'roleId']
      const fieldsToUpdate = {}

      for (const key in updates) {
        if (validFields.includes(key)) {
          fieldsToUpdate[key] = updates[key]
        }
      }

      if (Object.keys(fieldsToUpdate).length === 0) {
        throw new ErrorUtils(400, 'No valid fields to update')
      }

      const updatedUser = await UserRepository.update(userId, fieldsToUpdate)

      if (!updatedUser.success) {
        throw new ErrorUtils(404, 'User not found')
      }

      return updatedUser.user
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }

      throw new ErrorUtils(500, 'Failed to update user')
    }
  }

  // Function to update a user's profile picture
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

  // Delete a user by ID
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

  // Delete using an array of Ids
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

  // Check if user is authorized
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

  // Check if user can access another user
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

  static async requestPasswordReset (gmail) {
    try {
      const verificationCode = generateVerificationCode()

      const expiresAt = addMinutes(new Date(), 1)

      await UserRepository.saveVerificationCode({ gmail, code: verificationCode, expiresAt })

      const emailData = generatePasswordResetEmail(gmail, verificationCode)

      await emailQueue.add(emailData)
    } catch (error) {
      throw new ErrorUtils(500, 'Failed to send verification code')
    }
  }

  // Verifies if the provided code for a given email is valid and not expired, then generates a new password
  static async verifyPasswordResetCode (gmail, code) {
    try {
      const verification = await UserRepository.getVerificationCode(gmail, code)

      if (!verification) {
        throw new ErrorUtils(400, 'Invalid verification code')
      }

      // eslint-disable-next-line camelcase
      const { expires_at } = verification
      const currentTime = new Date()

      // eslint-disable-next-line camelcase
      if (currentTime > expires_at) {
        throw new ErrorUtils(400, 'Verification code has expired')
      }

      // The verification code is valid, generate a new password
      const password = generatePassword()
      const salt = await bcrypt.genSalt()
      const hashedPassword = await bcrypt.hash(password, salt)

      const userUpdated = await UserRepository.updateUserPassword(gmail, hashedPassword)

      if (!userUpdated) {
        throw new ErrorUtils(500, 'Failed to update user password')
      }

      const emailData = generatePasswordResetEmailSend(gmail, password)
      await emailQueue.add(emailData)

      return true
    } catch (error) {
      throw new ErrorUtils(500, 'Failed verifying verification code')
    }
  }
}

export default UserService
