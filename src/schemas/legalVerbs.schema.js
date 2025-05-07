import { z } from 'zod'

/**
 * Zod validation schema for LegalVerb.
 */
const legalVerbsSchema = z.object({
  name: z
    .string()
    .max(255, { message: 'The name cannot exceed 255 characters' })
    .min(1, { message: 'The name cannot be empty' }),

  description: z
    .string()
    .min(1, { message: 'The description cannot be empty' }),

  translation: z
    .string()
    .min(1, { message: 'The translation cannot be empty' })
})

export default legalVerbsSchema
