/**
 * Pauses the execution for a given number of milliseconds.
 * @param {number} ms - Milliseconds to wait.
 * @returns {Promise<void>} A promise that resolves after the specified time.
 */
export const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
