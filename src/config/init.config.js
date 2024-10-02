import UserService from '../services/User.service.js'
import UserRepository from '../repositories/User.repository.js'
import { ADMIN_GMAIL, ADMIN_NAME, ADMIN_ROLE, ADMIN_GMAIL_SUPPORT, ADMIN_ROLE_SUPPORT, ADMIN_NAME_SUPPORT } from './variables.config.js'
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

      const profilePicturePath = path.join(__dirname, '../resources/foto.jpg')
      const profilePicture = {
        originalname: 'foto.jpg',
        mimetype: 'image/jpeg',
        buffer: fs.readFileSync(profilePicturePath)
      }

      await UserService.registerUser(adminData, profilePicture)
    }

    const existingSupportUser = await UserRepository.findByGmail(ADMIN_GMAIL_SUPPORT)
    if (!existingSupportUser) {
      const supportData = {
        name: ADMIN_NAME_SUPPORT,
        gmail: ADMIN_GMAIL_SUPPORT,
        roleId: ADMIN_ROLE_SUPPORT
      }

      const profilePicturePathSupport = path.join(__dirname, '../resources/foto.jpg')
      const profilePictureSupport = {
        originalname: 'foto_support.jpg',
        mimetype: 'image/jpeg',
        buffer: fs.readFileSync(profilePicturePathSupport)
      }

      await UserService.registerUser(supportData, profilePictureSupport)
    }
  } catch (error) {
    if (error instanceof ErrorUtils) {
      console.error('Error during admin or support initialization:', error.message)
    }
    throw new ErrorUtils(500, 'Failed to initialize admin or support user', error)
  }
}
