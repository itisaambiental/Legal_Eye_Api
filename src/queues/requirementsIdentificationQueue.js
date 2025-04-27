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
