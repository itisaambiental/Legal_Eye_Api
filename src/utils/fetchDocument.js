import axios from 'axios'
import mime from 'mime-types'
import ErrorUtils from './Error.js'

/**
 * Fetches a document from a given URL and returns its buffer and MIME type.
 * Downloads the file and performs necessary validations to ensure proper content.
 *
 * @param {string} url - The URL of the document to fetch.
 * @returns {Promise<{buffer: Buffer, mimetype: string}>} - An object containing the document buffer and its MIME type.
 * @throws {ErrorUtils} - Throws an error if the document fetch or processing fails.
 */
export default async function fetchDocument (url) {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' })
    if (!response.data || response.status !== 200) {
      throw new ErrorUtils(500, 'Failed to download the file or empty content.')
    }
    const buffer = Buffer.from(response.data)
    const urlPath = new URL(url).pathname
    const fileName = urlPath.split('/').pop()
    const mimetype = mime.lookup(fileName)

    return { buffer, mimetype }
  } catch (error) {
    throw new ErrorUtils(500, 'Error fetching document', error)
  }
}
