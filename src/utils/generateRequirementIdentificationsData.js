/**
 * Generates a dynamic requirements identification payload for testing.
 * @param {Object} overrides - Fields to override in the default payload.
 * @returns {Object} - The generated requirements identification payload.
 */
export default function generateRequirementIdentificationsData (overrides = {}) {
  const defaultData = {
    identificationName: 'Identificación de Prueba',
    identificationDescription: 'Descripción por defecto para testing.',
    legalBasisIds: [],
    subjectId: '',
    aspectIds: [],
    intelligenceLevel: 'High'
  }
  return {
    ...defaultData,
    ...overrides
  }
}
