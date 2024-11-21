import { pool } from '../config/db.config.js'
import ErrorUtils from '../utils/Error.js'
import Article from '../models/Article.model.js'

/**
 * Repository class for handling database operations related to Articles.
 */
class ArticlesRepository {
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
  static async insertArticles (legalBasisId, articles) {
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
   * Fetches articles associated with a specific legal basis, ordered by 'article_order'.
   * Returns a list of Article instances.
   * @param {number} legalBasisId - The ID of the legal basis.
   * @returns {Promise<Array<Article|null>>} - The list of ordered Article instances.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async getArticlesByLegalBasisId (legalBasisId) {
    try {
      const [rows] = await pool.query(`
        SELECT id, legal_basis_id, article_name, description, article_order
        FROM article 
        WHERE legal_basis_id = ? 
        ORDER BY article_order
      `, [legalBasisId])
      if (rows.length === 0) return null
      return rows.map(article => new Article(
        article.id,
        article.legal_basis_id,
        article.article_name,
        article.description,
        article.article_order
      ))
    } catch (error) {
      console.error('Error fetching articles:', error.message)
      throw new ErrorUtils(500, 'Error fetching articles from the database')
    }
  }

  /**
 * Updates multiple articles associated with a legal basis in the database.
 * Replaces all existing articles with new ones.
 * @param {number} legalBasisId - The ID of the legal basis.
 * @param {Array<Object>} articles - The list of articles to insert.
 * @param {string} articles[].title - The title of the article.
 * @param {string} articles[].article - The content of the article.
 * @param {number} articles[].order - The order of the article.
 * @returns {Promise<boolean>} - Returns true if the update is successful, false otherwise.
 * @throws {ErrorUtils} - If an error occurs during the update.
 */
  static async updateArticles (legalBasisId, articles) {
    const checkArticlesQuery = `
    SELECT COUNT(*) AS articleCount
    FROM article
    WHERE legal_basis_id = ?
  `

    const deleteQuery = `
    DELETE FROM article 
    WHERE legal_basis_id = ?
  `

    const insertQuery = `
    INSERT INTO article (legal_basis_id, article_name, description, article_order)
    VALUES ?
  `
    const values = articles.map(article => [
      legalBasisId,
      article.title,
      article.article,
      article.order
    ])
    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()
      const [checkResult] = await connection.query(checkArticlesQuery, [legalBasisId])
      const { articleCount } = checkResult[0]
      if (articleCount > 0) {
        const [deleteResult] = await connection.query(deleteQuery, [legalBasisId])
        if (deleteResult.affectedRows === 0) {
          await connection.rollback()
          return false
        }
      }
      const [insertResult] = await connection.query(insertQuery, [values])
      if (insertResult.affectedRows !== values.length) {
        await connection.rollback()
        return false
      }
      await connection.commit()
      return true
    } catch (error) {
      await connection.rollback()
      console.error('Error updating articles:', error.message)
      throw new ErrorUtils(500, 'Error updating articles in the database')
    } finally {
      connection.release()
    }
  }
}

export default ArticlesRepository
