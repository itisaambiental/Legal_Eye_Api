/**
 * Sets up the testing environment using supertest.
 * Exports the API object for making HTTP requests in tests.
 * Cleans up resources after all tests are completed.
 */

/* eslint-disable no-undef */
import supertest from 'supertest'
import { server, app } from '../index.js'
import { pool } from '../config/db.config.js'
import emailQueue from '../config/emailQueue.js'

/**
 * The API object for making HTTP requests in tests.
 * @type {supertest.SuperTest<supertest.Test>}
 */
export const api = supertest(app)

/**
 * Cleans up resources after all tests have completed.
 * Closes the database pool, email queue, and server.
 */
afterAll(async () => {
  await pool.end()
  await emailQueue.close()
  server.close()
}, 10000)
