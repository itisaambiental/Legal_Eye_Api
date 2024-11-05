/* eslint-disable no-undef */
import { api } from '../config/test.config.js'
import UserRepository from '../repositories/User.repository.js'
import SubjectsRepository from '../repositories/Subject.repository.js'
import { ADMIN_PASSWORD_TEST, ADMIN_GMAIL } from '../config/variables.config.js'

const subjectName = 'Seguridad & Higiene'
const aspectName = 'Organizacional'
let tokenAdmin
let createdSubjectId
let isExistingAspectTest = false

beforeAll(async () => {
  await SubjectsRepository.deleteAll()
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
})

beforeEach(async () => {
  if (!isExistingAspectTest) {
    const subjectResponse = await api
      .post('/api/subjects')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ subjectName })
      .expect(201)
      .expect('Content-Type', /application\/json/)

    createdSubjectId = subjectResponse.body.subject.id
  }
})

afterEach(async () => {
  if (!isExistingAspectTest) {
    await SubjectsRepository.deleteById(createdSubjectId)
  }
})

describe('Aspects API tests', () => {
  describe('POST /subjects/:subjectId/aspects - Create a new aspect', () => {
    test('Should successfully create a new aspect', async () => {
      const response = await api
        .post(`/api/subjects/${createdSubjectId}/aspects`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ aspectName })
        .expect(201)
        .expect('Content-Type', /application\/json/)

      expect(response.body.aspect).toHaveProperty('id')
      expect(response.body.aspect.subject_id).toBe(createdSubjectId.toString())
      expect(response.body.aspect.aspect_name).toBe(aspectName)
    })

    test('Should return 400 if the aspect already exists for the subject', async () => {
      isExistingAspectTest = true
      await api
        .post(`/api/subjects/${createdSubjectId}/aspects`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ aspectName })
        .expect(201)

      const response = await api
        .post(`/api/subjects/${createdSubjectId}/aspects`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ aspectName })
        .expect(400)
        .expect('Content-Type', /application\/json/)

      expect(response.body.message).toBe('Aspect already exists')
    })

    test('Should return 400 if aspectName is missing', async () => {
      const response = await api
        .post(`/api/subjects/${createdSubjectId}/aspects`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({})
        .expect(400)
        .expect('Content-Type', /application\/json/)

      expect(response.body.message).toBe('Missing required fields: subjectId and/or aspectName')
    })

    test('Should return 403 if the user is unauthorized', async () => {
      const response = await api
        .post(`/api/subjects/${createdSubjectId}/aspects`)
        .send({ aspectName })
        .expect(401)
        .expect('Content-Type', /application\/json/)

      expect(response.body.error).toBe('token missing or invalid')
    })

    test('Should return 404 if the subject does not exist', async () => {
      const response = await api
        .post('/api/subjects/9999/aspects')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ aspectName })
        .expect(404)
        .expect('Content-Type', /application\/json/)

      expect(response.body.message).toBe('Subject not found')
    })
  })

  describe('GET /subjects/:subjectId/aspects - Retrieve all aspects for a specific subject', () => {
    test('Should retrieve the correct list of aspects for the subject', async () => {
      const response = await api
        .get(`/api/subjects/${createdSubjectId}/aspects`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200)
        .expect('Content-Type', /application\/json/)

      expect(response.body.aspects).toBeInstanceOf(Array)
      expect(response.body.aspects).toHaveLength(1)
      const aspect = response.body.aspects[0]
      expect(aspect).toHaveProperty('id')
      expect(aspect).toHaveProperty('aspect_name', aspectName)
      expect(aspect).toHaveProperty('subject_id', createdSubjectId)
    })

    test('Should return an empty array if no aspects are associated with the subject', async () => {
      const response = await api
        .get(`/api/subjects/${createdSubjectId}/aspects`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200)
        .expect('Content-Type', /application\/json/)

      expect(response.body.aspects).toBeInstanceOf(Array)
      expect(response.body.aspects).toHaveLength(1)
    })

    test('Should return 401 if called without authentication', async () => {
      const response = await api
        .get(`/api/subjects/${createdSubjectId}/aspects`)
        .expect(401)
        .expect('Content-Type', /application\/json/)
      expect(response.body.error).toBe('token missing or invalid')
    })
  })
})
