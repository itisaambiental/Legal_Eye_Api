import { createPool } from 'mysql2/promise'
import {
  DB_HOST,
  DB_USER,
  DB_PASSWORD,
  DB_DATABASE,
  DB_PORT,
  DB_PORT_DEV,
  DB_HOST_DEV,
  DB_USER_DEV,
  DB_PASSWORD_DEV,
  DB_DATABASE_DEV,
  DB_PORT_TEST,
  DB_HOST_TEST,
  DB_USER_TEST,
  DB_PASSWORD_TEST,
  DB_DATABASE_TEST,
  NODE_ENV
} from './variables.config.js'

/**
 * Defines the database configuration settings based on the current environment.
 * Each environment (development, test, production) has its own database parameters.
 * @type {Object}
 */
const config = {
  development: {
    port: DB_PORT_DEV,
    host: DB_HOST_DEV,
    user: DB_USER_DEV,
    password: DB_PASSWORD_DEV,
    database: DB_DATABASE_DEV
  },
  test: {
    port: DB_PORT_TEST,
    host: DB_HOST_TEST,
    user: DB_USER_TEST,
    password: DB_PASSWORD_TEST,
    database: DB_DATABASE_TEST
  },
  production: {
    port: DB_PORT,
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_DATABASE
  }
}

/**
 * Creates and exports a MySQL connection pool based on the current environment's configuration.
 * The pool is used for managing multiple concurrent database connections efficiently.
 * @type {import('mysql2/promise').Pool}
 */
const pool = createPool({
  port: config[NODE_ENV].port,
  host: config[NODE_ENV].host,
  user: config[NODE_ENV].user,
  password: config[NODE_ENV].password,
  database: config[NODE_ENV].database
})

export { pool }
