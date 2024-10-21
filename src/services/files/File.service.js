import ErrorUtils from '../../utils/Error.js'
import { S3_BUCKET_NAME } from '../../config/variables.config.js'
import client from '../../config/s3.config.js'
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { v4 as uuidv4 } from 'uuid'

/**
 * Service class for handling file uploads and retrievals.
 * Interacts with AWS S3 to upload files and generate presigned URLs for file access.
 */
class FileService {
  /**
   * Uploads a file to the specified S3 bucket.
   * Generates a unique file name to prevent overwriting existing files.
   * @param {Object} file - The file object to upload.
   * @param {Buffer} file.buffer - The file buffer.
   * @param {string} file.originalname - The original name of the file.
   * @param {string} file.mimetype - The MIME type of the file.
   * @returns {Promise<Object>} - An object containing the response and unique file name.
   * @throws {ErrorUtils} - If an error occurs during file upload.
   */
  static async uploadFile (file) {
    try {
      const uniqueId = uuidv4()
      const uniqueFileName = `${uniqueId}_${file.originalname}`
      const uploadParams = {
        Bucket: S3_BUCKET_NAME,
        Key: uniqueFileName,
        Body: file.buffer,
        ContentType: file.mimetype
      }
      const command = new PutObjectCommand(uploadParams)
      const response = await client.send(command)
      return { response, uniqueFileName }
    } catch (error) {
      console.error('Error uploading file:', error.message)
      throw new ErrorUtils(500, 'Error uploading file', 'Failed to upload file to S3')
    }
  }

  /**
   * Generates a presigned URL for accessing a file in the S3 bucket.
   * The URL is valid for a specified duration.
   * @param {string} fileKey - The key of the file in the S3 bucket.
   * @returns {Promise<string>} - The presigned URL for the file.
   * @throws {ErrorUtils} - If an error occurs while generating the presigned URL.
   */
  static async getFile (fileKey) {
    try {
      const getObjectParams = {
        Bucket: S3_BUCKET_NAME,
        Key: fileKey
      }
      const command = new GetObjectCommand(getObjectParams)
      const urlExpiration = 432000 // URL expires in 5 days (in seconds)
      const presignedUrl = await getSignedUrl(client, command, { expiresIn: urlExpiration })
      return presignedUrl
    } catch (error) {
      console.error('Error generating presigned URL:', error.message)
      throw new ErrorUtils(500, 'Error generating presigned URL', 'Failed to generate presigned URL')
    }
  }
}

export default FileService
