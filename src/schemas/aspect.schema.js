import { z } from 'zod'

/**
 * Zod validation schema for Aspect creation.
 * Ensures that the aspect name and order index meet format and length requirements.
 * The abbreviation is optional but still validated if provided.
 */
const aspectSchema = z.object({
  /**
   * The name of the aspect.
   * Must be a non-empty string with a maximum of 255 characters.
   */
  aspectName: z
    .string()
    .max(255, { message: 'The aspect name cannot exceed 255 characters' })
    .min(1, { message: 'The aspect name cannot be empty' }),

  /**
   * The abbreviation of the aspect.
   * Optional string with a maximum of 10 characters.
   */
  abbreviation: z
    .string()
    .max(10, { message: 'The abbreviation cannot exceed 10 characters' })
    .optional(),

  /**
   * The order index.
   */
  orderIndex: z.coerce
    .number({ invalid_type_error: 'The order index must be a number' })
    .int('The order index must be an integer')
    .positive('The order index must be greater than 0')
})

export default aspectSchema
