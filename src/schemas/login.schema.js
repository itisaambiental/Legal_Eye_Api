import { z } from 'zod'

/**
 * Zod validation schema for user login.
 * Ensures that the login data meets the format requirements.
 */
const loginSchema = z.object({
  /**
   * User's Gmail address.
   * Must be a valid email format.
   */
  gmail: z.string().email({ message: 'Invalid email format' }),

  /**
   * User's password.
   * Must be at least 12 characters long.
   */
  password: z
    .string()
    .min(12, { message: 'Password must be at least 12 characters' })
})

export default loginSchema
