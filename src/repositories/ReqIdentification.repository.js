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
    ORDER BY ri.id DESC
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
    ORDER BY ri.id DESC
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
   * Retrieves requirement identifications filtered by name.
   *
   * @param {string} name - The name (or partial name) to filter by.
   * @returns {Promise<ReqIdentification[]|null>} - An array of matching requirement identifications, or null if none found.
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
      ORDER BY ri.id DESC
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
   * @param {string} description - A partial or full-text search term to match against ri.description.
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
        ORDER BY ri.id DESC
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
   * Retrieves requirement identifications filtered by the associated user’s name.
   *
   * @param {string} userName - The (partial) user name to filter by.
   * @returns {Promise<ReqIdentification[]|null>} - An array of matching requirement identifications, or null if none found.
   * @throws {HttpException} - If an error occurs during the query.
   */
  static async findByUserName (userName) {
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
      WHERE u.name LIKE ?
      ORDER BY ri.id DESC
    `

    try {
      const filterValue = `%${userName}%`
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
        'Error fetching requirement identifications by user name:',
        error.message
      )
      throw new HttpException(
        500,
        'Error fetching requirement identifications by user name'
      )
    }
  }

  /**
   * Retrieves requirement identifications filtered by creation date.
   *
   * @param {string} date - The creation date to filter by (format: 'YYYY-MM-DD').
   * @returns {Promise<ReqIdentification[]|null>} - An array of matching requirement identifications, or null if none found.
   * @throws {HttpException} - If an error occurs during the query.
   */
  static async findByCreatedAt (date) {
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
      WHERE DATE(ri.created_at) = ?
      ORDER BY ri.id DESC
    `

    try {
      const [rows] = await pool.query(query, [date])
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
        'Error fetching requirement identifications by creation date:',
        error.message
      )
      throw new HttpException(
        500,
        'Error fetching requirement identifications by creation date'
      )
    }
  }

  /**
   * Retrieves requirement identifications filtered by status.
   *
   * @param {string} status - The status to filter by ('Active', 'Failed', or 'Completed').
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
        ORDER BY ri.id DESC
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
      ORDER BY ri.id DESC
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
   * Retrieves requirement identifications filtered by subject (materia) and optionally by one or more aspect IDs.
   * Includes associated user, subject, all matching aspects, jurisdiction, state, and municipality.
   *
   * @param {number} subjectId   - The subject ID to filter by.
   * @param {Array<number>} [aspectIds] - Optional array of aspect IDs to further filter by.
   * @returns {Promise<ReqIdentification[]|null>} - A list of matching requirement identifications.
   * @throws {HttpException} - If an error occurs during retrieval.
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
        WHERE lb.subject_id = ?
      `

      if (reqIds.length > 0) {
        const idPlaceholders = reqIds.map(() => '?').join(', ')
        query += ` AND ri.id IN (${idPlaceholders})`
        values.push(...reqIds)
      }
      query += ' ORDER BY ri.id DESC'
      const [rows] = await pool.query(query, values)
      if (rows.length === 0) return null
      const reqMap = new Map()
      for (const row of rows) {
        if (!reqMap.has(row.req_identification_id)) {
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
          reqMap.set(row.req_identification_id, {
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
        const reqEntry = reqMap.get(row.req_identification_id)
        if (row.aspect_id && !reqEntry.aspects.has(row.aspect_id)) {
          reqEntry.aspects.set(row.aspect_id, {
            aspect_id: row.aspect_id,
            aspect_name: row.aspect_name
          })
        }
      }
      return Array.from(reqMap.values()).map(
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
   * @param {string} jurisdiction - The jurisdiction to filter by ('Federal', 'Estatal', or 'Local').
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
      ORDER BY ri.id DESC
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
   * @param {string} state - The (partial) state name to filter by.
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
      WHERE lb.state LIKE ?
      ORDER BY ri.id DESC
    `

    try {
      const filterValue = `%${state}%`
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
   * Retrieves requirement identifications filtered by state and optionally by municipalities.
   *
   * @param {string} state - The state to filter by.
   * @param {Array<string>} [municipalities] - An array of municipality names to filter by (optional).
   * @returns {Promise<ReqIdentification[]|null>} - A list of matching requirement identifications, or null if none found.
   * @throws {HttpException} - If an error occurs during retrieval.
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

    query += ' ORDER BY ri.id DESC'

    try {
      const [rows] = await pool.query(query, values)
      if (rows.length === 0) return null

      const reqMap = new Map()

      for (const row of rows) {
        if (!reqMap.has(row.req_identification_id)) {
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
          reqMap.set(row.req_identification_id, {
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

        const reqEntry = reqMap.get(row.req_identification_id)
        if (row.aspect_id && !reqEntry.aspects.has(row.aspect_id)) {
          reqEntry.aspects.set(row.aspect_id, {
            aspect_id: row.aspect_id,
            aspect_name: row.aspect_name
          })
        }
      }
      return Array.from(reqMap.values()).map(
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
    } catch (err) {
      console.error('Error linking requirement:', err.message)
      throw new HttpException(500, 'Error linking requirement')
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
    } catch (err) {
      console.error(
        'Error linking legal basis to requirement identification:',
        err.message
      )
      throw new HttpException(
        500,
        'Error linking legal basis to requirement identification'
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
