/**
 * Class representing a Legal Requirement.
 * Contains details about a specific requirement linked to a subject and an aspect.
 */
class Requirement {
  /**
     * Constructs a Requirement instance.
     * @param {number} id - The ID of the requirement.
     * @param {Object} subject - The subject associated with the requirement.
     * @param {number} subject.subject_id - The ID of the subject.
     * @param {string} subject.subject_name - The name of the subject.
     * @param {Object} aspect - The aspect associated with the requirement.
     * @param {number} aspect.aspect_id - The ID of the aspect.
     * @param {string} aspect.aspect_name - The name of the aspect.
     * @param {number} requirementNumber - The requirement number.
     * @param {string} requirementName - The name of the requirement.
     * @param {string} mandatoryDescription - The mandatory description of the requirement.
     * @param {string} complementaryDescription - The complementary description of the requirement.
     * @param {string} mandatorySentences - The mandatory legal sentences related to the requirement.
     * @param {string} complementarySentences - The complementary legal sentences related to the requirement.
     * @param {string} mandatoryKeywords - Keywords related to the mandatory aspect of the requirement.
     * @param {string} complementaryKeywords - Keywords related to the complementary aspect of the requirement.
     * @param {string} condition - The condition type ('Crítica', 'Operativa', 'Recomendación', 'Pendiente').
     * @param {string} evidence - The type of evidence ('Tramite', 'Registro', 'Específico', 'Documento').
     * @param {string} periodicity - The periodicity of the requirement ('Anual', '2 años', 'Por evento', 'Única vez').
     * @param {string} specificDocument - A specific document related to the requirement.
     * @param {string} requirementType - The type of requirement (e.g., 'Identificación Estatal', 'Requerimiento Local').
     * @param {string} jurisdiction - The jurisdiction of the requirement ('Estatal', 'Federal', 'Local').
     * @param {string} state - The state associated with the requirement (if applicable).
     * @param {string} municipality - The municipality associated with the requirement (if applicable).
     */
  constructor (
    id,
    subject,
    aspect,
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
    periodicity,
    specificDocument,
    requirementType,
    jurisdiction,
    state,
    municipality
  ) {
    this.id = id
    this.subject = subject
    this.aspect = aspect
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
    this.periodicity = periodicity
    this.specific_document = specificDocument
    this.requirement_type = requirementType
    this.jurisdiction = jurisdiction
    this.state = state
    this.municipality = municipality
  }
}

export default Requirement
