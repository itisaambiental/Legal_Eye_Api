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
     * The aspect associated with the requirement.
     * Must be a string that can be converted to a valid number.
     */
    aspectId: z
      .string()
      .refine(
        (val) => !isNaN(Number(val)),
        'The aspectId must be a valid number'
      )
      .transform((val) => Number(val)),
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
    evidence: z.enum(['Trámite', 'Registro', 'Específico', 'Documento'], {
      message:
        'The evidence type must be one of the following: Trámite, Registro, Específico, Documento.'
    }),

    /**
     * The periodicity of the requirement.
     */
    periodicity: z.enum(['Anual', '2 años', 'Por evento', 'Única vez'], {
      message:
        'The periodicity must be one of the following: Anual, 2 años, Por evento, Única vez.'
    }),

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
  })

export default requirementSchema
