import { z } from 'zod'

/**
 * Zod validation schema for a ReqIdentification record.
 */
export const reqIdentificationSchema = z.object({
  /**
   * Name of the requirement identification.
   * Required. Must be a non-empty string with a maximum length of 255 characters.
   */
  reqIdentificationName: z
    .string({
      required_error: 'The requirement identification name is required'
    })
    .min(1, { message: 'The requirement identification name cannot be empty' })
    .max(255, {
      message:
        'The requirement identification name cannot exceed 255 characters'
    }),

  /**
   * Optional description of the requirement identification.
   * Can be a string, null, or undefined.
   */
  reqIdentificationDescription: z.string().optional().nullable(),

  /**
   * IDs of the associated legal bases.
   */
  legalBasisIds: z.preprocess(
    (val) => {
      if (typeof val === 'string') {
        try {
          return JSON.parse(val)
        } catch {
          return val
        }
      }
      return val
    },
    z
      .array(
        z
          .number({
            invalid_type_error: 'Each legal basis ID must be a number'
          })
          .int('Each legal basis ID must be an integer')
      )
      .min(1, {
        message: 'legalBasisIds must contain at least one value'
      })
  ),

  /**
   * Intelligence level.
   * Allowed values: 'High' or 'Low'.
   */
  intelligenceLevel: z.enum(['High', 'Low'], {
    required_error: 'The intelligenceLevel field is required',
    invalid_type_error: 'The intelligenceLevel field must be either "High" or "Low"'
  })
})
