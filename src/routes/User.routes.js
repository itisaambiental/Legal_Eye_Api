import { Router } from 'express'
import {
  registerUser,
  loginUser,
  loginUserMicrosoftAuth,
  getAllUsers,
  getUserById,
  updateUser,
  updateUserPicture,
  deleteUser,
  verifyToken
  // forgotPassword
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

// Route to get a specific user by ID
router.get('/user/:id', UserExtractor, getUserById)

// Route to update a specific user by ID
router.patch('/user/:id', UserExtractor, updateUser)

// Route to update a specific user picture
router.patch('/user/picture/:id', upload.single('profilePicture'), UserExtractor, updateUserPicture)

// Route to delete a specific user by ID
router.delete('/user/:id', UserExtractor, deleteUser)

router.get('/user/verify/:token', verifyToken)

// // Route for password recovery
// router.post('/user/forgot-password', forgotPassword)

export default router
