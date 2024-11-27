/* eslint-disable no-undef */
import { api } from '../../config/test.config.js'
import UserRepository from '../../repositories/User.repository.js'
import SubjectsRepository from '../../repositories/Subject.repository.js'
import AspectsRepository from '../../repositories/Aspects.repository.js'
import { ADMIN_PASSWORD_TEST, ADMIN_GMAIL } from '../../config/variables.config.js'
import LegalBasisRepository from '../../repositories/LegalBasis.repository.js'

const subjectName = 'Ambiental'
let tokenAdmin
const subjectNames = ['Seguridad', 'Gases', 'Suelo']
let createdSubjectId
const createdSubjectIds = []
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
})

describe('Subjects API tests', () => {
  describe('POST /subjects - Create a new subject', () => {
    test('Should successfully create a new subject', async () => {
      const response = await api
        .post('/api/subjects')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ subjectName })
        .expect(201)
        .expect('Content-Type', /application\/json/)

      const { subject } = response.body
      expect(subject).toHaveProperty('id')
      expect(subject.subject_name).toBe(subjectName)
      createdSubjectId = subject.id
    })

    test('Should return 400 if subjectName is missing', async () => {
      const response = await api
        .post('/api/subjects')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({})
        .expect(400)
        .expect('Content-Type', /application\/json/)

      expect(response.body.message).toMatch(/Missing required field/i)
    })

    test('Should return 401 if the user is unauthorized', async () => {
      const response = await api
        .post('/api/subjects')
        .expect(401)
        .expect('Content-Type', /application\/json/)

      expect(response.body.error).toMatch(/token missing or invalid/i)
    })

    test('Should return 409 if the subject already exists', async () => {
      const response = await api
        .post('/api/subjects')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ subjectName })
        .expect(409)
        .expect('Content-Type', /application\/json/)

      expect(response.body.message).toMatch(/Subject already exists/i)
    })
  })

  describe('GET /subjects - Retrieve all subjects', () => {
    test('Should retrieve all subjects with correct length', async () => {
      const response = await api
        .get('/api/subjects')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200)
        .expect('Content-Type', /application\/json/)

      expect(response.body.subjects).toHaveLength(1)
      expect(response.body.subjects[0].subject_name).toBe(subjectName)
    })
  })

  describe('GET /subject/:id - Retrieve subject by ID', () => {
    test('Should retrieve the subject with a valid ID', async () => {
      const response = await api
        .get(`/api/subject/${createdSubjectId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200)
        .expect('Content-Type', /application\/json/)

      const { subject } = response.body
      expect(subject).toHaveProperty('id', createdSubjectId)
      expect(subject.subject_name).toBe(subjectName)
    })

    test('Should return an error 404 for a subject not found', async () => {
      const nonExistentSubjectId = -1
      const response = await api
        .get(`/api/subject/${nonExistentSubjectId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(404)
        .expect('Content-Type', /application\/json/)

      expect(response.body.message).toMatch(/Subject not found/i)
    })
  })

  describe('PATCH /subject/:id - Update subject by ID', () => {
    test('Should successfully update the subject name', async () => {
      const newSubjectName = 'Ambiental Actualizado'
      const response = await api
        .patch(`/api/subject/${createdSubjectId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ subjectName: newSubjectName })
        .expect(200)
        .expect('Content-Type', /application\/json/)

      const { updatedSubject } = response.body
      expect(updatedSubject).toHaveProperty('id', createdSubjectId)
      expect(updatedSubject.subjectName).toBe(newSubjectName)
    })

    test('Should return 404 if the subject does not exist', async () => {
      const nonExistentSubjectId = -1
      const newSubjectName = 'Ambiental Actualizado'
      const response = await api
        .patch(`/api/subject/${nonExistentSubjectId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ subjectName: newSubjectName })
        .expect(404)
        .expect('Content-Type', /application\/json/)

      expect(response.body.message).toMatch(/Subject not found/i)
    })

    test('Should return 400 if subjectName is missing', async () => {
      const response = await api
        .patch(`/api/subject/${createdSubjectId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({})
        .expect(400)
        .expect('Content-Type', /application\/json/)

      expect(response.body.message).toMatch(/Missing required field/i)
    })

    test('Should return 409 if the subject name already exists', async () => {
      const duplicateSubjectName = 'Ambiental Duplicado'

      await api
        .post('/api/subjects')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ subjectName: duplicateSubjectName })
        .expect(201)
        .expect('Content-Type', /application\/json/)

      const response = await api
        .patch(`/api/subject/${createdSubjectId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ subjectName: duplicateSubjectName })
        .expect(409)
        .expect('Content-Type', /application\/json/)

      expect(response.body.message).toMatch(/Subject already exists/i)
    })
  })

  describe('DELETE /subject/:id - Delete subject by ID', () => {
    test('Should return 404 if the subject does not exist', async () => {
      const nonExistentSubjectId = -1

      const response = await api
        .delete(`/api/subject/${nonExistentSubjectId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(404)
        .expect('Content-Type', /application\/json/)

      expect(response.body.message).toMatch(/Subject not found/i)
    })

    test('Should successfully delete the created subject', async () => {
      await api
        .delete(`/api/subject/${createdSubjectId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(204)

      const response = await api
        .get('/api/subjects')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200)
        .expect('Content-Type', /application\/json/)

      const subjects = response.body.subjects
      expect(subjects.some(subj => subj.id === createdSubjectId)).toBe(false)
    })
  })
  describe('Subjects API - DELETE /subjects/batch', () => {
    test('Should successfully delete multiple subjects', async () => {
      for (const name of subjectNames) {
        const subjectResponse = await api
          .post('/api/subjects')
          .set('Authorization', `Bearer ${tokenAdmin}`)
          .send({ subjectName: name })
          .expect(201)
          .expect('Content-Type', /application\/json/)

        createdSubjectIds.push(subjectResponse.body.subject.id)
      }

      await api
        .delete('/api/subjects/batch')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ subjectIds: createdSubjectIds })
        .expect(204)

      const response = await api
        .get('/api/subjects')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200)
        .expect('Content-Type', /application\/json/)

      const remainingSubjects = response.body.subjects
      expect(remainingSubjects.some(subject => createdSubjectIds.includes(subject.id))).toBe(false)
    })

    test('Should return 400 when subjectIds is missing or empty', async () => {
      const response = await api
        .delete('/api/subjects/batch')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ subjectIds: [] })
        .expect(400)
        .expect('Content-Type', /application\/json/)

      expect(response.body.message).toMatch(/Missing required fields: subjectIds/i)
    })

    test('Should return 401 when unauthorized user attempts to delete subjects', async () => {
      const response = await api
        .delete('/api/subjects/batch')
        .send({ subjectIds: createdSubjectIds })
        .expect(401)
        .expect('Content-Type', /application\/json/)

      expect(response.body.error).toMatch(/token missing or invalid/i)
    })

    test('Should return 404 if any subjectId does not exist', async () => {
      const nonExistentSubjectId = -1
      const response = await api
        .delete('/api/subjects/batch')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ subjectIds: [nonExistentSubjectId, ...createdSubjectIds] })
        .expect(404)
        .expect('Content-Type', /application\/json/)

      expect(response.body.message).toMatch(/Subjects not found for IDs/i)
    })
  })
})
