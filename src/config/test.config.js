/* eslint-disable no-undef */
import supertest from 'supertest'
import { server, app } from '../index.js'
import { pool } from '../config/db.config.js'
import emailQueue from '../workers/emailWorker.js'
import extractArticlesQueue from '../workers/extractArticlesWorker.js'
import sendLegalBasisQueue from '../queues/sendLegalBasisQueue.js'

const timeout = 500000

/**
 * The API object for making HTTP requests in tests.
 * @type {supertest.SuperTest<supertest.Test>}
 */
export const api = supertest(app)

/**
 * Initializes the server only once for all test files.
 * Uses a random port in test environment to avoid port conflicts.
 */
let serverInstance
beforeAll(async () => {
  if (!server || !server.listening) {
    serverInstance = app.listen(0)
  }
})

/**
 * Cleans up resources after all tests have completed.
 * Closes the database pool, email queue, and server.
 */
afterAll(async () => {
  await emailQueue.close()
  await extractArticlesQueue.close()
  await sendLegalBasisQueue.close()
  if (serverInstance) {
    serverInstance.close()
  }
  await pool.end()
}, timeout)
