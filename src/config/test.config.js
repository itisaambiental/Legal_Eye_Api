/* eslint-disable no-undef */
import supertest from 'supertest'
import { server, app } from '../index.js'
import { pool } from '../config/db.config.js'
import emailQueue from '../config/emailQueue.js'

export const api = supertest(app)

afterAll(async () => {
  await pool.end()
  await emailQueue.close()
  server.close()
}, 10000)
