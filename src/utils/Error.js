// ErrorUtils.js

/**
 * Custom error class for handling application-specific errors.
 * Extends the built-in Error class to include HTTP status codes and additional error details.
 */
class ErrorUtils extends Error {
  /**
   * Constructs an ErrorUtils instance.
   * @param {number} status - The HTTP status code.
   * @param {string} message - The error message.
   * @param {Array<Object>|null} [errors=null] - Additional error details, if any.
   */
  constructor (status, message, errors = null) {
    super(message)
    this.status = status
    this.errors = errors
  }
}

export default ErrorUtils
