import LlamaAI from 'llamaai'
import { LLAMA_API_KEY } from './variables.config.js'

/**
 * Configures the LlamaAI API with the provided API KEY.
 * @type {LlamaAI}
 */
const llamaAPI = new LlamaAI(LLAMA_API_KEY)

export default llamaAPI
