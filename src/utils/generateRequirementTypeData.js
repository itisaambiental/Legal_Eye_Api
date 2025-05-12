/**
 * Generates test data for a requirement type.
 * You can override any field by passing an object.
 *
 * @param {Object} overrides - Fields to override.
 * @returns {Object} - Generated requirement type.
 */
export default function generateRequirementTypeData (overrides = {}) {
  const defaultData = {
    name: 'Default Requirement Type',
    description: 'A general-purpose requirement type for testing.',
    classification: 'General'
  }

  return {
    ...defaultData,
    ...overrides
  }
}
