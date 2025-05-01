import rateLimit from 'express-rate-limit'
import RedisStore from 'rate-limit-redis'
import { redisClient } from '../config/redis.config.js'

/**
 * Rate limiter middleware.
 *
 * @type {import('express-rate-limit').RateLimitRequestHandler}
 */
const rateLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args)
  }),
  windowMs: 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false
})

export default rateLimiter
