/* eslint-disable no-undef */
import { api } from '../config/test.config.js'
import UserRepository from '../repositories/User.repository.js'
import SubjectsRepository from '../repositories/Subject.repository.js'
import { ADMIN_PASSWORD_TEST, ADMIN_GMAIL } from '../config/variables.config.js'

const subjectName = 'Ambiental'
let tokenAdmin
let createdSubjectId

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

    test('Should return 403 if the user is unauthorized', async () => {
      const response = await api
        .post('/api/subjects')
        .expect(401)
        .expect('Content-Type', /application\/json/)

      expect(response.body.error).toMatch(/token missing or invalid/i)
    })

    test('Should return 400 if the subject already exists', async () => {
      const response = await api
        .post('/api/subjects')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ subjectName })
        .expect(400)
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

    test('Should return an empty array for a subject not found', async () => {
      const nonExistentSubjectId = -1
      const response = await api
        .get(`/api/subject/${nonExistentSubjectId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200)
        .expect('Content-Type', /application\/json/)

      expect(response.body.subject).toEqual([])
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
      expect(updatedSubject).toHaveProperty('id', createdSubjectId.toString())
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

    test('Should return 400 if the subject name already exists', async () => {
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
        .expect(400)
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
})
