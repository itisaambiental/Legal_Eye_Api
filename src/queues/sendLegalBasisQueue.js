import Queue from 'bull'
import { redisConfig } from '../config/redis.config.js'
import { LIMIT_SEND_LEGAL_BASIS } from '../config/variables.config.js'

/**
 * Rate limiter configuration for the SendLegalBasis queue.
 * @type {import('bull').RateLimiter}
 */
const limiter = {
  max: Number(LIMIT_SEND_LEGAL_BASIS),
  duration: 5000,
  bounceBack: true
}

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
  },
  limiter
})

export default sendLegalBasisQueue
