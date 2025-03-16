import { createPool } from 'mysql2/promise'
import {
  DB_HOST,
  DB_USER,
  DB_PASSWORD,
  DB_DATABASE,
  DB_PORT,
  DB_HOST_TEST,
  DB_USER_TEST,
  DB_PASSWORD_TEST,
  DB_DATABASE_TEST,
  NODE_ENV
} from './variables.config.js'

/**
 * Determine if the application is running in the test environment
 * @type {boolean}
 */
const isTest = NODE_ENV === 'test'

/**
 * The database connection pool.
 * @type {import('mysql2/promise').Pool}
 */
let pool

try {
  pool = createPool({
    port: DB_PORT,
    host: isTest ? DB_HOST_TEST : DB_HOST,
    user: isTest ? DB_USER_TEST : DB_USER,
    password: isTest ? DB_PASSWORD_TEST : DB_PASSWORD,
    database: isTest ? DB_DATABASE_TEST : DB_DATABASE,
    waitForConnections: true,
    connectTimeout: 10000
  })
} catch (error) {
  console.error('Failed to create a database connection pool:', error)
  process.exit(1)
}

export { pool }
