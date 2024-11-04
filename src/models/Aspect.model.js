/**
 * Class representing an Aspect.
 * Stores information about aspects linked to specific subjects.
 */
class Aspect {
  /**
   * Constructs an Aspect instance.
   * @param {number} id - The ID of the aspect.
   * @param {string} aspectName - The name of the aspect.
   * @param {number} subjectId - The ID of the associated subject.
   * @param {string} subjectName - The name of the associated subject.
   */
  constructor (id, aspectName, subjectId, subjectName) {
    this.id = id
    this.aspect_name = aspectName
    this.subject_id = subjectId
    this.subject_name = subjectName
  }
}

export default Aspect
