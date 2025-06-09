/* eslint-disable no-undef */
import { api } from '../../config/test.config.js'
import UserRepository from '../../repositories/User.repository.js'
import RequirementTypesRepository from '../../repositories/RequirementTypes.repository.js'
import generateRequirementTypeData from '../../utils/generateRequirementTypeData.js'
import {
  ADMIN_PASSWORD_TEST,
  ADMIN_GMAIL
} from '../../config/variables.config.js'

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
  test('Should successfully create a requirement type', async () => {
    const data = generateRequirementTypeData()

    const response = await api
      .post('/api/requirement-types')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(data)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    expect(response.body.requirementType).toMatchObject(data)
  })

  test('Should return 409 if requirement type name already exists', async () => {
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

  test('Should return 400 if required fields are missing or invalid', async () => {
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

  test('Should return 401 if the user is unauthorized', async () => {
    const data = generateRequirementTypeData()
    const response = await api
      .post('/api/requirement-types')
      .send(data)
      .expect(401)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })
})

describe('GET /api/requirement-types', () => {
  test('Should return an empty array if no requirement types exist', async () => {
    const response = await api
      .get('/api/requirement-types')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)
      .expect('Content-Type', /application\/json/)

    expect(response.body.requirementTypes).toBeInstanceOf(Array)
    expect(response.body.requirementTypes.length).toBe(0)
  })

  test('Should return two requirement types after creation', async () => {
    const data1 = generateRequirementTypeData({ name: 'Type A' })
    const data2 = generateRequirementTypeData({ name: 'Type B' })

    await api
      .post('/api/requirement-types')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(data1)
      .expect(201)

    await api
      .post('/api/requirement-types')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(data2)
      .expect(201)

    const response = await api
      .get('/api/requirement-types')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const requirementTypes = response.body.requirementTypes

    expect(requirementTypes).toBeInstanceOf(Array)
    expect(requirementTypes.length).toBe(2)
    const names = requirementTypes.map((rt) => rt.name)
    expect(names).toEqual(expect.arrayContaining(['Type A', 'Type B']))

    requirementTypes.forEach((rt) => {
      expect(rt).toHaveProperty('id')
      expect(rt).toHaveProperty('name')
      expect(rt).toHaveProperty('description')
      expect(rt).toHaveProperty('classification')
    })
  })

  test('Should return 401 if the user is unauthorized', async () => {
    const response = await api.get('/api/requirement-types').expect(401)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })
})

describe('GET /api/requirement-types/:id', () => {
  test('Should successfully return a requirement type by ID', async () => {
    const data = generateRequirementTypeData({ name: 'Unique Type' })

    const creationResponse = await api
      .post('/api/requirement-types')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(data)
      .expect(201)

    const createdId = creationResponse.body.requirementType.id

    const fetchResponse = await api
      .get(`/api/requirement-types/${createdId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const requirementType = fetchResponse.body.requirementType

    expect(requirementType).toBeDefined()
    expect(requirementType).toHaveProperty('id', createdId)
    expect(requirementType).toHaveProperty('name', data.name)
    expect(requirementType).toHaveProperty('description', data.description)
    expect(requirementType).toHaveProperty(
      'classification',
      data.classification
    )
  })

  test('Should return 404 if requirement type with given ID does not exist', async () => {
    const invalidId = -9999
    const response = await api
      .get(`/api/requirement-types/${invalidId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(404)

    expect(response.body.message).toMatch(/not found/i)
  })

  test('Should return 401 if the user is unauthorized', async () => {
    const data = generateRequirementTypeData()
    const creationResponse = await api
      .post('/api/requirement-types')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(data)
      .expect(201)
    const createdId = creationResponse.body.requirementType.id
    const response = await api
      .get(`/api/requirement-types/${createdId}`)
      .expect(401)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })
})

describe('GET /api/requirement-types/search/name', () => {
  test('Should return a requirement type that matches the given name', async () => {
    const data = generateRequirementTypeData({ name: 'Water Regulation' })

    await api
      .post('/api/requirement-types')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(data)
      .expect(201)

    const response = await api
      .get('/api/requirement-types/search/name')
      .query({ name: 'Water Regulation' })
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)

    const types = response.body.requirementTypes
    expect(Array.isArray(types)).toBe(true)
    expect(types.some((t) => t.name === 'Water Regulation')).toBe(true)
  })

  test('Should return an empty array when no requirement types match the given name', async () => {
    const response = await api
      .get('/api/requirement-types/search/name')
      .query({ name: 'NonExistentName' })
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)

    expect(response.body.requirementTypes).toEqual([])
  })

  test('Should return 401 if the user is unauthorized', async () => {
    const response = await api
      .get('/api/requirement-types/search/name')
      .query({ name: 'Water Regulation' })
      .expect(401)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })
})

describe('GET /api/requirement-types/search/description', () => {
  test('Should return a requirement type that matches the given description', async () => {
    const data = generateRequirementTypeData({
      description: 'Regulates water treatment'
    })

    await api
      .post('/api/requirement-types')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(data)
      .expect(201)

    const response = await api
      .get('/api/requirement-types/search/description')
      .query({ description: 'Regulates water treatment' })
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)

    const types = response.body.requirementTypes
    expect(Array.isArray(types)).toBe(true)
    expect(
      types.some((t) => t.description.includes('Regulates water treatment'))
    ).toBe(true)
  })

  test('Should return an empty array when no requirement types match the given description', async () => {
    const response = await api
      .get('/api/requirement-types/search/description')
      .query({ description: 'NonExistentDescription' })
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)

    expect(response.body.requirementTypes).toEqual([])
  })

  test('Should return 401 if the user is unauthorized', async () => {
    const response = await api
      .get('/api/requirement-types/search/description')
      .query({ description: 'Regulates water treatment' })
      .expect(401)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })
})

describe('GET /api/requirement-types/search/classification', () => {
  test('Should return a requirement type that matches the given classification', async () => {
    const data = generateRequirementTypeData({
      classification: 'Environmental'
    })

    await api
      .post('/api/requirement-types')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(data)
      .expect(201)

    const response = await api
      .get('/api/requirement-types/search/classification')
      .query({ classification: 'Environmental' })
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)

    const types = response.body.requirementTypes
    expect(Array.isArray(types)).toBe(true)
    expect(types.some((t) => t.classification === 'Environmental')).toBe(true)
  })

  test('Should return an empty array when no requirement types match the given classification', async () => {
    const response = await api
      .get('/api/requirement-types/search/classification')
      .query({ classification: 'NonExistentClassification' })
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)

    expect(response.body.requirementTypes).toEqual([])
  })

  test('Should return 401 if the user is unauthorized', async () => {
    const response = await api
      .get('/api/requirement-types/search/classification')
      .query({ classification: 'Environmental' })
      .expect(401)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })
})

describe('PATCH /api/requirement-types/:id', () => {
  test('Should successfully update a requirement type', async () => {
    const initialData = generateRequirementTypeData({ name: 'Initial Name' })

    const creationResponse = await api
      .post('/api/requirement-types')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(initialData)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    const id = creationResponse.body.requirementType.id
    const updatedData = generateRequirementTypeData({ name: 'Updated Name' })

    const updateResponse = await api
      .patch(`/api/requirement-types/${id}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(updatedData)
      .expect(200)
      .expect('Content-Type', /application\/json/)

    expect(updateResponse.body.requirementType).toMatchObject({
      id,
      ...updatedData
    })
  })

  test('Should return 400 if update data is invalid', async () => {
    const data = generateRequirementTypeData({ name: 'Valid Name' })

    const creationResponse = await api
      .post('/api/requirement-types')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(data)
      .expect(201)

    const id = creationResponse.body.requirementType.id

    const invalidData = { name: '', description: '', classification: '' }

    const response = await api
      .patch(`/api/requirement-types/${id}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(invalidData)
      .expect(400)
      .expect('Content-Type', /application\/json/)

    expect(response.body.message).toBe('Validation failed')
    expect(Array.isArray(response.body.errors)).toBe(true)
    expect(response.body.errors.length).toBeGreaterThan(0)
    response.body.errors.forEach((error) => {
      expect(error).toHaveProperty('field')
      expect(error).toHaveProperty('message')
    })
  })

  test('Should return 409 if updated name already exists in another requirement type', async () => {
    const data1 = generateRequirementTypeData({ name: 'Name A' })
    const data2 = generateRequirementTypeData({ name: 'Name B' })

    await api
      .post('/api/requirement-types')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(data1)
      .expect(201)

    const response2 = await api
      .post('/api/requirement-types')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(data2)
      .expect(201)

    const idToUpdate = response2.body.requirementType.id

    const response = await api
      .patch(`/api/requirement-types/${idToUpdate}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ ...data2, name: 'Name A' })
      .expect(409)
      .expect('Content-Type', /application\/json/)

    expect(response.body.message).toMatch(/already exists/i)
  })

  test('Should return 404 if requirement type with given ID does not exist', async () => {
    const data = generateRequirementTypeData({ name: 'NonExistent' })
    const invalidId = -9999
    const response = await api
      .patch(`/api/requirement-types/${invalidId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(data)
      .expect(404)
      .expect('Content-Type', /application\/json/)

    expect(response.body.message).toMatch(/not found/i)
  })

  test('Should return 401 if the user is unauthorized', async () => {
    const data = generateRequirementTypeData({ name: 'Unauthorized' })

    const creationResponse = await api
      .post('/api/requirement-types')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(data)
      .expect(201)

    const id = creationResponse.body.requirementType.id

    const response = await api
      .patch(`/api/requirement-types/${id}`)
      .send(data)
      .expect(401)
      .expect('Content-Type', /application\/json/)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })
})

describe('DELETE /api/requirement-types/:id', () => {
  test('Should successfully delete a requirement type', async () => {
    const data = generateRequirementTypeData({ name: 'Deletable Type' })

    const creationResponse = await api
      .post('/api/requirement-types')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(data)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    const id = creationResponse.body.requirementType.id

    await api
      .delete(`/api/requirement-types/${id}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(204)

    const fetchResponse = await api
      .get(`/api/requirement-types/${id}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(404)

    expect(fetchResponse.body.message).toMatch(/not found/i)
  })

  test('Should return 404 if requirement type with given ID does not exist', async () => {
    const invalidId = -9999

    const response = await api
      .delete(`/api/requirement-types/${invalidId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(404)
      .expect('Content-Type', /application\/json/)

    expect(response.body.message).toMatch(/not found/i)
  })

  test('Should return 409 if the requirement type is associated with requirement identifications', async () => {
    const requirementType = generateRequirementTypeData({
      name: 'Conflict Type'
    })
    const creationResponse = await api
      .post('/api/requirement-types')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(requirementType)
      .expect(201)

    const id = creationResponse.body.requirementType.id

    jest
      .spyOn(RequirementTypesRepository, 'checkReqIdentificationAssociations')
      .mockResolvedValueOnce({ isAssociatedToReqIdentifications: true })

    const response = await api
      .delete(`/api/requirement-types/${id}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(409)
      .expect('Content-Type', /application\/json/)

    expect(response.body.message).toMatch(
      /associated with one or more requirement identifications/i
    )
  })

  test('Should return 401 if the user is unauthorized', async () => {
    const data = generateRequirementTypeData({ name: 'Unauthorized Delete' })

    const creationResponse = await api
      .post('/api/requirement-types')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(data)
      .expect(201)

    const id = creationResponse.body.requirementType.id

    const response = await api
      .delete(`/api/requirement-types/${id}`)
      .expect(401)
      .expect('Content-Type', /application\/json/)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })
})

describe('DELETE /api/requirement-types/delete/batch', () => {
  test('Should successfully delete multiple requirement types', async () => {
    const type1 = generateRequirementTypeData({ name: 'Batch Type 1' })
    const type2 = generateRequirementTypeData({ name: 'Batch Type 2' })
    const type3 = generateRequirementTypeData({ name: 'Batch Type 3' })

    const response1 = await api
      .post('/api/requirement-types')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(type1)
      .expect(201)

    const response2 = await api
      .post('/api/requirement-types')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(type2)
      .expect(201)

    const response3 = await api
      .post('/api/requirement-types')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(type3)
      .expect(201)

    const idsToDelete = [
      response1.body.requirementType.id,
      response2.body.requirementType.id,
      response3.body.requirementType.id
    ]

    await api
      .delete('/api/requirement-types/delete/batch')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ requirementTypesIds: idsToDelete })
      .expect(204)

    for (const id of idsToDelete) {
      const res = await api
        .get(`/api/requirement-types/${id}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(404)

      expect(res.body.message).toMatch(/not found/i)
    }
  })

  test('Should return 404 if any of the provided IDs do not exist', async () => {
    const validType = generateRequirementTypeData({ name: 'Batch Valid' })

    const response = await api
      .post('/api/requirement-types')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(validType)
      .expect(201)

    const validId = response.body.requirementType.id
    const invalidId = -9999

    const deleteResponse = await api
      .delete('/api/requirement-types/delete/batch')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ requirementTypesIds: [validId, invalidId] })
      .expect(404)
      .expect('Content-Type', /application\/json/)

    expect(deleteResponse.body.message).toMatch(/not found/i)
    expect(deleteResponse.body.errors).toHaveProperty('notFoundIds')
    expect(deleteResponse.body.errors.notFoundIds).toContain(invalidId)
  })

  test('Should return 400 if no IDs are provided or invalid format', async () => {
    const invalidCases = [
      {},
      { requirementTypesIds: null },
      { requirementTypesIds: 'not-an-array' },
      { requirementTypesIds: [] }
    ]

    for (const body of invalidCases) {
      const response = await api
        .delete('/api/requirement-types/delete/batch')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(body)
        .expect(400)

      expect(response.body.message).toMatch(/missing required field/i)
    }
  })

  test('Should return 409 if one or more requirement types are associated with requirement identifications', async () => {
    const type1 = generateRequirementTypeData({ name: 'Associated Type 1' })
    const type2 = generateRequirementTypeData({ name: 'Free Type 2' })

    const res1 = await api
      .post('/api/requirement-types')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(type1)
      .expect(201)

    const res2 = await api
      .post('/api/requirement-types')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(type2)
      .expect(201)

    const typeId1 = res1.body.requirementType.id
    const typeId2 = res2.body.requirementType.id

    jest
      .spyOn(
        RequirementTypesRepository,
        'checkReqIdentificationAssociationsBatch'
      )
      .mockResolvedValueOnce([
        {
          id: typeId1,
          name: type1.name,
          isAssociatedToReqIdentifications: true
        },
        {
          id: typeId2,
          name: type2.name,
          isAssociatedToReqIdentifications: false
        }
      ])

    const response = await api
      .delete('/api/requirement-types/delete/batch')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ requirementTypesIds: [typeId1, typeId2] })
      .expect(409)
      .expect('Content-Type', /application\/json/)

    expect(response.body.message).toMatch(
      /associated with requirement identifications/i
    )
    expect(response.body.errors.requirementTypes).toEqual([
      {
        id: typeId1,
        name: type1.name
      }
    ])
  })

  test('Should return 401 if the user is unauthorized', async () => {
    const type = generateRequirementTypeData({ name: 'Unauthorized Batch' })

    const creationResponse = await api
      .post('/api/requirement-types')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(type)
      .expect(201)

    const id = creationResponse.body.requirementType.id

    const response = await api
      .delete('/api/requirement-types/delete/batch')
      .send({ requirementTypesIds: [id] })
      .expect(401)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })
})
