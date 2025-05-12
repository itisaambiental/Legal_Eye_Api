import { z } from 'zod'

/**
 * Zod validation schema for Aspect creation.
 * Ensures that the aspect name and order index meet format and length requirements.
 * The abbreviation is optional but still validated if provided.
 */
const aspectSchema = z.object({
  aspectName: z
    .string()
    .max(255, { message: 'The aspect name cannot exceed 255 characters' })
    .min(1, { message: 'The aspect name cannot be empty' }),

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

export default aspectSchema
