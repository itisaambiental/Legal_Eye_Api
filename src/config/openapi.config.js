import { OpenAI } from 'openai'
import { OPENAI_API_KEY, ORGANIZATION_ID, PROJECT_ID } from './variables.config.js'

/**
 * Client options for OpenAI API configuration.
 * @type {ClientOptions}
 */
const options = {
  apiKey: OPENAI_API_KEY,
  organization: ORGANIZATION_ID,
  project: PROJECT_ID
}

/**
 * Configures the OpenAI API with the provided options.
 * @type {OpenAI}
 */
const openai = new OpenAI(options)

export default openai
