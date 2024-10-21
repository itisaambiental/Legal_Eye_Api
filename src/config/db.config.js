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
 * The database connection pool.
 * @type {import('mysql2/promise').Pool}
 */
let pool

try {
  if (NODE_ENV === 'test') {
    /**
     * Create a connection pool for the test database.
     */
    pool = createPool({
      port: DB_PORT,
      host: HOST_DATABASE,
      user: USER_DATABASE,
      password: PASSWORD_DATABASE,
      database: DATABASE_TEST,
      connectTimeout: 10000
    })
  } else if (NODE_ENV === 'development') {
    /**
     * Create a connection pool for the development database.
     */
    pool = createPool({
      port: DB_PORT,
      host: HOST_DATABASE,
      user: USER_DATABASE,
      password: PASSWORD_DATABASE,
      database: DATABASE_DEV,
      connectTimeout: 10000
    })
  } else {
    /**
     * Create a connection pool for the production database.
     */
    pool = createPool({
      port: DB_PORT,
      host: HOST_DATABASE,
      user: USER_DATABASE,
      password: PASSWORD_DATABASE,
      database: DATABASE,
      connectTimeout: 10000
    })
  }
} catch (error) {
  console.error('Failed to create a database connection pool:', error)
  process.exit(1)
}

export { pool }
