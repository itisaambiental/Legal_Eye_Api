import UserService from '../services/User.service.js'
import UserRepository from '../repositories/User.repository.js'
import { ADMIN_GMAIL, ADMIN_NAME, ADMIN_ROLE } from './variables.config.js'
import ErrorUtils from '../utils/Error.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const initializeAdmin = async () => {
  try {
    const existingAdmin = await UserRepository.findByGmail(ADMIN_GMAIL)
    if (existingAdmin) {
      return
    }

    const adminData = {
      name: ADMIN_NAME,
      gmail: ADMIN_GMAIL,
      roleId: Number(ADMIN_ROLE)
    }

    const profilePicturePath = path.join(__dirname, '../resources/foto.jpg')
    const profilePicture = {
      name: 'foto.jpg',
      mimetype: 'image/jpeg',
      buffer: fs.readFileSync(profilePicturePath)
    }

    await UserService.registerUser(adminData, profilePicture)
  } catch (error) {
    if (error instanceof ErrorUtils) {
      console.error('Error during admin initialization:', error.message)
    }
    throw new ErrorUtils(500, 'Failed to initialize admin', error)
  }
}
