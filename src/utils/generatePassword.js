import crypto from 'crypto'

/**
 * Generates a strong, random password of a specified length.
 * Uses cryptographic randomness to ensure security.
 * @param {number} [length=12] - The desired length of the generated password.
 * @returns {string} - The generated password.
 */
export function generatePassword (length = 12) {
  return crypto.randomBytes(length).toString('hex').slice(0, length)
}
