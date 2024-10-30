import SubjectsRepository from '../../repositories/Subject.repository.js'
import ErrorUtils from '../utils/Error.js'

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
      const subjectExists = await SubjectsRepository.getSubjectByName(subjectName)
      if (subjectExists) {
        throw new ErrorUtils(400, 'Subject already exists')
      }

      const subject = await SubjectsRepository.createSubject(subjectName)
      return subject
    } catch (error) {
      throw new ErrorUtils(500, 'Failed to create subject')
    }
  }

  /**
   * Fetches all subjects.
   * @returns {Promise<Array>} - List of all subjects.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async getAll () {
    try {
      const subjects = await SubjectsRepository.getAllSubjects()
      return subjects
    } catch (error) {
      throw new ErrorUtils(500, 'Failed to fetch subjects')
    }
  }

  /**
   * Fetches a subject by ID.
   * @param {number} id - The ID of the subject to retrieve.
   * @returns {Promise<Object|null>} - The subject data or null if not found.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async getById (id) {
    try {
      const subject = await SubjectsRepository.getSubjectById(id)
      return subject
    } catch (error) {
      throw new ErrorUtils(500, 'Failed to fetch subject')
    }
  }

  /**
   * Updates a subject by ID.
   * @param {number} id - The ID of the subject to update.
   * @param {string|null} subjectName - The new name of the subject or null to keep current name.
   * @returns {Promise<boolean>} - Returns true if update is successful.
   * @throws {ErrorUtils} - If an error occurs during update.
   */
  static async updateById (id, subjectName) {
    try {
      return await SubjectsRepository.updateSubjectById(id, subjectName)
    } catch (error) {
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
      return await SubjectsRepository.deleteSubjectById(id)
    } catch (error) {
      throw new ErrorUtils(500, 'Failed to delete subject')
    }
  }
}

export default SubjectsService
