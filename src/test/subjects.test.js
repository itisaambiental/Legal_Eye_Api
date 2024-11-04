/* eslint-disable no-undef */
import { api } from '../config/test.config.js'
import UserRepository from '../repositories/User.repository.js'
import SubjectsRepository from '../repositories/Subject.repository.js'
import { ADMIN_PASSWORD_TEST, ADMIN_GMAIL } from '../config/variables.config.js'

const subjectName = 'Ambiental'
let tokenAdmin

beforeAll(async () => {
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
    afterEach(async () => {
      const subject = await SubjectsRepository.findByName(subjectName)
      if (subject) {
        await SubjectsRepository.deleteById(subject.id)
      }
    })

    test('Should successfully create a new subject', async () => {
      const response = await api
        .post('/api/subjects')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ subjectName })
        .expect(201)
        .expect('Content-Type', /application\/json/)

      expect(response.body.subject).toHaveProperty('id')
      expect(response.body.subject.subject_name).toBe(subjectName)
    })

    test('Should return 400 if subjectName is missing', async () => {
      const response = await api
        .post('/api/subjects')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({})
        .expect(400)
        .expect('Content-Type', /application\/json/)

      expect(response.body.message).toBe('Missing required field: subjectName')
    })

    test('Should return 403 if the user is unauthorized', async () => {
      const response = await api
        .post('/api/subjects')
        .send({ subjectName })
        .expect(401)
        .expect('Content-Type', /application\/json/)

      expect(response.body.error).toBe('token missing or invalid')
    })

    test('Should return 400 if the subject already exists', async () => {
      await SubjectsRepository.createSubject(subjectName)

      const response = await api
        .post('/api/subjects')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ subjectName })
        .expect(400)
        .expect('Content-Type', /application\/json/)

      expect(response.body.message).toBe('Subject already exists')
    })
  })
})
