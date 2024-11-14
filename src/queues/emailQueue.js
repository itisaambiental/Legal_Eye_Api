/**
 * Initializes and exports the email queue using Bull.
 * Configures the queue with Redis settings and default job options.
 */

import Queue from 'bull'
import { redisConfig } from '../config/redis.config.js'

/**
 * The email queue for processing email sending jobs.
 * @type {Queue}
 */
const emailQueue = new Queue('emailQueue', {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: 10000,
    removeOnComplete: 10,
    removeOnFail: 5
  }
})

export default emailQueue
