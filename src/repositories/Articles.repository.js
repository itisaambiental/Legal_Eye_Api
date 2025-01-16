import { pool } from '../config/db.config.js'
import ErrorUtils from '../utils/Error.js'
import Article from '../models/Article.model.js'

/**
 * Repository class for handling database operations related to Articles.
 */
class ArticlesRepository {
  /**
   * Inserts a article associated with a legal basis into the database.
   * @param {number} legalBasisId - The ID of the legal basis.
   * @param {Object} article - The article to insert.
   * @param {string} article.title - The title of the article.
   * @param {string} article.article - The content of the article.
   * @param {number} article.order - The order of the article.
   * @returns {Promise<Article>} - Returns the created Article instance.
   * @throws {ErrorUtils} - If an error occurs during insertion.
   */
  static async create (legalBasisId, article) {
    const query = `
      INSERT INTO article (legal_basis_id, article_name, description, article_order)
      VALUES (?, ?, ?, ?)
    `
    const values = [
      legalBasisId,
      article.title,
      article.article,
      article.order
    ]
    try {
      const [result] = await pool.query(query, values)
      const article = await this.findById(result.insertId)
      return article
    } catch (error) {
      console.error('Error creating article:', error.message)
      throw new ErrorUtils(500, 'Error creating article in the database')
    }
  }

  /**
   * Inserts multiple articles associated with a legal basis into the database.
   * @param {number} legalBasisId - The ID of the legal basis.
   * @param {Array<Object>} articles - The list of articles to insert.
   * @param {string} articles[].title - The title of the article.
   * @param {string} articles[].article - The content of the article.
   * @param {number} articles[].order - The order of the article.
   * @returns {Promise<boolean>} - Returns true if insertion is successful, false otherwise.
   * @throws {ErrorUtils} - If an error occurs during insertion.
   */
  static async createMany (legalBasisId, articles) {
    if (articles.length === 0) {
      return false
    }
    const query = `
      INSERT INTO article (legal_basis_id, article_name, description, article_order)
      VALUES ?
    `
    const values = articles.map((article) => [
      legalBasisId,
      article.title,
      article.article,
      article.order
    ])
    try {
      const [insertResult] = await pool.query(query, [values])
      if (insertResult.affectedRows !== articles.length) {
        return false
      }
      return true
    } catch (error) {
      console.error('Error inserting articles:', error.message)
      throw new ErrorUtils(500, 'Error inserting articles into the database')
    }
  }

  /**
   * Fetches an article by its ID from the database.
   * @param {number} id - The ID of the article to retrieve.
   * @returns {Promise<Article|null>} - Returns the Article instance or null if not found.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async findById (id) {
    const query = `
      SELECT id, legal_basis_id, article_name, description, article_order
      FROM article
      WHERE id = ?
    `
    try {
      const [rows] = await pool.query(query, [id])
      if (rows.length === 0) return null
      const row = rows[0]
      return new Article(
        row.id,
        row.legal_basis_id,
        row.article_name,
        row.description,
        row.article_order
      )
    } catch (error) {
      console.error('Error fetching article by ID:', error.message)
      throw new ErrorUtils(500, 'Error fetching article from the database')
    }
  }

  /**
   * Fetches articles associated with a specific legal basis, ordered by 'article_order'.
   * Returns a list of Article instances.
   * @param {number} legalBasisId - The ID of the legal basis.
   * @returns {Promise<Array<Article|null>>} - The list of ordered Article instances.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async findByLegalBasisId (legalBasisId) {
    try {
      const [rows] = await pool.query(
        `
        SELECT id, legal_basis_id, article_name, description, article_order
        FROM article 
        WHERE legal_basis_id = ? 
        ORDER BY article_order
      `,
        [legalBasisId]
      )
      if (rows.length === 0) return null
      return rows.map(
        (article) =>
          new Article(
            article.id,
            article.legal_basis_id,
            article.article_name,
            article.description,
            article.article_order
          )
      )
    } catch (error) {
      console.error('Error fetching articles:', error.message)
      throw new ErrorUtils(500, 'Error fetching articles from the database')
    }
  }

  /**
   * Retrieves articles by name or partial name from the database.
   * @param {string} articleName - The name or part of the name of the article to retrieve.
   * @returns {Promise<Array<Article|null>>} - A list of Article instances matching the name.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async findByName (articleName) {
    const query = `
    SELECT id, legal_basis_id, article_name, description, article_order
    FROM article
    WHERE article_name LIKE ?
  `
    try {
      const [rows] = await pool.query(query, [`%${articleName}%`])
      if (rows.length === 0) return null
      return rows.map(
        (row) =>
          new Article(
            row.id,
            row.legal_basis_id,
            row.article_name,
            row.description,
            row.article_order
          )
      )
    } catch (error) {
      console.error('Error retrieving articles by name:', error.message)
      throw new ErrorUtils(500, 'Error retrieving articles by name')
    }
  }

  /**
   * Retrieves articles by a partial match in their description from the database.
   * @param {string} description - The description or part of the description to search for.
   * @returns {Promise<Array<Article|null>>} - A list of Article instances matching the description.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async findByDescription (description) {
    const query = `
    SELECT id, legal_basis_id, article_name, description, article_order
    FROM article
    WHERE description LIKE ?
  `
    try {
      const [rows] = await pool.query(query, [`%${description}%`])
      if (rows.length === 0) return null
      return rows.map(
        (row) =>
          new Article(
            row.id,
            row.legal_basis_id,
            row.article_name,
            row.description,
            row.article_order
          )
      )
    } catch (error) {
      console.error('Error retrieving articles by description:', error.message)
      throw new ErrorUtils(500, 'Error retrieving articles by description')
    }
  }

  /**
 * Deletes all articles from the database.
 * @returns {Promise<void>}
 * @throws {ErrorUtils} - If an error occurs during deletion.
 */
  static async deleteAll () {
    try {
      await pool.query('DELETE FROM article')
    } catch (error) {
      console.error('Error deleting all articles:', error.message)
      throw new ErrorUtils(500, 'Error deleting all articles from the database')
    }
  }
}

export default ArticlesRepository
