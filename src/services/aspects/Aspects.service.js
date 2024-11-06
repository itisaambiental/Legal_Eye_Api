import AspectsRepository from '../../repositories/Aspects.repository.js'
import SubjectsRepository from '../../repositories/Subject.repository.js'
import ErrorUtils from '../../utils/Error.js'

/**
 * Service class for handling Aspect operations.
 */
class AspectsService {
  /**
   * Creates a new Aspect entry.
   * @param {Object} params - Parameters for creating an aspect.
   * @param {number} params.subjectId - The ID of the associated subject.
   * @param {string} params.aspectName - The name of the aspect.
   * @returns {Promise<Object>} - The created aspect data.
   * @throws {ErrorUtils} - If an error occurs during creation.
   */
  static async create ({ subjectId, aspectName }) {
    try {
      const subjectExists = await SubjectsRepository.findById(subjectId)
      if (!subjectExists) {
        throw new ErrorUtils(404, 'Subject not found')
      }
      const aspectExists = await AspectsRepository.findByNameAndSubjectId(aspectName, subjectId)
      if (aspectExists) {
        throw new ErrorUtils(400, 'Aspect already exists')
      }
      const aspectId = await AspectsRepository.createSubject(subjectId, aspectName)
      return {
        id: aspectId,
        subject_id: Number(subjectId),
        aspect_name: aspectName,
        subject_name: subjectExists.subject_name
      }
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to create aspect')
    }
  }

  /**
   * Fetches all aspects associated with a specific subject.
   * @param {number} subjectId - The ID of the subject to retrieve aspects for.
   * @returns {Promise<Array<Object>>} - List of aspects associated with the subject.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async getBySubjectId (subjectId) {
    try {
      const aspects = await AspectsRepository.findBySubjectId(subjectId)
      if (!aspects) {
        return []
      }
      return aspects
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to fetch aspects')
    }
  }

  /**
   * Fetches an aspect by ID.
   * @param {number} id - The ID of the aspect to retrieve.
   * @returns {Promise<Object>} - The aspect data or null if not found.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async getById (id) {
    try {
      const aspect = await AspectsRepository.findById(id)
      if (!aspect) {
        return []
      }
      return aspect
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to fetch aspect')
    }
  }

  /**
 * Updates an aspect by ID.
 * @param {number} id - The ID of the aspect to update.
 * @param {string} aspectName - The new name of the aspect.
 * @returns {Promise<Object>} - The updated aspect data.
 * @throws {ErrorUtils} - If an error occurs during update.
 */
  static async updateById (id, aspectName) {
    try {
      const currentAspect = await AspectsRepository.findById(id)
      if (!currentAspect) {
        throw new ErrorUtils(404, 'Aspect not found')
      }
      if (currentAspect.aspect_name === aspectName) {
        return {
          id,
          aspect_name: aspectName,
          subject_id: currentAspect.subject_id,
          subject_name: currentAspect.subject_name
        }
      }
      const aspectExists = await AspectsRepository.findByNameAndSubjectId(aspectName, currentAspect.subject_id)
      if (aspectExists) {
        throw new ErrorUtils(400, 'Aspect already exists for this subject')
      }
      const updated = await AspectsRepository.updateById(id, aspectName)
      if (!updated) {
        throw new ErrorUtils(404, 'Aspect not found')
      }
      return {
        id: Number(id),
        aspect_name: aspectName,
        subject_id: currentAspect.subject_id,
        subject_name: currentAspect.subject_name
      }
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to update aspect')
    }
  }

  /**
   * Deletes an aspect by ID.
   * @param {number} id - The ID of the aspect to delete.
   * @returns {Promise<boolean>} - Returns true if deletion is successful.
   * @throws {ErrorUtils} - If an error occurs during deletion.
   */
  static async deleteById (id) {
    try {
      const aspectDeleted = await AspectsRepository.deleteById(id)
      if (!aspectDeleted) {
        throw new ErrorUtils(404, 'Aspect not found')
      }
      return aspectDeleted
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to delete aspect')
    }
  }
}

export default AspectsService
