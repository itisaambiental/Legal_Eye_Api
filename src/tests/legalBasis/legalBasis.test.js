/* eslint-disable no-undef */
import { api } from '../../config/test.config.js'
import UserRepository from '../../repositories/User.repository.js'
import SubjectsRepository from '../../repositories/Subject.repository.js'
import LegalBasisRepository from '../../repositories/LegalBasis.repository.js'
import AspectsRepository from '../../repositories/Aspects.repository.js'
import { ADMIN_PASSWORD_TEST, ADMIN_GMAIL } from '../../config/variables.config.js'
import generateLegalBasisData from '../../utils/generateLegalBasis.js'
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
describe('Legal Basis API', () => {
  test('Should successfully create a legal basis without a document and return correct values', async () => {
    const legalBasisData = generateLegalBasisData({
      legalName: 'Normativa de Seguridad',
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
      lastReform: legalBasisData.lastReform,
      url: null
    })
    expect(legalBasis.aspects).toEqual(
      expect.arrayContaining(
        createdAspectIds.map((aspectId) => expect.objectContaining({ aspect_id: aspectId }))
      )
    )
    expect(legalBasis.subject).toMatchObject({
      subject_id: createdSubjectId,
      subject_name: subjectName
    })
  })
})
