/* eslint-disable no-undef */
import { api } from '../../config/test.config.js'
import UserRepository from '../../repositories/User.repository.js'
import SubjectsRepository from '../../repositories/Subject.repository.js'
import AspectsRepository from '../../repositories/Aspects.repository.js'
import LegalBasisRepository from '../../repositories/LegalBasis.repository.js'
import RequirementRepository from '../../repositories/Requirements.repository.js'
import { ADMIN_PASSWORD_TEST, ADMIN_GMAIL } from '../../config/variables.config.js'
import generateLegalBasisData from '../../utils/generateLegalBasisData.js'
import generateRequirementData from '../../utils/generateRequirementData.js'

const subjectName = 'Seguridad & Higiene'
const aspectNames = ['Organizacional', 'Tecnico', 'Ambiental']
const aspectName = 'Organizacional'
let tokenAdmin
let createdSubjectId
let createdAspectId
const createdAspectIds = []

const timeout = 20000
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
  const subjectResponse = await api
    .post('/api/subjects')
    .set('Authorization', `Bearer ${tokenAdmin}`)
    .send({
      subjectName,
      abbreviation: 'SH',
      orderIndex: 1
    })
    .expect(201)
    .expect('Content-Type', /application\/json/)

  createdSubjectId = subjectResponse.body.subject.id
}, timeout)

describe('Aspects API tests', () => {
  describe('POST /subjects/:subjectId/aspects - Create a new aspect', () => {
    test('Should successfully create a new aspect', async () => {
      const response = await api
        .post(`/api/subjects/${createdSubjectId}/aspects`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
          aspectName,
          abbreviation: 'ORG',
          orderIndex: 1
        })
        .expect(201)
        .expect('Content-Type', /application\/json/)
      const { aspect } = response.body
      expect(aspect).toHaveProperty('id')
      expect(aspect.subject_id).toBe(createdSubjectId)
      expect(aspect.aspect_name).toBe(aspectName)
      expect(aspect.abbreviation).toBe('ORG')
      expect(aspect.order_index).toBe(1)
      createdAspectId = aspect.id
    })

    test('Should return 409 if the aspect already exists for the subject', async () => {
      const response = await api
        .post(`/api/subjects/${createdSubjectId}/aspects`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
          aspectName,
          abbreviation: 'ORG',
          orderIndex: 1
        })
        .expect(409)
        .expect('Content-Type', /application\/json/)

      expect(response.body.message).toMatch(/Aspect already exists/i)
    })

    test('Should return 400 if aspectName is missing', async () => {
      const response = await api
        .post(`/api/subjects/${createdSubjectId}/aspects`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
          abbreviation: 'NOPE',
          orderIndex: 2
        })
        .expect(400)
        .expect('Content-Type', /application\/json/)

      expect(response.body.message).toMatch(/Validation failed/i)
    })

    test('Should return 401 if the user is unauthorized', async () => {
      const response = await api
        .post(`/api/subjects/${createdSubjectId}/aspects`)
        .send({
          aspectName,
          abbreviation: 'NOAUTH',
          orderIndex: 3
        })
        .expect(401)
        .expect('Content-Type', /application\/json/)

      expect(response.body.error).toMatch(/token missing or invalid/i)
    })

    test('Should return 404 if the subject does not exist', async () => {
      const nonExistentSubjectId = -1
      const response = await api
        .post(`/api/subjects/${nonExistentSubjectId}/aspects`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
          aspectName,
          abbreviation: 'BAD',
          orderIndex: 4
        })
        .expect(404)
        .expect('Content-Type', /application\/json/)

      expect(response.body.message).toMatch(/Subject not found/i)
    })

    test('Should return 400 if abbreviation is too long', async () => {
      const response = await api
        .post(`/api/subjects/${createdSubjectId}/aspects`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
          aspectName: 'Aspect With Long Abbr',
          abbreviation: 'ABCDEFGHIJK', // 11 characters
          orderIndex: 1
        })
        .expect(400)

      expect(response.body.message).toMatch(/Validation failed/i)
      expect(response.body.errors.some(e => e.field === 'abbreviation')).toBe(true)
    })

    test('Should return 400 if orderIndex is 0', async () => {
      const response = await api
        .post(`/api/subjects/${createdSubjectId}/aspects`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
          aspectName: 'Aspect Invalid Order',
          abbreviation: 'INV',
          orderIndex: 0
        })
        .expect(400)

      expect(response.body.message).toMatch(/Validation failed/i)
      expect(response.body.errors.some(e => e.field === 'orderIndex')).toBe(true)
    })
  })

  describe('GET /subjects/:subjectId/aspects - Retrieve all aspects for a specific subject', () => {
    test('Should retrieve the correct list of aspects for the subject', async () => {
      const response = await api
        .get(`/api/subjects/${createdSubjectId}/aspects`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200)
        .expect('Content-Type', /application\/json/)

      const { aspects } = response.body
      expect(aspects).toBeInstanceOf(Array)
      expect(aspects).toHaveLength(1)
      const [aspect] = aspects
      expect(aspect).toHaveProperty('id')
      expect(aspect).toHaveProperty('aspect_name', aspectName)
      expect(aspect).toHaveProperty('subject_id', createdSubjectId)
      expect(aspect).toHaveProperty('abbreviation', 'ORG')
      expect(aspect).toHaveProperty('order_index', 1)
    })

    test('Should return an empty array if no aspects are associated with the subject', async () => {
      // Crea un nuevo subject sin aspectos
      const responseCreate = await api
        .post('/api/subjects')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
          subjectName: 'Empty Subject',
          abbreviation: 'EMP',
          orderIndex: 99
        })
        .expect(201)
      const emptySubjectId = responseCreate.body.subject.id
      const response = await api
        .get(`/api/subjects/${emptySubjectId}/aspects`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200)
        .expect('Content-Type', /application\/json/)
      expect(response.body.aspects).toBeInstanceOf(Array)
      expect(response.body.aspects).toHaveLength(0)
    })

    test('Should return an error 404 for a non-existing subject ID', async () => {
      const nonExistentAspectId = -1
      const response = await api
        .get(`/api/subjects/${nonExistentAspectId}/aspects`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(404)
        .expect('Content-Type', /application\/json/)

      expect(response.body.message).toMatch(/Subject not found/i)
    })
  })

  test('Should return 401 if the user is unauthorized', async () => {
    const response = await api
      .get(`/api/subjects/${createdSubjectId}/aspects`)
      .expect(401)
      .expect('Content-Type', /application\/json/)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })
})
describe('Aspects API - GET /aspect/:id', () => {
  test('Should successfully retrieve an aspect by ID', async () => {
    const response = await api
      .get(`/api/aspect/${createdAspectId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const { aspect } = response.body
    expect(aspect).toHaveProperty('id', createdAspectId)
    expect(aspect).toHaveProperty('aspect_name', aspectName)
    expect(aspect).toHaveProperty('subject_id', createdSubjectId)
    expect(aspect).toHaveProperty('subject_name', subjectName)
    expect(aspect).toHaveProperty('abbreviation', 'ORG')
    expect(aspect).toHaveProperty('order_index', 1)
  })

  test('Should return 401 if the user is unauthorized', async () => {
    const response = await api
      .get(`/api/aspect/${createdAspectId}`)
      .expect(401)
      .expect('Content-Type', /application\/json/)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })

  test('Should return an error 404 for a non-existing aspect ID', async () => {
    const nonExistentAspectId = -1
    const response = await api
      .get(`/api/aspect/${nonExistentAspectId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(404)
      .expect('Content-Type', /application\/json/)

    expect(response.body.message).toMatch(/Aspect not found/i)
  })
})

describe('Aspects API - GET /subjects/:subjectId/aspects/name', () => {
  test('Should retrieve aspects by their name for a specific subject', async () => {
    const response = await api
      .get(`/api/subjects/${createdSubjectId}/aspects/name`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .query({ aspectName })
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const { aspects } = response.body
    expect(aspects).toBeInstanceOf(Array)
    expect(aspects).toHaveLength(1)
    const aspect = aspects[0]
    expect(aspect).toHaveProperty('id')
    expect(aspect).toHaveProperty('aspect_name', aspectName)
    expect(aspect).toHaveProperty('subject_id', createdSubjectId)
    expect(aspect).toHaveProperty('abbreviation', 'ORG')
    expect(aspect).toHaveProperty('order_index', 1)
  })

  test('Should return an empty array if no aspects match the name for the subject', async () => {
    const nonExistentAspectName = 'nonExistentAspectName'
    const response = await api
      .get(`/api/subjects/${createdSubjectId}/aspects/name`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .query({ aspectName: nonExistentAspectName })
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const { aspects } = response.body
    expect(aspects).toBeInstanceOf(Array)
    expect(aspects).toHaveLength(0)
  })

  test('Should return 404 if the subject does not exist', async () => {
    const nonExistentSubjectId = -1
    const response = await api
      .get(`/api/subjects/${nonExistentSubjectId}/aspects/name`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .query({ aspectName })
      .expect(404)
      .expect('Content-Type', /application\/json/)

    expect(response.body.message).toMatch(/Subject not found/i)
  })

  test('Should return 401 if the user is unauthorized', async () => {
    const response = await api
      .get(`/api/subjects/${createdSubjectId}/aspects/name`)
      .query({ aspectName })
      .expect(401)
      .expect('Content-Type', /application\/json/)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })
})

describe('Aspects API - PATCH /aspect/:id', () => {
  const newAspectName = 'Actualizado Organizacional'
  test('Should successfully update an aspect by ID', async () => {
    const response = await api
      .patch(`/api/aspect/${createdAspectId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        aspectName: newAspectName,
        abbreviation: 'ORG-ACT',
        orderIndex: 2
      })
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const { aspect } = response.body
    expect(aspect).toHaveProperty('id', createdAspectId)
    expect(aspect).toHaveProperty('aspect_name', newAspectName)
    expect(aspect).toHaveProperty('subject_id', createdSubjectId)
    expect(aspect).toHaveProperty('subject_name', subjectName)
    expect(aspect).toHaveProperty('abbreviation', 'ORG-ACT')
    expect(aspect).toHaveProperty('order_index', 2)
  })

  test('Should return 409 if the new aspect name already exists for the subject', async () => {
    await api
      .post(`/api/subjects/${createdSubjectId}/aspects`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        aspectName: 'Duplicado',
        abbreviation: 'DUP',
        orderIndex: 3
      })
      .expect(201)

    const response = await api
      .patch(`/api/aspect/${createdAspectId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        aspectName: 'Duplicado',
        abbreviation: 'ORG-ACT',
        orderIndex: 2
      })
      .expect(409)
      .expect('Content-Type', /application\/json/)

    expect(response.body.message).toMatch(/Aspect already exists/i)
  })

  test('Should return 400 if aspectName is missing in the request body', async () => {
    const response = await api
      .patch(`/api/aspect/${createdAspectId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({})
      .expect(400)
      .expect('Content-Type', /application\/json/)

    expect(response.body.message).toMatch(/Validation failed/i)
  })
  test('Should return 401 if the user is unauthorized', async () => {
    const response = await api
      .patch(`/api/aspect/${createdAspectId}`)
      .send({
        aspectName: newAspectName,
        abbreviation: 'ORG-ACT',
        orderIndex: 2
      })
      .expect(401)
      .expect('Content-Type', /application\/json/)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })

  test('Should return 404 if the aspect does not exist', async () => {
    const nonExistentAspectId = -1
    const response = await api
      .patch(`/api/aspect/${nonExistentAspectId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        aspectName: newAspectName,
        abbreviation: 'ORG-ACT',
        orderIndex: 2
      })
      .expect(404)
      .expect('Content-Type', /application\/json/)

    expect(response.body.message).toMatch(/Aspect not found/i)
  })

  test('Should return 400 if abbreviation is too long during update', async () => {
    const response = await api
      .patch(`/api/aspect/${createdAspectId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        aspectName: 'Updated Aspect',
        abbreviation: 'ABCDEFGHIJK',
        orderIndex: 2
      })
      .expect(400)

    expect(response.body.message).toMatch(/Validation failed/i)
    expect(response.body.errors.some(e => e.field === 'abbreviation')).toBe(true)
  })

  test('Should return 400 if orderIndex is 0 during update', async () => {
    const response = await api
      .patch(`/api/aspect/${createdAspectId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        aspectName: 'Updated Aspect',
        abbreviation: 'UA',
        orderIndex: 0
      })
      .expect(400)
    expect(response.body.message).toMatch(/Validation failed/i)
    expect(response.body.errors.some(e => e.field === 'orderIndex')).toBe(true)
  })
})

describe('Aspects API - DELETE /aspect/:id', () => {
  let createdLegalBasis
  let createdRequirement
  const timeout = 20000

  beforeAll(async () => {
    const aspectResponse = await api
      .post(`/api/subjects/${createdSubjectId}/aspects`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        aspectName: 'Aspect with deps',
        abbreviation: 'DEP',
        orderIndex: 5
      })
      .expect(201)

    createdAspectId = aspectResponse.body.aspect.id

    const legalBasisData = generateLegalBasisData({
      subjectId: String(createdSubjectId),
      aspectsIds: JSON.stringify([createdAspectId])
    })

    const legalBasisResponse = await api
      .post('/api/legalBasis')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(legalBasisData)
      .expect(201)

    createdLegalBasis = legalBasisResponse.body.legalBasis

    const requirementData = generateRequirementData({
      subjectId: String(createdSubjectId),
      aspectsIds: JSON.stringify([createdAspectId])
    })
    const requirementResponse = await api
      .post('/api/requirements')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(requirementData)
      .expect(201)

    createdRequirement = requirementResponse.body.requirement
  }, timeout)

  test('Should return 404 if the aspect does not exist', async () => {
    const nonExistentAspectId = -1
    const response = await api
      .delete(`/api/aspect/${nonExistentAspectId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(404)
      .expect('Content-Type', /application\/json/)

    expect(response.body.message).toMatch(/Aspect not found/i)
  })

  test('Should block deletion if aspect is associated with legal bases and requirements', async () => {
    const response = await api
      .delete(`/api/aspect/${createdAspectId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(409)
      .expect('Content-Type', /application\/json/)

    expect(response.body.message).toMatch(/associated with one or more legal bases/i)
  })

  describe('After removing legal basis', () => {
    beforeAll(async () => {
      await api
        .delete(`/api/legalBasis/${createdLegalBasis.id}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(204)
    })

    test('Should block deletion if aspect is still associated with requirements', async () => {
      const response = await api
        .delete(`/api/aspect/${createdAspectId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(409)
        .expect('Content-Type', /application\/json/)

      expect(response.body.message).toMatch(/associated with one or more requirements/i)
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
          .delete(`/api/aspect/${createdAspectId}`)
          .expect(401)
          .expect('Content-Type', /application\/json/)

        expect(response.body.error).toMatch(/token missing or invalid/i)
      })

      test('Should successfully delete the aspect when no dependencies exist', async () => {
        await api
          .delete(`/api/aspect/${createdAspectId}`)
          .set('Authorization', `Bearer ${tokenAdmin}`)
          .expect(204)

        const response = await api
          .get(`/api/aspect/${createdAspectId}`)
          .set('Authorization', `Bearer ${tokenAdmin}`)
          .expect(404)
          .expect('Content-Type', /application\/json/)

        expect(response.body.message).toMatch(/Aspect not found/i)
      })
    })
  })
})

describe('DELETE /aspects/batch - Delete multiple aspects with dependencies', () => {
  const createdLegalBases = []
  const createdRequirements = []
  const timeout = 20000

  beforeAll(async () => {
    for (let i = 0; i < aspectNames.length; i++) {
      const name = aspectNames[i]
      const aspectResponse = await api
        .post(`/api/subjects/${createdSubjectId}/aspects`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
          aspectName: name,
          abbreviation: `A${i + 1}`,
          orderIndex: i + 1
        })
        .expect(201)
      createdAspectIds.push(aspectResponse.body.aspect.id)
    }

    for (let i = 0; i < createdAspectIds.length; i++) {
      const aspectId = createdAspectIds[i]
      const legalBasisData = generateLegalBasisData({
        legalName: `LegalBasis ${i + 1}`,
        abbreviation: `LB-${i + 1}`,
        subjectId: String(createdSubjectId),
        aspectsIds: JSON.stringify([aspectId])
      })

      const legalBasisResponse = await api
        .post('/api/legalBasis')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(legalBasisData)
        .expect(201)

      createdLegalBases.push(legalBasisResponse.body.legalBasis)

      const requirementData = generateRequirementData({
        requirementNumber: i + 1,
        requirementName: `Requirement Test ${i + 1}`,
        subjectId: String(createdSubjectId),
        aspectsIds: JSON.stringify([aspectId])
      })

      const requirementResponse = await api
        .post('/api/requirements')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(requirementData)
        .expect(201)

      createdRequirements.push(requirementResponse.body.requirement)
    }
  }, timeout)

  test('Should block deletion if aspects are associated with legal bases', async () => {
    const response = await api
      .delete('/api/aspects/batch')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ aspectIds: createdAspectIds })
      .expect(409)

    expect(response.body.message).toMatch(/associated with legal bases/i)
  })

  describe('After removing all legal bases', () => {
    const timeout = 20000
    beforeAll(async () => {
      for (const legalBasis of createdLegalBases) {
        await api
          .delete(`/api/legalBasis/${legalBasis.id}`)
          .set('Authorization', `Bearer ${tokenAdmin}`)
          .expect(204)
      }
    }, timeout)

    test('Should block deletion if aspects are still associated with requirements', async () => {
      const response = await api
        .delete('/api/aspects/batch')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ aspectIds: createdAspectIds })
        .expect(409)

      expect(response.body.message).toMatch(/associated with requirements/i)
    })

    describe('After removing all requirements', () => {
      const timeout = 20000
      beforeAll(async () => {
        for (const req of createdRequirements) {
          await api
            .delete(`/api/requirement/${req.id}`)
            .set('Authorization', `Bearer ${tokenAdmin}`)
            .expect(204)
        }
      }, timeout)

      test('Should return 401 if the user is unauthorized', async () => {
        const response = await api
          .delete('/api/aspects/batch')
          .send({ aspectIds: createdAspectIds })
          .expect(401)

        expect(response.body.error).toMatch(/token missing or invalid/i)
      })

      test('Should successfully delete all aspects', async () => {
        await api
          .delete('/api/aspects/batch')
          .set('Authorization', `Bearer ${tokenAdmin}`)
          .send({ aspectIds: createdAspectIds })
          .expect(204)

        const response = await api
          .get(`/api/subjects/${createdSubjectId}/aspects`)
          .set('Authorization', `Bearer ${tokenAdmin}`)
          .expect(200)

        const remainingAspects = response.body.aspects
        expect(remainingAspects.some(aspect => createdAspectIds.includes(aspect.id))).toBe(false)
      })
    })
  })
})
