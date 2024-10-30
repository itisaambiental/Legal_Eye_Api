/**
 * Class representing an Aspect.
 * Stores information about aspects linked to specific subjects.
 */
class Aspect {
  /**
     * Constructs an Aspect instance.
     * @param {number} id - The ID of the aspect.
     * @param {number} subjectId - The ID of the associated subject.
     * @param {string} aspectName - The name of the aspect.
     */
  constructor (id, subjectId, aspectName) {
    this.id = id
    this.subject_id = subjectId
    this.aspect_name = aspectName
  }
}

export default Aspect
