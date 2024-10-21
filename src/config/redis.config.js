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
 * The Redis configuration settings.
 * @type {Object}
 */
export const redisConfig = {
  host:
    NODE_ENV === 'production'
      ? REDIS_HOST
      : NODE_ENV === 'test'
        ? REDIS_HOST_TEST
        : REDIS_HOST_DEV,

  port:
    NODE_ENV === 'production'
      ? REDIS_PORT
      : NODE_ENV === 'test'
        ? REDIS_PORT_TEST
        : REDIS_PORT_DEV,

  password:
    NODE_ENV === 'production'
      ? REDIS_PASS
      : NODE_ENV === 'test'
        ? REDIS_PASS_TEST
        : REDIS_PASS_DEV,

  username:
    NODE_ENV === 'production'
      ? REDIS_USER
      : NODE_ENV === 'test'
        ? REDIS_USER_TEST
        : REDIS_USER_DEV,

  db: 0,
  connectTimeout: 10000
}
