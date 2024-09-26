// Redis Config
import {
  REDIS_PASS,
  REDIS_USER,
  REDIS_HOST,
  REDIS_PORT,
  REDIS_PASS_DEV,
  REDIS_USER_DEV,
  REDIS_HOST_DEV,
  REDIS_PORT_DEV,
  NODE_ENV
} from './variables.config.js'

export const redisConfig = {
  host: NODE_ENV === 'production' ? REDIS_HOST : REDIS_HOST_DEV,
  port: NODE_ENV === 'production' ? REDIS_PORT : REDIS_PORT_DEV,
  password: NODE_ENV === 'production' ? REDIS_PASS : REDIS_PASS_DEV,
  username: NODE_ENV === 'production' ? REDIS_USER : REDIS_USER_DEV,
  db: 0,
  connectTimeout: 10000
}
