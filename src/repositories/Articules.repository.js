import { pool } from '../config/db.config'
import ErrorUtils from '../utils/Error'
/**
 * Repository class for handling database operations related to Articules.
 */
class ArticlesRepository {
  /**
   * Inserts multiple articles associated with a legal basis into the database.
   * @param {number} legalBasisId - The ID of the legal basis.
   * @param {Array<Object>} articles - The list of articles to insert.
   * @param {string} articles[].title - The title of the article.
   * @param {string} articles[].article - The content of the article.
   * @param {number} articles[].order - The order of the article.
   * @returns {Promise<void>}
   * @throws {ErrorUtils} - If an error occurs during insertion.
   */
  static async insertArticles (legalBasisId, articles) {
    if (articles.length === 0) {
      return
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
      await pool.query(query, [values])
    } catch (error) {
      console.error('Error inserting articles:', error.message)
      throw new ErrorUtils(500, 'Error inserting articles into the database')
    }
  }
}
export default ArticlesRepository
