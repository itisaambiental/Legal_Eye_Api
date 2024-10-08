// controllers/User.controller.js
import UserService from '../services/User.service.js'
import ErrorUtils from '../utils/Error.js'
import jsonwebtoken from 'jsonwebtoken'
import { JWT_SECRET } from '../config/variables.config.js'
// Function to handle user login
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
        message: error.message
      })
    }

    return res.status(500).json({ message: 'Internal Server Error' })
  }
}

// Function to handle user login via Microsoft Auth
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
        message: error.message
      })
    }

    return res.status(500).json({ message: 'Internal Server Error' })
  }
}
// Function to manage the registration of a new user
export const registerUser = async (req, res) => {
  const { name, gmail, roleId } = req.body
  const profilePicture = req.file
  const { userId } = req

  if (!name || !gmail || !roleId) {
    return res.status(400).json({
      message: 'Missing required fields: name, gmail, roleId'
    })
  }

  const isAuthorized = await UserService.isAuthorized(userId)
  if (!isAuthorized) {
    return res.status(403).json({
      message: 'Unauthorized'
    })
  }

  try {
    const user = await UserService.registerUser(req.body, profilePicture)

    return res.status(201).json({ user })
  } catch (error) {
    if (error.status && error.message) {
      return res.status(error.status).json({
        message: error.message,
        ...(error.errors && { errors: error.errors })
      })
    }

    return res.status(500).json({ message: 'Internal Server Error' })
  }
}

// Function to get all users
export const getAllUsers = async (req, res) => {
  const { userId } = req

  const isAuthorized = await UserService.isAuthorized(userId)
  if (!isAuthorized) {
    return res.status(403).json({
      message: 'Unauthorized'
    })
  }

  try {
    const users = await UserService.getAllUsers()
    return res.status(200).json({ users })
  } catch (error) {
    if (error.status && error.message) {
      return res.status(error.status).json({
        message: error.message,
        ...(error.errors && { errors: error.errors })
      })
    }

    return res.status(500).json({ message: 'Internal Server Error' })
  }
}

// Function to get all roles
export const getAllRoles = async (req, res) => {
  const { userId } = req

  const isAuthorized = await UserService.isAuthorized(userId)
  if (!isAuthorized) {
    return res.status(403).json({
      message: 'Unauthorized'
    })
  }

  try {
    const roles = await UserService.getAllRoles()
    return res.status(200).json({ roles })
  } catch (error) {
    if (error.status && error.message) {
      return res.status(error.status).json({
        message: error.message,
        ...(error.errors && { errors: error.errors })
      })
    }

    return res.status(500).json({ message: 'Internal Server Error' })
  }
}

// Function to get the details of a specific user by ID
export const getUserById = async (req, res) => {
  const { id } = req.params
  const { userId } = req

  try {
    const isAuthorized = await UserService.canAccessUser(userId, id)

    if (!isAuthorized) {
      return res.status(403).json({
        message: 'Unauthorized'
      })
    }

    const user = await UserService.getUserById(id)

    return res.status(200).json({ user })
  } catch (error) {
    if (error.status && error.message) {
      return res.status(error.status).json({
        message: error.message,
        ...(error.errors && { errors: error.errors })
      })
    }

    return res.status(500).json({ message: 'Internal Server Error' })
  }
}

// Function to update a user's information by ID
export const updateUser = async (req, res) => {
  const { id } = req.params
  const { userId } = req
  const updates = req.body

  try {
    const isAuthorized = await UserService.isAuthorized(userId)
    if (!isAuthorized) {
      return res.status(403).json({
        message: 'Unauthorized'
      })
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: 'No update fields provided'
      })
    }

    const updatedUser = await UserService.updateUser(id, updates)
    return res.status(200).json({
      updatedUser
    })
  } catch (error) {
    if (error.status && error.message) {
      return res.status(error.status).json({
        message: error.message
      })
    }
    return res.status(500).json({ message: 'Internal Server Error' })
  }
}

// Function to update a user's profile picture
export const updateUserPicture = async (req, res) => {
  const { id } = req.params
  const { userId } = req
  const profilePicture = req.file

  try {
    const isAuthorized = await UserService.canAccessUser(userId, id)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }

    if (!profilePicture) {
      return res.status(400).json({ message: 'Profile picture is required' })
    }

    const profilePictureUrl = await UserService.updateUserPicture(id, profilePicture)

    return res.status(200).json({
      profilePictureUrl
    })
  } catch (error) {
    if (error.status && error.message) {
      return res.status(error.status).json({
        message: error.message,
        ...(error.errors && { errors: error.errors })
      })
    }

    return res.status(500).json({ message: 'Internal Server Error' })
  }
}

// Function to delete a user by ID
export const deleteUser = async (req, res) => {
  const { id } = req.params
  const { userId } = req

  if (!id) {
    return res.status(400).json({
      message: 'Missing required fields: Id'
    })
  }

  const isAuthorized = await UserService.isAuthorized(userId)
  if (!isAuthorized) {
    return res.status(403).json({
      message: 'Unauthorized'
    })
  }
  try {
    await UserService.deleteUser(id)
    return res.sendStatus(204)
  } catch (error) {
    if (error.status && error.message) {
      return res.status(error.status).json({
        message: error.message,
        ...(error.errors && { errors: error.errors })
      })
    }

    return res.status(500).json({ message: 'Internal Server Error' })
  }
}

export const verifyToken = async (req, res) => {
  const token = req.params
  if (!token) {
    return res.status(400).send({ error: 'Token is required' })
  }

  try {
    jsonwebtoken.verify(token.token, JWT_SECRET)
    return res.status(200).send({ valid: true })
  } catch (error) {
    return res.send({ valid: false })
  }
}
// Function to handle password recovery
export const resetPassword = async (req, res) => {
  const { gmail } = req.body
  try {
    await UserService.requestPasswordReset(gmail)
    return res.sendStatus(200)
  } catch (error) {
    if (error.status && error.message) {
      return res.status(error.status).json({
        message: error.message,
        ...(error.errors && { errors: error.errors })
      })
    }

    return res.status(500).json({ message: 'Internal Server Error' })
  }
}

// Function to handle code verification
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
    if (error.status && error.message) {
      return res.status(error.status).json({
        message: error.message,
        ...(error.errors && { errors: error.errors })
      })
    }

    return res.status(500).json({ message: 'Internal Server Error' })
  }
}
