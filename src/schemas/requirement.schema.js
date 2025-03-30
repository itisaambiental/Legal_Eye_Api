import { z } from 'zod'

/**
 * Zod validation schema for a legal basis record.
 * Ensures that the input data meets the requirements for creating or updating a legal basis.
 */
const requirementSchema = z
  .object({
    /**
     * The subject associated with the requirement.
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

    * Aspects IDs associated with the requirement.
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
     * The unique number identifying the requirement.
     */
    requirementNumber: z
      .string()
      .min(1, 'The requirement number is required')
      .max(255, 'The requirement number cannot exceed 255 characters'),

    /**
     * The name of the requirement.
     * Must be a non-empty string with a maximum length of 255 characters.
     */
    requirementName: z
      .string()
      .min(1, 'The requirement name is required')
      .max(255, 'The requirement name cannot exceed 255 characters'),

    /**
     * The mandatory description of the requirement.
     */

    mandatoryDescription: z
      .string()
      .min(1, 'The mandatory description is required.'),

    /**
     * The complementary description of the requirement.
     */
    complementaryDescription: z
      .string()
      .min(1, 'The complementary description is required.'),

    /**
     * The mandatory legal sentences related to the requirement.
     */
    mandatorySentences: z
      .string()
      .min(1, 'The mandatory sentences are required.'),

    /**
     * The complementary legal sentences related to the requirement.
     */
    complementarySentences: z
      .string()
      .min(1, 'The complementary sentences are required.'),

    /**
     * Keywords related to the mandatory aspect of the requirement.
     */
    mandatoryKeywords: z
      .string()
      .min(1, 'The mandatory keywords are required.'),

    /**
     * Keywords related to the complementary aspect of the requirement.
     */
    complementaryKeywords: z
      .string()
      .min(1, 'The complementary keywords are required.'),

    /**
     * The condition type of the requirement.
     */
    condition: z.enum(['Crítica', 'Operativa', 'Recomendación', 'Pendiente'], {
      message:
        'The condition must be one of the following: Crítica, Operativa, Recomendación, Pendiente.'
    }),
    /**
     * The type of evidence of the requirement.
     */
    evidence: z.enum(['Trámite', 'Registro', 'Específica', 'Documento'], {
      message:
        'The evidence type must be one of the following: Trámite, Registro, Específica, Documento.'
    }),

    /**
     * The type of specifyEvide of the requirement.
     */
    specifyEvidence: z
      .string()
      .max(255, 'The specifyEvidence field cannot exceed 255 characters')
      .optional(),

    /**
     * The periodicity of the requirement.
     */
    periodicity: z.enum(['Anual', '2 años', 'Por evento', 'Única vez', 'Específica'], {
      message:
        'The periodicity must be one of the following: Anual, 2 años, Por evento, Única vez.'
    }),

    /**
     * The type of specifyPeriodicity of the requirement.
     */
    specifyPeriodicity: z
      .string()
      .max(255, 'The specifyPeriodicity field cannot exceed 255 characters')
      .optional(),

    /**
     * The type of the requirement.
     */
    requirementType: z.enum(
      [
        'Identificación Estatal',
        'Identificación Federal',
        'Identificación Local',
        'Requerimiento Compuesto',
        'Requerimiento Compuesto e Identificación',
        'Requerimiento Estatal',
        'Requerimiento Local'
      ],
      {
        message:
          'The requirement type must be one of the allowed options: Identificación Estatal, Identificación Federal, Identificación Local, Requerimiento Compuesto, Requerimiento Compuesto e Identificación, Requerimiento Estatal, Requerimiento Local.'
      }
    ),
    /**
     * The jurisdiction of the requirement.
     * Must be one of 'Estatal', 'Federal', or 'Local'.
     */
    jurisdiction: z.enum(['Estatal', 'Federal', 'Local'], {
      message:
        'The jurisdiction must be one of the following: Estatal, Federal, Local'
    }),

    /**
     * The state associated with the requirement.
     * Optional field, applicable only for 'Estatal' and 'Local' jurisdictions.
     */
    state: z
      .string()
      .max(255, { message: 'The state cannot exceed 255 characters' })
      .optional(),

    /**
     * The municipality associated with the requirement.
     * Optional field, applicable only for 'Local' jurisdiction.
     */
    municipality: z
      .string()
      .max(255, { message: 'The municipality cannot exceed 255 characters' })
      .optional()
  })
  .superRefine((data, context) => {
    /**
     * Validates fields based on the selected jurisdiction:
     * - 'Federal': No state or municipality should be provided.
     * - 'Estatal': A state must be provided, but no municipality.
     * - 'Local': Both state and municipality must be provided.
     */
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
    if (data.evidence === 'Específica') {
      if (!data.specifyEvidence || data.specifyEvidence.trim() === '') {
        context.addIssue({
          path: ['specifyEvidence'],
          message: 'You must specify evidence when "Específico" is selected'
        })
      }
    } else if (data.specifyEvidence && data.specifyEvidence.trim() !== '') {
      context.addIssue({
        path: ['specifyEvidence'],
        message:
              'The specifyEvidence field must be empty unless evidence is "Específica"'
      })
    }
    if (data.periodicity === 'Específica') {
      if (!data.specifyPeriodicity || data.specifyPeriodicity.trim() === '') {
        context.addIssue({
          path: ['specifyPeriodicity'],
          message: 'You must specify the periodicity when "Específica" is selected'
        })
      }
    } else if (data.specifyPeriodicity && data.specifyPeriodicity.trim() !== '') {
      context.addIssue({
        path: ['specifyPeriodicity'],
        message:
              'The specifyPeriodicity field must be empty unless periodicity is "Específica"'
      })
    }
  })

export default requirementSchema
