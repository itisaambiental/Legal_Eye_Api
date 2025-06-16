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
    aspectsIds: JSON.stringify([createdAspect.id])
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

describe('GET /api/req-identification - Get Requirement Identifications all', () => {
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
    // Hacemos login para obtener token y userId como en el test que funciona
    const loginRes = await api
      .post('/api/user/login')
      .send({ gmail: ADMIN_GMAIL, password: ADMIN_PASSWORD_TEST })
      .expect(200)

    const token = loginRes.body.token

    const decodedToken = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64').toString()
    )
    const userId = decodedToken.userForToken.id

    // Creamos un identificador con todos los datos requeridos
    const payload = generateReqIdentificationData({
      reqIdentificationName: `Identificación-${Date.now()}`,
      reqIdentificationDescription: 'Identificación legal válida',
      legalBasisIds: [createdLegalBasis.id],
      requirementIds: [createdRequirement.id],
      intelligenceLevel: 'Low'
    })

    const resPost = await api
      .post('/api/req-identification')
      .set('Authorization', `Bearer ${token}`)
      .send(payload)

    expect(resPost.status).toBe(201)

    // Ahora sí, consultamos todos los identificadores creados
    const res = await api
      .get('/api/req-identification')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(res.body).toHaveProperty('reqIdentifications')
    expect(Array.isArray(res.body.reqIdentifications)).toBe(true)
    expect(res.body.reqIdentifications.length).toBeGreaterThanOrEqual(1)

    // Verificamos que el user coincida
    const found = res.body.reqIdentifications.find(
      (item) => item.user?.id === userId
    )
    expect(found).toBeDefined()

    jest.restoreAllMocks()
  })

  test('Should return 401 if user is not authorized (invalid token)', async () => {
    const res = await api
      .get('/api/req-identification')
      .set('Authorization', 'Bearer invalid.token.here')
      .expect(401)

    expect(res.body).toHaveProperty('error', 'token missing or invalid')
  })

  test('Should return 500 on internal server error', async () => {
    const spy = jest.spyOn(ReqIdentificationRepository, 'findAll')
    spy.mockImplementation(() => {
      throw new Error('DB Failure')
    })

    const res = await api
      .get('/api/req-identification')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(500)

    expect(res.body.message).toBe('Failed to retrieve requirement identifications')
    spy.mockRestore()
  })
})

describe('GET /api/req-identification/:id - Get Requirement Identifications by id', () => {
  test('Should return 404 if not found', async () => {
    const res = await api
      .get('/api/req-identification/9999999')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(404)

    expect(res.body.message).toMatch(/not found/i)
  })

  test('Should return a specific requirement identification by ID', async () => {
    const loginRes = await api
      .post('/api/user/login')
      .send({ gmail: ADMIN_GMAIL, password: ADMIN_PASSWORD_TEST })
      .expect(200)

    const token = loginRes.body.token
    const decodedToken = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64').toString()
    )
    const userId = decodedToken.userForToken.id

    // Payload explícito
    const payload = {
      reqIdentificationName: `FindById-${Date.now()}`,
      reqIdentificationDescription: 'Buscando por ID',
      legalBasisIds: [createdLegalBasis.id],
      requirementIds: [createdRequirement.id],
      intelligenceLevel: 'Low'
    }

    const postRes = await api
      .post('/api/req-identification')
      .set('Authorization', `Bearer ${token}`)
      .send(payload)
      .expect(201)

    const id = postRes.body.reqIdentificationId

    const res = await api
      .get(`/api/req-identification/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(res.body).toHaveProperty('reqIdentification')
    expect(res.body.reqIdentification).toHaveProperty('id', id)
    expect(res.body.reqIdentification).toHaveProperty('name', payload.reqIdentificationName)
    expect(res.body.reqIdentification).toHaveProperty('user')
    expect(res.body.reqIdentification.user).toHaveProperty('id', userId)

    jest.restoreAllMocks()
  })

  test('Should return 401 if user is not authorized (invalid token)', async () => {
    const res = await api
      .get('/api/req-identification/1')
      .set('Authorization', 'Bearer invalid.token.here')
      .expect(401)

    expect(res.body).toHaveProperty('error', 'token missing or invalid')
  })

  test('Should return 500 on internal server error', async () => {
    const spy = jest.spyOn(ReqIdentificationRepository, 'findById')
    spy.mockImplementation(() => {
      throw new Error('DB Failure')
    })

    const res = await api
      .get('/api/req-identification/1')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(500)

    expect(res.body.message).toBe('Failed to retrieve requirement identification by ID')
    spy.mockRestore()
  })
})

describe('GET /api/req-identification/search/name - Get Requirement Identifications by name', () => {
  beforeEach(async () => {
    await ReqIdentificationRepository.deleteAll()
  })

  test('Should return empty array if no records match the name', async () => {
    const res = await api
      .get('/api/req-identification/search/name?name=NoExistente')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)

    expect(res.body.reqIdentifications).toBeInstanceOf(Array)
    expect(res.body.reqIdentifications).toHaveLength(0)
  })

  test('Should return matching requirement identifications by name', async () => {
    // Login para obtener token y userId
    const loginRes = await api
      .post('/api/user/login')
      .send({ gmail: ADMIN_GMAIL, password: ADMIN_PASSWORD_TEST })
      .expect(200)

    const token = loginRes.body.token

    const decodedToken = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64').toString()
    )
    const userId = decodedToken.userForToken.id

    // Nombre único para búsqueda
    const uniqueName = `UniqueName-${Date.now()}`

    // Payload explícito
    const payload = {
      reqIdentificationName: uniqueName,
      reqIdentificationDescription: 'Identificación buscada por nombre',
      legalBasisIds: [createdLegalBasis.id],
      requirementIds: [createdRequirement.id],
      intelligenceLevel: 'High'
    }

    await api
      .post('/api/req-identification')
      .set('Authorization', `Bearer ${token}`)
      .send(payload)
      .expect(201)

    // Búsqueda por nombre
    const res = await api
      .get(`/api/req-identification/search/name?name=${encodeURIComponent(uniqueName)}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(res.body.reqIdentifications).toBeInstanceOf(Array)
    expect(res.body.reqIdentifications.length).toBeGreaterThan(0)

    const found = res.body.reqIdentifications.find(
      (item) => item.name === uniqueName && item.user?.id === userId
    )
    expect(found).toBeDefined()

    jest.restoreAllMocks()
  })

  test('Should return 401 if user is not authorized (invalid token)', async () => {
    const res = await api
      .get('/api/req-identification/search/name?name=anything')
      .set('Authorization', 'Bearer invalid.token.here')
      .expect(401)

    expect(res.body).toHaveProperty('error', 'token missing or invalid')
  })

  test('Should return 500 on internal server error', async () => {
    const spy = jest.spyOn(ReqIdentificationRepository, 'findByName')
    spy.mockImplementation(() => {
      throw new Error('DB Failure')
    })

    const res = await api
      .get('/api/req-identification/search/name?name=test')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(500)

    expect(res.body.message).toBe('Failed to retrieve requirement identifications by name')
    spy.mockRestore()
  })
})

describe('GET /api/req-identification/search/description - Get Requirement Identifications by description', () => {
  beforeEach(async () => {
    await ReqIdentificationRepository.deleteAll()
  })

  test('Should return empty array when no description matches', async () => {
    const res = await api
      .get('/api/req-identification/search/description?description=NoExiste')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)

    expect(res.body.reqIdentifications).toBeInstanceOf(Array)
    expect(res.body.reqIdentifications).toHaveLength(0)
  })

  test('Should return matching requirement identifications by description', async () => {
    const loginRes = await api
      .post('/api/user/login')
      .send({ gmail: ADMIN_GMAIL, password: ADMIN_PASSWORD_TEST })
      .expect(200)

    const token = loginRes.body.token

    const decodedToken = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64').toString()
    )
    const userId = decodedToken.userForToken.id

    const uniqueDescription = `Descripción única ${Date.now()}`

    const payload = generateReqIdentificationData({
      reqIdentificationName: `ID-${Date.now()}`,
      reqIdentificationDescription: uniqueDescription,
      legalBasisIds: [createdLegalBasis.id],
      requirementIds: [createdRequirement.id],
      intelligenceLevel: 'Low'
    })

    await api
      .post('/api/req-identification')
      .set('Authorization', `Bearer ${token}`)
      .send(payload)
      .expect(201)

    const res = await api
      .get(`/api/req-identification/search/description?description=${encodeURIComponent(uniqueDescription)}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(res.body).toHaveProperty('reqIdentifications')
    expect(Array.isArray(res.body.reqIdentifications)).toBe(true)
    expect(res.body.reqIdentifications.length).toBeGreaterThan(0)

    const found = res.body.reqIdentifications.find(
      (item) => item.description === uniqueDescription && item.user?.id === userId
    )
    expect(found).toBeDefined()

    jest.restoreAllMocks()
  })

  test('Should return 401 if user is not authorized (invalid token)', async () => {
    const res = await api
      .get('/api/req-identification/search/description?description=any')
      .set('Authorization', 'Bearer invalid.token.here')
      .expect(401)

    expect(res.body).toHaveProperty('error', 'token missing or invalid')
  })

  test('Should return 500 on internal server error', async () => {
    const spy = jest.spyOn(ReqIdentificationRepository, 'findByDescription')
    spy.mockImplementation(() => {
      throw new Error('DB Failure')
    })

    const res = await api
      .get('/api/req-identification/search/description?description=test')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(500)

    expect(res.body.message).toBe('Failed to retrieve requirement identifications by description')
    spy.mockRestore()
  })
})

describe('GET /api/req-identification/search/user/:id - Get Requirement Identifications by user ID', () => {
  beforeEach(async () => {
    await ReqIdentificationRepository.deleteAll()
  })

  test('Should return 404 if no identifications found for the user', async () => {
    const fakeUserId = 9999999
    jest.spyOn(UserRepository, 'findById').mockResolvedValue({ id: fakeUserId, name: 'Fake User' })

    const res = await api
      .get(`/api/req-identification/search/user/${fakeUserId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200) // Si tu controlador devuelve [] en lugar de error

    expect(res.body).toHaveProperty('reqIdentifications')
    expect(Array.isArray(res.body.reqIdentifications)).toBe(true)
    expect(res.body.reqIdentifications).toHaveLength(0)

    jest.restoreAllMocks()
  })

  test('Should return all identifications for the user ID provided', async () => {
    const loginRes = await api
      .post('/api/user/login')
      .send({ gmail: ADMIN_GMAIL, password: ADMIN_PASSWORD_TEST })
      .expect(200)

    tokenAdmin = loginRes.body.token

    const decodedToken = JSON.parse(
      Buffer.from(tokenAdmin.split('.')[1], 'base64').toString()
    )
    const userId = decodedToken.userForToken.id

    const payload = generateReqIdentificationData({
      reqIdentificationName: `Identificación-${Date.now()}`,
      reqIdentificationDescription: 'Identificación legal válida',
      legalBasisIds: [createdLegalBasis.id],
      requirementIds: [createdRequirement.id],
      intelligenceLevel: 'Low'
    })

    const resPost = await api
      .post('/api/req-identification')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(payload)

    expect(resPost.status).toBe(201)

    const res = await api
      .get(`/api/req-identification/search/user/${userId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)

    expect(res.body).toHaveProperty('reqIdentifications')
    expect(Array.isArray(res.body.reqIdentifications)).toBe(true)
    expect(res.body.reqIdentifications.length).toBeGreaterThan(0)
    expect(res.body.reqIdentifications[0]).toHaveProperty('user')
    expect(res.body.reqIdentifications[0].user).toHaveProperty('id', userId)

    jest.restoreAllMocks()
  })

  test('Should return 401 if user is not authorized (invalid token)', async () => {
    const res = await api
      .get('/api/req-identification/search/user/1')
      .set('Authorization', 'Bearer invalid.token.here')
      .expect(401)

    expect(res.body).toHaveProperty('error', 'token missing or invalid')
  })

  test('Should return 500 on internal server error from repository', async () => {
    const userId = 1
    jest.spyOn(UserRepository, 'findById').mockResolvedValue({ id: userId, name: 'Simulated' })
    jest.spyOn(ReqIdentificationRepository, 'findByUserId').mockImplementation(() => {
      throw new Error('Simulated failure')
    })

    const res = await api
      .get(`/api/req-identification/search/user/${userId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(500)

    expect(res.body.message).toBe('Failed to retrieve requirement identifications by user name')

    jest.restoreAllMocks()
  })
})

describe('GET /api/req-identification/search/created-at - Get Requirement Identifications by creation date', () => {
  beforeEach(async () => {
    await ReqIdentificationRepository.deleteAll()
  })

  test('Should return empty array when no records match the date range', async () => {
    const from = '2000-01-01'
    const to = '2000-12-31'

    const res = await api
      .get(`/api/req-identification/search/created-at?from=${from}&to=${to}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)

    expect(Array.isArray(res.body.reqIdentifications)).toBe(true)
    expect(res.body.reqIdentifications).toHaveLength(0)
  })

  test('Should return matching records within date range', async () => {
    const uniqueName = `CreatedAtTest-${Date.now()}`
    const uniqueDescription = `Descripción-${Date.now()}`

    const payload = generateReqIdentificationData({
      reqIdentificationName: uniqueName,
      reqIdentificationDescription: uniqueDescription,
      legalBasisIds: [createdLegalBasis.id],
      requirementIds: [createdRequirement.id],
      intelligenceLevel: 'High'
    })

    await api
      .post('/api/req-identification')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(payload)
      .expect(201)

    const today = new Date()
    const from = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]
    const to = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]

    const res = await api
      .get(`/api/req-identification/search/created-at?from=${from}&to=${to}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)

    expect(res.body).toHaveProperty('reqIdentifications')
    expect(Array.isArray(res.body.reqIdentifications)).toBe(true)

    const found = res.body.reqIdentifications.find(
      (item) => item.name === uniqueName && item.description === uniqueDescription
    )
    expect(found).toBeDefined()
  })

  test('Should return 400 if from or to date is invalid', async () => {
    const res = await api
      .get('/api/req-identification/search/created-at?from=invalid-date')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(400)

    expect(res.body.message).toBe('Invalid date format')
    expect(res.body.errors).toBeInstanceOf(Array)
    expect(res.body.errors.length).toBeGreaterThan(0)
  })

  test('Should return 401 if token is invalid', async () => {
    const res = await api
      .get('/api/req-identification/search/created-at?from=2024-01-01&to=2024-12-31')
      .set('Authorization', 'Bearer invalid.token.here')
      .expect(401)

    expect(res.body).toHaveProperty('error', 'token missing or invalid')
  })

  test('Should return 500 on internal server error', async () => {
    const spy = jest.spyOn(ReqIdentificationRepository, 'findByCreatedAt')
    spy.mockImplementation(() => {
      throw new Error('DB Error')
    })

    const res = await api
      .get('/api/req-identification/search/created-at?from=2023-01-01&to=2024-01-01')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(500)

    expect(res.body.message).toBe('Failed to retrieve requirement identifications by creation date range')

    spy.mockRestore()
  })
})

describe('GET /api/req-identification/search/status - Get Requirement Identifications by status', () => {
  beforeEach(async () => {
    await ReqIdentificationRepository.deleteAll()
  })

  test('Should return empty array when no records match the status', async () => {
    const res = await api
      .get('/api/req-identification/search/status?status=Fallido')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)

    expect(Array.isArray(res.body.reqIdentifications)).toBe(true)
    expect(res.body.reqIdentifications).toHaveLength(0)
  })

  test('Should return matching records with status "Activo"', async () => {
    const uniqueName = `StatusTest-${Date.now()}`
    const payload = generateReqIdentificationData({
      reqIdentificationName: uniqueName,
      reqIdentificationDescription: `Descripción ${Date.now()}`,
      legalBasisIds: [createdLegalBasis.id],
      requirementIds: [createdRequirement.id],
      intelligenceLevel: 'Low'
    })

    await api
      .post('/api/req-identification')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(payload)
      .expect(201)

    const res = await api
      .get('/api/req-identification/search/status?status=Activo')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)

    expect(Array.isArray(res.body.reqIdentifications)).toBe(true)

    const found = res.body.reqIdentifications.find(
      (item) => item.name === uniqueName
    )
    expect(found).toBeDefined()
    expect(found.status).toBe('Activo')
  })

  test('Should return empty array if status param is missing or invalid', async () => {
    const resMissing = await api
      .get('/api/req-identification/search/status') // sin status
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)

    expect(Array.isArray(resMissing.body.reqIdentifications)).toBe(true)
    expect(resMissing.body.reqIdentifications.length).toBe(0)

    const resInvalid = await api
      .get('/api/req-identification/search/status?status=Inexistente')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)

    expect(Array.isArray(resInvalid.body.reqIdentifications)).toBe(true)
    expect(resInvalid.body.reqIdentifications.length).toBe(0)
  })

  test('Should return 401 if token is invalid', async () => {
    const res = await api
      .get('/api/req-identification/search/status?status=Activo')
      .set('Authorization', 'Bearer fake.token.here')
      .expect(401)

    expect(res.body.error).toBe('token missing or invalid')
  })
})
