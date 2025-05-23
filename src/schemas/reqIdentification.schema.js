import { z } from 'zod'

/**
 * Zod validation schema for creating a req_identifications record.
 * Ensures the input data meets the necessary validation rules for inserting a new identification.
 */
export const reqIdentificationSchema = z.object({
  /**
   * Name of the identification.
   * Must be a non-empty string with a max length of 255 characters.
   */
  identificationName: z
    .string({ required_error: 'The identificationName is required' })
    .min(1, 'The identificationName cannot be empty')
    .max(255, 'The identificationName cannot exceed 255 characters'),

  /**
   * Optional description of the identification.
   * Can be null or string.
   */
  identificationDescription: z.string().optional().nullable(),

  /**
   * ID of the user creating the identification.
   * Optional; must be a valid integer if provided.
   */
  userId: z
    .union([
      z.coerce.number({ invalid_type_error: 'userId must be a number' }).int('userId must be an integer'),
      z.undefined(),
      z.null()
    ])
    .optional(),

  /**
   * Subject ID associated with the requirements identification.
   * Must be a string that can be converted to a valid number.
   */
  subjectId: z
    .string()
    .refine((val) => !isNaN(Number(val)), 'The subjectId must be a valid number')
    .transform((val) => Number(val)),

  /**
   * Array of aspect IDs associated with the identification.
   * Must be a valid JSON array of numbers.
   */
  aspectIds: z
    .string({ required_error: 'aspectIds is required' })
    .refine((val) => {
      try {
        const arr = JSON.parse(val)
        return Array.isArray(arr) && arr.every((n) => typeof n === 'number')
      } catch {
        return false
      }
    }, 'Each aspectId must be a valid array of numbers')
    .transform((val) => JSON.parse(val))
    .refine((arr) => arr.length > 0, 'aspectIds must contain at least one number'),

  /**
   * Array of requirement IDs to link to the identification.
   * Must be a valid JSON array of numbers.
   */
  requirementIds: z
    .string({ required_error: 'requirementIds is required' })
    .refine((val) => {
      try {
        const arr = JSON.parse(val)
        return Array.isArray(arr) && arr.every((n) => typeof n === 'number')
      } catch {
        return false
      }
    }, 'Each requirementId must be a valid array of numbers')
    .transform((val) => JSON.parse(val))
    .refine((arr) => arr.length > 0, 'requirementIds must contain at least one number'),

  /**
   * Array of legal basis IDs to link to the identification.
   * Must be a valid JSON array of numbers.
   */
  legalBasisIds: z
    .string({ required_error: 'legalBasisIds is required' })
    .refine((val) => {
      try {
        const arr = JSON.parse(val)
        return Array.isArray(arr) && arr.every((n) => typeof n === 'number')
      } catch {
        return false
      }
    }, 'Each legalBasisId must be a valid array of numbers')
    .transform((val) => JSON.parse(val))
    .refine((arr) => arr.length > 0, 'legalBasisIds must contain at least one number'),

  /**
   * Array of article IDs to link to the identification.
   * Must be a valid JSON array of numbers.
   */
  articleIds: z
    .string({ required_error: 'articleIds is required' })
    .refine((val) => {
      try {
        const arr = JSON.parse(val)
        return Array.isArray(arr) && arr.every((n) => typeof n === 'number')
      } catch {
        return false
      }
    }, 'Each articleId must be a valid array of numbers')
    .transform((val) => JSON.parse(val))
    .refine((arr) => arr.length > 0, 'articleIds must contain at least one number'),

  /**
   * Array of legal verb IDs to link to the identification.
   * Must be a valid JSON array of numbers.
   */
  legalVerbIds: z
    .string({ required_error: 'legalVerbIds is required' })
    .refine((val) => {
      try {
        const arr = JSON.parse(val)
        return Array.isArray(arr) && arr.every((n) => typeof n === 'number')
      } catch {
        return false
      }
    }, 'Each legalVerbId must be a valid array of numbers')
    .transform((val) => JSON.parse(val))
    .refine((arr) => arr.length > 0, 'legalVerbIds must contain at least one number'),

  /**
   * Array of requirement type IDs to link to the identification.
   * Must be a valid JSON array of numbers.
   */
  requirementTypeIds: z
    .string({ required_error: 'requirementTypeIds is required' })
    .refine((val) => {
      try {
        const arr = JSON.parse(val)
        return Array.isArray(arr) && arr.every((n) => typeof n === 'number')
      } catch {
        return false
      }
    }, 'Each requirementTypeId must be a valid array of numbers')
    .transform((val) => JSON.parse(val))
    .refine((arr) => arr.length > 0, 'requirementTypeIds must contain at least one number'),

  /**
   * Intelligence level.
   * Optional and nullable enum. Allowed values: 'High' or 'Low'.
   */
  intelligenceLevel: z
    .enum(['High', 'Low'], { message: 'The intelligenceLevel must be either "High" or "Low"' })
    .optional()
    .nullable()
})

/**
 * Zod validation schema for updating a req_identifications record.
 * Only allows updating name and description.
 */
export const reqIdentificationUpdateSchema = z.object({
  identificationName: z
    .string({ required_error: 'The identificationName is required' })
    .min(1, 'The identificationName cannot be empty')
    .max(255, 'The identificationName cannot exceed 255 characters'),

  identificationDescription: z.string().optional().nullable()
})
