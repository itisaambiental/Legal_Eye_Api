/* eslint-disable no-undef */
import { api } from '../../config/test.config.js'
import UserRepository from '../../repositories/User.repository.js'
import ReqIdentificationRepository from '../../repositories/ReqIdentification.repository.js'
import SubjectsRepository from '../../repositories/Subject.repository.js'
import AspectsRepository from '../../repositories/Aspects.repository.js'
import LegalBasisRepository from '../../repositories/LegalBasis.repository.js'
import RequirementRepository from '../../repositories/Requirements.repository.js'
import ReqIdentifyService from '../../services/reqIdentification/reqIdentify/ReqIdentify.service.js'
import {
  ADMIN_PASSWORD_TEST,
  ADMIN_GMAIL
} from '../../config/variables.config.js'

let tokenAdmin
const timeout = 30000

beforeAll(async () => {
  await RequirementRepository.deleteAll()
  await LegalBasisRepository.deleteAll()
  await SubjectsRepository.deleteAll()
  await AspectsRepository.deleteAll()
  await ReqIdentificationRepository.deleteAll()
  await UserRepository.deleteAllExceptByGmail(ADMIN_GMAIL)

  const response = await api
    .post('/api/user/login')
    .send({ gmail: ADMIN_GMAIL, password: ADMIN_PASSWORD_TEST })
    .expect(200)
    .expect('Content-Type', /application\/json/)

  tokenAdmin = response.body.token
}, timeout)

afterEach(async () => {
  jest.restoreAllMocks()
})

describe('GET /api/jobs/req-identification/:jobId', () => {
  const jobId = '67890'
  const jobStates = [
    { state: 'waiting', message: 'The job is waiting to be processed' },
    { state: 'active', message: 'Job is still processing', progress: 45 },
    { state: 'completed', message: 'Job completed successfully', progress: 100 },
    { state: 'failed', message: 'Job failed', error: 'Unhandled error' },
    { state: 'delayed', message: 'Job is delayed and will be processed later' },
    { state: 'paused', message: 'Job is paused and will resume later' },
    { state: 'stuck', message: 'Job is stuck and cannot proceed' },
    { state: 'unknown', message: 'Job is in an unknown state' }
  ]

  test.each(jobStates)(
    'Should return correct response for job state: $state',
    async ({ message, progress, error }) => {
      jest.spyOn(ReqIdentifyService, 'getReqIdentificationJobStatus').mockResolvedValue({
        status: 200,
        data: {
          message,
          ...(progress !== undefined && { jobProgress: progress }),
          ...(error !== undefined && { error })
        }
      })

      const response = await api
        .get(`/api/jobs/req-identification/${jobId}`)
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
    jest.spyOn(ReqIdentifyService, 'getReqIdentificationJobStatus').mockResolvedValue({
      status: 404,
      data: { message: 'Job not found' }
    })

    const response = await api
      .get('/api/jobs/req-identification/-1')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(404)

    expect(response.body.message).toMatch(/Job not found/i)
  })

  test('Should return 401 if user is unauthorized', async () => {
    const response = await api
      .get(`/api/jobs/req-identification/${jobId}`)
      .expect(401)
      .expect('Content-Type', /application\/json/)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })
})
