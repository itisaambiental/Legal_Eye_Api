import axios from 'axios'

/**
 * Replaces all <img> tags pointing to S3 in the given HTML with base64-encoded data URIs.
 *
 * @param {string} html - The HTML content containing potential <img src="..."> tags.
 * @returns {Promise<string>} - The updated HTML with S3 images replaced by base64 data URIs.
 */
export async function replacePicturesFromS3 (html) {
  if (!html || typeof html !== 'string') return html

  const regex = /<img[^>]*src=["'](https?:\/\/[^"']*\.s3\.amazonaws\.com\/[^"']+)["']/g
  const matches = [...html.matchAll(regex)]

  const promises = matches.map(async (match) => {
    const url = match[1]
    try {
      const response = await axios.get(url, { responseType: 'arraybuffer' })
      const mimeType = response.headers['content-type']
      const base64 = Buffer.from(response.data).toString('base64')
      const dataUri = `data:${mimeType};base64,${base64}`
      html = html.replace(url, dataUri)
    } catch {
      console.error('Failed to fetch image:', url)
    }
  })

  await Promise.all(promises)
  return html
}
