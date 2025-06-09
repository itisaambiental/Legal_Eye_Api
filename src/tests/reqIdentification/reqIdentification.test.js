/* eslint-disable no-undef */
import { api } from '../../config/test.config.js'
import UserRepository from '../../repositories/User.repository.js'
import { ADMIN_GMAIL, ADMIN_PASSWORD_TEST } from '../../config/variables.config.js'
import ReqIdentificationRepository from '../../repositories/ReqIdentification.repository.js'
import RequirementRepository from '../../repositories/Requirements.repository.js'
import SubjectsRepository from '../../repositories/Subject.repository.js'
import AspectsRepository from '../../repositories/Aspects.repository.js'
import LegalBasisRepository from '../../repositories/LegalBasis.repository.js'

import generateReqIdentificationData from '../../utils/generateReqIdentificationData.js'
import generateLegalBasisData from '../../utils/generateLegalBasisData.js'
import generateRequirementData from '../../utils/generateRequirementData.js'
import reqIdentificationQueue from '../../workers/reqIdentificationWorker.js'

let tokenAdmin
let createdSubject
let createdAspect
let createdLegalBasis
let createdRequirement

const timeout = 50000

beforeAll(async () => {
  await RequirementRepository.deleteAll()
  await LegalBasisRepository.deleteAll()
  await SubjectsRepository.deleteAll()
  await AspectsRepository.deleteAll()
  await UserRepository.deleteAllExceptByGmail(ADMIN_GMAIL)
  await ReqIdentificationRepository.deleteAll()

  const loginRes = await api
    .post('/api/user/login')
    .send({ gmail: ADMIN_GMAIL, password: ADMIN_PASSWORD_TEST })
    .expect(200)
  tokenAdmin = loginRes.body.token

  const subjRes = await api
    .post('/api/subjects')
    .set('Authorization', `Bearer ${tokenAdmin}`)
    .send({ subjectName: 'Test Subject', abbreviation: 'TS', orderIndex: 1 })
    .expect(201)
  createdSubject = subjRes.body.subject

  const aspRes = await api
    .post(`/api/subjects/${createdSubject.id}/aspects`)
    .set('Authorization', `Bearer ${tokenAdmin}`)
    .send({ aspectName: 'Test Aspect', abbreviation: 'TA', orderIndex: 1 })
    .expect(201)
  createdAspect = aspRes.body.aspect

  const lbData = generateLegalBasisData({
    subjectId: String(createdSubject.id),
    aspectsIds: JSON.stringify([createdAspect.id]),
    classification: 'Ley',
    jurisdiction: 'Federal',
    lastReform: '2024-01-01'
  })

  const lbRes = await api
    .post('/api/legalBasis')
    .set('Authorization', `Bearer ${tokenAdmin}`)
    .send(lbData)
    .expect(201)
  createdLegalBasis = lbRes.body.legalBasis

  const reqData = generateRequirementData({})
  reqData.subjectId = createdSubject.id
  reqData.aspectsIds = [createdAspect.id]

  const reqRes = await api
    .post('/api/requirements')
    .set('Authorization', `Bearer ${tokenAdmin}`)
    .send(reqData)
    .expect(201)
  createdRequirement = reqRes.body.requirement
  expect(createdRequirement).toBeDefined()
  expect(createdRequirement.id).toBeGreaterThan(0)

  jest.spyOn(reqIdentificationQueue, 'add').mockResolvedValue({ id: 'test-job' })
}, timeout)

afterEach(() => {
  jest.restoreAllMocks()
})

describe('ReqIdentificationService - create()', () => {
  test('Should successfully create a requirement identification', async () => {
    const payload = generateReqIdentificationData({
      legalBasisIds: [createdLegalBasis.id]
    })

    const res = await api
      .post('/api/req-identification')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(payload)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    expect(typeof res.body.reqIdentificationId).toBe('number')
    expect(res.body.jobId).toBeDefined()

    const saved = await ReqIdentificationRepository.findById(res.body.reqIdentificationId)
    expect(saved).toBeTruthy()
    expect(saved.name).toBe(payload.reqIdentificationName)
    expect(saved.user.id).toBeDefined()
  })

  test('Should return 400 if one or more LegalBasis IDs do not exist', async () => {
    const invalidIds = [999999, 888888]
    const reqIdentificationData = generateReqIdentificationData({
      legalBasisIds: invalidIds
    })

    const res = await api
      .post('/api/req-identification')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(reqIdentificationData)
      .expect(400)
      .expect('Content-Type', /application\/json/)

    expect(res.body.message).toMatch(/LegalBasis not found for IDs/i)
    expect(res.body.errors).toEqual(
      expect.objectContaining({
        notFoundIds: expect.arrayContaining(JSON.parse(reqIdentificationData.legalBasisIds))
      })
    )
  })

  test('Should return 409 if Requirement Identification name already exists', async () => {
    const uniqueName = 'Duplicado ' + Date.now()
    const basePayload = generateReqIdentificationData({
      reqIdentificationName: uniqueName,
      legalBasisIds: [createdLegalBasis.id]
    })
    await api
      .post('/api/req-identification')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(basePayload)
      .expect(201)

    const res = await api
      .post('/api/req-identification')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(basePayload)
      .expect(409)
      .expect('Content-Type', /application\/json/)

    expect(res.body.message).toMatch(/Requirement Identification name already exists/i)
  })
})
