import { parse, isValid, format } from 'date-fns'

/**
 * @typedef {Object} ParseDateResult
 * @property {string | null} date - The formatted date string if valid, otherwise `null`.
 * @property {{ field: string, message: string } | null} error - The error object if invalid, otherwise `null`.
 */

/**
 * Parses a date string.
 * @param {string} dateStr - The date string to validate.
 * @param {string} fieldName - The name of the field being validated.
 * @returns {ParseDateResult} An object containing both `date` and `error`, where one is `null` and the other has a value.
 */
export default function parseDate (dateStr, fieldName) {
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
