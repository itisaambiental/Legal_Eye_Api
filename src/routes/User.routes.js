// routes/User.routes.js

/**
 * Routes module for user-related operations.
 * Defines the API endpoints for user management.
 */

import { Router } from 'express'
import {
  registerUser,
  loginUser,
  loginUserMicrosoftAuth,
  getAllUsers,
  getAllRoles,
  getUserById,
  getUsersByNameOrGmail,
  getUsersByRole,
  updateUser,
  updateUserPicture,
  deleteUser,
  deleteUsersBatch,
  verifyToken,
  resetPassword,
  verifyCode
} from '../controllers/User.controller.js'
import UserExtractor from '../middleware/access_token.js'
import { upload } from '../config/multer.config.js'

/**
 * UserRouter
 * @type {Router}
 */
const router = Router()

/**
 * Route to login a user.
 * @method POST
 * @path /user/login
 * @description Allows a user to login with their credentials.
 */
router.post('/user/login', loginUser)

/**
 * Route to login a user via Microsoft Authentication.
 * @method POST
 * @path /user/login/auth/microsoft
 * @description Allows a user to login using Microsoft OAuth.
 */
router.post('/user/login/auth/microsoft', loginUserMicrosoftAuth)

/**
 * Route to register a new user.
 * @method POST
 * @path /user/register
 * @description Registers a new user in the system.
 * @middlewares upload.single('profilePicture'), UserExtractor
 */
router.post('/user/register', upload.single('profilePicture'), UserExtractor, registerUser)

/**
 * Route to get all users.
 * @method GET
 * @path /users/
 * @description Retrieves a list of all users.
 * @middleware UserExtractor
 */
router.get('/users/', UserExtractor, getAllUsers)

/**
 * Route to get all roles.
 * @method GET
 * @path /roles/
 * @description Retrieves a list of all user roles.
 * @middleware UserExtractor
 */
router.get('/roles/', UserExtractor, getAllRoles)

/**
 * Route to get a specific user by ID.
 * @method GET
 * @path /user/:id
 * @description Retrieves details of a specific user by their ID.
 * @middleware UserExtractor
 * @param {number} id - The ID of the user to retrieve.
 */
router.get('/user/:id', UserExtractor, getUserById)

/**
 * Route to get users by role ID.
 * @method GET
 * @path /users/role/:roleId
 * @description Retrieves a list of users filtered by role ID.
 * @middleware UserExtractor
 * @param {number} roleId - The ID of the role to filter users by.
 */
router.get('/users/role/:roleId', UserExtractor, getUsersByRole)

/**
 * Route to get users by name or gmail.
 * @method GET
 * @path /users/search
 * @description Retrieves a list of users filtered by name or gmail.
 * @middleware UserExtractor
 * @query {string} [nameOrEmail] - The name or email of the user to search for.
 */
router.get('/users/search/filter', UserExtractor, getUsersByNameOrGmail)

/**
 * Route to update a specific user by ID.
 * @method PATCH
 * @path /user/:id
 * @description Updates user information for a specific user.
 * @middlewares upload.single('profilePicture'), UserExtractor
 * @param {number} id - The ID of the user to update.
 */
router.patch('/user/:id', upload.single('profilePicture'), UserExtractor, updateUser)

/**
 * Route to update a user's profile picture.
 * @method PATCH
 * @path /user/picture/:id
 * @description Updates the profile picture of a specific user.
 * @middlewares upload.single('profilePicture'), UserExtractor
 * @param {number} id - The ID of the user to update.
 */
router.patch('/user/picture/:id', upload.single('profilePicture'), UserExtractor, updateUserPicture)

/**
 * Route to delete a specific user by ID.
 * @method DELETE
 * @path /user/:id
 * @description Deletes a user from the system.
 * @middleware UserExtractor
 * @param {number} id - The ID of the user to delete.
 */
router.delete('/user/:id', UserExtractor, deleteUser)

/**
 * Route to delete multiple users using an array of IDs.
 * @method DELETE
 * @path /users/batch
 * @description Deletes multiple users from the system.
 * @middleware UserExtractor
 */
router.delete('/users/batch', UserExtractor, deleteUsersBatch)

/**
 * Route to verify the JWT token.
 * @method GET
 * @path /user/verify/token
 * @description Verifies the JWT token for authentication.
 * @param {number} token - The JWT token to verify.
 */
router.post('/user/verify/token', verifyToken)

/**
 * Route for password recovery.
 * @method POST
 * @path /user/reset-password
 * @description Initiates the password reset process for a user.
 */
router.post('/user/reset-password', resetPassword)

/**
 * Route for password recovery verification.
 * @method POST
 * @path /user/verify-code
 * @description Verifies the password reset code provided by the user.
 */
router.post('/user/verify-code', verifyCode)

export default router
