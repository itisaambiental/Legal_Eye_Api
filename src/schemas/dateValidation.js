import { parse, isValid, format } from 'date-fns'

/**
 * Validates and parses a date string.
 * @param {string} dateStr - The date string to validate.
 * @param {string} fieldName - The name of the field being validated.
 * @returns {Object} - An object containing the parsed date or an error message.
 */
export default function validateDate (dateStr, fieldName) {
  let parsedDate = parse(dateStr, 'yyyy-MM-dd', new Date())
  if (!isValid(parsedDate)) {
    parsedDate = parse(dateStr, 'dd-MM-yyyy', new Date())
  }
  if (!isValid(parsedDate)) {
    return { error: { field: fieldName, message: `'${dateStr}' is not a valid date` } }
  }
  return { date: format(parsedDate, 'yyyy-MM-dd') }
}
