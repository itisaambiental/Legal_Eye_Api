import { z } from 'zod'

/**
 * Zod validation schema for Subject.
 * Ensures the subject name, abbreviation and order_index meet format and length requirements.
 */
const subjectSchema = z.object({
  subjectName: z
    .string()
    .max(255, { message: 'The subject name cannot exceed 255 characters' })
    .min(1, { message: 'The subject name cannot be empty' }),

  abbreviation: z
    .string()
    .max(10, { message: 'The abbreviation cannot exceed 10 characters' })
    .min(1, { message: 'The abbreviation cannot be empty' }),

  orderIndex: z.preprocess(
    (value) => (typeof value === 'string' ? Number(value) : value),
    z
      .number({ message: 'The order index must be a valid number' })
      .positive('The order index must be greater than 0')
  )
})

export default subjectSchema
