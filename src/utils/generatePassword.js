import crypto from 'crypto'

// Function to generate a strong password
export function generatePassword (length = 12) {
  return crypto.randomBytes(length).toString('hex').slice(0, length)
}
