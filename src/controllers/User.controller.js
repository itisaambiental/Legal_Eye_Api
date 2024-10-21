/**
 * Controller for user-related operations.
 * Handles login, registration, retrieval, update, and deletion of users.
 * @module UserController
 */

import UserService from '../services/users/User.service.js'
import ErrorUtils from '../utils/Error.js'
import jsonwebtoken from 'jsonwebtoken'
import { JWT_SECRET } from '../config/variables.config.js'

/**
 * Handle user login.
 * @function loginUser
 * @param {Object} req - Request object, expects { gmail, password } in body.
 * @param {Object} res - Response object.
 */
export const loginUser = async (req, res) => {
  const { gmail, password } = req.body

  if (!gmail || !password) {
    return res.status(400).json({
      message: 'Missing required fields: gmail, password'
    })
  }

  try {
    const { token } = await UserService.loginUser(req.body)

    return res.status(200).json({
      status: 'ok',
      message: 'Logged in successfully',
      token
    })
  } catch (error) {
    if (error instanceof ErrorUtils) {
      return res.status(error.status).json({
        message: error.message,
        ...(error.errors && { errors: error.errors })
      })
    }
    return res.status(500).json({ message: 'Internal Server Error' })
  }
}

/**
 * Handle user login via Microsoft Auth.
 * @function loginUserMicrosoftAuth
 * @param {Object} req - Request object, expects { accessToken } in body.
 * @param {Object} res - Response object.
 */
export const loginUserMicrosoftAuth = async (req, res) => {
  const { accessToken } = req.body

  if (!accessToken) {
    return res.status(400).json({
      message: 'Missing required field: access_token'
    })
  }

  try {
    const { token } = await UserService.microsoftLogin(accessToken)

    return res.status(200).json({
      status: 'ok',
      message: 'Logged in successfully',
      token
    })
  } catch (error) {
    if (error instanceof ErrorUtils) {
      return res.status(error.status).json({
        message: error.message,
        ...(error.errors && { errors: error.errors })
      })
    }
    return res.status(500).json({ message: 'Internal Server Error' })
  }
}

/**
 * Handle user registration.
 * @function registerUser
 * @param {Object} req - Request object, expects { name, gmail, roleId } in body and file for profile picture.
 * @param {Object} res - Response object.
 */
export const registerUser = async (req, res) => {
  const { name, gmail, roleId } = req.body
  const profilePicture = req.file
  const { userId } = req

  if (!name || !gmail || !roleId) {
    return res.status(400).json({
      message: 'Missing required fields: name, gmail, roleId'
    })
  }

  try {
    const isAuthorized = await UserService.isAuthorized(userId)

    if (!isAuthorized) {
      res.status(403).json({ message: 'Unauthorized' })
      throw new Error('Unauthorized')
    }
    const user = await UserService.registerUser(req.body, profilePicture)

    return res.status(201).json({ user })
  } catch (error) {
    if (error instanceof ErrorUtils) {
      return res.status(error.status).json({
        message: error.message,
        ...(error.errors && { errors: error.errors })
      })
    }
    return res.status(500).json({ message: 'Internal Server Error' })
  }
}

/**
 * Retrieve all users.
 * @function getAllUsers
 * @param {Object} req - Request object, includes userId.
 * @param {Object} res - Response object.
 */
export const getAllUsers = async (req, res) => {
  const { userId } = req

  try {
    const isAuthorized = await UserService.isAuthorized(userId)

    if (!isAuthorized) {
      res.status(403).json({ message: 'Unauthorized' })
      throw new Error('Unauthorized')
    }
    const users = await UserService.getAllUsers()

    return res.status(200).json({ users })
  } catch (error) {
    if (error instanceof ErrorUtils) {
      return res.status(error.status).json({
        message: error.message,
        ...(error.errors && { errors: error.errors })
      })
    }
    return res.status(500).json({ message: 'Internal Server Error' })
  }
}

/**
 * Retrieve all roles.
 * @function getAllRoles
 * @param {Object} req - Request object, includes userId.
 * @param {Object} res - Response object.
 */
export const getAllRoles = async (req, res) => {
  const { userId } = req

  try {
    const isAuthorized = await UserService.isAuthorized(userId)

    if (!isAuthorized) {
      res.status(403).json({ message: 'Unauthorized' })
      throw new Error('Unauthorized')
    }
    const roles = await UserService.getAllRoles()

    return res.status(200).json({ roles })
  } catch (error) {
    if (error instanceof ErrorUtils) {
      return res.status(error.status).json({
        message: error.message,
        ...(error.errors && { errors: error.errors })
      })
    }
    return res.status(500).json({ message: 'Internal Server Error' })
  }
}

/**
 * Retrieve user details by ID.
 * @function getUserById
 * @param {Object} req - Request object, expects { id } in params.
 * @param {Object} res - Response object.
 */
export const getUserById = async (req, res) => {
  const { id } = req.params
  const { userId } = req

  try {
    const isAuthorized = await UserService.canAccessUser(userId, id)

    if (!isAuthorized) {
      res.status(403).json({ message: 'Unauthorized' })
      throw new Error('Unauthorized')
    }
    const user = await UserService.getUserById(id)

    return res.status(200).json({ user })
  } catch (error) {
    if (error instanceof ErrorUtils) {
      return res.status(error.status).json({
        message: error.message,
        ...(error.errors && { errors: error.errors })
      })
    }
    return res.status(500).json({ message: 'Internal Server Error' })
  }
}

/**
 * Retrieve users by role ID.
 * @function getUsersByRole
 * @param {Object} req - Request object, expects { roleId } in params.
 * @param {Object} res - Response object.
 */
export const getUsersByRole = async (req, res) => {
  const { roleId } = req.params
  const { userId } = req

  try {
    const isAuthorized = await UserService.isAuthorized(userId)

    if (!isAuthorized) {
      res.status(403).json({ message: 'Unauthorized' })
      throw new Error('Unauthorized')
    }
    const users = await UserService.getUsersByRole(roleId)

    return res.status(200).json({ users })
  } catch (error) {
    if (error instanceof ErrorUtils) {
      return res.status(error.status).json({
        message: error.message,
        ...(error.errors && { errors: error.errors })
      })
    }
    return res.status(500).json({ message: 'Internal Server Error' })
  }
}

/**
 * Update user information by ID.
 * @function updateUser
 * @param {Object} req - Request object, expects { id } in params and update fields in body.
 * @param {Object} res - Response object.
 */
export const updateUser = async (req, res) => {
  const { id } = req.params
  const { userId } = req
  const updates = { ...req.body }

  if (req.file) {
    updates.profilePicture = req.file
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({
      message: 'No update fields provided'
    })
  }

  try {
    const isAuthorized = await UserService.isAuthorized(userId)

    if (!isAuthorized) {
      res.status(403).json({ message: 'Unauthorized' })
      throw new Error('Unauthorized')
    }
    const { updatedUser, token } = await UserService.updateUser(id, updates, userId)

    return res.status(200).json({
      updatedUser,
      token
    })
  } catch (error) {
    if (error instanceof ErrorUtils) {
      return res.status(error.status).json({
        message: error.message,
        ...(error.errors && { errors: error.errors })
      })
    }
    return res.status(500).json({ message: 'Internal Server Error' })
  }
}

/**
 * Update user profile picture.
 * @function updateUserPicture
 * @param {Object} req - Request object, expects { id } in params and file for profile picture.
 * @param {Object} res - Response object.
 */
export const updateUserPicture = async (req, res) => {
  const { id } = req.params
  const { userId } = req
  const profilePicture = req.file

  if (!profilePicture) {
    return res.status(400).json({ message: 'Profile picture is required' })
  }

  try {
    const isAuthorized = await UserService.canAccessUser(userId, id)

    if (!isAuthorized) {
      res.status(403).json({ message: 'Unauthorized' })
      throw new Error('Unauthorized')
    }
    const profilePictureUrl = await UserService.updateUserPicture(id, profilePicture)

    return res.status(200).json({
      profilePictureUrl
    })
  } catch (error) {
    if (error instanceof ErrorUtils) {
      return res.status(error.status).json({
        message: error.message,
        ...(error.errors && { errors: error.errors })
      })
    }
    return res.status(500).json({ message: 'Internal Server Error' })
  }
}

/**
 * Delete user by ID.
 * @function deleteUser
 * @param {Object} req - Request object, expects { id } in params.
 * @param {Object} res - Response object.
 */
export const deleteUser = async (req, res) => {
  const { id } = req.params
  const { userId } = req

  if (!id) {
    return res.status(400).json({
      message: 'Missing required fields: Id'
    })
  }

  try {
    const isAuthorized = await UserService.isAuthorized(userId)

    if (!isAuthorized) {
      res.status(403).json({ message: 'Unauthorized' })
      throw new Error('Unauthorized')
    }
    await UserService.deleteUser(id)

    return res.sendStatus(204)
  } catch (error) {
    if (error instanceof ErrorUtils) {
      return res.status(error.status).json({
        message: error.message,
        ...(error.errors && { errors: error.errors })
      })
    }
    return res.status(500).json({ message: 'Internal Server Error' })
  }
}

/**
 * Delete multiple users using an array of IDs.
 * @function deleteUsersBatch
 * @param {Object} req - Request object, expects { userIds } in body.
 * @param {Object} res - Response object.
 */
export const deleteUsersBatch = async (req, res) => {
  const { userIds } = req.body
  const { userId } = req

  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({
      message: 'Missing required fields: userIds'
    })
  }

  try {
    const isAuthorized = await UserService.isAuthorized(userId)

    if (!isAuthorized) {
      res.status(403).json({ message: 'Unauthorized' })
      throw new Error('Unauthorized')
    }
    const result = await UserService.deleteUsersBatch(userIds)

    if (result.success) {
      return res.sendStatus(204)
    } else {
      return res.status(404).json({ message: result.message })
    }
  } catch (error) {
    if (error instanceof ErrorUtils) {
      return res.status(error.status).json({
        message: error.message,
        ...(error.errors && { errors: error.errors })
      })
    }
    return res.status(500).json({ message: 'Internal Server Error' })
  }
}

/**
 * Handle password recovery.
 * @function resetPassword
 * @param {Object} req - Request object, expects { gmail } in body.
 * @param {Object} res - Response object.
 */
export const resetPassword = async (req, res) => {
  const { gmail } = req.body

  try {
    await UserService.requestPasswordReset(gmail)

    return res.sendStatus(200)
  } catch (error) {
    if (error instanceof ErrorUtils) {
      return res.status(error.status).json({
        message: error.message,
        ...(error.errors && { errors: error.errors })
      })
    }
    return res.status(500).json({ message: 'Internal Server Error' })
  }
}

/**
 * Handle code verification.
 * @function verifyCode
 * @param {Object} req - Request object, expects { gmail, code } in body.
 * @param {Object} res - Response object.
 */
export const verifyCode = async (req, res) => {
  const { gmail, code } = req.body

  try {
    const isValid = await UserService.verifyPasswordResetCode(gmail, code)

    if (isValid) {
      return res.sendStatus(200)
    } else {
      return res.status(400).json({ message: 'Invalid or expired code' })
    }
  } catch (error) {
    if (error instanceof ErrorUtils) {
      return res.status(error.status).json({
        message: error.message,
        ...(error.errors && { errors: error.errors })
      })
    }
    return res.status(500).json({ message: 'Internal Server Error' })
  }
}

/**
 * Verify JWT token.
 * @function verifyToken
 * @param {Object} req - Request object, expects { token } in params.
 * @param {Object} res - Response object.
 */
export const verifyToken = async (req, res) => {
  const { token } = req.params

  if (!token) {
    return res.status(400).send({ error: 'Token is required' })
  }

  try {
    jsonwebtoken.verify(token, JWT_SECRET)

    return res.status(200).send({ valid: true })
  } catch (error) {
    return res.status(401).send({ valid: false })
  }
}
