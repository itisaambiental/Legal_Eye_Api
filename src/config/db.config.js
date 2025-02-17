/**
 * Initializes and exports the MySQL database connection pool.
 * Selects the appropriate database based on the NODE_ENV environment variable.
 */

import { createPool } from 'mysql2/promise'
import {
  PASSWORD_DATABASE,
  USER_DATABASE,
  HOST_DATABASE,
  DATABASE,
  DB_PORT,
  DATABASE_DEV,
  DATABASE_TEST,
  NODE_ENV
} from './variables.config.js'

/**
 * Determine if the environment is production or test.
 * @type {boolean}
 */
const isProduction = NODE_ENV === 'production'
const isTest = NODE_ENV === 'test'

/**
 * The database connection pool.
 * @type {import('mysql2/promise').Pool}
 */
let pool

try {
  pool = createPool({
    port: DB_PORT,
    host: HOST_DATABASE,
    user: USER_DATABASE,
    password: PASSWORD_DATABASE,
    database: isProduction ? DATABASE : isTest ? DATABASE_TEST : DATABASE_DEV,
    connectTimeout: 10000
  })
} catch (error) {
  console.error('Failed to create a database connection pool:', error)
  process.exit(1)
}

export { pool }
