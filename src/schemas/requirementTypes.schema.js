import { z } from 'zod'

/**
 * Zod validation schema for RequirementType.
 * Ensures the name and classification meet format and length requirements.
 * The description is optional but validated if provided.
 */
const requirementTypesSchema = z.object({
  name: z
    .string()
    .max(100, { message: 'The name cannot exceed 100 characters' })
    .min(1, { message: 'The name cannot be empty' }),

  description: z
    .string()
    .max(65535, { message: 'The description is too long' })
    .optional(),

  classification: z
    .string()
    .max(4294967295, { message: 'The classification is too long' })
    .min(1, { message: 'The classification cannot be empty' })
})

export default requirementTypesSchema
