// db.js

// Start connection to the database
import { createPool } from 'mysql2/promise'
import {
  PASSWORD_DATABASE,
  USER_DATABASE,
  HOST_DATABASE,
  DATABASE,
  DB_PORT,
  PASSWORD_DATABASE_DEV,
  USER_DATABASE_DEV,
  HOST_DATABASE_DEV,
  DATABASE_DEV,
  DB_PORT_DEV,
  NODE_ENV
} from './variables.config.js'

let pool

try {
  if (NODE_ENV === 'development') {
    pool = createPool({
      port: DB_PORT_DEV,
      host: HOST_DATABASE_DEV,
      user: USER_DATABASE_DEV,
      password: PASSWORD_DATABASE_DEV,
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
