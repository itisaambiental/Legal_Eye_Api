import Queue from 'bull'
import { redisConfig } from '../config/redis.config.js'
import { LIMIT_EXTRACT_ARTICLES } from '../config/variables.config.js'

/**
 * Rate limiter configuration for the extract articles queue.
 * @type {import('bull').RateLimiter}
 */
const limiter = {
  max: Number(LIMIT_EXTRACT_ARTICLES),
  duration: 5000,
  bounceBack: true
}

/**
 * The Article queue for processing extract articles sending jobs.
 * @type {import('bull').Queue}
 */
const extractArticlesQueue = new Queue('extractArticlesQueue', {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: 10,
    removeOnFail: 5
  },
  limiter
})

export default extractArticlesQueue
