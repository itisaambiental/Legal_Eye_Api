/**
 * Initializes and exports the email queue using Bull.
 * Configures the queue with Redis settings and default job options.
 */

import Queue from 'bull'
import { redisConfig } from '../config/redis.config.js'

/**
 * The Article queue for processing articles sending jobs.
 * @type {import('bull').Queue}
 */
const articlesQueue = new Queue('articlesQueue', {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 1,
    backoff: 10000,
    removeOnComplete: 10,
    removeOnFail: 5
  }
})

export default articlesQueue
