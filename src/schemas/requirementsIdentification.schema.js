import { z } from 'zod'

/**
 * Zod validation schema for a requirements identification record.
 * This schema ensures that the input data meets the necessary validation rules for creating or updating a requirements identification.
 */
export const requirementsIdentificationSchema = z.object({
  /**
   * Name of the identification.
   * Must be a non-empty string with a maximum length of 255 characters.
   */
  identificationName: z
    .string()
    .min(1, 'The identification name is required')
    .max(255, 'The identification name cannot exceed 255 characters'),

  /**
   * Description of the identification.
   * Can be a string or empty, but must not exceed database limits.
   */
  identificationDescription: z
    .string()
    .optional()
    .nullable(),

  /**
   * Array of legal basis IDs associated with this identification.
   * Must be a valid array of numbers.
   */
  legalBasisIds: z.string()
    .refine((val) => {
      try {
        const parsedArray = JSON.parse(val)
        return (
          Array.isArray(parsedArray) &&
          parsedArray.every((item) => typeof item === 'number')
        )
      } catch {
        return false
      }
    }, 'Each legalBasisId must be a valid array of numbers')
    .transform((val) => z.array(z.number()).parse(JSON.parse(val)))
    .refine(
      (val) => val.length > 0,
      'legalBasisIds must contain at least one number'
    ),

  /**
   * Subject ID associated with the requirements identification.
   * Must be a string that can be converted to a valid number.
   */
  subjectId: z
    .string()
    .refine(
      (val) => !isNaN(Number(val)),
      'The subjectId must be a valid number'
    )
    .transform((val) => Number(val)),

  /**
   * Array of aspect IDs associated with the identification.
   * Must be a valid array of numbers.
   */
  aspectIds: z.string()
    .refine((val) => {
      try {
        const parsedArray = JSON.parse(val)
        return (
          Array.isArray(parsedArray) &&
          parsedArray.every((item) => typeof item === 'number')
        )
      } catch {
        return false
      }
    }, 'Each aspectId must be a valid array of numbers')
    .transform((val) => z.array(z.number()).parse(JSON.parse(val)))
    .refine(
      (val) => val.length > 0,
      'aspectIds must contain at least one number'
    ),
  /**
     * Intelligence level.
     * Optional and nullable enum. Allowed values: 'High' or 'Low'.
     */
  intelligenceLevel: z
    .enum(['High', 'Low'], {
      message: 'The intelligenceLevel field must be either "High" or "Low"'
    })
    .optional()
    .nullable()
})

/**
 * Zod validation schema for updating a requirements identification.
 * Only allows updating the name and description.
 */
export const requirementsIdentificationUpdateSchema = z.object({
  /**
   * Name of the identification.
   * Must be a non-empty string with a maximum length of 255 characters.
   */
  identificationName: z
    .string()
    .min(1, 'The identification name is required')
    .max(255, 'The identification name cannot exceed 255 characters'),

  /**
   * Description of the identification.
   * Can be a string, empty or null.
   */
  identificationDescription: z
    .string()
    .optional()
    .nullable()
})
