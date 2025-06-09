/**
 * Generates a dynamic requirement identification data object for testing.
 * @param {Object} overrides - Fields to override in the default data.
 * @returns {Object} - The generated requirement identification data object.
 */
export default function generateReqIdentificationData (overrides = {}) {
  const defaultData = {
    reqIdentificationName: 'Test Identification',
    reqIdentificationDescription: 'Descripción de prueba para identificación',
    legalBasisIds: [],
    intelligenceLevel: 'High'
  }
  const data = { ...defaultData, ...overrides }
  if (Array.isArray(data.legalBasisIds)) {
    data.legalBasisIds = JSON.stringify(data.legalBasisIds)
  }
  return data
}
