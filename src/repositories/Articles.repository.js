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
}

export default ArticlesRepository
