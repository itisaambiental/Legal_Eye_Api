import SubjectsRepository from '../../repositories/Subject.repository.js'
import HttpException from '../errors/HttpException.js'
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
   * @param {string} params.abbreviation - The abbreviation of the subject.
   * @param {number} params.orderIndex - The display order of the subject.
   * @returns {Promise<Subject>} - The created subject data.
   * @throws {HttpException} - If an error occurs during creation.
   */
  static async create ({ subjectName, abbreviation, orderIndex }) {
    try {
      const parsedSubject = subjectSchema.parse({ subjectName, abbreviation, orderIndex })

      const subjectExists = await SubjectsRepository.existsBySubjectName(parsedSubject.subjectName)
      if (subjectExists) {
        throw new HttpException(409, 'Subject already exists')
      }
      const createdSubject = await SubjectsRepository.create(
        parsedSubject.subjectName,
        parsedSubject.abbreviation,
        parsedSubject.orderIndex
      )
      return createdSubject
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors = error.errors.map((e) => ({
          field: e.path[0],
          message: e.message
        }))
        throw new HttpException(400, 'Validation failed', validationErrors)
      }
      if (error instanceof HttpException) {
        throw error
      }
      throw new HttpException(500, 'Failed to create subject')
    }
  }

  /**
   * Fetches all subjects.
   * @returns {Promise<Array<Subject>>} - List of all subjects.
   * @throws {HttpException} - If an error occurs during retrieval.
   */
  static async getAll () {
    try {
      const subjects = await SubjectsRepository.findAll()
      if (!subjects) {
        return []
      }
      return subjects
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      throw new HttpException(500, 'Failed to fetch subjects')
    }
  }

  /**
   * Fetches a subject by ID.
   * @param {number} id - The ID of the subject to retrieve.
   * @returns {Promise<Subject>} - The subject data or null if not found.
   * @throws {HttpException} - If an error occurs during retrieval.
   */
  static async getById (id) {
    try {
      const subject = await SubjectsRepository.findById(id)
      if (!subject) {
        throw new HttpException(404, 'Subject not found')
      }
      return subject
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      throw new HttpException(500, 'Failed to fetch subject')
    }
  }

  /**
   * Fetches subjects by name.
   * @param {string} subjectName - The name of the subject to retrieve.
   * @returns {Promise<Array<Subject>>} - The subject data.
   * @throws {HttpException} - If an error occurs during retrieval.
   */
  static async getByName (subjectName) {
    try {
      const subjects = await SubjectsRepository.findByName(subjectName)
      if (!subjects) {
        return []
      }
      return subjects
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      throw new HttpException(500, 'Failed to fetch subject')
    }
  }

  /**
 * Updates a subject by ID.
 * @param {number} id - The ID of the subject to update.
 * @param {Object} params - The new subject data.
 * @param {string} params.subjectName - The new name of the subject.
 * @param {string} params.abbreviation - The new abbreviation.
 * @param {number} params.orderIndex - The new display order.
 * @returns {Promise<Subject>} - Returns the updated subject data.
 * @throws {HttpException} - Throws an error if the subject is not found, the name already exists, or an unexpected error occurs.
 */
  static async updateById (id, { subjectName, abbreviation, orderIndex }) {
    try {
      const parsedSubject = subjectSchema.parse({ subjectName, abbreviation, orderIndex })

      const currentSubject = await SubjectsRepository.findById(id)
      if (!currentSubject) {
        throw new HttpException(404, 'Subject not found')
      }

      const subjectExists = await SubjectsRepository.existsByNameExcludingId(parsedSubject.subjectName, id)
      if (subjectExists) {
        throw new HttpException(409, 'Subject already exists')
      }

      const updatedSubject = await SubjectsRepository.update(
        id,
        parsedSubject.subjectName,
        parsedSubject.abbreviation,
        parsedSubject.orderIndex
      )

      if (!updatedSubject) {
        throw new HttpException(404, 'Subject not found')
      }

      return updatedSubject
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors = error.errors.map((e) => ({
          field: e.path[0],
          message: e.message
        }))
        throw new HttpException(400, 'Validation failed', validationErrors)
      }

      if (error instanceof HttpException) {
        throw error
      }

      throw new HttpException(500, 'Failed to update subject')
    }
  }

  /**
 * Deletes a subject by ID.
 * @param {number} id - The ID of the subject to delete.
 * @returns {Promise<{ success: boolean }>} - An object indicating the deletion was successful.
 * @throws {HttpException} - If an error occurs during deletion.
 */
  static async deleteById (id) {
    try {
      const currentSubject = await SubjectsRepository.findById(id)
      if (!currentSubject) {
        throw new HttpException(404, 'Subject not found')
      }
      const { isAssociatedToLegalBasis } = await SubjectsRepository.checkSubjectLegalBasisAssociations(id)
      if (isAssociatedToLegalBasis) {
        throw new HttpException(
          409,
          'The subject is associated with one or more legal bases'
        )
      }
      const { isAssociatedToRequirements } = await SubjectsRepository.checkSubjectRequirementAssociations(id)
      if (isAssociatedToRequirements) {
        throw new HttpException(
          409,
          'The subject is associated with one or more requirements'
        )
      }
      const subjectDeleted = await SubjectsRepository.deleteById(id)
      if (!subjectDeleted) {
        throw new HttpException(404, 'Subject not found')
      }
      return { success: true }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      throw new HttpException(500, 'Failed to delete subject')
    }
  }

  /**
 * Deletes multiple subjects by their IDs.
 * @param {Array<number>} subjectIds - Array of subject IDs to delete.
 * @returns {Promise<{ success: boolean }>} - An object indicating the deletion was successful.
 * @throws {HttpException} - If subjects not found, have associations preventing deletion, or deletion fails.
 */
  static async deleteSubjectsBatch (subjectIds) {
    try {
      const existingSubjects = await SubjectsRepository.findByIds(subjectIds)
      if (existingSubjects.length !== subjectIds.length) {
        const notFoundIds = subjectIds.filter(
          (id) => !existingSubjects.some((subject) => subject.id === id)
        )
        throw new HttpException(404, 'Subjects not found for IDs', { notFoundIds })
      }
      const legalBasisAssociations = await SubjectsRepository.checkSubjectsLegalBasisAssociationsBatch(subjectIds)
      const subjectsWithLegalBasisAssociations = legalBasisAssociations.filter(
        (subject) => subject.isAssociatedToLegalBasis
      )
      const requirementAssociations = await SubjectsRepository.checkSubjectsRequirementAssociationsBatch(subjectIds)
      const subjectsWithRequirementAssociations = requirementAssociations.filter(
        (subject) => subject.isAssociatedToRequirements
      )
      if (subjectsWithLegalBasisAssociations.length > 0) {
        throw new HttpException(409, 'Subjects are associated with legal bases', {
          associatedSubjects: subjectsWithLegalBasisAssociations.map((subject) => ({
            id: subject.id,
            name: subject.name
          }))
        })
      }
      if (subjectsWithRequirementAssociations.length > 0) {
        throw new HttpException(409, 'Subjects are associated with requirements', {
          associatedSubjects: subjectsWithRequirementAssociations.map((subject) => ({
            id: subject.id,
            name: subject.name
          }))
        })
      }
      const subjectsDeleted = await SubjectsRepository.deleteBatch(subjectIds)
      if (!subjectsDeleted) {
        throw new HttpException(404, 'Subjects not found')
      }
      return { success: true }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      throw new HttpException(500, 'Failed to delete subjects')
    }
  }
}

export default SubjectsService
