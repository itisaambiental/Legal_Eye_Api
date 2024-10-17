import UserService from '../services/users/User.service.js'
import UserRepository from '../repositories/User.repository.js'
import {
  ADMIN_GMAIL,
  ADMIN_NAME,
  ADMIN_ROLE
} from './variables.config.js'
import ErrorUtils from '../utils/Error.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const initializeAdmin = async () => {
  try {
    const existingAdmin = await UserRepository.findByGmail(ADMIN_GMAIL)
    if (!existingAdmin) {
      const adminData = {
        name: ADMIN_NAME,
        gmail: ADMIN_GMAIL,
        roleId: ADMIN_ROLE
      }

      const profilePicturePath = path.join(__dirname, '../resources/admin.png')
      const profilePicture = {
        originalname: 'admin.png',
        mimetype: 'image/png',
        buffer: fs.readFileSync(profilePicturePath)
      }

      await UserService.registerUser(adminData, profilePicture)
    }
  } catch (error) {
    if (error instanceof ErrorUtils) {
      console.error('Error during admin or support initialization:', error.message)
    }
    throw new ErrorUtils(500, 'Failed to initialize admin or support user', error)
  }
}
