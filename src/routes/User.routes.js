import { Router } from 'express'
import {
  registerUser,
  loginUser,
  loginUserMicrosoftAuth,
  getAllUsers,
  getAllRoles,
  getUserById,
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

const router = Router()

// Route for user login
router.post('/user/login', loginUser)

// Route for user login via Microsoft Auth
router.post('/user/login/auth/microsoft', loginUserMicrosoftAuth)

// Route to register a new user
router.post('/user/register', upload.single('profilePicture'), UserExtractor, registerUser)

// Route to get all users
router.get('/users/', UserExtractor, getAllUsers)

// Route to get all roles
router.get('/roles/', UserExtractor, getAllRoles)

// Route to get a specific user by ID
router.get('/user/:id', UserExtractor, getUserById)

// Route to get users by role ID
router.get('/users/role/:roleId', UserExtractor, getUsersByRole)

// Route to update a specific user by ID
router.patch('/user/:id', upload.single('profilePicture'), UserExtractor, updateUser)

// Route to update a specific user picture
router.patch('/user/picture/:id', upload.single('profilePicture'), UserExtractor, updateUserPicture)

// Route to delete a specific user by ID
router.delete('/user/:id', UserExtractor, deleteUser)

// Route to delete multiple users using an array of Ids
router.delete('/users/batch', UserExtractor, deleteUsersBatch)

// Route to verify the JWT Token
router.get('/user/verify/:token', verifyToken)

// Route for password recovery
router.post('/user/reset-password', resetPassword)

// Route for password recovery verification
router.post('/user/verify-code', verifyCode)

export default router
