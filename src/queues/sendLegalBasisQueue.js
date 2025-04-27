/**
 * Initializes and exports the sendLegalBasis queue using Bull.
 * Configures the queue with Redis settings and default job options.
 */

import Queue from 'bull'
import { redisConfig } from '../config/redis.config.js'

/**
 * The SendLegalBasis queue for processing legal basis sending jobs.
 * @type {import('bull').Queue}
 */
const sendLegalBasisQueue = new Queue('sendLegalBasisQueue', {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: 10,
    removeOnFail: 5
  }
})

export default sendLegalBasisQueue
