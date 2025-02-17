/**
 * Exports the Redis configuration object based on the current environment.
 * Adjusts Redis settings for production, development, and test environments.
 */

import {
  REDIS_PASS,
  REDIS_USER,
  REDIS_HOST,
  REDIS_PORT,
  REDIS_PASS_DEV,
  REDIS_USER_DEV,
  REDIS_HOST_DEV,
  REDIS_PORT_DEV,
  REDIS_PASS_TEST,
  REDIS_USER_TEST,
  REDIS_HOST_TEST,
  REDIS_PORT_TEST,
  NODE_ENV
} from './variables.config.js'

/**
 * Determine if the environment is production.
 * @type {boolean}
 */
const isProduction = NODE_ENV === 'production'

/**
 * Determine if the environment is test.
 * @type {boolean}
 */
const isTest = NODE_ENV === 'test'

/**
 * The Redis configuration settings.
 * @type {Object}
 */
export const redisConfig = {
  host: isProduction ? REDIS_HOST : isTest ? REDIS_HOST_TEST : REDIS_HOST_DEV,
  port: isProduction ? REDIS_PORT : isTest ? REDIS_PORT_TEST : REDIS_PORT_DEV,
  password: isProduction ? REDIS_PASS : isTest ? REDIS_PASS_TEST : REDIS_PASS_DEV,
  username: isProduction ? REDIS_USER : isTest ? REDIS_USER_TEST : REDIS_USER_DEV,
  db: 0,
  connectTimeout: 10000
}
