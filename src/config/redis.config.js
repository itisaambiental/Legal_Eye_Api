import Redis from 'ioredis'
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
 * Defines Redis connection settings for each environment.
 * This allows different credentials and hosts for development, test, and production.
 * @type {Object<string, { host: string, port: number, password: string, username: string }>}
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
 * Redis connection options for the active environment.
 * This object is used to initialize Redis clients throughout the application.
 * @type {import('ioredis').RedisOptions}
 */
export const redisConfig = {
  host: config[NODE_ENV].host,
  port: config[NODE_ENV].port,
  password: config[NODE_ENV].password,
  username: config[NODE_ENV].username
}

/**
 * Redis client instance.
 * This client is used across the application for caching.
 * @type {import('ioredis').Redis}
 */
export const redisClient = new Redis(redisConfig)
