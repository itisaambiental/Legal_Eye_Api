// controllers/User.controller.js
import UserService from '../services/User.service.js'
import ErrorUtils from '../utils/Error.js'

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
export const loginUserMicrosoftAuth = (req, res) => {
  res.status(200).json({ message: 'Hello World' })
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
    const { userId } = await UserService.registerUser(req.body, profilePicture)

    return res.status(201).json({ userId })
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
export const updateUser = (req, res) => {
  res.status(200).json({ message: 'Hello World' })
}

// Function to delete a user by ID
export const deleteUser = (req, res) => {
  res.status(200).json({ message: 'Hello World' })
}

// Function to handle password recovery
export const forgotPassword = (req, res) => {
  res.status(200).json({ message: 'Hello World' })
}
