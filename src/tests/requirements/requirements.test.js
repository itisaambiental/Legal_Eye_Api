/* eslint-disable no-undef */
import { api } from '../../config/test.config.js'
import UserRepository from '../../repositories/User.repository.js'
import RequirementRepository from '../../repositories/Requirements.repository.js'
import SubjectsRepository from '../../repositories/Subject.repository.js'
import AspectsRepository from '../../repositories/Aspects.repository.js'
import generateRequirementData from '../../utils/generateRequirementData.js'

import {
  ADMIN_PASSWORD_TEST,
  ADMIN_GMAIL
} from '../../config/variables.config.js'

const subjectName = 'Seguridad & Higiene'
const aspectsToCreate = ['Organizacional', 'Técnico', 'Legal']
let tokenAdmin
let createdSubjectId
const createdAspectIds = []

beforeAll(async () => {
  await RequirementRepository.deleteAll()
  await SubjectsRepository.deleteAll()
  await AspectsRepository.deleteAll()
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
  const subjectResponse = await api
    .post('/api/subjects')
    .set('Authorization', `Bearer ${tokenAdmin}`)
    .send({ subjectName })
    .expect(201)
    .expect('Content-Type', /application\/json/)

  createdSubjectId = subjectResponse.body.subject.id
  for (const aspectName of aspectsToCreate) {
    const aspectResponse = await api
      .post(`/api/subjects/${createdSubjectId}/aspects`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ aspectName })
      .expect(201)
      .expect('Content-Type', /application\/json/)

    const { aspect } = aspectResponse.body
    createdAspectIds.push(aspect.id)
  }
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('Create a requirement', () => {
  beforeEach(async () => {
    await RequirementRepository.deleteAll()
  })

  test('Should successfully create a requirement', async () => {
    const requirementData = generateRequirementData({
      subjectId: String(createdSubjectId),
      aspectId: String(createdAspectIds[0])
    })

    const response = await api
      .post('/api/requirements')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(requirementData)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    const { requirement } = response.body
    expect(requirement).toMatchObject({
      requirement_number: requirementData.requirementNumber,
      requirement_name: requirementData.requirementName,
      mandatory_description: requirementData.mandatoryDescription,
      complementary_description: requirementData.complementaryDescription,
      mandatory_sentences: requirementData.mandatorySentences,
      complementary_sentences: requirementData.complementarySentences,
      mandatory_keywords: requirementData.mandatoryKeywords,
      complementary_keywords: requirementData.complementaryKeywords,
      condition: requirementData.condition,
      evidence: requirementData.evidence,
      periodicity: requirementData.periodicity,
      requirement_type: requirementData.requirementType,
      jurisdiction: requirementData.jurisdiction,
      state: null,
      municipality: null,
      subject: {
        subject_id: createdSubjectId,
        subject_name: subjectName
      },
      aspect: {
        aspect_id: createdAspectIds[0],
        aspect_name: aspectsToCreate[0]
      }
    })
  })

  test('Should return 404 if Subject ID is invalid', async () => {
    const requirementData = generateRequirementData({
      subjectId: '-1',
      aspectId: String(createdAspectIds[0])
    })

    const response = await api
      .post('/api/requirements')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(requirementData)
      .expect(404)

    expect(response.body.message).toMatch(/Subject not found/i)
  })

  test('Should return 404 if Aspect ID is invalid', async () => {
    const requirementData = generateRequirementData({
      subjectId: String(createdSubjectId),
      aspectId: '-1'
    })

    const response = await api
      .post('/api/requirements')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(requirementData)
      .expect(404)

    expect(response.body.message).toMatch(/Aspect not found/i)
  })
  test('Should return 409 if requirement number already exists', async () => {
    const requirementData = generateRequirementData({
      subjectId: String(createdSubjectId),
      aspectId: String(createdAspectIds[0]),
      requirementNumber: 'REQ-001'
    })
    await api
      .post('/api/requirements')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(requirementData)
      .expect(201)
    const response = await api
      .post('/api/requirements')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(requirementData)
      .expect(409)

    expect(response.body.message).toMatch(/Requirement number already exists/i)
  })

  test('Should return 409 if requirement name already exists', async () => {
    const requirementData = generateRequirementData({
      subjectId: String(createdSubjectId),
      aspectId: String(createdAspectIds[0]),
      requirementName: 'Test Requirement Name',
      requirementNumber: 'REQ-001'
    })
    await api
      .post('/api/requirements')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(requirementData)
      .expect(201)

    const duplicateRequirementData = {
      ...requirementData,
      requirementNumber: 'REQ-002'
    }
    const response = await api
      .post('/api/requirements')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(duplicateRequirementData)
      .expect(409)

    expect(response.body.message).toMatch(/Requirement name already exists/i)
  })

  test('Should return 401 if the user is unauthorized', async () => {
    const requirementData = generateRequirementData({
      subjectId: String(createdSubjectId),
      aspectId: String(createdAspectIds[0])
    })

    const response = await api
      .post('/api/requirements')
      .send(requirementData)
      .expect(401)
      .expect('Content-Type', /application\/json/)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })

  describe('Validation Tests', () => {
    test('Should return 400 if requirementNumber exceeds max length', async () => {
      const longRequirementNumber = 'A'.repeat(256)
      const requirementData = generateRequirementData({
        subjectId: String(createdSubjectId),
        aspectId: String(createdAspectIds[0]),
        requirementNumber: longRequirementNumber
      })

      const response = await api
        .post('/api/requirements')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(requirementData)
        .expect(400)

      expect(response.body.message).toBe('Validation failed')
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          { field: 'requirementNumber', message: expect.stringMatching(/exceed.*255 characters/i) }
        ])
      )
    })

    test('Should return 400 if requirementName exceeds max length', async () => {
      const longRequirementName = 'A'.repeat(256)
      const requirementData = generateRequirementData({
        subjectId: String(createdSubjectId),
        aspectId: String(createdAspectIds[0]),
        requirementName: longRequirementName
      })

      const response = await api
        .post('/api/requirements')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(requirementData)
        .expect(400)

      expect(response.body.message).toMatch(/Validation failed/i)
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          { field: 'requirementName', message: expect.stringMatching(/exceed.*255 characters/i) }
        ])
      )
    })

    test('Should return 400 if subjectId is not a valid number', async () => {
      const requirementData = generateRequirementData({
        subjectId: 'invalid-number',
        aspectId: String(createdAspectIds[0])
      })

      const response = await api
        .post('/api/requirements')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(requirementData)
        .expect(400)

      expect(response.body.message).toMatch(/Validation failed/i)
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          { field: 'subjectId', message: expect.stringMatching(/must be a valid number/i) }
        ])
      )
    })

    test('Should return 400 if aspectId is not a valid number', async () => {
      const requirementData = generateRequirementData({
        subjectId: String(createdSubjectId),
        aspectId: 'invalid-number'
      })

      const response = await api
        .post('/api/requirements')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(requirementData)
        .expect(400)

      expect(response.body.message).toMatch(/Validation failed/i)
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          { field: 'aspectId', message: expect.stringMatching(/must be a valid number/i) }
        ])
      )
    })

    test('Should return 400 if mandatoryDescription is missing', async () => {
      const requirementData = generateRequirementData({
        subjectId: String(createdSubjectId),
        aspectId: String(createdAspectIds[0]),
        mandatoryDescription: ''
      })

      const response = await api
        .post('/api/requirements')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(requirementData)
        .expect(400)

      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          { field: 'mandatoryDescription', message: expect.stringMatching(/The mandatory description is required/i) }
        ])
      )
    })

    test('Should return 400 if complementaryDescription is missing', async () => {
      const requirementData = generateRequirementData({
        subjectId: String(createdSubjectId),
        aspectId: String(createdAspectIds[0]),
        complementaryDescription: ''
      })

      const response = await api
        .post('/api/requirements')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(requirementData)
        .expect(400)

      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          { field: 'complementaryDescription', message: expect.stringMatching(/The complementary description is required/i) }
        ])
      )
    })

    test('Should return 400 if mandatorySentences is missing', async () => {
      const requirementData = generateRequirementData({
        subjectId: String(createdSubjectId),
        aspectId: String(createdAspectIds[0]),
        mandatorySentences: ''
      })

      const response = await api
        .post('/api/requirements')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(requirementData)
        .expect(400)

      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          { field: 'mandatorySentences', message: expect.stringMatching(/The mandatory sentences are required/i) }
        ])
      )
    })

    test('Should return 400 if complementarySentences is missing', async () => {
      const requirementData = generateRequirementData({
        subjectId: String(createdSubjectId),
        aspectId: String(createdAspectIds[0]),
        complementarySentences: ''
      })

      const response = await api
        .post('/api/requirements')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(requirementData)
        .expect(400)

      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          { field: 'complementarySentences', message: expect.stringMatching(/The complementary sentences are required/i) }
        ])
      )
    })

    test('Should return 400 if mandatoryKeywords is missing', async () => {
      const requirementData = generateRequirementData({
        subjectId: String(createdSubjectId),
        aspectId: String(createdAspectIds[0]),
        mandatoryKeywords: ''
      })

      const response = await api
        .post('/api/requirements')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(requirementData)
        .expect(400)

      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          { field: 'mandatoryKeywords', message: expect.stringMatching(/The mandatory keywords are required/i) }
        ])
      )
    })

    test('Should return 400 if complementaryKeywords is missing', async () => {
      const requirementData = generateRequirementData({
        subjectId: String(createdSubjectId),
        aspectId: String(createdAspectIds[0]),
        complementaryKeywords: ''
      })

      const response = await api
        .post('/api/requirements')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(requirementData)
        .expect(400)

      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          { field: 'complementaryKeywords', message: expect.stringMatching(/The complementary keywords are required/i) }
        ])
      )
    })

    test('Should return 400 if condition is not a valid value', async () => {
      const requirementData = generateRequirementData({
        subjectId: String(createdSubjectId),
        aspectId: String(createdAspectIds[0]),
        condition: 'Invalid Condition'
      })

      const response = await api
        .post('/api/requirements')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(requirementData)
        .expect(400)

      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          { field: 'condition', message: expect.stringMatching(/must be one of the following: Crítica, Operativa, Recomendación, Pendiente/i) }
        ])
      )
    })

    test('Should return 400 if evidence is not a valid value', async () => {
      const requirementData = generateRequirementData({
        subjectId: String(createdSubjectId),
        aspectId: String(createdAspectIds[0]),
        evidence: 'Invalid Evidence'
      })

      const response = await api
        .post('/api/requirements')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(requirementData)
        .expect(400)

      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          { field: 'evidence', message: expect.stringMatching(/must be one of the following: Tramite, Registro, Específico, Documento/i) }
        ])
      )
    })

    test('Should return 400 if periodicity is not a valid value', async () => {
      const requirementData = generateRequirementData({
        subjectId: String(createdSubjectId),
        aspectId: String(createdAspectIds[0]),
        periodicity: 'Invalid Periodicity'
      })

      const response = await api
        .post('/api/requirements')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(requirementData)
        .expect(400)

      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          { field: 'periodicity', message: expect.stringMatching(/must be one of the following: Anual, 2 años, Por evento, Única vez/i) }
        ])
      )
    })

    test('Should return 400 if requirementType is not a valid value', async () => {
      const requirementData = generateRequirementData({
        subjectId: String(createdSubjectId),
        aspectId: String(createdAspectIds[0]),
        requirementType: 'Invalid Type'
      })

      const response = await api
        .post('/api/requirements')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(requirementData)
        .expect(400)

      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          { field: 'requirementType', message: expect.stringMatching(/must be one of the allowed options: Identificación Estatal, Identificación Federal, Identificación Local, Requerimiento Compuesto, Requerimiento Compuesto e Identificación, Requerimiento Estatal, Requerimiento Local/i) }
        ])
      )
    })

    test('Should return 400 if state is provided for Federal jurisdiction', async () => {
      const requirementData = generateRequirementData({
        subjectId: String(createdSubjectId),
        aspectId: String(createdAspectIds[0]),
        jurisdiction: 'Federal',
        state: 'Invalid State'
      })

      const response = await api
        .post('/api/requirements')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(requirementData)
        .expect(400)

      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          { field: 'state', message: expect.stringMatching(/State should not be provided for Federal jurisdiction/i) }
        ])
      )
    })

    test('Should return 400 if municipality is provided for Federal jurisdiction', async () => {
      const requirementData = generateRequirementData({
        subjectId: String(createdSubjectId),
        aspectId: String(createdAspectIds[0]),
        jurisdiction: 'Federal',
        municipality: 'Invalid Municipality'
      })

      const response = await api
        .post('/api/requirements')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(requirementData)
        .expect(400)

      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          { field: 'municipality', message: expect.stringMatching(/Municipality should not be provided for Federal jurisdiction/i) }
        ])
      )
    })

    test('Should return 400 if state is missing for Estatal jurisdiction', async () => {
      const requirementData = generateRequirementData({
        subjectId: String(createdSubjectId),
        aspectId: String(createdAspectIds[0]),
        jurisdiction: 'Estatal'
      })

      const response = await api
        .post('/api/requirements')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(requirementData)
        .expect(400)

      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          { field: 'state', message: expect.stringMatching(/State must be provided for Estatal jurisdiction/i) }
        ])
      )
    })

    test('Should return 400 if municipality is provided for Estatal jurisdiction', async () => {
      const requirementData = generateRequirementData({
        subjectId: String(createdSubjectId),
        aspectId: String(createdAspectIds[0]),
        jurisdiction: 'Estatal',
        state: 'Valid State',
        municipality: 'Invalid Municipality'
      })

      const response = await api
        .post('/api/requirements')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(requirementData)
        .expect(400)

      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          { field: 'municipality', message: expect.stringMatching(/Municipality should not be provided for Estatal jurisdiction/i) }
        ])
      )
    })

    test('Should return 400 if state is missing for Local jurisdiction', async () => {
      const requirementData = generateRequirementData({
        subjectId: String(createdSubjectId),
        aspectId: String(createdAspectIds[0]),
        jurisdiction: 'Local',
        municipality: 'Valid Municipality'
      })

      const response = await api
        .post('/api/requirements')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(requirementData)
        .expect(400)

      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          { field: 'state', message: expect.stringMatching(/State must be provided for Local jurisdiction/i) }
        ])
      )
    })

    test('Should return 400 if municipality is missing for Local jurisdiction', async () => {
      const requirementData = generateRequirementData({
        subjectId: String(createdSubjectId),
        aspectId: String(createdAspectIds[0]),
        jurisdiction: 'Local',
        state: 'Valid State'
      })

      const response = await api
        .post('/api/requirements')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(requirementData)
        .expect(400)

      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          { field: 'municipality', message: expect.stringMatching(/Municipality must be provided for Local jurisdiction/i) }
        ])
      )
    })
  })
})
describe('Get All Requirements', () => {
  beforeEach(async () => {
    await RequirementRepository.deleteAll()
  })

  test('Should return an empty array when no requirements exist', async () => {
    const response = await api
      .get('/api/requirements')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)
      .expect('Content-Type', /application\/json/)

    expect(response.body.requirements).toBeInstanceOf(Array)
    expect(response.body.requirements).toHaveLength(0)
  })

  test('Should return all requirements after creating one', async () => {
    const requirementData = generateRequirementData({
      subjectId: String(createdSubjectId),
      aspectId: String(createdAspectIds[0])
    })

    const createResponse = await api
      .post('/api/requirements')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(requirementData)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    const { requirement: createdRequirement } = createResponse.body

    const response = await api
      .get('/api/requirements')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const { requirements } = response.body

    expect(requirements).toBeInstanceOf(Array)
    expect(requirements).toHaveLength(1)
    expect(requirements[0]).toMatchObject({
      id: createdRequirement.id,
      requirement_number: createdRequirement.requirement_number,
      requirement_name: createdRequirement.requirement_name,
      mandatory_description: createdRequirement.mandatory_description,
      complementary_description: createdRequirement.complementary_description,
      mandatory_sentences: createdRequirement.mandatory_sentences,
      complementary_sentences: createdRequirement.complementary_sentences,
      mandatory_keywords: createdRequirement.mandatory_keywords,
      complementary_keywords: createdRequirement.complementary_keywords,
      condition: createdRequirement.condition,
      evidence: createdRequirement.evidence,
      periodicity: createdRequirement.periodicity,
      requirement_type: createdRequirement.requirement_type,
      jurisdiction: createdRequirement.jurisdiction,
      state: createdRequirement.state,
      municipality: createdRequirement.municipality,
      subject: expect.objectContaining({
        subject_id: createdSubjectId,
        subject_name: subjectName
      }),
      aspect: expect.objectContaining({
        aspect_id: createdAspectIds[0],
        aspect_name: aspectsToCreate[0]
      })
    })
  })

  test('Should return 401 if user is unauthorized', async () => {
    const response = await api
      .get('/api/requirements')
      .expect(401)
      .expect('Content-Type', /application\/json/)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })
})
describe('Get Requirement By ID', () => {
  let createdRequirement

  beforeEach(async () => {
    await RequirementRepository.deleteAll()

    const requirementData = generateRequirementData({
      subjectId: String(createdSubjectId),
      aspectId: String(createdAspectIds[0])
    })

    const response = await api
      .post('/api/requirements')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(requirementData)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    createdRequirement = response.body.requirement
  })

  test('Should successfully retrieve a requirement by its ID', async () => {
    const response = await api
      .get(`/api/requirement/${createdRequirement.id}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const { requirement } = response.body

    expect(requirement).toMatchObject({
      id: createdRequirement.id,
      requirement_number: createdRequirement.requirement_number,
      requirement_name: createdRequirement.requirement_name,
      mandatory_description: createdRequirement.mandatory_description,
      complementary_description: createdRequirement.complementary_description,
      mandatory_sentences: createdRequirement.mandatory_sentences,
      complementary_sentences: createdRequirement.complementary_sentences,
      mandatory_keywords: createdRequirement.mandatory_keywords,
      complementary_keywords: createdRequirement.complementary_keywords,
      condition: createdRequirement.condition,
      evidence: createdRequirement.evidence,
      periodicity: createdRequirement.periodicity,
      requirement_type: createdRequirement.requirement_type,
      jurisdiction: createdRequirement.jurisdiction,
      state: createdRequirement.state,
      municipality: createdRequirement.municipality,
      subject: expect.objectContaining({
        subject_id: createdSubjectId,
        subject_name: subjectName
      }),
      aspect: expect.objectContaining({
        aspect_id: createdAspectIds[0],
        aspect_name: aspectsToCreate[0]
      })
    })
  })

  test('Should return 404 if the requirement does not exist', async () => {
    const nonExistentId = '-1'
    const response = await api
      .get(`/api/requirement/${nonExistentId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(404)
      .expect('Content-Type', /application\/json/)

    expect(response.body.message).toMatch(/Requirement not found/i)
  })

  test('Should return 401 if user is unauthorized', async () => {
    const response = await api
      .get(`/api/requirement/${createdRequirement.id}`)
      .expect(401)
      .expect('Content-Type', /application\/json/)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })
})

describe('Get Requirements By Number', () => {
  let createdRequirement
  const testRequirementNumber = 'REQ-SEARCH-001'
  beforeEach(async () => {
    await RequirementRepository.deleteAll()
  })

  test('Should return an empty array when no requirements match the given number', async () => {
    const response = await api
      .get('/api/requirements/search/number')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .query({ number: testRequirementNumber })
      .expect(200)
      .expect('Content-Type', /application\/json/)

    expect(response.body.requirements).toBeInstanceOf(Array)
    expect(response.body.requirements).toHaveLength(0)
  })

  test('Should return the requirement after creating one with the given number', async () => {
    const requirementData = generateRequirementData({
      subjectId: String(createdSubjectId),
      aspectId: String(createdAspectIds[0]),
      requirementNumber: testRequirementNumber
    })

    const createResponse = await api
      .post('/api/requirements')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(requirementData)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    createdRequirement = createResponse.body.requirement

    const response = await api
      .get('/api/requirements/search/number')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .query({ number: testRequirementNumber })
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const { requirements } = response.body

    expect(requirements).toBeInstanceOf(Array)
    expect(requirements).toHaveLength(1)
    expect(requirements[0]).toMatchObject({
      id: createdRequirement.id,
      requirement_number: testRequirementNumber,
      requirement_name: createdRequirement.requirement_name,
      mandatory_description: createdRequirement.mandatory_description,
      complementary_description: createdRequirement.complementary_description,
      mandatory_sentences: createdRequirement.mandatory_sentences,
      complementary_sentences: createdRequirement.complementary_sentences,
      mandatory_keywords: createdRequirement.mandatory_keywords,
      complementary_keywords: createdRequirement.complementary_keywords,
      condition: createdRequirement.condition,
      evidence: createdRequirement.evidence,
      periodicity: createdRequirement.periodicity,
      requirement_type: createdRequirement.requirement_type,
      jurisdiction: createdRequirement.jurisdiction,
      state: createdRequirement.state,
      municipality: createdRequirement.municipality,
      subject: expect.objectContaining({
        subject_id: createdSubjectId,
        subject_name: subjectName
      }),
      aspect: expect.objectContaining({
        aspect_id: createdAspectIds[0],
        aspect_name: aspectsToCreate[0]
      })
    })
  })

  test('Should return 401 if user is unauthorized', async () => {
    const response = await api
      .get('/api/requirements/search/number')
      .query({ number: testRequirementNumber })
      .expect(401)
      .expect('Content-Type', /application\/json/)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })
})

describe('Get Requirements By Name', () => {
  let createdRequirement
  const testRequirementName = 'Test Requirement Search'

  beforeEach(async () => {
    await RequirementRepository.deleteAll()
  })

  test('Should return an empty array when no requirements match the given name', async () => {
    const response = await api
      .get('/api/requirements/search/name')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .query({ name: testRequirementName })
      .expect(200)
      .expect('Content-Type', /application\/json/)

    expect(response.body.requirements).toBeInstanceOf(Array)
    expect(response.body.requirements).toHaveLength(0)
  })

  test('Should return the requirement after creating one with the given name', async () => {
    const requirementData = generateRequirementData({
      subjectId: String(createdSubjectId),
      aspectId: String(createdAspectIds[0]),
      requirementName: testRequirementName
    })

    const createResponse = await api
      .post('/api/requirements')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(requirementData)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    createdRequirement = createResponse.body.requirement

    const response = await api
      .get('/api/requirements/search/name')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .query({ name: testRequirementName })
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const { requirements } = response.body

    expect(requirements).toBeInstanceOf(Array)
    expect(requirements).toHaveLength(1)
    expect(requirements[0]).toMatchObject({
      id: createdRequirement.id,
      requirement_number: createdRequirement.requirement_number,
      requirement_name: testRequirementName,
      mandatory_description: createdRequirement.mandatory_description,
      complementary_description: createdRequirement.complementary_description,
      mandatory_sentences: createdRequirement.mandatory_sentences,
      complementary_sentences: createdRequirement.complementary_sentences,
      mandatory_keywords: createdRequirement.mandatory_keywords,
      complementary_keywords: createdRequirement.complementary_keywords,
      condition: createdRequirement.condition,
      evidence: createdRequirement.evidence,
      periodicity: createdRequirement.periodicity,
      requirement_type: createdRequirement.requirement_type,
      jurisdiction: createdRequirement.jurisdiction,
      state: createdRequirement.state,
      municipality: createdRequirement.municipality,
      subject: expect.objectContaining({
        subject_id: createdSubjectId,
        subject_name: subjectName
      }),
      aspect: expect.objectContaining({
        aspect_id: createdAspectIds[0],
        aspect_name: aspectsToCreate[0]
      })
    })
  })

  test('Should return 401 if user is unauthorized', async () => {
    const response = await api
      .get('/api/requirements/search/name')
      .query({ name: testRequirementName })
      .expect(401)
      .expect('Content-Type', /application\/json/)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })
})

describe('Get Requirements By Subject', () => {
  let createdRequirement

  beforeEach(async () => {
    await RequirementRepository.deleteAll()
  })

  test('Should return an empty array when no requirements exist for the given subject', async () => {
    const response = await api
      .get(`/api/requirements/subject/${createdSubjectId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)
      .expect('Content-Type', /application\/json/)

    expect(response.body.requirements).toBeInstanceOf(Array)
    expect(response.body.requirements).toHaveLength(0)
  })

  test('Should return all requirements after creating one for the given subject', async () => {
    const requirementData = generateRequirementData({
      subjectId: String(createdSubjectId),
      aspectId: String(createdAspectIds[0])
    })

    const createResponse = await api
      .post('/api/requirements')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(requirementData)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    createdRequirement = createResponse.body.requirement

    const response = await api
      .get(`/api/requirements/subject/${createdSubjectId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const { requirements } = response.body

    expect(requirements).toBeInstanceOf(Array)
    expect(requirements).toHaveLength(1)
    expect(requirements[0]).toMatchObject({
      id: createdRequirement.id,
      requirement_number: createdRequirement.requirement_number,
      requirement_name: createdRequirement.requirement_name,
      mandatory_description: createdRequirement.mandatory_description,
      complementary_description: createdRequirement.complementary_description,
      mandatory_sentences: createdRequirement.mandatory_sentences,
      complementary_sentences: createdRequirement.complementary_sentences,
      mandatory_keywords: createdRequirement.mandatory_keywords,
      complementary_keywords: createdRequirement.complementary_keywords,
      condition: createdRequirement.condition,
      evidence: createdRequirement.evidence,
      periodicity: createdRequirement.periodicity,
      requirement_type: createdRequirement.requirement_type,
      jurisdiction: createdRequirement.jurisdiction,
      state: createdRequirement.state,
      municipality: createdRequirement.municipality,
      subject: expect.objectContaining({
        subject_id: createdSubjectId,
        subject_name: subjectName
      }),
      aspect: expect.objectContaining({
        aspect_id: createdAspectIds[0],
        aspect_name: aspectsToCreate[0]
      })
    })
  })

  test('Should return 404 if the subject does not exist', async () => {
    const nonExistentSubjectId = '-1'

    const response = await api
      .get(`/api/requirements/subject/${nonExistentSubjectId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(404)
      .expect('Content-Type', /application\/json/)

    expect(response.body.message).toMatch(/Subject not found/i)
  })

  test('Should return 401 if user is unauthorized', async () => {
    const response = await api
      .get(`/api/requirements/subject/${createdSubjectId}`)
      .expect(401)
      .expect('Content-Type', /application\/json/)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })
})

describe('Get Requirements By Subject And Aspects', () => {
  let createdRequirement

  beforeEach(async () => {
    await RequirementRepository.deleteAll()
  })

  test('Should return an empty array when no requirements exist for the given subject and aspects', async () => {
    const response = await api
      .get(`/api/requirements/subject/${createdSubjectId}/aspects`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .query({ aspectIds: createdAspectIds })
      .expect(200)
      .expect('Content-Type', /application\/json/)

    expect(response.body.requirements).toBeInstanceOf(Array)
    expect(response.body.requirements).toHaveLength(0)
  })

  test('Should return all requirements after creating one for the given subject and aspect', async () => {
    const requirementData = generateRequirementData({
      subjectId: String(createdSubjectId),
      aspectId: String(createdAspectIds[0])
    })

    const createResponse = await api
      .post('/api/requirements')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(requirementData)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    createdRequirement = createResponse.body.requirement

    const response = await api
      .get(`/api/requirements/subject/${createdSubjectId}/aspects`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .query({ aspectIds: [createdAspectIds[0]] })
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const { requirements } = response.body

    expect(requirements).toBeInstanceOf(Array)
    expect(requirements).toHaveLength(1)
    expect(requirements[0]).toMatchObject({
      id: createdRequirement.id,
      requirement_number: createdRequirement.requirement_number,
      requirement_name: createdRequirement.requirement_name,
      mandatory_description: createdRequirement.mandatory_description,
      complementary_description: createdRequirement.complementary_description,
      mandatory_sentences: createdRequirement.mandatory_sentences,
      complementary_sentences: createdRequirement.complementary_sentences,
      mandatory_keywords: createdRequirement.mandatory_keywords,
      complementary_keywords: createdRequirement.complementary_keywords,
      condition: createdRequirement.condition,
      evidence: createdRequirement.evidence,
      periodicity: createdRequirement.periodicity,
      requirement_type: createdRequirement.requirement_type,
      jurisdiction: createdRequirement.jurisdiction,
      state: createdRequirement.state,
      municipality: createdRequirement.municipality,
      subject: expect.objectContaining({
        subject_id: createdSubjectId,
        subject_name: subjectName
      }),
      aspect: expect.objectContaining({
        aspect_id: createdAspectIds[0],
        aspect_name: aspectsToCreate[0]
      })
    })
  })

  test('Should return 404 if the subjectId does not exist', async () => {
    const nonExistentSubjectId = '-1'

    const response = await api
      .get(`/api/requirements/subject/${nonExistentSubjectId}/aspects`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .query({ aspectIds: createdAspectIds })
      .expect(404)
      .expect('Content-Type', /application\/json/)

    expect(response.body.message).toMatch(/Subject not found/i)
  })

  test('Should return 404 if aspects do not exist', async () => {
    const invalidAspectIds = [-1, -2]
    const response = await api
      .get(`/api/requirements/subject/${createdSubjectId}/aspects`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .query({ aspectIds: invalidAspectIds })
      .expect(404)
      .expect('Content-Type', /application\/json/)

    expect(response.body.message).toMatch(/Aspects not found for IDs/i)
    expect(response.body.errors).toEqual(
      expect.objectContaining({
        notFoundIds: expect.arrayContaining(invalidAspectIds)
      })
    )
  })

  test('Should return 401 if user is unauthorized', async () => {
    const response = await api
      .get(`/api/requirements/subject/${createdSubjectId}/aspects`)
      .query({ aspectIds: createdAspectIds })
      .expect(401)
      .expect('Content-Type', /application\/json/)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })
})

describe('Get Requirements By Mandatory Description', () => {
  let createdRequirement
  const testMandatoryDescription = 'This is a mandatory description for testing.'

  beforeEach(async () => {
    await RequirementRepository.deleteAll()
  })

  test('Should return an empty array when no requirements match the given mandatory description', async () => {
    const response = await api
      .get('/api/requirements/search/mandatory-description')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .query({ description: testMandatoryDescription })
      .expect(200)
      .expect('Content-Type', /application\/json/)

    expect(response.body.requirements).toBeInstanceOf(Array)
    expect(response.body.requirements).toHaveLength(0)
  })

  test('Should return the requirement after creating one with the given mandatory description', async () => {
    const requirementData = generateRequirementData({
      subjectId: String(createdSubjectId),
      aspectId: String(createdAspectIds[0]),
      mandatoryDescription: testMandatoryDescription
    })

    const createResponse = await api
      .post('/api/requirements')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(requirementData)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    createdRequirement = createResponse.body.requirement

    const response = await api
      .get('/api/requirements/search/mandatory-description')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .query({ description: testMandatoryDescription })
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const { requirements } = response.body

    expect(requirements).toBeInstanceOf(Array)
    expect(requirements).toHaveLength(1)
    expect(requirements[0]).toMatchObject({
      id: createdRequirement.id,
      requirement_number: createdRequirement.requirement_number,
      requirement_name: createdRequirement.requirement_name,
      mandatory_description: testMandatoryDescription,
      complementary_description: createdRequirement.complementary_description,
      mandatory_sentences: createdRequirement.mandatory_sentences,
      complementary_sentences: createdRequirement.complementary_sentences,
      mandatory_keywords: createdRequirement.mandatory_keywords,
      complementary_keywords: createdRequirement.complementary_keywords,
      condition: createdRequirement.condition,
      evidence: createdRequirement.evidence,
      periodicity: createdRequirement.periodicity,
      requirement_type: createdRequirement.requirement_type,
      jurisdiction: createdRequirement.jurisdiction,
      state: createdRequirement.state,
      municipality: createdRequirement.municipality,
      subject: expect.objectContaining({
        subject_id: createdSubjectId,
        subject_name: subjectName
      }),
      aspect: expect.objectContaining({
        aspect_id: createdAspectIds[0],
        aspect_name: aspectsToCreate[0]
      })
    })
  })

  test('Should return 401 if user is unauthorized', async () => {
    const response = await api
      .get('/api/requirements/search/mandatory-description')
      .query({ description: testMandatoryDescription })
      .expect(401)
      .expect('Content-Type', /application\/json/)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })
})

describe('Get Requirements By Complementary Description', () => {
  let createdRequirement
  const testComplementaryDescription = 'This is a complementary description for testing.'

  beforeEach(async () => {
    await RequirementRepository.deleteAll()
  })

  test('Should return an empty array when no requirements match the given complementary description', async () => {
    const response = await api
      .get('/api/requirements/search/complementary-description')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .query({ description: testComplementaryDescription })
      .expect(200)
      .expect('Content-Type', /application\/json/)

    expect(response.body.requirements).toBeInstanceOf(Array)
    expect(response.body.requirements).toHaveLength(0)
  })

  test('Should return the requirement after creating one with the given complementary description', async () => {
    const requirementData = generateRequirementData({
      subjectId: String(createdSubjectId),
      aspectId: String(createdAspectIds[0]),
      complementaryDescription: testComplementaryDescription
    })

    const createResponse = await api
      .post('/api/requirements')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(requirementData)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    createdRequirement = createResponse.body.requirement

    const response = await api
      .get('/api/requirements/search/complementary-description')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .query({ description: testComplementaryDescription })
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const { requirements } = response.body

    expect(requirements).toBeInstanceOf(Array)
    expect(requirements).toHaveLength(1)
    expect(requirements[0]).toMatchObject({
      id: createdRequirement.id,
      requirement_number: createdRequirement.requirement_number,
      requirement_name: createdRequirement.requirement_name,
      mandatory_description: createdRequirement.mandatory_description,
      complementary_description: testComplementaryDescription,
      mandatory_sentences: createdRequirement.mandatory_sentences,
      complementary_sentences: createdRequirement.complementary_sentences,
      mandatory_keywords: createdRequirement.mandatory_keywords,
      complementary_keywords: createdRequirement.complementary_keywords,
      condition: createdRequirement.condition,
      evidence: createdRequirement.evidence,
      periodicity: createdRequirement.periodicity,
      requirement_type: createdRequirement.requirement_type,
      jurisdiction: createdRequirement.jurisdiction,
      state: createdRequirement.state,
      municipality: createdRequirement.municipality,
      subject: expect.objectContaining({
        subject_id: createdSubjectId,
        subject_name: subjectName
      }),
      aspect: expect.objectContaining({
        aspect_id: createdAspectIds[0],
        aspect_name: aspectsToCreate[0]
      })
    })
  })

  test('Should return 401 if user is unauthorized', async () => {
    const response = await api
      .get('/api/requirements/search/complementary-description')
      .query({ description: testComplementaryDescription })
      .expect(401)
      .expect('Content-Type', /application\/json/)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })
})

describe('Get Requirements By Mandatory Sentences', () => {
  let createdRequirement
  const testMandatorySentence = 'This is a mandatory sentence for testing.'

  beforeEach(async () => {
    await RequirementRepository.deleteAll()
  })

  test('Should return an empty array when no requirements match the given mandatory sentence', async () => {
    const response = await api
      .get('/api/requirements/search/mandatory-sentences')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .query({ sentence: testMandatorySentence })
      .expect(200)
      .expect('Content-Type', /application\/json/)

    expect(response.body.requirements).toBeInstanceOf(Array)
    expect(response.body.requirements).toHaveLength(0)
  })

  test('Should return the requirement after creating one with the given mandatory sentence', async () => {
    const requirementData = generateRequirementData({
      subjectId: String(createdSubjectId),
      aspectId: String(createdAspectIds[0]),
      mandatorySentences: testMandatorySentence
    })

    const createResponse = await api
      .post('/api/requirements')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(requirementData)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    createdRequirement = createResponse.body.requirement

    const response = await api
      .get('/api/requirements/search/mandatory-sentences')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .query({ sentence: testMandatorySentence })
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const { requirements } = response.body

    expect(requirements).toBeInstanceOf(Array)
    expect(requirements).toHaveLength(1)
    expect(requirements[0]).toMatchObject({
      id: createdRequirement.id,
      requirement_number: createdRequirement.requirement_number,
      requirement_name: createdRequirement.requirement_name,
      mandatory_description: createdRequirement.mandatory_description,
      complementary_description: createdRequirement.complementary_description,
      mandatory_sentences: testMandatorySentence,
      complementary_sentences: createdRequirement.complementary_sentences,
      mandatory_keywords: createdRequirement.mandatory_keywords,
      complementary_keywords: createdRequirement.complementary_keywords,
      condition: createdRequirement.condition,
      evidence: createdRequirement.evidence,
      periodicity: createdRequirement.periodicity,
      requirement_type: createdRequirement.requirement_type,
      jurisdiction: createdRequirement.jurisdiction,
      state: createdRequirement.state,
      municipality: createdRequirement.municipality,
      subject: expect.objectContaining({
        subject_id: createdSubjectId,
        subject_name: subjectName
      }),
      aspect: expect.objectContaining({
        aspect_id: createdAspectIds[0],
        aspect_name: aspectsToCreate[0]
      })
    })
  })

  test('Should return 401 if user is unauthorized', async () => {
    const response = await api
      .get('/api/requirements/search/mandatory-sentences')
      .query({ sentence: testMandatorySentence })
      .expect(401)
      .expect('Content-Type', /application\/json/)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })
})

describe('Get Requirements By Complementary Sentences', () => {
  let createdRequirement
  const testComplementarySentence = 'This is a complementary sentence for testing.'

  beforeEach(async () => {
    await RequirementRepository.deleteAll()
  })

  test('Should return an empty array when no requirements match the given complementary sentence', async () => {
    const response = await api
      .get('/api/requirements/search/complementary-sentences')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .query({ sentence: testComplementarySentence })
      .expect(200)
      .expect('Content-Type', /application\/json/)

    expect(response.body.requirements).toBeInstanceOf(Array)
    expect(response.body.requirements).toHaveLength(0)
  })

  test('Should return the requirement after creating one with the given complementary sentence', async () => {
    const requirementData = generateRequirementData({
      subjectId: String(createdSubjectId),
      aspectId: String(createdAspectIds[0]),
      complementarySentences: testComplementarySentence
    })

    const createResponse = await api
      .post('/api/requirements')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(requirementData)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    createdRequirement = createResponse.body.requirement

    const response = await api
      .get('/api/requirements/search/complementary-sentences')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .query({ sentence: testComplementarySentence })
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const { requirements } = response.body

    expect(requirements).toBeInstanceOf(Array)
    expect(requirements).toHaveLength(1)
    expect(requirements[0]).toMatchObject({
      id: createdRequirement.id,
      requirement_number: createdRequirement.requirement_number,
      requirement_name: createdRequirement.requirement_name,
      mandatory_description: createdRequirement.mandatory_description,
      complementary_description: createdRequirement.complementary_description,
      mandatory_sentences: createdRequirement.mandatory_sentences,
      complementary_sentences: testComplementarySentence,
      mandatory_keywords: createdRequirement.mandatory_keywords,
      complementary_keywords: createdRequirement.complementary_keywords,
      condition: createdRequirement.condition,
      evidence: createdRequirement.evidence,
      periodicity: createdRequirement.periodicity,
      requirement_type: createdRequirement.requirement_type,
      jurisdiction: createdRequirement.jurisdiction,
      state: createdRequirement.state,
      municipality: createdRequirement.municipality,
      subject: expect.objectContaining({
        subject_id: createdSubjectId,
        subject_name: subjectName
      }),
      aspect: expect.objectContaining({
        aspect_id: createdAspectIds[0],
        aspect_name: aspectsToCreate[0]
      })
    })
  })

  test('Should return 401 if user is unauthorized', async () => {
    const response = await api
      .get('/api/requirements/search/complementary-sentences')
      .query({ sentence: testComplementarySentence })
      .expect(401)
      .expect('Content-Type', /application\/json/)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })
})

describe('Get Requirements By Mandatory Keywords', () => {
  let createdRequirement
  const testMandatoryKeyword = 'critical-safety'

  beforeEach(async () => {
    await RequirementRepository.deleteAll()
  })

  test('Should return an empty array when no requirements match the given mandatory keyword', async () => {
    const response = await api
      .get('/api/requirements/search/mandatory-keywords')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .query({ keyword: testMandatoryKeyword })
      .expect(200)
      .expect('Content-Type', /application\/json/)

    expect(response.body.requirements).toBeInstanceOf(Array)
    expect(response.body.requirements).toHaveLength(0)
  })

  test('Should return the requirement after creating one with the given mandatory keyword', async () => {
    const requirementData = generateRequirementData({
      subjectId: String(createdSubjectId),
      aspectId: String(createdAspectIds[0]),
      mandatoryKeywords: testMandatoryKeyword
    })

    const createResponse = await api
      .post('/api/requirements')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(requirementData)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    createdRequirement = createResponse.body.requirement

    const response = await api
      .get('/api/requirements/search/mandatory-keywords')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .query({ keyword: testMandatoryKeyword })
      .expect(200)
      .expect('Content-Type', /application\/json/)
    const { requirements } = response.body

    expect(requirements).toBeInstanceOf(Array)
    expect(requirements).toHaveLength(1)
    expect(requirements[0]).toMatchObject({
      id: createdRequirement.id,
      requirement_number: createdRequirement.requirement_number,
      requirement_name: createdRequirement.requirement_name,
      mandatory_description: createdRequirement.mandatory_description,
      complementary_description: createdRequirement.complementary_description,
      mandatory_sentences: createdRequirement.mandatory_sentences,
      complementary_sentences: createdRequirement.complementary_sentences,
      mandatory_keywords: createdRequirement.mandatory_keywords,
      complementary_keywords: createdRequirement.complementary_keywords,
      condition: createdRequirement.condition,
      evidence: createdRequirement.evidence,
      periodicity: createdRequirement.periodicity,
      requirement_type: createdRequirement.requirement_type,
      jurisdiction: createdRequirement.jurisdiction,
      state: createdRequirement.state,
      municipality: createdRequirement.municipality,
      subject: expect.objectContaining({
        subject_id: createdSubjectId,
        subject_name: subjectName
      }),
      aspect: expect.objectContaining({
        aspect_id: createdAspectIds[0],
        aspect_name: aspectsToCreate[0]
      })
    })
  })

  test('Should return 401 if user is unauthorized', async () => {
    const response = await api
      .get('/api/requirements/search/mandatory-keywords')
      .query({ keyword: testMandatoryKeyword })
      .expect(401)
      .expect('Content-Type', /application\/json/)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })
})

describe('Get Requirements By Complementary Keywords', () => {
  let createdRequirement
  const testComplementaryKeyword = 'safety-measures'

  beforeEach(async () => {
    await RequirementRepository.deleteAll()
  })

  test('Should return an empty array when no requirements match the given complementary keyword', async () => {
    const response = await api
      .get('/api/requirements/search/complementary-keywords')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .query({ keyword: testComplementaryKeyword })
      .expect(200)
      .expect('Content-Type', /application\/json/)

    expect(response.body.requirements).toBeInstanceOf(Array)
    expect(response.body.requirements).toHaveLength(0)
  })

  test('Should return the requirement after creating one with the given complementary keyword', async () => {
    const requirementData = generateRequirementData({
      subjectId: String(createdSubjectId),
      aspectId: String(createdAspectIds[0]),
      complementaryKeywords: testComplementaryKeyword
    })

    const createResponse = await api
      .post('/api/requirements')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(requirementData)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    createdRequirement = createResponse.body.requirement

    const response = await api
      .get('/api/requirements/search/complementary-keywords')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .query({ keyword: testComplementaryKeyword })
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const { requirements } = response.body

    expect(requirements).toBeInstanceOf(Array)
    expect(requirements).toHaveLength(1)
    expect(requirements[0]).toMatchObject({
      id: createdRequirement.id,
      requirement_number: createdRequirement.requirement_number,
      requirement_name: createdRequirement.requirement_name,
      mandatory_description: createdRequirement.mandatory_description,
      complementary_description: createdRequirement.complementary_description,
      mandatory_sentences: createdRequirement.mandatory_sentences,
      complementary_sentences: createdRequirement.complementary_sentences,
      mandatory_keywords: createdRequirement.mandatory_keywords,
      complementary_keywords: testComplementaryKeyword,
      condition: createdRequirement.condition,
      evidence: createdRequirement.evidence,
      periodicity: createdRequirement.periodicity,
      requirement_type: createdRequirement.requirement_type,
      jurisdiction: createdRequirement.jurisdiction,
      state: createdRequirement.state,
      municipality: createdRequirement.municipality,
      subject: expect.objectContaining({
        subject_id: createdSubjectId,
        subject_name: subjectName
      }),
      aspect: expect.objectContaining({
        aspect_id: createdAspectIds[0],
        aspect_name: aspectsToCreate[0]
      })
    })
  })

  test('Should return 401 if user is unauthorized', async () => {
    const response = await api
      .get('/api/requirements/search/complementary-keywords')
      .query({ keyword: testComplementaryKeyword })
      .expect(401)
      .expect('Content-Type', /application\/json/)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })
})

describe('Get Requirements By Condition', () => {
  let createdRequirement
  const testCondition = 'Crítica'

  beforeEach(async () => {
    await RequirementRepository.deleteAll()
  })

  test('Should return an empty array when no requirements match the given condition', async () => {
    const response = await api
      .get('/api/requirements/search/condition')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .query({ condition: testCondition })
      .expect(200)
      .expect('Content-Type', /application\/json/)

    expect(response.body.requirements).toBeInstanceOf(Array)
    expect(response.body.requirements).toHaveLength(0)
  })

  test('Should return the requirement after creating one with the given condition', async () => {
    const requirementData = generateRequirementData({
      subjectId: String(createdSubjectId),
      aspectId: String(createdAspectIds[0]),
      condition: testCondition
    })

    const createResponse = await api
      .post('/api/requirements')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(requirementData)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    createdRequirement = createResponse.body.requirement

    const response = await api
      .get('/api/requirements/search/condition')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .query({ condition: testCondition })
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const { requirements } = response.body

    expect(requirements).toBeInstanceOf(Array)
    expect(requirements).toHaveLength(1)
    expect(requirements[0]).toMatchObject({
      id: createdRequirement.id,
      requirement_number: createdRequirement.requirement_number,
      requirement_name: createdRequirement.requirement_name,
      mandatory_description: createdRequirement.mandatory_description,
      complementary_description: createdRequirement.complementary_description,
      mandatory_sentences: createdRequirement.mandatory_sentences,
      complementary_sentences: createdRequirement.complementary_sentences,
      mandatory_keywords: createdRequirement.mandatory_keywords,
      complementary_keywords: createdRequirement.complementary_keywords,
      condition: testCondition,
      evidence: createdRequirement.evidence,
      periodicity: createdRequirement.periodicity,
      requirement_type: createdRequirement.requirement_type,
      jurisdiction: createdRequirement.jurisdiction,
      state: createdRequirement.state,
      municipality: createdRequirement.municipality,
      subject: expect.objectContaining({
        subject_id: createdSubjectId,
        subject_name: subjectName
      }),
      aspect: expect.objectContaining({
        aspect_id: createdAspectIds[0],
        aspect_name: aspectsToCreate[0]
      })
    })
  })

  test('Should return 401 if user is unauthorized', async () => {
    const response = await api
      .get('/api/requirements/search/condition')
      .query({ condition: testCondition })
      .expect(401)
      .expect('Content-Type', /application\/json/)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })
})

describe('Get Requirements By Evidence', () => {
  let createdRequirement
  const testEvidence = 'Registro'
  beforeEach(async () => {
    await RequirementRepository.deleteAll()
  })

  test('Should return an empty array when no requirements match the given evidence', async () => {
    const response = await api
      .get('/api/requirements/search/evidence')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .query({ evidence: testEvidence })
      .expect(200)
      .expect('Content-Type', /application\/json/)

    expect(response.body.requirements).toBeInstanceOf(Array)
    expect(response.body.requirements).toHaveLength(0)
  })

  test('Should return the requirement after creating one with the given evidence', async () => {
    const requirementData = generateRequirementData({
      subjectId: String(createdSubjectId),
      aspectId: String(createdAspectIds[0]),
      evidence: testEvidence
    })

    const createResponse = await api
      .post('/api/requirements')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(requirementData)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    createdRequirement = createResponse.body.requirement

    const response = await api
      .get('/api/requirements/search/evidence')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .query({ evidence: testEvidence })
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const { requirements } = response.body

    expect(requirements).toBeInstanceOf(Array)
    expect(requirements).toHaveLength(1)
    expect(requirements[0]).toMatchObject({
      id: createdRequirement.id,
      requirement_number: createdRequirement.requirement_number,
      requirement_name: createdRequirement.requirement_name,
      mandatory_description: createdRequirement.mandatory_description,
      complementary_description: createdRequirement.complementary_description,
      mandatory_sentences: createdRequirement.mandatory_sentences,
      complementary_sentences: createdRequirement.complementary_sentences,
      mandatory_keywords: createdRequirement.mandatory_keywords,
      complementary_keywords: createdRequirement.complementary_keywords,
      condition: createdRequirement.condition,
      evidence: testEvidence,
      periodicity: createdRequirement.periodicity,
      requirement_type: createdRequirement.requirement_type,
      jurisdiction: createdRequirement.jurisdiction,
      state: createdRequirement.state,
      municipality: createdRequirement.municipality,
      subject: expect.objectContaining({
        subject_id: createdSubjectId,
        subject_name: subjectName
      }),
      aspect: expect.objectContaining({
        aspect_id: createdAspectIds[0],
        aspect_name: aspectsToCreate[0]
      })
    })
  })

  test('Should return 401 if user is unauthorized', async () => {
    const response = await api
      .get('/api/requirements/search/evidence')
      .query({ evidence: testEvidence })
      .expect(401)
      .expect('Content-Type', /application\/json/)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })
})

describe('Get Requirements By Periodicity', () => {
  let createdRequirement
  const testPeriodicity = 'Anual'
  beforeEach(async () => {
    await RequirementRepository.deleteAll()
  })

  test('Should return an empty array when no requirements match the given periodicity', async () => {
    const response = await api
      .get('/api/requirements/search/periodicity')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .query({ periodicity: testPeriodicity })
      .expect(200)
      .expect('Content-Type', /application\/json/)

    expect(response.body.requirements).toBeInstanceOf(Array)
    expect(response.body.requirements).toHaveLength(0)
  })

  test('Should return the requirement after creating one with the given periodicity', async () => {
    const requirementData = generateRequirementData({
      subjectId: String(createdSubjectId),
      aspectId: String(createdAspectIds[0]),
      periodicity: testPeriodicity
    })

    const createResponse = await api
      .post('/api/requirements')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(requirementData)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    createdRequirement = createResponse.body.requirement

    const response = await api
      .get('/api/requirements/search/periodicity')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .query({ periodicity: testPeriodicity })
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const { requirements } = response.body

    expect(requirements).toBeInstanceOf(Array)
    expect(requirements).toHaveLength(1)
    expect(requirements[0]).toMatchObject({
      id: createdRequirement.id,
      requirement_number: createdRequirement.requirement_number,
      requirement_name: createdRequirement.requirement_name,
      mandatory_description: createdRequirement.mandatory_description,
      complementary_description: createdRequirement.complementary_description,
      mandatory_sentences: createdRequirement.mandatory_sentences,
      complementary_sentences: createdRequirement.complementary_sentences,
      mandatory_keywords: createdRequirement.mandatory_keywords,
      complementary_keywords: createdRequirement.complementary_keywords,
      condition: createdRequirement.condition,
      evidence: createdRequirement.evidence,
      periodicity: testPeriodicity,
      requirement_type: createdRequirement.requirement_type,
      jurisdiction: createdRequirement.jurisdiction,
      state: createdRequirement.state,
      municipality: createdRequirement.municipality,
      subject: expect.objectContaining({
        subject_id: createdSubjectId,
        subject_name: subjectName
      }),
      aspect: expect.objectContaining({
        aspect_id: createdAspectIds[0],
        aspect_name: aspectsToCreate[0]
      })
    })
  })

  test('Should return 401 if user is unauthorized', async () => {
    const response = await api
      .get('/api/requirements/search/periodicity')
      .query({ periodicity: testPeriodicity })
      .expect(401)
      .expect('Content-Type', /application\/json/)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })
})

describe('Get Requirements By Requirement Type', () => {
  let createdRequirement
  const testRequirementType = 'Identificación Estatal'

  beforeEach(async () => {
    await RequirementRepository.deleteAll()
  })

  test('Should return an empty array when no requirements match the given requirement type', async () => {
    const response = await api
      .get('/api/requirements/search/type')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .query({ requirementType: testRequirementType })
      .expect(200)
      .expect('Content-Type', /application\/json/)

    expect(response.body.requirements).toBeInstanceOf(Array)
    expect(response.body.requirements).toHaveLength(0)
  })

  test('Should return the requirement after creating one with the given requirement type', async () => {
    const requirementData = generateRequirementData({
      subjectId: String(createdSubjectId),
      aspectId: String(createdAspectIds[0]),
      requirementType: testRequirementType
    })

    const createResponse = await api
      .post('/api/requirements')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(requirementData)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    createdRequirement = createResponse.body.requirement

    const response = await api
      .get('/api/requirements/search/type')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .query({ requirementType: testRequirementType })
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const { requirements } = response.body

    expect(requirements).toBeInstanceOf(Array)
    expect(requirements).toHaveLength(1)
    expect(requirements[0]).toMatchObject({
      id: createdRequirement.id,
      requirement_number: createdRequirement.requirement_number,
      requirement_name: createdRequirement.requirement_name,
      mandatory_description: createdRequirement.mandatory_description,
      complementary_description: createdRequirement.complementary_description,
      mandatory_sentences: createdRequirement.mandatory_sentences,
      complementary_sentences: createdRequirement.complementary_sentences,
      mandatory_keywords: createdRequirement.mandatory_keywords,
      complementary_keywords: createdRequirement.complementary_keywords,
      condition: createdRequirement.condition,
      evidence: createdRequirement.evidence,
      periodicity: createdRequirement.periodicity,
      requirement_type: testRequirementType,
      jurisdiction: createdRequirement.jurisdiction,
      state: createdRequirement.state,
      municipality: createdRequirement.municipality,
      subject: expect.objectContaining({
        subject_id: createdSubjectId,
        subject_name: subjectName
      }),
      aspect: expect.objectContaining({
        aspect_id: createdAspectIds[0],
        aspect_name: aspectsToCreate[0]
      })
    })
  })

  test('Should return 401 if user is unauthorized', async () => {
    const response = await api
      .get('/api/requirements/search/type')
      .query({ requirementType: testRequirementType })
      .expect(401)
      .expect('Content-Type', /application\/json/)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })
})

describe('Get Requirements By Jurisdiction', () => {
  let createdRequirement
  const testJurisdiction = 'Federal'
  beforeEach(async () => {
    await RequirementRepository.deleteAll()
  })
  test('Should return an empty array when no requirements match the given jurisdiction', async () => {
    const response = await api
      .get('/api/requirements/search/jurisdiction')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .query({ jurisdiction: testJurisdiction })
      .expect(200)
      .expect('Content-Type', /application\/json/)

    expect(response.body.requirements).toBeInstanceOf(Array)
    expect(response.body.requirements).toHaveLength(0)
  })

  test('Should return the requirement after creating one with the given jurisdiction', async () => {
    const requirementData = generateRequirementData({
      subjectId: String(createdSubjectId),
      aspectId: String(createdAspectIds[0]),
      jurisdiction: testJurisdiction
    })

    const createResponse = await api
      .post('/api/requirements')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(requirementData)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    createdRequirement = createResponse.body.requirement

    const response = await api
      .get('/api/requirements/search/jurisdiction')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .query({ jurisdiction: testJurisdiction })
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const { requirements } = response.body

    expect(requirements).toBeInstanceOf(Array)
    expect(requirements).toHaveLength(1)
    expect(requirements[0]).toMatchObject({
      id: createdRequirement.id,
      requirement_number: createdRequirement.requirement_number,
      requirement_name: createdRequirement.requirement_name,
      mandatory_description: createdRequirement.mandatory_description,
      complementary_description: createdRequirement.complementary_description,
      mandatory_sentences: createdRequirement.mandatory_sentences,
      complementary_sentences: createdRequirement.complementary_sentences,
      mandatory_keywords: createdRequirement.mandatory_keywords,
      complementary_keywords: createdRequirement.complementary_keywords,
      condition: createdRequirement.condition,
      evidence: createdRequirement.evidence,
      periodicity: createdRequirement.periodicity,
      requirement_type: createdRequirement.requirement_type,
      jurisdiction: testJurisdiction,
      state: createdRequirement.state,
      municipality: createdRequirement.municipality,
      subject: expect.objectContaining({
        subject_id: createdSubjectId,
        subject_name: subjectName
      }),
      aspect: expect.objectContaining({
        aspect_id: createdAspectIds[0],
        aspect_name: aspectsToCreate[0]
      })
    })
  })

  test('Should return 401 if user is unauthorized', async () => {
    const response = await api
      .get('/api/requirements/search/jurisdiction')
      .query({ jurisdiction: testJurisdiction })
      .expect(401)
      .expect('Content-Type', /application\/json/)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })
})

describe('Get Requirements By State', () => {
  let createdRequirement
  const testState = 'Nuevo León'

  beforeEach(async () => {
    await RequirementRepository.deleteAll()
  })

  test('Should return an empty array when no requirements match the given state', async () => {
    const response = await api
      .get('/api/requirements/search/state')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .query({ state: testState })
      .expect(200)
      .expect('Content-Type', /application\/json/)

    expect(response.body.requirements).toBeInstanceOf(Array)
    expect(response.body.requirements).toHaveLength(0)
  })

  test('Should return the requirement after creating one with the given state', async () => {
    const requirementData = generateRequirementData({
      subjectId: String(createdSubjectId),
      aspectId: String(createdAspectIds[0]),
      jurisdiction: 'Estatal',
      state: testState
    })

    const createResponse = await api
      .post('/api/requirements')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(requirementData)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    createdRequirement = createResponse.body.requirement

    const response = await api
      .get('/api/requirements/search/state')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .query({ state: testState })
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const { requirements } = response.body

    expect(requirements).toBeInstanceOf(Array)
    expect(requirements).toHaveLength(1)
    expect(requirements[0]).toMatchObject({
      id: createdRequirement.id,
      requirement_number: createdRequirement.requirement_number,
      requirement_name: createdRequirement.requirement_name,
      mandatory_description: createdRequirement.mandatory_description,
      complementary_description: createdRequirement.complementary_description,
      mandatory_sentences: createdRequirement.mandatory_sentences,
      complementary_sentences: createdRequirement.complementary_sentences,
      mandatory_keywords: createdRequirement.mandatory_keywords,
      complementary_keywords: createdRequirement.complementary_keywords,
      condition: createdRequirement.condition,
      evidence: createdRequirement.evidence,
      periodicity: createdRequirement.periodicity,
      requirement_type: createdRequirement.requirement_type,
      jurisdiction: createdRequirement.jurisdiction,
      state: testState,
      municipality: createdRequirement.municipality,
      subject: expect.objectContaining({
        subject_id: createdSubjectId,
        subject_name: subjectName
      }),
      aspect: expect.objectContaining({
        aspect_id: createdAspectIds[0],
        aspect_name: aspectsToCreate[0]
      })
    })
  })

  test('Should return 401 if user is unauthorized', async () => {
    const response = await api
      .get('/api/requirements/search/state')
      .query({ state: testState })
      .expect(401)
      .expect('Content-Type', /application\/json/)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })
})

describe('Get Requirements By State And Municipalities', () => {
  let createdRequirement
  const testState = 'Nuevo León'
  const testMunicipality = 'Monterrey'

  beforeEach(async () => {
    await RequirementRepository.deleteAll()
  })

  test('Should return an empty array when no requirements match the given state and municipalities', async () => {
    const response = await api
      .get('/api/requirements/search/state/municipalities')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .query({ state: testState, municipalities: testMunicipality })
      .expect(200)
      .expect('Content-Type', /application\/json/)

    expect(response.body.requirements).toBeInstanceOf(Array)
    expect(response.body.requirements).toHaveLength(0)
  })

  test('Should return the requirement after creating one with the given state and municipality', async () => {
    const requirementData = generateRequirementData({
      subjectId: String(createdSubjectId),
      aspectId: String(createdAspectIds[0]),
      jurisdiction: 'Local',
      state: testState,
      municipality: testMunicipality
    })

    const createResponse = await api
      .post('/api/requirements')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(requirementData)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    createdRequirement = createResponse.body.requirement

    const response = await api
      .get('/api/requirements/search/state/municipalities')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .query({ state: testState, municipalities: testMunicipality })
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const { requirements } = response.body

    expect(requirements).toBeInstanceOf(Array)
    expect(requirements).toHaveLength(1)
    expect(requirements[0]).toMatchObject({
      id: createdRequirement.id,
      requirement_number: createdRequirement.requirement_number,
      requirement_name: createdRequirement.requirement_name,
      mandatory_description: createdRequirement.mandatory_description,
      complementary_description: createdRequirement.complementary_description,
      mandatory_sentences: createdRequirement.mandatory_sentences,
      complementary_sentences: createdRequirement.complementary_sentences,
      mandatory_keywords: createdRequirement.mandatory_keywords,
      complementary_keywords: createdRequirement.complementary_keywords,
      condition: createdRequirement.condition,
      evidence: createdRequirement.evidence,
      periodicity: createdRequirement.periodicity,
      requirement_type: createdRequirement.requirement_type,
      jurisdiction: createdRequirement.jurisdiction,
      state: testState,
      municipality: testMunicipality,
      subject: expect.objectContaining({
        subject_id: createdSubjectId,
        subject_name: subjectName
      }),
      aspect: expect.objectContaining({
        aspect_id: createdAspectIds[0],
        aspect_name: aspectsToCreate[0]
      })
    })
  })

  test('Should return multiple requirements when filtering by state with multiple municipalities', async () => {
    const requirementData1 = generateRequirementData({
      requirementNumber: 'requirementData1 Number',
      requirementName: 'requirementData1 Name',
      subjectId: String(createdSubjectId),
      aspectId: String(createdAspectIds[0]),
      jurisdiction: 'Local',
      state: testState,
      municipality: 'Monterrey'
    })

    const requirementData2 = generateRequirementData({
      requirementNumber: 'requirementData2 Number',
      requirementName: 'requirementData2 Name',
      subjectId: String(createdSubjectId),
      aspectId: String(createdAspectIds[1]),
      jurisdiction: 'Local',
      state: testState,
      municipality: 'San Pedro'
    })

    await api
      .post('/api/requirements')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(requirementData1)
      .expect(201)

    await api
      .post('/api/requirements')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(requirementData2)
      .expect(201)

    const response = await api
      .get('/api/requirements/search/state/municipalities')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .query({ state: testState, municipalities: 'Monterrey, San Pedro' })
      .expect(200)
      .expect('Content-Type', /application\/json/)

    expect(response.body.requirements).toBeInstanceOf(Array)
    expect(response.body.requirements).toHaveLength(2)
  })

  test('Should return an empty array if the given municipalities do not exist', async () => {
    const response = await api
      .get('/api/requirements/search/state/municipalities')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .query({ state: testState, municipalities: 'Unknown Municipality' })
      .expect(200)
      .expect('Content-Type', /application\/json/)

    expect(response.body.requirements).toBeInstanceOf(Array)
    expect(response.body.requirements).toHaveLength(0)
  })

  test('Should return 401 if user is unauthorized', async () => {
    const response = await api
      .get('/api/requirements/search/state/municipalities')
      .query({ state: testState, municipalities: testMunicipality })
      .expect(401)
      .expect('Content-Type', /application\/json/)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })
})

describe('Update a requirement', () => {
  let createdRequirement

  beforeEach(async () => {
    await RequirementRepository.deleteAll()
    const requirementData = generateRequirementData({
      subjectId: String(createdSubjectId),
      aspectId: String(createdAspectIds[0])
    })

    const response = await api
      .post('/api/requirements')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(requirementData)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    createdRequirement = response.body.requirement
  })

  test('Should successfully update a requirement', async () => {
    const updatedData = generateRequirementData({
      requirementName: 'Updated Requirement Name',
      requirementNumber: 'UPDATED-001',
      subjectId: String(createdSubjectId),
      aspectId: String(createdAspectIds[0])
    })

    await api
      .patch(`/api/requirement/${createdRequirement.id}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(updatedData)
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const response = await api
      .get(`/api/requirement/${createdRequirement.id}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const { requirement } = response.body
    expect(requirement).toMatchObject({
      id: createdRequirement.id,
      requirement_number: updatedData.requirementNumber,
      requirement_name: updatedData.requirementName,
      mandatory_description: updatedData.mandatoryDescription,
      complementary_description: updatedData.complementaryDescription,
      mandatory_sentences: updatedData.mandatorySentences,
      complementary_sentences: updatedData.complementarySentences,
      mandatory_keywords: updatedData.mandatoryKeywords,
      complementary_keywords: updatedData.complementaryKeywords,
      condition: updatedData.condition,
      evidence: updatedData.evidence,
      periodicity: updatedData.periodicity,
      requirement_type: updatedData.requirementType,
      jurisdiction: updatedData.jurisdiction,
      state: null,
      municipality: null,
      subject: expect.objectContaining({
        subject_id: createdSubjectId,
        subject_name: subjectName
      }),
      aspect: expect.objectContaining({
        aspect_id: createdAspectIds[0],
        aspect_name: aspectsToCreate[0]
      })
    })
  })

  test('Should return 404 if requirement does not exist', async () => {
    const updatedData = generateRequirementData({
      requirementName: 'Updated Requirement Name',
      requirementNumber: 'UPDATED-001',
      subjectId: String(createdSubjectId),
      aspectId: String(createdAspectIds[0])
    })
    const response = await api
      .patch('/api/requirement/-1')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(updatedData)
      .expect(404)

    expect(response.body.message).toMatch(/Requirement not found/i)
  })

  test('Should return 404 if subject ID does not exist', async () => {
    const updatedData = generateRequirementData({
      requirementName: 'Updated Requirement Name',
      requirementNumber: 'UPDATED-001',
      subjectId: '-1',
      aspectId: String(createdAspectIds[0])
    })
    const response = await api
      .patch(`/api/requirement/${createdRequirement.id}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(updatedData)
      .expect(404)

    expect(response.body.message).toMatch(/Subject not found/i)
  })

  test('Should return 404 if aspect ID does not exist', async () => {
    const updatedData = generateRequirementData({
      requirementName: 'Updated Requirement Name',
      requirementNumber: 'UPDATED-001',
      subjectId: String(createdSubjectId),
      aspectId: '-1'
    })
    const response = await api
      .patch(`/api/requirement/${createdRequirement.id}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(updatedData)
      .expect(404)

    expect(response.body.message).toMatch(/Aspect not found/i)
  })

  test('Should return 409 if requirement name already exists', async () => {
    const requirement = generateRequirementData({
      subjectId: String(createdSubjectId),
      aspectId: String(createdAspectIds[0]),
      requirementName: 'Existing Requirement',
      requirementNumber: 'EXISTING-002'
    })

    const anotherRequirement = generateRequirementData({
      subjectId: String(createdSubjectId),
      aspectId: String(createdAspectIds[0]),
      requirementName: 'Existing Requirement',
      requirementNumber: 'EXISTING-002113'
    })

    await api
      .post('/api/requirements')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(requirement)
      .expect(201)

    const response = await api
      .patch(`/api/requirement/${createdRequirement.id}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(anotherRequirement)
      .expect(409)

    expect(response.body.message).toMatch(/Requirement name already exists/i)
  })

  test('Should return 409 if requirement number already exists', async () => {
    const requirement = generateRequirementData({
      subjectId: String(createdSubjectId),
      aspectId: String(createdAspectIds[0]),
      requirementName: 'Existing Requirement',
      requirementNumber: 'EXISTING-002'
    })
    const anotherRequirement = generateRequirementData({
      subjectId: String(createdSubjectId),
      aspectId: String(createdAspectIds[0]),
      requirementName: 'Unique Requirement 01',
      requirementNumber: 'EXISTING-002'
    })

    await api
      .post('/api/requirements')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(requirement)
      .expect(201)

    const response = await api
      .patch(`/api/requirement/${createdRequirement.id}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(anotherRequirement)
      .expect(409)

    expect(response.body.message).toMatch(/Requirement number already exists/i)
  })

  test('Should return 401 if the user is unauthorized', async () => {
    const response = await api
      .patch(`/api/requirement/${createdRequirement.id}`)
      .send({ requirementName: 'Unauthorized Update' })
      .expect(401)
      .expect('Content-Type', /application\/json/)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })
})

describe('Delete a requirement', () => {
  let createdRequirement

  beforeEach(async () => {
    await RequirementRepository.deleteAll()
    const requirementData = generateRequirementData({
      subjectId: String(createdSubjectId),
      aspectId: String(createdAspectIds[0])
    })

    const response = await api
      .post('/api/requirements')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(requirementData)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    createdRequirement = response.body.requirement
  })

  test('Should successfully delete a requirement', async () => {
    await api
      .delete(`/api/requirement/${createdRequirement.id}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(204)

    const response = await api
      .get(`/api/requirement/${createdRequirement.id}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(404)

    expect(response.body.message).toMatch(/Requirement not found/i)
  })

  test('Should return 404 if requirement does not exist', async () => {
    const response = await api
      .delete('/api/requirement/-1')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(404)

    expect(response.body.message).toMatch(/Requirement not found/i)
  })

  test('Should return 401 if user is unauthorized', async () => {
    const response = await api
      .delete(`/api/requirement/${createdRequirement.id}`)
      .expect(401)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })
})

describe('Delete multiple requirements', () => {
  let createdRequirements

  beforeEach(async () => {
    await RequirementRepository.deleteAll()
    const numberOfRequirements = 2
    createdRequirements = []
    for (let i = 0; i < numberOfRequirements; i++) {
      const requirementData = generateRequirementData({
        requirementNumber: `REQ-${i}`,
        requirementName: `Requirement Name ${i}`,
        subjectId: String(createdSubjectId),
        aspectId: String(createdAspectIds[0])
      })

      const response = await api
        .post('/api/requirements')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(requirementData)
        .expect(201)

      createdRequirements.push(response.body.requirement.id)
    }
  })

  test('Should successfully delete multiple requirements', async () => {
    await api
      .delete('/api/requirements/batch')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ requirementIds: createdRequirements })
      .expect(204)

    for (const id of createdRequirements) {
      const response = await api
        .get(`/api/requirement/${id}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(404)

      expect(response.body.message).toMatch(/Requirement not found/i)
    }
  })

  test('Should return 404 if one or more requirement IDs do not exist', async () => {
    const nonExistingIds = [...createdRequirements, -1]
    const response = await api
      .delete('/api/requirements/batch')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ requirementIds: nonExistingIds })
      .expect(404)

    expect(response.body.message).toMatch(/Requirements not found for IDs/i)
  })

  test('Should return 400 if no requirementIds are provided', async () => {
    const response = await api
      .delete('/api/requirements/batch')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({})
      .expect(400)

    expect(response.body.message).toMatch(/Missing required fields: requirementIds/i)
  })

  test('Should return 401 if user is unauthorized', async () => {
    const response = await api
      .delete('/api/requirements/batch')
      .send({ requirementIds: createdRequirements })
      .expect(401)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })
})
