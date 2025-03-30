/* eslint-disable no-undef */
import { api } from '../../../config/test.config.js'
import UserRepository from '../../../repositories/User.repository.js'
import RequirementsIdentificationRepository from '../../../repositories/RequirementsIdentification.repository.js'
import RequirementRepository from '../../../repositories/Requirements.repository.js'
import SubjectsRepository from '../../../repositories/Subject.repository.js'
import AspectsRepository from '../../../repositories/Aspects.repository.js'
import LegalBasisRepository from '../../../repositories/LegalBasis.repository.js'
import ArticlesRepository from '../../../repositories/Articles.repository.js'
import generateRequirementData from '../../../utils/generateRequirementData.js'
import generateLegalBasisData from '../../../utils/generateLegalBasisData.js'
import generateArticleData from '../../../utils/generateArticleData.js'

import {
  ADMIN_PASSWORD_TEST,
  ADMIN_GMAIL
} from '../../../config/variables.config.js'

const subjectName = 'Seguridad & Higiene'
const aspectsToCreate = ['Organizacional', 'Técnico', 'Legal']
let tokenAdmin
let createdSubjectId
const createdAspectIds = []
let createdLegalBasisId
const timeout = 20000

beforeAll(async () => {
  await RequirementsIdentificationRepository.deleteAll()
  await RequirementRepository.deleteAll()
  await LegalBasisRepository.deleteAll()
  await SubjectsRepository.deleteAll()
  await AspectsRepository.deleteAll()
  await ArticlesRepository.deleteAll()
  await UserRepository.deleteAllExceptByGmail(ADMIN_GMAIL)

  const response = await api
    .post('/api/user/login')
    .send({
      gmail: ADMIN_GMAIL,
      password: ADMIN_PASSWORD_TEST
    })
    .expect(200)

  tokenAdmin = response.body.token

  const subjectResponse = await api
    .post('/api/subjects')
    .set('Authorization', `Bearer ${tokenAdmin}`)
    .send({ subjectName })
    .expect(201)

  createdSubjectId = subjectResponse.body.subject.id

  for (const aspectName of aspectsToCreate) {
    const aspectResponse = await api
      .post(`/api/subjects/${createdSubjectId}/aspects`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ aspectName })
      .expect(201)

    const { aspect } = aspectResponse.body
    createdAspectIds.push(aspect.id)
  }

  const requirementData = generateRequirementData({
    subjectId: String(createdSubjectId),
    aspectId: String(createdAspectIds[0])
  })

  await api
    .post('/api/requirements')
    .set('Authorization', `Bearer ${tokenAdmin}`)
    .send(requirementData)
    .expect(201)

  const legalBasisData = generateLegalBasisData({
    subjectId: String(createdSubjectId),
    aspectsIds: JSON.stringify(createdAspectIds)
  })

  const legalBasisResponse = await api
    .post('/api/legalBasis')
    .set('Authorization', `Bearer ${tokenAdmin}`)
    .send(legalBasisData)
    .expect(201)

  createdLegalBasisId = legalBasisResponse.body.legalBasis.id

  const articleData = generateArticleData()
  await api
    .post(`/api/articles/legalBasis/${createdLegalBasisId}`)
    .set('Authorization', `Bearer ${tokenAdmin}`)
    .send(articleData)
    .expect(201)
}, timeout)

describe('Start Requirements Identification', () => {
  test('Should successfully start a requirements identification job', async () => {
    const payload = {
      identificationName: 'Identificación Única de Prueba',
      identificationDescription: 'Descripción de prueba',
      legalBasisIds: JSON.stringify([createdLegalBasisId]),
      subjectId: String(createdSubjectId),
      aspectIds: JSON.stringify([createdAspectIds[0]]),
      intelligenceLevel: 'High'
    }

    const response = await api
      .post('/api/requirements-identifications')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(payload)
      .expect(201)

    expect(response.body).toHaveProperty('jobId')
    expect(response.body).toHaveProperty('requirementsIdentificationId')
  })
})
