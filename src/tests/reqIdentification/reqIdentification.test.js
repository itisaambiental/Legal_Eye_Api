/* eslint-disable no-undef */
import { api } from '../../config/test.config.js'
import UserRepository from '../../repositories/User.repository.js'
import ReqIdentificationRepository from '../../repositories/ReqIdentification.repository.js'
import RequirementRepository from '../../repositories/Requirements.repository.js'
import SubjectsRepository from '../../repositories/Subject.repository.js'
import AspectsRepository from '../../repositories/Aspects.repository.js'
import LegalBasisRepository from '../../repositories/LegalBasis.repository.js'
import generateReqIdentificationData from '../../utils/generateReqIdentificationData.js'
import generateLegalBasisData from '../../utils/generateLegalBasisData.js'
import generateRequirementData from '../../utils/generateRequirementData.js'
import reqIdentificationQueue from '../../workers/reqIdentificationWorker.js'
import { ADMIN_GMAIL, ADMIN_PASSWORD_TEST } from '../../config/variables.config.js'

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
  await ReqIdentificationRepository.deleteAll()
  await UserRepository.deleteAllExceptByGmail(ADMIN_GMAIL)

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
    legalName: `LegalName-${Date.now()}-A`,
    abbreviation: `ABBR-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
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

  const reqData = generateRequirementData({
    subjectId: createdSubject.id,
    aspectsIds: [createdAspect.id]
  })

  const reqRes = await api
    .post('/api/requirements')
    .set('Authorization', `Bearer ${tokenAdmin}`)
    .send(reqData)
    .expect(201)
  createdRequirement = reqRes.body.requirement

  jest.spyOn(reqIdentificationQueue, 'add').mockResolvedValue({ id: 'test-job' })
}, timeout)

afterEach(() => {
  jest.restoreAllMocks()
})

describe('ReqIdentificationService - create()', () => {
  test('Should successfully create a requirement identification', async () => {
    const payload = generateReqIdentificationData({ legalBasisIds: [createdLegalBasis.id] })

    const res = await api
      .post('/api/req-identification')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(payload)
      .expect(201)

    expect(typeof res.body.reqIdentificationId).toBe('number')
    expect(res.body.jobId).toBeDefined()

    const saved = await ReqIdentificationRepository.findById(res.body.reqIdentificationId)
    expect(saved).toBeTruthy()
    expect(saved.name).toBe(payload.reqIdentificationName)
  })

  test('Should return 400 if one or more LegalBasis IDs do not exist', async () => {
    const payload = generateReqIdentificationData({ legalBasisIds: [999999, 888888] })

    const res = await api
      .post('/api/req-identification')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(payload)
      .expect(400)

    expect(res.body.message).toMatch(/LegalBasis not found/i)
  })

  test('Should return 409 if Requirement Identification name already exists', async () => {
    const name = `Duplicate-${Date.now()}`
    const payload = generateReqIdentificationData({ reqIdentificationName: name, legalBasisIds: [createdLegalBasis.id] })

    await api
      .post('/api/req-identification')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(payload)
      .expect(201)

    const res = await api
      .post('/api/req-identification')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(payload)
      .expect(409)

    expect(res.body.message).toMatch(/name already exists/i)
  })

  test('Should return 400 if selected LegalBasis have different subjects', async () => {
    const subjRes = await api
      .post('/api/subjects')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ subjectName: 'Other Subject', abbreviation: 'OS', orderIndex: 2 })
      .expect(201)
    const otherSubject = subjRes.body.subject

    const aspectRes = await api
      .post(`/api/subjects/${otherSubject.id}/aspects`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ aspectName: 'Aspect', abbreviation: 'ASP', orderIndex: 1 })
      .expect(201)
    const otherAspect = aspectRes.body.aspect

    const lbRes = await api
      .post('/api/legalBasis')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(generateLegalBasisData({
        legalName: `LB-SubjConflict-${Date.now()}`,
        abbreviation: `ABBR-SC-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        subjectId: String(otherSubject.id),
        aspectsIds: JSON.stringify([otherAspect.id]),
        classification: 'Ley',
        jurisdiction: 'Federal',
        lastReform: '2024-01-01'
      }))
      .expect(201)

    const payload = generateReqIdentificationData({
      reqIdentificationName: `Conflicting Subjects ${Date.now()}`,
      legalBasisIds: [createdLegalBasis.id, lbRes.body.legalBasis.id]
    })

    const res = await api
      .post('/api/req-identification')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(payload)
      .expect(400)

    expect(res.body.message).toMatch(/must have the same subject/i)
  })

  test('Should return 400 if selected LegalBasis have different jurisdictions', async () => {
    const subject = createdSubject
    const aspect = createdAspect

    const federalLB = createdLegalBasis

    const estatalLB = await api
      .post('/api/legalBasis')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(generateLegalBasisData({
        legalName: `LB-EST-${Date.now()}`,
        abbreviation: `EST-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        subjectId: String(subject.id),
        aspectsIds: JSON.stringify([aspect.id]),
        classification: 'Reglamento',
        jurisdiction: 'Estatal',
        state: 'Nuevo León',
        lastReform: '2024-04-01'
      }))
      .expect(201)

    const payload = generateReqIdentificationData({
      reqIdentificationName: `Jurisdiction Conflict ${Date.now()}`,
      legalBasisIds: [federalLB.id, estatalLB.body.legalBasis.id]
    })

    const res = await api
      .post('/api/req-identification')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(payload)
      .expect(400)

    expect(res.body.message).toMatch(/same jurisdiction/i)
  })

  test('Should return 400 if no requirements are found for subject and aspects', async () => {
    const subjectRes = await api
      .post('/api/subjects')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ subjectName: `NoReq-${Date.now()}`, abbreviation: 'NRQ', orderIndex: 10 })
      .expect(201)
    const subject = subjectRes.body.subject

    const aspectRes = await api
      .post(`/api/subjects/${subject.id}/aspects`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ aspectName: 'Empty', abbreviation: 'EMP', orderIndex: 1 })
      .expect(201)
    const aspect = aspectRes.body.aspect

    const lbRes = await api
      .post('/api/legalBasis')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(generateLegalBasisData({
        legalName: `NoReqLB-${Date.now()}`,
        abbreviation: `NRLB-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        subjectId: String(subject.id),
        aspectsIds: JSON.stringify([aspect.id]),
        classification: 'Ley',
        jurisdiction: 'Federal',
        lastReform: '2024-01-01'
      }))
      .expect(201)

    const payload = generateReqIdentificationData({
      reqIdentificationName: `NoReqTest ${Date.now()}`,
      legalBasisIds: [lbRes.body.legalBasis.id]
    })

    const res = await api
      .post('/api/req-identification')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(payload)
      .expect(400)

    expect(res.body.message).toBe('Requirements not found')
  })

  test('Should return 400 on validation error from Zod schema', async () => {
    const res = await api
      .post('/api/req-identification')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        reqIdentificationName: '',
        legalBasisIds: 'invalid',
        intelligenceLevel: 'mid'
      })
      .expect(400)

    expect(res.body.message).toBe('Validation failed')
    expect(res.body.errors.length).toBeGreaterThan(0)
  })

  test('Should return 500 on unexpected internal error', async () => {
    jest.spyOn(RequirementRepository, 'findBySubjectAndAspects').mockImplementation(() => {
      throw new Error('Unexpected failure')
    })

    const payload = generateReqIdentificationData({
      reqIdentificationName: `Crash ${Date.now()}`,
      legalBasisIds: [createdLegalBasis.id]
    })

    const res = await api
      .post('/api/req-identification')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(payload)
      .expect(500)

    expect(res.body.message).toBe('Unexpected error during requirement identification creation')
  })
})

describe('GET /api/req-identification', () => {
  beforeEach(async () => {
    await ReqIdentificationRepository.deleteAll()
  })

  test('Should return an empty array when no records exist', async () => {
    const res = await api
      .get('/api/req-identification')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)

    expect(res.body.reqIdentifications).toEqual([])
  })

  test('Should return all created requirement identifications', async () => {
    const first = generateReqIdentificationData({ reqIdentificationName: `First-${Date.now()}`, legalBasisIds: [createdLegalBasis.id] })
    const second = generateReqIdentificationData({ reqIdentificationName: `Second-${Date.now()}`, legalBasisIds: [createdLegalBasis.id] })

    await api.post('/api/req-identification').set('Authorization', `Bearer ${tokenAdmin}`).send(first).expect(201)
    await api.post('/api/req-identification').set('Authorization', `Bearer ${tokenAdmin}`).send(second).expect(201)

    const res = await api
      .get('/api/req-identification')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)

    expect(res.body.reqIdentifications.length).toBeGreaterThanOrEqual(2)
  })
})

describe('GET /api/req-identification/:id', () => {
  test('Should return 404 if not found', async () => {
    const res = await api
      .get('/api/req-identification/9999999')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(404)

    expect(res.body.message).toMatch(/not found/i)
  })

  test('Should return a specific requirement identification by ID', async () => {
    const payload = generateReqIdentificationData({
      reqIdentificationName: `FindById-${Date.now()}`,
      legalBasisIds: [createdLegalBasis.id]
    })

    const postRes = await api
      .post('/api/req-identification')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(payload)
      .expect(201)

    const id = postRes.body.reqIdentificationId

    const res = await api
      .get(`/api/req-identification/${id}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)

    expect(res.body.reqIdentification).toHaveProperty('id', id)
    expect(res.body.reqIdentification).toHaveProperty('name', payload.reqIdentificationName)
  })
})
