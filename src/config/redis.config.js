import {
  REDIS_PASS,
  REDIS_USER,
  REDIS_HOST,
  REDIS_PORT,
  REDIS_PASS_TEST,
  REDIS_USER_TEST,
  REDIS_HOST_TEST,
  REDIS_PORT_TEST,
  NODE_ENV
} from './variables.config.js'

/**
 * Determine if the application is running in the test environment
 * @type {boolean}
 */
const isTest = NODE_ENV === 'test'

/**
 * The Redis configuration settings.
 * @type {Object}
 */
export const redisConfig = {
  host: isTest ? REDIS_HOST_TEST : REDIS_HOST,
  port: isTest ? REDIS_PORT_TEST : REDIS_PORT,
  password: isTest ? REDIS_PASS_TEST : REDIS_PASS,
  username: isTest ? REDIS_USER_TEST : REDIS_USER,
  db: 0,
  connectTimeout: 10000
}
