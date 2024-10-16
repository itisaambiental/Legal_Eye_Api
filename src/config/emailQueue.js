import Queue from 'bull'
import { redisConfig } from './redis.config.js'

// Email queue
const emailQueue = new Queue('emailQueue', {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: 10000,
    removeOnComplete: true
  }
})

export default emailQueue
