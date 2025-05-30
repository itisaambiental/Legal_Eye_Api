import Queue from 'bull'
import { redisConfig } from '../config/redis.config.js'

/**
 * The queue for processing requirement identification jobs.
 * @type {import('bull').Queue}
 */
const reqIdentificationQueue = new Queue('reqIdentificationQueue', {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: 10,
    removeOnFail: 5
  }
})

export default reqIdentificationQueue
