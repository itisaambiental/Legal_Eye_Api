/**
 * Generates a dynamic legal basis data object for testing.
 * Includes optional fields (`state`, `municipality`, `removePicture`) only if provided.
 * Validates `legalName` to ensure it is not null, empty, or a default value.
 * @param {Object} overrides - Fields to override in the default data.
 * @returns {Object} - The generated legal basis data object.
 * @throws {Error} - If `legalName` is null, empty, or uses the default value.
 */
export default function generateLegalBasisData (overrides = {}) {
  const defaultData = {
    legalName: 'LegalName',
    abbreviation: 'abbreviation',
    classification: 'Reglamento',
    jurisdiction: 'Federal',
    lastReform: '01-01-2024',
    extractArticles: 'false'
  }
  const data = {
    ...defaultData,
    ...overrides
  }
  if ('state' in overrides) data.state = overrides.state
  if ('municipality' in overrides) data.municipality = overrides.municipality
  if ('removePicture' in overrides) data.removePicture = overrides.removePicture

  return data
}
