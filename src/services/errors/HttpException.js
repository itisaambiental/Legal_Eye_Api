/**
 * Custom error class for handling HTTP exceptions in the application.
 * Extends the built-in Error class to include HTTP status codes and additional error details.
 */
class HttpException extends Error {
  /**
   * Constructs an HttpException instance.
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

export default HttpException
