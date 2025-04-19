import { OpenAI } from 'openai'
import { OPENAI_API_KEY, ORGANIZATION_ID, PROJECT_ID } from './variables.config.js'

/**
 * Client options for OpenAI API configuration.
 * @type {import('openai').ClientOptions}
 */
const options = {
  apiKey: OPENAI_API_KEY,
  organization: ORGANIZATION_ID,
  project: PROJECT_ID
}

/**
 * OpenAI client instance.
 * @type {OpenAI}
 */
const openai = new OpenAI(options)

/**
 * Available AI models.
 */
export const models = {
  High: 'gpt-4o',
  Low: 'gpt-4o-mini'
}

/**
 * Selects the appropriate model based on the given intelligence level.
 *
 * @param {'High' | 'Low' | null | undefined} level - The desired level of intelligence.
 * @returns {string} - The model identifier.
 */
export function getModel (level) {
  return level === 'High' ? models.High : models.Low
}

export default openai
