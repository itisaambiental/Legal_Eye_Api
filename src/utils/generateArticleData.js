/**
 * Generates a dynamic article data object for testing.
 * Allows overriding default fields to create custom test data.
 * @param {Object} overrides - Fields to override in the default article data.
 * @returns {Object} - The generated article data object.
 */
export default function generateArticleData (overrides = {}) {
  const defaultData = {
    title: 'Default Article Title',
    article: 'This is the default article content used for testing.',
    order: 1
  }
  return {
    ...defaultData,
    ...overrides
  }
}
