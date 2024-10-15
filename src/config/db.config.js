// db.js

// Start connection to the database
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

console.log("Test", DATABASE_TEST)

let pool

try {
  if (NODE_ENV === 'test') {
    pool = createPool({
      port: DB_PORT,
      host: HOST_DATABASE,
      user: USER_DATABASE,
      password: PASSWORD_DATABASE,
      database: DATABASE_TEST,
      connectTimeout: 10000
    })
  } else if (NODE_ENV === 'development') {
    pool = createPool({
      port: DB_PORT,
      host: HOST_DATABASE,
      user: USER_DATABASE,
      password: PASSWORD_DATABASE,
      database: DATABASE_DEV,
      connectTimeout: 10000
    })
  } else {
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
