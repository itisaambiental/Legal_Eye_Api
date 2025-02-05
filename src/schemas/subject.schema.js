import { z } from 'zod'

/**
 * Zod validation schema for Subject.
 * Ensures the subject name meets format and length requirements.
 */
const subjectSchema = z.object({
  subjectName: z
    .string()
    .max(255, { message: 'The subject name cannot exceed 255 characters' })
    .min(1, { message: 'The subject name cannot be empty' })
})

export default subjectSchema
