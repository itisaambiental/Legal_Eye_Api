/* eslint-disable no-undef */
import { api } from '../../config/test.config.js'
import UserRepository from '../../repositories/User.repository.js'
import ReqIdentificationRepository from '../../repositories/ReqIdentification.repository.js'
import RequirementRepository from '../../repositories/Requirements.repository.js'
import SubjectsRepository from '../../repositories/Subject.repository.js'
import AspectsRepository from '../../repositories/Aspects.repository.js'
import LegalBasisRepository from '../../repositories/LegalBasis.repository.js'
import ArticlesRepository from '../../repositories/Articles.repository.js'
import generateReqIdentificationData from '../../utils/generateReqIdentificationData.js'
import generateLegalBasisData from '../../utils/generateLegalBasisData.js'
import generateRequirementData from '../../utils/generateRequirementData.js'
import reqIdentificationQueue from '../../queues/reqIdentificationQueue.js'
import {
  ADMIN_GMAIL,
  ADMIN_PASSWORD_TEST
} from '../../config/variables.config.js'
import jwt from 'jsonwebtoken'

let tokenAdmin
const timeout = 65000

beforeAll(async () => {
  await ReqIdentificationRepository.deleteAll()
  await RequirementRepository.deleteAll()
  await LegalBasisRepository.deleteAll()
  await ArticlesRepository.deleteAll()
  await SubjectsRepository.deleteAll()
  await AspectsRepository.deleteAll()
  await UserRepository.deleteAllExceptByGmail(ADMIN_GMAIL)

  const loginResponse = await api
    .post('/api/user/login')
    .send({ gmail: ADMIN_GMAIL, password: ADMIN_PASSWORD_TEST })
    .expect(200)

  tokenAdmin = loginResponse.body.token
}, timeout)

beforeEach(async () => {
  await ReqIdentificationRepository.deleteAll()
  await RequirementRepository.deleteAll()
  await LegalBasisRepository.deleteAll()
  await ArticlesRepository.deleteAll()
  await SubjectsRepository.deleteAll()
  await AspectsRepository.deleteAll()
}, timeout)

afterEach(() => {
  jest.restoreAllMocks()
})

describe('Create a Requirement Identification', () => {
  test(
    'Should successfully create a requirement identification',
    async () => {
      const addSpy = jest
        .spyOn(reqIdentificationQueue, 'add')
        .mockResolvedValue({ id: 'job-id' })

      const subjectResponse = await api
        .post('/api/subjects')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ subjectName: 'Subject A', abbreviation: 'SA', orderIndex: 1 })
        .expect(201)

      const aspectResponse = await api
        .post(`/api/subjects/${subjectResponse.body.subject.id}/aspects`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ aspectName: 'Aspect A', abbreviation: 'AA', orderIndex: 1 })
        .expect(201)

      const legalBasisData = generateLegalBasisData({
        subjectId: String(subjectResponse.body.subject.id),
        aspectsIds: JSON.stringify([aspectResponse.body.aspect.id])
      })

      const legalBasisResponse = await api
        .post('/api/legalBasis')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(legalBasisData)
        .expect(201)

      const requirementData = generateRequirementData({
        subjectId: String(subjectResponse.body.subject.id),
        aspectsIds: JSON.stringify([aspectResponse.body.aspect.id])
      })

      await api
        .post('/api/requirements')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(requirementData)
        .expect(201)

      const reqIdentificationData = generateReqIdentificationData({
        legalBasisIds: [legalBasisResponse.body.legalBasis.id]
      })

      const reqIdentificationResponse = await api
        .post('/api/req-identification')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(reqIdentificationData)
        .expect(201)

      expect(typeof reqIdentificationResponse.body.reqIdentificationId).toBe(
        'number'
      )
      expect(reqIdentificationResponse.body.jobId).toBeDefined()
      addSpy.mockRestore()
    },
    timeout
  )

  test(
    'Should return 400 if one or more LegalBasis IDs do not exist',
    async () => {
      const invalidLegalBasisIds = [-1, -2]

      const reqIdentificationData = generateReqIdentificationData({
        reqIdentificationName: `InvalidLB-${Date.now()}`,
        legalBasisIds: invalidLegalBasisIds
      })

      const response = await api
        .post('/api/req-identification')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(reqIdentificationData)
        .expect(400)

      expect(response.body.message).toMatch(/LegalBasis not found for IDs/i)
      expect(Array.isArray(response.body.errors.notFoundIds)).toBe(true)
      expect(response.body.errors.notFoundIds).toEqual(
        expect.arrayContaining(invalidLegalBasisIds)
      )
    },
    timeout
  )

  test(
    'Should return 409 if Requirement Identification name already exists',
    async () => {
      const addSpy = jest
        .spyOn(reqIdentificationQueue, 'add')
        .mockResolvedValue({ id: 'job-id' })

      const subjectResponse = await api
        .post('/api/subjects')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
          subjectName: 'Duplicate Subject',
          abbreviation: 'DS',
          orderIndex: 1
        })
        .expect(201)

      const aspectResponse = await api
        .post(`/api/subjects/${subjectResponse.body.subject.id}/aspects`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
          aspectName: 'Duplicate Aspect',
          abbreviation: 'DA',
          orderIndex: 1
        })
        .expect(201)

      const requirementData = generateRequirementData({
        subjectId: String(subjectResponse.body.subject.id),
        aspectsIds: JSON.stringify([aspectResponse.body.aspect.id])
      })

      await api
        .post('/api/requirements')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(requirementData)
        .expect(201)

      const legalBasisResponse = await api
        .post('/api/legalBasis')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(
          generateLegalBasisData({
            legalName: `LB-${Date.now()}`,
            abbreviation: `AB-${Math.random().toString(36).substring(2, 6)}`,
            subjectId: String(subjectResponse.body.subject.id),
            aspectsIds: JSON.stringify([aspectResponse.body.aspect.id]),
            classification: 'Ley',
            jurisdiction: 'Federal',
            lastReform: '2024-01-01'
          })
        )
        .expect(201)

      const duplicateName = `Duplicate-${Date.now()}`

      const reqIdentificationData = generateReqIdentificationData({
        reqIdentificationName: duplicateName,
        legalBasisIds: [legalBasisResponse.body.legalBasis.id]
      })

      await api
        .post('/api/req-identification')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(reqIdentificationData)
        .expect(201)

      const reqIdentificationResponse = await api
        .post('/api/req-identification')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(reqIdentificationData)
        .expect(409)

      expect(reqIdentificationResponse.body.message).toMatch(
        /name already exists/i
      )
      addSpy.mockRestore()
    },
    timeout
  )

  test(
    'Should return 400 if selected LegalBasis have different subjects',
    async () => {
      const subjectResponse1 = await api
        .post('/api/subjects')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
          subjectName: 'Subject A',
          abbreviation: 'SA',
          orderIndex: 1
        })
        .expect(201)

      const subjectResponse2 = await api
        .post('/api/subjects')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
          subjectName: 'Subject B',
          abbreviation: 'SB',
          orderIndex: 2
        })
        .expect(201)

      const aspectResponse1 = await api
        .post(`/api/subjects/${subjectResponse1.body.subject.id}/aspects`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
          aspectName: 'Jurisdiction Aspect1',
          abbreviation: 'JA',
          orderIndex: 1
        })
        .expect(201)

      const aspectResponse2 = await api
        .post(`/api/subjects/${subjectResponse2.body.subject.id}/aspects`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
          aspectName: 'Jurisdiction Aspect2',
          abbreviation: 'JA',
          orderIndex: 1
        })
        .expect(201)

      const subjectId1 = subjectResponse1.body.subject.id
      const aspectId1 = aspectResponse1.body.aspect.id
      const subjectId2 = subjectResponse2.body.subject.id
      const aspectId2 = aspectResponse2.body.aspect.id
      const legalBasisResponse1 = await api
        .post('/api/legalBasis')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(
          generateLegalBasisData({
            legalName: `LB-SUBJ-A-${Date.now()}`,
            abbreviation: `SUBA-${Math.random().toString(36).substring(2, 6)}`,
            subjectId: String(subjectId1),
            aspectsIds: JSON.stringify([aspectId1]),
            classification: 'Ley',
            jurisdiction: 'Federal',
            lastReform: '2024-01-01'
          })
        )
        .expect(201)

      const legalBasisResponse2 = await api
        .post('/api/legalBasis')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(
          generateLegalBasisData({
            legalName: `LB-SUBJ-B-${Date.now()}`,
            abbreviation: `SUBB-${Math.random().toString(36).substring(2, 6)}`,
            subjectId: String(subjectId2),
            aspectsIds: JSON.stringify([aspectId2]),
            classification: 'Ley',
            jurisdiction: 'Federal',
            lastReform: '2024-01-01'
          })
        )
        .expect(201)

      const reqIdentificationData = generateReqIdentificationData({
        reqIdentificationName: `Conflict-Subjects-${Date.now()}`,
        legalBasisIds: [
          legalBasisResponse1.body.legalBasis.id,
          legalBasisResponse2.body.legalBasis.id
        ]
      })

      const reqIdentificationResponse = await api
        .post('/api/req-identification')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(reqIdentificationData)
        .expect(400)

      expect(reqIdentificationResponse.body.message).toMatch(
        /must have the same subject/i
      )
    },
    timeout
  )

  test(
    'Should return 400 if selected LegalBasis have different jurisdictions',
    async () => {
      const subjectResponse = await api
        .post('/api/subjects')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
          subjectName: 'Jurisdiction Subject',
          abbreviation: 'JS',
          orderIndex: 1
        })
        .expect(201)

      const aspectResponse = await api
        .post(`/api/subjects/${subjectResponse.body.subject.id}/aspects`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
          aspectName: 'Jurisdiction Aspect',
          abbreviation: 'JA',
          orderIndex: 1
        })
        .expect(201)

      const subjectId = subjectResponse.body.subject.id
      const aspectId = aspectResponse.body.aspect.id

      const federalLegalBasisResponse = await api
        .post('/api/legalBasis')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(
          generateLegalBasisData({
            legalName: `LB-Federal-${Date.now()}`,
            abbreviation: `FED-${Math.random().toString(36).substring(2, 6)}`,
            subjectId: String(subjectId),
            aspectsIds: JSON.stringify([aspectId]),
            classification: 'Ley',
            jurisdiction: 'Federal',
            lastReform: '2024-03-01'
          })
        )
        .expect(201)

      const estatalLegalBasisResponse = await api
        .post('/api/legalBasis')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(
          generateLegalBasisData({
            legalName: `LB-Estatal-${Date.now()}`,
            abbreviation: `EST-${Math.random().toString(36).substring(2, 6)}`,
            subjectId: String(subjectId),
            aspectsIds: JSON.stringify([aspectId]),
            classification: 'Reglamento',
            jurisdiction: 'Estatal',
            state: 'Nuevo León',
            lastReform: '2024-04-01'
          })
        )
        .expect(201)

      const reqIdentificationData = generateReqIdentificationData({
        reqIdentificationName: `Jurisdiction Conflict ${Date.now()}`,
        legalBasisIds: [
          federalLegalBasisResponse.body.legalBasis.id,
          estatalLegalBasisResponse.body.legalBasis.id
        ]
      })

      const reqIdentificationResponse = await api
        .post('/api/req-identification')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(reqIdentificationData)
        .expect(400)

      expect(reqIdentificationResponse.body.message).toMatch(
        /same jurisdiction/i
      )
    },
    timeout
  )

  test(
    'Should return 400 if Local legalBasis have different states',
    async () => {
      const subjectResponse = await api
        .post('/api/subjects')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
          subjectName: 'Local Subject',
          abbreviation: 'LS',
          orderIndex: 1
        })
        .expect(201)

      const aspectResponse = await api
        .post(`/api/subjects/${subjectResponse.body.subject.id}/aspects`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ aspectName: 'Aspect A', abbreviation: 'AA', orderIndex: 1 })
        .expect(201)

      const subjectId = subjectResponse.body.subject.id
      const aspectId = aspectResponse.body.aspect.id

      const legalBasisResponse1 = await api
        .post('/api/legalBasis')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(
          generateLegalBasisData({
            legalName: `LB-Local-1-${Date.now()}`,
            abbreviation: `LOC1-${Math.random().toString(36).substring(2, 6)}`,
            subjectId,
            aspectsIds: JSON.stringify([aspectId]),
            classification: 'Norma',
            jurisdiction: 'Local',
            state: 'Nuevo León',
            municipality: 'Monterrey',
            lastReform: '2024-01-01'
          })
        )
        .expect(201)

      const legalBasisResponse2 = await api
        .post('/api/legalBasis')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(
          generateLegalBasisData({
            legalName: `LB-Local-2-${Date.now()}`,
            abbreviation: `LOC2-${Math.random().toString(36).substring(2, 6)}`,
            subjectId,
            aspectsIds: JSON.stringify([aspectId]),
            classification: 'Norma',
            jurisdiction: 'Local',
            state: 'Jalisco',
            municipality: 'Guadalajara',
            lastReform: '2024-01-01'
          })
        )
        .expect(201)

      const reqIdentificationData = generateReqIdentificationData({
        reqIdentificationName: `Conflict Local States ${Date.now()}`,
        legalBasisIds: [
          legalBasisResponse1.body.legalBasis.id,
          legalBasisResponse2.body.legalBasis.id
        ]
      })

      const response = await api
        .post('/api/req-identification')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(reqIdentificationData)
        .expect(400)

      expect(response.body.message).toMatch(/same state/i)
    },
    timeout
  )

  test(
    'Should return 400 if Local legalBasis have different municipalities',
    async () => {
      const subjectResponse = await api
        .post('/api/subjects')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
          subjectName: 'Local Subject 2',
          abbreviation: 'LS2',
          orderIndex: 2
        })
        .expect(201)

      const aspectResponse = await api
        .post(`/api/subjects/${subjectResponse.body.subject.id}/aspects`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ aspectName: 'Aspect B', abbreviation: 'AB', orderIndex: 1 })
        .expect(201)

      const subjectId = subjectResponse.body.subject.id
      const aspectId = aspectResponse.body.aspect.id

      const legalBasisResponse1 = await api
        .post('/api/legalBasis')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(
          generateLegalBasisData({
            legalName: `LB-Municipality-1-${Date.now()}`,
            abbreviation: `MUNI1-${Math.random().toString(36).substring(2, 6)}`,
            subjectId,
            aspectsIds: JSON.stringify([aspectId]),
            classification: 'Reglamento',
            jurisdiction: 'Local',
            state: 'Nuevo León',
            municipality: 'Monterrey',
            lastReform: '2024-01-01'
          })
        )
        .expect(201)

      const legalBasisResponse2 = await api
        .post('/api/legalBasis')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(
          generateLegalBasisData({
            legalName: `LB-Municipality-2-${Date.now()}`,
            abbreviation: `MUNI2-${Math.random().toString(36).substring(2, 6)}`,
            subjectId,
            aspectsIds: JSON.stringify([aspectId]),
            classification: 'Reglamento',
            jurisdiction: 'Local',
            state: 'Nuevo León',
            municipality: 'San Pedro',
            lastReform: '2024-01-01'
          })
        )
        .expect(201)

      const reqIdentificationData = generateReqIdentificationData({
        reqIdentificationName: `Conflict Local Municipalities ${Date.now()}`,
        legalBasisIds: [
          legalBasisResponse1.body.legalBasis.id,
          legalBasisResponse2.body.legalBasis.id
        ]
      })

      const response = await api
        .post('/api/req-identification')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(reqIdentificationData)
        .expect(400)

      expect(response.body.message).toMatch(/same municipality/i)
    },
    timeout
  )

  test(
    'Should return 400 if no requirements are found for subject and aspects',
    async () => {
      const subjectResponse = await api
        .post('/api/subjects')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
          subjectName: `NoReq-Subject-${Date.now()}`,
          abbreviation: 'NRQ',
          orderIndex: 10
        })
        .expect(201)

      const aspectResponse = await api
        .post(`/api/subjects/${subjectResponse.body.subject.id}/aspects`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
          aspectName: 'NoReq Aspect',
          abbreviation: 'EMP',
          orderIndex: 1
        })
        .expect(201)

      const legalBasisResponse = await api
        .post('/api/legalBasis')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(
          generateLegalBasisData({
            legalName: `NoReqLB-${Date.now()}`,
            abbreviation: `NRLB-${Math.random().toString(36).substring(2, 6)}`,
            subjectId: String(subjectResponse.body.subject.id),
            aspectsIds: JSON.stringify([aspectResponse.body.aspect.id]),
            classification: 'Ley',
            jurisdiction: 'Federal',
            lastReform: '2024-01-01'
          })
        )
        .expect(201)

      const reqIdentificationData = generateReqIdentificationData({
        reqIdentificationName: `NoRequirementsTest-${Date.now()}`,
        legalBasisIds: [legalBasisResponse.body.legalBasis.id]
      })

      const reqIdentificationResponse = await api
        .post('/api/req-identification')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(reqIdentificationData)
        .expect(400)

      expect(reqIdentificationResponse.body.message).toMatch(
        /Requirements not found/i
      )
    },
    timeout
  )

  test(
    'Should return 400 if required fields are missing or invalid',
    async () => {
      const invalidCases = [
        {
          reqIdentificationName: '',
          legalBasisIds: [1],
          intelligenceLevel: 'High'
        },
        {
          reqIdentificationName: 'A'.repeat(256),
          legalBasisIds: [1],
          intelligenceLevel: 'High'
        },
        {
          reqIdentificationName: 'Valid Name',
          legalBasisIds: [],
          intelligenceLevel: 'High'
        },
        {
          reqIdentificationName: 'Valid Name',
          legalBasisIds: 'invalid',
          intelligenceLevel: 'Low'
        },
        {
          reqIdentificationName: 'Valid Name',
          legalBasisIds: [1, 'a', 3],
          intelligenceLevel: 'Low'
        },
        {
          reqIdentificationName: 'Valid Name',
          legalBasisIds: [1],
          intelligenceLevel: 'unsupported_value'
        },
        {},
        {
          reqIdentificationName: null,
          legalBasisIds: null,
          intelligenceLevel: null
        }
      ]

      for (const invalidData of invalidCases) {
        const response = await api
          .post('/api/req-identification')
          .set('Authorization', `Bearer ${tokenAdmin}`)
          .send(invalidData)
          .expect(400)

        expect(response.body.message).toMatch(/Validation failed/i)
        expect(Array.isArray(response.body.errors)).toBe(true)
        expect(response.body.errors.length).toBeGreaterThan(0)

        response.body.errors.forEach((error) => {
          expect(error).toHaveProperty('field')
          expect(error).toHaveProperty('message')
        })
      }
    }
  )

  test(
    'Should return 401 if the user is unauthorized',
    async () => {
      const reqIdentificationData = generateReqIdentificationData()

      const reqIdentificationResponse = await api
        .post('/api/req-identification')
        .send(reqIdentificationData)
        .expect(401)

      expect(reqIdentificationResponse.body.error).toMatch(
        /token missing or invalid/i
      )
    }
  )
})

describe('Get all Requirement Identifications', () => {
  test('Should return empty array when no requirement identifications exist', async () => {
    const res = await api
      .get('/api/req-identification')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)

    expect(res.body.reqIdentifications).toEqual([])
  }, timeout)

  test('Should return all created requirement identifications', async () => {
    const addSpy = jest
      .spyOn(reqIdentificationQueue, 'add')
      .mockResolvedValue({ id: 'job-id' })

    const subjectResponse = await api
      .post('/api/subjects')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ subjectName: 'List Test Subject', abbreviation: 'LTS', orderIndex: 1 })
      .expect(201)

    const aspectResponse = await api
      .post(`/api/subjects/${subjectResponse.body.subject.id}/aspects`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ aspectName: 'List Aspect', abbreviation: 'LA', orderIndex: 1 })
      .expect(201)

    const legalBasisData = generateLegalBasisData({
      subjectId: String(subjectResponse.body.subject.id),
      aspectsIds: JSON.stringify([aspectResponse.body.aspect.id]),
      classification: 'Ley',
      jurisdiction: 'Federal',
      lastReform: '2024-01-01'
    })
    const legalBasisResponse = await api
      .post('/api/legalBasis')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(legalBasisData)
      .expect(201)

    await api
      .post('/api/requirements')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(generateRequirementData({
        subjectId: String(subjectResponse.body.subject.id),
        aspectsIds: JSON.stringify([aspectResponse.body.aspect.id])
      }))
      .expect(201)

    const reqIdentificationData = generateReqIdentificationData({
      reqIdentificationName: `Listado-${Date.now()}`,
      legalBasisIds: [legalBasisResponse.body.legalBasis.id]
    })

    await api
      .post('/api/req-identification')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(reqIdentificationData)
      .expect(201)

    const res = await api
      .get('/api/req-identification')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)

    expect(res.body).toHaveProperty('reqIdentifications')
    expect(Array.isArray(res.body.reqIdentifications)).toBe(true)
    expect(res.body.reqIdentifications.length).toBeGreaterThanOrEqual(1)

    const reqIdentification = res.body.reqIdentifications.find(
      (item) => item.name === reqIdentificationData.reqIdentificationName
    )
    expect(reqIdentification).toBeDefined()

    addSpy.mockRestore()
  }, timeout)

  test('Should return 401 if the user is unauthorized', async () => {
    const res = await api
      .get('/api/req-identification')
      .expect(401)

    expect(res.body.error).toMatch(/token missing or invalid/i)
  }, timeout)
})

describe('Get Requirement Identifications by ID', () => {
  test('Should return 404 when requirement identification does not exist', async () => {
    const res = await api
      .get('/api/req-identification/-9999999')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(404)

    expect(res.body.message).toMatch(/not found/i)
  }, timeout)

  test('Should return the requirement identification by ID', async () => {
    const addSpy = jest
      .spyOn(reqIdentificationQueue, 'add')
      .mockResolvedValue({ id: 'mock-job-id' })

    const subjectResponse = await api
      .post('/api/subjects')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ subjectName: 'Subject A', abbreviation: 'SA', orderIndex: 1 })
      .expect(201)

    const aspectResponse = await api
      .post(`/api/subjects/${subjectResponse.body.subject.id}/aspects`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ aspectName: 'Aspect A', abbreviation: 'AA', orderIndex: 1 })
      .expect(201)

    const legalBasisData = generateLegalBasisData({
      subjectId: String(subjectResponse.body.subject.id),
      aspectsIds: JSON.stringify([aspectResponse.body.aspect.id]),
      classification: 'Ley',
      jurisdiction: 'Federal',
      lastReform: '2024-01-01'
    })

    const legalBasisResponse = await api
      .post('/api/legalBasis')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(legalBasisData)
      .expect(201)

    const requirementData = generateRequirementData({
      subjectId: String(subjectResponse.body.subject.id),
      aspectsIds: JSON.stringify([aspectResponse.body.aspect.id])
    })

    await api
      .post('/api/requirements')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(requirementData)
      .expect(201)

    const reqIdentificationData = generateReqIdentificationData({
      reqIdentificationName: `Search-${Date.now()}`,
      legalBasisIds: [legalBasisResponse.body.legalBasis.id]
    })

    const reqIdentificationResponse = await api
      .post('/api/req-identification')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(reqIdentificationData)
      .expect(201)

    const id = reqIdentificationResponse.body.reqIdentificationId

    const res = await api
      .get(`/api/req-identification/${id}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)

    expect(res.body).toHaveProperty('reqIdentification')
    expect(res.body.reqIdentification).toHaveProperty('id', id)
    expect(res.body.reqIdentification).toHaveProperty('name', reqIdentificationData.reqIdentificationName)
    expect(res.body.reqIdentification).toHaveProperty('user')

    addSpy.mockRestore()
  }, timeout)

  test('Should return 401 if the user is unauthorized', async () => {
    const res = await api
      .get('/api/req-identification/1')
      .expect(401)

    expect(res.body.error).toMatch(/token missing or invalid/i)
  })
})

describe('Get Requirement Identifications by name', () => {
  test('Should return empty array if no requirement identifications match the name', async () => {
    const res = await api
      .get('/api/req-identification/search/name')
      .query({ name: 'NoExistente' })
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)

    expect(Array.isArray(res.body.reqIdentifications)).toBe(true)
    expect(res.body.reqIdentifications).toHaveLength(0)
  }, timeout)

  test('Should return matching requirement identification by name', async () => {
    const addSpy = jest
      .spyOn(reqIdentificationQueue, 'add')
      .mockResolvedValue({ id: 'mock-job-id' })

    const subjectResponse = await api
      .post('/api/subjects')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ subjectName: 'Search Subject', abbreviation: 'SS', orderIndex: 1 })
      .expect(201)

    const aspectResponse = await api
      .post(`/api/subjects/${subjectResponse.body.subject.id}/aspects`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ aspectName: 'Search Aspect', abbreviation: 'SA', orderIndex: 1 })
      .expect(201)

    const legalBasisData = generateLegalBasisData({
      subjectId: String(subjectResponse.body.subject.id),
      aspectsIds: JSON.stringify([aspectResponse.body.aspect.id]),
      classification: 'Ley',
      jurisdiction: 'Federal',
      lastReform: '2024-01-01'
    })

    const legalBasisResponse = await api
      .post('/api/legalBasis')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(legalBasisData)
      .expect(201)

    const requirementData = generateRequirementData({
      subjectId: String(subjectResponse.body.subject.id),
      aspectsIds: JSON.stringify([aspectResponse.body.aspect.id])
    })

    await api
      .post('/api/requirements')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(requirementData)
      .expect(201)

    const name = `Search-${Date.now()}`
    const reqIdentificationData = generateReqIdentificationData({
      reqIdentificationName: name,
      legalBasisIds: [legalBasisResponse.body.legalBasis.id],
      subjectId: String(subjectResponse.body.subject.id)
    })

    await api
      .post('/api/req-identification')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(reqIdentificationData)
      .expect(201)

    const res = await api
      .get('/api/req-identification/search/name')
      .query({ name })
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)

    expect(Array.isArray(res.body.reqIdentifications)).toBe(true)
    expect(res.body.reqIdentifications.length).toBeGreaterThan(0)

    const reqIdentification = res.body.reqIdentifications.find(
      (item) => item.name === name
    )
    expect(reqIdentification).toBeDefined()

    addSpy.mockRestore()
  }, timeout)

  test('Should return 401 if the user is unauthorized', async () => {
    const res = await api
      .get('/api/req-identification/search/name')
      .query({ name: 'anything' })
      .expect(401)

    expect(res.body.error).toMatch(/token missing or invalid/i)
  }, timeout)
})

describe('Get Requirement Identifications by description', () => {
  test('Should return empty array when no requirement identifications match the description', async () => {
    const res = await api
      .get('/api/req-identification/search/description')
      .query({ description: 'NoExiste' })
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)

    expect(Array.isArray(res.body.reqIdentifications)).toBe(true)
    expect(res.body.reqIdentifications).toHaveLength(0)
  }, timeout)

  test('Should return matching requirement identification by description', async () => {
    const addSpy = jest
      .spyOn(reqIdentificationQueue, 'add')
      .mockResolvedValue({ id: 'mock-job-id' })

    const subjectResponse = await api
      .post('/api/subjects')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ subjectName: 'Search Desc Subject', abbreviation: 'SDS', orderIndex: 1 })
      .expect(201)

    const aspectResponse = await api
      .post(`/api/subjects/${subjectResponse.body.subject.id}/aspects`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ aspectName: 'Desc Aspect', abbreviation: 'DA', orderIndex: 1 })
      .expect(201)

    const legalBasisData = generateLegalBasisData({
      subjectId: String(subjectResponse.body.subject.id),
      aspectsIds: JSON.stringify([aspectResponse.body.aspect.id]),
      classification: 'Ley',
      jurisdiction: 'Federal',
      lastReform: '2024-01-01'
    })

    const legalBasisResponse = await api
      .post('/api/legalBasis')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(legalBasisData)
      .expect(201)

    const requirementData = generateRequirementData({
      subjectId: String(subjectResponse.body.subject.id),
      aspectsIds: JSON.stringify([aspectResponse.body.aspect.id])
    })

    const requirementResponse = await api
      .post('/api/requirements')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(requirementData)
      .expect(201)

    const uniqueDescription = `Descripció única ${Date.now()}`

    const reqIdentificationData = generateReqIdentificationData({
      reqIdentificationName: `ID-${Date.now()}`,
      reqIdentificationDescription: uniqueDescription,
      legalBasisIds: [legalBasisResponse.body.legalBasis.id],
      requirementIds: [requirementResponse.body.requirement.id]
    })

    await api
      .post('/api/req-identification')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(reqIdentificationData)
      .expect(201)

    const res = await api
      .get('/api/req-identification/search/description')
      .query({ description: uniqueDescription })
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)

    expect(Array.isArray(res.body.reqIdentifications)).toBe(true)
    expect(res.body.reqIdentifications.length).toBeGreaterThan(0)

    const found = res.body.reqIdentifications.find(
      (item) => item.description === uniqueDescription
    )
    expect(found).toBeDefined()

    addSpy.mockRestore()
  }, timeout)

  test('Should return 401 if the user is unauthorized', async () => {
    const res = await api
      .get('/api/req-identification/search/description')
      .query({ description: 'any' })
      .expect(401)

    expect(res.body.error).toMatch(/token missing or invalid/i)
  }, timeout)
})

describe('Get Requirement Identifications by user ID', () => {
  test('Should return empty array when no identifications found for user ID', async () => {
    const fakeUserId = 9999999
    jest.spyOn(UserRepository, 'findById').mockResolvedValue({ id: fakeUserId, name: 'Fake User' })

    const res = await api
      .get(`/api/req-identification/search/user/${fakeUserId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)

    expect(Array.isArray(res.body.reqIdentifications)).toBe(true)
    expect(res.body.reqIdentifications).toHaveLength(0)

    jest.restoreAllMocks()
  }, timeout)

  test('Should return matching requirement identifications for the given user ID', async () => {
    const addSpy = jest
      .spyOn(reqIdentificationQueue, 'add')
      .mockResolvedValue({ id: 'mock-job-id' })

    const subjectResponse = await api
      .post('/api/subjects')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ subjectName: 'UserID Subject', abbreviation: 'UID', orderIndex: 1 })
      .expect(201)

    const aspectResponse = await api
      .post(`/api/subjects/${subjectResponse.body.subject.id}/aspects`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ aspectName: 'UID Aspect', abbreviation: 'UIDA', orderIndex: 1 })
      .expect(201)

    const legalBasisData = generateLegalBasisData({
      subjectId: String(subjectResponse.body.subject.id),
      aspectsIds: JSON.stringify([aspectResponse.body.aspect.id]),
      classification: 'Ley',
      jurisdiction: 'Federal',
      lastReform: '2024-01-01'
    })

    const legalBasisResponse = await api
      .post('/api/legalBasis')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(legalBasisData)
      .expect(201)

    const requirementData = generateRequirementData({
      subjectId: String(subjectResponse.body.subject.id),
      aspectsIds: JSON.stringify([aspectResponse.body.aspect.id])
    })

    const requirementResponse = await api
      .post('/api/requirements')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(requirementData)
      .expect(201)

    const decodedToken = jwt.decode(tokenAdmin)
    const userId = decodedToken.userForToken.id

    const reqIdentificationData = generateReqIdentificationData({
      reqIdentificationName: `ID-UID-${Date.now()}`,
      reqIdentificationDescription: `UID test ${Date.now()}`,
      legalBasisIds: [legalBasisResponse.body.legalBasis.id],
      requirementIds: [requirementResponse.body.requirement.id]
    })

    await api
      .post('/api/req-identification')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(reqIdentificationData)
      .expect(201)

    const res = await api
      .get(`/api/req-identification/search/user/${userId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)

    expect(Array.isArray(res.body.reqIdentifications)).toBe(true)
    expect(res.body.reqIdentifications.length).toBeGreaterThan(0)

    const reqIdentification = res.body.reqIdentifications.find(
      (item) => item.user && item.user.id === userId
    )
    expect(reqIdentification).toBeDefined()

    addSpy.mockRestore()
  }, timeout)

  test('Should return 401 if the user is unauthorized', async () => {
    const res = await api
      .get('/api/req-identification/search/user/1')
      .expect(401)

    expect(res.body.error).toMatch(/token missing or invalid/i)
  }, timeout)
})

describe('Get Requirement Identifications by creation date', () => {
  test('Should return empty array when no identifications match the date range', async () => {
    const from = '2000-01-01'
    const to = '2000-12-31'

    const res = await api
      .get('/api/req-identification/search/created-at')
      .query({ from, to })
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)

    expect(Array.isArray(res.body.reqIdentifications)).toBe(true)
    expect(res.body.reqIdentifications).toHaveLength(0)
  }, timeout)

  test('Should return identifications created within the date range', async () => {
    const addSpy = jest
      .spyOn(reqIdentificationQueue, 'add')
      .mockResolvedValue({ id: 'mock-job-id' })

    const subjectResponse = await api
      .post('/api/subjects')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ subjectName: 'Date Subject', abbreviation: 'DS', orderIndex: 1 })
      .expect(201)

    const aspectResponse = await api
      .post(`/api/subjects/${subjectResponse.body.subject.id}/aspects`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ aspectName: 'Date Aspect', abbreviation: 'DA', orderIndex: 1 })
      .expect(201)

    const legalBasisData = generateLegalBasisData({
      subjectId: String(subjectResponse.body.subject.id),
      aspectsIds: JSON.stringify([aspectResponse.body.aspect.id]),
      classification: 'Ley',
      jurisdiction: 'Federal',
      lastReform: '2024-01-01'
    })

    const legalBasisResponse = await api
      .post('/api/legalBasis')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(legalBasisData)
      .expect(201)

    const requirementData = generateRequirementData({
      subjectId: String(subjectResponse.body.subject.id),
      aspectsIds: JSON.stringify([aspectResponse.body.aspect.id])
    })

    const requirementResponse = await api
      .post('/api/requirements')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(requirementData)
      .expect(201)

    const now = Date.now()
    const testName = `Fecha-${now}`
    const testDesc = `Descripción fecha ${now}`

    const reqIdentificationData = generateReqIdentificationData({
      reqIdentificationName: testName,
      reqIdentificationDescription: testDesc,
      legalBasisIds: [legalBasisResponse.body.legalBasis.id],
      requirementIds: [requirementResponse.body.requirement.id],
      intelligenceLevel: 'High'
    })

    await api
      .post('/api/req-identification')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(reqIdentificationData)
      .expect(201)

    const today = new Date()
    const from = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const to = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const res = await api
      .get('/api/req-identification/search/created-at')
      .query({ from, to })
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)

    expect(Array.isArray(res.body.reqIdentifications)).toBe(true)

    const found = res.body.reqIdentifications.find(
      (item) => item.name === testName && item.description === testDesc
    )
    expect(found).toBeDefined()

    addSpy.mockRestore()
  }, timeout)

  test('Should return 400 if the date format is invalid', async () => {
    const res = await api
      .get('/api/req-identification/search/created-at')
      .query({ from: 'invalid-date' })
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(400)

    expect(res.body.message).toBe('Invalid date format')
    expect(Array.isArray(res.body.errors)).toBe(true)
    expect(res.body.errors.length).toBeGreaterThan(0)
  }, timeout)

  test('Should return 401 if token is invalid', async () => {
    const from = '2024-01-01'
    const to = '2024-12-31'

    const res = await api
      .get('/api/req-identification/search/created-at')
      .query({ from, to })
      .set('Authorization', 'Bearer invalid.token.here')
      .expect(401)

    expect(res.body.error).toMatch(/token missing or invalid/i)
  }, timeout)
})

describe('Get Requirement Identifications by status', () => {
  test('Should return empty array when no identifications match the given status', async () => {
    const res = await api
      .get('/api/req-identification/search/status')
      .query({ status: 'Fallido' })
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)

    expect(Array.isArray(res.body.reqIdentifications)).toBe(true)
    expect(res.body.reqIdentifications).toHaveLength(0)
  }, timeout)

  test('Should return identifications with status "Activo"', async () => {
    const addSpy = jest
      .spyOn(reqIdentificationQueue, 'add')
      .mockResolvedValue({ id: 'mock-job-id' })

    const subjectResponse = await api
      .post('/api/subjects')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ subjectName: 'Status Subject', abbreviation: 'SS', orderIndex: 1 })
      .expect(201)

    const aspectResponse = await api
      .post(`/api/subjects/${subjectResponse.body.subject.id}/aspects`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ aspectName: 'Status Aspect', abbreviation: 'SA', orderIndex: 1 })
      .expect(201)

    const legalBasisData = generateLegalBasisData({
      subjectId: String(subjectResponse.body.subject.id),
      aspectsIds: JSON.stringify([aspectResponse.body.aspect.id]),
      classification: 'Ley',
      jurisdiction: 'Federal',
      lastReform: '2024-01-01'
    })

    const legalBasisResponse = await api
      .post('/api/legalBasis')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(legalBasisData)
      .expect(201)

    const requirementData = generateRequirementData({
      subjectId: String(subjectResponse.body.subject.id),
      aspectsIds: JSON.stringify([aspectResponse.body.aspect.id])
    })

    const requirementResponse = await api
      .post('/api/requirements')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(requirementData)
      .expect(201)

    const now = Date.now()
    const testName = `Status-${now}`
    const testDesc = `Descripción status ${now}`

    const reqIdentificationData = generateReqIdentificationData({
      reqIdentificationName: testName,
      reqIdentificationDescription: testDesc,
      legalBasisIds: [legalBasisResponse.body.legalBasis.id],
      requirementIds: [requirementResponse.body.requirement.id],
      intelligenceLevel: 'Low'
    })

    await api
      .post('/api/req-identification')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(reqIdentificationData)
      .expect(201)

    const res = await api
      .get('/api/req-identification/search/status')
      .query({ status: 'Activo' })
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)

    expect(Array.isArray(res.body.reqIdentifications)).toBe(true)

    const found = res.body.reqIdentifications.find(
      (item) => item.name === testName && item.status === 'Activo'
    )
    expect(found).toBeDefined()

    addSpy.mockRestore()
  }, timeout)

  test('Should return 401 if token is invalid', async () => {
    const res = await api
      .get('/api/req-identification/search/status')
      .query({ status: 'Activo' })
      .expect(401)

    expect(res.body.error).toBe('token missing or invalid')
  }, timeout)
})
