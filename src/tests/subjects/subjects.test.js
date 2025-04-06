/* eslint-disable no-undef */
import { api } from '../../config/test.config.js'
import UserRepository from '../../repositories/User.repository.js'
import SubjectsRepository from '../../repositories/Subject.repository.js'
import AspectsRepository from '../../repositories/Aspects.repository.js'
import { ADMIN_PASSWORD_TEST, ADMIN_GMAIL } from '../../config/variables.config.js'
import LegalBasisRepository from '../../repositories/LegalBasis.repository.js'
import RequirementRepository from '../../repositories/Requirements.repository.js'
import generateLegalBasisData from '../../utils/generateLegalBasisData.js'
import generateRequirementData from '../../utils/generateRequirementData.js'

const subjectName = 'Ambiental'
let tokenAdmin
const subjectNames = ['Seguridad', 'Gases', 'Suelo']
const aspectsToCreate = ['Organizacional', 'Técnico', 'Legal']
let createdSubjectId
const createdSubjectIds = []
const createdAspectIds = []

beforeAll(async () => {
  await RequirementRepository.deleteAll()
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
})

describe('Subjects API tests', () => {
  describe('POST /subjects - Create a new subject', () => {
    test('Should successfully create a new subject', async () => {
      const response = await api
        .post('/api/subjects')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
          subjectName,
          abbreviation: 'AMB',
          orderIndex: 1
        })
        .expect(201)
        .expect('Content-Type', /application\/json/)

      const { subject } = response.body
      expect(subject).toHaveProperty('id')
      expect(subject.subject_name).toBe(subjectName)
      expect(subject.abbreviation).toBe('AMB')
      expect(subject.order_index).toBe(1)
      createdSubjectId = subject.id
    })

    test('Should return 400 if subjectName is missing', async () => {
      const response = await api
        .post('/api/subjects')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
          abbreviation: 'ERR',
          orderIndex: 2
        })
        .expect(400)
        .expect('Content-Type', /application\/json/)

      expect(response.body.message).toMatch(/Validation failed/i)
    })

    test('Should return 401 if the user is unauthorized', async () => {
      const response = await api
        .post('/api/subjects')
        .send({
          subjectName: 'Unauthorized Subject',
          abbreviation: 'UNAUTH',
          orderIndex: 3
        })
        .expect(401)
        .expect('Content-Type', /application\/json/)

      expect(response.body.error).toMatch(/token missing or invalid/i)
    })

    test('Should return 409 if the subject already exists', async () => {
      const response = await api
        .post('/api/subjects')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
          subjectName,
          abbreviation: 'AMB',
          orderIndex: 1
        })
        .expect(409)
        .expect('Content-Type', /application\/json/)

      expect(response.body.message).toMatch(/Subject already exists/i)
    })
    test('Should return 400 if abbreviation is missing', async () => {
      const response = await api
        .post('/api/subjects')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
          subjectName: 'Missing Abbreviation',
          abbreviation: '',
          orderIndex: 1
        })
        .expect(400)
      expect(response.body.message).toMatch(/Validation failed/i)
      expect(response.body.errors.some(e => e.field === 'abbreviation')).toBe(true)
    })
    test('Should return 400 if orderIndex is 0', async () => {
      const response = await api
        .post('/api/subjects')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
          subjectName: 'Invalid Order',
          abbreviation: 'INV',
          orderIndex: 0
        })
        .expect(400)
      expect(response.body.message).toMatch(/Validation failed/i)
      expect(response.body.errors.some(e => e.field === 'orderIndex')).toBe(true)
    })
  })

  describe('GET /subjects - Retrieve all subjects', () => {
    test('Should retrieve all subjects with correct length', async () => {
      const response = await api
        .get('/api/subjects')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200)
        .expect('Content-Type', /application\/json/)
      expect(response.body.subjects).toHaveLength(1)
      const subject = response.body.subjects[0]
      expect(subject.subject_name).toBe(subjectName)
      expect(subject.abbreviation).toBe('AMB')
      expect(subject.order_index).toBe(1)
    })
    test('Should return 401 if the user is unauthorized', async () => {
      const response = await api
        .get('/api/subjects')
        .expect(401)
        .expect('Content-Type', /application\/json/)

      expect(response.body.error).toMatch(/token missing or invalid/i)
    })
  })

  describe('GET /subject/:id - Retrieve subject by ID', () => {
    test('Should retrieve the subject with a valid ID', async () => {
      const response = await api
        .get(`/api/subject/${createdSubjectId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200)
        .expect('Content-Type', /application\/json/)

      const { subject } = response.body
      expect(subject).toHaveProperty('id', createdSubjectId)
      expect(subject.subject_name).toBe(subjectName)
      expect(subject.abbreviation).toBe('AMB')
      expect(subject.order_index).toBe(1)
    })

    test('Should return an error 404 for a subject not found', async () => {
      const nonExistentSubjectId = -1
      const response = await api
        .get(`/api/subject/${nonExistentSubjectId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(404)
        .expect('Content-Type', /application\/json/)

      expect(response.body.message).toMatch(/Subject not found/i)
    })
    test('Should return 401 if the user is unauthorized', async () => {
      const response = await api
        .get(`/api/subject/${createdSubjectId}`)
        .expect(401)
        .expect('Content-Type', /application\/json/)

      expect(response.body.error).toMatch(/token missing or invalid/i)
    })
  })

  describe('Subjects API - GET /subjects/name', () => {
    test('Should retrieve a subject by its name', async () => {
      const response = await api
        .get('/api/subjects/name')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .query({ subjectName })
        .expect(200)
        .expect('Content-Type', /application\/json/)

      const { subjects } = response.body
      expect(subjects).toHaveLength(1)
      const subject = subjects[0]
      expect(subject).toHaveProperty('id')
      expect(subject.subject_name).toBe(subjectName)
      expect(subject.abbreviation).toBe('AMB')
      expect(subject.order_index).toBe(1)
    })

    test('Should return an empty array if the subject does not exist', async () => {
      const nonExistentSubjectName = 'nonExistentSubjectName'
      const response = await api
        .get('/api/subjects/name')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .query({ subjectName: nonExistentSubjectName })
        .expect(200)
        .expect('Content-Type', /application\/json/)

      const { subjects } = response.body
      expect(subjects).toBeInstanceOf(Array)
      expect(subjects).toHaveLength(0)
    })
    test('Should return 401 if the user is unauthorized', async () => {
      const response = await api
        .get('/api/subjects/name')
        .query({ subjectName })
        .expect(401)
        .expect('Content-Type', /application\/json/)

      expect(response.body.error).toMatch(/token missing or invalid/i)
    })
  })

  describe('PATCH /subject/:id - Update subject by ID', () => {
    test('Should successfully update the subject name', async () => {
      const newSubjectName = 'Ambiental Actualizado'
      const response = await api
        .patch(`/api/subject/${createdSubjectId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
          subjectName: newSubjectName,
          abbreviation: 'ACT',
          orderIndex: 5
        })
        .expect(200)
        .expect('Content-Type', /application\/json/)

      const { subject } = response.body
      expect(subject).toHaveProperty('id', createdSubjectId)
      expect(subject.subject_name).toBe(newSubjectName)
      expect(subject.abbreviation).toBe('ACT')
      expect(subject.order_index).toBe(5)
    })

    test('Should return 404 if the subject does not exist', async () => {
      const nonExistentSubjectId = -1
      const response = await api
        .patch(`/api/subject/${nonExistentSubjectId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
          subjectName: 'No Existe',
          abbreviation: 'NA',
          orderIndex: 2
        })
        .expect(404)
        .expect('Content-Type', /application\/json/)

      expect(response.body.message).toMatch(/Subject not found/i)
    })

    test('Should return 400 if subjectName is missing', async () => {
      const response = await api
        .patch(`/api/subject/${createdSubjectId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({})
        .expect(400)
        .expect('Content-Type', /application\/json/)

      expect(response.body.message).toMatch(/Validation failed/i)
    })

    test('Should return 409 if the subject name already exists', async () => {
      const duplicateSubjectName = 'Ambiental Duplicado'

      await api
        .post('/api/subjects')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
          subjectName: duplicateSubjectName,
          abbreviation: 'DUP',
          orderIndex: 3
        })
        .expect(201)
        .expect('Content-Type', /application\/json/)

      const response = await api
        .patch(`/api/subject/${createdSubjectId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
          subjectName: duplicateSubjectName,
          abbreviation: 'ACT',
          orderIndex: 1
        })
        .expect(409)
        .expect('Content-Type', /application\/json/)

      expect(response.body.message).toMatch(/Subject already exists/i)
    })
    test('Should return 401 if the user is unauthorized', async () => {
      const response = await api
        .patch(`/api/subject/${createdSubjectId}`)
        .send({
          subjectName: 'Otro Cambio',
          abbreviation: 'OTR',
          orderIndex: 10
        })
        .expect(401)
        .expect('Content-Type', /application\/json/)

      expect(response.body.error).toMatch(/token missing or invalid/i)
    })
    test('Should return 400 if abbreviation is empty during update', async () => {
      const response = await api
        .patch(`/api/subject/${createdSubjectId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
          subjectName: 'Update Test',
          abbreviation: '',
          orderIndex: 1
        })
        .expect(400)
      expect(response.body.message).toMatch(/Validation failed/i)
      expect(response.body.errors.some(e => e.field === 'abbreviation')).toBe(true)
    })
    test('Should return 400 if orderIndex is 0 during update', async () => {
      const response = await api
        .patch(`/api/subject/${createdSubjectId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
          subjectName: 'Update Test',
          abbreviation: 'UPD',
          orderIndex: 0
        })
        .expect(400)
      expect(response.body.message).toMatch(/Validation failed/i)
      expect(response.body.errors.some(e => e.field === 'orderIndex')).toBe(true)
    })
  })

  describe('DELETE /subject/:id - Delete subject by ID', () => {
    let createdLegalBasis
    let createdRequirement
    const timeout = 20000

    beforeAll(async () => {
      const subjectResponse = await api
        .post('/api/subjects')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
          subjectName,
          abbreviation: 'AMB',
          orderIndex: 1
        })
        .expect(201)
        .expect('Content-Type', /application\/json/)

      createdSubjectId = subjectResponse.body.subject.id

      for (let i = 0; i < aspectsToCreate.length; i++) {
        const aspectName = aspectsToCreate[i]
        const aspectResponse = await api
          .post(`/api/subjects/${createdSubjectId}/aspects`)
          .set('Authorization', `Bearer ${tokenAdmin}`)
          .send({
            aspectName,
            abbreviation: `A${i + 1}`,
            orderIndex: i + 1
          })
          .expect(201)
          .expect('Content-Type', /application\/json/)
        const { aspect } = aspectResponse.body
        createdAspectIds.push(aspect.id)
      }

      const legalBasisData = generateLegalBasisData({
        subjectId: String(createdSubjectId),
        aspectsIds: JSON.stringify(createdAspectIds)
      })

      const legalBasisResponse = await api
        .post('/api/legalBasis')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(legalBasisData)
        .expect(201)
        .expect('Content-Type', /application\/json/)

      createdLegalBasis = legalBasisResponse.body.legalBasis

      const requirementData = generateRequirementData({
        subjectId: String(createdSubjectId),
        aspectsIds: JSON.stringify(createdAspectIds)
      })

      const requirementResponse = await api
        .post('/api/requirements')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(requirementData)
        .expect(201)
        .expect('Content-Type', /application\/json/)

      createdRequirement = requirementResponse.body.requirement
    }, timeout)

    test('Should return 404 if the subject does not exist', async () => {
      const nonExistentSubjectId = -1

      const response = await api
        .delete(`/api/subject/${nonExistentSubjectId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(404)
        .expect('Content-Type', /application\/json/)

      expect(response.body.message).toMatch(/Subject not found/i)
    })

    test('Should block deletion if subject is associated with legal bases and requirements', async () => {
      const deleteResponse = await api
        .delete(`/api/subject/${createdSubjectId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(409)
        .expect('Content-Type', /application\/json/)

      expect(deleteResponse.body.message).toMatch(/associated with one or more legal bases/i)
    })

    describe('After removing legal basis', () => {
      beforeAll(async () => {
        await api
          .delete(`/api/legalBasis/${createdLegalBasis.id}`)
          .set('Authorization', `Bearer ${tokenAdmin}`)
          .expect(204)
      })

      test('Should block deletion if subject is still associated with requirements', async () => {
        const deleteResponse = await api
          .delete(`/api/subject/${createdSubjectId}`)
          .set('Authorization', `Bearer ${tokenAdmin}`)
          .expect(409)
          .expect('Content-Type', /application\/json/)

        expect(deleteResponse.body.message).toMatch(/associated with one or more requirements/i)
      })

      describe('After removing requirement', () => {
        beforeAll(async () => {
          await api
            .delete(`/api/requirement/${createdRequirement.id}`)
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .expect(204)
        })

        test('Should return 401 if the user is unauthorized', async () => {
          const response = await api
            .delete(`/api/subject/${createdSubjectId}`)
            .expect(401)
            .expect('Content-Type', /application\/json/)

          expect(response.body.error).toMatch(/token missing or invalid/i)
        })

        test('Should successfully delete the subject when no dependencies exist', async () => {
          await api
            .delete(`/api/subject/${createdSubjectId}`)
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .expect(204)

          const response = await api
            .get('/api/subjects')
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .expect(200)
            .expect('Content-Type', /application\/json/)

          const subjects = response.body.subjects
          expect(subjects.some(subj => subj.id === createdSubjectId)).toBe(false)
        })
      })
    })
  })

  describe('DELETE /subjects/batch - Delete multiple subjects with dependencies', () => {
    const createdLegalBases = []
    const createdRequirements = []
    const timeout = 20000
    beforeAll(async () => {
      for (let i = 0; i < subjectNames.length; i++) {
        const name = subjectNames[i]

        const subjectResponse = await api
          .post('/api/subjects')
          .set('Authorization', `Bearer ${tokenAdmin}`)
          .send({
            subjectName: name,
            abbreviation: `S${i + 1}`,
            orderIndex: i + 1
          })
          .expect(201)

        const subject = subjectResponse.body.subject
        createdSubjectIds.push(subject.id)

        const aspectIdsForSubject = []
        for (let j = 0; j < aspectsToCreate.length; j++) {
          const aspectName = aspectsToCreate[j]
          const aspectResponse = await api
            .post(`/api/subjects/${subject.id}/aspects`)
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .send({
              aspectName,
              abbreviation: `A${i + 1}${j + 1}`,
              orderIndex: j + 1
            })
            .expect(201)

          aspectIdsForSubject.push(aspectResponse.body.aspect.id)
        }
        createdAspectIds.push(aspectIdsForSubject)

        const legalBasisData = generateLegalBasisData({
          legalName: `LegalName ${i + 1}`,
          abbreviation: `LB-${i + 1}`,
          subjectId: String(subject.id),
          aspectsIds: JSON.stringify(aspectIdsForSubject)
        })

        const legalBasisResponse = await api
          .post('/api/legalBasis')
          .set('Authorization', `Bearer ${tokenAdmin}`)
          .send(legalBasisData)
          .expect(201)

        createdLegalBases.push(legalBasisResponse.body.legalBasis)

        const requirementData = generateRequirementData({
          requirementNumber: `REQ-${i + 1}`,
          requirementName: `Requirement Test ${i + 1}`,
          subjectId: String(subject.id),
          aspectsIds: JSON.stringify(aspectIdsForSubject)
        })

        const requirementResponse = await api
          .post('/api/requirements')
          .set('Authorization', `Bearer ${tokenAdmin}`)
          .send(requirementData)
          .expect(201)

        createdRequirements.push(requirementResponse.body.requirement)
      }
    }, timeout)

    test('Should block deletion if subjects are associated with legal bases', async () => {
      const response = await api
        .delete('/api/subjects/batch')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ subjectIds: createdSubjectIds })
        .expect(409)

      expect(response.body.message).toMatch(/associated with legal bases/i)
    })

    describe('After removing all legal bases', () => {
      beforeAll(async () => {
        for (const legalBasis of createdLegalBases) {
          await api
            .delete(`/api/legalBasis/${legalBasis.id}`)
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .expect(204)
        }
      })

      test('Should block deletion if subjects are still associated with requirements', async () => {
        const response = await api
          .delete('/api/subjects/batch')
          .set('Authorization', `Bearer ${tokenAdmin}`)
          .send({ subjectIds: createdSubjectIds })
          .expect(409)

        expect(response.body.message).toMatch(/associated with requirements/i)
      })

      describe('After removing all requirements', () => {
        beforeAll(async () => {
          for (const req of createdRequirements) {
            await api
              .delete(`/api/requirement/${req.id}`)
              .set('Authorization', `Bearer ${tokenAdmin}`)
              .expect(204)
          }
        })

        test('Should return 401 if the user is unauthorized', async () => {
          const response = await api
            .delete('/api/subjects/batch')
            .send({ subjectIds: createdSubjectIds })
            .expect(401)
            .expect('Content-Type', /application\/json/)

          expect(response.body.error).toMatch(/token missing or invalid/i)
        })

        test('Should successfully delete all subjects', async () => {
          await api
            .delete('/api/subjects/batch')
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .send({ subjectIds: createdSubjectIds })
            .expect(204)

          const response = await api
            .get('/api/subjects')
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .expect(200)

          const remainingSubjects = response.body.subjects
          expect(remainingSubjects.some(subject => createdSubjectIds.includes(subject.id))).toBe(false)
        })
      })
    })
  })
})
