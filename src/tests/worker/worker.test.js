/* eslint-disable no-undef */
import { api } from '../../config/test.config.js'
import UserRepository from '../../repositories/User.repository.js'
import SubjectsRepository from '../../repositories/Subject.repository.js'
import LegalBasisRepository from '../../repositories/LegalBasis.repository.js'
import AspectsRepository from '../../repositories/Aspects.repository.js'
import WorkerService from '../../services/worker/Worker.service.js'

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

beforeAll(async () => {
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
    .send({ subjectName })
    .expect(201)
    .expect('Content-Type', /application\/json/)

  createdSubjectId = subjectResponse.body.subject.id
  for (const aspectName of aspectsToCreate) {
    const aspectResponse = await api
      .post(`/api/subjects/${createdSubjectId}/aspects`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ aspectName })
      .expect(201)
      .expect('Content-Type', /application\/json/)

    const { aspect } = aspectResponse.body
    createdAspectIds.push(aspect.id)
  }
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('Getting job states', () => {
  const jobId = '12345'
  const jobStates = [
    { state: 'waiting', message: 'Job is still processing', progress: 20 },
    { state: 'active', message: 'Job is still processing', progress: 60 },
    { state: 'completed', message: 'Job completed successfully' },
    { state: 'failed', message: 'Job failed', error: 'An error occurred' },
    { state: 'delayed', message: 'Job is delayed and will be processed later' },
    { state: 'paused', message: 'Job is paused and will be resumed once unpaused' },
    { state: 'stuck', message: 'Job is stuck and cannot proceed' },
    { state: 'unknown', message: 'Job is in an unknown state' }
  ]
  test.each(jobStates)(
    'Should return correct response for job state: $state',
    async ({ message, progress, error }) => {
      jest.spyOn(WorkerService, 'getStatusJob').mockResolvedValue({
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
    jest.spyOn(WorkerService, 'getStatusJob').mockResolvedValue({
      status: 404,
      data: { message: 'Job not found' }
    })

    const nonExistentJobId = '-1'
    const response = await api
      .get(`/api/jobs/articles/${nonExistentJobId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(404)

    expect(response.body.message).toBe('Job not found')
  })

  test('Should return 401 if user is unauthorized', async () => {
    const response = await api
      .get(`/api/jobs/articles/${jobId}`)
      .expect(401)
      .expect('Content-Type', /application\/json/)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })

  test('Should return 400 if jobId is missing', async () => {
    const response = await api
      .get('/api/jobs/articles/')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(404)

    expect(response.body.message).toMatch(/Not Found/i)
  })
})

describe('Getting job state by Legal Basis ID', () => {
  beforeAll(async () => {
    const document = Buffer.from('mock pdf content')
    const legalBasisData = {
      legalName: 'Normativa con Documento',
      abbreviation: 'DocTest',
      subjectId: String(createdSubjectId),
      aspectsIds: JSON.stringify(createdAspectIds),
      classification: 'Reglamento',
      jurisdiction: 'Federal',
      lastReform: '01-01-2024',
      extractArticles: 'true'
    }
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
  test('Should return hasPendingJobs = true with progress', async () => {
    jest.spyOn(WorkerService, 'hasPendingJobs').mockResolvedValue({
      hasPendingJobs: true,
      progress: 75
    })
    const response = await api
      .get(`/api/jobs/articles/legalBasis/${createdLegalBasis.id}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)
      .expect('Content-Type', /application\/json/)

    expect(response.body.hasPendingJobs).toBe(true)
    expect(response.body.progress).toBe(75)
  })

  test('Should return hasPendingJobs = false with progress null', async () => {
    jest.spyOn(WorkerService, 'hasPendingJobs').mockResolvedValue({
      hasPendingJobs: false,
      progress: null
    })
    const response = await api
      .get(`/api/jobs/articles/legalBasis/${createdLegalBasis.id}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)
    expect(response.body.hasPendingJobs).toBe(false)
    expect(response.body.progress).toBeNull()
  })

  test('Should return 404 if legal basis does not exist', async () => {
    const nonExistentLegalBasisId = '-1'
    const response = await api
      .get(`/api/jobs/articles/legalBasis/${nonExistentLegalBasisId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(404)

    expect(response.body.message).toBe('Legal basis not found')
  })

  test('Should return 401 if user is unauthorized', async () => {
    const response = await api
      .get(`/api/jobs/articles/legalBasis/${createdLegalBasis.id}`)
      .expect(401)
      .expect('Content-Type', /application\/json/)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })

  test('Should return 400 if legalBasisId is missing', async () => {
    const response = await api
      .get('/api/jobs/articles/legalBasis/')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(404)

    expect(response.body.message).toMatch(/Not Found/i)
  })
})
