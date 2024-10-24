// legalBasisValidation.js

import { z } from 'zod'

/**
 * Zod validation schema for a legal basis record.
 * Ensures that the input data meets the requirements for creating or updating a legal basis.
 * @type {z}
 */
const legalBasisSchema = z
  .object({
    /**
     * The name of the legal basis.
     * Must be a non-empty string.
     */
    legalName: z.string().min(1, 'The legal name is required'),

    /**
     * The classification of the legal basis.
     * Must be one of the predefined categories.
     */
    classification: z.enum([
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
    ], {
      message: 'The classification must be one of the following: Ley, Reglamento, Norma, Acuerdos, Código, Decreto, Lineamiento, Orden Jurídico, Aviso, Convocatoria, Plan, Programa, Recomendaciones'
    }),

    /**
     * The jurisdiction of the legal basis.
     * Must be one of 'Estatal', 'Federal', or 'Local'.
     */
    jurisdiction: z.enum(['Estatal', 'Federal', 'Local'], {
      message: 'The jurisdiction must be one of the following: Estatal, Federal, Local'
    }),

    /**
     * The state associated with the legal basis.
     * Optional field, applicable only for 'Estatal' and 'Local' jurisdictions.
     */
    state: z.string().optional(),

    /**
     * The municipality associated with the legal basis.
     * Optional field, applicable only for 'Local' jurisdiction.
     */
    municipality: z.string().optional(),

    /**
     * The date of the last reform of the legal basis.
     * Must be a valid date string.
     */
    lastReform: z.string().refine(
      (val) => !isNaN(Date.parse(val)),
      { message: 'The lastReform must be a valid date' }
    ),

    /**
     * The document associated with the legal basis.
     * Must have a valid mimetype (pdf, png, jpg, jpeg).
     * Optional field.
     */
    document: z
      .object({
        mimetype: z.string().refine(
          (mime) => ['application/pdf', 'image/png', 'image/jpg', 'image/jpeg'].includes(mime),
          { message: 'Invalid document type. Allowed types are: pdf, png, jpg, jpeg' }
        )
      })
      .optional()
  })
  .refine((data) => {
    /**
     * Validates fields based on the selected jurisdiction:
     * - 'Federal': No state or municipality should be provided.
     * - 'Estatal': A state must be provided, but no municipality.
     * - 'Local': Both state and municipality must be provided.
     */
    if (data.jurisdiction === 'Federal') {
      return !data.state && !data.municipality
    }
    if (data.jurisdiction === 'Estatal') {
      return data.state && !data.municipality
    }
    if (data.jurisdiction === 'Local') {
      return data.state && data.municipality
    }
    return true
  }, {
    message: 'Invalid fields for the selected jurisdiction',
    path: ['jurisdiction']
  })

export default legalBasisSchema
