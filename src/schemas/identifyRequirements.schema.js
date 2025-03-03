import { z } from 'zod'

/**
 * Zod validation schema for a identify requirements.
 * Ensures that input data meets the requirements for requirements identification.
 * This schema is used for validation on the backend.
 */
const identifyRequirementsSchema = z.object({
  /**
   * The IDs of the selected legal bases.
   * Must be a stringified JSON array of valid numbers.
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
    }, 'Each legalBaseId must be a valid array of numbers')
    .transform((val) => z.array(z.number()).parse(JSON.parse(val)))
    .refine(
      (val) => val.length > 0,
      'legalBasisIds must contain at least one number'
    ),

  /**
   * The ID of the subject.
   * Must be a string that can be caonverted to a valid number.
   */
  subjectId: z
    .string()
    .refine(
      (val) => !isNaN(Number(val)),
      'The subjectId must be a valid number'
    )
    .transform((val) => Number(val)),

  /**
   * The IDs of the selected aspects.
   * Must be a stringified JSON array of valid numbers.
   */
  aspectsIds: z.string()
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
      'aspectsIds must contain at least one number'
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
 * Zod validation schema for article classification.
 */
const ArticleClassificationSchema = z.object({
  isObligatory: z.boolean(),
  isComplementary: z.boolean()
})

export { identifyRequirementsSchema, ArticleClassificationSchema }
