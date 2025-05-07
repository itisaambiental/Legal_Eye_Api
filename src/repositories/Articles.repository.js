import { pool } from '../config/db.config.js'
import ErrorUtils from '../utils/Error.js'
import Article from '../models/Article.model.js'

/**
 * Repository class for handling database operations related to Articles.
 */
class ArticlesRepository {
  /**
 * Inserts an article associated with a legal basis into the database.
 *
 * This function stores both the HTML content and its plain text equivalent
 * for efficient searches and display purposes.
 *
 * @param {number} legalBasisId - The ID of the legal basis to associate the article with.
 * @param {Object} article - The article to insert.
 * @param {string} article.title - The title of the article.
 * @param {string} article.article - The HTML content of the article.
 * @param {string} article.plainArticle - The plain text equivalent of the article content.
 * @param {number} article.order - The order of the article.
 * @returns {Promise<Article>} - Returns the created Article instance.
 * @throws {ErrorUtils} - If an error occurs during insertion.
 */
  static async create (legalBasisId, article) {
    const query = `
    INSERT INTO article (legal_basis_id, article_name, description, plain_description, article_order)
    VALUES (?, ?, ?, ?, ?)
  `
    const values = [
      legalBasisId,
      article.title,
      article.article,
      article.plainArticle,
      article.order
    ]
    try {
      const [result] = await pool.query(query, values)
      const createdArticle = await this.findById(result.insertId)
      return createdArticle
    } catch (error) {
      console.error('Error creating article:', error.message)
      throw new ErrorUtils(500, 'Error creating article in the database')
    }
  }

  /**
 * Inserts multiple articles associated with a legal basis into the database.
 *
 * This function stores both the HTML content and its plain text equivalent
 * for efficient searches and display purposes.
 *
 * @param {number} legalBasisId - The ID of the legal basis.
 * @param {Array<Object>} articles - The list of articles to insert.
 * @param {string} articles[].title - The title of the article.
 * @param {string} articles[].article - The HTML content of the article.
 * @param {string} articles[].plainArticle - The plain text equivalent of the article content.
 * @param {number} articles[].order - The order of the article.
 * @returns {Promise<boolean>} - Returns true if insertion is successful, false otherwise.
 * @throws {ErrorUtils} - If an error occurs during insertion.
 */
  static async createMany (legalBasisId, articles) {
    if (articles.length === 0) {
      return false
    }
    const query = `
    INSERT INTO article (legal_basis_id, article_name, description, plain_description, article_order)
    VALUES ?
  `
    const values = articles.map((article) => [
      legalBasisId,
      article.title,
      article.article,
      article.plainArticle,
      article.order
    ])
    try {
      const [result] = await pool.query(query, [values])
      if (result.affectedRows !== articles.length) {
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
 * Finds articles in the database using an array of IDs.
 * @param {Array<number>} articleIds - Array of article IDs to find.
 * @returns {Promise<Array<Article>>} - Array of Article instances matching the provided IDs.
 * @throws {ErrorUtils} - If an error occurs during retrieval.
 */
  static async findByIds (articleIds) {
    if (articleIds.length === 0) {
      return []
    }
    const query = `
    SELECT id, legal_basis_id, article_name, description, article_order
    FROM article
    WHERE id IN (?)
  `
    try {
      const [rows] = await pool.query(query, [articleIds])
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
      console.error('Error finding articles by IDs:', error.message)
      throw new ErrorUtils(500, 'Error finding articles by IDs from the database')
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
 * Retrieves articles by name or partial name for a specific legal basis from the database.
 * @param {number} legalBasisId - The ID of the legal basis to filter articles by.
 * @param {string} articleName - The name or part of the name of the article to retrieve.
 * @returns {Promise<Array<Article|null>>} - A list of Article instances matching the name for the given legal basis.
 * @throws {ErrorUtils} - If an error occurs during retrieval.
 */
  static async findByName (legalBasisId, articleName) {
    const query = `
    SELECT id, legal_basis_id, article_name, description, plain_description, article_order
    FROM article
    WHERE legal_basis_id = ? AND article_name LIKE ?
    ORDER BY article_order
  `
    try {
      const [rows] = await pool.query(query, [legalBasisId, `%${articleName}%`])
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
 * Retrieves articles by a partial or flexible match in their description for a specific legal basis from the database.
 * @param {number} legalBasisId - The ID of the legal basis to filter articles by.
 * @param {string} description - The description or part of the description to search for.
 * @returns {Promise<Array<Article|null>>} - A list of Article instances matching the description for the given legal basis.
 * @throws {ErrorUtils} - If an error occurs during retrieval.
 */
  static async findByDescription (legalBasisId, description) {
    try {
      const query = `
      SELECT id, legal_basis_id, article_name, description, article_order
      FROM article
      WHERE legal_basis_id = ?
        AND MATCH(plain_description) AGAINST(? IN BOOLEAN MODE)
    `
      const [result] = await pool.query(query, [legalBasisId, description])
      if (result.length === 0) return null
      return result.map(
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
 * Updates an article by its ID.
 * @param {number} id - The ID of the article to update.
 * @param {Object} article - The updated article data.
 * @param {string|null} article.title - The new title of the article, or null to keep the current title.
 * @param {string|null} article.article - The new content of the article, or null to keep the current content.
 * @param {string|null} article.plainArticle - The plain text equivalent of the article content.
 * @param {number|null} article.order - The new order of the article, or null to keep the current order.
 * @returns {Promise<boolean|Article>} - Returns the updated Article instance if successful, false otherwise.
 * @throws {ErrorUtils} - If an error occurs during update.
 */
  static async updateById (id, article) {
    const query = `
    UPDATE article
    SET 
      article_name = IFNULL(?, article_name),
      description = IFNULL(?, description),
      plain_description = IFNULL(?, plain_description),
      article_order = IFNULL(?, article_order)
    WHERE id = ?
  `
    const values = [article.title, article.article, article.plainArticle, article.order, id]
    try {
      const [rows] = await pool.query(query, values)
      if (rows.affectedRows === 0) {
        return false
      }
      const article = await this.findById(id)
      return article
    } catch (error) {
      console.error('Error updating article:', error.message)
      throw new ErrorUtils(500, 'Error updating article in the database')
    }
  }

  /**
 * Deletes an article by its ID.
 * @param {number} id - The ID of the article to delete.
 * @returns {Promise<boolean>} - Returns true if the deletion is successful, false otherwise.
 * @throws {ErrorUtils} - If an error occurs during deletion.
 */
  static async deleteById (id) {
    const query = `
    DELETE FROM article
    WHERE id = ?
  `
    try {
      const [rows] = await pool.query(query, [id])
      if (rows.affectedRows === 0) {
        return false
      }
      return true
    } catch (error) {
      console.error('Error deleting article:', error.message)
      throw new ErrorUtils(500, 'Error deleting article from the database')
    }
  }

  /**
 * Deletes multiple articles from the database using an array of IDs.
 * @param {Array<number>} articleIds - Array of article IDs to delete.
 * @returns {Promise<boolean>} - True if articles were deleted, otherwise false.
 * @throws {ErrorUtils} - If an error occurs during the deletion.
 */
  static async deleteBatch (articleIds) {
    const query = `
    DELETE FROM article WHERE id IN (?)
  `
    try {
      const [result] = await pool.query(query, [articleIds])
      if (result.affectedRows === 0) {
        return false
      }
      return true
    } catch (error) {
      console.error('Error deleting articles:', error.message)
      throw new ErrorUtils(500, 'Error deleting articles from the database')
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
