import SubjectsRepository from '../../repositories/Subject.repository.js'
import ErrorUtils from '../../utils/Error.js'

/**
 * Service class for handling Subject operations.
 */
class SubjectsService {
  /**
   * Creates a new Subject entry.
   * @param {Object} params - Parameters for creating a subject.
   * @param {string} params.subjectName - The name of the subject.
   * @returns {Promise<Object>} - The created subject data.
   * @throws {ErrorUtils} - If an error occurs during creation.
   */
  static async create ({ subjectName }) {
    try {
      const subjectExists = await SubjectsRepository.findByName(subjectName)
      if (subjectExists) {
        throw new ErrorUtils(400, 'Subject already exists')
      }
      const subjectId = await SubjectsRepository.createSubject(subjectName)
      return {
        id: subjectId,
        subject_name: subjectName
      }
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to create subject')
    }
  }

  /**
   * Fetches all subjects.
   * @returns {Promise<Array<Object>>} - List of all subjects.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async getAll () {
    try {
      const subjects = await SubjectsRepository.findAll()
      if (!subjects) {
        return []
      }
      return subjects
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to fetch subjects')
    }
  }

  /**
   * Fetches a subject by ID.
   * @param {number} id - The ID of the subject to retrieve.
   * @returns {Promise<Object>} - The subject data or null if not found.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async getById (id) {
    try {
      const subject = await SubjectsRepository.findById(id)
      if (!subject) {
        return []
      }
      return subject
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to fetch subject')
    }
  }

  static async updateById (id, subjectName) {
    try {
      const currentSubject = await SubjectsRepository.findById(id)
      if (!currentSubject) {
        throw new ErrorUtils(404, 'Subject not found')
      }
      if (currentSubject.subject_name === subjectName) {
        return {
          id,
          subjectName
        }
      }

      const subjectExists = await SubjectsRepository.findByName(subjectName)
      if (subjectExists) {
        throw new ErrorUtils(400, 'Subject already exists')
      }
      const updatedSubject = await SubjectsRepository.updateById(id, subjectName)
      if (!updatedSubject) {
        throw new ErrorUtils(404, 'Subject not found')
      }
      return {
        id,
        subjectName
      }
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to update subject')
    }
  }

  /**
   * Deletes a subject by ID.
   * @param {number} id - The ID of the subject to delete.
   * @returns {Promise<boolean>} - Returns true if deletion is successful.
   * @throws {ErrorUtils} - If an error occurs during deletion.
   */
  static async deleteById (id) {
    try {
      const subjectDeleted = await SubjectsRepository.deleteById(id)
      if (!subjectDeleted) {
        throw new ErrorUtils(404, 'Subject not found')
      }

      return subjectDeleted
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to delete subject')
    }
  }
}

export default SubjectsService