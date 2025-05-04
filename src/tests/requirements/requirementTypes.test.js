/* eslint-disable no-undef */
import { api } from '../../config/test.config.js'
import UserRepository from '../../repositories/User.repository.js'
import RequirementTypesRepository from '../../repositories/RequirementTypes.repository.js'
import generateRequirementTypeData from '../../utils/generateRequirementTypeData.js'
import { ADMIN_PASSWORD_TEST, ADMIN_GMAIL } from '../../config/variables.config.js'

let tokenAdmin

beforeAll(async () => {
  await UserRepository.deleteAllExceptByGmail(ADMIN_GMAIL)
  await RequirementTypesRepository.deleteAll()
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
  await RequirementTypesRepository.deleteAll()
})

describe('POST /api/requirement-types', () => {
  test('should successfully create a requirement type', async () => {
    const data = generateRequirementTypeData()

    const response = await api
      .post('/api/requirement-types')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(data)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    expect(response.body.requirementType).toMatchObject(data)
  })

  test('should return 409 if requirement type name already exists', async () => {
    const data = generateRequirementTypeData({ name: 'Duplicate Name' })

    await api
      .post('/api/requirement-types')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(data)
      .expect(201)

    const response = await api
      .post('/api/requirement-types')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(data)
      .expect(409)

    expect(response.body.message).toMatch(/already exists/i)
  })

  test('should return 400 if required fields are missing or invalid', async () => {
    const invalidCases = [
      { name: '', description: 'Valid', classification: 'General' },
      { name: 'Valid', description: '', classification: 'General' },
      { name: 'Valid', description: 'Valid', classification: '' },
      { name: '', description: '', classification: '' },
      {}
    ]

    for (const invalidData of invalidCases) {
      const response = await api
        .post('/api/requirement-types')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(invalidData)
        .expect(400)

      expect(response.body.message).toBe('Validation failed')
      expect(Array.isArray(response.body.errors)).toBe(true)
      expect(response.body.errors.length).toBeGreaterThan(0)

      response.body.errors.forEach((error) => {
        expect(error).toHaveProperty('field')
        expect(error).toHaveProperty('message')
      })
    }
  })

  test('should return 401 if token is missing', async () => {
    const data = generateRequirementTypeData()

    const response = await api
      .post('/api/requirement-types')
      .send(data)
      .expect(401)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })
})
