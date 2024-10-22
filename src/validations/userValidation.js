// userSchema.js

import { z } from 'zod'

/**
 * Zod validation schema for a user's data.
 * Ensures that the user data meets the requirements for creating or updating a user.
 * @type {z}
 */
const userSchema = z.object({
  /**
   * User's name.
   * Must be a non-empty string.
   */
  name: z.string().min(1, 'The name is required'),

  /**
   * User's Gmail address.
   * Must be a valid email format and end with '@isaambiental.com'.
   */
  gmail: z.string()
    .email('The email must be valid')
    .refine((email) => email.endsWith('@isaambiental.com'), {
      message: 'The email must end with @isaambiental.com'
    }),

  /**
   * User's role ID.
   * Must be either 1 (Admin) or 2 (Analyst).
   * Transforms the input to an integer and ensures it's a valid number.
   */
  roleId: z.string()
    .transform(value => parseInt(value, 10))
    .refine(value => !isNaN(value), { message: 'The roleId must be a valid number' })
    .refine(value => value === 1 || value === 2, {
      message: 'The roleId must be either 1 (Admin) or 2 (Analyst)'
    })
})

export default userSchema
