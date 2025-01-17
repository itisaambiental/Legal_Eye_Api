/* eslint-disable no-undef */
import { api } from '../../config/test.config.js'
import UserRepository from '../../repositories/User.repository.js'
import SubjectsRepository from '../../repositories/Subject.repository.js'
import LegalBasisRepository from '../../repositories/LegalBasis.repository.js'
import ArticlesRepository from '../../repositories/Articles.repository.js'
import AspectsRepository from '../../repositories/Aspects.repository.js'
import generateLegalBasisData from '../../utils/generateLegalBasisData.js'
import generateArticleData from '../../utils/generateArticleData.js'

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

beforeAll(async () => {
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
}, 10000)

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
  test('Should return 400 if required fields are missing', async () => {
    const invalidArticleCases = [
      { article: 'Content without title or order' },
      { title: 'Title without content or order' },
      { title: 'Title', article: 'Content', order: 0 },
      { title: '', article: 'Content', order: 1 },
      { title: 'Title', article: '', order: 1 },
      { title: 'Title', article: 'Content' }
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
  test('Should return an empty list if no articles match the name', async () => {
    const response = await api
      .get('/api/articles/name')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .query({ name: 'NonExistentName' })
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const { articles } = response.body
    expect(articles).toBeInstanceOf(Array)
    expect(articles.length).toBe(0)
  })

  test('Should return a list of articles matching the name', async () => {
    const articleData = generateArticleData({ title: 'UniqueArticleName' })
    await api
      .post(`/api/articles/legalBasis/${createdLegalBasisId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(articleData)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    const response = await api
      .get('/api/articles/name')
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
      .get('/api/articles/name')
      .query({ name: 'UniqueArticleName' })
      .expect(401)
      .expect('Content-Type', /application\/json/)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })
})
describe('Filter articles by description', () => {
  test('Should return an empty list if no articles match the description', async () => {
    const response = await api
      .get('/api/articles/description')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .query({ description: 'NonExistentDescription' })
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const { articles } = response.body
    expect(articles).toBeInstanceOf(Array)
    expect(articles.length).toBe(0)
  })

  test('Should return a list of articles matching the description', async () => {
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
      .get('/api/articles/description')
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
      .get('/api/articles/description')
      .query({ description: 'UniqueArticleDescription' })
      .expect(401)
      .expect('Content-Type', /application\/json/)

    expect(response.body.error).toMatch(/token missing or invalid/i)
  })
})
