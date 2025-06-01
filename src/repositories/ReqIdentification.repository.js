import { pool } from '../config/db.config.js'
import HttpException from '../services/errors/HttpException.js'
import { ReqIdentification } from '../models/ReqIdentification.model.js'

/**
 * Repository for requirement identifications and related operations.
 */
class ReqIdentificationRepository {
  /**
   * Inserts a new requirement identification record.
   * @param {Object} reqIdentification - The requirement identification data.
   * @param {string} reqIdentification.identificationName - The name of the requirement identification.
   * @param {string} [reqIdentification.identificationDescription] - Optional description of the requirement identification.
   * @param {number} reqIdentification.userId - ID of the user creating the requirement identification.
   * @returns {Promise<ReqIdentification>} - The created ReqIdentification instance.
   * @throws {HttpException}
   */
  static async create (reqIdentification) {
    const query = `
      INSERT INTO req_identifications (name, description, user_id)
      VALUES (?, ?, ?)
    `
    const values = [
      reqIdentification.identificationName,
      reqIdentification.identificationDescription,
      reqIdentification.userId
    ]
    try {
      const [result] = await pool.query(query, values)
      const reqIdentification = await this.findById(result.insertId)
      return reqIdentification
    } catch (error) {
      console.error('Error creating requirement identification:', error.message)
      throw new HttpException(
        500,
        'Error creating requirement identification in the database'
      )
    }
  }

  /**
 * Retrieves all requirement identifications.
 *
 * @returns {Promise<ReqIdentification[]>} - An array of all requirement identifications.
 * @throws {HttpException} - If an error occurs during the query.
 */
  static async findAll () {
    const query = `
    SELECT id, name, description, user_id, created_at, status
    FROM req_identifications
  `

    try {
      const [rows] = await pool.query(query)

      return rows.map(row => new ReqIdentification(
        row.id,
        row.name,
        row.description,
        row.user_id,
        row.created_at,
        row.status
      ))
    } catch (error) {
      console.error('Error fetching requirement identifications:', error.message)
      throw new HttpException(500, 'Error fetching requirement identifications from the database')
    }
  }

  /**
 * Retrieves a requirement identification by ID.
 * @param {number} reqIdentificationId - The ID of the requirement identification.
 * @returns {Promise<ReqIdentification|null>} - The found instance or null.
 * @throws {HttpException}
 */
  static async findById (reqIdentificationId) {
    const query = `
    SELECT id, name, description, user_id, created_at, status
    FROM req_identifications
    WHERE id = ?
  `
    try {
      const [rows] = await pool.query(query, [reqIdentificationId])
      if (rows.length === 0) return null

      const row = rows[0]
      return new ReqIdentification(
        row.id,
        row.name,
        row.description,
        row.user_id,
        row.created_at,
        row.status
      )
    } catch (error) {
      console.error('Error fetching requirement identification:', error.message)
      throw new HttpException(500, 'Error fetching requirement identification from the database')
    }
  }

  /**
   * Checks if a requirement identification exists with the given name.
   * @param {string} reqIdentificationName - The name to check for existence.
   * @returns {Promise<boolean>} - True if a record with the same name exists, false otherwise.
   * @throws {HttpException} - If an error occurs during the check.
   */
  static async existsByReqIdentificationName (reqIdentificationName) {
    const query = `
    SELECT 1
    FROM req_identifications
    WHERE name = ?
    LIMIT 1
  `

    try {
      const [rows] = await pool.query(query, [reqIdentificationName])
      return rows.length > 0
    } catch (error) {
      console.error(
        'Error checking if requirement identification exists:',
        error.message
      )
      throw new HttpException(
        500,
        'Error checking if requirement identification exists'
      )
    }
  }

  //   /**
  //  * Updates the status of an identification.
  //  * @param {Object} identification - The identification data.
  //  * @param {number} identification.id - The identification ID.
  //  * @param {'Active'|'Failed'|'Completed'} identification.status - New status.
  //  * @returns {Promise<boolean>} - True if updated.
  //  * @throws {HttpException}
  //  */
  // static async updateStatus (identification) {
  //   const query = `
  //     UPDATE req_identifications
  //     SET status = ?
  //     WHERE id = ?
  //   `
  //   const values = [
  //     identification.status,
  //     identification.id
  //   ]

  //   try {
  //     const [res] = await pool.query(query, values)
  //     return res.affectedRows > 0
  //   } catch (err) {
  //     console.error('Error updating requirements identification status:', err.message)
  //     throw new HttpException(500, 'Error updating requirements identification status')
  //   }
  // }

  // /**
  //  * Marks a requirements identification as 'Completed'.
  //  *
  //  * @param {number} id - The ID of the identification to update.
  //  * @returns {Promise<boolean>} - Returns true if updated, false if not found.
  //  * @throws {HttpException}
  //  */
  // static async markAsCompleted (id) {
  //   return await this.updateStatus({ id, status: 'Completed' })
  // }

  // /**
  //      * Marks a requirements identification as 'Failed'.
  //      *
  //      * @param {number} id - The ID of the identification to update.
  //      * @returns {Promise<boolean>} - Returns true if updated, false if not found.
  //      * @throws {HttpException}
  //      */
  // static async markAsFailed (id) {
  //   return await this.updateStatus({ id, status: 'Failed' })
  // }

  //   /**
  //    * Finds multiple identifications by their IDs.
  //    * @param {Array<number>} identificationIds - Array of identification IDs to find.
  //    * @returns {Promise<ReqIdentification[]>} - Array of found identification objects.
  //    * @throws {HttpException}
  //    */
  //   static async findByIds (identificationIds) {
  //     if (!identificationIds || identificationIds.length === 0) {
  //       return []
  //     }

  //     const query = `
  //           SELECT id, name, description, user_id AS user_id, created_at, status
  //           FROM req_identifications
  //           WHERE id IN (?)
  //         `

  //     try {
  //       const [rows] = await pool.query(query, [identificationIds])
  //       return rows.map(r => ReqIdentification.fromRow(r))
  //     } catch (err) {
  //       console.error('Error fetching requirements identifications by IDs:', err.message)
  //       throw new HttpException(500, 'Error fetching requirements identifications by IDs')
  //     }
  //   }

  //   /**
  //    * Checks if an identification name already exists in the database, excluding a specific ID.
  //    * @param {string} identificationName - The identification name to check.
  //    * @param {number} identificationId - The ID to exclude from the check.
  //    * @returns {Promise<boolean>} - Returns true if the name exists (excluding the given ID), false otherwise.
  //    * @throws {HttpException}
  //    */
  //   static async existsByNameExcludingId (identificationName, identificationId) {
  //     const query = `
  //           SELECT 1
  //           FROM req_identifications
  //           WHERE name = ? AND id != ?
  //           LIMIT 1
  //         `

  //     try {
  //       const [rows] = await pool.query(query, [identificationName, identificationId])
  //       return rows.length > 0
  //     } catch (err) {
  //       console.error('Error checking if identification name exists excluding ID:', err.message)
  //       throw new HttpException(500, 'Error checking if identification name exists excluding ID')
  //     }
  //   }

  //   /**
  //    * Updates name and description by ID.
  //    * @param {Object} identification - The identification data.
  //    * @param {number} identification.id - The identification ID.
  //    * @param {string} [identification.name] - New name.
  //    * @param {string} [identification.description] - New description.
  //    * @returns {Promise<ReqIdentification|null>} - Updated instance or null.
  //    * @throws {HttpException}
  //    */
  //   static async updateById (identification) {
  //     const query = `
  //       UPDATE req_identifications
  //       SET name = COALESCE(?, name), description = COALESCE(?, description)
  //       WHERE id = ?
  //     `
  //     const values = [identification.name || null, identification.description || null, identification.id]

  //     try {
  //       const [res] = await pool.query(query, values)
  //       if (!res.affectedRows) return null
  //       return this.findById({ id: identification.id })
  //     } catch (err) {
  //       console.error('Error updating requirements identification:', err.message)
  //       throw new HttpException(500, 'Error updating requirements identification')
  //     }
  //   }

  //   /**
  //    * Deletes an identification by ID.
  //    * @param {Object} identification - The identification data.
  //    * @param {number} identification.id - The identification ID.
  //    * @returns {Promise<boolean>} - True if deleted.
  //    * @throws {HttpException}
  //    */
  //   static async deleteById (identification) {
  //     const query = `
  //       DELETE FROM req_identifications WHERE id = ?
  //     `
  //     const values = [identification.id]

  //     try {
  //       const [res] = await pool.query(query, values)
  //       return res.affectedRows > 0
  //     } catch (err) {
  //       console.error('Error deleting requirements identification:', err.message)
  //       throw new HttpException(500, 'Error deleting requirements identification')
  //     }
  //   }

  //   /**
  //    * Deletes all identifications from the database.
  //    * @returns {Promise<void>} - Resolves when all records are deleted.
  //    * @throws {HttpException}
  //    */
  //   static async deleteAll () {
  //     const query = 'DELETE FROM req_identifications'

  //     try {
  //       await pool.query(query)
  //     } catch (err) {
  //       console.error('Error deleting all requirements identifications:', err.message)
  //       throw new HttpException(500, 'Error deleting all requirements identifications')
  //     }
  //   }

  //   /**
  //    * Links a requirement to an identification.
  //    * @param {Object} data - The link data.
  //    * @param {number} data.identificationId - The identification ID.
  //    * @param {number} data.requirementId - The requirement ID.
  //    * @returns {Promise<boolean>} - True if linked.
  //    * @throws {HttpException}
  //    */
  //   static async linkRequirement (data) {
  //     const query = `
  //       INSERT INTO req_identifications_requirements
  //       (req_identification_id, requirement_id)
  //       VALUES (?, ?)
  //     `
  //     const values = [data.identificationId, data.requirementId]

  //     try {
  //       const [res] = await pool.query(query, values)
  //       return res.affectedRows > 0
  //     } catch (err) {
  //       console.error('Error linking requirement:', err.message)
  //       throw new HttpException(500, 'Error linking requirement')
  //     }
  //   }

  //   /**
  //    * Retrieves linked requirements.
  //    * @param {Object} data - The query data.
  //    * @param {number} data.identificationId - The identification ID.
  //    * @returns {Promise<Requirement[]>} - Array of linked requirements.
  //    * @throws {HttpException}
  //    */
  //   static async getLinkedRequirements (data) {
  //     const query = `
  //       SELECT r.*
  //       FROM req_identifications_requirements rr
  //       JOIN requirements r ON rr.requirement_id = r.id
  //       WHERE rr.req_identification_id = ?
  //     `
  //     const values = [data.identificationId]

  //     try {
  //       const [rows] = await pool.query(query, values)
  //       return rows.map(r => new Requirement(r))
  //     } catch (err) {
  //       console.error('Error fetching linked requirements:', err.message)
  //       throw new HttpException(500, 'Error fetching linked requirements')
  //     }
  //   }

  //   /**
  //    * Deletes a specific requirement link from an identification.
  //    *
  //    * @param {Object} data - The unlink data.
  //    * @param {number} data.identificationId - The ID of the identification.
  //    * @param {number} data.requirementId - The ID of the requirement to unlink.
  //    * @returns {Promise<boolean>} - True if the link was deleted, false otherwise.
  //    * @throws {HttpException}
  //    */
  //   static async unlinkRequirement (data) {
  //     const query = `
  //           DELETE FROM req_identifications_requirements
  //           WHERE req_identification_id = ? AND requirement_id = ?
  //         `
  //     const values = [data.identificationId, data.requirementId]

  //     try {
  //       const [res] = await pool.query(query, values)
  //       return res.affectedRows > 0
  //     } catch (err) {
  //       console.error('Error unlinking requirement:', err.message)
  //       throw new HttpException(500, 'Error unlinking requirement')
  //     }
  //   }

  //   catch (err) {
  //     console.error('Error linking requirement:', err.message)
  //     throw new HttpException(500, 'Error linking requirement')
  //   }

  //   /**
  //    * Links metadata for a requirement.
  //    * @param {Object} data - The metadata link data.
  //    * @param {number} data.identificationId - The identification ID.
  //    * @param {number} data.requirementId - The requirement ID.
  //    * @param {string} data.requirementNumber - The requirement number.
  //    * @param {number|null} data.requirementTypeId - The requirement type ID.
  //    * @returns {Promise<boolean>} - True if linked.
  //    * @throws {HttpException}
  //    */
  //   static async linkMetadata (data) {
  //     const query = `
  //       INSERT INTO req_identifications_metadata
  //       (req_identification_id, requirement_id, requirement_number, requirement_type_id)
  //       VALUES (?, ?, ?, ?)
  //     `
  //     const values = [
  //       data.identificationId,
  //       data.requirementId,
  //       data.requirementNumber,
  //       data.requirementTypeId
  //     ]

  //     try {
  //       const [res] = await pool.query(query, values)
  //       return res.affectedRows > 0
  //     } catch (err) {
  //       console.error('Error linking metadata:', err.message)
  //       throw new HttpException(500, 'Error linking metadata')
  //     }
  //   }

  //   /**
  //    * Retrieves linked metadata with type.
  //    * @param {Object} data - The query data.
  //    * @param {number} data.identificationId - The identification ID.
  //    * @param {number} data.requirementId - The requirement ID.
  //    * @returns {Promise<{ requirementNumber: string, requirementType: RequirementType }|null>} - The linked metadata or null.
  //    * @throws {HttpException}
  //    */
  //   static async getLinkedMetadata (data) {
  //     const query = `
  //       SELECT m.requirement_number AS requirementNumber,
  //              t.id, t.name, t.description, t.classification
  //       FROM req_identifications_metadata m
  //       LEFT JOIN requirement_types t ON m.requirement_type_id = t.id
  //       WHERE m.req_identification_id = ?
  //         AND m.requirement_id = ?
  //     `
  //     const values = [data.identificationId, data.requirementId]

  //     try {
  //       const [rows] = await pool.query(query, values)
  //       if (!rows.length) return null
  //       const row = rows[0]
  //       return {
  //         requirementNumber: row.requirementNumber,
  //         requirementType: RequirementType.fromRow(row)
  //       }
  //     } catch (err) {
  //       console.error('Error fetching metadata:', err.message)
  //       throw new HttpException(500, 'Error fetching metadata')
  //     }
  //   }

  //   /**
  //    * Deletes a metadata link for a requirement from an identification.
  //    * @param {Object} data - The unlink data.
  //    * @param {number} data.identificationId - The identification ID.
  //    * @param {number} data.requirementId - The requirement ID.
  //    * @returns {Promise<boolean>} - True if the metadata link was deleted, false otherwise.
  //    * @throws {HttpException}
  //    */
  //   static async unlinkMetadata (data) {
  //     const query = `
  //           DELETE FROM req_identifications_metadata
  //           WHERE req_identification_id = ? AND requirement_id = ?
  //         `
  //     const values = [data.identificationId, data.requirementId]

  //     try {
  //       const [res] = await pool.query(query, values)
  //       return res.affectedRows > 0
  //     } catch (err) {
  //       console.error('Error unlinking metadata:', err.message)
  //       throw new HttpException(500, 'Error unlinking metadata')
  //     }
  //   }

  //   /**
  //    * Links a legal basis to a requirement.
  //    * @param {Object} data - The link data.
  //    * @param {number} data.identificationId - The identification ID.
  //    * @param {number} data.requirementId - The requirement ID.
  //    * @param {number} data.legalBasisId - The legal basis ID.
  //    * @returns {Promise<boolean>} - True if linked.
  //    * @throws {HttpException}
  //    */
  //   static async linkLegalBasis (data) {
  //     const query = `
  //       INSERT INTO req_identifications_legal_basis
  //       (req_identification_id, requirement_id, legal_basis_id)
  //       VALUES (?, ?, ?)
  //     `
  //     const values = [
  //       data.identificationId,
  //       data.requirementId,
  //       data.legalBasisId
  //     ]

  //     try {
  //       const [res] = await pool.query(query, values)
  //       return res.affectedRows > 0
  //     } catch (err) {
  //       console.error('Error linking legal basis:', err.message)
  //       throw new HttpException(500, 'Error linking legal basis')
  //     }
  //   }

  //   /**
  //    * Retrieves linked legal bases.
  //    * @param {Object} data - The query data.
  //    * @param {number} data.identificationId - The identification ID.
  //    * @param {number} data.requirementId - The requirement ID.
  //    * @returns {Promise<LegalBasis[]>} - Array of linked legal bases.
  //    * @throws {HttpException}
  //    */
  //   static async getLinkedLegalBases (data) {
  //     const query = `
  //       SELECT b.*
  //       FROM req_identifications_legal_basis lb
  //       JOIN legal_basis b ON lb.legal_basis_id = b.id
  //       WHERE lb.req_identification_id = ?
  //         AND lb.requirement_id = ?
  //     `
  //     const values = [data.identificationId, data.requirementId]

  //     try {
  //       const [rows] = await pool.query(query, values)
  //       return rows.map(r => new LegalBasis(r))
  //     } catch (err) {
  //       console.error('Error fetching linked legal bases:', err.message)
  //       throw new HttpException(500, 'Error fetching linked legal bases')
  //     }
  //   }

  //   /**
  //    * Deletes a legal basis link for a requirement from an identification.
  //    * @param {Object} data - The unlink data.
  //    * @param {number} data.identificationId - The identification ID.
  //    * @param {number} data.requirementId - The requirement ID.
  //    * @param {number} data.legalBasisId - The legal basis ID.
  //    * @returns {Promise<boolean>} - True if the link was deleted, false otherwise.
  //    * @throws {HttpException}
  //    */
  //   static async unlinkLegalBasis (data) {
  //     const query = `
  //       DELETE FROM req_identifications_legal_basis
  //       WHERE req_identification_id = ? AND requirement_id = ? AND legal_basis_id = ?
  //     `
  //     const values = [data.identificationId, data.requirementId, data.legalBasisId]

  //     try {
  //       const [res] = await pool.query(query, values)
  //       return res.affectedRows > 0
  //     } catch (err) {
  //       console.error('Error unlinking legal basis:', err.message)
  //       throw new HttpException(500, 'Error unlinking legal basis')
  //     }
  //   }

  //   /**
  //    * Links an article under a legal basis.
  //    * @param {Object} data - The link data.
  //    * @param {number} data.identificationId - The identification ID.
  //    * @param {number} data.requirementId - The requirement ID.
  //    * @param {number} data.legalBasisId - The legal basis ID.
  //    * @param {number} data.articleId - The article ID.
  //    * @param {string} data.articleType - The article type (mandatory, complementary, general).
  //    * @returns {Promise<boolean>} - True if linked.
  //    * @throws {HttpException}
  //    */
  //   static async linkArticle (data) {
  //     const query = `
  //       INSERT INTO req_identifications_articles
  //       (req_identification_id, requirement_id, legal_basis_id, article_id, article_type)
  //       VALUES (?, ?, ?, ?, ?)
  //     `
  //     const values = [
  //       data.identificationId,
  //       data.requirementId,
  //       data.legalBasisId,
  //       data.articleId,
  //       data.articleType
  //     ]

  //     try {
  //       const [res] = await pool.query(query, values)
  //       return res.affectedRows > 0
  //     } catch (err) {
  //       console.error('Error linking article:', err.message)
  //       throw new HttpException(500, 'Error linking article')
  //     }
  //   }

  //   /**
  //    * Retrieves linked articles.
  //    * @param {Object} data - The query data.
  //    * @param {number} data.identificationId - The identification ID.
  //    * @param {number} data.requirementId - The requirement ID.
  //    * @returns {Promise<Article[]>} - Array of linked articles.
  //    * @throws {HttpException}
  //    */
  //   static async getLinkedArticles (data) {
  //     const query = `
  //       SELECT a.*, x.article_type
  //       FROM req_identifications_articles x
  //       JOIN article a ON x.article_id = a.id
  //       WHERE x.req_identification_id = ?
  //         AND x.requirement_id = ?
  //     `
  //     const values = [data.identificationId, data.requirementId]

  //     try {
  //       const [rows] = await pool.query(query, values)
  //       return rows.map(r => new Article(r))
  //     } catch (err) {
  //       console.error('Error fetching linked articles:', err.message)
  //       throw new HttpException(500, 'Error fetching linked articles')
  //     }
  //   }

  //   /**
  //    * Deletes a specific article link from an identification under a legal basis.
  //    * @param {Object} data - The unlink data.
  //    * @param {number} data.identificationId - The identification ID.
  //    * @param {number} data.requirementId - The requirement ID.
  //    * @param {number} data.legalBasisId - The legal basis ID.
  //    * @param {number} data.articleId - The article ID to unlink.
  //    * @returns {Promise<boolean>} - True if the link was deleted, false otherwise.
  //    * @throws {HttpException}
  //    */
  //   static async unlinkArticle (data) {
  //     const query = `
  //       DELETE FROM req_identifications_articles
  //       WHERE req_identification_id = ?
  //         AND requirement_id = ?
  //         AND legal_basis_id = ?
  //         AND article_id = ?
  //     `
  //     const values = [
  //       data.identificationId,
  //       data.requirementId,
  //       data.legalBasisId,
  //       data.articleId
  //     ]

  //     try {
  //       const [res] = await pool.query(query, values)
  //       return res.affectedRows > 0
  //     } catch (err) {
  //       console.error('Error unlinking article:', err.message)
  //       throw new HttpException(500, 'Error unlinking article')
  //     }
  //   }

  //   /**
  //    * Links a legal verb translation.
  //    * @param {Object} data - The link data.
  //    * @param {number} data.identificationId - The identification ID.
  //    * @param {number} data.requirementId - The requirement ID.
  //    * @param {number} data.legalVerbId - The legal verb ID.
  //    * @param {string} data.translation - The translated text.
  //    * @returns {Promise<boolean>} - True if linked.
  //    * @throws {HttpException}
  //    */
  //   static async linkLegalVerb (data) {
  //     const query = `
  //       INSERT INTO req_identifications_legal_verbs
  //       (req_identification_id, requirement_id, legal_verb_id, translation)
  //       VALUES (?, ?, ?, ?)
  //     `
  //     const values = [
  //       data.identificationId,
  //       data.requirementId,
  //       data.legalVerbId,
  //       data.translation
  //     ]

  //     try {
  //       const [res] = await pool.query(query, values)
  //       return res.affectedRows > 0
  //     } catch (err) {
  //       console.error('Error linking legal verb:', err.message)
  //       throw new HttpException(500, 'Error linking legal verb')
  //     }
  //   }

  //   /**
  //    * Retrieves linked legal verbs.
  //    * @param {Object} data - The query data.
  //    * @param {number} data.identificationId - The identification ID.
  //    * @param {number} data.requirementId - The requirement ID.
  //    * @returns {Promise<LegalVerb[]>} - Array of linked legal verbs.
  //    * @throws {HttpException}
  //    */
  //   static async getLinkedLegalVerbs (data) {
  //     const query = `
  //       SELECT v.*, x.translation
  //       FROM req_identifications_legal_verbs x
  //       JOIN legal_verbs v ON x.legal_verb_id = v.id
  //       WHERE x.req_identification_id = ?
  //         AND x.requirement_id = ?
  //     `
  //     const values = [data.identificationId, data.requirementId]

  //     try {
  //       const [rows] = await pool.query(query, values)
  //       return rows.map(r => new LegalVerb(r))
  //     } catch (err) {
  //       console.error('Error fetching linked legal verbs:', err.message)
  //       throw new HttpException(500, 'Error fetching linked legal verbs')
  //     }
  //   }

  //   /**
  //    * Deletes a legal verb translation link for a requirement from an identification.
  //    * @param {Object} data - The unlink data.
  //    * @param {number} data.identificationId - The identification ID.
  //    * @param {number} data.requirementId - The requirement ID.
  //    * @param {number} data.legalVerbId - The legal verb ID.
  //    * @returns {Promise<boolean>} - True if the link was deleted, false otherwise.
  //    * @throws {HttpException}
  //    */
  //   static async unlinkLegalVerb (data) {
  //     const query = `
  //       DELETE FROM req_identifications_legal_verbs
  //       WHERE req_identification_id = ? AND requirement_id = ? AND legal_verb_id = ?
  //     `
  //     const values = [data.identificationId, data.requirementId, data.legalVerbId]

  //     try {
  //       const [res] = await pool.query(query, values)
  //       return res.affectedRows > 0
  //     } catch (err) {
  //       console.error('Error unlinking legal verb:', err.message)
  //       throw new HttpException(500, 'Error unlinking legal verb')
  //     }
  //   }
}
export default ReqIdentificationRepository
