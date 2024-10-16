// validations/legalBasisValidation.js

import { z } from 'zod'

// Validation schema for a legal basis record
const legalBasisSchema = z.object({
  legalName: z.string().min(1, 'The legal name is required'),
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
  jurisdiction: z.enum(['Estatal', 'Federal', 'Local'], {
    message: 'The jurisdiction must be one of the following: Estatal, Federal, Local'
  }),
  state: z.string().optional(),
  municipality: z.string().optional(),
  lastReform: z.string().refine(
    (val) => !isNaN(Date.parse(val)),
    { message: 'The lastReform must be a valid date' }
  ),
  document: z
    .object({
      mimetype: z.string().refine(
        (mime) => ['application/pdf', 'image/png', 'image/jpg', 'image/jpeg'].includes(mime),
        { message: 'Invalid document type. Allowed types are: pdf, png, jpg, jpeg' }
      )
    })
    .optional()
}).refine((data) => {
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
