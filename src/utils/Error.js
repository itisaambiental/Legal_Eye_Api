// utils/ErrorUtils.js
class ErrorUtils extends Error {
  constructor (status, message, errors = null) {
    super(message)
    this.status = status
    this.errors = errors
  }
}

export default ErrorUtils
