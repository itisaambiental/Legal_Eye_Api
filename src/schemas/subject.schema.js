import { z } from 'zod'

/**
 * Zod validation schema for Subject.
 * Ensures the subject name and order_index meet format and length requirements.
 * The abbreviation is optional but still validated if provided.
 */
const subjectSchema = z.object({
  /**
   * Name of the subject.
   * Must be a non-empty string with max length of 255 characters.
   */
  subjectName: z
    .string()
    .max(255, { message: 'The subject name cannot exceed 255 characters' })
    .min(1, { message: 'The subject name cannot be empty' }),

  /**
   * Optional abbreviation of the subject.
   * Must not exceed 10 characters if provided.
   */
  abbreviation: z
    .string()
    .max(10, { message: 'The abbreviation cannot exceed 10 characters' })
    .optional(),

  /**
   * Display order index.
   * Must be a positive number (can be sent as a string).
   */
  orderIndex: z.coerce
    .number({ invalid_type_error: 'The order index must be a number' })
    .positive('The order index must be greater than 0')
})

export default subjectSchema
