/**
 * Initializes the admin user in the database if it does not already exist.
 * Loads the admin's profile picture from the file system.
 */

import UserService from '../services/users/User.service.js'
import UserRepository from '../repositories/User.repository.js'
import {
  ADMIN_GMAIL,
  ADMIN_NAME,
  ADMIN_ROLE
} from './variables.config.js'
import ErrorUtils from '../utils/Error.js'
/**
 * Initializes the admin user in the database.
 * @async
 * @function initializeAdmin
 * @throws {ErrorUtils} If an error occurs during initialization.
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
    if (error instanceof ErrorUtils) {
      console.error('Error during admin initialization:', error.message)
    }
    throw new ErrorUtils(500, 'Failed to initialize admin user', error)
  }
}
