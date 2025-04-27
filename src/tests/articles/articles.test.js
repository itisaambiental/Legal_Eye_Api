/* eslint-disable no-undef */
import { api } from '../../config/test.config.js'
import UserRepository from '../../repositories/User.repository.js'
import SubjectsRepository from '../../repositories/Subject.repository.js'
import LegalBasisRepository from '../../repositories/LegalBasis.repository.js'
import ArticlesRepository from '../../repositories/Articles.repository.js'
import AspectsRepository from '../../repositories/Aspects.repository.js'
import RequirementRepository from '../../repositories/Requirements.repository.js'
import generateLegalBasisData from '../../utils/generateLegalBasisData.js'
import generateArticleData from '../../utils/generateArticleData.js'
import SendLegalBasisService from '../../services/legalBasis/sendLegalBasis/sendLegalBasis.service.js'

import {
  ADMIN_PASSWORD_TEST,
  ADMIN_GMAIL
} from '../../config/variables.config.js'

const subjectName = 'Seguridad & Higiene'
const aspectsToCreate = ['Organizacional', 'Técnico', 'Legal']
let tokenAdmin
let createdSubjectId
const createdAspectIds = []
let createdLegalBasisId

const timeout = 20000
beforeAll(async () => {
  await RequirementRepository.deleteAll()
  await LegalBasisRepository.deleteAll()
  await ArticlesRepository.deleteAll()
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
      abbreviation: 'AMB',
      orderIndex: 1
    })
    .expect(201)
    .expect('Content-Type', /application\/json/)

  createdSubjectId = subjectResponse.body.subject.id

  for (const aspectName of aspectsToCreate) {
    const aspectResponse = await api
      .post(`/api/subjects/${createdSubjectId}/aspects`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        aspectName,
        abbreviation: 'ORG',
        orderIndex: 1
      })
      .expect(201)
      .expect('Content-Type', /application\/json/)

    const { aspect } = aspectResponse.body
    createdAspectIds.push(aspect.id)
  }
}, timeout)

beforeEach(async () => {
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
  createdLegalBasisId = legalBasisResponse.body.legalBasis.id
})
afterEach(async () => {
  await LegalBasisRepository.deleteAll()
  await ArticlesRepository.deleteAll()
  jest.restoreAllMocks()
})

describe('Create an article', () => {
  test('Should successfully create an article associated with a legal basis', async () => {
    const articleData = generateArticleData()
    const response = await api
      .post(`/api/articles/legalBasis/${createdLegalBasisId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(articleData)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    const { article } = response.body
    expect(article).toHaveProperty('id')
    expect(article).toHaveProperty('legal_basis_id', createdLegalBasisId)
    expect(article).toHaveProperty('article_name', articleData.title)
    expect(article).toHaveProperty('description', articleData.article)
    expect(article).toHaveProperty('article_order', articleData.order)
  })
  test('Should return 404 when trying to create an article with an invalid legal basis ID', async () => {
    const articleData = generateArticleData()
    const invalidId = -1
    const response = await api
      .post(`/api/articles/legalBasis/${invalidId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(articleData)
      .expect(404)
      .expect('Content-Type', /application\/json/)

    expect(response.body.message).toMatch(/LegalBasis not found/i)
  })
  test('Should return 401 if the user is unauthorized', async () => {
    const articleData = generateArticleData()
    const response = await api
      .post(`/api/articles/legalBasis/${createdLegalBasisId}`)
      .send(articleData)
      .expect(401)
      .expect('Content-Type', /application\/json/)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })

  test('Should return 400 if required fields are missing or invalid', async () => {
    const invalidArticleCases = [
      { article: 'Content without title or order' },
      { title: 'Title without content or order' },
      { title: 'Title', article: 'Content', order: 0 },
      { title: '', article: 'Content', order: 1 },
      { title: '', order: 1 },
      { order: 1 },
      { title: 'Title' },
      {}
    ]

    for (const invalidArticle of invalidArticleCases) {
      const response = await api
        .post(`/api/articles/legalBasis/${createdLegalBasisId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(invalidArticle)
        .expect(400)
        .expect('Content-Type', /application\/json/)

      expect(response.body.message).toBe('Validation failed')
      expect(response.body.errors).toBeDefined()
      expect(response.body.errors).toBeInstanceOf(Array)
      expect(response.body.errors.length).toBeGreaterThan(0)

      response.body.errors.forEach((error) => {
        expect(error).toHaveProperty('field')
        expect(error).toHaveProperty('message')
      })
    }
  })
})

describe('Get articles by Legal Basis Id', () => {
  test('Should return an empty list when no articles are associated with the legal basis', async () => {
    const response = await api
      .get(`/api/articles/legalBasis/${createdLegalBasisId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const { articles } = response.body
    expect(articles).toBeInstanceOf(Array)
    expect(articles.length).toBe(0)
  })

  test('Should return a list with the created article', async () => {
    const articleData = generateArticleData()
    const postResponse = await api
      .post(`/api/articles/legalBasis/${createdLegalBasisId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(articleData)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    const createdArticle = postResponse.body.article
    const getResponse = await api
      .get(`/api/articles/legalBasis/${createdLegalBasisId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const { articles } = getResponse.body
    expect(articles).toBeInstanceOf(Array)
    expect(articles.length).toBe(1)

    const retrievedArticle = articles[0]
    expect(retrievedArticle).toMatchObject({
      id: createdArticle.id,
      legal_basis_id: createdArticle.legal_basis_id,
      article_name: createdArticle.article_name,
      description: createdArticle.description,
      article_order: createdArticle.article_order
    })
  })

  test('Should return 404 when trying to retrieve articles with an invalid legal basis ID', async () => {
    const invalidId = -1
    const response = await api
      .get(`/api/articles/legalBasis/${invalidId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(404)
      .expect('Content-Type', /application\/json/)

    expect(response.body.message).toMatch(/LegalBasis not found/i)
  })

  test('Should return 401 if the user is unauthorized', async () => {
    const response = await api
      .get(`/api/articles/legalBasis/${createdLegalBasisId}`)
      .expect(401)
      .expect('Content-Type', /application\/json/)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })
})
describe('Filter articles by name', () => {
  test('Should return an empty list if no articles match the name for the given legal basis', async () => {
    const response = await api
      .get(`/api/articles/${createdLegalBasisId}/name`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .query({ name: 'NonExistentName' })
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const { articles } = response.body
    expect(articles).toBeInstanceOf(Array)
    expect(articles.length).toBe(0)
  })

  test('Should return a list of articles matching the name for the given legal basis', async () => {
    const articleData = generateArticleData({ title: 'UniqueArticleName' })
    await api
      .post(`/api/articles/legalBasis/${createdLegalBasisId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(articleData)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    const response = await api
      .get(`/api/articles/${createdLegalBasisId}/name`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .query({ name: 'UniqueArticleName' })
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const { articles } = response.body
    expect(articles).toBeInstanceOf(Array)
    expect(articles.length).toBe(1)

    const retrievedArticle = articles[0]
    expect(retrievedArticle).toMatchObject({
      article_name: articleData.title,
      description: articleData.article,
      article_order: articleData.order
    })
  })

  test('Should return 401 if the user is unauthorized', async () => {
    const response = await api
      .get(`/api/articles/${createdLegalBasisId}/name`)
      .query({ name: 'UniqueArticleName' })
      .expect(401)
      .expect('Content-Type', /application\/json/)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })
})

describe('Filter articles by description', () => {
  test('Should return a list of articles matching the description for the given legal basis', async () => {
    const articleData = generateArticleData({
      article: 'UniqueArticleDescription'
    })

    await api
      .post(`/api/articles/legalBasis/${createdLegalBasisId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(articleData)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    const response = await api
      .get(`/api/articles/${createdLegalBasisId}/description`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .query({ description: 'UniqueArticleDescription' })
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const { articles } = response.body
    expect(articles).toBeInstanceOf(Array)
    expect(articles.length).toBe(1)

    const retrievedArticle = articles[0]
    expect(retrievedArticle).toMatchObject({
      article_name: articleData.title,
      description: articleData.article,
      article_order: articleData.order
    })
  })

  test('Should return 401 if the user is unauthorized', async () => {
    const response = await api
      .get(`/api/articles/${createdLegalBasisId}/description`)
      .query({ description: 'UniqueArticleDescription' })
      .expect(401)
      .expect('Content-Type', /application\/json/)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })
})

describe('Get an article by its ID', () => {
  let createdArticleId

  beforeEach(async () => {
    const articleData = generateArticleData()
    const response = await api
      .post(`/api/articles/legalBasis/${createdLegalBasisId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(articleData)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    createdArticleId = response.body.article.id
  })

  test('Should return 404 when trying to retrieve a non-existent article', async () => {
    const invalidId = -1

    const response = await api
      .get(`/api/article/${invalidId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(404)
      .expect('Content-Type', /application\/json/)

    expect(response.body.message).toMatch(/Article not found/i)
  })

  test('Should return the correct article by its ID', async () => {
    const getResponse = await api
      .get(`/api/article/${createdArticleId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const { article } = getResponse.body

    expect(article).toBeDefined()
    expect(article).toHaveProperty('id', createdArticleId)
    expect(article).toHaveProperty('legal_basis_id', createdLegalBasisId)
    expect(article).toHaveProperty('article_name')
    expect(article).toHaveProperty('description')
    expect(article).toHaveProperty('article_order')
  })

  test('Should return 401 if the user is unauthorized', async () => {
    const response = await api
      .get(`/api/article/${createdArticleId}`)
      .expect(401)
      .expect('Content-Type', /application\/json/)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })
})

describe('Update an article', () => {
  let createdArticleId
  beforeEach(async () => {
    const articleData = generateArticleData()
    const response = await api
      .post(`/api/articles/legalBasis/${createdLegalBasisId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(articleData)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    createdArticleId = response.body.article.id
  })

  test('Should successfully update an article by its ID', async () => {
    const updatedData = {
      title: 'Updated Article Title',
      article: 'Updated article content.',
      order: 99
    }
    const updateResponse = await api
      .patch(`/api/article/${createdArticleId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(updatedData)
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const { article: updatedArticle } = updateResponse.body

    expect(updatedArticle).toHaveProperty('id', createdArticleId)
    expect(updatedArticle).toHaveProperty('article_name', updatedData.title)
    expect(updatedArticle).toHaveProperty('description', updatedData.article)
    expect(updatedArticle).toHaveProperty('article_order', updatedData.order)

    const getResponse = await api
      .get(`/api/article/${createdArticleId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const { article } = getResponse.body

    expect(article).toBeDefined()
    expect(article).toMatchObject({
      id: createdArticleId,
      article_name: updatedData.title,
      description: updatedData.article,
      article_order: updatedData.order
    })
  })

  test('Should return 404 when trying to update a non-existent article', async () => {
    const invalidId = -1
    const updatedData = {
      title: 'Non-existent Title',
      article: 'Non-existent Content',
      order: 1
    }
    const response = await api
      .patch(`/api/article/${invalidId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(updatedData)
      .expect(404)
      .expect('Content-Type', /application\/json/)

    expect(response.body.message).toMatch(/Article not found/i)
  })

  test('Should return 401 if the user is unauthorized', async () => {
    const updatedData = {
      title: 'Unauthorized Update',
      article: 'Unauthorized Content',
      order: 2
    }
    const response = await api
      .patch(`/api/article/${createdArticleId}`)
      .send(updatedData)
      .expect(401)
      .expect('Content-Type', /application\/json/)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })

  test('Should return 400 if required fields are invalid', async () => {
    const invalidData = {
      title: '',
      article: '',
      order: 0
    }
    const response = await api
      .patch(`/api/article/${createdArticleId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(invalidData)
      .expect(400)
      .expect('Content-Type', /application\/json/)

    expect(response.body.message).toBe('Validation failed')
    expect(response.body.errors).toBeInstanceOf(Array)
    expect(response.body.errors.length).toBeGreaterThan(0)

    response.body.errors.forEach((error) => {
      expect(error).toHaveProperty('field')
      expect(error).toHaveProperty('message')
    })
  })
})

describe('Delete an article', () => {
  let createdArticleId

  beforeEach(async () => {
    const articleData = generateArticleData()
    const response = await api
      .post(`/api/articles/legalBasis/${createdLegalBasisId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(articleData)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    createdArticleId = response.body.article.id
  })

  afterEach(async () => {
    jest.restoreAllMocks()
  })

  test('Should successfully delete an article by its ID', async () => {
    const getResponseBeforeDelete = await api
      .get(`/api/article/${createdArticleId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const { article } = getResponseBeforeDelete.body
    expect(article).toHaveProperty('id', createdArticleId)
    expect(article).toHaveProperty('legal_basis_id', createdLegalBasisId)

    await api
      .delete(`/api/article/${createdArticleId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(204)

    const getResponseAfterDelete = await api
      .get(`/api/article/${createdArticleId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(404)
      .expect('Content-Type', /application\/json/)

    expect(getResponseAfterDelete.body.message).toMatch(/Article not found/i)
  })

  test('Should return 404 when trying to delete a non-existent article', async () => {
    const invalidId = -1
    const response = await api
      .delete(`/api/article/${invalidId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(404)
      .expect('Content-Type', /application\/json/)

    expect(response.body.message).toMatch(/Article not found/i)
  })

  test('Should return 401 if the user is unauthorized', async () => {
    const response = await api
      .delete(`/api/article/${createdArticleId}`)
      .expect(401)
      .expect('Content-Type', /application\/json/)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })

  test('Should prevent deleting a single article if there is a pending Send Legal Basis job', async () => {
    jest.spyOn(SendLegalBasisService, 'hasPendingSendJobs').mockResolvedValue({
      hasPendingJobs: true,
      jobId: 'mockedJobId'
    })

    const response = await api
      .delete(`/api/article/${createdArticleId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(409)
      .expect('Content-Type', /application\/json/)

    expect(response.body.message).toMatch(
      /Cannot delete Article with pending Send Legal Basis jobs/i
    )
  })
})

describe('Delete multiple articles', () => {
  let createdArticleIds = []

  beforeEach(async () => {
    createdArticleIds = []
    for (let i = 0; i < 5; i++) {
      const articleData = generateArticleData()
      const response = await api
        .post(`/api/articles/legalBasis/${createdLegalBasisId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(articleData)
        .expect(201)
        .expect('Content-Type', /application\/json/)

      createdArticleIds.push(response.body.article.id)
    }
  })

  afterEach(async () => {
    jest.restoreAllMocks()
    createdArticleIds = []
  })

  test('Should successfully delete multiple articles by their IDs', async () => {
    const articlesToDelete = createdArticleIds.slice(0, 3)
    await api
      .delete('/api/articles/batch')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ articleIds: articlesToDelete })
      .expect(204)

    for (const articleId of articlesToDelete) {
      const response = await api
        .get(`/api/article/${articleId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(404)
        .expect('Content-Type', /application\/json/)

      expect(response.body.message).toMatch(/Article not found/i)
    }

    const remainingArticles = createdArticleIds.slice(3)
    for (const articleId of remainingArticles) {
      const response = await api
        .get(`/api/article/${articleId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200)
        .expect('Content-Type', /application\/json/)

      const { article } = response.body
      expect(article).toBeDefined()
      expect(article).toHaveProperty('id', articleId)
    }
  })

  test('Should return 400 when articleIds is missing or invalid', async () => {
    const invalidRequests = [{}, { articleIds: [] }, { articleIds: 'invalid' }]
    for (const invalidRequest of invalidRequests) {
      const response = await api
        .delete('/api/articles/batch')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(invalidRequest)
        .expect(400)
        .expect('Content-Type', /application\/json/)

      expect(response.body.message).toMatch(
        /Missing required fields: articleIds/i
      )
    }
  })

  test('Should return 404 when trying to delete non-existent articles', async () => {
    const nonExistentIds = [-1, -2]
    const response = await api
      .delete('/api/articles/batch')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ articleIds: nonExistentIds })
      .expect(404)
      .expect('Content-Type', /application\/json/)

    expect(response.body.message).toMatch(/Articles not found/i)
    expect(response.body.errors.notFoundIds).toEqual(nonExistentIds)
  })

  test('Should return 401 if the user is unauthorized', async () => {
    const articlesToDelete = createdArticleIds.slice(0, 3)
    const response = await api
      .delete('/api/articles/batch')
      .send({ articleIds: articlesToDelete })
      .expect(401)
      .expect('Content-Type', /application\/json/)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })

  test('Should prevent deleting multiple articles if at least one has a pending Send Legal Basis job', async () => {
    jest.spyOn(SendLegalBasisService, 'hasPendingSendJobs')
      .mockImplementation(async (legalBasisId) => {
        if (legalBasisId) {
          return { hasPendingJobs: true, jobId: 'mockedJobId' }
        }
        return { hasPendingJobs: false, jobId: null }
      })

    const response = await api
      .delete('/api/articles/batch')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ articleIds: createdArticleIds })
      .expect(409)
      .expect('Content-Type', /application\/json/)

    expect(response.body.message).toMatch(
      /Cannot delete Articles with pending Send Legal Basis jobs/i
    )
  })
})
