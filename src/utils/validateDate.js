import { parse, isValid, format } from 'date-fns'

/**
 * @typedef {Object} ValidateDateResult
 * @property {string | null} date - The formatted date string if valid, otherwise `null`.
 * @property {{ field: string, message: string } | null} error - The error object if invalid, otherwise `null`.
 */

/**
 * Validates and parses a date string.
 * @param {string} dateStr - The date string to validate.
 * @param {string} fieldName - The name of the field being validated.
 * @returns {ValidateDateResult} An object containing both `date` and `error`, where one is `null` and the other has a value.
 */
export default function validateDate (dateStr, fieldName) {
  let parsedDate = parse(dateStr, 'yyyy-MM-dd', new Date())
  if (!isValid(parsedDate)) {
    parsedDate = parse(dateStr, 'dd-MM-yyyy', new Date())
  }
  if (!isValid(parsedDate)) {
    return {
      date: null,
      error: { field: fieldName, message: `'${dateStr}' is not a valid date` }
    }
  }
  return {
    date: format(parsedDate, 'yyyy-MM-dd'),
    error: null
  }
}
