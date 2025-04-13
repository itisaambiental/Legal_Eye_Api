/**
 * Class representing a Legal Requirement.
 * Contains details about a specific requirement linked to a subject and multiple aspects.
 */
class Requirement {
  /**
   * Constructs a Requirement instance.
   * @param {number} id - The ID of the requirement.
   * @param {Object} subject - The subject associated with the requirement.
   * @param {number} subject.subject_id - The ID of the subject.
   * @param {string} subject.subject_name - The name of the subject.
   * @param {Array<Object>} aspects - The aspects associated with the requirement.
   * @param {number} aspects[].aspect_id - The ID of the aspect.
   * @param {string} aspects[].aspect_name - The name of the aspect.
   * @param {number} requirementNumber - The requirement number.
   * @param {string} requirementName - The name of the requirement.
   * @param {string} mandatoryDescription - The mandatory description of the requirement.
   * @param {string} complementaryDescription - The complementary description of the requirement.
   * @param {string} mandatorySentences - The mandatory legal sentences related to the requirement.
   * @param {string} complementarySentences - The complementary legal sentences related to the requirement.
   * @param {string} mandatoryKeywords - Keywords related to the mandatory aspect of the requirement.
   * @param {string} complementaryKeywords - Keywords related to the complementary aspect of the requirement.
   * @param {string} condition - The condition type ('Crítica', 'Operativa', 'Recomendación', 'Pendiente').
   * @param {string} evidence - The type of evidence ('Trámite', 'Registro', 'Específica', 'Documento').
   * @param {string} specifyEvidence - The description of the specific evidence.
   * @param {string} periodicity - The periodicity of the requirement ('Anual', '2 años', 'Por evento', 'Única vez', 'Específica').
   */
  constructor (
    id,
    subject,
    aspects,
    requirementNumber,
    requirementName,
    mandatoryDescription,
    complementaryDescription,
    mandatorySentences,
    complementarySentences,
    mandatoryKeywords,
    complementaryKeywords,
    condition,
    evidence,
    specifyEvidence,
    periodicity,
  ) {
    this.id = id
    this.subject = subject
    this.aspects = aspects
    this.requirement_number = requirementNumber
    this.requirement_name = requirementName
    this.mandatory_description = mandatoryDescription
    this.complementary_description = complementaryDescription
    this.mandatory_sentences = mandatorySentences
    this.complementary_sentences = complementarySentences
    this.mandatory_keywords = mandatoryKeywords
    this.complementary_keywords = complementaryKeywords
    this.condition = condition
    this.evidence = evidence
    this.specify_evidence = specifyEvidence
    this.periodicity = periodicity
  }
}

export default Requirement
