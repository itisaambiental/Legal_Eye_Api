/**
 * Generates a dynamic requirement data object for testing.
 * Includes optional fields (`state`, `municipality`) only if provided.
 * @param {Object} overrides - Fields to override in the default data.
 * @returns {Object} - The generated requirement data object.
 */
export default function generateRequirementData (overrides = {}) {
  const defaultData = {
    requirementNumber: 'REQ-001',
    requirementName: 'Test Requirement',
    mandatoryDescription: 'This is a mandatory description.',
    complementaryDescription: 'This is a complementary description.',
    mandatorySentences: 'Mandatory legal sentences here.',
    complementarySentences: 'Complementary legal sentences here.',
    mandatoryKeywords: 'Mandatory, Requirement',
    complementaryKeywords: 'Complementary, Requirement',
    condition: 'Crítica',
    evidence: 'Documento',
    periodicity: 'Anual',
    requirementType: 'Identificación Estatal'
  }

  const data = { ...defaultData, ...overrides }
  if ('state' in overrides) data.state = overrides.state
  if ('municipality' in overrides) data.municipality = overrides.municipality

  return data
}
