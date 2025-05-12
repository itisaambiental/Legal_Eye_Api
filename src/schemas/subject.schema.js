import { z } from 'zod'

/**
 * Zod validation schema for Subject.
 * Ensures the subject name and order_index meet format and length requirements.
 * The abbreviation is optional but still validated if provided.
 */
const subjectSchema = z.object({
  subjectName: z
    .string()
    .max(255, { message: 'The subject name cannot exceed 255 characters' })
    .min(1, { message: 'The subject name cannot be empty' }),

  abbreviation: z
    .string()
    .max(10, { message: 'The abbreviation cannot exceed 10 characters' })
    .optional(),

  orderIndex: z.preprocess(
    (value) => (typeof value === 'string' ? Number(value) : value),
    z
      .number({ message: 'The order index must be a valid number' })
      .positive('The order index must be greater than 0')
  )
})

export default subjectSchema
