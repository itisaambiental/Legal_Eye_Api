import { pool } from '../config/db.config.js'
import fs from 'fs/promises'

/**
 * Reads and executes SQL migration statements from the `database.sql` file.
 * This function connects to the database and sequentially runs each SQL statement
 * to create or modify tables as defined in the migration script.
 *
 * @async
 * @function migrate
 * @returns {Promise<void>} Executes all SQL statements or exits the process on error.
 */
async function migrate () {
  try {
    const sql = await fs.readFile(new URL('./database.sql', import.meta.url), 'utf-8')
    const statements = sql
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0)
    const connection = await pool.getConnection()
    try {
      for (const statement of statements) {
        await connection.query(statement)
      }
      console.info('✅ Migration completed successfully.')
    } finally {
      connection.release()
      await pool.end()
    }
    process.exit(0)
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

migrate()
