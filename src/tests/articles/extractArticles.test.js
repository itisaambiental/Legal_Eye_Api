/* eslint-disable no-undef */
import { api } from '../../config/test.config.js'
import UserRepository from '../../repositories/User.repository.js'
import SubjectsRepository from '../../repositories/Subject.repository.js'
import LegalBasisRepository from '../../repositories/LegalBasis.repository.js'
import RequirementRepository from '../../repositories/Requirements.repository.js'
import AspectsRepository from '../../repositories/Aspects.repository.js'
import extractArticlesService from '../../services/articles/extractArticles/extractArticles.service.js'
import generateLegalBasisData from '../../utils/generateLegalBasisData.js'
import extractArticlesQueue from '../../queues/extractArticlesQueue.js'
import {
  ADMIN_PASSWORD_TEST,
  ADMIN_GMAIL
} from '../../config/variables.config.js'

const subjectName = 'Seguridad & Higiene'
const aspectsToCreate = ['Organizacional', 'Técnico', 'Legal']
let tokenAdmin
let createdSubjectId
const createdAspectIds = []
let createdLegalBasis

const timeout = 20000
beforeAll(async () => {
  await RequirementRepository.deleteAll()
  await LegalBasisRepository.deleteAll()
  await SubjectsRepository.deleteAll()
  await AspectsRepository.deleteAll()
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
  const subjectResponse = await api
    .post('/api/subjects')
    .set('Authorization', `Bearer ${tokenAdmin}`)
    .send({
      subjectName,
      abbreviation: 'AMB',
      orderIndex: 1
    })
    .expect(201)
    .expect('Content-Type', /application\/json/)

  createdSubjectId = subjectResponse.body.subject.id
  for (const aspectName of aspectsToCreate) {
    const aspectResponse = await api
      .post(`/api/subjects/${createdSubjectId}/aspects`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        aspectName,
        abbreviation: 'ORG',
        orderIndex: 1
      })
      .expect(201)
      .expect('Content-Type', /application\/json/)

    const { aspect } = aspectResponse.body
    createdAspectIds.push(aspect.id)
  }
}, timeout)

afterEach(async () => {
  jest.restoreAllMocks()
  await LegalBasisRepository.deleteAll()
})

describe('Getting job states', () => {
  const jobId = '12345'
  const jobStates = [
    { state: 'waiting', message: 'The job is waiting to be processed' },
    { state: 'active', message: 'Job is still processing', progress: 60 },
    {
      state: 'completed',
      message: 'Job completed successfully',
      progress: 100
    },
    { state: 'failed', message: 'Job failed', error: 'An error occurred' },
    { state: 'delayed', message: 'Job is delayed and will be processed later' },
    {
      state: 'paused',
      message: 'Job is paused and will be resumed once unpaused'
    },
    { state: 'stuck', message: 'Job is stuck and cannot proceed' },
    { state: 'unknown', message: 'Job is in an unknown state' }
  ]
  test.each(jobStates)(
    'Should return correct response for job state: $state',
    async ({ message, progress, error }) => {
      jest.spyOn(extractArticlesService, 'getExtractionJobStatus').mockResolvedValue({
        status: 200,
        data: {
          message,
          ...(progress !== undefined && { jobProgress: progress }),
          ...(error !== undefined && { error })
        }
      })
      const response = await api
        .get(`/api/jobs/articles/${jobId}`)
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
    jest.spyOn(extractArticlesService, 'getExtractionJobStatus').mockResolvedValue({
      status: 404,
      data: { message: 'Job not found' }
    })
    const nonExistentJobId = '-1'
    const response = await api
      .get(`/api/jobs/articles/${nonExistentJobId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(404)

    expect(response.body.message).toMatch(/Job not found/i)
  })

  test('Should return 401 if user is unauthorized', async () => {
    const response = await api
      .get(`/api/jobs/articles/${jobId}`)
      .expect(401)
      .expect('Content-Type', /application\/json/)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })
})
describe('Getting job state by Legal Basis ID', () => {
  beforeAll(async () => {
    const document = Buffer.from('mock pdf content')
    const legalBasisData = generateLegalBasisData({
      subjectId: String(createdSubjectId),
      aspectsIds: JSON.stringify(createdAspectIds),
      extractArticles: 'true'
    })
    const response = await api
      .post('/api/legalBasis')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .attach('document', document, {
        filename: 'file.pdf',
        contentType: 'application/pdf'
      })
      .field('legalName', legalBasisData.legalName)
      .field('abbreviation', legalBasisData.abbreviation)
      .field('subjectId', legalBasisData.subjectId)
      .field('aspectsIds', legalBasisData.aspectsIds)
      .field('classification', legalBasisData.classification)
      .field('jurisdiction', legalBasisData.jurisdiction)
      .field('lastReform', legalBasisData.lastReform)
      .field('extractArticles', legalBasisData.extractArticles)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    createdLegalBasis = response.body.legalBasis
  })

  test('Should return hasPendingJobs = true with jobId', async () => {
    jest.spyOn(extractArticlesService, 'hasPendingExtractionJobs').mockResolvedValue({
      hasPendingJobs: true,
      jobId: '12345'
    })
    const response = await api
      .get(`/api/jobs/articles/legalBasis/${createdLegalBasis.id}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)
      .expect('Content-Type', /application\/json/)

    expect(response.body.hasPendingJobs).toBe(true)
    expect(response.body.jobId).toBe('12345')
  })

  test('Should return hasPendingJobs = false with jobId null', async () => {
    jest.spyOn(extractArticlesService, 'hasPendingExtractionJobs').mockResolvedValue({
      hasPendingJobs: false,
      jobId: null
    })
    const response = await api
      .get(`/api/jobs/articles/legalBasis/${createdLegalBasis.id}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)

    expect(response.body.hasPendingJobs).toBe(false)
    expect(response.body.jobId).toBeNull()
  })

  test('Should return 404 if legal basis does not exist', async () => {
    const nonExistentLegalBasisId = '-1'
    const response = await api
      .get(`/api/jobs/articles/legalBasis/${nonExistentLegalBasisId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(404)

    expect(response.body.message).toMatch(/LegalBasis not found/i)
  })

  test('Should return 401 if user is unauthorized', async () => {
    const response = await api
      .get(`/api/jobs/articles/legalBasis/${createdLegalBasis.id}`)
      .expect(401)
      .expect('Content-Type', /application\/json/)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })
})

describe('Cancel job', () => {
  test('Should cancel a job in active state successfully', async () => {
    const jobId = '12345'
    const mockJob = {
      id: jobId,
      moveToFailed: jest.fn().mockResolvedValue(true),
      isActive: jest.fn().mockResolvedValue(true),
      isCompleted: jest.fn().mockResolvedValue(false),
      isFailed: jest.fn().mockResolvedValue(false)
    }

    jest.spyOn(extractArticlesQueue, 'getJob').mockResolvedValue(mockJob)

    await api
      .delete(`/api/jobs/articles/${jobId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(204)

    expect(mockJob.moveToFailed).toHaveBeenCalledWith(
      { message: 'Job was canceled' },
      true
    )
  })

  test.each([
    { state: 'waiting', description: 'Job is in waiting state' },
    { state: 'paused', description: 'Job is paused' },
    { state: 'delayed', description: 'Job is delayed' }
  ])(
    'Should remove a job successfully if in $state state ($description)',
    async ({ state }) => {
      const jobId = '12345'

      const mockJob = {
        id: jobId,
        isActive: jest.fn().mockResolvedValue(false),
        isCompleted: jest.fn().mockResolvedValue(false),
        isFailed: jest.fn().mockResolvedValue(false),
        remove: jest.fn().mockResolvedValue(true),
        discard: jest.fn().mockResolvedValue(true),
        getState: jest.fn().mockResolvedValue(state)
      }

      jest.spyOn(extractArticlesQueue, 'getJob').mockResolvedValue(mockJob)

      await api
        .delete(`/api/jobs/articles/${jobId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(204)

      expect(mockJob.remove).toHaveBeenCalled()
    }
  )

  test.each([
    { state: 'completed', description: 'Job is already completed' },
    { state: 'failed', description: 'Job has already failed' }
  ])(
    'Should return 400 if the job is in $state state ($description)',
    async ({ state }) => {
      const jobId = '12345'

      const mockJob = {
        id: jobId,
        isActive: jest.fn().mockResolvedValue(false),
        isCompleted: jest.fn().mockResolvedValue(state === 'completed'),
        isFailed: jest.fn().mockResolvedValue(state === 'failed'),
        remove: jest.fn()
      }

      jest.spyOn(extractArticlesQueue, 'getJob').mockResolvedValue(mockJob)

      const response = await api
        .delete(`/api/jobs/articles/${jobId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(400)
        .expect('Content-Type', /application\/json/)

      expect(response.body.message).toBe(
        `Job cannot be canceled. Jobs in '${state}' state cannot be modified.`
      )

      expect(mockJob.remove).not.toHaveBeenCalled()
    }
  )

  test('Should return 404 if the job does not exist', async () => {
    const nonExistentJobId = 'non-existent-job'

    jest.spyOn(extractArticlesQueue, 'getJob').mockResolvedValue(null)

    const response = await api
      .delete(`/api/jobs/articles/${nonExistentJobId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(404)
      .expect('Content-Type', /application\/json/)

    expect(response.body.message).toBe('Job not found')
  })

  test('Should return 401 if the user is unauthorized', async () => {
    const jobId = '12345'

    const response = await api
      .delete(`/api/jobs/articles/${jobId}`)
      .expect(401)
      .expect('Content-Type', /application\/json/)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })
})
