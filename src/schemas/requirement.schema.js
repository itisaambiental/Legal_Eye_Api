import { z } from 'zod'

const requirementSchema = z
  .object({
    subjectId: z
      .string()
      .refine(
        (val) => !isNaN(Number(val)),
        'The subjectId must be a valid number'
      )
      .transform((val) => Number(val)),

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

    requirementNumber: z
      .string()
      .min(1, 'The requirement number is required')
      .max(255, 'The requirement number cannot exceed 255 characters'),

    requirementName: z
      .string()
      .min(1, 'The requirement name is required')
      .max(255, 'The requirement name cannot exceed 255 characters'),

    mandatoryDescription: z
      .string()
      .min(1, 'The mandatory description is required.'),

    complementaryDescription: z
      .string()
      .min(1, 'The complementary description is required.'),

    mandatorySentences: z
      .string()
      .min(1, 'The mandatory sentences are required.'),

    complementarySentences: z
      .string()
      .min(1, 'The complementary sentences are required.'),

    mandatoryKeywords: z
      .string()
      .min(1, 'The mandatory keywords are required.'),

    complementaryKeywords: z
      .string()
      .min(1, 'The complementary keywords are required.'),

    condition: z.enum(['Crítica', 'Operativa', 'Recomendación', 'Pendiente'], {
      message:
        'The condition must be one of the following: Crítica, Operativa, Recomendación, Pendiente.'
    }),

    evidence: z.enum(['Trámite', 'Registro', 'Específica', 'Documento'], {
      message:
        'The evidence type must be one of the following: Trámite, Registro, Específica, Documento.'
    }),

    specifyEvidence: z
      .string()
      .max(255, 'The specifyEvidence field cannot exceed 255 characters')
      .optional(),

    periodicity: z.enum(['Anual', '2 años', 'Por evento', 'Única vez', 'Específica'], {
      message:
        'The periodicity must be one of the following: Anual, 2 años, Por evento, Única vez.'
    }),

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
          'The requirement type must be one of the allowed options.'
      }
    )
  })
  .superRefine((data, context) => {
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
