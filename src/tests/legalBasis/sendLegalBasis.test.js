/* eslint-disable no-undef */
import { api } from '../../config/test.config.js'
import UserRepository from '../../repositories/User.repository.js'
import LegalBasisRepository from '../../repositories/LegalBasis.repository.js'
import SendLegalBasisService from '../../services/legalBasis/sendLegalBasis/sendLegalBasis.service.js'
import {
  ADMIN_PASSWORD_TEST,
  ADMIN_GMAIL
} from '../../config/variables.config.js'

let tokenAdmin

const timeout = 20000
beforeAll(async () => {
  await LegalBasisRepository.deleteAll()
  await UserRepository.deleteAllExceptByGmail(ADMIN_GMAIL)

  const response = await api
    .post('/api/user/login')
    .send({
      gmail: ADMIN_GMAIL,
      password: ADMIN_PASSWORD_TEST
    })
    .expect(200)
    .expect('Content-Type', /application\/json/)

  tokenAdmin = response.body.token
}, timeout)

afterEach(async () => {
  jest.restoreAllMocks()
  await LegalBasisRepository.deleteAll()
})

describe('Send Legal Basis - API Endpoint Tests', () => {
  test('Should successfully create a send job and return 201 with jobId', async () => {
    jest.spyOn(SendLegalBasisService, 'sendLegalBasis').mockResolvedValue({
      jobId: 'mockedJobId'
    })

    const response = await api
      .post('/api/jobs/legalBasis/')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ legalBasisIds: [1, 2] })
      .expect(201)
      .expect('Content-Type', /application\/json/)

    expect(response.body).toHaveProperty('jobId', 'mockedJobId')
  })

  test('Should return 400 if legalBasisIds is missing', async () => {
    const response = await api
      .post('/api/jobs/legalBasis/')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({})
      .expect(400)

    expect(response.body.message).toMatch(/Missing required fields/i)
  })

  test('Should return 401 if user is unauthorized', async () => {
    const response = await api
      .post('/api/jobs/legalBasis/')
      .send({ legalBasisIds: [-1] })
      .expect(401)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })
})

describe('Send Legal Basis - Job Status API Tests', () => {
  const jobId = '12345'
  const jobStates = [
    { state: 'waiting', message: 'The job is waiting to be processed' },
    { state: 'active', message: 'Job is still processing', progress: 50 },
    { state: 'completed', message: 'Job completed successfully', progress: 100 },
    { state: 'failed', message: 'Job failed', error: 'An error occurred' },
    { state: 'delayed', message: 'Job is delayed' },
    { state: 'paused', message: 'Job is paused' },
    { state: 'stuck', message: 'Job is stuck' },
    { state: 'unknown', message: 'Job is in an unknown state' }
  ]

  test.each(jobStates)(
    'Should return correct response for job state: $state',
    async ({ message, progress, error }) => {
      jest.spyOn(SendLegalBasisService, 'getSendLegalBasisJobStatus').mockResolvedValue({
        status: 200,
        data: {
          message,
          ...(progress !== undefined && { jobProgress: progress }),
          ...(error !== undefined && { error })
        }
      })

      const response = await api
        .get(`/api/jobs/legalBasis/${jobId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200)
        .expect('Content-Type', /application\/json/)

      expect(response.body.message).toBe(message)
      if (progress !== undefined) {
        expect(response.body.jobProgress).toBe(progress)
      }
      if (error !== undefined) {
        expect(response.body.error).toBe(error)
      }
    }
  )

  test('Should return 404 when job does not exist', async () => {
    jest.spyOn(SendLegalBasisService, 'getSendLegalBasisJobStatus').mockResolvedValue({
      status: 404,
      data: { message: 'Job not found' }
    })

    const response = await api
      .get('/api/jobs/legalBasis/-1')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(404)

    expect(response.body.message).toMatch(/Job not found/i)
  })

  test('Should return 401 if user is unauthorized', async () => {
    const response = await api
      .get(`/api/jobs/legalBasis/${jobId}`)
      .expect(401)
      .expect('Content-Type', /application\/json/)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })
})
