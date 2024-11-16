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
  name: z.string()
    .min(1, 'The name is required')
    .max(255, 'The name cannot exceed 255 characters'),

  /**
   * User's Gmail address.
   * Must be a valid email format and end with '@isaambiental.com'.
   */
  gmail: z.string()
    .max(255, 'The email cannot exceed 255 characters')
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
    }),

  /**
 * Validation schema for user's profile picture.
 * Ensures that the profile picture, if provided, has a valid MIME type.
 * This field is optional.
 */
  profilePicture: z.object({
  /**
   * MIME type of the profile picture.
   * Must be one of the allowed types: 'image/png', 'image/jpeg', 'image/webp'.
   * Throws a validation error if the mimetype is not one of the allowed values.
   */
    mimetype: z.string().refine(
      (mime) => ['image/png', 'image/jpeg', 'image/webp'].includes(mime),
      { message: 'Invalid profile picture type. Allowed types are: png, jpeg, webp' }
    )
  }).optional(),

  /**
   * Validation for the 'removePicture' field.
   * Transforms a string input to a boolean.
   * - If the input is the string 'true', it is converted to true.
   * - Otherwise, it is converted to false.
   * Ensures that 'removePicture' is a boolean value after transformation.
   * This field is optional.
   */
  removePicture: z.string()
    .optional()
    .transform(value => value === 'true')
    .refine(value => typeof value === 'boolean', {
      message: 'removePicture must be a boolean value'
    })
})

export default userSchema
