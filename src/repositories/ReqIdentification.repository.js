import { pool } from '../config/db.config.js'
import HttpException from '../services/errors/HttpException.js'
import User from '../models/User.model.js'
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
      console.error(
        'Error creating requirement identification:',
        error.message
      )
      throw new HttpException(
        500,
        'Error creating requirement identification in the database'
      )
    }
  }

  /**
   * Updates the status of a requirement identification.
   *
   * @param {number} reqIdentificationId - The ID of the requirement identification.
   * @param {'Activo' | 'Fallido' | 'Completado'} status - The new status.
   * @returns {Promise<void>}
   * @throws {HttpException}
   */
  static async updateStatus (reqIdentificationId, status) {
    const query = `
      UPDATE req_identifications
      SET status = ?
      WHERE id = ?
    `
    try {
      await pool.query(query, [status, reqIdentificationId])
    } catch (error) {
      console.error(
        'Error updating requirement identification status:',
        error.message
      )
      throw new HttpException(
        500,
        'Error updating requirement identification status'
      )
    }
  }

  /**
   * Marks a requirement identification as Failed.
   * @param {number} reqIdentificationId - The ID of the requirement identification.
   * @returns {Promise<void>}
   */
  static async markAsFailed (reqIdentificationId) {
    return this.updateStatus(reqIdentificationId, 'Fallido')
  }

  /**
   * Marks a requirement identification as Completed.
   * @param {number} reqIdentificationId - The ID of the requirement identification.
   * @returns {Promise<void>}
   */
  static async markAsCompleted (reqIdentificationId) {
    return this.updateStatus(reqIdentificationId, 'Completado')
  }

  /**
   * Retrieves all requirement identifications.
   *
   * @returns {Promise<ReqIdentification[]|null>} - An array of all requirement identifications.
   * @throws {HttpException} - If an error occurs during the query.
   */
  static async findAll () {
    const query = `
    SELECT 
      ri.id AS req_identification_id,
      ri.name,
      ri.description,
      ri.user_id,
      ri.created_at,
      ri.status,

      u.id AS user_id,
      u.name AS user_name,
      u.gmail AS user_gmail,
      u.role_id AS user_role_id,
      u.profile_picture AS user_profile_picture,

      s.id AS subject_id,
      s.subject_name,

      a.id AS aspect_id,
      a.aspect_name,

      lb.jurisdiction,
      lb.state,
      lb.municipality

    FROM req_identifications ri
    LEFT JOIN users u ON ri.user_id = u.id
    LEFT JOIN req_identifications_requirements rir ON ri.id = rir.req_identification_id
    LEFT JOIN req_identifications_requirement_legal_basis rirlb 
      ON rir.req_identification_id = rirlb.req_identification_id 
      AND rir.requirement_id = rirlb.requirement_id
    LEFT JOIN legal_basis lb ON rirlb.legal_basis_id = lb.id
    LEFT JOIN subjects s ON lb.subject_id = s.id
    LEFT JOIN legal_basis_subject_aspect lbsa ON lb.id = lbsa.legal_basis_id
    LEFT JOIN aspects a ON lbsa.aspect_id = a.id
    ORDER BY ri.created_at DESC, ri.id DESC
  `

    try {
      const [rows] = await pool.query(query)
      if (rows.length === 0) return null

      const reqIdentificationMap = new Map()

      for (const row of rows) {
        if (!reqIdentificationMap.has(row.req_identification_id)) {
          const user = row.user_id
            ? new User(
              row.user_id,
              row.user_name,
              null,
              row.user_gmail,
              row.user_role_id,
              row.user_profile_picture
            )
            : null

          reqIdentificationMap.set(row.req_identification_id, {
            id: row.req_identification_id,
            name: row.name,
            description: row.description,
            createdAt: row.created_at,
            status: row.status,
            user,
            subject: row.subject_id
              ? {
                  subject_id: row.subject_id,
                  subject_name: row.subject_name
                }
              : null,
            aspects: new Map(),
            jurisdiction: row.jurisdiction,
            state: row.state,
            municipality: row.municipality
          })
        }

        const reqIdentification = reqIdentificationMap.get(
          row.req_identification_id
        )

        if (row.aspect_id && !reqIdentification.aspects.has(row.aspect_id)) {
          reqIdentification.aspects.set(row.aspect_id, {
            aspect_id: row.aspect_id,
            aspect_name: row.aspect_name
          })
        }
      }

      return Array.from(reqIdentificationMap.values()).map(
        (item) =>
          new ReqIdentification(
            item.id,
            item.name,
            item.description,
            item.user,
            item.createdAt,
            item.status,
            item.subject,
            Array.from(item.aspects.values()),
            item.jurisdiction,
            item.state,
            item.municipality
          )
      )
    } catch (error) {
      console.error(
        'Error fetching requirement identifications:',
        error.message
      )
      throw new HttpException(
        500,
        'Error fetching requirement identifications'
      )
    }
  }

  /**
   * Retrieves a requirement identification by ID.
   *
   * @param {number} reqIdentificationId - The ID of the requirement identification.
   * @returns {Promise<ReqIdentification|null>} - The found instance or null.
   * @throws {HttpException}
   */
  static async findById (reqIdentificationId) {
    const query = `
    SELECT 
      ri.id AS req_identification_id,
      ri.name,
      ri.description,
      ri.user_id,
      ri.created_at,
      ri.status,

      u.id AS user_id,
      u.name AS user_name,
      u.gmail AS user_gmail,
      u.role_id AS user_role_id,
      u.profile_picture AS user_profile_picture,

      s.id AS subject_id,
      s.subject_name,

      a.id AS aspect_id,
      a.aspect_name,

      lb.jurisdiction,
      lb.state,
      lb.municipality

    FROM req_identifications ri
    LEFT JOIN users u ON ri.user_id = u.id
    LEFT JOIN req_identifications_requirements rir ON ri.id = rir.req_identification_id
    LEFT JOIN req_identifications_requirement_legal_basis rirlb 
      ON rir.req_identification_id = rirlb.req_identification_id 
      AND rir.requirement_id = rirlb.requirement_id
    LEFT JOIN legal_basis lb ON rirlb.legal_basis_id = lb.id
    LEFT JOIN subjects s ON lb.subject_id = s.id
    LEFT JOIN legal_basis_subject_aspect lbsa ON lb.id = lbsa.legal_basis_id
    LEFT JOIN aspects a ON lbsa.aspect_id = a.id
    WHERE ri.id = ?
    ORDER BY ri.created_at DESC, ri.id DESC
  `

    try {
      const [rows] = await pool.query(query, [reqIdentificationId])
      if (rows.length === 0) return null

      const row = rows[0]
      const user = row.user_id
        ? new User(
          row.user_id,
          row.user_name,
          null,
          row.user_gmail,
          row.user_role_id,
          row.user_profile_picture
        )
        : null

      const aspectsMap = new Map()
      for (const row of rows) {
        if (row.aspect_id && !aspectsMap.has(row.aspect_id)) {
          aspectsMap.set(row.aspect_id, {
            aspect_id: row.aspect_id,
            aspect_name: row.aspect_name
          })
        }
      }

      return new ReqIdentification(
        row.req_identification_id,
        row.name,
        row.description,
        user,
        row.created_at,
        row.status,
        row.subject_id
          ? {
              subject_id: row.subject_id,
              subject_name: row.subject_name
            }
          : null,
        Array.from(aspectsMap.values()),
        row.jurisdiction,
        row.state,
        row.municipality
      )
    } catch (error) {
      console.error(
        'Error fetching requirement identification:',
        error.message
      )
      throw new HttpException(
        500,
        'Error fetching requirement identification from the database'
      )
    }
  }

  /**
   * Retrieves multiple requirement identifications by their IDs.
   *
   * @param {number[]} reqIdentificationIds - Array of requirement identification IDs.
   * @returns {Promise<ReqIdentification[]|null>} - Array of found ReqIdentification instances, or null if none found.
   * @throws {HttpException} - If an error occurs during the query.
   */
  static async findByIds (reqIdentificationIds) {
    if (reqIdentificationIds.length === 0) {
      return null
    }
    const placeholders = reqIdentificationIds.map(() => '?').join(', ')
    const query = `
    SELECT 
      ri.id AS req_identification_id,
      ri.name,
      ri.description,
      ri.user_id,
      ri.created_at,
      ri.status,

      u.id AS user_id,
      u.name AS user_name,
      u.gmail AS user_gmail,
      u.role_id AS user_role_id,
      u.profile_picture AS user_profile_picture,

      s.id AS subject_id,
      s.subject_name,

      a.id AS aspect_id,
      a.aspect_name,

      lb.jurisdiction,
      lb.state,
      lb.municipality

    FROM req_identifications ri
    LEFT JOIN users u ON ri.user_id = u.id
    LEFT JOIN req_identifications_requirements rir ON ri.id = rir.req_identification_id
    LEFT JOIN req_identifications_requirement_legal_basis rirlb 
      ON rir.req_identification_id = rirlb.req_identification_id 
      AND rir.requirement_id = rirlb.requirement_id
    LEFT JOIN legal_basis lb ON rirlb.legal_basis_id = lb.id
    LEFT JOIN subjects s ON lb.subject_id = s.id
    LEFT JOIN legal_basis_subject_aspect lbsa ON lb.id = lbsa.legal_basis_id
    LEFT JOIN aspects a ON lbsa.aspect_id = a.id
    WHERE ri.id IN (${placeholders})
    ORDER BY ri.created_at DESC, ri.id DESC
  `

    try {
      const [rows] = await pool.query(query, reqIdentificationIds)
      if (rows.length === 0) return null

      const reqIdentificationMap = new Map()

      for (const row of rows) {
        if (!reqIdentificationMap.has(row.req_identification_id)) {
          const user = row.user_id
            ? new User(
              row.user_id,
              row.user_name,
              null,
              row.user_gmail,
              row.user_role_id,
              row.user_profile_picture
            )
            : null

          reqIdentificationMap.set(row.req_identification_id, {
            id: row.req_identification_id,
            name: row.name,
            description: row.description,
            createdAt: row.created_at,
            status: row.status,
            user,
            subject: row.subject_id
              ? {
                  subject_id: row.subject_id,
                  subject_name: row.subject_name
                }
              : null,
            aspects: new Map(),
            jurisdiction: row.jurisdiction,
            state: row.state,
            municipality: row.municipality
          })
        }

        const reqIdentification = reqIdentificationMap.get(
          row.req_identification_id
        )

        if (row.aspect_id && !reqIdentification.aspects.has(row.aspect_id)) {
          reqIdentification.aspects.set(row.aspect_id, {
            aspect_id: row.aspect_id,
            aspect_name: row.aspect_name
          })
        }
      }

      return Array.from(reqIdentificationMap.values()).map(
        (item) =>
          new ReqIdentification(
            item.id,
            item.name,
            item.description,
            item.user,
            item.createdAt,
            item.status,
            item.subject,
            Array.from(item.aspects.values()),
            item.jurisdiction,
            item.state,
            item.municipality
          )
      )
    } catch (error) {
      console.error(
        'Error fetching requirement identifications by IDs:',
        error.message
      )
      throw new HttpException(
        500,
        'Error fetching requirement identifications by IDs'
      )
    }
  }

  /**
   * Checks if a requirement identification exists with the given name.
   * @param {string} reqIdentificationName - The name to check for existence.
   * @returns {Promise<boolean>} - True if a record with the same name exists, false otherwise.
   * @throws {HttpException} - If an error occurs during the check.
   */
  static async existsByName (reqIdentificationName) {
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

  /**
   * Checks if a requirement identification with the given name exists,
   * excluding the specified requirement identification ID.
   *
   * @param {string} reqIdentificationName - The name to check for uniqueness.
   * @param {number} reqIdentificationId - The ID to exclude from the check.
   * @returns {Promise<boolean>} - True if a duplicate name exists (excluding the given ID), false otherwise.
   * @throws {HttpException} - If an error occurs during the check.
   */
  static async existsByNameExcludingId (
    reqIdentificationName,
    reqIdentificationId
  ) {
    const query = `
    SELECT 1
    FROM req_identifications
    WHERE name = ? AND id != ?
    LIMIT 1
  `
    try {
      const [rows] = await pool.query(query, [
        reqIdentificationName,
        reqIdentificationId
      ])
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

  /**
   * Retrieves requirement identifications filtered by name.
   *
   * @param {string} name - The name to filter by.
   * @returns {Promise<ReqIdentification[]|null>} - An array of requirement identifications, or null if none found.
   * @throws {HttpException} - If an error occurs during the query.
   */
  static async findByName (name) {
    const query = `
      SELECT 
        ri.id AS req_identification_id,
        ri.name,
        ri.description,
        ri.user_id,
        ri.created_at,
        ri.status,

        u.id AS user_id,
        u.name AS user_name,
        u.gmail AS user_gmail,
        u.role_id AS user_role_id,
        u.profile_picture AS user_profile_picture,

        s.id AS subject_id,
        s.subject_name,

        a.id AS aspect_id,
        a.aspect_name,

        lb.jurisdiction,
        lb.state,
        lb.municipality

      FROM req_identifications ri
      LEFT JOIN users u ON ri.user_id = u.id
      LEFT JOIN req_identifications_requirements rir ON ri.id = rir.req_identification_id
      LEFT JOIN req_identifications_requirement_legal_basis rirlb 
        ON rir.req_identification_id = rirlb.req_identification_id 
        AND rir.requirement_id = rirlb.requirement_id
      LEFT JOIN legal_basis lb ON rirlb.legal_basis_id = lb.id
      LEFT JOIN subjects s ON lb.subject_id = s.id
      LEFT JOIN legal_basis_subject_aspect lbsa ON lb.id = lbsa.legal_basis_id
      LEFT JOIN aspects a ON lbsa.aspect_id = a.id
      WHERE ri.name LIKE ?
      ORDER BY ri.created_at DESC, ri.id DESC
    `

    try {
      const filterValue = `%${name}%`
      const [rows] = await pool.query(query, [filterValue])
      if (rows.length === 0) return null

      const reqIdentificationMap = new Map()

      for (const row of rows) {
        if (!reqIdentificationMap.has(row.req_identification_id)) {
          const user = row.user_id
            ? new User(
              row.user_id,
              row.user_name,
              null,
              row.user_gmail,
              row.user_role_id,
              row.user_profile_picture
            )
            : null

          reqIdentificationMap.set(row.req_identification_id, {
            id: row.req_identification_id,
            name: row.name,
            description: row.description,
            createdAt: row.created_at,
            status: row.status,
            user,
            subject: row.subject_id
              ? {
                  subject_id: row.subject_id,
                  subject_name: row.subject_name
                }
              : null,
            aspects: new Map(),
            jurisdiction: row.jurisdiction,
            state: row.state,
            municipality: row.municipality
          })
        }

        const reqIdentification = reqIdentificationMap.get(
          row.req_identification_id
        )

        if (row.aspect_id && !reqIdentification.aspects.has(row.aspect_id)) {
          reqIdentification.aspects.set(row.aspect_id, {
            aspect_id: row.aspect_id,
            aspect_name: row.aspect_name
          })
        }
      }

      return Array.from(reqIdentificationMap.values()).map(
        (item) =>
          new ReqIdentification(
            item.id,
            item.name,
            item.description,
            item.user,
            item.createdAt,
            item.status,
            item.subject,
            Array.from(item.aspects.values()),
            item.jurisdiction,
            item.state,
            item.municipality
          )
      )
    } catch (error) {
      console.error(
        'Error fetching requirement identifications by name:',
        error.message
      )
      throw new HttpException(
        500,
        'Error fetching requirement identifications by name'
      )
    }
  }

  /**
   * Retrieves requirement identifications whose description matches the given term(s) using full-text search.
   *
   * @param {string} description - A partial or full-text search term.
   * @returns {Promise<ReqIdentification[]|null>} - An array of matching requirement identifications, or null if none found.
   * @throws {HttpException} - If an error occurs during the query.
   */
  static async findByDescription (description) {
    const query = `
        SELECT 
          ri.id AS req_identification_id,
          ri.name,
          ri.description,
          ri.user_id,
          ri.created_at,
          ri.status,
  
          u.id AS user_id,
          u.name AS user_name,
          u.gmail AS user_gmail,
          u.role_id AS user_role_id,
          u.profile_picture AS user_profile_picture,
  
          s.id AS subject_id,
          s.subject_name,
  
          a.id AS aspect_id,
          a.aspect_name,
  
          lb.jurisdiction,
          lb.state,
          lb.municipality
  
        FROM req_identifications ri
        LEFT JOIN users u ON ri.user_id = u.id
        LEFT JOIN req_identifications_requirements rir ON ri.id = rir.req_identification_id
        LEFT JOIN req_identifications_requirement_legal_basis rirlb 
          ON rir.req_identification_id = rirlb.req_identification_id 
          AND rir.requirement_id = rirlb.requirement_id
        LEFT JOIN legal_basis lb ON rirlb.legal_basis_id = lb.id
        LEFT JOIN subjects s ON lb.subject_id = s.id
        LEFT JOIN legal_basis_subject_aspect lbsa ON lb.id = lbsa.legal_basis_id
        LEFT JOIN aspects a ON lbsa.aspect_id = a.id
        WHERE MATCH(ri.description) AGAINST(? IN BOOLEAN MODE)
        ORDER BY ri.created_at DESC, ri.id DESC
      `

    try {
      const [rows] = await pool.query(query, [description])
      if (rows.length === 0) return null

      const reqIdentificationMap = new Map()

      for (const row of rows) {
        if (!reqIdentificationMap.has(row.req_identification_id)) {
          const user = row.user_id
            ? new User(
              row.user_id,
              row.user_name,
              null,
              row.user_gmail,
              row.user_role_id,
              row.user_profile_picture
            )
            : null

          reqIdentificationMap.set(row.req_identification_id, {
            id: row.req_identification_id,
            name: row.name,
            description: row.description,
            createdAt: row.created_at,
            status: row.status,
            user,
            subject: row.subject_id
              ? {
                  subject_id: row.subject_id,
                  subject_name: row.subject_name
                }
              : null,
            aspects: new Map(),
            jurisdiction: row.jurisdiction,
            state: row.state,
            municipality: row.municipality
          })
        }

        const reqIdentification = reqIdentificationMap.get(
          row.req_identification_id
        )

        if (row.aspect_id && !reqIdentification.aspects.has(row.aspect_id)) {
          reqIdentification.aspects.set(row.aspect_id, {
            aspect_id: row.aspect_id,
            aspect_name: row.aspect_name
          })
        }
      }

      return Array.from(reqIdentificationMap.values()).map(
        (item) =>
          new ReqIdentification(
            item.id,
            item.name,
            item.description,
            item.user,
            item.createdAt,
            item.status,
            item.subject,
            Array.from(item.aspects.values()),
            item.jurisdiction,
            item.state,
            item.municipality
          )
      )
    } catch (error) {
      console.error(
        'Error fetching requirement identifications by description:',
        error.message
      )
      throw new HttpException(
        500,
        'Error fetching requirement identifications by description'
      )
    }
  }

  /**
   * Retrieves requirement identifications filtered by the associated user’s ID.
   *
   * @param {number} userId - The user ID to filter by.
   * @returns {Promise<ReqIdentification[]|null>} - An array of matching requirement identifications, or null if none found.
   * @throws {HttpException} - If an error occurs during the query.
   */
  static async findByUserId (userId) {
    const query = `
    SELECT 
      ri.id AS req_identification_id,
      ri.name,
      ri.description,
      ri.user_id,
      ri.created_at,
      ri.status,

      u.id AS user_id,
      u.name AS user_name,
      u.gmail AS user_gmail,
      u.role_id AS user_role_id,
      u.profile_picture AS user_profile_picture,

      s.id AS subject_id,
      s.subject_name,

      a.id AS aspect_id,
      a.aspect_name,

      lb.jurisdiction,
      lb.state,
      lb.municipality

    FROM req_identifications ri
    LEFT JOIN users u ON ri.user_id = u.id
    LEFT JOIN req_identifications_requirements rir ON ri.id = rir.req_identification_id
    LEFT JOIN req_identifications_requirement_legal_basis rirlb 
      ON rir.req_identification_id = rirlb.req_identification_id 
      AND rir.requirement_id = rirlb.requirement_id
    LEFT JOIN legal_basis lb ON rirlb.legal_basis_id = lb.id
    LEFT JOIN subjects s ON lb.subject_id = s.id
    LEFT JOIN legal_basis_subject_aspect lbsa ON lb.id = lbsa.legal_basis_id
    LEFT JOIN aspects a ON lbsa.aspect_id = a.id
    WHERE u.id = ?
    ORDER BY ri.created_at DESC, ri.id DESC
  `

    try {
      const [rows] = await pool.query(query, [userId])
      if (rows.length === 0) return null

      const reqIdentificationMap = new Map()

      for (const row of rows) {
        if (!reqIdentificationMap.has(row.req_identification_id)) {
          const user = row.user_id
            ? new User(
              row.user_id,
              row.user_name,
              null,
              row.user_gmail,
              row.user_role_id,
              row.user_profile_picture
            )
            : null

          reqIdentificationMap.set(row.req_identification_id, {
            id: row.req_identification_id,
            name: row.name,
            description: row.description,
            createdAt: row.created_at,
            status: row.status,
            user,
            subject: row.subject_id
              ? {
                  subject_id: row.subject_id,
                  subject_name: row.subject_name
                }
              : null,
            aspects: new Map(),
            jurisdiction: row.jurisdiction,
            state: row.state,
            municipality: row.municipality
          })
        }

        const reqIdentification = reqIdentificationMap.get(
          row.req_identification_id
        )

        if (row.aspect_id && !reqIdentification.aspects.has(row.aspect_id)) {
          reqIdentification.aspects.set(row.aspect_id, {
            aspect_id: row.aspect_id,
            aspect_name: row.aspect_name
          })
        }
      }

      return Array.from(reqIdentificationMap.values()).map(
        (item) =>
          new ReqIdentification(
            item.id,
            item.name,
            item.description,
            item.user,
            item.createdAt,
            item.status,
            item.subject,
            Array.from(item.aspects.values()),
            item.jurisdiction,
            item.state,
            item.municipality
          )
      )
    } catch (error) {
      console.error(
        'Error fetching requirement identifications by user ID:',
        error.message
      )
      throw new HttpException(
        500,
        'Error fetching requirement identifications by user ID'
      )
    }
  }

  /**
   * Retrieves requirement identifications filtered by creation date range.
   *
   * @param {string} [from] - Start date, format: 'YYYY-MM-DD'.
   * @param {string} [to] - End date, format: 'YYYY-MM-DD'.
   * @returns {Promise<ReqIdentification[]|null>} - An array of matching requirement identifications, or null if none found.
   * @throws {HttpException}
   */
  static async findByCreatedAt (from, to) {
    let query = `
    SELECT 
      ri.id AS req_identification_id,
      ri.name,
      ri.description,
      ri.user_id,
      ri.created_at,
      ri.status,

      u.id AS user_id,
      u.name AS user_name,
      u.gmail AS user_gmail,
      u.role_id AS user_role_id,
      u.profile_picture AS user_profile_picture,

      s.id AS subject_id,
      s.subject_name,

      a.id AS aspect_id,
      a.aspect_name,

      lb.jurisdiction,
      lb.state,
      lb.municipality

    FROM req_identifications ri
    LEFT JOIN users u ON ri.user_id = u.id
    LEFT JOIN req_identifications_requirements rir ON ri.id = rir.req_identification_id
    LEFT JOIN req_identifications_requirement_legal_basis rirlb 
      ON rir.req_identification_id = rirlb.req_identification_id 
      AND rir.requirement_id = rirlb.requirement_id
    LEFT JOIN legal_basis lb ON rirlb.legal_basis_id = lb.id
    LEFT JOIN subjects s ON lb.subject_id = s.id
    LEFT JOIN legal_basis_subject_aspect lbsa ON lb.id = lbsa.legal_basis_id
    LEFT JOIN aspects a ON lbsa.aspect_id = a.id
  `

    const conditions = []
    const values = []

    if (from && to) {
      conditions.push('DATE(ri.created_at) BETWEEN ? AND ?')
      values.push(from, to)
    } else if (from) {
      conditions.push('DATE(ri.created_at) >= ?')
      values.push(from)
    } else if (to) {
      conditions.push('DATE(ri.created_at) <= ?')
      values.push(to)
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ')
    }

    query += ' ORDER BY ri.created_at DESC, ri.id DESC'

    try {
      const [rows] = await pool.query(query, values)
      if (rows.length === 0) return null

      const reqIdentificationMap = new Map()

      for (const row of rows) {
        if (!reqIdentificationMap.has(row.req_identification_id)) {
          const user = row.user_id
            ? new User(
              row.user_id,
              row.user_name,
              null,
              row.user_gmail,
              row.user_role_id,
              row.user_profile_picture
            )
            : null

          reqIdentificationMap.set(row.req_identification_id, {
            id: row.req_identification_id,
            name: row.name,
            description: row.description,
            createdAt: row.created_at,
            status: row.status,
            user,
            subject: row.subject_id
              ? {
                  subject_id: row.subject_id,
                  subject_name: row.subject_name
                }
              : null,
            aspects: new Map(),
            jurisdiction: row.jurisdiction,
            state: row.state,
            municipality: row.municipality
          })
        }

        const reqIdentification = reqIdentificationMap.get(
          row.req_identification_id
        )

        if (row.aspect_id && !reqIdentification.aspects.has(row.aspect_id)) {
          reqIdentification.aspects.set(row.aspect_id, {
            aspect_id: row.aspect_id,
            aspect_name: row.aspect_name
          })
        }
      }

      return Array.from(reqIdentificationMap.values()).map(
        (item) =>
          new ReqIdentification(
            item.id,
            item.name,
            item.description,
            item.user,
            item.createdAt,
            item.status,
            item.subject,
            Array.from(item.aspects.values()),
            item.jurisdiction,
            item.state,
            item.municipality
          )
      )
    } catch (error) {
      console.error(
        'Error fetching requirement identifications by creation date range:',
        error.message
      )
      throw new HttpException(
        500,
        'Error fetching requirement identifications by creation date range'
      )
    }
  }

  /**
   * Retrieves requirement identifications filtered by status.
   *
   * @param {string} status - The status to filter by ('Activo' | 'Fallido' | 'Completado').
   * @returns {Promise<ReqIdentification[]|null>} - An array of matching requirement identifications, or null if none found.
   * @throws {HttpException} - If an error occurs during the query.
   */
  static async findByStatus (status) {
    const query = `
        SELECT 
          ri.id AS req_identification_id,
          ri.name,
          ri.description,
          ri.user_id,
          ri.created_at,
          ri.status,
  
          u.id AS user_id,
          u.name AS user_name,
          u.gmail AS user_gmail,
          u.role_id AS user_role_id,
          u.profile_picture AS user_profile_picture,
  
          s.id AS subject_id,
          s.subject_name,
  
          a.id AS aspect_id,
          a.aspect_name,
  
          lb.jurisdiction,
          lb.state,
          lb.municipality
  
        FROM req_identifications ri
        LEFT JOIN users u ON ri.user_id = u.id
        LEFT JOIN req_identifications_requirements rir ON ri.id = rir.req_identification_id
        LEFT JOIN req_identifications_requirement_legal_basis rirlb 
          ON rir.req_identification_id = rirlb.req_identification_id 
          AND rir.requirement_id = rirlb.requirement_id
        LEFT JOIN legal_basis lb ON rirlb.legal_basis_id = lb.id
        LEFT JOIN subjects s ON lb.subject_id = s.id
        LEFT JOIN legal_basis_subject_aspect lbsa ON lb.id = lbsa.legal_basis_id
        LEFT JOIN aspects a ON lbsa.aspect_id = a.id
        WHERE ri.status = ?
        ORDER BY ri.created_at DESC, ri.id DESC
      `

    try {
      const [rows] = await pool.query(query, [status])
      if (rows.length === 0) return null

      const reqIdentificationMap = new Map()

      for (const row of rows) {
        if (!reqIdentificationMap.has(row.req_identification_id)) {
          const user = row.user_id
            ? new User(
              row.user_id,
              row.user_name,
              null,
              row.user_gmail,
              row.user_role_id,
              row.user_profile_picture
            )
            : null

          reqIdentificationMap.set(row.req_identification_id, {
            id: row.req_identification_id,
            name: row.name,
            description: row.description,
            createdAt: row.created_at,
            status: row.status,
            user,
            subject: row.subject_id
              ? {
                  subject_id: row.subject_id,
                  subject_name: row.subject_name
                }
              : null,
            aspects: new Map(),
            jurisdiction: row.jurisdiction,
            state: row.state,
            municipality: row.municipality
          })
        }

        const reqIdentification = reqIdentificationMap.get(
          row.req_identification_id
        )

        if (row.aspect_id && !reqIdentification.aspects.has(row.aspect_id)) {
          reqIdentification.aspects.set(row.aspect_id, {
            aspect_id: row.aspect_id,
            aspect_name: row.aspect_name
          })
        }
      }

      return Array.from(reqIdentificationMap.values()).map(
        (item) =>
          new ReqIdentification(
            item.id,
            item.name,
            item.description,
            item.user,
            item.createdAt,
            item.status,
            item.subject,
            Array.from(item.aspects.values()),
            item.jurisdiction,
            item.state,
            item.municipality
          )
      )
    } catch (error) {
      console.error(
        'Error fetching requirement identifications by status:',
        error.message
      )
      throw new HttpException(
        500,
        'Error fetching requirement identifications by status'
      )
    }
  }

  /**
   * Retrieves requirement identifications filtered by subject ID.
   *
   * @param {number} subjectId - The subject ID to filter by.
   * @returns {Promise<ReqIdentification[]|null>} - An array of matching requirement identifications, or null if none found.
   * @throws {HttpException} - If an error occurs during the query.
   */
  static async findBySubjectId (subjectId) {
    const query = `
      SELECT 
        ri.id AS req_identification_id,
        ri.name,
        ri.description,
        ri.user_id,
        ri.created_at,
        ri.status,

        u.id AS user_id,
        u.name AS user_name,
        u.gmail AS user_gmail,
        u.role_id AS user_role_id,
        u.profile_picture AS user_profile_picture,

        s.id AS subject_id,
        s.subject_name,

        a.id AS aspect_id,
        a.aspect_name,

        lb.jurisdiction,
        lb.state,
        lb.municipality

      FROM req_identifications ri
      LEFT JOIN users u ON ri.user_id = u.id
      LEFT JOIN req_identifications_requirements rir 
        ON ri.id = rir.req_identification_id
      LEFT JOIN req_identifications_requirement_legal_basis rirlb 
        ON rir.req_identification_id = rirlb.req_identification_id 
        AND rir.requirement_id = rirlb.requirement_id
      LEFT JOIN legal_basis lb ON rirlb.legal_basis_id = lb.id
      LEFT JOIN subjects s ON lb.subject_id = s.id
      LEFT JOIN legal_basis_subject_aspect lbsa ON lb.id = lbsa.legal_basis_id
      LEFT JOIN aspects a ON lbsa.aspect_id = a.id
      WHERE s.id = ?
      ORDER BY ri.created_at DESC, ri.id DESC
    `

    try {
      const [rows] = await pool.query(query, [subjectId])
      if (rows.length === 0) return null

      const reqIdentificationMap = new Map()

      for (const row of rows) {
        if (!reqIdentificationMap.has(row.req_identification_id)) {
          const user = row.user_id
            ? new User(
              row.user_id,
              row.user_name,
              null,
              row.user_gmail,
              row.user_role_id,
              row.user_profile_picture
            )
            : null

          reqIdentificationMap.set(row.req_identification_id, {
            id: row.req_identification_id,
            name: row.name,
            description: row.description,
            createdAt: row.created_at,
            status: row.status,
            user,
            subject: {
              subject_id: row.subject_id,
              subject_name: row.subject_name
            },
            aspects: new Map(),
            jurisdiction: row.jurisdiction,
            state: row.state,
            municipality: row.municipality
          })
        }

        const reqIdentification = reqIdentificationMap.get(
          row.req_identification_id
        )

        if (row.aspect_id && !reqIdentification.aspects.has(row.aspect_id)) {
          reqIdentification.aspects.set(row.aspect_id, {
            aspect_id: row.aspect_id,
            aspect_name: row.aspect_name
          })
        }
      }

      return Array.from(reqIdentificationMap.values()).map(
        (item) =>
          new ReqIdentification(
            item.id,
            item.name,
            item.description,
            item.user,
            item.createdAt,
            item.status,
            item.subject,
            Array.from(item.aspects.values()),
            item.jurisdiction,
            item.state,
            item.municipality
          )
      )
    } catch (error) {
      console.error(
        'Error fetching requirement identifications by subject ID:',
        error.message
      )
      throw new HttpException(
        500,
        'Error fetching requirement identifications by subject ID'
      )
    }
  }

  /**
   * Retrieves requirement identifications filtered by subject and aspect IDs.
   *
   * @param {number} subjectId   - The subject ID to filter by.
   * @param {number[]} [aspectIds] - Array of aspect IDs to filter by.
   * @returns {Promise<ReqIdentification[]|null>} - An array of matching requirement identifications, or null if none found.
   * @throws {HttpException} - If an error occurs during the query.
   */
  static async findBySubjectAndAspects (subjectId, aspectIds = []) {
    try {
      const values = [subjectId]
      let reqIds = []

      if (aspectIds.length > 0) {
        const placeholders = aspectIds.map(() => '?').join(', ')
        const filterQuery = `
        SELECT DISTINCT ri.id AS req_identification_id
        FROM req_identifications ri
        JOIN req_identifications_requirements rir
          ON ri.id = rir.req_identification_id
        JOIN req_identifications_requirement_legal_basis rirlb
          ON rir.req_identification_id = rirlb.req_identification_id
          AND rir.requirement_id = rirlb.requirement_id
        JOIN legal_basis lb
          ON rirlb.legal_basis_id = lb.id
        JOIN legal_basis_subject_aspect lbsa
          ON lb.id = lbsa.legal_basis_id
        WHERE lb.subject_id = ?
          AND lbsa.aspect_id IN (${placeholders})
      `
        const [filterRows] = await pool.query(filterQuery, [
          subjectId,
          ...aspectIds
        ])
        if (filterRows.length === 0) return null
        reqIds = filterRows.map((row) => row.req_identification_id)
      }

      let query = `
      SELECT 
        ri.id AS req_identification_id,
        ri.name,
        ri.description,
        ri.user_id,
        ri.created_at,
        ri.status,

        u.id AS user_id,
        u.name AS user_name,
        u.gmail AS user_gmail,
        u.role_id AS user_role_id,
        u.profile_picture AS user_profile_picture,

        s.id AS subject_id,
        s.subject_name,

        a.id AS aspect_id,
        a.aspect_name,

        lb.jurisdiction,
        lb.state,
        lb.municipality
      FROM req_identifications ri
      LEFT JOIN users u ON ri.user_id = u.id
      LEFT JOIN req_identifications_requirements rir ON ri.id = rir.req_identification_id
      LEFT JOIN req_identifications_requirement_legal_basis rirlb
        ON rir.req_identification_id = rirlb.req_identification_id
        AND rir.requirement_id = rirlb.requirement_id
      LEFT JOIN legal_basis lb ON rirlb.legal_basis_id = lb.id
      LEFT JOIN subjects s ON lb.subject_id = s.id
      LEFT JOIN legal_basis_subject_aspect lbsa ON lb.id = lbsa.legal_basis_id
      LEFT JOIN aspects a ON lbsa.aspect_id = a.id
      WHERE lb.subject_id = ?
    `

      if (reqIds.length > 0) {
        const idPlaceholders = reqIds.map(() => '?').join(', ')
        query += ` AND ri.id IN (${idPlaceholders})`
        values.push(...reqIds)
      }

      query += ' ORDER BY ri.created_at DESC, ri.id DESC'

      const [rows] = await pool.query(query, values)
      if (rows.length === 0) return null

      const reqIdentificationMap = new Map()

      for (const row of rows) {
        if (!reqIdentificationMap.has(row.req_identification_id)) {
          const user = row.user_id
            ? new User(
              row.user_id,
              row.user_name,
              null,
              row.user_gmail,
              row.user_role_id,
              row.user_profile_picture
            )
            : null

          reqIdentificationMap.set(row.req_identification_id, {
            id: row.req_identification_id,
            name: row.name,
            description: row.description,
            createdAt: row.created_at,
            status: row.status,
            user,
            subject: {
              subject_id: row.subject_id,
              subject_name: row.subject_name
            },
            aspects: new Map(),
            jurisdiction: row.jurisdiction,
            state: row.state,
            municipality: row.municipality
          })
        }

        const reqIdentification = reqIdentificationMap.get(
          row.req_identification_id
        )
        if (row.aspect_id && !reqIdentification.aspects.has(row.aspect_id)) {
          reqIdentification.aspects.set(row.aspect_id, {
            aspect_id: row.aspect_id,
            aspect_name: row.aspect_name
          })
        }
      }

      return Array.from(reqIdentificationMap.values()).map(
        (item) =>
          new ReqIdentification(
            item.id,
            item.name,
            item.description,
            item.user,
            item.createdAt,
            item.status,
            item.subject,
            Array.from(item.aspects.values()),
            item.jurisdiction,
            item.state,
            item.municipality
          )
      )
    } catch (error) {
      console.error(
        'Error retrieving requirement identifications by subject and aspects:',
        error.message
      )
      throw new HttpException(
        500,
        'Error retrieving requirement identifications by subject and aspects'
      )
    }
  }

  /**
   * Retrieves requirement identifications filtered by jurisdiction.
   *
   * @param {string} jurisdiction - The jurisdiction to filter by.
   * @returns {Promise<ReqIdentification[]|null>} - An array of matching requirement identifications, or null if none found.
   * @throws {HttpException} - If an error occurs during the query.
   */
  static async findByJurisdiction (jurisdiction) {
    const query = `
      SELECT 
        ri.id AS req_identification_id,
        ri.name,
        ri.description,
        ri.user_id,
        ri.created_at,
        ri.status,

        u.id AS user_id,
        u.name AS user_name,
        u.gmail AS user_gmail,
        u.role_id AS user_role_id,
        u.profile_picture AS user_profile_picture,

        s.id AS subject_id,
        s.subject_name,

        a.id AS aspect_id,
        a.aspect_name,

        lb.jurisdiction,
        lb.state,
        lb.municipality

      FROM req_identifications ri
      LEFT JOIN users u ON ri.user_id = u.id
      LEFT JOIN req_identifications_requirements rir ON ri.id = rir.req_identification_id
      LEFT JOIN req_identifications_requirement_legal_basis rirlb 
        ON rir.req_identification_id = rirlb.req_identification_id 
        AND rir.requirement_id = rirlb.requirement_id
      LEFT JOIN legal_basis lb ON rirlb.legal_basis_id = lb.id
      LEFT JOIN subjects s ON lb.subject_id = s.id
      LEFT JOIN legal_basis_subject_aspect lbsa ON lb.id = lbsa.legal_basis_id
      LEFT JOIN aspects a ON lbsa.aspect_id = a.id
      WHERE lb.jurisdiction = ?
      ORDER BY ri.created_at DESC, ri.id DESC
    `

    try {
      const [rows] = await pool.query(query, [jurisdiction])
      if (rows.length === 0) return null

      const reqIdentificationMap = new Map()

      for (const row of rows) {
        if (!reqIdentificationMap.has(row.req_identification_id)) {
          const user = row.user_id
            ? new User(
              row.user_id,
              row.user_name,
              null,
              row.user_gmail,
              row.user_role_id,
              row.user_profile_picture
            )
            : null

          reqIdentificationMap.set(row.req_identification_id, {
            id: row.req_identification_id,
            name: row.name,
            description: row.description,
            createdAt: row.created_at,
            status: row.status,
            user,
            subject: row.subject_id
              ? {
                  subject_id: row.subject_id,
                  subject_name: row.subject_name
                }
              : null,
            aspects: new Map(),
            jurisdiction: row.jurisdiction,
            state: row.state,
            municipality: row.municipality
          })
        }

        const reqIdentification = reqIdentificationMap.get(
          row.req_identification_id
        )

        if (row.aspect_id && !reqIdentification.aspects.has(row.aspect_id)) {
          reqIdentification.aspects.set(row.aspect_id, {
            aspect_id: row.aspect_id,
            aspect_name: row.aspect_name
          })
        }
      }

      return Array.from(reqIdentificationMap.values()).map(
        (item) =>
          new ReqIdentification(
            item.id,
            item.name,
            item.description,
            item.user,
            item.createdAt,
            item.status,
            item.subject,
            Array.from(item.aspects.values()),
            item.jurisdiction,
            item.state,
            item.municipality
          )
      )
    } catch (error) {
      console.error(
        'Error fetching requirement identifications by jurisdiction:',
        error.message
      )
      throw new HttpException(
        500,
        'Error fetching requirement identifications by jurisdiction'
      )
    }
  }

  /**
   * Retrieves requirement identifications filtered by state.
   *
   * @param {string} state - The state name to filter by.
   * @returns {Promise<ReqIdentification[]|null>} - An array of matching requirement identifications, or null if none found.
   * @throws {HttpException} - If an error occurs during the query.
   */
  static async findByState (state) {
    const query = `
      SELECT 
        ri.id AS req_identification_id,
        ri.name,
        ri.description,
        ri.user_id,
        ri.created_at,
        ri.status,

        u.id AS user_id,
        u.name AS user_name,
        u.gmail AS user_gmail,
        u.role_id AS user_role_id,
        u.profile_picture AS user_profile_picture,

        s.id AS subject_id,
        s.subject_name,

        a.id AS aspect_id,
        a.aspect_name,

        lb.jurisdiction,
        lb.state,
        lb.municipality

      FROM req_identifications ri
      LEFT JOIN users u ON ri.user_id = u.id
      LEFT JOIN req_identifications_requirements rir ON ri.id = rir.req_identification_id
      LEFT JOIN req_identifications_requirement_legal_basis rirlb 
        ON rir.req_identification_id = rirlb.req_identification_id 
        AND rir.requirement_id = rirlb.requirement_id
      LEFT JOIN legal_basis lb ON rirlb.legal_basis_id = lb.id
      LEFT JOIN subjects s ON lb.subject_id = s.id
      LEFT JOIN legal_basis_subject_aspect lbsa ON lb.id = lbsa.legal_basis_id
      LEFT JOIN aspects a ON lbsa.aspect_id = a.id
      WHERE lb.state = ?
      ORDER BY ri.created_at DESC, ri.id DESC
    `

    try {
      const [rows] = await pool.query(query, [state])
      if (rows.length === 0) return null

      const reqIdentificationMap = new Map()

      for (const row of rows) {
        if (!reqIdentificationMap.has(row.req_identification_id)) {
          const user = row.user_id
            ? new User(
              row.user_id,
              row.user_name,
              null,
              row.user_gmail,
              row.user_role_id,
              row.user_profile_picture
            )
            : null

          reqIdentificationMap.set(row.req_identification_id, {
            id: row.req_identification_id,
            name: row.name,
            description: row.description,
            createdAt: row.created_at,
            status: row.status,
            user,
            subject: row.subject_id
              ? {
                  subject_id: row.subject_id,
                  subject_name: row.subject_name
                }
              : null,
            aspects: new Map(),
            jurisdiction: row.jurisdiction,
            state: row.state,
            municipality: row.municipality
          })
        }

        const reqIdentification = reqIdentificationMap.get(
          row.req_identification_id
        )

        if (row.aspect_id && !reqIdentification.aspects.has(row.aspect_id)) {
          reqIdentification.aspects.set(row.aspect_id, {
            aspect_id: row.aspect_id,
            aspect_name: row.aspect_name
          })
        }
      }

      return Array.from(reqIdentificationMap.values()).map(
        (item) =>
          new ReqIdentification(
            item.id,
            item.name,
            item.description,
            item.user,
            item.createdAt,
            item.status,
            item.subject,
            Array.from(item.aspects.values()),
            item.jurisdiction,
            item.state,
            item.municipality
          )
      )
    } catch (error) {
      console.error(
        'Error fetching requirement identifications by state:',
        error.message
      )
      throw new HttpException(
        500,
        'Error fetching requirement identifications by state'
      )
    }
  }

  /**
   * Retrieves requirement identifications filtered by state and municipalities.
   *
   * @param {string} state - The state to filter by.
   * @param {string[]} [municipalities] - An array of municipality filter by.
   * @returns {Promise<ReqIdentification[]|null>} - A list of matching requirement identifications, or null if none found.
   * @throws {HttpException} - If an error occurs during the query.
   */
  static async findByStateAndMunicipalities (state, municipalities = []) {
    let query = `
        SELECT 
          ri.id AS req_identification_id,
          ri.name,
          ri.description,
          ri.user_id,
          ri.created_at,
          ri.status,
  
          u.id AS user_id,
          u.name AS user_name,
          u.gmail AS user_gmail,
          u.role_id AS user_role_id,
          u.profile_picture AS user_profile_picture,
  
          s.id AS subject_id,
          s.subject_name,
  
          a.id AS aspect_id,
          a.aspect_name,
  
          lb.jurisdiction,
          lb.state,
          lb.municipality
        FROM req_identifications ri
        LEFT JOIN users u 
          ON ri.user_id = u.id
        LEFT JOIN req_identifications_requirements rir 
          ON ri.id = rir.req_identification_id
        LEFT JOIN req_identifications_requirement_legal_basis rirlb 
          ON rir.req_identification_id = rirlb.req_identification_id
          AND rir.requirement_id = rirlb.requirement_id
        LEFT JOIN legal_basis lb 
          ON rirlb.legal_basis_id = lb.id
        LEFT JOIN subjects s 
          ON lb.subject_id = s.id
        LEFT JOIN legal_basis_subject_aspect lbsa 
          ON lb.id = lbsa.legal_basis_id
        LEFT JOIN aspects a 
          ON lbsa.aspect_id = a.id
        WHERE lb.state = ?
      `
    const values = [state]

    if (municipalities.length > 0) {
      const placeholders = municipalities.map(() => '?').join(', ')
      query += ` AND lb.municipality IN (${placeholders})`
      values.push(...municipalities)
    }

    query += ' ORDER BY ri.created_at DESC, ri.id DESC'

    try {
      const [rows] = await pool.query(query, values)
      if (rows.length === 0) return null

      const reqIdentificationMap = new Map()

      for (const row of rows) {
        if (!reqIdentificationMap.has(row.req_identification_id)) {
          const user = row.user_id
            ? new User(
              row.user_id,
              row.user_name,
              null,
              row.user_gmail,
              row.user_role_id,
              row.user_profile_picture
            )
            : null
          reqIdentificationMap.set(row.req_identification_id, {
            id: row.req_identification_id,
            name: row.name,
            description: row.description,
            createdAt: row.created_at,
            status: row.status,
            user,
            subject: row.subject_id
              ? {
                  subject_id: row.subject_id,
                  subject_name: row.subject_name
                }
              : null,
            aspects: new Map(),
            jurisdiction: row.jurisdiction,
            state: row.state,
            municipality: row.municipality
          })
        }

        const reqIdentification = reqIdentificationMap.get(
          row.req_identification_id
        )
        if (row.aspect_id && !reqIdentification.aspects.has(row.aspect_id)) {
          reqIdentification.aspects.set(row.aspect_id, {
            aspect_id: row.aspect_id,
            aspect_name: row.aspect_name
          })
        }
      }
      return Array.from(reqIdentificationMap.values()).map(
        (item) =>
          new ReqIdentification(
            item.id,
            item.name,
            item.description,
            item.user,
            item.createdAt,
            item.status,
            item.subject,
            Array.from(item.aspects.values()),
            item.jurisdiction,
            item.state,
            item.municipality
          )
      )
    } catch (error) {
      console.error(
        'Error retrieving requirement identifications by state and municipalities:',
        error.message
      )
      throw new HttpException(
        500,
        'Error retrieving requirement identifications by state and municipalities'
      )
    }
  }

  /**
   * Updates a requirement identification record in the database.
   *
   * @param {number} id - The ID of the requirement identification to update.
   * @param {Object} reqIdentification - The requirement identification data.
   * @param {string|null} [reqIdentification.reqIdentificationName] - The new name of the requirement identification, (or null to keep current).
   * @param {string|null} [reqIdentification.reqIdentificationDescription] - The new description of the requirement identification, (or null to keep current).
   * @param {number|null} [reqIdentification.newUserId] -  the new user ID of the requirement identification, (or null to keep current).
   * @returns {Promise<ReqIdentification|null>} - The updated ReqIdentification, or null if not found.
   * @throws {HttpException} - If an error occurs during update.
   */
  static async update (id, reqIdentification) {
    try {
      const updateQuery = `
        UPDATE req_identifications
        SET
          name        = IFNULL(?, name),
          description = IFNULL(?, description),
          user_id     = IFNULL(?, user_id)
        WHERE id = ?
      `
      const values = [
        reqIdentification.reqIdentificationName,
        reqIdentification.reqIdentificationDescription,
        reqIdentification.newUserId,
        id
      ]
      const [result] = await pool.query(updateQuery, values)
      if (result.affectedRows === 0) return null
      const updatedReqIdentification = await this.findById(id)
      return updatedReqIdentification
    } catch (error) {
      console.error(
        'Error updating requirement identification:',
        error.message
      )
      throw new HttpException(500, 'Error updating requirement identification')
    }
  }

  /**
   * Deletes a requirement identification by its ID.
   * @param {number} id - The ID of the requirement identification to delete.
   * @returns {Promise<boolean>} - Returns true if the deletion is successful, false otherwise.
   */
  static async deleteById (id) {
    try {
      const [result] = await pool.query(
        'DELETE FROM req_identifications WHERE id = ?',
        [id]
      )
      return result.affectedRows > 0
    } catch (error) {
      console.error(
        'Error deleting requirement identification:',
        error.message
      )
      throw new HttpException(
        500,
        'Error deleting requirement identification from the database'
      )
    }
  }

  /**
   * Deletes multiple requirement identifications from the database using an array of IDs.
   * @param {number[]} reqIdentificationIds - Array of requirement identification IDs to delete.
   * @returns {Promise<boolean>} - True if deletion was successful, otherwise false.
   */
  static async deleteBatch (reqIdentificationIds) {
    const query = `
        DELETE FROM req_identifications
        WHERE id IN (?)
      `
    try {
      const [result] = await pool.query(query, [reqIdentificationIds])
      return result.affectedRows > 0
    } catch (error) {
      console.error(
        'Error deleting requirement identifications batch:',
        error.message
      )
      throw new HttpException(
        500,
        'Error deleting requirement identifications from the database'
      )
    }
  }

  /**
   * Deletes all requirement identifications from the database.
   * @returns {Promise<void>}
   * @throws {HttpException} - If an error occurs during deletion.
   */
  static async deleteAll () {
    try {
      await pool.query('DELETE FROM req_identifications')
    } catch (error) {
      console.error(
        'Error deleting all requirement identifications:',
        error.message
      )
      throw new HttpException(
        500,
        'Error deleting all requirement identifications from the database'
      )
    }
  }

  /**
   * Checks if a requirement is already linked to a requirement identification.
   *
   * @param {number} reqIdentificationId
   * @param {number} requirementId
   * @returns {Promise<boolean>}
   * @throws {HttpException}
   */
  static async existsRequirementLink (reqIdentificationId, requirementId) {
    const query = `
    SELECT 1 FROM req_identifications_requirements
    WHERE req_identification_id = ? AND requirement_id = ?
    LIMIT 1
  `
    try {
      const [rows] = await pool.query(query, [
        reqIdentificationId,
        requirementId
      ])
      return rows.length > 0
    } catch (error) {
      console.error('Error checking requirement link:', error.message)
      throw new HttpException(500, 'Error checking requirement link')
    }
  }

  /**
   * Links a requirement to a requirement identification.
   *
   * @param {number} reqIdentificationId - The ID of the requirement identification.
   * @param {number} requirementId - The ID of the requirement to be linked.
   * @param {string} requirementName - The name of the requirement.
   * @returns {Promise<void>} - Resolves when the operation completes successfully.
   * @throws {HttpException} - If a database error occurs.
   */
  static async linkRequirement (
    reqIdentificationId,
    requirementId,
    requirementName
  ) {
    const query = `
    INSERT INTO req_identifications_requirements
    (req_identification_id, requirement_id, requirement_name)
    VALUES (?, ?, ?)
  `
    const values = [reqIdentificationId, requirementId, requirementName]

    try {
      await pool.query(query, values)
    } catch (error) {
      console.error('Error linking requirement:', error.message)
      throw new HttpException(500, 'Error linking requirement')
    }
  }

  /**
   * Checks if a legal basis is already linked to a requirement in a requirement identification.
   *
   * @param {number} reqIdentificationId
   * @param {number} requirementId
   * @param {number} legalBasisId
   * @returns {Promise<boolean>}
   * @throws {HttpException}
   */
  static async existsLegalBaseRequirementLink (
    reqIdentificationId,
    requirementId,
    legalBasisId
  ) {
    const query = `
    SELECT 1 FROM req_identifications_requirement_legal_basis
    WHERE req_identification_id = ? AND requirement_id = ? AND legal_basis_id = ?
    LIMIT 1
  `
    try {
      const [rows] = await pool.query(query, [
        reqIdentificationId,
        requirementId,
        legalBasisId
      ])
      return rows.length > 0
    } catch (error) {
      console.error('Error checking legal basis link:', error.message)
      throw new HttpException(500, 'Error checking legal basis link')
    }
  }

  /**
   * Links a legal basis to a requirement within a requirement identification.
   *
   * @param {number} reqIdentificationId - The ID of the requirement identification.
   * @param {number} requirementId - The ID of the requirement to be linked.
   * @param {number} legalBasisId - The ID of the legal basis to be linked.
   * @returns {Promise<void>} - Resolves when the operation completes successfully.
   * @throws {HttpException} - If a database error occurs.
   */
  static async linkLegalBaseToRequirement (
    reqIdentificationId,
    requirementId,
    legalBasisId
  ) {
    const query = `
    INSERT INTO req_identifications_requirement_legal_basis
    (req_identification_id, requirement_id, legal_basis_id)
    VALUES (?, ?, ?)
  `
    const values = [reqIdentificationId, requirementId, legalBasisId]

    try {
      await pool.query(query, values)
    } catch (error) {
      console.error(
        'Error linking legal basis to requirement identification:',
        error.message
      )
      throw new HttpException(
        500,
        'Error linking legal basis to requirement identification'
      )
    }
  }

  /**
   * Checks if an article is already linked to a legal basis and requirement in a requirement identification.
   *
   * @param {number} reqIdentificationId
   * @param {number} requirementId
   * @param {number} legalBasisId
   * @param {number} articleId
   * @returns {Promise<boolean>}
   * @throws {HttpException}
   */
  static async existsArticleLegalBaseRequirementLink (
    reqIdentificationId,
    requirementId,
    legalBasisId,
    articleId
  ) {
    const query = `
    SELECT 1 FROM req_identifications_requirement_legal_basis_articles
    WHERE req_identification_id = ? AND requirement_id = ? AND legal_basis_id = ? AND article_id = ?
    LIMIT 1
  `
    try {
      const [rows] = await pool.query(query, [
        reqIdentificationId,
        requirementId,
        legalBasisId,
        articleId
      ])
      return rows.length > 0
    } catch (error) {
      console.error('Error checking article link:', error.message)
      throw new HttpException(500, 'Error checking article link')
    }
  }

  /**
   * Links an article to a legal basis and requirement within a requirement identification.
   *
   * @param {number} reqIdentificationId - The ID of the requirement identification.
   * @param {number} requirementId - The ID of the requirement.
   * @param {number} legalBasisId - The ID of the legal basis.
   * @param {number} articleId - The ID of the article to link.
   * @param {'Obligatorio' | 'Complementario' | 'General'} [articleType='General'] - Optional article type. Defaults to 'General'.
   * @param {number} score - Confidence score assigned to the article.
   * @returns {Promise<void>} - Resolves when the article is successfully linked.
   * @throws {HttpException} - If a database error occurs.
   */
  static async linkArticleToLegalBaseToRequirement (
    reqIdentificationId,
    requirementId,
    legalBasisId,
    articleId,
    articleType = 'General',
    score
  ) {
    const query = `
    INSERT INTO req_identifications_requirement_legal_basis_articles
      (req_identification_id, requirement_id, legal_basis_id, article_id, article_type, score)
    VALUES (?, ?, ?, ?, ?, ?)
  `

    const values = [
      reqIdentificationId,
      requirementId,
      legalBasisId,
      articleId,
      articleType,
      score
    ]

    try {
      await pool.query(query, values)
    } catch (error) {
      console.error(
        'Error linking article to legal basis and requirement:',
        error.message
      )
      throw new HttpException(
        500,
        'Error linking article to legal basis and requirement'
      )
    }
  }
}
export default ReqIdentificationRepository
