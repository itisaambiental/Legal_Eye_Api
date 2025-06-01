/**
 * Class representing an Article.
 */
class Article {
  /**
   * Constructs an Article instance.
   * @param {number} id - The ID of the article.
   * @param {number} legalBasisId - The ID of the associated legal basis.
   * @param {string} articleName - The title of the article.
   * @param {string} description - The content of the article.
   * @param {number} articleOrder - The order of the article.
   * @param {string} articleType - The type of the article.
   */
  constructor (id, legalBasisId, articleName, description, articleOrder, articleType) {
    this.id = id
    this.legal_basis_id = legalBasisId
    this.article_name = articleName
    this.description = description
    this.article_order = articleOrder
    this.articleType = articleType
  }
}

export default Article
