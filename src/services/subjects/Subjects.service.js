import SubjectsRepository from '../../repositories/Subject.repository.js'
import ErrorUtils from '../../utils/Error.js'
import subjectSchema from '../../schemas/subject.schema.js'
import { z } from 'zod'

/**
 * Service class for handling Subject operations.
 */
class SubjectsService {
  /**
   * Creates a new Subject entry.
   * @param {Object} params - Parameters for creating a subject.
   * @param {string} params.subjectName - The name of the subject.
   * @returns {Promise<Subject>} - The created subject data.
   * @throws {ErrorUtils} - If an error occurs during creation.
   */
  static async create ({ subjectName }) {
    try {
      const parsedSubject = subjectSchema.parse({ subjectName })
      const subjectExists = await SubjectsRepository.existsBySubjectName(parsedSubject.subjectName)
      if (subjectExists) {
        throw new ErrorUtils(409, 'Subject already exists')
      }
      const createdSubject = await SubjectsRepository.create(parsedSubject.subjectName)
      return createdSubject
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors = error.errors.map((e) => ({
          field: e.path[0],
          message: e.message
        }))
        throw new ErrorUtils(400, 'Validation failed', validationErrors)
      }
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to create subject')
    }
  }

  /**
   * Fetches all subjects.
   * @returns {Promise<Array<Subject>>} - List of all subjects.
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
   * @returns {Promise<Subject>} - The subject data or null if not found.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async getById (id) {
    try {
      const subject = await SubjectsRepository.findById(id)
      if (!subject) {
        throw new ErrorUtils(404, 'Subject not found')
      }
      return subject
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to fetch subject')
    }
  }

  /**
   * Fetches subjects by name.
   * @param {string} subjectName - The name of the subject to retrieve.
   * @returns {Promise<Array<Subject>>} - The subject data.
   * @throws {ErrorUtils} - If an error occurs during retrieval.
   */
  static async getByName (subjectName) {
    try {
      const subjects = await SubjectsRepository.findByName(subjectName)
      if (!subjects) {
        return []
      }
      return subjects
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to fetch subject')
    }
  }

  /**
   * Updates a subject by ID.
   * @param {number} id - The ID of the subject to update.
   * @param {string} subjectName - The new name of the subject.
   * @returns {Promise<Subject>} - Returns the updated subject data, including `id` and `subjectName`.
   * @throws {ErrorUtils} - Throws an error if the subject is not found, the name already exists, or an unexpected error occurs.
   */
  static async updateById (id, subjectName) {
    try {
      const parsedSubject = subjectSchema.parse({ subjectName })
      const currentSubject = await SubjectsRepository.findById(id)
      if (!currentSubject) {
        throw new ErrorUtils(404, 'Subject not found')
      }
      const subjectExists = await SubjectsRepository.existsByNameExcludingId(parsedSubject.subjectName, id)
      if (subjectExists) {
        throw new ErrorUtils(409, 'Subject already exists')
      }
      const updatedSubject = await SubjectsRepository.updateById(id, parsedSubject.subjectName)
      if (!updatedSubject) {
        throw new ErrorUtils(404, 'Subject not found')
      }
      return updatedSubject
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors = error.errors.map((e) => ({
          field: e.path[0],
          message: e.message
        }))
        throw new ErrorUtils(400, 'Validation failed', validationErrors)
      }
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to update subject')
    }
  }

  /**
   * Deletes a subject by ID.
   * @param {number} id - The ID of the subject to delete.
   * @returns {Promise<{ success: boolean }>} - An object indicating the deletion was successful.
   * @throws {ErrorUtils} - If an error occurs during deletion.
   */
  static async deleteById (id) {
    try {
      const {
        isAssociatedToLegalBasis,
        isSubjectAspectAssociatedToLegalBasis
      } = await SubjectsRepository.checkSubjectLegalBasisAssociations(id)
      if (isAssociatedToLegalBasis) {
        throw new ErrorUtils(
          409,
          'The subject is associated with one or more legal bases'
        )
      }
      if (isSubjectAspectAssociatedToLegalBasis) {
        throw new ErrorUtils(
          409,
          'Some aspects of the subject are associated with legal bases'
        )
      }
      const subjectDeleted = await SubjectsRepository.deleteById(id)
      if (!subjectDeleted) {
        throw new ErrorUtils(404, 'Subject not found')
      }
      return { success: true }
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to delete subject')
    }
  }

  /**
   * Deletes multiple subjects by their IDs.
   * @param {Array<number>} subjectIds - Array of subject IDs to delete.
   * @returns {Promise<{ success: boolean }>} - An object indicating the deletion was successful.
   * @throws {ErrorUtils} - If subjects not found, have associations preventing deletion, or deletion fails.
   */
  static async deleteSubjectsBatch (subjectIds) {
    try {
      const existingSubjects = await SubjectsRepository.findByIds(subjectIds)
      if (existingSubjects.length !== subjectIds.length) {
        const notFoundIds = subjectIds.filter(
          (id) => !existingSubjects.some((subject) => subject.id === id)
        )
        throw new ErrorUtils(404, 'Subjects not found for IDs', {
          notFoundIds
        })
      }
      const associations =
        await SubjectsRepository.checkSubjectsLegalBasisAssociationsBatch(
          subjectIds
        )
      const subjectsWithLegalBasisAssociations = associations.filter(
        (subject) => subject.isAssociatedToLegalBasis
      )
      const subjectsWithAspectAssociations = associations.filter(
        (subject) => subject.isSubjectAspectAssociatedToLegalBasis
      )
      if (subjectsWithLegalBasisAssociations.length > 0) {
        throw new ErrorUtils(409, 'Subjects are associated with legal bases', {
          associatedSubjects: subjectsWithLegalBasisAssociations.map(
            (subject) => ({
              id: subject.id,
              name: subject.name
            })
          )
        })
      }
      if (subjectsWithAspectAssociations.length > 0) {
        throw new ErrorUtils(
          409,
          'Subjects have aspects associated with legal bases',
          {
            associatedSubjects: subjectsWithAspectAssociations.map(
              (subject) => ({
                id: subject.id,
                name: subject.name
              })
            )
          }
        )
      }
      const subjectsDeleted = await SubjectsRepository.deleteBatch(subjectIds)
      if (!subjectsDeleted) {
        throw new ErrorUtils(404, 'Subjects not found')
      }
      return { success: true }
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to delete subjects')
    }
  }
}

export default SubjectsService
