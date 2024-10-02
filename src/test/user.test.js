/* eslint-disable no-undef */
import { api } from '../config/test.config.js'
import UserRepository from '../repositories/User.repository.js'
import { ADMIN_PASSWORD_TEST, ADMIN_GMAIL } from '../config/variables.config.js'

let tokenAdmin
let adminUserId
let analystUserId

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

  const adminUser = await UserRepository.findByGmail(ADMIN_GMAIL)
  adminUserId = adminUser.id
})

describe('User API tests', () => {
  describe('Login with correct and incorrect credentials', () => {
    test('Should successfully log in the admin user', async () => {
      expect(tokenAdmin).toBeDefined()
    })

    test('Should return 401 when the email is incorrect', async () => {
      const response = await api
        .post('/api/user/login')
        .send({
          gmail: 'incorrect-email@example.com',
          password: ADMIN_PASSWORD_TEST
        })
        .expect(401)
        .expect('Content-Type', /application\/json/)

      expect(response.body.message).toBe('Invalid email or password')
    })

    test('Should return 401 when the password is incorrect', async () => {
      const response = await api
        .post('/api/user/login')
        .send({
          gmail: ADMIN_GMAIL,
          password: 'incorrectPassword'
        })
        .expect(401)
        .expect('Content-Type', /application\/json/)

      expect(response.body.message).toBe('Invalid email or password')
    })

    test('Should return 400 when required fields are missing', async () => {
      const response = await api
        .post('/api/user/login')
        .send({
          gmail: ''
        })
        .expect(400)
        .expect('Content-Type', /application\/json/)

      expect(response.body.message).toBe('Missing required fields: gmail, password')
    })
  })

  describe('User registration and fetching tests', () => {
    test('Should successfully register a new user', async () => {
      const response = await api
        .post('/api/user/register')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
          gmail: 'testuser@isaambiental.com',
          name: 'Alfredo',
          roleId: '2'
        })
        .expect(201)
        .expect('Content-Type', /application\/json/)

      analystUserId = response.body.userId
      expect(response.body.userId).toBeDefined()
    })

    test('Should return 400 when required fields are missing during registration', async () => {
      const response = await api
        .post('/api/user/register')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
          name: '',
          gmail: '',
          roleId: 2
        })
        .expect(400)
        .expect('Content-Type', /application\/json/)

      expect(response.body.message).toBe('Missing required fields: name, gmail, roleId')
    })

    test('Should return exactly two users', async () => {
      const response = await api
        .get('/api/users/')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200)
        .expect('Content-Type', /application\/json/)

      const users = response.body.users
      expect(users.length).toBe(2)
      expect(users[0].gmail).toBe(ADMIN_GMAIL)
      expect(users[1].gmail).toBe('testuser@isaambiental.com')
    })
  })

  describe('Fetching user details by ID', () => {
    test('Should fetch admin user details with a valid admin user token', async () => {
      const response = await api
        .get(`/api/user/${adminUserId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200)
        .expect('Content-Type', /application\/json/)

      expect(response.body.user.gmail).toBe(ADMIN_GMAIL)
    })

    test('Should return 401 when fetching user details without authorization', async () => {
      const response = await api
        .get(`/api/user/${adminUserId}`)
        .expect(401)
        .expect('Content-Type', /application\/json/)

      expect(response.body.error).toBe('token missing or invalid')
    })

    test('Should return 404 when user is not found', async () => {
      const invalidUserId = '-1'
      const response = await api
        .get(`/api/user/${invalidUserId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(404)
        .expect('Content-Type', /application\/json/)

      expect(response.body.message).toBe('User not found')
    })

    test('Should fetch analyst user details with admin user token', async () => {
      const response = await api
        .get(`/api/user/${analystUserId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200)
        .expect('Content-Type', /application\/json/)

      expect(response.body.user.id).toBe(analystUserId)
    })
  })

  describe('Updating user information', () => {
    test('Should successfully update admin user information with valid fields', async () => {
      const updatedData = { name: 'Admin Updated' }

      await api
        .patch(`/api/user/${adminUserId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(updatedData)
        .expect(200)
        .expect('Content-Type', /application\/json/)

      const response = await api
        .get(`/api/user/${adminUserId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200)
        .expect('Content-Type', /application\/json/)

      expect(response.body.user.name).toBe('Admin Updated')
    })

    test('Should fail to update user with invalid fields', async () => {
      const invalidData = { invalidField: 'Invalid' }

      const response = await api
        .patch(`/api/user/${adminUserId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(invalidData)
        .expect(400)
        .expect('Content-Type', /application\/json/)

      expect(response.body.message).toBe('No valid fields to update')
    })

    test('Should successfully update analyst user using admin token', async () => {
      const updatedData = { name: 'Analyst Updated' }

      await api
        .patch(`/api/user/${analystUserId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(updatedData)
        .expect(200)
        .expect('Content-Type', /application\/json/)

      const response = await api
        .get(`/api/user/${analystUserId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200)
        .expect('Content-Type', /application\/json/)

      expect(response.body.user.name).toBe('Analyst Updated')
    })
  })

  describe('Deleting user by ID', () => {
    test('Should successfully delete the analyst user with admin token', async () => {
      await api
        .delete(`/api/user/${analystUserId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(204)
      const response = await api
        .get('/api/users/')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200)
        .expect('Content-Type', /application\/json/)

      const users = response.body.users
      expect(users.length).toBe(1)
      expect(users[0].gmail).toBe(ADMIN_GMAIL)
    })

    test('Should return 404 when trying to delete a non-existing user', async () => {
      const nonExistentUserId = '-1'

      const response = await api
        .delete(`/api/user/${nonExistentUserId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(404)
        .expect('Content-Type', /application\/json/)

      expect(response.body.message).toBe('User not found')
    })
  })
})
