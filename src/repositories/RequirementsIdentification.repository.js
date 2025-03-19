import { pool } from '../config/db.config.js'
import ErrorUtils from '../utils/Error.js'
import RequirementsIdentification from '../models/RequirementsIdentification.model.js'
import Requirement from '../models/Requirement.model.js'
import LegalBasis from '../models/LegalBasis.model.js'
import Article from '../models/Article.model.js'
/**
 * Repository class for handling database operations related to Requirements Identification.
 */
class RequirementsIdentificationRepository {
  /**
   * Inserts a new requirements identification (analysis) into the database.
   *
   * @param {Object} identification - The requirements identification data.
   * @param {string} identification.identificationName - The name of the identification.
   * @param {string} identification.identificationDescription - The description of the identification.
   * @param {number|null} identification.userId - The ID of the user who created the identification.
   * @returns {Promise<RequirementsIdentification>} - Returns the created RequirementsIdentification instance.
   * @throws {ErrorUtils} - If an error occurs during insertion.
   */
  static async create (identification) {
    const query = `
      INSERT INTO requirements_identification 
      (identification_name, identification_description, user_id) 
      VALUES (?, ?, ?)
    `
    const values = [
      identification.identificationName,
      identification.identificationDescription,
      identification.userId
    ]
    try {
      const [result] = await pool.query(query, values)
      const requirementsIdentification = await this.findById(result.insertId)
      return requirementsIdentification
    } catch (error) {
      console.error('Error creating requirements identification:', error.message)
      throw new ErrorUtils(500, 'Error creating requirements identification in the database')
    }
  }

  /**
   * Marks a requirements identification as 'Completed'.
   *
   * @param {number} id - The ID of the identification to update.
   * @returns {Promise<boolean>} - Returns true if updated, false if not found.
   * @throws {ErrorUtils} - If an error occurs during the update.
   */
  static async markAsCompleted (id) {
    return await this._updateStatus(id, 'Completed')
  }

  /**
       * Marks a requirements identification as 'Failed'.
       *
       * @param {number} id - The ID of the identification to update.
       * @returns {Promise<boolean>} - Returns true if updated, false if not found.
       * @throws {ErrorUtils} - If an error occurs during the update.
       */
  static async markAsFailed (id) {
    return await this._updateStatus(id, 'Failed')
  }

  /**
       * Updates the status of a requirements identification.
       *
       * @param {number} id - The ID of the identification to update.
       * @param {string} status - The new status ('Active', 'Completed', 'Failed').
       * @returns {Promise<boolean>} - Returns true if updated, false if not found.
       * @throws {ErrorUtils} - If an error occurs during the update.
       */
  static async _updateStatus (id, status) {
    const query = `
          UPDATE requirements_identification 
          SET status = ?
          WHERE id = ?
        `
    try {
      const [result] = await pool.query(query, [status, id])
      return result.affectedRows > 0
    } catch (error) {
      console.error(`Error updating status to '${status}':`, error.message)
      throw new ErrorUtils(500, `Error updating requirements identification status to '${status}'`)
    }
  }

  /**
   * Retrieves a requirements identification by its ID.
   *
   * @param {number} id - The ID of the identification.
   * @returns {Promise<RequirementsIdentification|null>} - The found identification or null.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async findById (id) {
    const query = `
      SELECT id, identification_name, identification_description, status, user_id, created_at
      FROM requirements_identification
      WHERE id = ?
    `
    try {
      const [rows] = await pool.query(query, [id])
      if (rows.length === 0) return null
      const row = rows[0]
      return new RequirementsIdentification(
        row.id,
        row.identification_name,
        row.identification_description,
        row.status,
        row.user_id,
        row.created_at
      )
    } catch (error) {
      console.error('Error fetching requirements identification by ID:', error.message)
      throw new ErrorUtils(500, 'Error retrieving requirements identification')
    }
  }

  /**
 * Finds multiple requirements identifications by their IDs.
 * @param {Array<number>} identificationIds - Array of identification IDs to find.
 * @returns {Promise<RequirementsIdentification[]>} - Array of found identification objects.
 * @throws {ErrorUtils} - If an error occurs during retrieval.
 */
  static async findByIds (identificationIds) {
    if (identificationIds.length === 0) {
      return []
    }

    const query = `
    SELECT 
      id, 
      identification_name, 
      identification_description, 
      status, 
      user_id, 
      created_at
    FROM requirements_identification
    WHERE id IN (?)
  `
    try {
      const [rows] = await pool.query(query, [identificationIds])
      if (rows.length === 0) return []
      return rows.map(row => {
        return new RequirementsIdentification(
          row.id,
          row.identification_name,
          row.identification_description,
          row.status,
          row.user_id,
          row.created_at
        )
      })
    } catch (error) {
      console.error('Error finding requirements identifications by IDs:', error.message)
      throw new ErrorUtils(500, 'Error retrieving requirements identifications from the database')
    }
  }

  /**
 * Checks if an identification name already exists in the database.
 * @param {string} identificationName - The identification name to check.
 * @returns {Promise<boolean>} - Returns true if the name exists, false otherwise.
 * @throws {ErrorUtils} - If an error occurs during the database query.
 */
  static async existsByName (identificationName) {
    const query = `
    SELECT COUNT(*) AS count FROM requirements_identification WHERE identification_name = ?
  `
    try {
      const [rows] = await pool.query(query, [identificationName])
      return rows[0].count > 0
    } catch (error) {
      console.error('Error checking if identification name exists:', error.message)
      throw new ErrorUtils(500, 'Error checking if identification name exists')
    }
  }

  /**
 * Checks if an identification name already exists in the database, excluding a specific ID.
 * @param {string} identificationName - The identification name to check.
 * @param {number} identificationId - The ID to exclude from the check.
 * @returns {Promise<boolean>} - Returns true if the name exists (excluding the given ID), false otherwise.
 * @throws {ErrorUtils} - If an error occurs during the database query.
 */
  static async existsByNameExcludingId (identificationName, identificationId) {
    const query = `
    SELECT 1 
    FROM requirements_identification 
    WHERE identification_name = ? AND id != ?
    LIMIT 1
  `
    try {
      const [rows] = await pool.query(query, [identificationName, identificationId])
      return rows.length > 0
    } catch (error) {
      console.error('Error checking if identification name exists excluding ID:', error.message)
      throw new ErrorUtils(500, 'Error checking if identification name exists excluding ID')
    }
  }

  /**
   * Retrieves all requirements identifications.
   * @returns {Promise<Array<RequirementsIdentification>|null>}
   */
  static async findAll () {
    const query = `
      SELECT id, identification_name, identification_description, status, user_id, created_at
      FROM requirements_identification`
    try {
      const [rows] = await pool.query(query)
      if (rows.length === 0) return null
      return rows.map(row => new RequirementsIdentification(
        row.id,
        row.identification_name,
        row.identification_description,
        row.status,
        row.user_id,
        row.created_at
      ))
    } catch (error) {
      console.error('Error retrieving all:', error.message)
      throw new ErrorUtils(500, 'Error retrieving all requirements identifications')
    }
  }

  /**
 * Updates an existing requirements identification by ID.
 * Uses IFNULL to preserve existing values if fields are not provided.
 *
 * @param {number} id - The ID of the identification to update.
 * @param {Object} identification - The updated requirements identification data.
 * @param {string} [identification.identificationName] - The name of the identification (optional).
 * @param {string} [identification.identificationDescription] - The description of the identification (optional).
 * @returns {Promise<RequirementsIdentification|null>} - The updated RequirementsIdentification instance or null if not found.
 * @throws {ErrorUtils} - If an error occurs during the update.
 */
  static async updateById (id, identification) {
    const {
      identificationName,
      identificationDescription
    } = identification

    const query = `
    UPDATE requirements_identification 
    SET 
      identification_name = IFNULL(?, identification_name),
      identification_description = IFNULL(?, identification_description)
    WHERE id = ?
  `

    const values = [
      identificationName,
      identificationDescription,
      id
    ]

    try {
      const [result] = await pool.query(query, values)
      if (result.affectedRows === 0) return null
      const requirementsIdentification = await this.findById(id)
      return requirementsIdentification
    } catch (error) {
      console.error('Error updating requirements identification:', error.message)
      throw new ErrorUtils(500, 'Error updating requirements identification in the database')
    }
  }

  /**
   * Deletes a requirements identification by ID.
   *
   * @param {number} id - The ID of the identification to delete.
   * @returns {Promise<boolean>} - Returns true if deleted, false if not found.
   * @throws {ErrorUtils} - If an error occurs during deletion.
   */
  static async deleteById (id) {
    const query = `
      DELETE FROM requirements_identification WHERE id = ?
    `
    try {
      const [result] = await pool.query(query, [id])
      return result.affectedRows > 0
    } catch (error) {
      console.error('Error deleting requirements identification:', error.message)
      throw new ErrorUtils(500, 'Error deleting requirements identification')
    }
  }

  /**
 * Deletes multiple requirements identifications from the database using an array of IDs.
 * @param {Array<number>} identificationIds - Array of identification IDs to delete.
 * @returns {Promise<boolean>} - True if identifications were deleted, otherwise false.
 * @throws {ErrorUtils} - If an error occurs during the deletion.
 */
  static async deleteBatch (identificationIds) {
    const query = `
      DELETE FROM requirements_identification WHERE id IN (?)
    `
    try {
      const [result] = await pool.query(query, [identificationIds])
      return result.affectedRows > 0
    } catch (error) {
      console.error('Error deleting requirements identifications:', error.message)
      throw new ErrorUtils(500, 'Error deleting requirements identifications from the database')
    }
  }

  /**
   * Deletes all requirements identifications from the database.
   * @returns {Promise<void>}
   * @throws {ErrorUtils} - If an error occurs during deletion.
   */
  static async deleteAll () {
    try {
      await pool.query('DELETE FROM requirements_identification')
    } catch (error) {
      console.error('Error deleting all requirements identifications:', error.message)
      throw new ErrorUtils(500, 'Error deleting all requirements identifications from the database')
    }
  }

  /**
   * Links a requirement to a requirements identification (analysis).
   *
   * @param {number} identificationId - The ID of the requirements identification.
   * @param {number} requirementId - The ID of the requirement.
   * @returns {Promise<boolean>} - True if the link was created successfully.
   * @throws {ErrorUtils} - If an error occurs during insertion.
   */
  static async linkRequirement (identificationId, requirementId) {
    const query = `
          INSERT INTO identification_requirements (requirements_identification_id, requirement_id)
          VALUES (?, ?)
        `

    try {
      const [result] = await pool.query(query, [identificationId, requirementId])
      return result.affectedRows > 0
    } catch (error) {
      console.error('Error linking requirement to identification:', error.message)
      throw new ErrorUtils(500, 'Error linking requirement to identification')
    }
  }

  /**
       * Retrieves all requirements linked to a specific requirements identification.
       *
       * @param {number} identificationId - The ID of the requirements identification.
       * @returns {Promise<Array<Requirement>>} - A list of linked requirements as Requirement instances.
       * @throws {ErrorUtils} - If an error occurs during retrieval.
       */
  static async getLinkedRequirements (identificationId) {
    const query = `
          SELECT 
            r.id, r.requirement_number, r.requirement_name, r.mandatory_description, r.complementary_description, 
            r.mandatory_sentences, r.complementary_sentences, r.mandatory_keywords, r.complementary_keywords, 
            r.condition, r.evidence, r.periodicity, r.requirement_type, r.jurisdiction, r.state, r.municipality,
            s.id AS subject_id, s.subject_name, 
            a.id AS aspect_id, a.aspect_name
          FROM identification_requirements ir
          JOIN requirements r ON ir.requirement_id = r.id
          JOIN subjects s ON r.subject_id = s.id
          JOIN aspects a ON r.aspect_id = a.id
          WHERE ir.requirements_identification_id = ?
        `

    try {
      const [rows] = await pool.query(query, [identificationId])

      return rows.map(row => new Requirement(
        row.id,
        { subject_id: row.subject_id, subject_name: row.subject_name },
        { aspect_id: row.aspect_id, aspect_name: row.aspect_name },
        row.requirement_number,
        row.requirement_name,
        row.mandatory_description,
        row.complementary_description,
        row.mandatory_sentences,
        row.complementary_sentences,
        row.mandatory_keywords,
        row.complementary_keywords,
        row.condition,
        row.evidence,
        row.periodicity,
        row.requirement_type,
        row.jurisdiction,
        row.state,
        row.municipality
      ))
    } catch (error) {
      console.error('Error retrieving linked requirements:', error.message)
      throw new ErrorUtils(500, 'Error retrieving linked requirements')
    }
  }

  /**
       * Deletes a specific requirement link from an identification.
       *
       * @param {number} identificationId - The ID of the requirements identification.
       * @param {number} requirementId - The ID of the requirement.
       * @returns {Promise<boolean>} - True if deleted, false otherwise.
       * @throws {ErrorUtils} - If an error occurs during deletion.
       */
  static async unlinkRequirement (identificationId, requirementId) {
    const query = `
          DELETE FROM identification_requirements WHERE requirements_identification_id = ? AND requirement_id = ?
        `

    try {
      const [result] = await pool.query(query, [identificationId, requirementId])
      return result.affectedRows > 0
    } catch (error) {
      console.error('Error unlinking requirement:', error.message)
      throw new ErrorUtils(500, 'Error unlinking requirement')
    }
  }

  /**
   * Links a legal basis to a requirement identification.
   *
   * @param {number} requirementId - The ID linking the requirement to the identification.
   * @param {number} legalBasisId - The ID of the legal basis.
   * @returns {Promise<boolean>} - True if the link was created successfully.
   * @throws {ErrorUtils} - If an error occurs during insertion.
   */
  static async linkLegalBasis (requirementId, legalBasisId) {
    const query = `
          INSERT INTO identification_legal_basis (identification_requirement_id, legal_basis_id)
          VALUES (?, ?)
        `
    try {
      const [result] = await pool.query(query, [requirementId, legalBasisId])
      return result.affectedRows > 0
    } catch (error) {
      console.error('Error linking legal basis:', error.message)
      throw new ErrorUtils(500, 'Error linking legal basis')
    }
  }

  /**
 * Retrieves all legal bases linked to a specific requirement identification,
 * including associated subjects and aspects.
 *
 * @param {number} requirementId - The ID linking the requirement to the identification.
 * @returns {Promise<Array<LegalBasis|null>>} - A list of linked legal bases as LegalBasis instances.
 * @throws {ErrorUtils} - If an error occurs during retrieval.
 */
  static async getLinkedLegalBases (requirementId) {
    const query = `
      SELECT 
        lb.id AS legal_basis_id, 
        lb.legal_name, 
        lb.abbreviation, 
        lb.classification, 
        lb.jurisdiction, 
        lb.state, 
        lb.municipality, 
        lb.last_reform, 
        lb.url, 
        s.id AS subject_id, 
        s.subject_name AS subject_name,
        a.id AS aspect_id, 
        a.aspect_name AS aspect_name
      FROM identification_legal_basis ilb
      JOIN legal_basis lb ON ilb.legal_basis_id = lb.id
      JOIN legal_basis_subject_aspect lbsa ON lb.id = lbsa.legal_basis_id
      JOIN subjects s ON lbsa.subject_id = s.id
      LEFT JOIN aspects a ON lbsa.aspect_id = a.id
      WHERE ilb.identification_requirement_id = ?
    `
    try {
      const [rows] = await pool.query(query, [requirementId])
      if (rows.length === 0) return null
      const legalBasisMap = new Map()
      rows.forEach((row) => {
        if (!legalBasisMap.has(row.legal_basis_id)) {
          legalBasisMap.set(row.legal_basis_id, {
            id: row.legal_basis_id,
            legal_name: row.legal_name,
            abbreviation: row.abbreviation,
            classification: row.classification,
            jurisdiction: row.jurisdiction,
            state: row.state,
            municipality: row.municipality,
            lastReform: row.last_reform,
            url: row.url,
            subject: {
              subject_id: row.subject_id,
              subject_name: row.subject_name
            },
            aspects: []
          })
        }
        if (row.aspect_id !== null) {
          legalBasisMap.get(row.legal_basis_id).aspects.push({
            aspect_id: row.aspect_id,
            aspect_name: row.aspect_name
          })
        }
      })
      return Array.from(legalBasisMap.values()).map(
        (legalBasis) =>
          new LegalBasis(
            legalBasis.id,
            legalBasis.legal_name,
            legalBasis.subject,
            legalBasis.aspects,
            legalBasis.abbreviation,
            legalBasis.classification,
            legalBasis.jurisdiction,
            legalBasis.state,
            legalBasis.municipality,
            legalBasis.lastReform,
            legalBasis.url
          )
      )
    } catch (error) {
      console.error('Error retrieving linked legal bases:', error.message)
      throw new ErrorUtils(500, 'Error retrieving linked legal bases')
    }
  }

  /**
   * Deletes a specific legal basis link from a requirement identification.
   *
   * @param {number} requirementId - The ID linking the requirement to the identification.
   * @param {number} legalBasisId - The ID of the legal basis.
   * @returns {Promise<boolean>} - True if deleted, false otherwise.
   * @throws {ErrorUtils} - If an error occurs during deletion.
   */
  static async unlinkLegalBasis (requirementId, legalBasisId) {
    const query = `
      DELETE FROM identification_legal_basis WHERE identification_requirement_id = ? AND legal_basis_id = ?
    `
    try {
      const [result] = await pool.query(query, [requirementId, legalBasisId])
      return result.affectedRows > 0
    } catch (error) {
      console.error('Error unlinking legal basis:', error.message)
      throw new ErrorUtils(500, 'Error unlinking legal basis')
    }
  }
  /**
 * Repository class for handling database operations related to linking Articles with Legal Basis in a Requirement Identification.
 */

  /**
     * Links an article to a legal basis within a requirement analysis.
     *
     * @param {number} requirementId - The ID linking the requirement to the identification.
     * @param {number} legalBasisId - The ID of the legal basis.
     * @param {number} articleId - The ID of the article.
     * @param {string} classification - The classification ('Obligatory' or 'Complementary').
     * @returns {Promise<boolean>} - True if the link was created successfully.
     * @throws {ErrorUtils} - If an error occurs during insertion.
     */
  static async linkArticle (requirementId, legalBasisId, articleId, classification) {
    const query = `
        INSERT INTO identification_legal_basis_articles (identification_requirement_id, legal_basis_id, article_id, classification)
        VALUES (?, ?, ?, ?)
      `

    try {
      const [result] = await pool.query(query, [requirementId, legalBasisId, articleId, classification])
      return result.affectedRows > 0
    } catch (error) {
      console.error('Error linking article:', error.message)
      throw new ErrorUtils(500, 'Error linking article')
    }
  }

  /**
     * Retrieves all articles linked to a legal basis within a requirement analysis.
     *
     * @param {number} requirementId - The ID linking the requirement to the identification.
     * @returns {Promise<Array<Article>>} - A list of linked articles as Article instances.
     * @throws {ErrorUtils} - If an error occurs during retrieval.
     */
  static async getLinkedArticles (requirementId) {
    const query = `
        SELECT 
          a.id AS article_id, 
          a.legal_basis_id, 
          a.article_name, 
          a.description, 
          a.article_order, 
          ilba.classification
        FROM identification_legal_basis_articles ilba
        JOIN article a ON ilba.article_id = a.id
        WHERE ilba.identification_requirement_id = ?
      `

    try {
      const [rows] = await pool.query(query, [requirementId])

      if (rows.length === 0) return null

      return rows.map(row => new Article(
        row.article_id,
        row.legal_basis_id,
        row.article_name,
        row.description,
        row.article_order,
        row.classification
      ))
    } catch (error) {
      console.error('Error retrieving linked articles:', error.message)
      throw new ErrorUtils(500, 'Error retrieving linked articles')
    }
  }

  /**
     * Deletes a specific article link from a legal basis within a requirement analysis.
     *
     * @param {number} requirementId - The ID linking the requirement to the identification.
     * @param {number} legalBasisId - The ID of the legal basis.
     * @param {number} articleId - The ID of the article.
     * @returns {Promise<boolean>} - True if deleted, false otherwise.
     * @throws {ErrorUtils} - If an error occurs during deletion.
     */
  static async unlinkArticle (requirementId, legalBasisId, articleId) {
    const query = `
        DELETE FROM identification_legal_basis_articles 
        WHERE identification_requirement_id = ? AND legal_basis_id = ? AND article_id = ?
      `

    try {
      const [result] = await pool.query(query, [requirementId, legalBasisId, articleId])
      return result.affectedRows > 0
    } catch (error) {
      console.error('Error unlinking article:', error.message)
      throw new ErrorUtils(500, 'Error unlinking article')
    }
  }

  /**
   * Retrieves requirements identifications filtered by identification name.
   * @param {string} identificationName - The identification name to filter by.
   * @returns {Promise<Array<RequirementsIdentification>|null>} - A list of identifications matching the name.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async findByName (identificationName) {
    const query = `
      SELECT id, identification_name, identification_description, status, user_id, created_at
      FROM requirements_identification
      WHERE identification_name LIKE ?`

    try {
      const [rows] = await pool.query(query, [`%${identificationName}%`])
      if (rows.length === 0) return null
      return rows.map(row => new RequirementsIdentification(
        row.id,
        row.identification_name,
        row.identification_description,
        row.status,
        row.user_id,
        row.created_at
      ))
    } catch (error) {
      console.error('Error retrieving identifications by name:', error.message)
      throw new ErrorUtils(500, 'Error retrieving identifications by name')
    }
  }

  /**
  /**
   * Retrieves by description.
   * @param {string} identificationDescription
   * @returns {Promise<Array<RequirementsIdentification>|null>}
   */
  static async findByDescription (identificationDescription) {
    const query = `
      SELECT id, identification_name, identification_description, status, user_id, created_at
      FROM requirements_identification
      WHERE identification_description LIKE ?`
    try {
      const [rows] = await pool.query(query, [`%${identificationDescription}%`])
      if (rows.length === 0) return null
      return rows.map(row => new RequirementsIdentification(
        row.id,
        row.identification_name,
        row.identification_description,
        row.status,
        row.user_id,
        row.created_at
      ))
    } catch (error) {
      console.error('Error retrieving by description:', error.message)
      throw new ErrorUtils(500, 'Error retrieving by description')
    }
  }

  /**
   * Retrieves by status.
   * @param {string} status
   * @returns {Promise<Array<RequirementsIdentification>|null>}
   */
  static async findByStatus (status) {
    const query = `
      SELECT id, identification_name, identification_description, status, user_id, created_at
      FROM requirements_identification
      WHERE status = ?`
    try {
      const [rows] = await pool.query(query, [status])
      if (rows.length === 0) return null
      return rows.map(row => new RequirementsIdentification(
        row.id,
        row.identification_name,
        row.identification_description,
        row.status,
        row.user_id,
        row.created_at
      ))
    } catch (error) {
      console.error('Error retrieving by status:', error.message)
      throw new ErrorUtils(500, 'Error retrieving by status')
    }
  }

  /**
   * Retrieves by user ID.
   * @param {number} userId
   * @returns {Promise<Array<RequirementsIdentification>|null>}
   */
  static async findByUserId (userId) {
    const query = `
      SELECT id, identification_name, identification_description, status, user_id, created_at
      FROM requirements_identification
      WHERE user_id = ?`
    try {
      const [rows] = await pool.query(query, [userId])
      if (rows.length === 0) return null
      return rows.map(row => new RequirementsIdentification(
        row.id,
        row.identification_name,
        row.identification_description,
        row.status,
        row.user_id,
        row.created_at
      ))
    } catch (error) {
      console.error('Error retrieving by user ID:', error.message)
      throw new ErrorUtils(500, 'Error retrieving by user ID')
    }
  }

  /**
 * Retrieves requirements identifications filtered by a date range on created_at.
 * @param {Date|null} from - Start date as a Date object (optional).
 * @param {Date|null} to - End date as a Date object (optional).
 * @returns {Promise<Array<RequirementsIdentification>>} - A list of identifications created within the date range.
 * @throws {ErrorUtils} - If an error occurs during retrieval.
 */
  static async findByCreatedAt (from, to) {
    let query = `
    SELECT id, identification_name, identification_description, status, user_id, created_at 
    FROM requirements_identification
  `
    const values = []
    const conditions = []

    if (from && to) {
      conditions.push('DATE(created_at) BETWEEN ? AND ?')
      values.push(from, to)
    } else if (from) {
      conditions.push('DATE(created_at) >= ?')
      values.push(from)
    } else if (to) {
      conditions.push('DATE(created_at) <= ?')
      values.push(to)
    }
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ')
    }
    try {
      const [rows] = await pool.query(query, values)
      return rows.map(
        (row) =>
          new RequirementsIdentification(
            row.id,
            row.identification_name,
            row.identification_description,
            row.status,
            row.user_id,
            row.created_at
          )
      )
    } catch (error) {
      console.error('Error retrieving by created_at range:', error.message)
      throw new ErrorUtils(500, 'Error retrieving by created_at range')
    }
  }
}

export default RequirementsIdentificationRepository
