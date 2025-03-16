/* eslint-disable no-undef */
import { api } from '../../config/test.config.js'
import UserRepository from '../../repositories/User.repository.js'
import { ADMIN_PASSWORD_TEST, ADMIN_GMAIL } from '../../config/variables.config.js'

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

describe('File Upload & Fetch API Tests', () => {
  let uploadedFileUrl
  describe('POST /files/upload - Upload a file', () => {
    test('Should successfully upload a file and return a URL', async () => {
      const document = Buffer.from('%PDF-1.4\n%Test PDF Content')
      const response = await api
        .post('/api/files/')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .attach('file', document, {
          filename: 'file.pdf',
          contentType: 'application/pdf'
        })
        .expect(201)
        .expect('Content-Type', /application\/json/)

      expect(response.body).toHaveProperty('url')
      expect(response.body.url).toMatch(/^https?:\/\/legaleyeappproduction\.s3\..+\.amazonaws\.com\/.+/)

      uploadedFileUrl = response.body.url
    })

    test('Should return 400 if file is missing', async () => {
      const response = await api
        .post('/api/files/')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(400)
        .expect('Content-Type', /application\/json/)

      expect(response.body.message).toMatch(/File is required/i)
    })

    test('Should return 401 if user is unauthorized', async () => {
      const response = await api
        .post('/api/files/')
        .expect(401)
        .expect('Content-Type', /application\/json/)

      expect(response.body.error).toMatch(/token missing or invalid/i)
    })
  })

  describe('Retrieve file from URL', () => {
    test('Should fetch a file as base64 from a valid URL', async () => {
      const response = await api
        .get('/api/files/')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .query({ url: uploadedFileUrl })
        .expect(200)
        .expect('Content-Type', /application\/json/)

      expect(response.body).toHaveProperty('file')
      expect(response.body).toHaveProperty('contentType')
      expect(typeof response.body.file).toBe('string')
    })

    test('Should return 400 if URL is missing', async () => {
      const response = await api
        .get('/api/files/')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .query({})
        .expect(400)
        .expect('Content-Type', /application\/json/)

      expect(response.body.message).toMatch(/URL is required/i)
    })

    test('Should return 401 if user is unauthorized', async () => {
      const response = await api
        .get('/api/files/')
        .query({ url: uploadedFileUrl })
        .expect(401)
        .expect('Content-Type', /application\/json/)

      expect(response.body.error).toMatch(/token missing or invalid/i)
    })
  })
})
