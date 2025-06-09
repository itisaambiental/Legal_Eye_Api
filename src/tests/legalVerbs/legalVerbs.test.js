/* eslint-disable no-undef */
import { api } from '../../config/test.config.js'
import UserRepository from '../../repositories/User.repository.js'
import LegalVerbsRepository from '../../repositories/LegalVerbs.repository.js'
import generateLegalVerbData from '../../utils/generateLegalVerbData.js'
import {
  ADMIN_PASSWORD_TEST,
  ADMIN_GMAIL
} from '../../config/variables.config.js'

let tokenAdmin

beforeAll(async () => {
  await UserRepository.deleteAllExceptByGmail(ADMIN_GMAIL)
  await LegalVerbsRepository.deleteAll()
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
  await LegalVerbsRepository.deleteAll()
  jest.restoreAllMocks()
})

describe('POST /api/legal-verbs', () => {
  test('Should successfully create a legal verb', async () => {
    const data = generateLegalVerbData()

    const response = await api
      .post('/api/legal-verbs')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(data)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    expect(response.body.legalVerb).toMatchObject(data)
  })

  test('Should return 409 if legal verb name already exists', async () => {
    const data = generateLegalVerbData({ name: 'Duplicate Name' })

    await api
      .post('/api/legal-verbs')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(data)
      .expect(201)

    const response = await api
      .post('/api/legal-verbs')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(data)
      .expect(409)

    expect(response.body.message).toMatch(/already exists/i)
  })

  test('Should return 400 if required fields are missing or invalid', async () => {
    const invalidCases = [
      { name: '', description: 'Valid', translation: 'Valid' },
      { name: 'Valid', description: '', translation: 'Valid' },
      { name: 'Valid', description: 'Valid', translation: '' },
      { name: '', description: '', translation: '' },
      {}
    ]

    for (const invalidData of invalidCases) {
      const response = await api
        .post('/api/legal-verbs')
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

  test('Should return 401 if the user is unauthorized', async () => {
    const data = generateLegalVerbData()
    const response = await api.post('/api/legal-verbs').send(data).expect(401)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })
})
describe('GET /api/legal-verbs', () => {
  test('Should return an empty list when no legal verbs exist', async () => {
    const response = await api
      .get('/api/legal-verbs')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)
      .expect('Content-Type', /application\/json/)

    expect(response.body.legalVerbs).toBeInstanceOf(Array)
    expect(response.body.legalVerbs).toHaveLength(0)
  })

  test('Should return a list with two legal verbs after creation', async () => {
    const legalVerbA = generateLegalVerbData({ name: 'Verb A' })
    const legalVerbB = generateLegalVerbData({ name: 'Verb B' })

    await api
      .post('/api/legal-verbs')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(legalVerbA)
      .expect(201)

    await api
      .post('/api/legal-verbs')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(legalVerbB)
      .expect(201)

    const response = await api
      .get('/api/legal-verbs')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const { legalVerbs } = response.body
    expect(legalVerbs).toBeInstanceOf(Array)
    expect(legalVerbs).toHaveLength(2)

    const names = legalVerbs.map((verb) => verb.name)
    expect(names).toEqual(expect.arrayContaining(['Verb A', 'Verb B']))

    legalVerbs.forEach((verb) => {
      expect(verb).toHaveProperty('id')
      expect(verb).toHaveProperty('name')
      expect(verb).toHaveProperty('description')
      expect(verb).toHaveProperty('translation')
    })
  })

  test('Should return 401 Unauthorized if token is missing', async () => {
    const response = await api.get('/api/legal-verbs').expect(401)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })
})
describe('GET /api/legal-verbs/:id', () => {
  test('Should successfully return a legal verb by its ID', async () => {
    const legalVerb = generateLegalVerbData({ name: 'Unique Verb' })

    const creationResponse = await api
      .post('/api/legal-verbs')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(legalVerb)
      .expect(201)

    const legalVerbId = creationResponse.body.legalVerb.id

    const response = await api
      .get(`/api/legal-verbs/${legalVerbId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const { legalVerb: returnedVerb } = response.body
    expect(returnedVerb).toBeDefined()
    expect(returnedVerb).toHaveProperty('id', legalVerbId)
    expect(returnedVerb).toMatchObject(legalVerb)
  })

  test('Should return 404 Not Found when the ID does not exist', async () => {
    const response = await api
      .get('/api/legal-verbs/-9999')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(404)

    expect(response.body.message).toMatch(/not found/i)
  })

  test('Should return 401 Unauthorized when no token is provided', async () => {
    const legalVerb = generateLegalVerbData({ name: 'Unauthorized Verb' })

    const creationResponse = await api
      .post('/api/legal-verbs')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(legalVerb)
      .expect(201)

    const id = creationResponse.body.legalVerb.id

    const response = await api.get(`/api/legal-verbs/${id}`).expect(401)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })
})
describe('GET /api/legal-verbs/search/name', () => {
  test('Should return a list with a legal verb that matches the given name', async () => {
    const legalVerb = generateLegalVerbData({ name: 'Search Name' })

    await api
      .post('/api/legal-verbs')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(legalVerb)
      .expect(201)

    const response = await api
      .get('/api/legal-verbs/search/name')
      .query({ name: 'Search Name' })
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)

    const { legalVerbs } = response.body
    expect(Array.isArray(legalVerbs)).toBe(true)
    expect(legalVerbs.some((v) => v.name === 'Search Name')).toBe(true)
  })

  test('Should return an empty list when no legal verb matches the given name', async () => {
    const response = await api
      .get('/api/legal-verbs/search/name')
      .query({ name: 'NonExistentName' })
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)

    expect(response.body.legalVerbs).toEqual([])
  })

  test('Should return 401 Unauthorized if token is missing', async () => {
    const response = await api
      .get('/api/legal-verbs/search/name')
      .query({ name: 'Search Name' })
      .expect(401)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })
})
describe('GET /api/legal-verbs/search/description', () => {
  test('Should return a list with a legal verb that matches the given description', async () => {
    const legalVerb = generateLegalVerbData({ description: 'Search Desc' })

    await api
      .post('/api/legal-verbs')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(legalVerb)
      .expect(201)

    const response = await api
      .get('/api/legal-verbs/search/description')
      .query({ description: 'Search Desc' })
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)

    const { legalVerbs } = response.body
    expect(Array.isArray(legalVerbs)).toBe(true)
    expect(legalVerbs.some((v) => v.description.includes('Search Desc'))).toBe(
      true
    )
  })

  test('Should return an empty list when no legal verb matches the given description', async () => {
    const response = await api
      .get('/api/legal-verbs/search/description')
      .query({ description: 'NonExistentDesc' })
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)

    expect(response.body.legalVerbs).toEqual([])
  })

  test('Should return 401 Unauthorized if token is missing', async () => {
    const response = await api
      .get('/api/legal-verbs/search/description')
      .query({ description: 'Search Desc' })
      .expect(401)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })
})
describe('GET /api/legal-verbs/search/translation', () => {
  test('Should return a list with a legal verb that matches the given translation', async () => {
    const legalVerb = generateLegalVerbData({ translation: 'Search Trans' })

    await api
      .post('/api/legal-verbs')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(legalVerb)
      .expect(201)

    const response = await api
      .get('/api/legal-verbs/search/translation')
      .query({ translation: 'Search Trans' })
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)

    const { legalVerbs } = response.body
    expect(Array.isArray(legalVerbs)).toBe(true)
    expect(legalVerbs.some((v) => v.translation.includes('Search Trans'))).toBe(
      true
    )
  })

  test('Should return an empty list when no legal verb matches the given translation', async () => {
    const response = await api
      .get('/api/legal-verbs/search/translation')
      .query({ translation: 'NonExistentTrans' })
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)

    expect(response.body.legalVerbs).toEqual([])
  })

  test('Should return 401 Unauthorized if token is missing', async () => {
    const response = await api
      .get('/api/legal-verbs/search/translation')
      .query({ translation: 'Search Trans' })
      .expect(401)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })
})

describe('PATCH /api/legal-verbs/:id', () => {
  test('Should successfully update an existing legal verb', async () => {
    const initialData = generateLegalVerbData({ name: 'Initial Name' })

    const creationResponse = await api
      .post('/api/legal-verbs')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(initialData)
      .expect(201)

    const legalVerbId = creationResponse.body.legalVerb.id
    const updatedData = generateLegalVerbData({ name: 'Updated Name' })

    const updateResponse = await api
      .patch(`/api/legal-verbs/${legalVerbId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(updatedData)
      .expect(200)

    expect(updateResponse.body.legalVerb).toMatchObject({
      id: legalVerbId,
      ...updatedData
    })
  })

  test('Should return 400 if update data is invalid', async () => {
    const legalVerb = generateLegalVerbData()

    const creationResponse = await api
      .post('/api/legal-verbs')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(legalVerb)
      .expect(201)

    const id = creationResponse.body.legalVerb.id

    await api
      .patch(`/api/legal-verbs/${id}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ name: '', description: '', translation: '' })
      .expect(400)
  })

  test('Should return 409 if updated name already exists', async () => {
    const dataA = generateLegalVerbData({ name: 'Name A' })
    const dataB = generateLegalVerbData({ name: 'Name B' })

    await api
      .post('/api/legal-verbs')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(dataA)
      .expect(201)

    const responseB = await api
      .post('/api/legal-verbs')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(dataB)
      .expect(201)

    const idToUpdate = responseB.body.legalVerb.id

    await api
      .patch(`/api/legal-verbs/${idToUpdate}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ ...dataB, name: 'Name A' })
      .expect(409)
  })

  test('Should return 404 if legal verb does not exist', async () => {
    const updateData = generateLegalVerbData()

    await api
      .patch('/api/legal-verbs/-9999')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(updateData)
      .expect(404)
  })

  test('Should return 401 Unauthorized if token is missing', async () => {
    const legalVerb = generateLegalVerbData()

    const creationResponse = await api
      .post('/api/legal-verbs')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(legalVerb)
      .expect(201)

    const id = creationResponse.body.legalVerb.id

    const response = await api
      .patch(`/api/legal-verbs/${id}`)
      .send(legalVerb)
      .expect(401)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })
})

describe('DELETE /api/legal-verbs/:id', () => {
  test('Should successfully delete a legal verb by ID', async () => {
    const legalVerb = generateLegalVerbData({ name: 'Delete Me' })

    const creationResponse = await api
      .post('/api/legal-verbs')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(legalVerb)
      .expect(201)

    const id = creationResponse.body.legalVerb.id

    await api
      .delete(`/api/legal-verbs/${id}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(204)

    await api
      .get(`/api/legal-verbs/${id}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(404)
  })

  test('Should return 404 if the legal verb does not exist', async () => {
    await api
      .delete('/api/legal-verbs/-9999')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(404)
  })

  test('Should return 409 if the legal verb is associated with requirement identifications', async () => {
    const legalVerb = generateLegalVerbData({ name: 'Delete Me' })

    const creationResponse = await api
      .post('/api/legal-verbs')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(legalVerb)
      .expect(201)

    const id = creationResponse.body.legalVerb.id

    jest
      .spyOn(LegalVerbsRepository, 'checkReqIdentificationAssociations')
      .mockResolvedValueOnce({ isAssociatedToReqIdentifications: true })

    const response = await api
      .delete(`/api/legal-verbs/${id}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(409)

    expect(response.body.message).toMatch(/associated with one or more requirement identifications/i)
  })

  test('Should return 401 Unauthorized if token is missing', async () => {
    const legalVerb = generateLegalVerbData()

    const creationResponse = await api
      .post('/api/legal-verbs')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(legalVerb)
      .expect(201)

    const id = creationResponse.body.legalVerb.id

    const response = await api.delete(`/api/legal-verbs/${id}`).expect(401)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })
})

describe('DELETE /api/legal-verbs/delete/batch', () => {
  test('Should successfully delete multiple legal verbs', async () => {
    const verb1 = generateLegalVerbData({ name: 'Batch One' })
    const verb2 = generateLegalVerbData({ name: 'Batch Two' })

    const res1 = await api
      .post('/api/legal-verbs')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(verb1)
      .expect(201)
    const res2 = await api
      .post('/api/legal-verbs')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(verb2)
      .expect(201)

    const idsToDelete = [res1.body.legalVerb.id, res2.body.legalVerb.id]

    await api
      .delete('/api/legal-verbs/delete/batch')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ legalVerbsIds: idsToDelete })
      .expect(204)

    for (const id of idsToDelete) {
      await api
        .get(`/api/legal-verbs/${id}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(404)
    }
  })

  test('Should return 404 if any provided ID does not exist', async () => {
    const legalVerb = generateLegalVerbData({ name: 'Valid for Batch' })

    const creationResponse = await api
      .post('/api/legal-verbs')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(legalVerb)
      .expect(201)

    const validId = creationResponse.body.legalVerb.id

    await api
      .delete('/api/legal-verbs/delete/batch')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ legalVerbsIds: [validId, -9999] })
      .expect(404)
  })

  test('Should return 400 if batch payload is invalid', async () => {
    const invalidPayloads = [
      {},
      { legalVerbsIds: null },
      { legalVerbsIds: 'invalid' },
      { legalVerbsIds: [] }
    ]

    for (const payload of invalidPayloads) {
      await api
        .delete('/api/legal-verbs/delete/batch')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(payload)
        .expect(400)
    }
  })

  test('Should return 409 if one or more legal verbs are associated with requirement identifications', async () => {
    const legalVerb1 = generateLegalVerbData({ name: 'Associated Verb 1' })
    const legalVerb2 = generateLegalVerbData({ name: 'Free Verb 2' })

    const res1 = await api
      .post('/api/legal-verbs')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(legalVerb1)
      .expect(201)

    const res2 = await api
      .post('/api/legal-verbs')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(legalVerb2)
      .expect(201)

    const legalVerbId1 = res1.body.legalVerb.id
    const legalVerbId2 = res2.body.legalVerb.id

    jest
      .spyOn(LegalVerbsRepository, 'checkReqIdentificationAssociationsBatch')
      .mockResolvedValueOnce([
        {
          id: legalVerbId1,
          name: legalVerb1.name,
          isAssociatedToReqIdentifications: true
        },
        {
          id: legalVerbId2,
          name: legalVerb2.name,
          isAssociatedToReqIdentifications: false
        }
      ])

    const response = await api
      .delete('/api/legal-verbs/delete/batch')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ legalVerbsIds: [legalVerbId1, legalVerbId2] })
      .expect(409)
      .expect('Content-Type', /application\/json/)

    expect(response.body.message).toMatch(
      /associated with requirement identifications/i
    )

    expect(response.body.errors.legalVerbs).toEqual([
      {
        id: legalVerbId1,
        name: legalVerb1.name
      }
    ])
  })

  test('Should return 401 Unauthorized if token is missing', async () => {
    const legalVerb = generateLegalVerbData({ name: 'Unauthorized Batch' })

    const creationResponse = await api
      .post('/api/legal-verbs')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(legalVerb)
      .expect(201)

    const id = creationResponse.body.legalVerb.id

    const response = await api
      .delete('/api/legal-verbs/delete/batch')
      .send({ legalVerbsIds: [id] })
      .expect(401)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })
})
