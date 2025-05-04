/* eslint-disable no-undef */
import { api } from '../../config/test.config.js'
import UserRepository from '../../repositories/User.repository.js'
import { ADMIN_PASSWORD_TEST, ADMIN_GMAIL } from '../../config/variables.config.js'

const timeout = 20000
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
}, timeout)
