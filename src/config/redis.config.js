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
 * Defines the Redis configuration settings based on the current environment.
 * Each environment (development, test, production) has its own Redis parameters.
 * @type {Object}
 */
const config = {
  development: {
    host: REDIS_HOST_DEV,
    port: REDIS_PORT_DEV,
    password: REDIS_PASS_DEV,
    username: REDIS_USER_DEV
  },
  test: {
    host: REDIS_HOST_TEST,
    port: REDIS_PORT_TEST,
    password: REDIS_PASS_TEST,
    username: REDIS_USER_TEST
  },
  production: {
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASS,
    username: REDIS_USER
  }
}

/**
 * Exports the Redis configuration object based on the current environment.
 * This configuration is used to initialize Redis clients for caching or pub/sub.
 * @type {Object}
 */
export const redisConfig = {
  host: config[NODE_ENV].host,
  port: config[NODE_ENV].port,
  password: config[NODE_ENV].password,
  username: config[NODE_ENV].username,
  db: 0,
  connectTimeout: 10000
}
