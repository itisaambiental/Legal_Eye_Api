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
 * @param {import('express').Request} req - Request object, expects { gmail, password } in body.
 * @param {import('express').Response} res - Response object.
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
    return res.status(200).json({ token })
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
 * @param {import('express').Request} req - Request object, expects { accessToken } in body.
 * @param {import('express').Response} res - Response object.
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
    return res.status(200).json({ token })
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
 * @param {import('express').Request} req - Request object, expects { name, gmail, roleId } in body and file for profile picture.
 * @param {import('express').Response} res - Response object.
 */
export const registerUser = async (req, res) => {
  const { userId } = req
  const { name, gmail, roleId } = req.body
  const profilePicture = req.file
  if (!name || !gmail || !roleId) {
    return res.status(400).json({
      message: 'Missing required fields: name, gmail, roleId'
    })
  }
  try {
    const isAuthorized = await UserService.isAuthorized(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const user = await UserService.registerUser(
      { name, gmail, roleId },
      profilePicture
    )
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
 * @param {import('express').Request} req - Request object, includes userId.
 * @param {import('express').Response} res - Response object.
 */
export const getAllUsers = async (req, res) => {
  const { userId } = req
  try {
    const isAuthorized = await UserService.isAuthorized(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
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
 * @param {import('express').Request} req - Request object, includes userId.
 * @param {import('express').Response} res - Response object.
 */
export const getAllRoles = async (req, res) => {
  const { userId } = req
  try {
    const isAuthorized = await UserService.isAuthorized(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
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
 * @param {import('express').Request} req - Request object, expects { id } in params.
 * @param {import('express').Response} res - Response object.
 */
export const getUserById = async (req, res) => {
  const { id } = req.params
  const { userId } = req
  try {
    const isAuthorized = await UserService.canAccessUser(userId, id)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
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
 * Retrieve users by name or gmail.
 * @function getUsersByNameOrGmail
 * @param {import('express').Request} req - Request object, expects { nameOrEmail } in query parameters.
 * @param {import('express').Response} res - Response object.
 */
export const getUsersByNameOrGmail = async (req, res) => {
  const { userId } = req
  const { nameOrEmail } = req.query
  try {
    const isAuthorized = await UserService.isAuthorized(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const users = await UserService.getUsersByNameOrGmail(nameOrEmail)
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
 * Retrieve users by role ID.
 * @function getUsersByRole
 * @param {import('express').Request} req - Request object, expects { roleId } in params.
 * @param {import('express').Response} res - Response object.
 */
export const getUsersByRole = async (req, res) => {
  const { roleId } = req.params
  const { userId } = req
  try {
    const isAuthorized = await UserService.isAuthorized(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
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
 * @param {import('express').Request} req - Request object, expects { id } in params and { name, gmail, roleId, removePicture } in body and an optional file for profile picture.
 * @param {import('express').Response} res - Response object.
 */
export const updateUser = async (req, res) => {
  const { id } = req.params
  const { name, gmail, roleId, removePicture } = req.body
  const profilePicture = req.file
  const { userId } = req
  try {
    const isAuthorized = await UserService.isAuthorized(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const { updatedUser, token } = await UserService.updateUser(
      id,
      { name, gmail, roleId, removePicture },
      profilePicture,
      userId
    )
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
 * @param {import('express').Request} req - Request object, expects { id } in params and file for profile picture.
 * @param {import('express').Response} res - Response object.
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
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const profilePictureUrl = await UserService.updateUserPicture(
      id,
      profilePicture
    )
    return res.status(200).json({ profilePictureUrl })
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
 * @param {import('express').Request} req - Request object, expects { id } in params.
 * @param {import('express').Response} res - Response object.
 * @returns {void}
 */
export const deleteUser = async (req, res) => {
  const { id } = req.params
  const { userId } = req
  try {
    const isAuthorized = await UserService.isAuthorized(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const { success } = await UserService.deleteUser(id)
    if (success) {
      return res.sendStatus(204)
    } else {
      return res.status(500).json({ message: 'Internal Server Error' })
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
 * Delete multiple users using an array of IDs.
 * @function deleteUsersBatch
 * @param {import('express').Request} req - Request object, expects { userIds } in body.
 * @param {import('express').Response} res - Response object.
 * @returns {void}
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
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const { success } = await UserService.deleteUsersBatch(userIds)
    if (success) {
      return res.sendStatus(204)
    } else {
      return res.status(500).json({ message: 'Internal Server Error' })
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
 * @param {import('express').Request} req - Request object, expects { gmail } in body.
 * @param {import('express').Response} res - Response object.
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
 * @param {import('express').Request} req - Request object, expects { gmail, code } in body.
 * @param {import('express').Response} res - Response object.
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
 * @param {import('express').Request} req - Request object, expects { token } in body.
 * @param {import('express').Response} res - Response object.
 */
export const verifyToken = async (req, res) => {
  const { token } = req.body
  if (!token) {
    return res.status(200).send({ valid: false })
  }
  try {
    const decodedToken = jsonwebtoken.verify(token, JWT_SECRET)
    if (!decodedToken?.userForToken?.id) {
      return res.status(200).send({ valid: false })
    }
    const userId = decodedToken.userForToken.id
    const userExists = await UserService.userExists(userId)
    return res.status(200).send({ valid: userExists })
  } catch (error) {
    return res.status(200).send({ valid: false })
  }
}
