import { z } from 'zod'
import { isValid, parse, parseISO, format } from 'date-fns'

/**
 * Zod validation schema for a legal basis record.
 * This schema ensures that the input data meets the requirements for creating or updating a legal basis.
 */
const legalBasisSchema = z
  .object({
    /**
     * Legal basis name.
     * Must be a non-empty string with a maximum length of 255 characters.
     */
    legalName: z
      .string()
      .min(1, 'The legal name is required')
      .max(255, 'The legal name cannot exceed 255 characters'),

    /**
     * Abbreviation of the legal basis.
     * Must be a non-empty string with a maximum length of 255 characters.
     */
    abbreviation: z
      .string()
      .min(1, 'The abbreviation is required')
      .max(255, 'The abbreviation cannot exceed 255 characters'),

    /**
     * Subject ID associated with the legal basis.
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
     * Aspects IDs associated with the legal basis.
     * Must be a stringified JSON array of valid numbers.
     */
    aspectsIds: z
      .string()
      .refine((val) => {
        try {
          const parsedArray = JSON.parse(val)
          return (
            Array.isArray(parsedArray) &&
            parsedArray.every((item) => !isNaN(Number(item)))
          )
        } catch {
          return false
        }
      }, 'Each aspectId must be a valid array of numbers')
      .transform((val) => JSON.parse(val))
      .refine(
        (val) => val.length > 0,
        'aspectsIds must contain at least one number'
      ),

    /**
     * Classification of the legal basis.
     * Must be one of the predefined categories.
     */
    classification: z.enum(
      [
        'Ley',
        'Reglamento',
        'Norma',
        'Acuerdos',
        'Código',
        'Decreto',
        'Lineamiento',
        'Orden Jurídico',
        'Aviso',
        'Convocatoria',
        'Plan',
        'Programa',
        'Recomendaciones'
      ],
      {
        message:
          'The classification must be one of the following: Ley, Reglamento, Norma, Acuerdos, Código, Decreto, Lineamiento, Orden Jurídico, Aviso, Convocatoria, Plan, Programa, Recomendaciones'
      }
    ),

    /**
     * Jurisdiction of the legal basis.
     * Must be one of: 'Estatal', 'Federal', or 'Local'.
     */
    jurisdiction: z.enum(['Estatal', 'Federal', 'Local'], {
      message:
        'The jurisdiction must be one of the following: Estatal, Federal, Local'
    }),

    /**
     * State associated with the legal basis.
     * Optional; applicable for 'Estatal' and 'Local' jurisdictions.
     */
    state: z
      .string()
      .max(255, { message: 'The state cannot exceed 255 characters' })
      .optional(),

    /**
     * Municipality associated with the legal basis.
     * Optional; applicable only for 'Local' jurisdiction.
     */
    municipality: z
      .string()
      .max(255, { message: 'The municipality cannot exceed 255 characters' })
      .optional(),

    /**
     * Date of the last reform.
     * Must be a valid date string in either YYYY-MM-DD or DD-MM-YYYY format.
     */
    lastReform: z
      .string()
      .refine(
        (val) => {
          if (isValid(parseISO(val))) return true
          try {
            const parsedDate = parse(val, 'dd-MM-yyyy', new Date())
            return isValid(parsedDate)
          } catch {
            return false
          }
        },
        {
          message:
            'The lastReform must be a valid date in YYYY-MM-DD or DD-MM-YYYY format'
        }
      )
      .transform((val) => {
        if (!isValid(parseISO(val))) {
          const parsedDate = parse(val, 'dd-MM-yyyy', new Date())
          return format(parsedDate, 'yyyy-MM-dd')
        }
        return val
      }),

    /**
     * Document associated with the legal basis.
     * Optional; must have a valid mimetype (pdf, png, jpeg).
     */
    document: z
      .object({
        mimetype: z
          .string()
          .refine(
            (mime) =>
              ['application/pdf', 'image/png', 'image/jpeg'].includes(mime),
            {
              message:
                'Invalid document type. Allowed types are: pdf, png, jpeg'
            }
          )
      })
      .optional(),

    /**
     * Flag to remove the associated document.
     * Optional string that is transformed into a boolean.
     * Allowed values: 'true' or 'false'.
     */
    removeDocument: z
      .string()
      .optional()
      .refine(
        (value) => value === undefined || value === 'true' || value === 'false',
        {
          message: 'removeDocument must be either "true" or "false"'
        }
      )
      .transform((value) =>
        value === 'true' ? true : value === 'false' ? false : undefined
      ),

    /**
     * Flag indicating whether to extract articles from the document.
     * Must be either 'true' or 'false'. Transforms the string into a boolean.
     */
    extractArticles: z
      .string()
      .refine((value) => value === 'true' || value === 'false', {
        message: 'extractArticles must be either "true" or "false"'
      })
      .transform((value) => value === 'true'),

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
  .superRefine((data, context) => {
    if (data.jurisdiction === 'Federal') {
      if (data.state) {
        context.addIssue({
          path: ['state'],
          message: 'State should not be provided for Federal jurisdiction'
        })
      }
      if (data.municipality) {
        context.addIssue({
          path: ['municipality'],
          message:
            'Municipality should not be provided for Federal jurisdiction'
        })
      }
    } else if (data.jurisdiction === 'Estatal') {
      if (!data.state) {
        context.addIssue({
          path: ['state'],
          message: 'State must be provided for Estatal jurisdiction'
        })
      }
      if (data.municipality) {
        context.addIssue({
          path: ['municipality'],
          message:
            'Municipality should not be provided for Estatal jurisdiction'
        })
      }
    } else if (data.jurisdiction === 'Local') {
      if (!data.state) {
        context.addIssue({
          path: ['state'],
          message: 'State must be provided for Local jurisdiction'
        })
      }
      if (!data.municipality) {
        context.addIssue({
          path: ['municipality'],
          message: 'Municipality must be provided for Local jurisdiction'
        })
      }
    }
  })

export default legalBasisSchema
