/**
 * Initializes and exports the email queue using Bull.
 * Configures the queue with Redis settings and default job options.
 */

import Queue from 'bull'
import { redisConfig } from '../config/redis.config.js'

/**
 * The legalBasis queue for processing legalBasis sending jobs.
 * @type {Queue}
 */
const legalBasis = new Queue('legalBasis', {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: true,
    removeOnFail: true
  }
})

export default legalBasis
