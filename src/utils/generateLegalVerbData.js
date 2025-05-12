/**
 * Generates test data for a legal verb.
 * You can override any field by passing an object.
 *
 * @param {Object} overrides - Fields to override.
 * @returns {Object} - Generated legal verb.
 */
export default function generateLegalVerbData (overrides = {}) {
  const defaultData = {
    name: 'Default Legal Verb',
    description: 'A generic legal verb for testing.',
    translation: 'Default Translation'
  }

  return {
    ...defaultData,
    ...overrides
  }
}
