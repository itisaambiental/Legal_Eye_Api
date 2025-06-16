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
 * Available AI models, grouped by category.
 */
export const models = {
  text: {
    High: 'gpt-4.1',
    Low: 'gpt-4.1-mini'
  },
  reasoning: {
    High: 'o3',
    Low: 'o1'
  }
}

/**
 * Gets the text generation model based on intelligence level.
 *
 * @param {'High' | 'Low' | null | undefined} level
 * @returns {string}
 */
export function getTextModel (level) {
  return level === 'High' ? models.text.High : models.text.Low
}

/**
 * Gets the reasoning model based on intelligence level.
 *
 * @param {'High' | 'Low' | null | undefined} level
 * @returns {string}
 */
export function getReasoningModel (level) {
  return level === 'High' ? models.reasoning.High : models.reasoning.Low
}

export default openai
