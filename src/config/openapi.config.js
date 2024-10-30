import { OpenAI } from 'openai'
import { OPENAI_API_KEY } from './variables.config.js'

/**
 * Client options for OpenAI API configuration.
 * @type {ClientOptions}
 */
const options = {
  apiKey: OPENAI_API_KEY,
  organization: 'org-Z5bbfxV9x0P2woKLdPIny9xd',
  project: 'proj_kwjYuV764YzgPcf11rXclPyC'
}

/**
 * Configures the OpenAI API with the provided options.
 * @type {OpenAI}
 */
const openai = new OpenAI(options)

export default openai
