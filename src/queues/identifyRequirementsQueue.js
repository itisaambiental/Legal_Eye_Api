/**
 * Initializes and exports the identify requirements queue using Bull.
 * Configures the queue with Redis settings and default job options.
 */

import Queue from 'bull'
import { redisConfig } from '../config/redis.config.js'

/**
 * The identify requirements queue for processing sending jobs.
 * @type {import('bull').Queue}
 */
const identifyRequirementsQueue = new Queue('identifyRequirementsQueue', {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: 10,
    removeOnFail: 5
  }
})

export default identifyRequirementsQueue
