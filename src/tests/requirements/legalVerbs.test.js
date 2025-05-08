/* eslint-disable no-undef */
import { api } from '../../config/test.config.js'
import UserRepository from '../../repositories/User.repository.js'
import LegalVerbsRepository from '../../repositories/LegalVerbs.repository.js'
import generateLegalVerbData from '../../utils/generateLegalVerbData.js'
import { ADMIN_PASSWORD_TEST, ADMIN_GMAIL } from '../../config/variables.config.js'

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

      response.body.errors.forEach(error => {
        expect(error).toHaveProperty('field')
        expect(error).toHaveProperty('message')
      })
    }
  })

  test('Should return 401 if the user is unauthorized', async () => {
    const data = generateLegalVerbData()
    const response = await api
      .post('/api/legal-verbs')
      .send(data)
      .expect(401)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })
})

describe('GET /api/legal-verbs', () => {
  test('Should return an empty array if no legal verbs exist', async () => {
    const response = await api
      .get('/api/legal-verbs')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)
      .expect('Content-Type', /application\/json/)

    expect(response.body.legalVerbs).toBeInstanceOf(Array)
    expect(response.body.legalVerbs.length).toBe(0)
  })

  test('Should return two legal verbs after creation', async () => {
    const data1 = generateLegalVerbData({ name: 'Verb A' })
    const data2 = generateLegalVerbData({ name: 'Verb B' })

    await api
      .post('/api/legal-verbs')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(data1)
      .expect(201)

    await api
      .post('/api/legal-verbs')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(data2)
      .expect(201)

    const response = await api
      .get('/api/legal-verbs')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const legalVerbs = response.body.legalVerbs
    expect(legalVerbs).toBeInstanceOf(Array)
    expect(legalVerbs.length).toBe(2)
    const names = legalVerbs.map(lv => lv.name)
    expect(names).toEqual(expect.arrayContaining(['Verb A', 'Verb B']))

    legalVerbs.forEach(lv => {
      expect(lv).toHaveProperty('id')
      expect(lv).toHaveProperty('name')
      expect(lv).toHaveProperty('description')
      expect(lv).toHaveProperty('translation')
    })
  })

  test('Should return 401 if the user is unauthorized', async () => {
    const response = await api
      .get('/api/legal-verbs')
      .expect(401)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })
})

// === Segunda parte: GET by ID y búsquedas ===
describe('GET /api/legal-verbs/:id', () => {
  test('Should successfully return a legal verb by ID', async () => {
    const data = generateLegalVerbData({ name: 'Unique Verb' })

    const creationResponse = await api
      .post('/api/legal-verbs')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(data)
      .expect(201)

    const createdId = creationResponse.body.legalVerb.id

    const fetchResponse = await api
      .get(`/api/legal-verbs/${createdId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const legalVerb = fetchResponse.body.legalVerb
    expect(legalVerb).toBeDefined()
    expect(legalVerb).toHaveProperty('id', createdId)
    expect(legalVerb).toHaveProperty('name', data.name)
    expect(legalVerb).toHaveProperty('description', data.description)
    expect(legalVerb).toHaveProperty('translation', data.translation)
  })

  test('Should return 404 if legal verb with given ID does not exist', async () => {
    await api
      .get('/api/legal-verbs/-9999')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(404)
      .then(res => expect(res.body.message).toMatch(/not found/i))
  })

  test('Should return 401 if the user is unauthorized', async () => {
    const data = generateLegalVerbData()
    const creationRes = await api
      .post('/api/legal-verbs')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(data)
      .expect(201)
    const id = creationRes.body.legalVerb.id

    await api
      .get(`/api/legal-verbs/${id}`)
      .expect(401)
      .then(res => expect(res.body.error).toMatch(/token missing or invalid/i))
  })
})

// Search by name

describe('GET /api/legal-verbs/search/name', () => {
  test('Should return a legal verb that matches the given name', async () => {
    const data = generateLegalVerbData({ name: 'Search Name' })
    await api
      .post('/api/legal-verbs')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(data)
      .expect(201)

    await api
      .get('/api/legal-verbs/search/name')
      .query({ name: 'Search Name' })
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)
      .then(res => {
        expect(Array.isArray(res.body.legalVerbs)).toBe(true)
        expect(res.body.legalVerbs.some(v => v.name === 'Search Name')).toBe(true)
      })
  })

  test('Should return an empty array when no legal verbs match the given name', async () => {
    await api
      .get('/api/legal-verbs/search/name')
      .query({ name: 'NonExistentName' })
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)
      .then(res => expect(res.body.legalVerbs).toEqual([]))
  })

  test('Should return 401 if the user is unauthorized', async () => {
    await api
      .get('/api/legal-verbs/search/name')
      .query({ name: 'Search Name' })
      .expect(401)
      .then(res => expect(res.body.error).toMatch(/token missing or invalid/i))
  })
})

// Search by description

describe('GET /api/legal-verbs/search/description', () => {
  test('Should return a legal verb that matches the given description', async () => {
    const data = generateLegalVerbData({ description: 'Search Desc' })
    await api
      .post('/api/legal-verbs')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(data)
      .expect(201)

    await api
      .get('/api/legal-verbs/search/description')
      .query({ description: 'Search Desc' })
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)
      .then(res => {
        expect(Array.isArray(res.body.legalVerbs)).toBe(true)
        expect(res.body.legalVerbs.some(v => v.description.includes('Search Desc'))).toBe(true)
      })
  })

  test('Should return an empty array when no legal verbs match the given description', async () => {
    await api
      .get('/api/legal-verbs/search/description')
      .query({ description: 'NonExistentDesc' })
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)
      .then(res => expect(res.body.legalVerbs).toEqual([]))
  })

  test('Should return 401 if the user is unauthorized', async () => {
    await api
      .get('/api/legal-verbs/search/description')
      .query({ description: 'Search Desc' })
      .expect(401)
      .then(res => expect(res.body.error).toMatch(/token missing or invalid/i))
  })
})

// Search by translation

describe('GET /api/legal-verbs/search/translation', () => {
  test('Should return a legal verb that matches the given translation', async () => {
    const data = generateLegalVerbData({ translation: 'Search Trans' })
    await api
      .post('/api/legal-verbs')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(data)
      .expect(201)

    await api
      .get('/api/legal-verbs/search/translation')
      .query({ translation: 'Search Trans' })
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)
      .then(res => {
        expect(Array.isArray(res.body.legalVerbs)).toBe(true)
        expect(res.body.legalVerbs.some(v => v.translation.includes('Search Trans'))).toBe(true)
      })
  })

  test('Should return an empty array when no legal verbs match the given translation', async () => {
    await api
      .get('/api/legal-verbs/search/translation')
      .query({ translation: 'NonExistentTrans' })
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)
      .then(res => expect(res.body.legalVerbs).toEqual([]))
  })

  test('Should return 401 if the user is unauthorized', async () => {
    await api
      .get('/api/legal-verbs/search/translation')
      .query({ translation: 'Search Trans' })
      .expect(401)
      .then(res => expect(res.body.error).toMatch(/token missing or invalid/i))
  })
})

// PATCH /api/legal-verbs/:id

describe('PATCH /api/legal-verbs/:id', () => {
  test('Should successfully update a legal verb', async () => {
    const initialData = generateLegalVerbData({ name: 'Initial Name' })
    const creationResponse = await api
      .post('/api/legal-verbs')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(initialData)
      .expect(201)
    const id = creationResponse.body.legalVerb.id
    const updatedData = generateLegalVerbData({ name: 'Updated Name' })
    await api
      .patch(`/api/legal-verbs/${id}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(updatedData)
      .expect(200)
      .then(res => expect(res.body.legalVerb).toMatchObject({ id, ...updatedData }))
  })

  test('Should return 400 if update data is invalid', async () => {
    const data = generateLegalVerbData()
    const creationResponse = await api
      .post('/api/legal-verbs')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(data)
      .expect(201)
    const id = creationResponse.body.legalVerb.id
    await api
      .patch(`/api/legal-verbs/${id}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ name: '', description: '', translation: '' })
      .expect(400)
  })

  test('Should return 409 if updated name already exists', async () => {
    const data1 = generateLegalVerbData({ name: 'Name A' })
    const data2 = generateLegalVerbData({ name: 'Name B' })
    await api.post('/api/legal-verbs').set('Authorization', `Bearer ${tokenAdmin}`).send(data1).expect(201)
    const response2 = await api.post('/api/legal-verbs').set('Authorization', `Bearer ${tokenAdmin}`).send(data2).expect(201)
    const idToUpdate = response2.body.legalVerb.id
    await api
      .patch(`/api/legal-verbs/${idToUpdate}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ ...data2, name: 'Name A' })
      .expect(409)
  })

  test('Should return 404 if legal verb not found', async () => {
    const data = generateLegalVerbData()
    await api.patch('/api/legal-verbs/-9999').set('Authorization', `Bearer ${tokenAdmin}`).send(data).expect(404)
  })

  test('Should return 401 if unauthorized', async () => {
    const data = generateLegalVerbData()
    const creationResponse = await api
      .post('/api/legal-verbs')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(data)
      .expect(201)
    const id = creationResponse.body.legalVerb.id
    await api.patch(`/api/legal-verbs/${id}`).send(data).expect(401)
  })
})

// DELETE /api/legal-verbs/:id

describe('DELETE /api/legal-verbs/:id', () => {
  test('Should successfully delete a legal verb', async () => {
    const data = generateLegalVerbData({ name: 'Delete Me' })
    const creationResponse = await api
      .post('/api/legal-verbs')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(data)
      .expect(201)
    const id = creationResponse.body.legalVerb.id
    await api.delete(`/api/legal-verbs/${id}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(204)
    await api.get(`/api/legal-verbs/${id}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(404)
  })

  test('Should return 404 if deleting non-existent', async () => {
    await api.delete('/api/legal-verbs/-9999')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(404)
  })

  test('Should return 401 if unauthorized', async () => {
    const data = generateLegalVerbData()
    const creationResponse = await api
      .post('/api/legal-verbs')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(data)
      .expect(201)
    const id = creationResponse.body.legalVerb.id
    await api.delete(`/api/legal-verbs/${id}`).expect(401)
  })
})

// DELETE batch

describe('DELETE /api/legal-verbs/delete/batch', () => {
  test('Should delete multiple legal verbs', async () => {
    const v1 = generateLegalVerbData({ name: 'Batch 1' })
    const v2 = generateLegalVerbData({ name: 'Batch 2' })
    const r1 = await api.post('/api/legal-verbs')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(v1)
      .expect(201)
    const r2 = await api.post('/api/legal-verbs')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(v2)
      .expect(201)
    const idsToDelete = [r1.body.legalVerb.id, r2.body.legalVerb.id]
    await api.delete('/api/legal-verbs/delete/batch')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ legalVerbsIds: idsToDelete })
      .expect(204)
    for (const id of idsToDelete) {
      await api.get(`/api/legal-verbs/${id}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(404)
    }
  })

  test('Should return 404 if any id not exist', async () => {
    const v = generateLegalVerbData({ name: 'Batch Valid' })
    const r = await api.post('/api/legal-verbs')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(v)
      .expect(201)
    const validId = r.body.legalVerb.id
    await api.delete('/api/legal-verbs/delete/batch')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ legalVerbsIds: [validId, -9999] })
      .expect(404)
  })

  test('Should return 400 if invalid batch', async () => {
    const cases = [{}, { legalVerbsIds: null }, { legalVerbsIds: 'x' }, { legalVerbsIds: [] }]
    for (const body of cases) {
      await api.delete('/api/legal-verbs/delete/batch')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(body)
        .expect(400)
    }
  })

  test('Should return 401 if unauthorized', async () => {
    const data = generateLegalVerbData({ name: 'Batch Unauthorized' })
    const cr = await api.post('/api/legal-verbs')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(data)
      .expect(201)
    const id = cr.body.legalVerb.id
    await api.delete('/api/legal-verbs/delete/batch')
      .send({ legalVerbsIds: [id] })
      .expect(401)
  })
})
