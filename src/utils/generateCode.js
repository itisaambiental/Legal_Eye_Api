// generateVerificationCode.js

/**
 * Generates a 6-digit verification code as a string.
 * @returns {string} - The generated verification code.
 */
function generateVerificationCode () {
  const code = Math.floor(100000 + Math.random() * 900000)
  return code.toString()
}

export default generateVerificationCode
