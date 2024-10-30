/**
 * Class representing a Subject.
 * Stores information about subjects such as 'Environmental', 'Security', etc.
 */
class Subject {
  /**
     * Constructs a Subject instance.
     * @param {number} id - The ID of the subject.
     * @param {string} subjectName - The name of the subject.
     */
  constructor (id, subjectName) {
    this.id = id
    this.subject_name = subjectName
  }
}

export default Subject
