/**
 * Class representing a Subject.
 */
class Subject {
  /**
   * Constructs a Subject instance.
   * @param {number} id - The ID of the subject.
   * @param {string} subjectName - The name of the subject.
   * @param {string} abbreviation - The abbreviation for the subject.
   * @param {number} orderIndex - The display order index.
   */
  constructor (id, subjectName, abbreviation, orderIndex) {
    this.id = id
    this.subject_name = subjectName
    this.abbreviation = abbreviation
    this.order_index = orderIndex
  }
}

export default Subject
