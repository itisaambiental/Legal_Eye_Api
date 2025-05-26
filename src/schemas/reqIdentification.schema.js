// src/schemas/reqIdentification.schema.js
import { z } from 'zod'

/**
 * Preprocesa un valor que puede ser:
 *  - un array de números
 *  - o una cadena JSON que lo encodea
 * y lo convierte en un Array<number> non-empty.
 */
const parseNumberArray = z.preprocess((val) => {
  if (typeof val === 'string') {
    try {
      return JSON.parse(val)
    } catch {
      return val
    }
  }
  return val
}, z.array(z.number().int()).min(1, 'El array debe contener al menos un número'))

/**
 * Preprocesa un valor que puede ser:
 *  - un número
 *  - o una cadena numérica
 * y lo convierte en number.
 */
const parseNumber = z.preprocess((val) => {
  if (typeof val === 'string' && val.trim() !== '') {
    const n = Number(val)
    return Number.isNaN(n) ? val : n
  }
  return val
}, z.number().int().positive('El valor debe ser un entero positivo'))

/**
 * Schema para la **creación** de la cabecera en `req_identifications`.
 * Sólo valida name, description y userId.
 */
export const reqIdentificationCreateSchema = z.object({
  identificationName: z
    .string({ required_error: 'La identificación es obligatoria' })
    .min(1, 'La identificación no puede estar vacía')
    .max(255, 'La identificación no puede exceder 255 caracteres'),
  identificationDescription: z.string().optional().nullable(),
  userId: z.preprocess(
    (v) => (v == null ? v : Number(v)),
    z.number().int().optional().nullable()
  )
})

/**
 * Schema **completo** para enlazar recursos a una identificación:
 * subjectId, aspectIds, requirementIds, legalBasisIds, articleIds, legalVerbIds, requirementTypeIds.
 */
export const reqIdentificationLinkSchema = z.object({
  // estos tres vienen de la creación previa
  identificationId: parseNumber,
  // ahora todo lo que venga para el proceso de enlace:
  subjectId: parseNumber.optional(),
  aspectIds: parseNumberArray.optional(),
  requirementIds: parseNumberArray.optional(),
  legalBasisIds: parseNumberArray.optional(),
  articleIds: parseNumberArray.optional(),
  legalVerbIds: parseNumberArray.optional(),
  requirementTypeIds: parseNumberArray.optional(),
  intelligenceLevel: z
    .enum(['High', 'Low'], {
      required_error: 'El nivel de inteligencia debe ser "High" o "Low"'
    })
    .optional()
    .nullable()
})

/**
 * Schema para **update** de solo nombre y descripción.
 */
export const reqIdentificationUpdateSchema = z
  .object({
    identificationName: z
      .string({ required_error: 'La identificación es obligatoria' })
      .min(1, 'La identificación no puede estar vacía')
      .max(255, 'La identificación no puede exceder 255 caracteres'),
    identificationDescription: z.string().optional().nullable()
  })
  .strict()
