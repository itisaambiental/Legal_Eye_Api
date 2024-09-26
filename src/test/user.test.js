/* eslint-disable no-undef */
import { api } from '../config/test.config.js'
import UserRepository from '../repositories/User.repository.js'
import { ADMIN_PASSWORD_TEST, ADMIN_GMAIL } from '../config/variables.config.js'

let tokenAdmin
let adminUserId

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
  test('should login the admin user successfully', async () => {
    expect(tokenAdmin).toBeDefined()
  })

  test('should fetch admin user details with a valid token', async () => {
    const response = await api
      .get(`/api/user/${adminUserId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)
      .expect('Content-Type', /application\/json/)

    expect(response.body.user.gmail).toBe(ADMIN_GMAIL)
  })

  test('should return 403 when trying to access a protected route without token', async () => {
    await api
      .get(`/api/user/${adminUserId}`)
      .expect(401)
  })
})
