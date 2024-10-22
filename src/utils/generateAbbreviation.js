// generateAbbreviation.js

/**
 * Generates an abbreviation from a given name.
 * Filters out excluded words and extracts initials from remaining words.
 * @param {string} name - The full name to generate an abbreviation from.
 * @returns {string} - The generated abbreviation in uppercase.
 */
export default function generateAbbreviation (name) {
  const excludedWords = ['de', 'para', 'la', 'el', 'los', 'las', 'y']

  return name
    .split(' ')
    .filter(word => {
      const lowerCaseWord = word.toLowerCase()
      return !excludedWords.includes(lowerCaseWord) && (/^[A-Z]/.test(word) || /\./.test(word))
    })
    .map(word => {
      if (/\./.test(word)) {
        return word.match(/[A-Z]/g).join('')
      } else {
        return word[0]
      }
    })
    .join('')
    .toUpperCase()
}
