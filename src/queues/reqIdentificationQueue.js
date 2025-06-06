import Queue from 'bull'
import { redisConfig } from '../config/redis.config.js'
import { LIMIT_REQ_IDENTIFICATIONS } from '../config/variables.config.js'

/**
 * Rate limiter configuration for the reqIdentification queue.
 * @type {import('bull').RateLimiter}
 */
const limiter = {
  max: Number(LIMIT_REQ_IDENTIFICATIONS),
  duration: 5000,
  bounceBack: true
}

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
  },
  limiter
})

export default reqIdentificationQueue
