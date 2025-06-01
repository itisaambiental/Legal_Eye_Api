/**
 * Class representing an Aspect.
 */
class Aspect {
  /**
   * Constructs an Aspect instance.
   * @param {number} id - The ID of the aspect.
   * @param {string} aspectName - The name of the aspect.
   * @param {number} subjectId - The ID of the associated subject.
   * @param {string} subjectName - The name of the associated subject.
   * @param {string} abbreviation - The abbreviation for the aspect.
   * @param {number} orderIndex - The display order index.
   */
  constructor (id, aspectName, subjectId, subjectName, abbreviation, orderIndex) {
    this.id = id
    this.aspect_name = aspectName
    this.subject_id = subjectId
    this.subject_name = subjectName
    this.abbreviation = abbreviation
    this.order_index = orderIndex
  }
}

export default Aspect
