import UserService from '../services/users/User.service.js'
import UserRepository from '../repositories/User.repository.js'
import {
  ADMIN_GMAIL,
  ADMIN_NAME,
  ADMIN_ROLE
} from './variables.config.js'
import HttpException from '../services/errors/HttpException.js'
/**
 * Initializes the admin user in the database.
 * @async
 * @function initializeAdmin
 * @throws {HttpException} If an error occurs during initialization.
 */
export const initializeAdmin = async () => {
  try {
    const existingAdmin = await UserRepository.existsByGmail(ADMIN_GMAIL)
    if (!existingAdmin) {
      const adminData = {
        name: ADMIN_NAME,
        gmail: ADMIN_GMAIL,
        roleId: ADMIN_ROLE
      }
      await UserService.registerUser(adminData)
    }
  } catch (error) {
    if (error instanceof HttpException) {
      console.error('Error during admin initialization:', error.message)
    }
    throw new HttpException(500, 'Failed to initialize admin user', error)
  }
}
