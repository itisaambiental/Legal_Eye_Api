/**
 * Initializes and exports analize queue for requirements identification using Bull.
 * Configures the queue with Redis settings and default job options.
 */

import Queue from 'bull'
import { redisConfig } from '../config/redis.config.js'

/**
 * Queue instance for processing requirements identification jobs.
 * @type {import('bull').Queue}
 */

const requirementsIdentificationQueue = new Queue('requirementsIdentificationQueue', {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: 10,
    removeOnFail: 5
  }
})

export default requirementsIdentificationQueue
