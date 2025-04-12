import { z } from 'zod'

/**
 * Zod validation schema for a requirement record.
 * This schema ensures that the input data meets the requirements for creating or updating a legal requirement.
 */
const requirementSchema = z
  .object({
    /**
     * ID of the associated subject.
     * Must be a string convertible to a number.
     */
    subjectId: z
      .string()
      .refine(
        (val) => !isNaN(Number(val)),
        'The subjectId must be a valid number'
      )
      .transform((val) => Number(val)),

    /**
     * IDs of the associated aspects.
     * Must be a stringified JSON array of numbers.
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
     * Unique requirement number (clave).
     * Must be a non-empty string with a maximum of 255 characters.
     */
    requirementNumber: z
      .string()
      .min(1, 'The requirement number is required')
      .max(255, 'The requirement number cannot exceed 255 characters'),

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
     * Must be one of the following: Crítica, Operativa, Recomendación, Pendiente.
     */
    condition: z.enum(['Crítica', 'Operativa', 'Recomendación', 'Pendiente'], {
      message:
        'The condition must be one of the following: Crítica, Operativa, Recomendación, Pendiente.'
    }),

    /**
     * Type of evidence required for the requirement.
     * Must be one of the following: Trámite, Registro, Específica, Documento.
     */
    evidence: z.enum(['Trámite', 'Registro', 'Específica', 'Documento'], {
      message:
        'The evidence type must be one of the following: Trámite, Registro, Específica, Documento.'
    }),

    /**
     * If evidence is "Específica", this field must contain a description.
     * Must be a string with a max of 255 characters.
     * Optional otherwise.
     */
    specifyEvidence: z
      .string()
      .max(255, 'The specifyEvidence field cannot exceed 255 characters')
      .optional(),

    /**
     * Periodicity of the requirement.
     * Must be one of the following: Anual, 2 años, Por evento, Única vez, Específica.
     */
    periodicity: z.enum(['Anual', '2 años', 'Por evento', 'Única vez', 'Específica'], {
      message:
        'The periodicity must be one of the following: Anual, 2 años, Por evento, Única vez.'
    })
  })
  .superRefine((data, context) => {
    /**
     * Custom validations:
     * - If evidence is "Específica", then specifyEvidence is required.
     * - If evidence is not "Específica", then specifyEvidence must be empty or undefined.
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
