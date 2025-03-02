/* eslint-disable no-undef */
import { api } from '../../config/test.config.js'
import UserRepository from '../../repositories/User.repository.js'
import SubjectsRepository from '../../repositories/Subject.repository.js'
import LegalBasisRepository from '../../repositories/LegalBasis.repository.js'
import AspectsRepository from '../../repositories/Aspects.repository.js'
import extractArticles from '../../services/articles/extractArticles/extractArticles.service.js'

import {
  ADMIN_PASSWORD_TEST,
  ADMIN_GMAIL
} from '../../config/variables.config.js'
import generateLegalBasisData from '../../utils/generateLegalBasisData.js'

const subjectName = 'Seguridad & Higiene'
const aspectsToCreate = ['Organizacional', 'Técnico', 'Legal']
let tokenAdmin
let createdSubjectId
const createdAspectIds = []

beforeAll(async () => {
  await LegalBasisRepository.deleteAll()
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
describe('Create a legal base', () => {
  beforeEach(async () => {
    await LegalBasisRepository.deleteAll()
  })
  test('Should successfully create a legal basis without a document', async () => {
    const legalBasisData = generateLegalBasisData({
      subjectId: String(createdSubjectId),
      aspectsIds: JSON.stringify(createdAspectIds)
    })
    const response = await api
      .post('/api/legalBasis')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(legalBasisData)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    const { jobId, legalBasis } = response.body
    expect(jobId).toBeNull()
    expect(legalBasis).toMatchObject({
      legal_name: legalBasisData.legalName,
      abbreviation: legalBasisData.abbreviation,
      classification: legalBasisData.classification,
      jurisdiction: legalBasisData.jurisdiction,
      state: null,
      municipality: null,
      last_reform: legalBasisData.lastReform,
      url: null,
      fileKey: null
    })
    expect(legalBasis.aspects).toEqual(
      expect.arrayContaining(
        createdAspectIds.map((aspectId) =>
          expect.objectContaining({ aspect_id: aspectId })
        )
      )
    )
    expect(legalBasis.subject).toMatchObject({
      subject_id: createdSubjectId,
      subject_name: subjectName
    })
  })

  test('Should successfully create a legal basis with a valid document and return a jobId', async () => {
    const document = Buffer.from('mock pdf content')
    const legalBasisData = generateLegalBasisData({
      legalName: 'Normativa con Documento',
      abbreviation: 'DocTest',
      subjectId: String(createdSubjectId),
      aspectsIds: JSON.stringify(createdAspectIds),
      classification: 'Reglamento',
      jurisdiction: 'Federal',
      lastReform: '01-01-2024',
      extractArticles: 'true'
    })
    const response = await api
      .post('/api/legalBasis')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .attach('document', document, {
        filename: 'file.pdf',
        contentType: 'application/pdf'
      })
      .field('legalName', legalBasisData.legalName)
      .field('abbreviation', legalBasisData.abbreviation)
      .field('subjectId', legalBasisData.subjectId)
      .field('aspectsIds', legalBasisData.aspectsIds)
      .field('classification', legalBasisData.classification)
      .field('jurisdiction', legalBasisData.jurisdiction)
      .field('lastReform', legalBasisData.lastReform)
      .field('extractArticles', legalBasisData.extractArticles)
      .field('intelligenceLevel', legalBasisData.intelligenceLevel)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    const { jobId, legalBasis } = response.body

    expect(jobId).not.toBeNull()
    expect(typeof jobId).toBe('string')

    expect(legalBasis).toMatchObject({
      legal_name: legalBasisData.legalName,
      abbreviation: legalBasisData.abbreviation,
      classification: legalBasisData.classification,
      jurisdiction: legalBasisData.jurisdiction,
      state: null,
      municipality: null,
      last_reform: legalBasisData.lastReform,
      url: expect.stringContaining('file.pdf'),
      fileKey: expect.stringContaining('file.pdf')
    })
    expect(legalBasis.aspects).toEqual(
      expect.arrayContaining(
        createdAspectIds.map((aspectId) =>
          expect.objectContaining({ aspect_id: aspectId })
        )
      )
    )
    expect(legalBasis.subject).toMatchObject({
      subject_id: createdSubjectId,
      subject_name: subjectName
    })
  })

  test('Should return 409 if a LegalBasis with the same name already exists', async () => {
    const LegalBasisData = generateLegalBasisData({
      legalName: 'Legal Basis',
      subjectId: String(createdSubjectId),
      aspectsIds: JSON.stringify(createdAspectIds)
    })
    await api
      .post('/api/legalBasis')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(LegalBasisData)
      .expect(201)

    const response = await api
      .post('/api/legalBasis')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(LegalBasisData)
      .expect(409)

    expect(response.body.message).toMatch(/LegalBasis already exists/i)
  })
  test('Should return 409 if a LegalBasis with the same abbreviation already exists', async () => {
    const LegalBasisData = generateLegalBasisData({
      legalName: 'Unique Legal Basis',
      abbreviation: 'DUPLICATE_ABBR',
      subjectId: String(createdSubjectId),
      aspectsIds: JSON.stringify(createdAspectIds)
    })
    await api
      .post('/api/legalBasis')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(LegalBasisData)
      .expect(201)
    const response = await api
      .post('/api/legalBasis')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        ...LegalBasisData,
        legalName: 'Another Legal Basis'
      })
      .expect(409)
    expect(response.body.message).toMatch(/LegalBasis abbreviation already exists/i)
  })
  test('Should return 404 if Subject ID is invalid', async () => {
    const LegalBasisData = generateLegalBasisData({
      subjectId: '-1',
      aspectsIds: JSON.stringify(createdAspectIds)
    })

    const response = await api
      .post('/api/legalBasis')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(LegalBasisData)
      .expect(404)

    expect(response.body.message).toMatch(/Subject not found/i)
  })
  test('Should return 404 if Aspect IDs are invalid', async () => {
    const invalidAspectIds = ['-1, -2']
    const LegalBasisData = generateLegalBasisData({
      subjectId: String(createdSubjectId),
      aspectsIds: JSON.stringify(invalidAspectIds)
    })

    const response = await api
      .post('/api/legalBasis')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(LegalBasisData)
      .expect(404)

    expect(response.body.message).toMatch(/Aspects not found for IDs/i)
    expect(response.body.errors).toEqual(
      expect.objectContaining({
        notFoundIds: expect.arrayContaining(invalidAspectIds)
      })
    )
  })

  test('Should return 400 if extractArticles is true and no document is provided', async () => {
    const LegalBasisData = generateLegalBasisData({
      subjectId: String(createdSubjectId),
      aspectsIds: JSON.stringify(createdAspectIds),
      extractArticles: 'true'
    })

    const response = await api
      .post('/api/legalBasis')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(LegalBasisData)
      .expect(400)

    expect(response.body.message).toBe(
      'A document must be provided if extractArticles is true'
    )
  })
  test('Should return 401 if the user is unauthorized', async () => {
    const legalBasisData = generateLegalBasisData({
      subjectId: String(createdSubjectId),
      aspectsIds: JSON.stringify(createdAspectIds)
    })
    const response = await api
      .post('/api/legalBasis')
      .send(legalBasisData)
      .expect(401)
      .expect('Content-Type', /application\/json/)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })

  describe('Validation Tests', () => {
    test('Should return 400 if legalName exceeds max length', async () => {
      const longName = 'A'.repeat(256)
      const legalBasisData = generateLegalBasisData({
        legalName: longName,
        subjectId: String(createdSubjectId),
        aspectsIds: JSON.stringify(createdAspectIds)
      })

      const response = await api
        .post('/api/legalBasis')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(legalBasisData)
        .expect(400)

      expect(response.body.message).toBe('Validation failed')
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          {
            field: 'legalName',
            message: expect.stringMatching(/exceed.*255 characters/i)
          }
        ])
      )
    })

    test('Should return 400 if abbreviation exceeds max length', async () => {
      const longAbbreviation = 'A'.repeat(256)
      const legalBasisData = generateLegalBasisData({
        subjectId: String(createdSubjectId),
        aspectsIds: JSON.stringify(createdAspectIds),
        abbreviation: longAbbreviation
      })

      const response = await api
        .post('/api/legalBasis')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(legalBasisData)
        .expect(400)

      expect(response.body.message).toMatch(/Validation failed/i)
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          {
            field: 'abbreviation',
            message: expect.stringMatching(/exceed.*255 characters/i)
          }
        ])
      )
    })

    test('Should return 400 if subjectId is not a valid number', async () => {
      const legalBasisData = generateLegalBasisData({
        subjectId: 'invalid-number',
        aspectsIds: JSON.stringify(createdAspectIds)
      })

      const response = await api
        .post('/api/legalBasis')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(legalBasisData)
        .expect(400)

      expect(response.body.message).toMatch(/Validation failed/i)
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          {
            field: 'subjectId',
            message: expect.stringMatching(/must be a valid number/i)
          }
        ])
      )
    })

    test('Should return 400 if aspectsIds contains invalid characters', async () => {
      const aspects = JSON.stringify(['invalid', '123', 'test'])
      const legalBasisData = generateLegalBasisData({
        subjectId: String(createdSubjectId),
        aspectsIds: aspects
      })

      const response = await api
        .post('/api/legalBasis')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(legalBasisData)
        .expect(400)

      expect(response.body.message).toMatch(/Validation failed/i)
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          {
            field: 'aspectsIds',
            message: expect.stringMatching(/must be a valid array of numbers/i)
          }
        ])
      )
    })

    test('Should return 400 if aspectsIds is an empty array', async () => {
      const aspects = JSON.stringify([])
      const legalBasisData = generateLegalBasisData({
        subjectId: String(createdSubjectId),
        aspectsIds: aspects
      })

      const response = await api
        .post('/api/legalBasis')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(legalBasisData)
        .expect(400)

      expect(response.body.message).toMatch(/Validation failed/i)
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          {
            field: 'aspectsIds',
            message: expect.stringMatching(/must contain at least one number/i)
          }
        ])
      )
    })

    test('Should return 400 if classification is invalid', async () => {
      const Classification = 'Invalid-Classification'
      const legalBasisData = generateLegalBasisData({
        subjectId: String(createdSubjectId),
        aspectsIds: JSON.stringify(createdAspectIds),
        classification: Classification
      })
      const response = await api
        .post('/api/legalBasis')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(legalBasisData)
        .expect(400)

      expect(response.body.message).toMatch(/Validation failed/i)
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          {
            field: 'classification',
            message: expect.stringMatching(
              /must be one of the following: Ley, Reglamento, Norma, Acuerdos, Código, Decreto, Lineamiento, Orden Jurídico, Aviso, Convocatoria, Plan, Programa, Recomendaciones/i
            )
          }
        ])
      )
    })
    test('Should return 400 if jurisdiction is invalid', async () => {
      const Jurisdiction = 'Invalid-Jurisdiction'
      const legalBasisData = generateLegalBasisData({
        subjectId: String(createdSubjectId),
        aspectsIds: JSON.stringify(createdAspectIds),
        jurisdiction: Jurisdiction
      })

      const response = await api
        .post('/api/legalBasis')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(legalBasisData)
        .expect(400)

      expect(response.body.message).toMatch(/Validation failed/i)
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          {
            field: 'jurisdiction',
            message: expect.stringMatching(
              /must be one of the following: Estatal, Federal, Local/i
            )
          }
        ])
      )
    })

    test('Should return 400 if state is provided for Federal jurisdiction', async () => {
      const legalBasisData = generateLegalBasisData({
        subjectId: String(createdSubjectId),
        aspectsIds: JSON.stringify(createdAspectIds),
        jurisdiction: 'Federal',
        state: 'state'
      })
      const response = await api
        .post('/api/legalBasis')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(legalBasisData)
        .expect(400)
      expect(response.body.message).toMatch(/Validation failed/i)
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          {
            field: 'state',
            message: expect.stringMatching(
              /should not be provided for Federal jurisdiction/i
            )
          }
        ])
      )
    })

    test('Should return 400 if municipality is provided for Federal jurisdiction', async () => {
      const legalBasisData = generateLegalBasisData({
        subjectId: String(createdSubjectId),
        aspectsIds: JSON.stringify(createdAspectIds),
        jurisdiction: 'Federal',
        municipality: 'municipality'
      })

      const response = await api
        .post('/api/legalBasis')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(legalBasisData)
        .expect(400)

      expect(response.body.message).toMatch(/Validation failed/i)
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          {
            field: 'municipality',
            message: expect.stringMatching(
              /should not be provided for Federal jurisdiction/i
            )
          }
        ])
      )
    })

    test('Should return 400 if state is missing for Estatal jurisdiction', async () => {
      const legalBasisData = generateLegalBasisData({
        subjectId: String(createdSubjectId),
        aspectsIds: JSON.stringify(createdAspectIds),
        jurisdiction: 'Estatal',
        state: ''
      })

      const response = await api
        .post('/api/legalBasis')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(legalBasisData)
        .expect(400)

      expect(response.body.message).toMatch(/Validation failed/i)
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          {
            field: 'state',
            message: expect.stringMatching(
              /must be provided for Estatal jurisdiction/i
            )
          }
        ])
      )
    })

    test('Should return 400 if municipality is provided for Estatal jurisdiction', async () => {
      const legalBasisData = generateLegalBasisData({
        subjectId: String(createdSubjectId),
        aspectsIds: JSON.stringify(createdAspectIds),
        jurisdiction: 'Estatal',
        state: 'state',
        municipality: 'municipality'
      })

      const response = await api
        .post('/api/legalBasis')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(legalBasisData)
        .expect(400)

      expect(response.body.message).toMatch(/Validation failed/i)
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          {
            field: 'municipality',
            message: expect.stringMatching(
              /should not be provided for Estatal jurisdiction/i
            )
          }
        ])
      )
    })

    test('Should return 400 if state or municipality is missing for Local jurisdiction', async () => {
      const legalBasisDataMissingState = generateLegalBasisData({
        subjectId: String(createdSubjectId),
        aspectsIds: JSON.stringify(createdAspectIds),
        jurisdiction: 'Local',
        state: '',
        municipality: 'municipality'
      })

      const legalBasisDataMissingMunicipality = generateLegalBasisData({
        subjectId: String(createdSubjectId),
        aspectsIds: JSON.stringify(createdAspectIds),
        jurisdiction: 'Local',
        state: 'state',
        municipality: ''
      })

      const responseMissingState = await api
        .post('/api/legalBasis')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(legalBasisDataMissingState)
        .expect(400)

      expect(responseMissingState.body.message).toMatch(/Validation failed/i)
      expect(responseMissingState.body.errors).toEqual(
        expect.arrayContaining([
          {
            field: 'state',
            message: expect.stringMatching(
              /must be provided for Local jurisdiction/i
            )
          }
        ])
      )
      const responseMissingMunicipality = await api
        .post('/api/legalBasis')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(legalBasisDataMissingMunicipality)
        .expect(400)
      expect(responseMissingMunicipality.body.message).toMatch(
        /Validation failed/i
      )
      expect(responseMissingMunicipality.body.errors).toEqual(
        expect.arrayContaining([
          {
            field: 'municipality',
            message: expect.stringMatching(
              /must be provided for Local jurisdiction/i
            )
          }
        ])
      )
    })
    test('Should return 400 if lastReform date format is invalid', async () => {
      const legalBasisData = generateLegalBasisData({
        subjectId: String(createdSubjectId),
        aspectsIds: JSON.stringify(createdAspectIds),
        lastReform: 'invalid-date'
      })

      const response = await api
        .post('/api/legalBasis')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(legalBasisData)
        .expect(400)

      expect(response.body.message).toMatch(/Validation failed/i)
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          {
            field: 'lastReform',
            message: expect.stringMatching(
              /must be a valid date in yyyy-mm-dd or dd-mm-yyyy format/i
            )
          }
        ])
      )
    })

    test('Should return 400 if document type is invalid', async () => {
      const document = Buffer.from('document')
      const legalBasisData = generateLegalBasisData({
        legalName: 'Normativa con Documento',
        abbreviation: 'DocTest',
        subjectId: String(createdSubjectId),
        aspectsIds: JSON.stringify(createdAspectIds),
        classification: 'Reglamento',
        jurisdiction: 'Federal',
        lastReform: '01-01-2024',
        extractArticles: 'true'
      })
      const response = await api
        .post('/api/legalBasis')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .attach('document', document, {
          filename: 'file.txt',
          contentType: 'text/plain'
        })
        .field('legalName', legalBasisData.legalName)
        .field('abbreviation', legalBasisData.abbreviation)
        .field('subjectId', legalBasisData.subjectId)
        .field('aspectsIds', legalBasisData.aspectsIds)
        .field('classification', legalBasisData.classification)
        .field('jurisdiction', legalBasisData.jurisdiction)
        .field('lastReform', legalBasisData.lastReform)
        .field('extractArticles', legalBasisData.extractArticles)
        .field('intelligenceLevel', legalBasisData.intelligenceLevel)
        .expect(400)
      expect(response.body.message).toMatch(/Validation failed/i)
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          {
            field: 'document',
            message: expect.stringMatching(
              /Invalid document type\. Allowed types are: pdf, png, jpeg/i
            )
          }
        ])
      )
    })

    test('Should return 400 if extractArticles has an invalid value', async () => {
      const legalBasisData = generateLegalBasisData({
        subjectId: String(createdSubjectId),
        aspectsIds: JSON.stringify(createdAspectIds),
        extractArticles: 'invalid-value'
      })
      const response = await api
        .post('/api/legalBasis')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(legalBasisData)
        .expect(400)
      expect(response.body.message).toMatch(/Validation failed/i)
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          {
            field: 'extractArticles',
            message: expect.stringMatching(/must be either "true" or "false"/i)
          }
        ])
      )
    })
  })
  test('Should return 400 if intelligenceLevel is invalid', async () => {
    const legalBasisData = generateLegalBasisData({
      subjectId: String(createdSubjectId),
      aspectsIds: JSON.stringify(createdAspectIds),
      intelligenceLevel: 'Medium'
    })

    const response = await api
      .post('/api/legalBasis')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(legalBasisData)
      .expect(400)

    expect(response.body.message).toMatch(/Validation failed/i)
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        {
          field: 'intelligenceLevel',
          message: 'The intelligenceLevel field must be either "High" or "Low"'
        }
      ])
    )
  })
})
describe('Get All Legal Basis', () => {
  beforeEach(async () => {
    await LegalBasisRepository.deleteAll()
  })

  test('Should return an empty array when no legal basis exists', async () => {
    const response = await api
      .get('/api/legalBasis')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)
      .expect('Content-Type', /application\/json/)

    expect(response.body.legalBasis).toBeInstanceOf(Array)
    expect(response.body.legalBasis).toHaveLength(0)
  })

  test('Should return all legal basis after creating one', async () => {
    const legalBasisData = generateLegalBasisData({
      subjectId: String(createdSubjectId),
      aspectsIds: JSON.stringify(createdAspectIds)
    })
    const createResponse = await api
      .post('/api/legalBasis')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(legalBasisData)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    const { legalBasis: createdLegalBasis } = createResponse.body

    const response = await api
      .get('/api/legalBasis')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const { legalBasis } = response.body

    expect(legalBasis).toBeInstanceOf(Array)
    expect(legalBasis).toHaveLength(1)
    expect(legalBasis[0]).toMatchObject({
      id: createdLegalBasis.id,
      legal_name: createdLegalBasis.legal_name,
      classification: createdLegalBasis.classification,
      jurisdiction: createdLegalBasis.jurisdiction,
      abbreviation: createdLegalBasis.abbreviation,
      state: createdLegalBasis.state,
      municipality: createdLegalBasis.municipality,
      last_reform: createdLegalBasis.last_reform,
      url: createdLegalBasis.url,
      fileKey: createdLegalBasis.fileKey,
      subject: expect.objectContaining({
        subject_id: createdSubjectId,
        subject_name: subjectName
      }),
      aspects: expect.arrayContaining(
        createdAspectIds.map((aspectId) =>
          expect.objectContaining({ aspect_id: aspectId })
        )
      )
    })
  })

  test('Should return 401 if user is unauthorized', async () => {
    const response = await api
      .get('/api/legalBasis')
      .expect(401)
      .expect('Content-Type', /application\/json/)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })
})

describe('Get Legal Basis By ID', () => {
  let createdLegalBasis

  beforeEach(async () => {
    await LegalBasisRepository.deleteAll()
    const legalBasisData = generateLegalBasisData({
      subjectId: String(createdSubjectId),
      aspectsIds: JSON.stringify(createdAspectIds)
    })
    const response = await api
      .post('/api/legalBasis')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(legalBasisData)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    createdLegalBasis = response.body.legalBasis
  })

  test('Should successfully retrieve a legal basis by its ID', async () => {
    const response = await api
      .get(`/api/legalBasis/${createdLegalBasis.id}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const { legalBasis } = response.body

    expect(legalBasis).toMatchObject({
      id: createdLegalBasis.id,
      legal_name: createdLegalBasis.legal_name,
      classification: createdLegalBasis.classification,
      jurisdiction: createdLegalBasis.jurisdiction,
      abbreviation: createdLegalBasis.abbreviation,
      state: createdLegalBasis.state,
      municipality: createdLegalBasis.municipality,
      last_reform: createdLegalBasis.last_reform,
      url: createdLegalBasis.url,
      fileKey: createdLegalBasis.fileKey,
      subject: expect.objectContaining({
        subject_id: createdSubjectId,
        subject_name: subjectName
      }),
      aspects: expect.arrayContaining(
        createdAspectIds.map((aspectId) =>
          expect.objectContaining({ aspect_id: aspectId })
        )
      )
    })
  })

  test('Should return 404 if the legal basis does not exist', async () => {
    const nonExistentId = '-1'
    const response = await api
      .get(`/api/legalBasis/${nonExistentId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(404)
      .expect('Content-Type', /application\/json/)

    expect(response.body.message).toMatch(/LegalBasis not found/i)
  })

  test('Should return 401 if user is unauthorized', async () => {
    const response = await api
      .get(`/api/legalBasis/${createdLegalBasis.id}`)
      .expect(401)
      .expect('Content-Type', /application\/json/)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })
})
describe('Get Legal Basis By Name', () => {
  let createdLegalBasis

  beforeEach(async () => {
    await LegalBasisRepository.deleteAll()
    const legalBasisData = generateLegalBasisData({
      legalName: 'Test Legal Basis',
      subjectId: String(createdSubjectId),
      aspectsIds: JSON.stringify(createdAspectIds)
    })

    const response = await api
      .post('/api/legalBasis')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(legalBasisData)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    createdLegalBasis = response.body.legalBasis
  })

  test('Should successfully retrieve a legal basis by its name', async () => {
    const response = await api
      .get('/api/legalBasis/name/name')
      .query({ name: createdLegalBasis.legal_name })
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const { legalBasis } = response.body
    expect(legalBasis).toHaveLength(1)
    expect(legalBasis[0]).toMatchObject({
      id: createdLegalBasis.id,
      legal_name: createdLegalBasis.legal_name,
      classification: createdLegalBasis.classification,
      jurisdiction: createdLegalBasis.jurisdiction,
      abbreviation: createdLegalBasis.abbreviation,
      state: createdLegalBasis.state,
      municipality: createdLegalBasis.municipality,
      last_reform: createdLegalBasis.last_reform,
      url: createdLegalBasis.url,
      fileKey: createdLegalBasis.fileKey,
      subject: expect.objectContaining({
        subject_id: createdSubjectId,
        subject_name: subjectName
      }),
      aspects: expect.arrayContaining(
        createdAspectIds.map((aspectId) =>
          expect.objectContaining({ aspect_id: aspectId })
        )
      )
    })
  })

  test('Should return an empty array if no legal basis is found', async () => {
    const response = await api
      .get('/api/legalBasis/name/name')
      .query({ name: 'NonExistent Legal Basis' })
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const { legalBasis } = response.body
    expect(legalBasis).toHaveLength(0)
  })

  test('Should return 401 if user is unauthorized', async () => {
    const response = await api
      .get('/api/legalBasis/name/name')
      .query({ name: createdLegalBasis.legal_name })
      .expect(401)
      .expect('Content-Type', /application\/json/)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })
})

describe('Get Legal Basis By Abbreviation', () => {
  let createdLegalBasis

  beforeEach(async () => {
    await LegalBasisRepository.deleteAll()
    const legalBasisData = generateLegalBasisData({
      abbreviation: 'TEST-ABBR',
      subjectId: String(createdSubjectId),
      aspectsIds: JSON.stringify(createdAspectIds)
    })

    const response = await api
      .post('/api/legalBasis')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(legalBasisData)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    createdLegalBasis = response.body.legalBasis
  })

  test('Should successfully retrieve a legal basis by its abbreviation', async () => {
    const response = await api
      .get('/api/legalBasis/abbreviation/abbreviation')
      .query({ abbreviation: createdLegalBasis.abbreviation })
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const { legalBasis } = response.body

    expect(legalBasis).toBeInstanceOf(Array)
    expect(legalBasis).toHaveLength(1)
    expect(legalBasis[0]).toMatchObject({
      id: createdLegalBasis.id,
      legal_name: createdLegalBasis.legal_name,
      classification: createdLegalBasis.classification,
      jurisdiction: createdLegalBasis.jurisdiction,
      abbreviation: createdLegalBasis.abbreviation,
      state: createdLegalBasis.state,
      municipality: createdLegalBasis.municipality,
      last_reform: createdLegalBasis.last_reform,
      url: createdLegalBasis.url,
      fileKey: createdLegalBasis.fileKey,
      subject: expect.objectContaining({
        subject_id: createdSubjectId,
        subject_name: subjectName
      }),
      aspects: expect.arrayContaining(
        createdAspectIds.map((aspectId) =>
          expect.objectContaining({ aspect_id: aspectId })
        )
      )
    })
  })

  test('Should return 404 if the legal basis with the abbreviation does not exist', async () => {
    const nonExistentAbbreviation = 'NON-EXISTENT'
    const response = await api
      .get('/api/legalBasis/abbreviation/abbreviation')
      .query({ abbreviation: nonExistentAbbreviation })
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)
      .expect('Content-Type', /application\/json/)

    expect(response.body.legalBasis).toBeInstanceOf(Array)
    expect(response.body.legalBasis).toHaveLength(0)
  })

  test('Should return 401 if user is unauthorized', async () => {
    const response = await api
      .get('/api/legalBasis/abbreviation/abbreviation')
      .query({ abbreviation: createdLegalBasis.abbreviation })
      .expect(401)
      .expect('Content-Type', /application\/json/)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })
})

describe('Get Legal Basis By Classification', () => {
  let createdLegalBasis

  beforeEach(async () => {
    await LegalBasisRepository.deleteAll()
    const legalBasisData = generateLegalBasisData({
      subjectId: String(createdSubjectId),
      aspectsIds: JSON.stringify(createdAspectIds)
    })
    const response = await api
      .post('/api/legalBasis')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(legalBasisData)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    createdLegalBasis = response.body.legalBasis
  })

  test('Should successfully retrieve legal basis by classification', async () => {
    const response = await api
      .get('/api/legalBasis/classification/classification')
      .query({ classification: createdLegalBasis.classification })
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const { legalBasis } = response.body

    expect(legalBasis).toBeInstanceOf(Array)
    expect(legalBasis).toHaveLength(1)
    expect(legalBasis[0]).toMatchObject({
      id: createdLegalBasis.id,
      legal_name: createdLegalBasis.legal_name,
      classification: createdLegalBasis.classification,
      jurisdiction: createdLegalBasis.jurisdiction,
      abbreviation: createdLegalBasis.abbreviation,
      state: createdLegalBasis.state,
      municipality: createdLegalBasis.municipality,
      last_reform: createdLegalBasis.last_reform,
      url: createdLegalBasis.url,
      fileKey: createdLegalBasis.fileKey,
      subject: expect.objectContaining({
        subject_id: createdSubjectId,
        subject_name: subjectName
      }),
      aspects: expect.arrayContaining(
        createdAspectIds.map((aspectId) =>
          expect.objectContaining({ aspect_id: aspectId })
        )
      )
    })
  })

  test('Should return 200 with an empty array if no legal basis exists for the classification', async () => {
    const nonExistentClassification = 'NonExistentClassification'
    const response = await api
      .get('/api/legalBasis/classification/classification')
      .query({ classification: nonExistentClassification })
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)
      .expect('Content-Type', /application\/json/)

    expect(response.body.legalBasis).toBeInstanceOf(Array)
    expect(response.body.legalBasis).toHaveLength(0)
  })

  test('Should return 401 if user is unauthorized', async () => {
    const response = await api
      .get('/api/legalBasis/classification/classification')
      .query({ classification: createdLegalBasis.classification })
      .expect(401)
      .expect('Content-Type', /application\/json/)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })
})

describe('Get Legal Basis By Jurisdiction', () => {
  let createdLegalBasis

  beforeEach(async () => {
    await LegalBasisRepository.deleteAll()
    const legalBasisData = generateLegalBasisData({
      subjectId: String(createdSubjectId),
      aspectsIds: JSON.stringify(createdAspectIds)
    })
    const response = await api
      .post('/api/legalBasis')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(legalBasisData)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    createdLegalBasis = response.body.legalBasis
  })

  test('Should successfully retrieve legal basis by jurisdiction', async () => {
    const response = await api
      .get('/api/legalBasis/jurisdiction/jurisdiction')
      .query({ jurisdiction: createdLegalBasis.jurisdiction })
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const { legalBasis } = response.body

    expect(legalBasis).toBeInstanceOf(Array)
    expect(legalBasis).toHaveLength(1)
    expect(legalBasis[0]).toMatchObject({
      id: createdLegalBasis.id,
      legal_name: createdLegalBasis.legal_name,
      classification: createdLegalBasis.classification,
      jurisdiction: createdLegalBasis.jurisdiction,
      abbreviation: createdLegalBasis.abbreviation,
      state: createdLegalBasis.state,
      municipality: createdLegalBasis.municipality,
      last_reform: createdLegalBasis.last_reform,
      url: createdLegalBasis.url,
      fileKey: createdLegalBasis.fileKey,
      subject: expect.objectContaining({
        subject_id: createdSubjectId,
        subject_name: subjectName
      }),
      aspects: expect.arrayContaining(
        createdAspectIds.map((aspectId) =>
          expect.objectContaining({ aspect_id: aspectId })
        )
      )
    })
  })

  test('Should return 200 with an empty array if no legal basis exists for the jurisdiction', async () => {
    const nonExistentJurisdiction = 'Mundial'
    const response = await api
      .get('/api/legalBasis/jurisdiction/jurisdiction')
      .query({ jurisdiction: nonExistentJurisdiction })
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)
      .expect('Content-Type', /application\/json/)

    expect(response.body.legalBasis).toBeInstanceOf(Array)
    expect(response.body.legalBasis).toHaveLength(0)
  })

  test('Should return 401 if user is unauthorized', async () => {
    const response = await api
      .get('/api/legalBasis/jurisdiction')
      .query({ jurisdiction: createdLegalBasis.jurisdiction })
      .expect(401)
      .expect('Content-Type', /application\/json/)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })
})

describe('Get Legal Basis By State', () => {
  let createdLegalBasis

  beforeEach(async () => {
    await LegalBasisRepository.deleteAll()
    const legalBasisData = generateLegalBasisData({
      jurisdiction: 'Estatal',
      state: 'Test State',
      subjectId: String(createdSubjectId),
      aspectsIds: JSON.stringify(createdAspectIds)
    })
    const response = await api
      .post('/api/legalBasis')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(legalBasisData)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    createdLegalBasis = response.body.legalBasis
  })

  test('Should successfully retrieve legal basis by state', async () => {
    const response = await api
      .get('/api/legalBasis/state/state')
      .query({ state: createdLegalBasis.state })
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const { legalBasis } = response.body

    expect(legalBasis).toBeInstanceOf(Array)
    expect(legalBasis).toHaveLength(1)
    expect(legalBasis[0]).toMatchObject({
      id: createdLegalBasis.id,
      legal_name: createdLegalBasis.legal_name,
      classification: createdLegalBasis.classification,
      jurisdiction: createdLegalBasis.jurisdiction,
      abbreviation: createdLegalBasis.abbreviation,
      state: createdLegalBasis.state,
      municipality: createdLegalBasis.municipality,
      last_reform: createdLegalBasis.last_reform,
      url: createdLegalBasis.url,
      fileKey: createdLegalBasis.fileKey,
      subject: expect.objectContaining({
        subject_id: createdSubjectId,
        subject_name: subjectName
      }),
      aspects: expect.arrayContaining(
        createdAspectIds.map((aspectId) =>
          expect.objectContaining({ aspect_id: aspectId })
        )
      )
    })
  })

  test('Should return an empty array if no legal basis exists for the state', async () => {
    const response = await api
      .get('/api/legalBasis/state/state')
      .query({ state: 'Non-existent' })
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)
      .expect('Content-Type', /application\/json/)

    expect(response.body.legalBasis).toBeInstanceOf(Array)
    expect(response.body.legalBasis).toHaveLength(0)
  })

  test('Should return 401 if user is unauthorized', async () => {
    const response = await api
      .get('/api/legalBasis/state/state')
      .query({ state: createdLegalBasis.state })
      .expect(401)
      .expect('Content-Type', /application\/json/)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })
})

describe('Get Legal Basis By State and Municipalities', () => {
  let createdLegalBasis

  beforeEach(async () => {
    await LegalBasisRepository.deleteAll()

    const legalBasisData = generateLegalBasisData({
      jurisdiction: 'Local',
      state: 'Test State',
      municipality: 'Test Municipality',
      subjectId: String(createdSubjectId),
      aspectsIds: JSON.stringify(createdAspectIds)
    })

    const response = await api
      .post('/api/legalBasis')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(legalBasisData)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    createdLegalBasis = response.body.legalBasis
  })

  test('Should successfully retrieve legal basis by state', async () => {
    const response = await api
      .get('/api/legalBasis/state/municipalities/query')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .query({ state: createdLegalBasis.state })
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const { legalBasis } = response.body

    expect(legalBasis).toBeInstanceOf(Array)
    expect(legalBasis).toHaveLength(1)
    expect(legalBasis[0]).toMatchObject({
      id: createdLegalBasis.id,
      legal_name: createdLegalBasis.legal_name,
      classification: createdLegalBasis.classification,
      jurisdiction: createdLegalBasis.jurisdiction,
      abbreviation: createdLegalBasis.abbreviation,
      state: createdLegalBasis.state,
      municipality: createdLegalBasis.municipality,
      last_reform: createdLegalBasis.last_reform,
      url: createdLegalBasis.url,
      fileKey: createdLegalBasis.fileKey,
      subject: expect.objectContaining({
        subject_id: createdSubjectId,
        subject_name: subjectName
      }),
      aspects: expect.arrayContaining(
        createdAspectIds.map((aspectId) =>
          expect.objectContaining({ aspect_id: aspectId })
        )
      )
    })
  })

  test('Should successfully retrieve legal basis by state and specific municipalities', async () => {
    const response = await api
      .get('/api/legalBasis/state/municipalities/query')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .query({
        state: createdLegalBasis.state,
        municipalities: [createdLegalBasis.municipality]
      })
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const { legalBasis } = response.body

    expect(legalBasis).toBeInstanceOf(Array)
    expect(legalBasis).toHaveLength(1)
    expect(legalBasis[0]).toMatchObject({
      id: createdLegalBasis.id,
      state: createdLegalBasis.state,
      municipality: createdLegalBasis.municipality
    })
  })

  test('Should return 400 error if municipalities are provided but state is missing', async () => {
    const response = await api
      .get('/api/legalBasis/state/municipalities/query')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .query({ municipalities: ['Test Municipality'] })
      .expect(400)
      .expect('Content-Type', /application\/json/)

    expect(response.body).toMatchObject({
      message: 'State is required if municipalities are provided'
    })
  })

  test('Should return an empty array if no legal basis exists for the state and municipalities', async () => {
    const response = await api
      .get('/api/legalBasis/state/municipalities/query')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .query({
        state: 'Non-existent',
        municipalities: ['Non-existent Municipality']
      })
      .expect(200)
      .expect('Content-Type', /application\/json/)

    expect(response.body.legalBasis).toBeInstanceOf(Array)
    expect(response.body.legalBasis).toHaveLength(0)
  })

  test('Should return 401 if user is unauthorized', async () => {
    const response = await api
      .get('/api/legalBasis/state/municipalities/query')
      .query({ state: 'Test State' })
      .expect(401)
      .expect('Content-Type', /application\/json/)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })
})

describe('Get Legal Basis By Subject', () => {
  let createdLegalBasis

  beforeEach(async () => {
    await LegalBasisRepository.deleteAll()

    const legalBasisData = generateLegalBasisData({
      subjectId: String(createdSubjectId),
      aspectsIds: JSON.stringify(createdAspectIds)
    })

    const response = await api
      .post('/api/legalBasis')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(legalBasisData)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    createdLegalBasis = response.body.legalBasis
  })

  test('Should successfully retrieve legal basis by subjectId', async () => {
    const response = await api
      .get(`/api/legalBasis/subject/${createdLegalBasis.subject.subject_id}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const { legalBasis } = response.body

    expect(legalBasis).toBeInstanceOf(Array)
    expect(legalBasis).toHaveLength(1)
    expect(legalBasis[0]).toMatchObject({
      id: createdLegalBasis.id,
      legal_name: createdLegalBasis.legal_name,
      classification: createdLegalBasis.classification,
      jurisdiction: createdLegalBasis.jurisdiction,
      abbreviation: createdLegalBasis.abbreviation,
      state: createdLegalBasis.state,
      municipality: createdLegalBasis.municipality,
      last_reform: createdLegalBasis.last_reform,
      url: createdLegalBasis.url,
      fileKey: createdLegalBasis.fileKey,
      subject: expect.objectContaining({
        subject_id: createdSubjectId,
        subject_name: subjectName
      }),
      aspects: expect.arrayContaining(
        createdAspectIds.map((aspectId) =>
          expect.objectContaining({ aspect_id: aspectId })
        )
      )
    })
  })

  test('Should return 404 if the subjectId does not exist', async () => {
    const nonExistentSubjectId = '-1'
    const response = await api
      .get(`/api/legalBasis/subject/${nonExistentSubjectId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(404)
      .expect('Content-Type', /application\/json/)

    expect(response.body.message).toMatch(/Subject not found/i)
  })

  test('Should return an empty array if no legal basis exists for a valid subjectId', async () => {
    const newSubjectResponse = await api
      .post('/api/subjects')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ subjectName: 'Subject-Test' })
      .expect(201)
      .expect('Content-Type', /application\/json/)

    const newSubjectId = newSubjectResponse.body.subject.id

    const response = await api
      .get(`/api/legalBasis/subject/${newSubjectId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)
      .expect('Content-Type', /application\/json/)

    expect(response.body.legalBasis).toBeInstanceOf(Array)
    expect(response.body.legalBasis).toHaveLength(0)
  })

  test('Should return 401 if user is unauthorized', async () => {
    const response = await api
      .get(`/api/legalBasis/subject/${createdSubjectId}`)
      .expect(401)
      .expect('Content-Type', /application\/json/)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })
})
describe('Get Legal Basis By Subject And Aspects', () => {
  let createdLegalBasis

  beforeEach(async () => {
    await LegalBasisRepository.deleteAll()

    const legalBasisData = generateLegalBasisData({
      subjectId: String(createdSubjectId),
      aspectsIds: JSON.stringify(createdAspectIds)
    })

    const response = await api
      .post('/api/legalBasis')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(legalBasisData)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    createdLegalBasis = response.body.legalBasis
  })

  test('Should successfully retrieve legal basis by subjectId and aspects', async () => {
    const response = await api
      .get(`/api/legalBasis/subject/${createdLegalBasis.subject.subject_id}/aspects`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .query({ aspectIds: createdAspectIds })
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const { legalBasis } = response.body

    expect(legalBasis).toBeInstanceOf(Array)
    expect(legalBasis).toHaveLength(1)
    expect(legalBasis[0]).toMatchObject({
      id: createdLegalBasis.id,
      legal_name: createdLegalBasis.legal_name,
      classification: createdLegalBasis.classification,
      jurisdiction: createdLegalBasis.jurisdiction,
      abbreviation: createdLegalBasis.abbreviation,
      state: createdLegalBasis.state,
      municipality: createdLegalBasis.municipality,
      last_reform: createdLegalBasis.last_reform,
      url: createdLegalBasis.url,
      fileKey: createdLegalBasis.fileKey,
      subject: expect.objectContaining({
        subject_id: createdSubjectId,
        subject_name: subjectName
      }),
      aspects: expect.arrayContaining(
        createdAspectIds.map((aspectId) =>
          expect.objectContaining({ aspect_id: aspectId })
        )
      )
    })
  })

  test('Should return 404 if the subjectId does not exist', async () => {
    const nonExistentSubjectId = '-1'
    const response = await api
      .get(`/api/legalBasis/subject/${nonExistentSubjectId}/aspects`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .query({ aspectIds: createdAspectIds })
      .expect(404)
      .expect('Content-Type', /application\/json/)

    expect(response.body.message).toMatch(/Subject not found/i)
  })

  test('Should return 404 if aspects do not exist', async () => {
    const invalidAspectIds = [-1, -2]
    const response = await api
      .get(`/api/legalBasis/subject/${createdLegalBasis.subject.subject_id}/aspects`)
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
      .get(`/api/legalBasis/subject/${createdLegalBasis.subject.subject_id}/aspects`)
      .query({ aspectIds: createdAspectIds })
      .expect(401)
      .expect('Content-Type', /application\/json/)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })
  describe('Get Legal Basis By Last Reform', () => {
    let createdLegalBasis

    beforeEach(async () => {
      await LegalBasisRepository.deleteAll()
      const legalBasisData = generateLegalBasisData({
        subjectId: String(createdSubjectId),
        aspectsIds: JSON.stringify(createdAspectIds),
        lastReform: '01-01-2024'
      })

      const response = await api
        .post('/api/legalBasis')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(legalBasisData)
        .expect(201)
        .expect('Content-Type', /application\/json/)

      createdLegalBasis = response.body.legalBasis
    })
    test('Should return 400 if both "from" and "to" are missing', async () => {
      const response = await api
        .get('/api/legalBasis/lastReform/lastReform')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(400)
        .expect('Content-Type', /application\/json/)

      expect(response.body.message).toMatch(/Validation failed/i)
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'from',
            message: expect.stringMatching(/At least one of "from" or "to"/i)
          }),
          expect.objectContaining({
            field: 'to',
            message: expect.stringMatching(/At least one of "from" or "to"/i)
          })
        ])
      )
    })

    test('Should return 400 if only "from" is provided', async () => {
      const response = await api
        .get('/api/legalBasis/lastReform/lastReform')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .query({ from: '2024-01-01' })
        .expect(400)
        .expect('Content-Type', /application\/json/)

      expect(response.body.message).toMatch(/Validation failed/i)
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'to',
            message: expect.stringMatching(
              /The "to" date must be provided when "from" is specified/i
            )
          })
        ])
      )
    })

    test('Should return 400 if only "to" is provided', async () => {
      const response = await api
        .get('/api/legalBasis/lastReform/lastReform')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .query({ to: '2024-12-31' })
        .expect(400)
        .expect('Content-Type', /application\/json/)

      expect(response.body.message).toMatch(/Validation failed/i)
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'from',
            message: expect.stringMatching(
              /The "from" date must be provided when "to" is specified/i
            )
          })
        ])
      )
    })

    test('Should return 400 if "from" date is invalid', async () => {
      const response = await api
        .get('/api/legalBasis/lastReform/lastReform')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .query({ from: 'invalid-date', to: '2024-12-31' })
        .expect(400)
        .expect('Content-Type', /application\/json/)

      expect(response.body.message).toMatch(/Validation failed/i)
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'from',
            message: expect.stringMatching(/is not a valid date/i)
          })
        ])
      )
    })

    test('Should return 400 if "to" date is invalid', async () => {
      const response = await api
        .get('/api/legalBasis/lastReform/lastReform')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .query({ from: '2024-01-01', to: 'invalid-date' })
        .expect(400)
        .expect('Content-Type', /application\/json/)

      expect(response.body.message).toMatch(/Validation failed/i)
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'to',
            message: expect.stringMatching(/is not a valid date/i)
          })
        ])
      )
    })

    test('Should return 200 and legal basis if valid "from" and "to" are provided', async () => {
      const response = await api
        .get('/api/legalBasis/lastReform/lastReform')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .query({ from: '2024-01-01', to: '2024-12-31' })
        .expect(200)
        .expect('Content-Type', /application\/json/)

      const { legalBasis } = response.body
      expect(legalBasis).toBeInstanceOf(Array)
      expect(legalBasis).toHaveLength(1)
      expect(legalBasis[0]).toMatchObject({
        id: createdLegalBasis.id,
        legal_name: createdLegalBasis.legal_name,
        classification: createdLegalBasis.classification,
        jurisdiction: createdLegalBasis.jurisdiction,
        abbreviation: createdLegalBasis.abbreviation,
        state: createdLegalBasis.state,
        municipality: createdLegalBasis.municipality,
        last_reform: createdLegalBasis.last_reform,
        url: createdLegalBasis.url,
        fileKey: createdLegalBasis.fileKey
      })
    })

    test('Should return 401 if the user is unauthorized', async () => {
      const response = await api
        .get('/api/legalBasis/lastReform/lastReform')
        .query({ from: '2024-01-01', to: '2024-12-31' })
        .expect(401)
        .expect('Content-Type', /application\/json/)

      expect(response.body.error).toMatch(/token missing or invalid/i)
    })
  })

  describe('Update a Legal Basis', () => {
    let createdLegalBasis
    beforeEach(async () => {
      await LegalBasisRepository.deleteAll()

      const legalBasisData = generateLegalBasisData({
        subjectId: String(createdSubjectId),
        aspectsIds: JSON.stringify(createdAspectIds)
      })
      const response = await api
        .post('/api/legalBasis')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(legalBasisData)
        .expect(201)
        .expect('Content-Type', /application\/json/)

      createdLegalBasis = response.body.legalBasis
    })

    test('Should successfully update a legal basis without a document', async () => {
      const updatedData = generateLegalBasisData({
        legalName: 'Updated Legal Name',
        subjectId: String(createdSubjectId),
        aspectsIds: JSON.stringify(createdAspectIds)
      })

      const updateResponse = await api
        .patch(`/api/legalBasis/${createdLegalBasis.id}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(updatedData)
        .expect(200)
        .expect('Content-Type', /application\/json/)

      const { jobId, legalBasis: updatedLegalBasis } = updateResponse.body
      expect(jobId).toBeNull()

      expect(updatedLegalBasis).toMatchObject({
        ...createdLegalBasis,
        legal_name: updatedData.legalName,
        abbreviation: updatedData.abbreviation,
        classification: updatedData.classification,
        jurisdiction: updatedData.jurisdiction,
        last_reform: updatedData.lastReform
      })

      expect(updatedLegalBasis.aspects).toEqual(
        expect.arrayContaining(
          createdAspectIds.map((aspectId) =>
            expect.objectContaining({ aspect_id: aspectId })
          )
        )
      )
      expect(updatedLegalBasis.subject).toMatchObject({
        subject_id: createdSubjectId,
        subject_name: subjectName
      })
      const getResponse = await api
        .get(`/api/legalBasis/${createdLegalBasis.id}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200)
        .expect('Content-Type', /application\/json/)

      const { legalBasis: retrievedLegalBasis } = getResponse.body
      expect(retrievedLegalBasis).toMatchObject({
        id: createdLegalBasis.id,
        legal_name: updatedLegalBasis.legal_name,
        classification: updatedLegalBasis.classification,
        jurisdiction: updatedLegalBasis.jurisdiction,
        abbreviation: updatedLegalBasis.abbreviation,
        state: updatedLegalBasis.state,
        municipality: updatedLegalBasis.municipality,
        last_reform: updatedLegalBasis.last_reform,
        url: updatedLegalBasis.url,
        fileKey: updatedLegalBasis.fileKey,
        subject: expect.objectContaining({
          subject_id: createdSubjectId,
          subject_name: subjectName
        }),
        aspects: expect.arrayContaining(
          createdAspectIds.map((aspectId) =>
            expect.objectContaining({ aspect_id: aspectId })
          )
        )
      })
    })
    test('Should successfully update a legal basis with a document and return a jobId', async () => {
      const document = Buffer.from('mock pdf content')
      const updatedData = generateLegalBasisData({
        legalName: 'Updated Legal Name with Document',
        subjectId: String(createdSubjectId),
        aspectsIds: JSON.stringify(createdAspectIds),
        extractArticles: 'true'
      })

      const updateResponse = await api
        .patch(`/api/legalBasis/${createdLegalBasis.id}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .attach('document', document, {
          filename: 'file.pdf',
          contentType: 'application/pdf'
        })
        .field('legalName', updatedData.legalName)
        .field('abbreviation', updatedData.abbreviation)
        .field('subjectId', updatedData.subjectId)
        .field('aspectsIds', updatedData.aspectsIds)
        .field('classification', updatedData.classification)
        .field('jurisdiction', updatedData.jurisdiction)
        .field('lastReform', updatedData.lastReform)
        .field('extractArticles', updatedData.extractArticles)
        .expect(200)
        .expect('Content-Type', /application\/json/)

      const { jobId, legalBasis: updatedLegalBasis } = updateResponse.body
      expect(jobId).not.toBeNull()
      expect(typeof jobId).toBe('string')
      expect(updatedLegalBasis).toMatchObject({
        ...createdLegalBasis,
        legal_name: updatedData.legalName,
        abbreviation: updatedData.abbreviation,
        classification: updatedData.classification,
        jurisdiction: updatedData.jurisdiction,
        last_reform: updatedData.lastReform,
        url: expect.stringContaining('file.pdf'),
        fileKey: expect.stringContaining('file.pdf')
      })
      expect(updatedLegalBasis.aspects).toEqual(
        expect.arrayContaining(
          createdAspectIds.map((aspectId) =>
            expect.objectContaining({ aspect_id: aspectId })
          )
        )
      )
      expect(updatedLegalBasis.subject).toMatchObject({
        subject_id: createdSubjectId,
        subject_name: subjectName
      })
    })
    test('Should return 404 when trying to update a non-existing legal basis', async () => {
      const nonExistentId = -1
      const updatedData = generateLegalBasisData({
        legalName: 'Non-Existent',
        subjectId: String(createdSubjectId),
        aspectsIds: JSON.stringify(createdAspectIds)
      })

      const response = await api
        .patch(`/api/legalBasis/${nonExistentId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(updatedData)
        .expect(404)
        .expect('Content-Type', /application\/json/)

      expect(response.body.message).toMatch(/LegalBasis not found/i)
    })

    test('Should return 409 when trying to update a legal basis with a duplicate name', async () => {
      const LegalBasisData = generateLegalBasisData({
        legalName: 'Duplicate Name',
        abbreviation: 'Duplicate Abbreviation',
        subjectId: String(createdSubjectId),
        aspectsIds: JSON.stringify(createdAspectIds)
      })

      await api
        .post('/api/legalBasis')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(LegalBasisData)
        .expect(201)
        .expect('Content-Type', /application\/json/)

      const response = await api
        .patch(`/api/legalBasis/${createdLegalBasis.id}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(LegalBasisData)
        .expect(409)
        .expect('Content-Type', /application\/json/)

      expect(response.body.message).toMatch(/LegalBasis already exists/i)
    })
    test('Should return 409 when trying to update a legal basis with a duplicate abbreviation', async () => {
      const firstLegalBasisData = generateLegalBasisData({
        legalName: 'First Legal Basis',
        abbreviation: 'DUPLICATE_ABBR',
        subjectId: String(createdSubjectId),
        aspectsIds: JSON.stringify(createdAspectIds)
      })

      await api
        .post('/api/legalBasis')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(firstLegalBasisData)
        .expect(201)
        .expect('Content-Type', /application\/json/)

      const secondLegalBasisData = generateLegalBasisData({
        legalName: 'Second Legal Basis',
        abbreviation: 'UNIQUE_ABBR',
        subjectId: String(createdSubjectId),
        aspectsIds: JSON.stringify(createdAspectIds)
      })

      const creationResponse = await api
        .post('/api/legalBasis')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(secondLegalBasisData)
        .expect(201)
        .expect('Content-Type', /application\/json/)
      const createdLegalBasis = creationResponse.body.legalBasis
      const response = await api
        .patch(`/api/legalBasis/${createdLegalBasis.id}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
          ...secondLegalBasisData,
          abbreviation: 'DUPLICATE_ABBR'
        })
        .expect(409)
        .expect('Content-Type', /application\/json/)

      expect(response.body.message).toMatch(/LegalBasis abbreviation already exists/i)
    })

    test('Should return 404 if Subject ID is invalid', async () => {
      const updatedData = generateLegalBasisData({
        legalName: 'Updated Legal Name',
        subjectId: '-1',
        aspectsIds: JSON.stringify(createdAspectIds)
      })
      const response = await api
        .patch(`/api/legalBasis/${createdLegalBasis.id}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(updatedData)
        .expect(404)
        .expect('Content-Type', /application\/json/)
      expect(response.body.message).toMatch(/Subject not found/i)
    })
    test('Should return 404 if Aspect IDs are invalid when updating a legal basis', async () => {
      const invalidAspectIds = ['-1, -2']
      const updatedData = generateLegalBasisData({
        legalName: 'Updated Legal Name',
        subjectId: String(createdSubjectId),
        aspectsIds: JSON.stringify(invalidAspectIds)
      })

      const response = await api
        .patch(`/api/legalBasis/${createdLegalBasis.id}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(updatedData)
        .expect(404)
        .expect('Content-Type', /application\/json/)

      expect(response.body.message).toMatch(/Aspects not found for IDs/i)
      expect(response.body.errors).toEqual(
        expect.objectContaining({
          notFoundIds: expect.arrayContaining(invalidAspectIds)
        })
      )
    })
    test('Should return 400 if removeDocument is true and a document is provided', async () => {
      const document = Buffer.from('mock pdf content')
      const updatedData = generateLegalBasisData({
        legalName: 'Updated Legal Name',
        subjectId: String(createdSubjectId),
        aspectsIds: JSON.stringify(createdAspectIds),
        removeDocument: 'true'
      })

      const response = await api
        .patch(`/api/legalBasis/${createdLegalBasis.id}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .attach('document', document, {
          filename: 'file.pdf',
          contentType: 'application/pdf'
        })
        .field('legalName', updatedData.legalName)
        .field('abbreviation', updatedData.abbreviation)
        .field('subjectId', updatedData.subjectId)
        .field('aspectsIds', updatedData.aspectsIds)
        .field('classification', updatedData.classification)
        .field('jurisdiction', updatedData.jurisdiction)
        .field('lastReform', updatedData.lastReform)
        .field('removeDocument', updatedData.removeDocument)
        .field('extractArticles', updatedData.extractArticles)
        .field('intelligenceLevel', updatedData.intelligenceLevel)
        .expect(400)
        .expect('Content-Type', /application\/json/)

      expect(response.body.message).toBe(
        'Cannot provide a document if removeDocument is true'
      )
    })
    test('Should return 400 if extractArticles is true and no document is provided', async () => {
      const updatedData = generateLegalBasisData({
        legalName: 'Updated Legal Name',
        subjectId: String(createdSubjectId),
        aspectsIds: JSON.stringify(createdAspectIds),
        extractArticles: 'true'
      })
      const response = await api
        .patch(`/api/legalBasis/${createdLegalBasis.id}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(updatedData)
        .expect(400)
        .expect('Content-Type', /application\/json/)

      expect(response.body.message).toBe(
        'A document must be provided if extractArticles is true'
      )
    })
    test('Should return 409 if removeDocument is true and there are pending jobs for the legal basis', async () => {
      jest.spyOn(extractArticles, 'hasPendingJobs').mockResolvedValue({
        hasPendingJobs: true,
        jobId: '12345'
      })
      const updatedData = generateLegalBasisData({
        legalName: 'Updated Legal Name',
        subjectId: String(createdSubjectId),
        aspectsIds: JSON.stringify(createdAspectIds),
        removeDocument: 'true'
      })

      const response = await api
        .patch(`/api/legalBasis/${createdLegalBasis.id}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(updatedData)
        .expect(409)
        .expect('Content-Type', /application\/json/)
      expect(response.body.message).toBe(
        'The document cannot be removed because there are pending jobs for this Legal Basis'
      )
    })
    test('Should return 409 if attempting to extract articles with a new document while there are pending jobs for the Legal Basis', async () => {
      jest.spyOn(extractArticles, 'hasPendingJobs').mockResolvedValue({
        hasPendingJobs: true,
        jobId: '12345'
      })

      const document = Buffer.from('mock pdf content')
      const updatedData = generateLegalBasisData({
        legalName: 'Updated Legal Name with Document',
        subjectId: String(createdSubjectId),
        aspectsIds: JSON.stringify(createdAspectIds),
        extractArticles: 'true'
      })

      const response = await api
        .patch(`/api/legalBasis/${createdLegalBasis.id}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .attach('document', document, {
          filename: 'file.pdf',
          contentType: 'application/pdf'
        })
        .field('legalName', updatedData.legalName)
        .field('abbreviation', updatedData.abbreviation)
        .field('subjectId', updatedData.subjectId)
        .field('aspectsIds', updatedData.aspectsIds)
        .field('classification', updatedData.classification)
        .field('jurisdiction', updatedData.jurisdiction)
        .field('lastReform', updatedData.lastReform)
        .field('extractArticles', updatedData.extractArticles)
        .field('intelligenceLevel', updatedData.intelligenceLevel)
        .expect(409)
        .expect('Content-Type', /application\/json/)

      expect(response.body.message).toBe(
        'A new document cannot be uploaded because there are pending jobs for this Legal Basis'
      )
    })

    test('Should return 409 if extractArticles is true and there are pending jobs for the Legal Basis', async () => {
      jest.spyOn(extractArticles, 'hasPendingJobs').mockResolvedValue({
        hasPendingJobs: true,
        jobId: '12345'
      })

      const legalBasisData = generateLegalBasisData({
        legalName: 'Legal Basis with Document',
        abbreviation: 'Duplicate Abbreviation',
        subjectId: String(createdSubjectId),
        aspectsIds: JSON.stringify(createdAspectIds),
        extractArticles: 'true'
      })

      const document = Buffer.from('mock pdf content')
      const creationResponse = await api
        .post('/api/legalBasis')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .attach('document', document, {
          filename: 'file.pdf',
          contentType: 'application/pdf'
        })
        .field('legalName', legalBasisData.legalName)
        .field('abbreviation', legalBasisData.abbreviation)
        .field('subjectId', legalBasisData.subjectId)
        .field('aspectsIds', legalBasisData.aspectsIds)
        .field('classification', legalBasisData.classification)
        .field('jurisdiction', legalBasisData.jurisdiction)
        .field('lastReform', legalBasisData.lastReform)
        .field('extractArticles', legalBasisData.extractArticles)
        .field('intelligenceLevel', legalBasisData.intelligenceLevel)
        .expect(201)
        .expect('Content-Type', /application\/json/)

      const createdLegalBasis = creationResponse.body.legalBasis

      const updatedData = generateLegalBasisData({
        legalName: 'Updated Legal Name',
        abbreviation: 'Update Abbreviation',
        subjectId: String(createdSubjectId),
        aspectsIds: JSON.stringify(createdAspectIds),
        extractArticles: 'true'
      })

      const response = await api
        .patch(`/api/legalBasis/${createdLegalBasis.id}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .field('legalName', updatedData.legalName)
        .field('abbreviation', updatedData.abbreviation)
        .field('subjectId', updatedData.subjectId)
        .field('aspectsIds', updatedData.aspectsIds)
        .field('classification', updatedData.classification)
        .field('jurisdiction', updatedData.jurisdiction)
        .field('lastReform', updatedData.lastReform)
        .field('extractArticles', updatedData.extractArticles)
        .field('intelligenceLevel', updatedData.intelligenceLevel)
        .expect(409)
        .expect('Content-Type', /application\/json/)

      expect(response.body.message).toBe(
        'Articles cannot be extracted because there is already a process that does so'
      )
    })

    test('Should return 401 if the user is unauthorized', async () => {
      const updatedData = generateLegalBasisData({
        legalName: 'Updated Legal Name',
        subjectId: String(createdSubjectId),
        aspectsIds: JSON.stringify(createdAspectIds)
      })

      const response = await api
        .patch(`/api/legalBasis/${createdLegalBasis.id}`)
        .send(updatedData)
        .expect(401)
        .expect('Content-Type', /application\/json/)

      expect(response.body.error).toMatch(/token missing or invalid/i)
    }
    )
  })

  describe('Delete Legal Basis By ID', () => {
    let createdLegalBasis
    beforeEach(async () => {
      await LegalBasisRepository.deleteAll()
      const legalBasisData = generateLegalBasisData({
        subjectId: String(createdSubjectId),
        aspectsIds: JSON.stringify(createdAspectIds)
      })
      const response = await api
        .post('/api/legalBasis')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(legalBasisData)
        .expect(201)
        .expect('Content-Type', /application\/json/)

      createdLegalBasis = response.body.legalBasis
    })

    test('Should delete a legal basis and return 204 status', async () => {
      await api
        .delete(`/api/legalBasis/${createdLegalBasis.id}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(204)
      const response = await api
        .get('/api/legalBasis')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200)

      const { legalBasis } = response.body

      expect(legalBasis).toBeInstanceOf(Array)
      expect(legalBasis).not.toContainEqual(
        expect.objectContaining({ id: createdLegalBasis.id })
      )
    })
    test('Should return 404 if the legal basis does not exist', async () => {
      const nonExistentId = '-1'
      const response = await api
        .delete(`/api/legalBasis/${nonExistentId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(404)

      expect(response.body.message).toMatch(/LegalBasis not found/i)
    })
    test('Should return 409 if the legal basis has pending jobs', async () => {
      jest
        .spyOn(extractArticles, 'hasPendingJobs')
        .mockResolvedValue({ hasPendingJobs: true })
      const response = await api
        .delete(`/api/legalBasis/${createdLegalBasis.id}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(409)

      expect(response.body.message).toMatch(
        /Cannot delete LegalBasis with pending jobs/i
      )
    })
    test('Should return 401 if the user is unauthorized', async () => {
      const response = await api
        .delete(`/api/legalBasis/${createdLegalBasis.id}`)
        .expect(401)
        .expect('Content-Type', /application\/json/)
      expect(response.body.error).toMatch(/token missing or invalid/i)
    })
  })

  describe('Delete Multiple Legal Bases By IDs', () => {
    let createdLegalBasis
    beforeEach(async () => {
      await LegalBasisRepository.deleteAll()
      const legalBasisData = generateLegalBasisData({
        subjectId: String(createdSubjectId),
        aspectsIds: JSON.stringify(createdAspectIds)
      })
      const response = await api
        .post('/api/legalBasis')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(legalBasisData)
        .expect(201)
        .expect('Content-Type', /application\/json/)
      createdLegalBasis = response.body.legalBasis
      jest.spyOn(extractArticles, 'hasPendingJobs').mockResolvedValue({ hasPendingJobs: false })
    })

    test('Should delete multiple legal bases and return 204 status', async () => {
      const idToDelete = [createdLegalBasis.id]
      await api
        .delete('/api/legalBasis/delete/batch')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ legalBasisIds: idToDelete })
        .expect(204)

      const response = await api
        .get('/api/legalBasis')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200)

      const { legalBasis } = response.body

      expect(legalBasis).toBeInstanceOf(Array)
      expect(legalBasis).not.toContainEqual(
        expect.objectContaining({ id: createdLegalBasis.id })
      )
    })
    test('Should return 404 if any legal basis does not exist', async () => {
      const nonExistentIds = ['-1', '-2']
      const response = await api
        .delete('/api/legalBasis/delete/batch')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ legalBasisIds: nonExistentIds })
        .expect(404)

      expect(response.body.message).toMatch(/LegalBasis not found for IDs/i)
      expect(response.body.errors.notFoundIds).toEqual(nonExistentIds)
    })

    test('Should return 400 if no legalBasisIds are provided', async () => {
      const response = await api
        .delete('/api/legalBasis/delete/batch')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({})
        .expect(400)

      expect(response.body.message).toMatch(/Missing required fields: legalBasisIds/i)
    })
    test('Should return 409 if the legal basis has pending jobs', async () => {
      const idToDelete = createdLegalBasis.id
      jest.spyOn(extractArticles, 'hasPendingJobs').mockImplementation(async (id) => {
        return { hasPendingJobs: id === idToDelete }
      })
      const response = await api
        .delete('/api/legalBasis/delete/batch')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ legalBasisIds: [idToDelete] })
        .expect(409)
      expect(response.body.message).toMatch(/Cannot delete Legal Bases with pending jobs/i)
      expect(response.body.errors.LegalBases).toContainEqual(
        expect.objectContaining({
          id: idToDelete,
          name: createdLegalBasis.legal_name
        })
      )
    })
    test('Should return 401 if the user is unauthorized', async () => {
      const idToDelete = [createdLegalBasis.id]

      const response = await api
        .delete('/api/legalBasis/delete/batch')
        .send({ legalBasisIds: idToDelete })
        .expect(401)
        .expect('Content-Type', /application\/json/)

      expect(response.body.error).toMatch(/token missing or invalid/i)
    })
  })
})
