/* eslint-disable no-undef */
import { api } from '../../config/test.config.js'
import UserRepository from '../../repositories/User.repository.js'
import { ADMIN_PASSWORD_TEST, ADMIN_GMAIL } from '../../config/variables.config.js'

let tokenAdmin
let adminUserId
let analystUserId

const timeout = 50000
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
  const adminUser = await UserRepository.existsByGmail(ADMIN_GMAIL)
  adminUserId = adminUser.id
}, timeout)

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

      expect(response.body.message).toMatch(/Invalid email or password/i)
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

      expect(response.body.message).toMatch(/Invalid email or password/i)
    })

    test('Should return 400 when required fields are missing', async () => {
      const response = await api
        .post('/api/user/login')
        .send({ gmail: '' })
        .expect(400)
        .expect('Content-Type', /application\/json/)

      expect(response.body.message).toMatch(/Missing required fields: gmail, password/i)
    })
  })

  describe('User registration and fetching tests', () => {
    const userData = {
      gmail: 'testuser@isaambiental.com',
      name: 'Analyst User',
      roleId: '2'
    }
    test('Should successfully register a new user', async () => {
      const response = await api
        .post('/api/user/register')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(userData)
        .expect(201)
        .expect('Content-Type', /application\/json/)

      analystUserId = response.body.user.id
      expect(response.body.user.id).toBeDefined()
    })

    test('Should return error if Gmail already exists', async () => {
      const response = await api
        .post('/api/user/register')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(userData)
        .expect(409)
        .expect('Content-Type', /application\/json/)

      expect(response.body.message).toMatch(/Gmail already exists/i)
    })

    test('Should return validation errors for invalid user data', async () => {
      const response = await api
        .post('/api/user/register')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
          name: 'Name',
          gmail: 'Invalid email format',
          roleId: 'Invalid roleId format and value'
        })
        .expect(400)
        .expect('Content-Type', /application\/json/)

      expect(response.body.message).toMatch(/Validation failed/i)
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          { field: 'gmail', message: expect.stringMatching(/email must be valid/i) },
          { field: 'gmail', message: expect.stringMatching(/must end with @isaambiental.com/i) },
          { field: 'roleId', message: expect.stringMatching(/must be a valid number/i) },
          { field: 'roleId', message: expect.stringMatching(/must be either 1 \(Admin\) or 2 \(Analyst\)/i) }
        ])
      )
    })

    test('Should return 400 when required fields are missing during registration', async () => {
      const response = await api
        .post('/api/user/register')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ name: '', gmail: '', roleId: 2 })
        .expect(400)
        .expect('Content-Type', /application\/json/)

      expect(response.body.message).toMatch(/Missing required fields/i)
    })

    test('Should return exactly two users', async () => {
      const response = await api
        .get('/api/users/')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200)
        .expect('Content-Type', /application\/json/)

      const users = response.body.users
      expect(users).toHaveLength(2)
      expect(users.map(user => user.gmail)).toEqual(
        expect.arrayContaining([ADMIN_GMAIL, 'testuser@isaambiental.com'])
      )
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

      expect(response.body.error).toMatch(/token missing or invalid/i)
    })

    test('Should return an error 404 when user is not found', async () => {
      const invalidUserId = -1
      const response = await api
        .get(`/api/user/${invalidUserId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(404)
        .expect('Content-Type', /application\/json/)

      expect(response.body.message).toMatch(/User not found/i)
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

  describe('Get users by role ID', () => {
    const roleId = 2
    const newUserData = {
      name: 'Test Analyst',
      gmail: 'testanalyst@isaambiental.com',
      roleId: '2'
    }
    test('Should return an empty array when no users match the role ID', async () => {
      const response = await api
        .get(`/api/users/role/${roleId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200)
        .expect('Content-Type', /application\/json/)

      expect(response.body.users).toBeInstanceOf(Array)
      expect(response.body.users.length).toBe(1)
    })
    test('Should return a list of users filtered by role ID after creating a user', async () => {
      await api
        .post('/api/user/register')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(newUserData)
        .expect(201)
      const response = await api
        .get(`/api/users/role/${roleId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200)
        .expect('Content-Type', /application\/json/)

      expect(response.body.users).toBeInstanceOf(Array)
      expect(response.body.users.length).toBe(2)
      expect(response.body.users.some(user => user.gmail === newUserData.gmail)).toBe(true)
    })

    test('Should return 401 if the user is unauthorized', async () => {
      const response = await api
        .get(`/api/users/role/${roleId}`)
        .expect(401)
        .expect('Content-Type', /application\/json/)

      expect(response.body.error).toMatch(/token missing or invalid/i)
    })
  })

  describe('Get users by name or gmail', () => {
    const searchUserData = {
      name: 'Search User',
      gmail: 'searchuser@isaambiental.com',
      roleId: '2'
    }

    test('Should return an empty array when no users match the name or gmail', async () => {
      const response = await api
        .get('/api/users/search/filter')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .query({ nameOrEmail: 'NonExistentNameOrEmail' })
        .expect(200)
        .expect('Content-Type', /application\/json/)

      expect(response.body.users).toBeInstanceOf(Array)
      expect(response.body.users.length).toBe(0)
    })

    test('Should return a list of users filtered by name or gmail after creating a user', async () => {
      await api
        .post('/api/user/register')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(searchUserData)
        .expect(201)

      const nameResponse = await api
        .get('/api/users/search/filter')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .query({ nameOrEmail: 'Search User' })
        .expect(200)
        .expect('Content-Type', /application\/json/)

      expect(nameResponse.body.users).toBeInstanceOf(Array)
      expect(nameResponse.body.users.length).toBe(1)
      expect(
        nameResponse.body.users.some(user => user.gmail === searchUserData.gmail)
      ).toBe(true)

      const gmailResponse = await api
        .get('/api/users/search/filter')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .query({ nameOrEmail: 'searchuser@isaambiental.com' })
        .expect(200)
        .expect('Content-Type', /application\/json/)

      expect(gmailResponse.body.users).toBeInstanceOf(Array)
      expect(gmailResponse.body.users.length).toBe(1)
      expect(
        nameResponse.body.users.some(user => user.gmail === searchUserData.gmail)
      ).toBe(true)
    })

    test('Should return 401 if the user is unauthorized', async () => {
      const response = await api
        .get('/api/users/search/filter')
        .query({ nameOrEmail: 'Search User' })
        .expect(401)
        .expect('Content-Type', /application\/json/)

      expect(response.body.error).toMatch(/token missing or invalid/i)
    })
  })

  describe('Updating user information', () => {
    test('Should successfully update admin user information with valid fields', async () => {
      const updatedData = { name: 'Admin Updated', gmail: ADMIN_GMAIL, roleId: '1' }
      const updateResponse = await api
        .patch(`/api/user/${adminUserId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(updatedData)
        .expect(200)
        .expect('Content-Type', /application\/json/)

      expect(updateResponse.body).toHaveProperty('user')
      expect(updateResponse.body.user.name).toBe(updatedData.name)
      expect(updateResponse.body).toHaveProperty('token')

      const response = await api
        .get(`/api/user/${adminUserId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200)
        .expect('Content-Type', /application\/json/)

      expect(response.body.user.name).toBe(updatedData.name)
    })

    test('Should return validation errors for invalid user data when updating user', async () => {
      const response = await api
        .patch(`/api/user/${analystUserId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
          name: 'Name',
          gmail: 'Invalid email format',
          roleId: 'Invalid roleId format and value'
        })
        .expect(400)
        .expect('Content-Type', /application\/json/)

      expect(response.body.message).toMatch(/Validation failed/i)
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          { field: 'gmail', message: expect.stringMatching(/email must be valid/i) },
          { field: 'gmail', message: expect.stringMatching(/must end with @isaambiental.com/i) },
          { field: 'roleId', message: expect.stringMatching(/must be a valid number/i) },
          { field: 'roleId', message: expect.stringMatching(/must be either 1 \(Admin\) or 2 \(Analyst\)/i) }
        ])
      )
    })

    test('Should return error if Gmail already exists', async () => {
      const updatedData = { name: 'Analyst Updated', gmail: ADMIN_GMAIL, roleId: '1' }

      const response = await api
        .patch(`/api/user/${analystUserId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(updatedData)
        .expect(409)
        .expect('Content-Type', /application\/json/)

      expect(response.body.message).toMatch(/Gmail already exists/i)
    })

    test('Should fail to update user with missing required fields', async () => {
      const response = await api
        .patch(`/api/user/${adminUserId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(400)
        .expect('Content-Type', /application\/json/)

      expect(response.body.message).toMatch(/Validation failed/i)
    })

    test('Should successfully update analyst user using admin token', async () => {
      const userData = {
        gmail: 'testuser@isaambiental.com',
        name: 'Analyst User',
        roleId: '2'
      }
      const updateResponse = await api
        .patch(`/api/user/${analystUserId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(userData)
        .expect(200)
        .expect('Content-Type', /application\/json/)

      expect(updateResponse.body).toHaveProperty('user')
      expect(updateResponse.body.user.name).toBe(userData.name)
      expect(updateResponse.body).toHaveProperty('token')

      const response = await api
        .get(`/api/user/${analystUserId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200)
        .expect('Content-Type', /application\/json/)

      expect(response.body.user.name).toBe(userData.name)
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
      expect(users).toHaveLength(3)
      expect(users.some(user => user.gmail === ADMIN_GMAIL)).toBe(true)
    })

    test('Should return 404 when trying to delete a non-existing user', async () => {
      const nonExistentUserId = -1

      const response = await api
        .delete(`/api/user/${nonExistentUserId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(404)
        .expect('Content-Type', /application\/json/)

      expect(response.body.message).toMatch(/User not found/i)
    })
  })

  describe('Password reset and verification', () => {
    test('Should successfully send a password reset code', async () => {
      await api
        .post('/api/user/reset-password')
        .send({ gmail: ADMIN_GMAIL })
        .expect(200)
        .expect('Content-Type', /text\/plain/)
    })

    test('Should return 400 for expired or invalid reset code', async () => {
      const response = await api
        .post('/api/user/verify-code')
        .send({ gmail: ADMIN_GMAIL, code: 'invalidCode' })
        .expect(400)
        .expect('Content-Type', /application\/json/)

      expect(response.body.message).toMatch(/Invalid or expired code/i)
    })
  })

  describe('Batch delete users', () => {
    const userIdsToDelete = []

    beforeAll(async () => {
      const usersToCreate = [
        { gmail: 'batchuser1@isaambiental.com', name: 'User One', roleId: '2' },
        { gmail: 'batchuser2@isaambiental.com', name: 'User Two', roleId: '2' },
        { gmail: 'batchuser3@isaambiental.com', name: 'User Three', roleId: '2' }
      ]

      for (const userData of usersToCreate) {
        const response = await api
          .post('/api/user/register')
          .set('Authorization', `Bearer ${tokenAdmin}`)
          .send(userData)
          .expect(201)
          .expect('Content-Type', /application\/json/)

        userIdsToDelete.push(response.body.user.id)
      }
    })

    test('Should successfully delete multiple users', async () => {
      await api
        .delete('/api/users/batch')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ userIds: userIdsToDelete })
        .expect(204)

      const response = await api
        .get('/api/users/')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200)
        .expect('Content-Type', /application\/json/)

      const remainingUsers = response.body.users
      expect(remainingUsers.some(user => userIdsToDelete.includes(user.id))).toBe(false)
    })

    test('Should return 400 when userIds is missing or empty', async () => {
      const response = await api
        .delete('/api/users/batch')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ userIds: [] })
        .expect(400)
        .expect('Content-Type', /application\/json/)

      expect(response.body.message).toMatch(/Missing required fields: userIds/i)
    })

    test('Should return 401 when unauthorized user attempts to delete users', async () => {
      const response = await api
        .delete('/api/users/batch')
        .send({ userIds: userIdsToDelete })
        .expect(401)
        .expect('Content-Type', /application\/json/)

      expect(response.body.error).toMatch(/token missing or invalid/i)
    })

    test('Should return 404 if any userId does not exist', async () => {
      const nonExistentUserId = -1
      const response = await api
        .delete('/api/users/batch')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ userIds: [nonExistentUserId, ...userIdsToDelete] })
        .expect(404)
        .expect('Content-Type', /application\/json/)

      expect(response.body.message).toMatch(/Users not found for IDs/i)
    })
  })
})
