import { z } from 'zod'

/**
 * Zod validation schema for a requirement record.
 * This schema ensures that the input data meets the requirements for creating or updating a legal requirement.
 */
const requirementSchema = z
  .object({
    /**
     * ID of the associated subject.
     * Must be a number (can be passed as string and coerced).
     */
    subjectId: z.coerce
      .number({ invalid_type_error: 'The subjectId must be a valid number' })
      .refine((val) => !Number.isNaN(val), {
        message: 'The subjectId must be a valid number'
      }),

    /**
     * IDs of the associated aspects.
     */
    aspectsIds: z.preprocess(
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
              invalid_type_error: 'Each aspect ID must be a number'
            })
            .int('Each aspect ID must be an integer')
        )
        .min(1, {
          message: 'aspectsIds must contain at least one number'
        })
    ),

    /**
     * Requirement number.
     */
    requirementNumber: z.coerce
      .number({ invalid_type_error: 'The requirementNumber must be a number' })
      .int('The requirementNumber must be an integer')
      .positive('The requirementNumber must be greater than 0'),

    /**
     * Name or title of the requirement.
     * Must be a non-empty string with a maximum of 255 characters.
     */
    requirementName: z
      .string()
      .min(1, 'The requirement name is required')
      .max(255, 'The requirement name cannot exceed 255 characters'),

    /**
     * Description of mandatory elements of the requirement.
     * Must be a non-empty string.
     */
    mandatoryDescription: z
      .string()
      .min(1, 'The mandatory description is required.'),

    /**
     * Description of complementary elements of the requirement.
     * Must be a non-empty string.
     */
    complementaryDescription: z
      .string()
      .min(1, 'The complementary description is required.'),

    /**
     * Phrases or sentences that support the mandatory requirement.
     * Must be a non-empty string.
     */
    mandatorySentences: z
      .string()
      .min(1, 'The mandatory sentences are required.'),

    /**
     * Phrases or sentences that support the complementary requirement.
     * Must be a non-empty string.
     */
    complementarySentences: z
      .string()
      .min(1, 'The complementary sentences are required.'),

    /**
     * Keywords associated with the mandatory requirement.
     * Must be a non-empty string.
     */
    mandatoryKeywords: z
      .string()
      .min(1, 'The mandatory keywords are required.'),

    /**
     * Keywords associated with the complementary requirement.
     * Must be a non-empty string.
     */
    complementaryKeywords: z
      .string()
      .min(1, 'The complementary keywords are required.'),

    /**
     * Condition or criticality level of the requirement.
     * Must be one of: Crítica, Operativa, Recomendación, Pendiente.
     */
    condition: z.enum(['Crítica', 'Operativa', 'Recomendación', 'Pendiente'], {
      message:
        'The condition must be one of the following: Crítica, Operativa, Recomendación, Pendiente.'
    }),

    /**
     * Type of evidence required for the requirement.
     * Must be one of: Trámite, Registro, Específica, Documento.
     */
    evidence: z.enum(['Trámite', 'Registro', 'Específica', 'Documento'], {
      message:
        'The evidence type must be one of the following: Trámite, Registro, Específica, Documento.'
    }),

    /**
     * If evidence is "Específica", this field must contain a description.
     * Optional otherwise.
     */
    specifyEvidence: z
      .string()
      .max(255, 'The specifyEvidence field cannot exceed 255 characters')
      .nullable()
      .optional(),

    /**
     * Periodicity of the requirement.
     * Must be one of: Anual, 2 años, Por evento, Única vez, Específica.
     */
    periodicity: z.enum(['Anual', '2 años', 'Por evento', 'Única vez', 'Específica'], {
      message:
        'The periodicity must be one of the following: Anual, 2 años, Por evento, Única vez, Específica'
    }),

    /**
     * Acceptance criteria for the requirement.
     * Must be a non-empty string.
     */
    acceptanceCriteria: z
      .string()
      .min(1, 'The acceptance criteria is required.')
  })
  .superRefine((data, context) => {
    /**
     * Custom validation rules:
     * - If evidence is "Específica", specifyEvidence must be provided.
     * - If evidence is not "Específica", specifyEvidence must be empty or undefined.
     */
    if (data.evidence === 'Específica') {
      if (!data.specifyEvidence || data.specifyEvidence.trim() === '') {
        context.addIssue({
          path: ['specifyEvidence'],
          message: 'You must specify evidence when "Específica" is selected'
        })
      }
    } else if (data.specifyEvidence && data.specifyEvidence.trim() !== '') {
      context.addIssue({
        path: ['specifyEvidence'],
        message:
          'The specifyEvidence field must be empty unless evidence is "Específica"'
      })
    }
  })

export default requirementSchema
