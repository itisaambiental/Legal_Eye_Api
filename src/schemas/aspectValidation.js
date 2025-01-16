import { z } from 'zod'

/**
 * Zod validation schema for Aspect creation.
 * Ensures that the aspect name meets format and length requirements.
 */
const aspectSchema = z.object({
  aspectName: z.string()
    .max(255, { message: 'The aspect name cannot exceed 255 characters' })
    .min(1, { message: 'The aspect name cannot be empty' })
})

export default aspectSchema
